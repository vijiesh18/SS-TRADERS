import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { generateEstimateNumber, generateInvoiceNumber } from "@/lib/numbering";
import { generateEstimatePDF } from "@/lib/pdf";

const router = Router();

router.use(authenticate);

const estimateItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  gstPercentage: z.number().min(0).max(100).optional(), // overridable; defaults to product's GST rate if omitted
});

const createEstimateSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(estimateItemSchema).min(1),
});

/**
 * Computes line items + totals for an estimate, allowing per-item GST overrides.
 */
async function computeEstimateTotals(items: z.infer<typeof estimateItemSchema>[]) {
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subTotal = 0;
  let gstAmount = 0;

  const computedItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const gstPct = item.gstPercentage !== undefined ? item.gstPercentage : Number(product.gstPercentage);
    const taxable = item.quantity * item.rate;
    const gst = (taxable * gstPct) / 100;
    subTotal += taxable;
    gstAmount += gst;
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      rate: item.rate,
      gstPercentage: gstPct,
      totalAmount: taxable + gst,
    };
  });

  return { computedItems, subTotal, gstAmount, grandTotal: subTotal + gstAmount };
}

/**
 * POST /api/estimates
 * Create a draft estimate (no stock impact).
 */
router.post("/", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = createEstimateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let totals;
  try {
    totals = await computeEstimateTotals(parsed.data.items);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  const estimateNumber = await generateEstimateNumber();

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber,
      customerId: parsed.data.customerId || null,
      subTotal: totals.subTotal,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
      status: "DRAFT",
      createdById: req.user!.userId,
      items: { create: totals.computedItems },
    },
    include: { items: true, customer: true },
  });

  return res.status(201).json(estimate);
});

/**
 * PUT /api/estimates/:id
 * Edit a draft estimate (customer, items, rates, GST). Only DRAFT estimates
 * can be edited - converted/expired estimates are locked.
 */
router.put("/:id", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = createEstimateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.estimate.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Estimate not found" });
  if (existing.status !== "DRAFT") {
    return res.status(400).json({ error: `Cannot edit an estimate with status ${existing.status}` });
  }

  let totals;
  try {
    totals = await computeEstimateTotals(parsed.data.items);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  const estimate = await prisma.$transaction(async (tx) => {
    await tx.estimateItem.deleteMany({ where: { estimateId: existing.id } });
    return tx.estimate.update({
      where: { id: existing.id },
      data: {
        customerId: parsed.data.customerId || null,
        subTotal: totals.subTotal,
        gstAmount: totals.gstAmount,
        grandTotal: totals.grandTotal,
        items: { create: totals.computedItems },
      },
      include: { items: true, customer: true },
    });
  });

  return res.json(estimate);
});

/**
 * GET /api/estimates
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const where: any = {};
  if (status) where.status = status;

  const estimates = await prisma.estimate.findMany({
    where,
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res.json({ items: estimates });
});

/**
 * GET /api/estimates/:id
 */
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const estimate = await prisma.estimate.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!estimate) return res.status(404).json({ error: "Estimate not found" });
  return res.json(estimate);
});

/**
 * GET /api/estimates/:id/pdf
 * Downloads a printable estimate/quotation PDF.
 */
router.get("/:id/pdf", async (req: AuthRequest, res: Response) => {
  const estimate = await prisma.estimate.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: true },
  });
  if (!estimate) return res.status(404).json({ error: "Estimate not found" });

  generateEstimatePDF(res, {
    estimateNumber: estimate.estimateNumber,
    createdAt: estimate.createdAt,
    status: estimate.status,
    customer: estimate.customer,
    items: estimate.items.map((i) => ({
      productName: i.productName,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      gstPercentage: Number(i.gstPercentage),
      totalAmount: Number(i.totalAmount),
    })),
    subTotal: Number(estimate.subTotal),
    gstAmount: Number(estimate.gstAmount),
    grandTotal: Number(estimate.grandTotal),
  });
});

/**
 * POST /api/estimates/:id/convert
 * Convert estimate -> GST invoice (deducts stock, creates invoice record).
 */
router.post("/:id/convert", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const estimate = await prisma.estimate.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } } },
  });

  if (!estimate) return res.status(404).json({ error: "Estimate not found" });
  if (estimate.status === "CONVERTED") {
    return res.status(400).json({ error: "Estimate already converted" });
  }

  const paymentMethod = (req.body.paymentMethod as string) || "CASH";
  const paidAmount = Number(req.body.paidAmount) || Number(estimate.grandTotal);

  for (const item of estimate.items) {
    if (Number(item.product.stockQuantity) < Number(item.quantity)) {
      return res.status(400).json({ error: `Insufficient stock for ${item.productName}` });
    }
  }

  const invoiceNumber = await generateInvoiceNumber();
  let cgst = 0,
    sgst = 0;
  for (const item of estimate.items) {
    const gst = Number(item.totalAmount) - Number(item.quantity) * Number(item.rate);
    cgst += gst / 2;
    sgst += gst / 2;
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: estimate.customerId,
        subTotal: estimate.subTotal,
        gstAmount: estimate.gstAmount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        grandTotal: estimate.grandTotal,
        paymentMethod: paymentMethod as any,
        paidAmount,
        pendingAmount: Math.max(0, Number(estimate.grandTotal) - paidAmount),
        status: paidAmount >= Number(estimate.grandTotal) ? "PAID" : "PARTIAL",
        createdById: req.user!.userId,
        items: {
          create: estimate.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            hsnCode: item.product.hsnCode,
            quantity: item.quantity,
            rate: item.rate,
            gstPercentage: item.gstPercentage,
            taxableAmount: Number(item.quantity) * Number(item.rate),
            gstAmount: Number(item.totalAmount) - Number(item.quantity) * Number(item.rate),
            totalAmount: item.totalAmount,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of estimate.items) {
      const newQty = Number(item.product.stockQuantity) - Number(item.quantity);
      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newQty } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "SALE_OUT",
          quantity: item.quantity,
          balanceAfter: newQty,
          reference: invoiceNumber,
          note: `Converted from estimate ${estimate.estimateNumber}`,
          createdById: req.user!.userId,
        },
      });
    }

    await tx.estimate.update({
      where: { id: estimate.id },
      data: { status: "CONVERTED", convertedInvoiceId: created.id },
    });

    return created;
  });

  return res.status(201).json(invoice);
});

export default router;
