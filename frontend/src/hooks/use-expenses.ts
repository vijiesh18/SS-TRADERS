import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export const EXPENSE_CATEGORIES = ["Salary", "Rent", "Electricity", "Transport", "Miscellaneous"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  category: string;
  description?: string | null;
  amount: string;
  expenseDate: string;
  enteredBy: { name: string };
}

interface ExpenseFilters {
  from?: string;
  to?: string;
  category?: string;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ["expenses", "list", filters],
    queryFn: async () => {
      const { data } = await api.get("/expenses", { params: filters });
      return data as { items: Expense[]; totalAmount: number };
    },
  });
}

interface ExpenseFormPayload {
  category: ExpenseCategory;
  description?: string;
  amount: number;
  expenseDate?: string;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ExpenseFormPayload) => {
      const { data } = await api.post("/expenses", payload);
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
