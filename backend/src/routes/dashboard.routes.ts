import { Router } from "express";
import type { Response } from "express";
import prisma from "@/lib/prisma";
import { authenticate, type AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d: Date) {
  const date = startOfDay(d);
  const day = date.getDay(); // 0 = Sunday
  date.setDate(date.getDate() - day);
  return date;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

async function sumSales(from: Date, to?: Date) {
  const where: any = {
    isDeleted: false,
    isCancelled: false,
    createdAt: { gte: from },
  };
  if (to) where.createdAt.lt = to;

  const agg = await prisma.invoice.aggregate({
    where,
    _sum: { grandTotal: true },
    _count: true,
  });
  return { total: Number(agg._sum.grandTotal || 0), count: agg._count };
}

/**
 * GET /api/dashboard/summary
 * Returns all the analytics cards for the dashboard.
 */
router.get("/summary", async (_req: AuthRequest, res: Response) => {
  const now = new Date();

  const [today, week, month, year, allTime] = await Promise.all([
    sumSales(startOfDay(now)),
    sumSales(startOfWeek(now)),
    sumSales(startOfMonth(now)),
    sumSales(startOfYear(now)),
    sumSales(new Date(0)),
  ]);

  // Profit = sum((sellingRate - product.purchasePrice) * qty) approximated via taxableAmount - purchase cost
  const items = await prisma.billItem.findMany({
    where: { invoice: { isDeleted: false, isCancelled: false } },
    include: { product: { select: { purchasePrice: true } } },
  });

  let totalProfit = 0;
  for (const item of items) {
    const cost = Number(item.product.purchasePrice) * Number(item.quantity);
    totalProfit += Number(item.taxableAmount) - cost;
  }

  const [pendingCreditAgg, overdueCount, pendingInvoicesAgg, lowStockCount, customerCount, productCount] = await Promise.all([
    prisma.creditRecord.aggregate({ where: { isSettled: false }, _sum: { pendingAmount: true } }),
    prisma.creditRecord.count({
      where: { isSettled: false, dueDate: { lt: startOfDay(now) } },
    }),
    // Also count walk-in partial/unpaid invoices without a credit record
    prisma.invoice.aggregate({
      where: { isDeleted: false, status: { in: ["PARTIAL", "UNPAID"] }, pendingAmount: { gt: 0 }, creditRecord: null },
      _sum: { pendingAmount: true },
      _count: true,
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM products
      WHERE "isDeleted" = false AND "stockQuantity" <= "minimumStock"
    `,
    prisma.customer.count(),
    prisma.product.count({ where: { isDeleted: false } }),
  ]);

  const totalPendingCredits =
    Number(pendingCreditAgg._sum.pendingAmount || 0) +
    Number(pendingInvoicesAgg._sum.pendingAmount || 0);
  const pendingCreditCount = (pendingCreditAgg._count || 0) + (pendingInvoicesAgg._count || 0);

  return res.json({
    todaySales: today.total,
    weeklySales: week.total,
    monthlySales: month.total,
    yearlySales: year.total,
    totalRevenue: allTime.total,
    totalProfit,
    pendingCredits: totalPendingCredits,
    pendingCreditCount,
    overdueCredits: overdueCount,
    lowStockProducts: Number(lowStockCount[0]?.count || 0),
    totalCustomers: customerCount,
    totalProducts: productCount,
  });
});

/**
 * GET /api/dashboard/charts?period=daily|weekly|monthly|yearly&from=&to=
 * Returns time series for revenue, profit, sales trend.
 */
router.get("/charts", async (req: AuthRequest, res: Response) => {
  const period = (req.query.period as string) || "monthly";
  let from = req.query.from ? new Date(req.query.from as string) : undefined;
  let to = req.query.to ? new Date(req.query.to as string) : undefined;

  if (!from) {
    const now = new Date();
    if (period === "daily") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (period === "weekly") from = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    else if (period === "yearly") from = new Date(now.getFullYear() - 5, 0, 1);
    else from = new Date(now.getFullYear(), 0, 1); // monthly -> this year
  }

  const dateTrunc = period === "daily" ? "day" : period === "weekly" ? "week" : period === "yearly" ? "year" : "month";

  const revenueTrend = await prisma.$queryRawUnsafe<{ bucket: Date; total: number }[]>(
    `SELECT date_trunc('${dateTrunc}', "createdAt") as bucket, SUM("grandTotal")::float as total
     FROM invoices
     WHERE "isDeleted" = false AND "isCancelled" = false AND "createdAt" >= $1 ${to ? `AND "createdAt" <= $2` : ""}
     GROUP BY bucket ORDER BY bucket ASC`,
    ...(to ? [from, to] : [from])
  );

  const categoryPerformance = await prisma.$queryRawUnsafe<{ category: string; total: number }[]>(
    `SELECT c.name as category, SUM(bi."totalAmount")::float as total
     FROM bill_items bi
     JOIN products p ON p.id = bi."productId"
     LEFT JOIN categories c ON c.id = p."categoryId"
     JOIN invoices i ON i.id = bi."invoiceId"
     WHERE i."isDeleted" = false AND i."isCancelled" = false AND i."createdAt" >= $1
     GROUP BY c.name ORDER BY total DESC LIMIT 10`,
    from
  );

  const productPerformance = await prisma.$queryRawUnsafe<{ name: string; total: number; quantity: number }[]>(
    `SELECT bi."productName" as name, SUM(bi."totalAmount")::float as total, SUM(bi."quantity")::float as quantity
     FROM bill_items bi
     JOIN invoices i ON i.id = bi."invoiceId"
     WHERE i."isDeleted" = false AND i."isCancelled" = false AND i."createdAt" >= $1
     GROUP BY bi."productName" ORDER BY total DESC LIMIT 10`,
    from
  );

  return res.json({
    period,
    revenueTrend,
    categoryPerformance,
    productPerformance,
  });
});

export default router;
