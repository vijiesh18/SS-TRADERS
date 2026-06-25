import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/middleware/auth";
import { verifyAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

const DEMO_EMAIL = "demo@sstraders.com";

function isDemoUser(req: AuthRequest): boolean {
  if (req.user) return req.user.email === DEMO_EMAIL;
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return false;
    const payload = verifyAccessToken(header.split(" ")[1]);
    return payload.email === DEMO_EMAIL;
  } catch {
    return false;
  }
}

async function getDemoDashboard() {
  const productCount = await prisma.product.count({ where: { isDeleted: false } });
  return {
    todaySales: 0, weeklySales: 0, monthlySales: 0, yearlySales: 0,
    totalRevenue: 0, totalProfit: 0, pendingCredits: 0, pendingCreditCount: 0,
    overdueCredits: 0, lowStockProducts: 0, totalCustomers: 0, totalProducts: productCount,
  };
}

const EMPTY = { items: [], total: 0, page: 1, limit: 25 };

const ROUTE_EMPTY_GET: Record<string, (req: AuthRequest) => any> = {
  "GET /api/dashboard/summary": () => getDemoDashboard(),
  "GET /api/dashboard/charts": () => ({ revenueTrend: [], profitTrend: [], topProducts: [], salesByPayment: [] }),
  "GET /api/billing/invoices": () => ({ ...EMPTY }),
  "GET /api/billing/held-bills": () => ({ items: [] }),
  "GET /api/billing/held": () => ({ items: [] }),
  "GET /api/customers": () => ({ ...EMPTY }),
  "GET /api/customers/search": () => ({ results: [] }),
  "GET /api/suppliers": () => ({ ...EMPTY }),
  "GET /api/estimates": () => ({ ...EMPTY }),
  "GET /api/credit": () => ({ items: [], pendingInvoices: [] }),
  "GET /api/credit/summary": () => ({ totalPending: 0, pendingCount: 0, dueTodayCount: 0, overdueCount: 0 }),
  "GET /api/purchases": () => ({ ...EMPTY }),
  "GET /api/expenses": () => ({ items: [], totalAmount: 0, total: 0, page: 1, limit: 25 }),
  "GET /api/reports/sales/preview": () => ({ totalSales: 0, count: 0, rows: [] }),
  "GET /api/reports/profit/preview": () => ({ totalRevenue: 0, totalProfit: 0, rows: [] }),
  "GET /api/reports/gst/preview": () => ({ rows: [] }),
  "GET /api/reports/gstr1": () => ({ b2b: [], b2cSummary: [], hsnSummary: [], totals: { totalTaxable: 0, totalCgst: 0, totalSgst: 0, b2bCount: 0, b2cInvoiceCount: 0 } }),
  "GET /api/reports/inventory/preview": () => ({ totalStockValue: 0, rows: [] }),
  "GET /api/backup": () => [],
  "GET /api/audit-logs": () => ({ items: [], total: 0, page: 1, limit: 25 }),
  "GET /api/export/list": () => [],
  "GET /api/inventory/movements": () => ({ items: [], total: 0, page: 1, limit: 25 }),
  "GET /api/inventory/alerts": () => [],
};

function matchRoute(method: string, path: string): string | null {
  const key = `${method} ${path}`;
  if (ROUTE_EMPTY_GET[key]) return key;
  // Match prefix (e.g. /api/customers/search matches /api/customers)
  // But prefer exact matches — check longest prefix first
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const route of Object.keys(ROUTE_EMPTY_GET)) {
    const [rMethod, routePath] = route.split(" ");
    if (rMethod === method && path.startsWith(routePath) && routePath.length > bestLen) {
      bestMatch = route;
      bestLen = routePath.length;
    }
  }
  return bestMatch;
}

export async function demoGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (!isDemoUser(req)) return next();

  const method = req.method;
  const path = req.path.startsWith("/api") ? req.path : `/api${req.path}`;

  // Allow auth endpoints
  if (path.startsWith("/api/auth")) return next();

  // Allow products & inventory product reads (show the real catalog)
  if (method === "GET" && (path.startsWith("/api/products") || path.startsWith("/api/inventory/products"))) return next();

  // Allow settings reads
  if (method === "GET" && path.startsWith("/api/settings")) return next();

  // Allow users read
  if (method === "GET" && path.startsWith("/api/users")) return next();

  // Check for pre-defined empty GET responses
  if (method === "GET") {
    const routeKey = matchRoute(method, path);
    if (routeKey) {
      const result = ROUTE_EMPTY_GET[routeKey](req);
      if (result && typeof result.then === "function") {
        return result.then((data: any) => res.json(data));
      }
      return res.json(result);
    }
    // For unmatched GETs (e.g. /api/billing/invoices/:id), return empty object
    return res.json({});
  }

  // All write operations — return fake success
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (method === "POST" && path === "/api/billing/invoices") {
      return res.json({
        id: "demo-" + Date.now(),
        invoiceNumber: "DEMO-" + String(Math.floor(Math.random() * 100000)).padStart(6, "0"),
        status: "PAID",
        grandTotal: 0,
        message: "Demo mode — invoice not saved",
      });
    }

    return res.json({
      success: true,
      message: "Demo mode — changes not saved",
      id: "demo-" + Date.now(),
    });
  }

  next();
}
