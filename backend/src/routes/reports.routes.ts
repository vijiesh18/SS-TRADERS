import { Router } from "express";
import type { Response } from "express";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { exportToExcel, exportToCSV } from "@/lib/exporters";
import { generateReportPDF } from "@/lib/pdf";

const router = Router();

router.use(authenticate);

function parseRange(req: AuthRequest) {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  return { from, to };
}

/**
 * GET /api/reports/sales?from=&to=&format=json|pdf|excel|csv
 */
router.get("/sales", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const { from, to } = parseRange(req);
  const format = (req.query.format as string) || "json";

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: from, lte: to }, isDeleted: false, isCancelled: false },
    include: { customer: true, items: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    date: inv.createdAt.toISOString().slice(0, 10),
    customer: inv.customer?.name || "Walk-in",
    subTotal: Number(inv.subTotal),
    gst: Number(inv.gstAmount),
    grandTotal: Number(inv.grandTotal),
    paymentMethod: inv.paymentMethod,
    status: inv.status,
  }));

  if (format === "excel") return exportToExcel(res, "sales_report", rows);
  if (format === "csv") return exportToCSV(res, "sales_report", rows);
  if (format === "pdf") return generateReportPDF(res, "Sales Report", rows, from, to);

  const totalSales = rows.reduce((sum, r) => sum + r.grandTotal, 0);
  return res.json({ rows, totalSales, count: rows.length, from, to });
});

/**
 * GET /api/reports/profit?from=&to=
 */
router.get("/profit", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const { from, to } = parseRange(req);
  const format = (req.query.format as string) || "json";

  const items = await prisma.billItem.findMany({
    where: {
      invoice: { createdAt: { gte: from, lte: to }, isDeleted: false, isCancelled: false },
    },
    include: { product: { select: { purchasePrice: true, name: true } }, invoice: { select: { createdAt: true, invoiceNumber: true } } },
  });

  const rows = items.map((item) => {
    const cost = Number(item.product.purchasePrice) * Number(item.quantity);
    const revenue = Number(item.taxableAmount);
    return {
      invoiceNumber: item.invoice.invoiceNumber,
      date: item.invoice.createdAt.toISOString().slice(0, 10),
      product: item.productName,
      quantity: Number(item.quantity),
      revenue,
      cost,
      profit: revenue - cost,
    };
  });

  if (format === "excel") return exportToExcel(res, "profit_report", rows);
  if (format === "csv") return exportToCSV(res, "profit_report", rows);
  if (format === "pdf") return generateReportPDF(res, "Profit Report", rows, from, to);

  const totalProfit = rows.reduce((sum, r) => sum + r.profit, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  return res.json({ rows, totalRevenue, totalProfit, from, to });
});

/**
 * GET /api/reports/gst?from=&to=
 * GST report broken down by HSN/tax rate (CGST/SGST split).
 */
router.get("/gst", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const { from, to } = parseRange(req);
  const format = (req.query.format as string) || "json";

  const items = await prisma.billItem.findMany({
    where: {
      invoice: { createdAt: { gte: from, lte: to }, isDeleted: false, isCancelled: false },
    },
  });

  const grouped = new Map<string, { hsnCode: string; gstPercentage: number; taxable: number; gst: number }>();
  for (const item of items) {
    const key = `${item.hsnCode || "N/A"}-${item.gstPercentage}`;
    const entry = grouped.get(key) || {
      hsnCode: item.hsnCode || "N/A",
      gstPercentage: Number(item.gstPercentage),
      taxable: 0,
      gst: 0,
    };
    entry.taxable += Number(item.taxableAmount);
    entry.gst += Number(item.gstAmount);
    grouped.set(key, entry);
  }

  const rows = Array.from(grouped.values()).map((r) => ({
    ...r,
    cgst: r.gst / 2,
    sgst: r.gst / 2,
  }));

  if (format === "excel") return exportToExcel(res, "gst_report", rows);
  if (format === "csv") return exportToCSV(res, "gst_report", rows);
  if (format === "pdf") return generateReportPDF(res, "GST Report", rows, from, to);

  return res.json({ rows, from, to });
});

/**
 * GET /api/reports/inventory
 * Current stock valuation report.
 */
router.get("/inventory", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "json";

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { name: true, productCode: true, stockQuantity: true, purchasePrice: true, sellingPrice: true },
  });

  const rows = products.map((p) => ({
    product: p.name,
    productCode: p.productCode,
    stock: Number(p.stockQuantity),
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    stockValue: Number(p.stockQuantity) * Number(p.purchasePrice),
  }));

  if (format === "excel") return exportToExcel(res, "inventory_report", rows);
  if (format === "csv") return exportToCSV(res, "inventory_report", rows);
  if (format === "pdf") return generateReportPDF(res, "Inventory Report", rows);

  const totalStockValue = rows.reduce((sum, r) => sum + r.stockValue, 0);
  return res.json({ rows, totalStockValue });
});

/**
 * GET /api/reports/customers
 */
router.get("/customers", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "json";

  const customers = await prisma.customer.findMany({
    include: { invoices: { where: { isDeleted: false, isCancelled: false } } },
  });

  const rows = customers.map((c) => ({
    name: c.name,
    phone: c.phone,
    totalOrders: c.invoices.length,
    totalSpent: c.invoices.reduce((sum, i) => sum + Number(i.grandTotal), 0),
  }));

  if (format === "excel") return exportToExcel(res, "customer_report", rows);
  if (format === "csv") return exportToCSV(res, "customer_report", rows);
  if (format === "pdf") return generateReportPDF(res, "Customer Report", rows);

  return res.json({ rows });
});

/**
 * GET /api/reports/credit
 */
router.get("/credit", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "json";

  const records = await prisma.creditRecord.findMany({
    include: { customer: true, invoice: { select: { invoiceNumber: true } } },
  });

  const rows = records.map((r) => ({
    invoiceNumber: r.invoice.invoiceNumber,
    customer: r.customer.name,
    phone: r.customer.phone,
    total: Number(r.totalAmount),
    paid: Number(r.paidAmount),
    pending: Number(r.pendingAmount),
    dueDate: r.dueDate?.toISOString().slice(0, 10) || "",
    settled: r.isSettled,
  }));

  if (format === "excel") return exportToExcel(res, "credit_report", rows);
  if (format === "csv") return exportToCSV(res, "credit_report", rows);
  if (format === "pdf") return generateReportPDF(res, "Credit Report", rows);

/**
 * GET /api/reports/gstr1?from=&to=&format=json|excel|csv
 * GSTR-1 filing format: B2B (registered customers with GSTIN) and
 * B2C (unregistered / walk-in) summaries, plus HSN summary.
 */
router.get("/gstr1", authorize("ADMIN", "ACCOUNTANT"), async (req: AuthRequest, res: Response) => {
  const { from, to } = parseRange(req);
  const format = (req.query.format as string) || "json";

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: from, lte: to }, isDeleted: false, isCancelled: false },
    include: { customer: true, items: true },
    orderBy: { invoiceNumber: "asc" },
  });

  const b2b: any[] = [];
  const b2cMap = new Map<string, { rate: number; taxable: number; cgst: number; sgst: number; count: number }>();
  const hsnMap = new Map<string, { hsn: string; rate: number; qty: number; taxable: number; cgst: number; sgst: number }>();

  for (const inv of invoices) {
    const taxable = Number(inv.subTotal);
    const cgst = Number(inv.cgstAmount);
    const sgst = Number(inv.sgstAmount);

    if (inv.customer?.gstNumber) {
      // B2B — registered customer
      b2b.push({
        gstin: inv.customer.gstNumber,
        customerName: inv.customer.name,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.createdAt.toISOString().split("T")[0],
        invoiceValue: Number(inv.grandTotal),
        taxableValue: taxable,
        cgst, sgst,
      });
    } else {
      // B2C — group by GST rate (using line items for rate accuracy)
      for (const item of inv.items) {
        const rate = Number(item.gstPercentage);
        const key = String(rate);
        const e = b2cMap.get(key) || { rate, taxable: 0, cgst: 0, sgst: 0, count: 0 };
        e.taxable += Number(item.taxableAmount);
        e.cgst += Number(item.gstAmount) / 2;
        e.sgst += Number(item.gstAmount) / 2;
        b2cMap.set(key, e);
      }
    }

    // HSN summary (all invoices)
    for (const item of inv.items) {
      const key = `${item.hsnCode || "N/A"}-${item.gstPercentage}`;
      const e = hsnMap.get(key) || {
        hsn: item.hsnCode || "N/A", rate: Number(item.gstPercentage),
        qty: 0, taxable: 0, cgst: 0, sgst: 0,
      };
      e.qty += Number(item.quantity);
      e.taxable += Number(item.taxableAmount);
      e.cgst += Number(item.gstAmount) / 2;
      e.sgst += Number(item.gstAmount) / 2;
      hsnMap.set(key, e);
    }
  }

  const b2cSummary = Array.from(b2cMap.values());
  const hsnSummary = Array.from(hsnMap.values());

  if (format === "excel" || format === "csv") {
    // Flatten for spreadsheet: combine all three sections with section labels
    const flat: any[] = [];
    flat.push({ Section: "B2B INVOICES (Registered Customers)" });
    b2b.forEach((r) => flat.push({
      Section: "B2B", GSTIN: r.gstin, Customer: r.customerName, Invoice: r.invoiceNumber,
      Date: r.invoiceDate, "Invoice Value": r.invoiceValue, Taxable: r.taxableValue, CGST: r.cgst, SGST: r.sgst,
    }));
    flat.push({});
    flat.push({ Section: "B2C SUMMARY (Walk-in / Unregistered)" });
    b2cSummary.forEach((r) => flat.push({
      Section: "B2C", "GST Rate": `${r.rate}%`, Taxable: r.taxable, CGST: r.cgst, SGST: r.sgst,
    }));
    flat.push({});
    flat.push({ Section: "HSN SUMMARY" });
    hsnSummary.forEach((r) => flat.push({
      Section: "HSN", HSN: r.hsn, "GST Rate": `${r.rate}%`, Qty: r.qty, Taxable: r.taxable, CGST: r.cgst, SGST: r.sgst,
    }));

    if (format === "excel") return exportToExcel(res, "gstr1_report", flat);
    return exportToCSV(res, "gstr1_report", flat);
  }

  const totals = {
    totalTaxable: hsnSummary.reduce((s, r) => s + r.taxable, 0),
    totalCgst: hsnSummary.reduce((s, r) => s + r.cgst, 0),
    totalSgst: hsnSummary.reduce((s, r) => s + r.sgst, 0),
    b2bCount: b2b.length,
    b2cInvoiceCount: invoices.filter((i) => !i.customer?.gstNumber).length,
  };

  return res.json({ b2b, b2cSummary, hsnSummary, totals, from, to });
});

export default router;
