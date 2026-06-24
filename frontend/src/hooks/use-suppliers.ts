import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  outstandingBalance: string;
  createdAt: string;
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers", "list"],
    queryFn: async () => {
      const { data } = await api.get("/suppliers");
      return data.items as Supplier[];
    },
  });
}

export function useSupplierSearch(query: string) {
  return useQuery({
    queryKey: ["suppliers", "search", query],
    queryFn: async () => {
      if (!query.trim()) return { results: [] as Supplier[] };
      const { data } = await api.get("/suppliers/search", { params: { q: query } });
      return data as { results: Supplier[] };
    },
    enabled: query.trim().length > 0,
  });
}

export interface SupplierFormValues {
  name: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SupplierFormValues) => {
      const { data } = await api.post("/suppliers", payload);
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<SupplierFormValues> & { id: string }) => {
      const { data } = await api.put(`/suppliers/${id}`, payload);
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export interface SupplierHistory {
  supplier: Supplier;
  purchases: {
    id: string;
    purchaseNumber: string;
    totalAmount: string;
    paidAmount: string;
    balanceAmount: string;
    createdAt: string;
    items: { quantity: string; purchaseRate: string; totalAmount: string }[];
  }[];
}

export function useSupplierHistory(supplierId: string | null) {
  return useQuery({
    queryKey: ["suppliers", "history", supplierId],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${supplierId}/history`);
      return data as SupplierHistory;
    },
    enabled: !!supplierId,
  });
}
