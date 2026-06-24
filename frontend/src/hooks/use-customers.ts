import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  gstNumber?: string | null;
  createdAt: string;
}

export function useCustomers(page = 1, limit = 25) {
  return useQuery({
    queryKey: ["customers", "list", page, limit],
    queryFn: async () => {
      const { data } = await api.get("/customers", { params: { page, limit } });
      return data as { items: Customer[]; total: number; page: number; limit: number };
    },
  });
}

export interface CustomerFormValues {
  name: string;
  phone: string;
  address?: string;
  gstNumber?: string;
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CustomerFormValues) => {
      const { data } = await api.post("/customers", payload);
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CustomerFormValues> & { id: string }) => {
      const { data } = await api.put(`/customers/${id}`, payload);
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export interface CustomerLedger {
  customer: Customer;
  invoices: {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    grandTotal: string;
    status: string;
    paymentMethod: string;
    items: { productName: string; quantity: string; totalAmount: string }[];
  }[];
  credits: {
    id: string;
    totalAmount: string;
    paidAmount: string;
    pendingAmount: string;
    dueDate?: string | null;
    isSettled: boolean;
    payments: { id: string; amount: string; paymentMethod: string; paidAt: string }[];
  }[];
  analytics: {
    totalSpent: number;
    totalOrders: number;
    avgOrderValue: number;
    totalPendingCredit: number;
  };
}

export function useCustomerLedger(customerId: string | null) {
  return useQuery({
    queryKey: ["customers", "ledger", customerId],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${customerId}/ledger`);
      return data as CustomerLedger;
    },
    enabled: !!customerId,
  });
}
