import type { Response } from "express";
import PDFDocument from "pdfkit";

const BUSINESS_NAME = process.env.BUSINESS_NAME || "S.S Traders";
const BUSINESS_GSTIN = process.env.BUSINESS_GSTIN || "33NQAPS4337D1ZS";
const BUSINESS_PHONE = process.env.BUSINESS_PHONE || "6383019535";
const FOOTER_TEXT = `${BUSINESS_NAME} | Contact: ${BUSINESS_PHONE}`;
const INVOICE_FOOTER_TEXT = `Thank you for Shopping - ${BUSINESS_NAME.toUpperCase()}`;

/**
 * Generates a generic tabular report PDF (sales/profit/GST/inventory/etc.)
 */
export function generateReportPDF(
  res: Response,
  title: string,
  rows: Record<string, any>[],
  from?: Date,
  to?: Date
) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/\s+/g, "_").toLowerCase()}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(18).font("Helvetica-Bold").text(BUSINESS_NAME, { align: "center" });
  doc.fontSize(12).font("Helvetica").text(title, { align: "center" });
  if (from && to) {
    doc
      .fontSize(9)
      .text(`Period: ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`, {
        align: "center",
      });
  }
  doc.moveDown();

  if (rows.length === 0) {
    doc.text("No data available for this report.");
  } else {
    const headers = Object.keys(rows[0]);
    const colWidth = (doc.page.width - 80) / headers.length;

    doc.font("Helvetica-Bold").fontSize(8);
    headers.forEach((h, i) => {
      doc.text(h.toUpperCase(), 40 + i * colWidth, doc.y, { width: colWidth, continued: i < headers.length - 1 });
    });
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(8);
    for (const row of rows) {
      const y = doc.y;
      headers.forEach((h, i) => {
        const val = row[h];
        doc.text(String(val ?? ""), 40 + i * colWidth, y, { width: colWidth, continued: i < headers.length - 1 });
      });
      doc.moveDown(0.3);
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
    }
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor("gray").text(FOOTER_TEXT, { align: "center" });

  doc.end();
}

/**
 * Converts a number to words using the Indian numbering system
 * (lakh/crore), e.g. 165554 -> "One Lakh Sixty-Five Thousand Five Hundred Fifty-Four".
 */
function amountInWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? "-" + ones[o] : "");
  }

  function threeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (h === 0) return twoDigits(rest);
    return ones[h] + " Hundred" + (rest ? " " + twoDigits(rest) : "");
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0) return paise > 0 ? `Zero Rupees and ${twoDigits(paise)} Paise Only` : "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(threeDigits(lakh) + " Lakh");
  if (thousand) parts.push(threeDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));

  let words = "Rupees " + parts.join(" ");
  if (paise > 0) {
    words += ` and ${twoDigits(paise)} Paise`;
  }
  return words + " Only";
}

interface InvoicePdfData {
  invoiceNumber: string;
  createdAt: Date;
  customer?: { name: string; phone: string; address?: string | null; gstNumber?: string | null } | null;
  items: {
    productName: string;
    hsnCode?: string | null;
    shadeCode?: string | null;
    quantity: number;
    rate: number;
    gstPercentage: number;
    taxableAmount: number;
    gstAmount: number;
    totalAmount: number;
  }[];
  subTotal: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  gstAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paidAmount: number;
  pendingAmount: number;
}

/**
 * Generates a GST-compliant invoice PDF including QR code.
 */
interface EstimatePdfData {
  estimateNumber: string;
  createdAt: Date;
  status: string;
  customer?: { name: string; phone: string; address?: string | null; gstNumber?: string | null } | null;
  items: {
    productName: string;
    quantity: number;
    rate: number;
    gstPercentage: number;
    totalAmount: number;
  }[];
  subTotal: number;
  gstAmount: number;
  grandTotal: number;
}

/**
 * Generates a printable estimate/quotation PDF.
 */
export function generateEstimatePDF(res: Response, estimate: EstimatePdfData) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${estimate.estimateNumber}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  // Header
  doc.fontSize(20).font("Helvetica-Bold").text(BUSINESS_NAME, { align: "center" });
  doc.fontSize(9).font("Helvetica").text("Paint Shop | Motors | Borewell Materials | Hardware", { align: "center" });
  doc.text(`GSTIN: ${BUSINESS_GSTIN}  |  Phone: ${BUSINESS_PHONE}`, { align: "center" });
  doc.moveDown();

  doc.fontSize(14).font("Helvetica-Bold").text("ESTIMATE / QUOTATION", { align: "center" });
  doc.moveDown(0.5);

  // Estimate meta
  doc.fontSize(10).font("Helvetica");
  doc.text(`Estimate No: ${estimate.estimateNumber}`);
  doc.text(`Date: ${estimate.createdAt.toLocaleDateString("en-IN")}`);
  doc.text(`Status: ${estimate.status}`);
  doc.moveDown(0.5);

  // Customer
  if (estimate.customer) {
    doc.font("Helvetica-Bold").text("Quotation For:");
    doc.font("Helvetica").text(estimate.customer.name);
    doc.text(`Phone: ${estimate.customer.phone}`);
    if (estimate.customer.address) doc.text(estimate.customer.address);
    if (estimate.customer.gstNumber) doc.text(`GSTIN: ${estimate.customer.gstNumber}`);
  } else {
    doc.font("Helvetica-Bold").text("Quotation For: Walk-in Customer");
  }
  doc.moveDown();

  // Items table
  const colWidths = [220, 70, 80, 60, 90, 90];
  const headers = ["Item", "Qty", "Rate", "GST%", "Taxable", "Total"];
  let x = 40;
  const startY = doc.y;

  doc.font("Helvetica-Bold").fontSize(8);
  headers.forEach((h, i) => {
    doc.text(h, x, startY, { width: colWidths[i] });
    x += colWidths[i];
  });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(8);

  for (const item of estimate.items) {
    x = 40;
    const y = doc.y;
    const taxable = item.quantity * item.rate;
    const values = [
      item.productName,
      item.quantity.toFixed(2),
      item.rate.toFixed(2),
      `${item.gstPercentage}%`,
      taxable.toFixed(2),
      item.totalAmount.toFixed(2),
    ];
    values.forEach((v, i) => {
      doc.text(v, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    doc.moveDown(0.4);
    if (doc.y > doc.page.height - 200) doc.addPage();
  }

  doc.moveDown();

  // Totals
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`Sub Total: Rs.${estimate.subTotal.toFixed(2)}`, { align: "right" });
  doc.text(`GST: Rs.${estimate.gstAmount.toFixed(2)}`, { align: "right" });
  doc.fontSize(12).text(`Grand Total: Rs.${estimate.grandTotal.toFixed(2)}`, { align: "right" });
  doc.moveDown();

  doc.fontSize(8).font("Helvetica").fillColor("gray").text(
    "This is an estimate, not a tax invoice. Prices are subject to change.",
    { align: "center" }
  );

  doc.moveDown(2);
  doc.fontSize(8).font("Helvetica").fillColor("gray").text(FOOTER_TEXT, { align: "center" });

  doc.end();
}

export async function generateInvoicePDF(res: Response, invoice: InvoicePdfData) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);

  const doc = new PDFDocument({ margin: 46, size: "A4" });
  doc.pipe(res);

  // Palette — minimal, professional
  const INK = "#1f2418";       // near-black text
  const MUTED = "#7a6f5c";     // muted brown-grey
  const ACCENT = "#5f6e3c";    // olive accent
  const HAIRLINE = "#d8cfbe";  // light divider
  const BAND = "#f1ede3";      // soft header band
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rs = (n: number) => `Rs. ${fmt(n)}`;

  const pageLeft = doc.page.margins.left;
  const pageRight = doc.page.width - doc.page.margins.right;
  const fullWidth = pageRight - pageLeft;

  // ───────── Header ─────────
  const headTop = doc.y;
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(22).text(BUSINESS_NAME, pageLeft, headTop, { width: fullWidth * 0.62 });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED)
    .text("Paint Shop  ·  Motors  ·  Borewell Materials  ·  Hardware", pageLeft, doc.y + 1, { width: fullWidth * 0.62 });
  doc.fillColor(INK).fontSize(8.5)
    .text(`Phone: ${BUSINESS_PHONE}    GSTIN: ${BUSINESS_GSTIN}`, pageLeft, doc.y + 1, { width: fullWidth * 0.62 });

  // "TAX INVOICE" tag, top-right
  doc.font("Helvetica-Bold").fontSize(15).fillColor(ACCENT)
    .text("TAX INVOICE", pageLeft + fullWidth * 0.62, headTop + 2, { width: fullWidth * 0.38, align: "right", characterSpacing: 1 });

  const headBottom = Math.max(doc.y, headTop + 48) + 8;
  doc.moveTo(pageLeft, headBottom).lineTo(pageRight, headBottom).lineWidth(1.4).strokeColor(ACCENT).stroke();
  doc.y = headBottom + 14;

  // ───────── Bill To  +  Invoice meta ─────────
  const metaTop = doc.y;
  const leftColWidth = fullWidth * 0.55;
  const rightColX = pageLeft + leftColWidth + 10;
  const rightColWidth = fullWidth - leftColWidth - 10;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("BILL TO", pageLeft, metaTop, { characterSpacing: 0.8 });
  doc.fillColor(INK).fontSize(11).font("Helvetica-Bold")
    .text(invoice.customer?.name || "Walk-in Customer", pageLeft, doc.y + 2, { width: leftColWidth });
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  if (invoice.customer?.address) doc.text(invoice.customer.address, pageLeft, doc.y + 1, { width: leftColWidth });
  if (invoice.customer?.phone) doc.text(`Phone: ${invoice.customer.phone}`, pageLeft, doc.y + 1, { width: leftColWidth });
  if (invoice.customer?.gstNumber) doc.text(`GSTIN: ${invoice.customer.gstNumber}`, pageLeft, doc.y + 1, { width: leftColWidth });
  const leftBottom = doc.y;

  // Meta rows (label / value) right side
  const metaRows: [string, string][] = [
    ["Invoice No", invoice.invoiceNumber],
    ["Date", invoice.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })],
    ["Place of Supply", "Tamil Nadu (33)"],
    ["Payment", invoice.paymentMethod],
  ];
  let my = metaTop;
  metaRows.forEach(([label, value]) => {
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(label, rightColX, my, { width: rightColWidth * 0.45 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(value, rightColX + rightColWidth * 0.45, my, { width: rightColWidth * 0.55, align: "right" });
    my += 14;
  });

  doc.y = Math.max(leftBottom, my) + 14;

  // ───────── Items table ─────────
  const colWidths = [26, 168, 50, 38, 60, 40, 64, fullWidth - (26 + 168 + 50 + 38 + 60 + 40 + 64)];
  const headers = ["#", "Description of Goods", "HSN", "Qty", "Rate", "GST %", "Taxable", "Amount"];
  const aligns: ("left" | "right" | "center")[] = ["center", "left", "center", "right", "right", "center", "right", "right"];
  const tableLeft = pageLeft;
  const tableWidth = fullWidth;

  const colX = (i: number) => tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
  const ensureSpace = (needed: number) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom - 70) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }
  };

  // Header band
  ensureSpace(60);
  let ty = doc.y;
  const headerH = 22;
  doc.rect(tableLeft, ty, tableWidth, headerH).fill(ACCENT);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
  headers.forEach((h, i) => {
    doc.text(h, colX(i) + 5, ty + 7, { width: colWidths[i] - 10, align: aligns[i], characterSpacing: 0.3 });
  });
  ty += headerH;

  // Rows
  doc.font("Helvetica").fontSize(8.5);
  invoice.items.forEach((item, idx) => {
    const desc = item.shadeCode && item.shadeCode !== "-" ? `${item.productName}  (Shade: ${item.shadeCode})` : item.productName;
    const descH = doc.heightOfString(desc, { width: colWidths[1] - 10 });
    const rh = Math.max(20, descH + 12);
    ensureSpace(rh + 4);
    if (doc.y !== ty) ty = doc.y; // after page break
    // zebra background
    if (idx % 2 === 1) doc.rect(tableLeft, ty, tableWidth, rh).fill(BAND);
    doc.fillColor(INK);
    const values = [
      String(idx + 1),
      desc,
      item.hsnCode || "-",
      fmt(item.quantity),
      fmt(item.rate),
      `${item.gstPercentage}%`,
      fmt(item.taxableAmount),
      fmt(item.totalAmount),
    ];
    values.forEach((v, i) => {
      doc.fillColor(i === 1 ? INK : i >= 3 ? INK : MUTED)
        .text(v, colX(i) + 5, ty + 6, { width: colWidths[i] - 10, align: aligns[i] });
    });
    // bottom hairline
    doc.moveTo(tableLeft, ty + rh).lineTo(tableLeft + tableWidth, ty + rh).lineWidth(0.4).strokeColor(HAIRLINE).stroke();
    ty += rh;
    doc.y = ty;
  });

  // ───────── Totals (right-aligned block) ─────────
  ensureSpace(120);
  const totW = 240;
  const totX = pageRight - totW;
  const labelW = totW * 0.55;
  const valW = totW * 0.45;
  let yy = doc.y + 8;

  const totLine = (label: string, value: string) => {
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(label, totX, yy, { width: labelW });
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(value, totX + labelW, yy, { width: valW, align: "right" });
    yy += 16;
  };
  totLine("Subtotal", rs(invoice.subTotal));
  if (invoice.discountAmount > 0) totLine("Discount", `- ${rs(invoice.discountAmount)}`);
  totLine("CGST", rs(invoice.cgstAmount));
  totLine("SGST", rs(invoice.sgstAmount));

  // Grand total band
  yy += 2;
  doc.rect(totX, yy, totW, 26).fill(ACCENT);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11).text("Grand Total", totX + 10, yy + 8, { width: labelW - 10 });
  doc.font("Helvetica-Bold").fontSize(12).text(rs(invoice.grandTotal), totX + labelW, yy + 7, { width: valW - 10, align: "right" });
  yy += 30;
  doc.y = yy;

  // ───────── Amount in words ─────────
  ensureSpace(40);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MUTED).text("AMOUNT IN WORDS", pageLeft, doc.y, { characterSpacing: 0.6 });
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(INK).text(amountInWords(invoice.grandTotal), pageLeft, doc.y + 2, { width: fullWidth * 0.62 });

  // ───────── Payment / balance (if pending) ─────────
  if (invoice.pendingAmount > 0) {
    doc.moveDown(0.6);
    const pY = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Amount Paid", pageLeft, pY);
    doc.font("Helvetica-Bold").fillColor(INK).text(rs(invoice.paidAmount), pageLeft + 90, pY);
    doc.font("Helvetica").fillColor(MUTED).text("Balance Due", pageLeft, pY + 14);
    doc.font("Helvetica-Bold").fillColor("#b5452a").text(rs(invoice.pendingAmount), pageLeft + 90, pY + 14);
    doc.fillColor(INK);
    doc.y = pY + 30;
  }

  // ───────── Signature + footer ─────────
  ensureSpace(72);
  doc.moveDown(1.4);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(`For ${BUSINESS_NAME}`, pageLeft, doc.y, { align: "right", width: fullWidth });
  doc.moveDown(2.2);
  const sigY = doc.y;
  doc.moveTo(pageRight - 170, sigY).lineTo(pageRight, sigY).lineWidth(0.6).strokeColor(MUTED).stroke();
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text("Authorized Signatory", pageRight - 170, sigY + 4, { width: 170, align: "center" });

  doc.moveDown(2);
  doc.moveTo(pageLeft, doc.y).lineTo(pageRight, doc.y).lineWidth(0.5).strokeColor(HAIRLINE).stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(8.5).fillColor(ACCENT).text(INVOICE_FOOTER_TEXT, pageLeft, doc.y, { align: "center", width: fullWidth });

  doc.end();
}

/**
 * Generates a compact thermal receipt PDF (80mm width).
 */
export function generateThermalReceipt(res: Response, invoice: InvoicePdfData) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="receipt-${invoice.invoiceNumber}.pdf"`);

  const width = 226; // 80mm in points
  const doc = new PDFDocument({ size: [width, 800], margin: 10, bufferPages: true });
  doc.pipe(res);

  const cw = width - 20; // content width
  const left = 10;

  const line = (y?: number) => {
    const ly = y ?? doc.y;
    doc.moveTo(left, ly).lineTo(left + cw, ly).dash(2, { space: 2 }).stroke("gray").undash();
    doc.moveDown(0.3);
  };

  // Header
  doc.font("Helvetica-Bold").fontSize(12).text(BUSINESS_NAME, left, 10, { width: cw, align: "center" });
  doc.font("Helvetica").fontSize(7).text(`GSTIN: ${BUSINESS_GSTIN}`, { width: cw, align: "center" });
  doc.text(`Ph: ${BUSINESS_PHONE}`, { width: cw, align: "center" });
  doc.moveDown(0.3);
  line();

  // Invoice details
  doc.font("Helvetica-Bold").fontSize(8).text(`Invoice: ${invoice.invoiceNumber}`, left, doc.y, { width: cw });
  doc.font("Helvetica").fontSize(7);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, { width: cw });
  if (invoice.customer) {
    doc.text(`Customer: ${invoice.customer.name}`, { width: cw });
    if (invoice.customer.phone) doc.text(`Phone: ${invoice.customer.phone}`, { width: cw });
  }
  doc.text(`Payment: ${invoice.paymentMethod}`, { width: cw });
  doc.moveDown(0.2);
  line();

  // Column headers
  doc.font("Helvetica-Bold").fontSize(7);
  const colX = [left, left + 90, left + 120, left + 160];
  doc.text("ITEM", colX[0], doc.y, { width: 85 });
  doc.text("QTY", colX[1], doc.y - 9, { width: 28, align: "right" });
  doc.text("RATE", colX[2], doc.y - 9, { width: 38, align: "right" });
  doc.text("AMT", colX[3], doc.y - 9, { width: cw - 160, align: "right" });
  doc.moveDown(0.2);
  line();

  // Items
  doc.font("Helvetica").fontSize(7);
  for (const item of invoice.items) {
    const name = item.productName.length > 20 ? item.productName.substring(0, 20) + "…" : item.productName;
    const y = doc.y;
    doc.text(name, colX[0], y, { width: 85 });
    doc.text(String(item.quantity), colX[1], y, { width: 28, align: "right" });
    doc.text(item.rate.toFixed(2), colX[2], y, { width: 38, align: "right" });
    doc.text(item.totalAmount.toFixed(2), colX[3], y, { width: cw - 160, align: "right" });
    doc.moveDown(0.15);
  }
  line();

  // Totals
  doc.font("Helvetica").fontSize(7);
  const totRow = (label: string, val: string, bold = false) => {
    if (bold) doc.font("Helvetica-Bold").fontSize(9);
    else doc.font("Helvetica").fontSize(7);
    const y = doc.y;
    doc.text(label, left, y, { width: 120 });
    doc.text(val, left + 120, y, { width: cw - 120, align: "right" });
    doc.moveDown(0.15);
  };

  totRow("Sub Total", `Rs.${invoice.subTotal.toFixed(2)}`);
  if (invoice.discountAmount > 0) totRow("Discount", `-Rs.${invoice.discountAmount.toFixed(2)}`);
  totRow("CGST", `Rs.${invoice.cgstAmount.toFixed(2)}`);
  totRow("SGST", `Rs.${invoice.sgstAmount.toFixed(2)}`);
  line();
  totRow("GRAND TOTAL", `Rs.${invoice.grandTotal.toFixed(2)}`, true);
  doc.moveDown(0.1);

  if (invoice.pendingAmount > 0) {
    totRow("Paid", `Rs.${invoice.paidAmount.toFixed(2)}`);
    totRow("Balance Due", `Rs.${invoice.pendingAmount.toFixed(2)}`);
  }
  line();

  // Footer
  doc.font("Helvetica").fontSize(7).text(INVOICE_FOOTER_TEXT, left, doc.y, { width: cw, align: "center" });

  // Trim page height to content
  const pages = doc.bufferedPageRange();
  if (pages.count === 1) {
    const finalHeight = doc.y + 20;
    doc.page.height = finalHeight;
  }

  doc.end();
}
