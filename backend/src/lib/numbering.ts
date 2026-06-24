import prisma from "@/lib/prisma";

/**
 * Generates the next sequential invoice number in the format SST-2026-000001.
 * Uses the current year and counts existing invoices for that year.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SST-${year}-`;

  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: prefix } },
  });

  const next = (count + 1).toString().padStart(6, "0");
  return `${prefix}${next}`;
}

/**
 * Generates the next sequential estimate number in the format EST-2026-000001.
 */
export async function generateEstimateNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EST-${year}-`;

  const count = await prisma.estimate.count({
    where: { estimateNumber: { startsWith: prefix } },
  });

  const next = (count + 1).toString().padStart(6, "0");
  return `${prefix}${next}`;
}

/**
 * Generates the next sequential purchase number in the format PUR-2026-000001.
 */
export async function generatePurchaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PUR-${year}-`;

  const count = await prisma.purchase.count({
    where: { purchaseNumber: { startsWith: prefix } },
  });

  const next = (count + 1).toString().padStart(6, "0");
  return `${prefix}${next}`;
}
