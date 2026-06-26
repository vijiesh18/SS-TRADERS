import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/middleware/auth";
import { verifyAccessToken } from "@/lib/jwt";
import { computeBillTotals } from "@/lib/billing-calc";
import {
  demoDashboardSummary, demoDashboardCharts, demoInvoices, demoCustomers,
  demoSuppliers, demoCredit, demoCreditSummary, demoSalesReport,
  demoProfitReport, demoGstReport, demoInventoryReport, demoExpenses,
  demoProducts, demoProductSearch, demoCategoriesList, demoLowStock,
} from "@/lib/demo-data";

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

const EMPTY = { items: [], total: 0, page: 1, limit: 25 };

const ROUTE_EMPTY_GET: Record<string, (req: AuthRequest) => any> = {
  "GET /api/dashboard/summary": () => demoDashboardSummary(),
  "GET /api/dashboard/charts": (req) => demoDashboardCharts((req.query.period as string) || "monthly"),
  "GET /api/billing/invoices": () => demoInvoices(),
  "GET /api/billing/held-bills": () => ({ items: [] }),
  "GET /api/billing/held": () => ({ items: [] }),
  "GET /api/customers": () => demoCustomers(),
  "GET /api/customers/search": () => ({ results: [] }),
  "GET /api/suppliers": () => demoSuppliers(),
  "GET /api/estimates": () => ({ ...EMPTY }),
  "GET /api/credit": () => demoCredit(),
  "GET /api/credit/summary": () => demoCreditSummary(),
  "GET /api/purchases": () => ({ ...EMPTY }),
  "GET /api/expenses": () => demoExpenses(),
  "GET /api/reports/sales": () => demoSalesReport(),
  "GET /api/reports/profit": () => demoProfitReport(),
  "GET /api/reports/gst": () => demoGstReport(),
  "GET /api/reports/gstr1": () => ({ b2b: [], b2cSummary: [], hsnSummary: [], totals: { totalTaxable: 0, totalCgst: 0, totalSgst: 0, b2bCount: 0, b2cInvoiceCount: 0 } }),
  "GET /api/reports/inventory": () => demoInventoryReport(),
  "GET /api/reports/customers": () => ({ items: [], total: 0 }),
  "GET /api/reports/credit": () => ({ items: [], total: 0 }),
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

  // Allow settings reads
  if (method === "GET" && path.startsWith("/api/settings")) return next();

  // Allow users read (masked in the UI)
  if (method === "GET" && path.startsWith("/api/users")) return next();

  // ── Sample product catalogue (so the demo looks fully stocked) ──
  if (method === "GET") {
    if (path === "/api/products" || path === "/api/inventory/products")
      return res.json(demoProducts(req.query.search as string, Number(req.query.page) || 1, Number(req.query.limit) || 30));
    if (path === "/api/products/search")
      return res.json(demoProductSearch(req.query.q as string));
    if (path === "/api/products/categories")
      return res.json(demoCategoriesList());
    if (path.startsWith("/api/products/barcode/"))
      return res.status(404).json({ error: "No product found for this barcode in demo." });
    if (path.endsWith("/recommendations"))
      return res.json({ results: [] });
    if (path === "/api/inventory/low-stock")
      return res.json(demoLowStock());
    if (path === "/api/inventory/dead-stock")
      return res.json({ items: [], cutoffDays: Number(req.query.days) || 90 });
    if (path === "/api/inventory/fast-moving")
      return res.json({ items: [], periodDays: Number(req.query.days) || 30 });
    // Single product detail (/api/products/:id) — not needed in demo flows
    if (path.startsWith("/api/products/"))
      return res.json({});
  }

  // ── Bill preview (POST but read-only) — compute live so totals work ──
  if (method === "POST" && path === "/api/billing/calculate") {
    const items = (req.body?.items || []).map((i: any) => ({
      quantity: Number(i.quantity) || 0,
      rate: Number(i.rate) || 0,
      discountPercent: Number(i.discountPercent) || 0,
      gstPercentage: i.gstPercentage !== undefined ? Number(i.gstPercentage) : 18,
    }));
    const totals = computeBillTotals(items);
    return res.json({
      computedItems: totals.computedLines,
      subTotal: totals.subTotal,
      totalDiscount: totals.totalDiscount,
      gstAmount: totals.gstAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      grandTotal: totals.subTotal + totals.gstAmount,
    });
  }

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

  // All write operations — block them, flag via header so the UI can explain
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    res.setHeader("X-Demo-Mode", "blocked");

    if (method === "POST" && path === "/api/billing/invoices") {
      // Match the real response shape ({ invoice, whatsappLink }) so the
      // billing page doesn't crash reading result.invoice.id in demo mode.
      return res.json({
        invoice: {
          id: "demo-" + Date.now(),
          invoiceNumber: "DEMO-" + String(Math.floor(Math.random() * 100000)).padStart(6, "0"),
          status: "PAID",
          grandTotal: 0,
        },
        whatsappLink: null,
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
