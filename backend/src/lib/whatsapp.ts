/**
 * Device WhatsApp Integration (NO WhatsApp Business API)
 *
 * Generates a `wa.me` deep link that opens the device's WhatsApp app
 * with a pre-filled message to the customer. The staff member then
 * manually attaches and sends the invoice PDF (downloaded separately
 * via /api/billing/invoices/:id/pdf).
 *
 * Workflow:
 *   1. Generate Invoice PDF (download)
 *   2. Open this link -> WhatsApp opens with chat + prefilled text
 *   3. Staff manually attaches the downloaded PDF and sends
 */

const BUSINESS_NAME = process.env.BUSINESS_NAME || "S.S Traders";

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

export function buildWhatsAppMessage(invoiceNumber: string): string {
  return [
    `Thank you for shopping with ${BUSINESS_NAME}.`,
    "",
    `Invoice No: ${invoiceNumber}`,
    "",
    "Regards,",
    BUSINESS_NAME,
  ].join("\n");
}

/**
 * Returns a wa.me link e.g.
 * https://wa.me/919876543210?text=Thank%20you%20for%20shopping...
 */
export function buildWhatsAppLink(phone: string, invoiceNumber: string): string {
  const normalized = normalizePhone(phone);
  const message = buildWhatsAppMessage(invoiceNumber);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
