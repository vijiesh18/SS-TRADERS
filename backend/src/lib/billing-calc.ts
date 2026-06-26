/**
 * Pure GST / payment math for invoices.
 *
 * Kept free of Prisma and Express so it can be unit-tested in isolation.
 * S.S Traders is an intra-state (Tamil Nadu, GSTIN 33…) seller, so GST is
 * always split equally into CGST + SGST and IGST is zero.
 *
 * IMPORTANT: This module is the single source of truth for billing math.
 * Do not duplicate these formulas elsewhere — call these helpers instead.
 */

export interface BillLineInput {
  quantity: number;
  rate: number;
  discountPercent: number;
  /** Resolved GST % for the line (item override or product default). */
  gstPercentage: number;
}

export interface ComputedLine {
  quantity: number;
  rate: number;
  discountPercent: number;
  gstPercentage: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface BillTotals {
  computedLines: ComputedLine[];
  subTotal: number;
  totalDiscount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

/** Computes taxable amount, GST and line total for a single bill line. */
export function computeLine(item: BillLineInput): ComputedLine {
  const gross = item.quantity * item.rate;
  const discountAmount = (gross * item.discountPercent) / 100;
  const taxable = gross - discountAmount;
  const gstAmount = (taxable * item.gstPercentage) / 100;
  const total = taxable + gstAmount;

  return {
    quantity: item.quantity,
    rate: item.rate,
    discountPercent: item.discountPercent,
    gstPercentage: item.gstPercentage,
    taxableAmount: taxable,
    gstAmount,
    totalAmount: total,
  };
}

/** Aggregates all bill lines into invoice-level totals with CGST/SGST split. */
export function computeBillTotals(items: BillLineInput[]): BillTotals {
  let subTotal = 0;
  let gstAmount = 0;
  let totalDiscount = 0;

  const computedLines = items.map((item) => {
    const line = computeLine(item);
    subTotal += line.taxableAmount;
    gstAmount += line.gstAmount;
    totalDiscount += (item.quantity * item.rate * item.discountPercent) / 100;
    return line;
  });

  return {
    computedLines,
    subTotal,
    totalDiscount,
    gstAmount,
    cgstAmount: gstAmount / 2,
    sgstAmount: gstAmount / 2,
    igstAmount: 0,
  };
}

/**
 * Grand total, rounded to 2 decimals. `roundOff` lets the cashier nudge
 * the final payable (e.g. round ₹165.54 → ₹166 with roundOff 0.46).
 */
export function computeGrandTotal(subTotal: number, gstAmount: number, roundOff = 0): number {
  return Math.round((subTotal + gstAmount + roundOff) * 100) / 100;
}

export type InvoiceStatus = "PAID" | "PARTIAL" | "UNPAID";

export interface PaymentResult {
  pendingAmount: number;
  status: InvoiceStatus;
}

/**
 * Determines the outstanding balance and invoice status from the grand total
 * and amount paid. For CREDIT sales the pending amount may be the full total
 * (nothing paid up front); for other methods it is clamped at zero.
 */
export function computePaymentStatus(
  grandTotal: number,
  paidAmount: number,
  paymentMethod: string
): PaymentResult {
  const pendingAmount =
    paymentMethod === "CREDIT" ? grandTotal - paidAmount : Math.max(0, grandTotal - paidAmount);

  const status: InvoiceStatus =
    pendingAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  return { pendingAmount, status };
}
