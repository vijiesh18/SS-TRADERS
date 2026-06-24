import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

const expenseSchema = z.object({
  category: z.enum(["Salary", "Rent", "Electricity", "Transport", "Miscellaneous"]),
  description: z.string().optional(),
  amount: z.number().positive(),
  expenseDate: z.string().datetime().optional(),
});

/**
 * POST /api/expenses
 */
router.post("/", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const expense = await prisma.expense.create({
    data: {
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : new Date(),
      enteredById: req.user!.userId,
    },
  });

  return res.status(201).json(expense);
});

/**
 * GET /api/expenses
 */
router.get("/", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const { from, to, category } = req.query as Record<string, string>;
  const where: any = {};
  if (category) where.category = category;
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate.gte = new Date(from);
    if (to) where.expenseDate.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { expenseDate: "desc" }, include: { enteredBy: { select: { name: true } } } }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return res.json({ items, totalAmount: total._sum.amount || 0 });
});

/**
 * DELETE /api/expenses/:id
 */
router.delete("/:id", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  return res.json({ message: "Expense deleted" });
});

export default router;
