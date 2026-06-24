import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { generatePurchaseNumber } from "@/lib/numbering";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";

const router = Router();

router.use(authenticate);

const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  purchaseRate: z.number().nonnegative(),
  gstPercentage: z.number().min(0).max(100).default(0),
});

const createPurchaseSchema = z.object({
  supplierId: z.string(),
  supplierInvoiceNo: z.string().optional(),
  paidAmount: z.number().min(0).default(0),
  items: z.array(purchaseItemSchema).min(1),
});

/**
 * POST /api/purchases
 * Records a purchase entry, updates stock-in, and updates supplier balance.
 */
router.post("/", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = createPurchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { supplierId, supplierInvoiceNo, paidAmount, items } = parsed.data;

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });

  let totalAmount = 0;
  const computed = items.map((item) => {
    const gross = item.quantity * item.purchaseRate;
    const gst = (gross * item.gstPercentage) / 100;
    const total = gross + gst;
    totalAmount += total;
    return { ...item, totalAmount: total };
  });

  const balanceAmount = totalAmount - paidAmount;
  const purchaseNumber = await generatePurchaseNumber();

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        purchaseNumber,
        supplierId,
        supplierInvoiceNo,
        totalAmount,
        paidAmount,
        balanceAmount,
        items: {
          create: computed.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            purchaseRate: c.purchaseRate,
            gstPercentage: c.gstPercentage,
            totalAmount: c.totalAmount,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    // Stock-in each item & update purchase price
    for (const item of computed) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      const newQty = Number(product.stockQuantity) + item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: newQty, purchasePrice: item.purchaseRate },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "PURCHASE_IN",
          quantity: item.quantity,
          balanceAfter: newQty,
          reference: purchaseNumber,
          createdById: req.user!.userId,
        },
      });
    }

    // Update supplier outstanding balance
    await tx.supplier.update({
      where: { id: supplierId },
      data: { outstandingBalance: Number(supplier.outstandingBalance) + balanceAmount },
    });

    return created;
  });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.STOCK_CHANGE,
    entityType: "Purchase",
    entityId: purchase.id,
    details: { purchaseNumber, totalAmount },
    ipAddress: req.ip,
  });

  return res.status(201).json(purchase);
});

/**
 * GET /api/purchases
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 25, 200);

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      include: { supplier: true, items: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchase.count(),
  ]);

  return res.json({ items, total, page, limit });
});

/**
 * GET /api/purchases/analytics
 * Purchase totals by supplier / month.
 */
router.get("/analytics", authorize("ADMIN", "ACCOUNTANT"), async (_req: AuthRequest, res: Response) => {
  const bySupplier = await prisma.purchase.groupBy({
    by: ["supplierId"],
    _sum: { totalAmount: true, balanceAmount: true },
  });

  const supplierIds = bySupplier.map((b) => b.supplierId);
  const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierIds } } });

  const result = bySupplier.map((b) => ({
    supplier: suppliers.find((s) => s.id === b.supplierId),
    totalPurchased: b._sum.totalAmount,
    outstanding: b._sum.balanceAmount,
  }));

  return res.json({ items: result });
});

export default router;
