import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface CreditRecord {
  id: string;
  totalAmount: string;
  paidAmount: string;
  pendingAmount: string;
  dueDate?: string | null;
  isSettled: boolean;
  customer: { id: string; name: string; phone: string };
  invoice: { invoiceNumber: string; paymentMethod: string; createdAt: string };
  payments: { id: string; amount: string; paymentMethod: string; note?: string | null; paidAt: string }[];
}

export interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  grandTotal: string;
  paidAmount: string;
  pendingAmount: string;
  customer?: { id: string; name: string; phone: string } | null;
}

export type CreditFilter = "all" | "overdue" | "due-today" | "pending";

export function useCreditRecords(filter: CreditFilter) {
  return useQuery({
    queryKey: ["credit", "list", filter],
    queryFn: async () => {
      const { data } = await api.get("/credit", {
        params: filter !== "all" ? { status: filter } : undefined,
      });
      return {
        items: (data.items || []) as CreditRecord[],
        pendingInvoices: (data.pendingInvoices || []) as PendingInvoice[],
      };
    },
  });
}

export interface CreditSummary {
  totalPending: number;
  pendingCount: number;
  overdueCount: number;
  dueTodayCount: number;
}

export function useCreditSummary() {
  return useQuery({
    queryKey: ["credit", "summary"],
    queryFn: async () => {
      const { data } = await api.get("/credit/summary");
      return data as CreditSummary;
    },
  });
}

interface PaymentPayload {
  creditRecordId: string;
  amount: number;
  paymentMethod: "CASH" | "UPI" | "CARD";
  note?: string;
}

export function useRecordCreditPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ creditRecordId, ...payload }: PaymentPayload) => {
      const { data } = await api.post(`/credit/${creditRecordId}/payments`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useConvertToCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, customerId, dueDate }: { invoiceId: string; customerId: string; dueDate?: string }) => {
      const { data } = await api.post(`/credit/from-invoice/${invoiceId}`, { customerId, dueDate });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
