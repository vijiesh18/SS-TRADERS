import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

/**
 * GET /api/credit
 * All open credit records, with optional filters: status=overdue|due-today|pending
 */
router.get("/", authorize("ADMIN", "ACCOUNTANT", "STAFF"), async (req: AuthRequest, res: Response) => {
  const filter = req.query.status as string | undefined;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const where: any = { isSettled: false };
  if (filter === "overdue") {
    where.dueDate = { lt: todayStart };
  } else if (filter === "due-today") {
    where.dueDate = { gte: todayStart, lt: todayEnd };
  }

  // Formal credit records (linked to named customers)
  const records = await prisma.creditRecord.findMany({
    where,
    include: { customer: true, invoice: { select: { invoiceNumber: true, paymentMethod: true, createdAt: true } }, payments: true },
    orderBy: { createdAt: "desc" },
  });

  // Also fetch PARTIAL/UNPAID invoices with no formal credit record (e.g. walk-in credit sales)
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      isDeleted: false,
      status: { in: ["PARTIAL", "UNPAID"] },
      pendingAmount: { gt: 0 },
      creditRecord: null,
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ items: records, pendingInvoices });
});

/**
 * GET /api/credit/summary
 * Dashboard summary: total pending, due today, overdue customer count.
 */
router.get("/summary", async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [pendingAgg, overdue, dueToday] = await Promise.all([
    prisma.creditRecord.aggregate({
      where: { isSettled: false },
      _sum: { pendingAmount: true },
      _count: true,
    }),
    prisma.creditRecord.count({ where: { isSettled: false, dueDate: { lt: todayStart } } }),
    prisma.creditRecord.count({ where: { isSettled: false, dueDate: { gte: todayStart, lt: todayEnd } } }),
  ]);

  return res.json({
    totalPending: pendingAgg._sum.pendingAmount || 0,
    pendingCount: pendingAgg._count,
    overdueCount: overdue,
    dueTodayCount: dueToday,
  });
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD"]).default("CASH"),
  note: z.string().optional(),
});

/**
 * POST /api/credit/:id/payments
 * Record a payment against a credit record.
 */
router.post("/:id/payments", authorize("ADMIN", "ACCOUNTANT", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const record = await prisma.creditRecord.findUnique({ where: { id: req.params.id } });
  if (!record) return res.status(404).json({ error: "Credit record not found" });
  if (record.isSettled) return res.status(400).json({ error: "Credit already settled" });

  const { amount, paymentMethod, note } = parsed.data;

  if (amount > Number(record.pendingAmount)) {
    return res.status(400).json({ error: "Payment exceeds pending amount" });
  }

  const newPaid = Number(record.paidAmount) + amount;
  const newPending = Number(record.pendingAmount) - amount;
  const isSettled = newPending <= 0;

  const [updated, payment] = await prisma.$transaction([
    prisma.creditRecord.update({
      where: { id: record.id },
      data: {
        paidAmount: newPaid,
        pendingAmount: newPending,
        isSettled,
        settledAt: isSettled ? new Date() : null,
      },
    }),
    prisma.creditPayment.create({
      data: { creditRecordId: record.id, amount, paymentMethod, note },
    }),
    // also update parent invoice's paid/pending amounts
    prisma.invoice.update({
      where: { id: record.invoiceId },
      data: {
        paidAmount: newPaid,
        pendingAmount: newPending,
        status: isSettled ? "PAID" : "PARTIAL",
      },
    }),
  ]);

  return res.json({ record: updated, payment });
});

export default router;

/**
 * POST /api/credit/from-invoice/:invoiceId
 * Converts a walk-in partial/unpaid invoice into a tracked credit record
 * by linking it to an existing or new customer.
 */
router.post("/from-invoice/:invoiceId", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const schema = z.object({ customerId: z.string().min(1), dueDate: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  // @ts-ignore
  if ((invoice as any).creditRecord) return res.status(400).json({ error: "Credit record already exists for this invoice" });
  if (Number(invoice.pendingAmount) <= 0) return res.status(400).json({ error: "Invoice has no pending balance" });

  const [record] = await prisma.$transaction([
    prisma.creditRecord.create({
      data: {
        invoiceId: invoice.id,
        customerId: parsed.data.customerId,
        totalAmount: Number(invoice.grandTotal),
        paidAmount: Number(invoice.paidAmount),
        pendingAmount: Number(invoice.pendingAmount),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { customerId: parsed.data.customerId },
    }),
  ]);

  return res.json({ record });
});
