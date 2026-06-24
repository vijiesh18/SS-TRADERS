import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CartItem } from "@/store/billing-store";

export interface ProductSearchResult {
  id: string;
  name: string;
  productCode: string;
  barcode?: string | null;
  hsnCode?: string | null;
  unit: string;
  sellingPrice: string;
  gstPercentage: string;
  stockQuantity: string;
  shadeCode?: string | null;
  brand?: { name: string } | null;
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: ["products", "search", query],
    queryFn: async () => {
      if (!query.trim()) return { results: [] as ProductSearchResult[] };
      const { data } = await api.get("/products/search", { params: { q: query } });
      return data as { results: ProductSearchResult[] };
    },
    enabled: query.trim().length > 0,
  });
}

export function useBarcodeLookup() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.get(`/products/barcode/${code}`);
      return data as ProductSearchResult;
    },
  });
}

export function useProductRecommendations(productId: string | null) {
  return useQuery({
    queryKey: ["products", "recommendations", productId],
    queryFn: async () => {
      const { data } = await api.get(`/products/${productId}/recommendations`);
      return data as { results: ProductSearchResult[] };
    },
    enabled: !!productId,
  });
}

interface CalculateRequest {
  items: { productId: string; quantity: number; rate: number; discountPercent: number; gstPercentage?: number }[];
}

export function useCalculateBill() {
  return useMutation({
    mutationFn: async (payload: CalculateRequest) => {
      const { data } = await api.post("/billing/calculate", payload);
      return data as {
        subTotal: number;
        totalDiscount: number;
        gstAmount: number;
        cgstAmount: number;
        sgstAmount: number;
        grandTotal: number;
      };
    },
  });
}

interface CreateInvoicePayload {
  customerId?: string | null;
  walkInPhone?: string | null;
  items: { productId: string; quantity: number; rate: number; discountPercent: number; gstPercentage?: number }[];
  paymentMethod: "CASH" | "UPI" | "CARD" | "CREDIT" | "SPLIT";
  paidAmount: number;
  dueDate?: string;
  roundOff?: number;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const { data } = await api.post("/billing/invoices", payload);
      return data as { invoice: any; whatsappLink: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useHeldBills() {
  return useQuery({
    queryKey: ["billing", "held-bills"],
    queryFn: async () => {
      const { data } = await api.get("/billing/held-bills");
      return data.items as {
        id: string;
        label?: string | null;
        customer?: { name: string } | null;
        itemsJson: CartItem[];
        createdAt: string;
      }[];
    },
  });
}

export function useHoldBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { label?: string; customerId?: string | null; items: CartItem[] }) => {
      const { data } = await api.post("/billing/held-bills", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "held-bills"] });
    },
  });
}

export function useDeleteHeldBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/billing/held-bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "held-bills"] });
    },
  });
}

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ["customers", "search", query],
    queryFn: async () => {
      if (!query.trim()) return { results: [] };
      const { data } = await api.get("/customers/search", { params: { q: query } });
      return data as { results: { id: string; name: string; phone: string }[] };
    },
    enabled: query.trim().length > 0,
  });
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  subTotal: string;
  gstAmount: string;
  grandTotal: string;
  paidAmount: string;
  customer?: { id: string; name: string; phone: string } | null;
  items: { id: string }[];
  createdBy?: { name: string } | null;
}

interface InvoiceListFilters {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}

export function useInvoices(filters: InvoiceListFilters = {}) {
  return useQuery({
    queryKey: ["billing", "invoices", filters],
    queryFn: async () => {
      const { data } = await api.get("/billing/invoices", { params: filters });
      return data as { items: InvoiceListItem[]; total: number; page: number; limit: number };
    },
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ["billing", "invoice", id],
    queryFn: async () => {
      const { data } = await api.get(`/billing/invoices/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/billing/invoices/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
    },
  });
}

export function useBulkCancelInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceIds, reason }: { invoiceIds: string[]; reason: string }) => {
      const { data } = await api.post(`/billing/invoices/bulk-cancel`, { invoiceIds, reason });
      return data as { message: string; cancelled: number; skipped: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Opens the invoice PDF in a new tab and triggers print.
 */
export async function printInvoicePdfById(invoiceId: string) {
  const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    });
  }
}

/**
 * Downloads the invoice PDF.
 */
export async function downloadInvoicePdfById(invoiceId: string, invoiceNumber: string) {
  const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${invoiceNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
