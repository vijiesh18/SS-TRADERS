import type { Response } from "express";
import ExcelJS from "exceljs";

/**
 * Streams an array of flat objects as an .xlsx file.
 */
export async function exportToExcel(res: Response, filename: string, rows: Record<string, any>[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  if (rows.length === 0) {
    sheet.addRow(["No data available"]);
  } else {
    const headers = Object.keys(rows[0]);
    sheet.addRow(headers.map((h) => h.charAt(0).toUpperCase() + h.slice(1)));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow(headers.map((h) => row[h]));
    }
    sheet.columns.forEach((col) => {
      col.width = 18;
    });
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Streams an array of flat objects as a .csv file.
 */
export function exportToCSV(res: Response, filename: string, rows: Record<string, any>[]) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);

  if (rows.length === 0) {
    res.send("No data available");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const line = headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // escape commas/quotes
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",");
    csvLines.push(line);
  }

  res.send(csvLines.join("\n"));
}
