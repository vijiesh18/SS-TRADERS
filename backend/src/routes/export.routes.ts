import { Router } from "express";
import type { Response } from "express";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { exportToExcel, exportToCSV } from "@/lib/exporters";
import { generateReportPDF } from "@/lib/pdf";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN")); // Data Export sidebar - Admin only (export data permission)

async function respond(res: Response, format: string, name: string, rows: Record<string, any>[], title: string) {
  if (format === "excel") return exportToExcel(res, name, rows);
  if (format === "pdf") return generateReportPDF(res, title, rows);
  return exportToCSV(res, name, rows); // default csv
}

/**
 * GET /api/export/products?format=excel|csv|pdf
 */
router.get("/products", async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "csv";
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: { brand: true, category: true },
  });

  const rows = products.map((p) => ({
    productCode: p.productCode,
    name: p.name,
    brand: p.brand?.name || "",
    category: p.category?.name || "",
    barcode: p.barcode || "",
    hsnCode: p.hsnCode || "",
    gst: Number(p.gstPercentage),
    unit: p.unit,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    stock: Number(p.stockQuantity),
    minStock: Number(p.minimumStock),
  }));

  return respond(res, format, "products_export", rows, "Products Export");
});

/**
 * GET /api/export/customers?format=
 */
router.get("/customers", async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "csv";
  const customers = await prisma.customer.findMany();
  const rows = customers.map((c) => ({
    name: c.name,
    phone: c.phone,
    address: c.address || "",
    gstNumber: c.gstNumber || "",
    createdAt: c.createdAt.toISOString().slice(0, 10),
  }));
  return respond(res, format, "customers_export", rows, "Customers Export");
});

/**
 * GET /api/export/invoices?format=
 */
router.get("/invoices", async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "csv";
  const invoices = await prisma.invoice.findMany({
    where: { isDeleted: false },
    include: { customer: true },
  });
  const rows = invoices.map((i) => ({
    invoiceNumber: i.invoiceNumber,
    date: i.createdAt.toISOString().slice(0, 10),
    customer: i.customer?.name || "Walk-in",
    grandTotal: Number(i.grandTotal),
    status: i.status,
    paymentMethod: i.paymentMethod,
  }));
  return respond(res, format, "invoices_export", rows, "Invoices Export");
});

/**
 * GET /api/export/inventory?format=
 */
router.get("/inventory", async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "csv";
  const products = await prisma.product.findMany({ where: { isDeleted: false } });
  const rows = products.map((p) => ({
    productCode: p.productCode,
    name: p.name,
    stock: Number(p.stockQuantity),
    minStock: Number(p.minimumStock),
    purchasePrice: Number(p.purchasePrice),
    stockValue: Number(p.stockQuantity) * Number(p.purchasePrice),
  }));
  return respond(res, format, "inventory_export", rows, "Inventory Export");
});

/**
 * GET /api/export/expenses?format=
 */
router.get("/expenses", async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "csv";
  const expenses = await prisma.expense.findMany({ include: { enteredBy: { select: { name: true } } } });
  const rows = expenses.map((e) => ({
    date: e.expenseDate.toISOString().slice(0, 10),
    category: e.category,
    description: e.description || "",
    amount: Number(e.amount),
    enteredBy: e.enteredBy.name,
  }));
  return respond(res, format, "expenses_export", rows, "Expenses Export");
});

/**
 * GET /api/export/credit?format=
 */
router.get("/credit", async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "csv";
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
  return respond(res, format, "credit_export", rows, "Credit Records Export");
});

/**
 * GET /api/export/suppliers?format=
 */
router.get("/suppliers", async (req: AuthRequest, res: Response) => {
  const format = (req.query.format as string) || "csv";
  const suppliers = await prisma.supplier.findMany();
  const rows = suppliers.map((s) => ({
    name: s.name,
    phone: s.phone || "",
    gstNumber: s.gstNumber || "",
    outstandingBalance: Number(s.outstandingBalance),
  }));
  return respond(res, format, "suppliers_export", rows, "Suppliers Export");
});

export default router;
