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
  doc.text(`Sub Total: ₹${estimate.subTotal.toFixed(2)}`, { align: "right" });
  doc.text(`GST: ₹${estimate.gstAmount.toFixed(2)}`, { align: "right" });
  doc.fontSize(12).text(`Grand Total: ₹${estimate.grandTotal.toFixed(2)}`, { align: "right" });
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

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  const pageLeft = doc.page.margins.left;
  const pageRight = doc.page.width - doc.page.margins.right;
  const fullWidth = pageRight - pageLeft;

  // ---- Header: business details ----
  doc.fontSize(18).font("Helvetica-Bold").fillColor("black").text(BUSINESS_NAME, { align: "left" });
  doc.fontSize(9).font("Helvetica-Oblique").text("Paint Shop | Motors | Borewell Materials | Hardware");
  doc.font("Helvetica").text(`Phone: ${BUSINESS_PHONE}`);
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").text(`GSTIN: ${BUSINESS_GSTIN}`);
  doc.moveDown(0.3);

  // Divider
  doc.moveTo(pageLeft, doc.y).lineTo(pageRight, doc.y).strokeColor("#000").lineWidth(1).stroke();
  doc.moveDown(0.5);

  doc.fontSize(14).font("Helvetica-Bold").text("TAX INVOICE", { align: "center" });
  doc.moveDown(0.5);

  // ---- Bill To (left) + Invoice meta (right) ----
  const metaTop = doc.y;
  const leftColWidth = fullWidth * 0.55;
  const rightColX = pageLeft + leftColWidth;
  const rightColWidth = fullWidth - leftColWidth;

  doc.fontSize(10).font("Helvetica-Bold").text("Bill To:", pageLeft, metaTop, { width: leftColWidth });
  doc.font("Helvetica");
  if (invoice.customer) {
    doc.font("Helvetica-Bold").text(invoice.customer.name, pageLeft, doc.y, { width: leftColWidth });
    doc.font("Helvetica");
    if (invoice.customer.address) doc.text(invoice.customer.address, pageLeft, doc.y, { width: leftColWidth });
    doc.text(`Phone: ${invoice.customer.phone}`, pageLeft, doc.y, { width: leftColWidth });
    if (invoice.customer.gstNumber) doc.text(`GSTIN: ${invoice.customer.gstNumber}`, pageLeft, doc.y, { width: leftColWidth });
  } else {
    doc.font("Helvetica-Bold").text("Walk-in Customer", pageLeft, doc.y, { width: leftColWidth });
  }

  doc.fontSize(10).font("Helvetica");
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, rightColX, metaTop, { width: rightColWidth, align: "right" });
  doc.text(`Invoice Date: ${invoice.createdAt.toLocaleDateString("en-IN")}`, rightColX, doc.y, { width: rightColWidth, align: "right" });
  doc.text(`Place of Supply: Tamil Nadu`, rightColX, doc.y, { width: rightColWidth, align: "right" });
  doc.text(`Payment Method: ${invoice.paymentMethod}`, rightColX, doc.y, { width: rightColWidth, align: "right" });

  doc.y = Math.max(doc.y, metaTop) + 15;

  // ---- Items table ----
  // Columns: S.No | Description | HSN | Qty | Rate | GST% | Taxable | GST | Total
  const colWidths = [22, 118, 44, 42, 28, 48, 30, 53, 53, 72];
  const headers = ["S.No", "Description of Goods", "HSN", "Colour", "Qty", "Rate (₹)", "GST %", "Taxable (₹)", "GST (₹)", "Amount (₹)"];
  const tableLeft = pageLeft;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowHeight = 20;
  const headerHeight = 28;

  function colX(i: number) {
    let x = tableLeft;
    for (let j = 0; j < i; j++) x += colWidths[j];
    return x;
  }

  function drawRow(y: number, height: number) {
    // outer + vertical borders for this row
    let x = tableLeft;
    for (let i = 0; i <= colWidths.length; i++) {
      doc.moveTo(x, y).lineTo(x, y + height).strokeColor("#999").lineWidth(0.5).stroke();
      if (i < colWidths.length) x += colWidths[i];
    }
    doc.moveTo(tableLeft, y).lineTo(tableLeft + tableWidth, y).strokeColor("#999").lineWidth(0.5).stroke();
  }

  function ensureSpace(needed: number) {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }
  }

  // Header row
  ensureSpace(headerHeight + rowHeight * 2);
  let tableTop = doc.y;
  doc.rect(tableLeft, tableTop, tableWidth, headerHeight).fillAndStroke("#e2e8f0", "#999");
  doc.fillColor("black").font("Helvetica-Bold").fontSize(8);
  headers.forEach((h, i) => {
    doc.text(h, colX(i) + 3, tableTop + 7, { width: colWidths[i] - 6, align: i === 0 ? "center" : i === 1 ? "left" : "right" });
  });
  doc.y = tableTop + headerHeight;

  // Item rows
  doc.font("Helvetica").fontSize(8);
  invoice.items.forEach((item, idx) => {
    ensureSpace(rowHeight * 3);
    const y = doc.y;
    doc.fillColor("black");
    const values = [
      String(idx + 1),
      item.productName,
      item.hsnCode || "-",
      item.shadeCode || "-",
      item.quantity.toFixed(2),
      item.rate.toFixed(2),
      `${item.gstPercentage}%`,
      item.taxableAmount.toFixed(2),
      item.gstAmount.toFixed(2),
      item.totalAmount.toFixed(2),
    ];
    values.forEach((v, i) => {
      doc.text(v, colX(i) + 3, y + 6, {
        width: colWidths[i] - 6,
        align: i === 0 ? "center" : i === 1 ? "left" : "right",
      });
    });
    drawRow(y, rowHeight);
    doc.y = y + rowHeight;
  });

  // Totals rows (Subtotal, Discount, CGST, SGST, Grand Total) - merged label spans first columns
  const labelSpanWidth = colWidths.slice(0, colWidths.length - 1).reduce((a, b) => a + b, 0);
  const amountColX = colX(colWidths.length - 1);
  const amountColWidth = colWidths[colWidths.length - 1];

  function totalsRow(label: string, value: string, bold = false) {
    ensureSpace(rowHeight * 2);
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 9);
    doc.text(label, tableLeft + 3, y + 6, { width: labelSpanWidth - 6, align: "right" });
    doc.text(value, amountColX + 3, y + 6, { width: amountColWidth - 6, align: "right" });
    // borders: outer rect for this row, plus a divider between label and amount
    doc.moveTo(tableLeft, y).lineTo(tableLeft + tableWidth, y).strokeColor("#999").lineWidth(0.5).stroke();
    doc.moveTo(tableLeft, y).lineTo(tableLeft, y + rowHeight).strokeColor("#999").lineWidth(0.5).stroke();
    doc.moveTo(amountColX, y).lineTo(amountColX, y + rowHeight).strokeColor("#999").lineWidth(0.5).stroke();
    doc.moveTo(tableLeft + tableWidth, y).lineTo(tableLeft + tableWidth, y + rowHeight).strokeColor("#999").lineWidth(0.5).stroke();
    doc.y = y + rowHeight;
  }

  totalsRow("Subtotal", `Rs. ${invoice.subTotal.toFixed(2)}`);
  if (invoice.discountAmount > 0) {
    totalsRow("Discount", `Rs. ${invoice.discountAmount.toFixed(2)}`);
  }
  totalsRow(`CGST`, `Rs. ${invoice.cgstAmount.toFixed(2)}`);
  totalsRow(`SGST`, `Rs. ${invoice.sgstAmount.toFixed(2)}`);

  // Grand total row - shaded
  ensureSpace(rowHeight * 3);
  const gtY = doc.y;
  doc.rect(tableLeft, gtY, tableWidth, rowHeight + 4).fillAndStroke("#e2e8f0", "#999");
  doc.fillColor("black").font("Helvetica-Bold").fontSize(10);
  doc.text("Grand Total", tableLeft + 3, gtY + 7, { width: labelSpanWidth - 6, align: "right" });
  doc.text(`Rs. ${invoice.grandTotal.toFixed(2)}`, amountColX + 3, gtY + 7, { width: amountColWidth - 6, align: "right" });
  doc.moveTo(tableLeft, gtY).lineTo(tableLeft, gtY + rowHeight + 4).strokeColor("#999").lineWidth(0.5).stroke();
  doc.moveTo(amountColX, gtY).lineTo(amountColX, gtY + rowHeight + 4).strokeColor("#999").lineWidth(0.5).stroke();
  doc.moveTo(tableLeft + tableWidth, gtY).lineTo(tableLeft + tableWidth, gtY + rowHeight + 4).strokeColor("#999").lineWidth(0.5).stroke();
  doc.y = gtY + rowHeight + 4;

  doc.moveDown(0.8);

  // ---- Amount in words ----
  ensureSpace(40);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("black");
  doc.text("Amount in Words: ", pageLeft, doc.y, { continued: true });
  doc.font("Helvetica-Oblique").text(amountInWords(invoice.grandTotal));
  doc.moveDown(0.8);

  // ---- Payment breakdown (always show) ----
  ensureSpace(50);
  const pmBoxY = doc.y;
  const pmBoxWidth = 200;
  const pmBoxX = pageRight - pmBoxWidth;
  doc.rect(pmBoxX, pmBoxY, pmBoxWidth, invoice.pendingAmount > 0 ? 52 : 28).fillAndStroke("#f8fafc", "#cbd5e1");
  doc.fillColor("black").font("Helvetica").fontSize(8.5);
  doc.text(`Payment Method: ${invoice.paymentMethod}`, pmBoxX + 6, pmBoxY + 7, { width: pmBoxWidth - 12 });
  if (invoice.pendingAmount > 0) {
    doc.font("Helvetica").text(`Amount Paid:    Rs. ${invoice.paidAmount.toFixed(2)}`, pmBoxX + 6, pmBoxY + 21, { width: pmBoxWidth - 12 });
    doc.font("Helvetica-Bold").fillColor("#dc2626").text(`Balance Due:    Rs. ${invoice.pendingAmount.toFixed(2)}`, pmBoxX + 6, pmBoxY + 37, { width: pmBoxWidth - 12 });
    doc.fillColor("black");
    doc.y = pmBoxY + 56;
  } else {
    doc.y = pmBoxY + 32;
  }
  doc.moveDown(0.8);

  // ---- Signature block ----
  ensureSpace(70);
  doc.font("Helvetica-Bold").fontSize(10).text(`For ${BUSINESS_NAME}`, pageLeft, doc.y, { align: "right", width: fullWidth });
  doc.moveDown(2.5);
  doc.moveTo(pageLeft, doc.y).lineTo(pageRight, doc.y).strokeColor("#000").lineWidth(0.5).stroke();
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9).text("Authorized Signatory", pageLeft, doc.y, { align: "right", width: fullWidth });

  doc.moveDown(2);
  doc.fontSize(9).font("Helvetica-Bold").fillColor("gray").text(INVOICE_FOOTER_TEXT, { align: "center" });

  doc.end();
}
