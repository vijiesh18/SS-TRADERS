import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNo?: string | null;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  createdAt: string;
  supplier: { id: string; name: string };
  items: {
    id: string;
    productId: string;
    quantity: string;
    purchaseRate: string;
    gstPercentage: string;
    totalAmount: string;
  }[];
}

export function usePurchases(page = 1, limit = 25) {
  return useQuery({
    queryKey: ["purchases", "list", page, limit],
    queryFn: async () => {
      const { data } = await api.get("/purchases", { params: { page, limit } });
      return data as { items: Purchase[]; total: number; page: number; limit: number };
    },
  });
}

export interface PurchaseItemInput {
  productId: string;
  productName: string;
  quantity: number;
  purchaseRate: number;
  gstPercentage: number;
}

interface CreatePurchasePayload {
  supplierId: string;
  supplierInvoiceNo?: string;
  paidAmount: number;
  items: { productId: string; quantity: number; purchaseRate: number; gstPercentage: number }[];
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchasePayload) => {
      const { data } = await api.post("/purchases", payload);
      return data as Purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export interface PurchaseAnalyticsItem {
  supplier?: { id: string; name: string };
  totalPurchased: string | null;
  outstanding: string | null;
}

export function usePurchaseAnalytics() {
  return useQuery({
    queryKey: ["purchases", "analytics"],
    queryFn: async () => {
      const { data } = await api.get("/purchases/analytics");
      return data.items as PurchaseAnalyticsItem[];
    },
  });
}
