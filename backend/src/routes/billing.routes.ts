import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate, authorize, type AuthRequest } from "@/middleware/auth";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";
import { generateInvoiceNumber } from "@/lib/numbering";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { generateInvoicePDF, generateThermalReceipt } from "@/lib/pdf";

const router = Router();

router.use(authenticate);

const billItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(), // selling price per unit (overridable)
  discountPercent: z.number().min(0).max(100).default(0),
  gstPercentage: z.number().min(0).max(100).optional(), // overridable; defaults to product's GST rate if omitted
  shadeCode: z.string().optional(), // colour/shade code, overridable per sale
});

const createInvoiceSchema = z.object({
  customerId: z.string().optional().nullable(),
  walkInPhone: z.string().optional().nullable(), // mobile for WhatsApp without saving a customer
  items: z.array(billItemSchema).min(1),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "CREDIT", "SPLIT"]).default("CASH"),
  paidAmount: z.number().min(0).default(0),
  dueDate: z.string().datetime().optional(), // for CREDIT
  roundOff: z.number().default(0),
});

/**
 * Computes per-item taxable amount, GST split (CGST/SGST for intra-state),
 * and totals for an invoice given line items and product GST rates.
 */
async function computeInvoiceTotals(items: z.infer<typeof billItemSchema>[]) {
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subTotal = 0;
  let totalGst = 0;
  let totalDiscount = 0;

  const computedItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);

    const gross = item.quantity * item.rate;
    const discountAmount = (gross * item.discountPercent) / 100;
    const taxable = gross - discountAmount;
    const gstPct = item.gstPercentage !== undefined ? item.gstPercentage : Number(product.gstPercentage);
    const gstAmount = (taxable * gstPct) / 100;
    const total = taxable + gstAmount;

    subTotal += taxable;
    totalGst += gstAmount;
    totalDiscount += discountAmount;

    return {
      product,
      quantity: item.quantity,
      rate: item.rate,
      discountPercent: item.discountPercent,
      gstPercentage: gstPct,
      shadeCode: item.shadeCode !== undefined ? item.shadeCode : product.shadeCode,
      taxableAmount: taxable,
      gstAmount,
      totalAmount: total,
    };
  });

  // Intra-state (Tamil Nadu, S.S Traders GSTIN starts with 33) → split GST into CGST + SGST equally
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const igst = 0;

  return {
    computedItems,
    subTotal,
    totalDiscount,
    gstAmount: totalGst,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
  };
}

/**
 * POST /api/billing/calculate
 * Preview totals without creating an invoice (used live in POS UI).
 */
router.post("/calculate", async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ items: z.array(billItemSchema).min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const totals = await computeInvoiceTotals(parsed.data.items);
    const grandTotal = totals.subTotal + totals.gstAmount;
    return res.json({ ...totals, grandTotal });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/billing/invoices
 * Generate a GST invoice, deduct stock, create credit record if applicable.
 */
router.post("/invoices", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { customerId, walkInPhone, items, paymentMethod, paidAmount, dueDate, roundOff } = parsed.data;

  let totals;
  try {
    totals = await computeInvoiceTotals(items);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  // Validate stock availability
  for (const item of totals.computedItems) {
    if (Number(item.product.stockQuantity) < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for ${item.product.name}. Available: ${item.product.stockQuantity}`,
      });
    }
  }

  const grandTotal = Math.round((totals.subTotal + totals.gstAmount + roundOff) * 100) / 100;
  const invoiceNumber = await generateInvoiceNumber();

  const pendingAmount =
    paymentMethod === "CREDIT" ? grandTotal - paidAmount : Math.max(0, grandTotal - paidAmount);

  const status =
    pendingAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: customerId || null,
        subTotal: totals.subTotal,
        discountAmount: totals.totalDiscount,
        gstAmount: totals.gstAmount,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        roundOff,
        grandTotal,
        paymentMethod,
        paidAmount,
        pendingAmount: Math.max(0, pendingAmount),
        status,
        createdById: req.user!.userId,
        items: {
          create: totals.computedItems.map((ci) => ({
            productId: ci.product.id,
            productName: ci.product.name,
            hsnCode: ci.product.hsnCode,
            shadeCode: ci.shadeCode,
            quantity: ci.quantity,
            rate: ci.rate,
            discountPercent: ci.discountPercent,
            gstPercentage: ci.gstPercentage,
            taxableAmount: ci.taxableAmount,
            gstAmount: ci.gstAmount,
            totalAmount: ci.totalAmount,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    // Deduct stock & record movements
    for (const ci of totals.computedItems) {
      const newQty = Number(ci.product.stockQuantity) - ci.quantity;
      await tx.product.update({
        where: { id: ci.product.id },
        data: { stockQuantity: newQty },
      });
      await tx.stockMovement.create({
        data: {
          productId: ci.product.id,
          type: "SALE_OUT",
          quantity: ci.quantity,
          balanceAfter: newQty,
          reference: invoiceNumber,
          createdById: req.user!.userId,
        },
      });
    }

    // Create credit record if there's a pending balance and customer is known
    if (pendingAmount > 0 && customerId) {
      await tx.creditRecord.create({
        data: {
          invoiceId: created.id,
          customerId,
          totalAmount: grandTotal,
          paidAmount,
          pendingAmount,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });
    }

    return created;
  });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.INVOICE_CREATE,
    entityType: "Invoice",
    entityId: invoice.id,
    details: { invoiceNumber, grandTotal },
    ipAddress: req.ip,
  });

  // Build WhatsApp link from saved customer phone, or walk-in phone fallback
  let whatsappLink: string | null = null;
  const phoneForWhatsApp = invoice.customer?.phone || walkInPhone;
  if (phoneForWhatsApp) {
    whatsappLink = buildWhatsAppLink(phoneForWhatsApp, invoice.invoiceNumber);
  }

  return res.status(201).json({ invoice, whatsappLink });
});

/**
 * GET /api/billing/invoices
 * List invoices with filters.
 */
router.get("/invoices", async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 25, 200);
  const status = req.query.status as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const search = req.query.search as string | undefined;

  const where: any = { isDeleted: false };
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: true, items: true, createdBy: { select: { name: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where }),
  ]);

  return res.json({ items, total, page, limit });
});

/**
 * GET /api/billing/invoices/:id
 */
router.post("/invoices/bulk-cancel", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    invoiceIds: z.array(z.string()).min(1),
    reason: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { invoiceIds, reason } = parsed.data;
  let cancelled = 0, skipped = 0;

  for (const id of invoiceIds) {
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice || invoice.isCancelled) { skipped++; continue; }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledById: req.user!.userId,
          cancelReason: reason,
          status: "CANCELLED",
        },
      });
      for (const item of invoice.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const newQty = Number(product.stockQuantity) + Number(item.quantity);
        await tx.product.update({ where: { id: product.id }, data: { stockQuantity: newQty } });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "RETURN_IN",
            quantity: item.quantity,
            balanceAfter: newQty,
            reference: invoice.invoiceNumber,
            note: `Bulk cancel: ${reason}`,
            createdById: req.user!.userId,
          },
        });
      }
    });
    cancelled++;
  }

  return res.json({ message: `${cancelled} invoice(s) cancelled, ${skipped} skipped`, cancelled, skipped });
});

// ──────────────────────────────────────────────
router.get("/invoices/:id", async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: { include: { product: true } }, createdBy: { select: { name: true } } },
  });

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  return res.json(invoice);
});

const cancelSchema = z.object({ reason: z.string().min(1) });

/**
 * POST /api/billing/invoices/:id/cancel
 * Admin only - cancels invoice and restocks items (soft cancel, never hard delete).
 */
router.post("/invoices/:id/cancel", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const parsed = cancelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  if (invoice.isCancelled) return res.status(400).json({ error: "Invoice already cancelled" });

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledById: req.user!.userId,
        cancelReason: parsed.data.reason,
        status: "CANCELLED",
      },
    });

    // Restock items
    for (const item of invoice.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      const newQty = Number(product.stockQuantity) + Number(item.quantity);
      await tx.product.update({ where: { id: product.id }, data: { stockQuantity: newQty } });
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: "RETURN_IN",
          quantity: item.quantity,
          balanceAfter: newQty,
          reference: invoice.invoiceNumber,
          note: `Invoice cancelled: ${parsed.data.reason}`,
          createdById: req.user!.userId,
        },
      });
    }
  });

  await recordAudit({
    userId: req.user!.userId,
    action: AUDIT_ACTIONS.INVOICE_CANCEL,
    entityType: "Invoice",
    entityId: invoice.id,
    details: { reason: parsed.data.reason },
    ipAddress: req.ip,
  });

  return res.json({ message: "Invoice cancelled and stock restored" });
});

/**
 * POST /api/billing/invoices/bulk-cancel
 * Cancels multiple invoices at once (e.g. clearing test data before go-live).
 * Restocks items for each. Admin only.
 */
// HELD / DRAFT BILLS
// ──────────────────────────────────────────────

// Held bills store the full cart item shape (including display fields like
// name, unit, gstPercentage, stockQuantity) so the UI can restore the cart
// exactly as it was without re-fetching product details. Use a passthrough
// schema so these extra fields aren't stripped.
const cartItemSchema = billItemSchema.passthrough();

const heldBillSchema = z.object({
  label: z.string().optional(),
  customerId: z.string().optional().nullable(),
  items: z.array(cartItemSchema),
});

/**
 * POST /api/billing/held-bills
 * Hold a bill in progress.
 */
router.post("/held-bills", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  const parsed = heldBillSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const held = await prisma.heldBill.create({
    data: {
      label: parsed.data.label,
      customerId: parsed.data.customerId || null,
      itemsJson: parsed.data.items as any,
      createdById: req.user!.userId,
      status: "HELD",
    },
  });

  return res.status(201).json(held);
});

/**
 * GET /api/billing/held-bills
 * List held bills (resume bill workflow).
 */
router.get("/held-bills", async (_req: AuthRequest, res: Response) => {
  const held = await prisma.heldBill.findMany({
    where: { status: "HELD" },
    include: { customer: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ items: held });
});

/**
 * DELETE /api/billing/held-bills/:id
 * Discard a held bill (after resume & convert, or manual discard).
 */
router.delete("/held-bills/:id", authorize("ADMIN", "STAFF"), async (req: AuthRequest, res: Response) => {
  await prisma.heldBill.delete({ where: { id: req.params.id } });
  return res.json({ message: "Held bill removed" });
});

/**
 * GET /api/billing/invoices/:id/pdf
 * Downloads a GST-compliant invoice PDF (for printing or WhatsApp attachment).
 */
router.get("/invoices/:id/pdf", async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: true },
  });

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  await generateInvoicePDF(res, {
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    customer: invoice.customer,
    items: invoice.items.map((i) => ({
      productName: i.productName,
      hsnCode: i.hsnCode,
      shadeCode: i.shadeCode,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      gstPercentage: Number(i.gstPercentage),
      taxableAmount: Number(i.taxableAmount),
      gstAmount: Number(i.gstAmount),
      totalAmount: Number(i.totalAmount),
    })),
    subTotal: Number(invoice.subTotal),
    discountAmount: Number(invoice.discountAmount),
    cgstAmount: Number(invoice.cgstAmount),
    sgstAmount: Number(invoice.sgstAmount),
    gstAmount: Number(invoice.gstAmount),
    grandTotal: Number(invoice.grandTotal),
    paymentMethod: invoice.paymentMethod,
    paidAmount: Number(invoice.paidAmount),
    pendingAmount: Number(invoice.pendingAmount),
  });
});

/**
 * GET /api/billing/invoices/:id/receipt
 * Generates a compact thermal receipt PDF (80mm width).
 */
router.get("/invoices/:id/receipt", async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: true },
  });

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  generateThermalReceipt(res, {
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    customer: invoice.customer,
    items: invoice.items.map((i) => ({
      productName: i.productName,
      hsnCode: i.hsnCode,
      shadeCode: i.shadeCode,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      gstPercentage: Number(i.gstPercentage),
      taxableAmount: Number(i.taxableAmount),
      gstAmount: Number(i.gstAmount),
      totalAmount: Number(i.totalAmount),
    })),
    subTotal: Number(invoice.subTotal),
    discountAmount: Number(invoice.discountAmount),
    cgstAmount: Number(invoice.cgstAmount),
    sgstAmount: Number(invoice.sgstAmount),
    gstAmount: Number(invoice.gstAmount),
    grandTotal: Number(invoice.grandTotal),
    paymentMethod: invoice.paymentMethod,
    paidAmount: Number(invoice.paidAmount),
    pendingAmount: Number(invoice.pendingAmount),
  });
});

/**
 * GET /api/billing/invoices/:id/whatsapp-link
 * Returns the wa.me deep link for sending this invoice via device WhatsApp.
 */
router.get("/invoices/:id/whatsapp-link", async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true },
  });

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  if (!invoice.customer?.phone) {
    return res.status(400).json({ error: "Customer phone number not available" });
  }

  const link = buildWhatsAppLink(invoice.customer.phone, invoice.invoiceNumber);
  return res.json({ whatsappLink: link });
});

export default router;
