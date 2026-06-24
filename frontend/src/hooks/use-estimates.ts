import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Estimate {
  id: string;
  estimateNumber: string;
  subTotal: string;
  gstAmount: string;
  grandTotal: string;
  status: "DRAFT" | "SENT" | "CONVERTED" | "EXPIRED";
  createdAt: string;
  customer?: { id: string; name: string; phone: string } | null;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: string;
    rate: string;
    gstPercentage: string;
    totalAmount: string;
  }[];
}

export function useEstimates(status?: string) {
  return useQuery({
    queryKey: ["estimates", "list", status],
    queryFn: async () => {
      const { data } = await api.get("/estimates", { params: status ? { status } : undefined });
      return data.items as Estimate[];
    },
  });
}

interface EstimateItemInput {
  productId: string;
  quantity: number;
  rate: number;
  gstPercentage?: number;
}

interface CreateEstimatePayload {
  customerId?: string | null;
  items: EstimateItemInput[];
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEstimatePayload) => {
      const { data } = await api.post("/estimates", payload);
      return data as Estimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
    },
  });
}

interface UpdateEstimatePayload extends CreateEstimatePayload {
  id: string;
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateEstimatePayload) => {
      const { data } = await api.put(`/estimates/${id}`, payload);
      return data as Estimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
    },
  });
}

/**
 * Opens the estimate/quotation PDF in a new tab and triggers the print dialog.
 */
export async function printEstimatePdf(estimateId: string) {
  const res = await api.get(`/estimates/${estimateId}/pdf`, { responseType: "blob" });
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
 * Downloads the estimate/quotation PDF.
 */
export async function downloadEstimatePdf(estimateId: string, estimateNumber: string) {
  const res = await api.get(`/estimates/${estimateId}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${estimateNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

interface ConvertPayload {
  id: string;
  paymentMethod?: "CASH" | "UPI" | "CARD" | "CREDIT";
  paidAmount?: number;
}

export function useConvertEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: ConvertPayload) => {
      const { data } = await api.post(`/estimates/${id}/convert`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
