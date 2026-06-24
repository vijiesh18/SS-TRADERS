import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/", async (_req: AuthRequest, res: Response) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return res.json({ items: suppliers });
});

router.get("/search", async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) return res.json({ results: [] });

  const suppliers = await prisma.supplier.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    take: 10,
  });
  return res.json({ results: suppliers });
});

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
});

router.post("/", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const supplier = await prisma.supplier.create({ data: parsed.data as any });
  return res.status(201).json(supplier);
});

router.put("/:id", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: parsed.data as any });
  return res.json(supplier);
});

/**
 * GET /api/suppliers/:id/history
 * Purchase history + outstanding balance.
 */
router.get("/:id/history", async (req: AuthRequest, res: Response) => {
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });

  const purchases = await prisma.purchase.findMany({
    where: { supplierId: supplier.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ supplier, purchases });
});

export default router;
