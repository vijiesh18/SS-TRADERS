/**
 * Device WhatsApp Integration (NO WhatsApp Business API)
 *
 * Generates a `wa.me` deep link that opens the device's WhatsApp app with a
 * pre-filled, formatted text bill addressed to the customer's number. The
 * staff member then attaches the invoice PDF (the POS auto-downloads it on
 * click) and sends. wa.me links cannot attach files automatically — that
 * requires the paid WhatsApp Business API.
 */

const BUSINESS_NAME = process.env.BUSINESS_NAME || "S.S Traders";
const BUSINESS_GSTIN = process.env.BUSINESS_GSTIN || "33NQAPS4337D1ZS";

export interface WhatsAppInvoice {
  invoiceNumber: string;
  createdAt?: Date | string | null;
  itemCount?: number;
  subTotal?: number;
  gstAmount?: number;
  grandTotal?: number;
  paidAmount?: number;
  pendingAmount?: number;
}

/**
 * Normalizes an Indian phone number to E.164-ish format for wa.me
 * (digits only, prefixed with country code 91 if missing).
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

function inr(n?: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Builds a formatted, customer-facing text bill for WhatsApp. */
export function buildWhatsAppMessage(inv: WhatsAppInvoice): string {
  const lines: string[] = [`*${BUSINESS_NAME}* — Tax Invoice`, ""];

  lines.push(`Invoice No: ${inv.invoiceNumber}`);
  if (inv.createdAt) {
    lines.push(`Date: ${new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`);
  }
  if (inv.itemCount !== undefined) lines.push(`Items: ${inv.itemCount}`);

  lines.push("");
  if (inv.subTotal !== undefined) lines.push(`Sub Total: ${inr(inv.subTotal)}`);
  if (inv.gstAmount !== undefined) lines.push(`GST: ${inr(inv.gstAmount)}`);
  if (inv.grandTotal !== undefined) lines.push(`*Grand Total: ${inr(inv.grandTotal)}*`);
  if (inv.paidAmount !== undefined) lines.push(`Paid: ${inr(inv.paidAmount)}`);
  if (inv.pendingAmount !== undefined && inv.pendingAmount > 0) {
    lines.push(`Balance Due: ${inr(inv.pendingAmount)}`);
  }

  lines.push("", `Thank you for shopping with ${BUSINESS_NAME}!`);
  if (BUSINESS_GSTIN) lines.push(`GSTIN: ${BUSINESS_GSTIN}`);

  return lines.join("\n");
}

/**
 * Returns a wa.me link that opens a chat with the customer's number and the
 * formatted text bill pre-filled, e.g.
 * https://wa.me/919876543210?text=...
 */
export function buildWhatsAppLink(phone: string, inv: WhatsAppInvoice): string {
  const normalized = normalizePhone(phone);
  const message = buildWhatsAppMessage(inv);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
