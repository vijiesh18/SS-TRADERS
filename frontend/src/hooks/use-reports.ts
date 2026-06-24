import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type ExportFormat = "json" | "pdf" | "excel" | "csv";

/**
 * Downloads a file from the backend (PDF/Excel/CSV) and triggers a browser save.
 */
async function downloadFile(url: string, params: Record<string, unknown>, filenameFallback: string) {
  const res = await api.get(url, { params, responseType: "blob" });

  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || filenameFallback;

  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export type ReportType = "sales" | "profit" | "gst" | "gstr1" | "inventory" | "customers" | "credit";

export function useGstr1Report(from?: string, to?: string) {
  return useQuery({
    queryKey: ["reports", "gstr1", from, to],
    queryFn: async () => {
      const { data } = await api.get("/reports/gstr1", { params: { from, to } });
      return data as {
        b2b: { gstin: string; customerName: string; invoiceNumber: string; invoiceDate: string; invoiceValue: number; taxableValue: number; cgst: number; sgst: number }[];
        b2cSummary: { rate: number; taxable: number; cgst: number; sgst: number }[];
        hsnSummary: { hsn: string; rate: number; qty: number; taxable: number; cgst: number; sgst: number }[];
        totals: { totalTaxable: number; totalCgst: number; totalSgst: number; b2bCount: number; b2cInvoiceCount: number };
        from: string; to: string;
      };
    },
  });
}

interface DownloadReportPayload {
  type: ReportType;
  format: ExportFormat;
  from?: string;
  to?: string;
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({ type, format, from, to }: DownloadReportPayload) => {
      const ext = format === "excel" ? "xlsx" : format;
      await downloadFile(`/reports/${type}`, { format, from, to }, `${type}_report.${ext}`);
    },
  });
}

// ── JSON Previews (for inline summary stats) ─────────────

export function useSalesReportPreview(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "sales", from, to],
    queryFn: async () => {
      const { data } = await api.get("/reports/sales", { params: { from, to, format: "json" } });
      return data as { rows: any[]; totalSales: number; count: number };
    },
    enabled: !!from && !!to,
  });
}

export function useProfitReportPreview(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "profit", from, to],
    queryFn: async () => {
      const { data } = await api.get("/reports/profit", { params: { from, to, format: "json" } });
      return data as { rows: any[]; totalRevenue: number; totalProfit: number };
    },
    enabled: !!from && !!to,
  });
}

export function useGstReportPreview(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "gst", from, to],
    queryFn: async () => {
      const { data } = await api.get("/reports/gst", { params: { from, to, format: "json" } });
      return data as { rows: { hsnCode: string; gstPercentage: number; taxable: number; cgst: number; sgst: number }[] };
    },
    enabled: !!from && !!to,
  });
}

export function useInventoryReportPreview() {
  return useQuery({
    queryKey: ["reports", "inventory"],
    queryFn: async () => {
      const { data } = await api.get("/reports/inventory", { params: { format: "json" } });
      return data as { rows: any[]; totalStockValue: number };
    },
  });
}


export type ExportEntity =
  | "products"
  | "customers"
  | "invoices"
  | "inventory"
  | "expenses"
  | "credit"
  | "suppliers";

interface DownloadExportPayload {
  entity: ExportEntity;
  format: ExportFormat;
}

export function useDownloadExport() {
  return useMutation({
    mutationFn: async ({ entity, format }: DownloadExportPayload) => {
      const ext = format === "excel" ? "xlsx" : format;
      await downloadFile(`/export/${entity}`, { format }, `${entity}_export.${ext}`);
    },
  });
}
