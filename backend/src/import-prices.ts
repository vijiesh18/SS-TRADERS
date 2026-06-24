/**
 * Bulk price & stock import from the fill-in spreadsheet.
 * Reads SS_Traders_Price_Stock_FillIn.xlsx (converted to CSV) and updates
 * each product's selling price and opening stock by Product Code.
 *
 * Usage:
 *   1. Save the filled spreadsheet as CSV: price-stock.csv in backend folder
 *   2. Run: npm run import:prices
 *
 * CSV columns expected (in order):
 *   Product Code, Product Name, Category, Unit, HSN, GST%, Indicative MRP, YOUR Selling Price, Opening Stock
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const CSV_PATH = path.join(__dirname, "..", "price-stock.csv");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { result.push(cur); cur = ""; }
    else cur += ch;
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

async function main() {
  console.log("=== SS Traders Price & Stock Import ===\n");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: File not found: ${CSV_PATH}`);
    console.error("Save your filled spreadsheet as 'price-stock.csv' in the backend folder first.");
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  // Find header row (contains "Product Code")
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes("product code")) { startIdx = i + 1; break; }
  }

  let updated = 0, skipped = 0, notFound = 0;
  const notFoundCodes: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 9) continue;

    const code = cols[0]?.trim();
    const sellingPriceStr = cols[7]?.trim();
    const stockStr = cols[8]?.trim();

    if (!code) continue;

    // Skip rows where both price and stock are blank
    if (!sellingPriceStr && !stockStr) { skipped++; continue; }

    const product = await prisma.product.findFirst({ where: { productCode: code } });
    if (!product) { notFound++; notFoundCodes.push(code); continue; }

    const data: any = {};
    if (sellingPriceStr) {
      const price = parseFloat(sellingPriceStr.replace(/[^0-9.]/g, ""));
      if (!isNaN(price) && price > 0) {
        data.sellingPrice = price;
        data.purchasePrice = Math.round(price * 0.8 * 100) / 100;
      }
    }
    if (stockStr) {
      const stock = parseFloat(stockStr.replace(/[^0-9.]/g, ""));
      if (!isNaN(stock) && stock >= 0) data.stockQuantity = stock;
    }

    if (Object.keys(data).length === 0) { skipped++; continue; }

    await prisma.product.update({ where: { id: product.id }, data });
    updated++;
    if (updated % 50 === 0) process.stdout.write(`  ${updated} updated...\n`);
  }

  console.log(`\nDone!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (blank rows): ${skipped}`);
  console.log(`  Not found: ${notFound}`);
  if (notFoundCodes.length > 0) {
    console.log(`  Unmatched codes: ${notFoundCodes.slice(0, 10).join(", ")}${notFoundCodes.length > 10 ? "..." : ""}`);
  }
}

main()
  .catch((e) => { console.error("ERROR:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
