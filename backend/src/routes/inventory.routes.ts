import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";

const router = Router();

router.use(authenticate);

/**
 * GET /api/inventory/low-stock
 * Products where stock <= minimum stock level.
 */
router.get("/low-stock", async (_req: AuthRequest, res: Response) => {
  const products = await prisma.$queryRaw`
    SELECT id, name, "productCode", "barcode", "stockQuantity", "minimumStock"
    FROM products
    WHERE "isDeleted" = false
      AND "stockQuantity" <= "minimumStock"
    ORDER BY "stockQuantity" ASC
  `;

  return res.json({ items: products });
});

/**
 * GET /api/inventory/dead-stock
 * Products with no stock movement (SALE_OUT) in the given number of days (default 90).
 */
router.get("/dead-stock", async (req: AuthRequest, res: Response) => {
  const days = Number(req.query.days) || 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const products = await prisma.product.findMany({
    where: {
      isDeleted: false,
      stockQuantity: { gt: 0 },
      stockMovements: {
        none: {
          type: "SALE_OUT",
          createdAt: { gte: cutoff },
        },
      },
    },
    select: { id: true, name: true, productCode: true, stockQuantity: true, sellingPrice: true },
    orderBy: { stockQuantity: "desc" },
  });

  return res.json({ items: products, cutoffDays: days });
});

/**
 * GET /api/inventory/fast-moving
 * Top products by quantity sold in the given period (default 30 days).
 */
router.get("/fast-moving", async (req: AuthRequest, res: Response) => {
  const days = Number(req.query.days) || 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const movements = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { type: "SALE_OUT", createdAt: { gte: cutoff } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 20,
  });

  const productIds = movements.map((m) => m.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, productCode: true, sellingPrice: true, stockQuantity: true },
  });

  const merged = movements.map((m) => ({
    ...products.find((p) => p.id === m.productId),
    quantitySold: m._sum.quantity,
  }));

  return res.json({ items: merged, periodDays: days });
});

const adjustmentSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  direction: z.enum(["IN", "OUT"]),
  reason: z.string().min(1),
});

/**
 * POST /api/inventory/adjustments
 * Stock adjustment (manual correction) - Admin & Staff.
 */
router.post("/adjustments", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = adjustmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { productId, quantity, direction, reason } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const delta = direction === "IN" ? quantity : -quantity;
  const newQty = Number(product.stockQuantity) + delta;

  if (newQty < 0) {
    return res.status(400).json({ error: "Resulting stock cannot be negative" });
  }

  const [updatedProduct, movement] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newQty },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        type: direction === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        quantity,
        balanceAfter: newQty,
        note: reason,
        createdById: req.user!.userId,
      },
    }),
  ]);

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.STOCK_ADJUSTMENT,
    entityType: "Product",
    entityId: productId,
    details: { direction, quantity, reason, newQty },
    ipAddress: req.ip,
  });

  return res.json({ product: updatedProduct, movement });
});

/**
 * GET /api/inventory/movements/:productId
 * Stock movement history for a product.
 */
router.get("/movements/:productId", async (req: AuthRequest, res: Response) => {
  const movements = await prisma.stockMovement.findMany({
    where: { productId: req.params.productId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });

  return res.json({ items: movements });
});

export default router;
