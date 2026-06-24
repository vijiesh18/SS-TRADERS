import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

/**
 * GET /api/customers/search?q=
 * Quick search for billing screen.
 */
router.get("/search", async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) return res.json({ results: [] });

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    take: 10,
  });

  return res.json({ results: customers });
});

/**
 * GET /api/customers
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 25, 200);

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count(),
  ]);

  return res.json({ items, total, page, limit });
});

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
});

/**
 * POST /api/customers
 */
router.post("/", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const customer = await prisma.customer.create({ data: parsed.data as any });
  return res.status(201).json(customer);
});

/**
 * PUT /api/customers/:id
 */
router.put("/:id", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = customerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json(customer);
});

/**
 * GET /api/customers/:id/ledger
 * Purchase history + credit history + analytics for a customer.
 */
router.get("/:id/ledger", async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id, isDeleted: false },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const credits = await prisma.creditRecord.findMany({
    where: { customerId: customer.id },
    include: { payments: true },
    orderBy: { createdAt: "desc" },
  });

  const totalSpent = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
  const totalOrders = invoices.length;
  const totalPendingCredit = credits
    .filter((c) => !c.isSettled)
    .reduce((sum, c) => sum + Number(c.pendingAmount), 0);

  return res.json({
    customer,
    invoices,
    credits,
    analytics: {
      totalSpent,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
      totalPendingCredit,
    },
  });
});

export default router;
