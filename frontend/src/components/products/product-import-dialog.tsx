"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; error: string }[];
}

const EXPECTED_HEADERS = [
  "productCode",
  "barcode",
  "name",
  "brand",
  "category",
  "subcategory",
  "hsnCode",
  "gstPercentage",
  "unit",
  "variant",
  "shadeCode",
  "shadeName",
  "purchasePrice",
  "sellingPrice",
  "stockQuantity",
  "minimumStock",
];

/**
 * Parses a simple CSV (comma-separated, first row = headers) into an array of objects.
 * Handles quoted fields containing commas.
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map((v) => v.trim());
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCSV(String(reader.result));
        setRows(parsed);
      } catch {
        setError("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      const { data } = await api.post("/products/import", { rows });
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = EXPECTED_HEADERS.join(",") + "\n" +
      "AP-APEX-ULT-20L,8901234500201,Asian Paints Apex Ultima 20L,Asian Paints,Paints,Exterior Emulsion,32091010,18,CAN,20L,,,7200,8500,15,5\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product_import_template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setFileName(null);
      setRows([]);
      setResult(null);
      setError(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Products</DialogTitle>
          <DialogDescription>
            Upload a CSV to bulk import or update products — including the Asian Paints catalog.
            Existing products are matched and updated by Product Code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            Download CSV Template
          </Button>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-slate-50">
            <UploadCloud className="h-6 w-6" />
            {fileName ? <span className="font-medium text-foreground">{fileName}</span> : "Click to select a CSV file"}
            <Input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </label>

          {rows.length > 0 && !result && (
            <p className="text-sm text-muted-foreground">{rows.length} rows ready to import.</p>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          {result && (
            <div className="rounded-md border bg-emerald-50 p-3 text-sm space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Import complete
              </p>
              <p>Created: {result.created}</p>
              <p>Updated: {result.updated}</p>
              {result.failed > 0 && (
                <>
                  <p className="text-red-600">Failed: {result.failed}</p>
                  <ul className="text-xs text-red-600 list-disc pl-4">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button type="button" onClick={handleImport} disabled={rows.length === 0 || importing}>
              {importing ? "Importing..." : `Import ${rows.length || ""} Products`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
