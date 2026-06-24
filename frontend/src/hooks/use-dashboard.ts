import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface DashboardSummary {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  yearlySales: number;
  totalRevenue: number;
  totalProfit: number;
  pendingCredits: number;
  overdueCredits: number;
  lowStockProducts: number;
  totalCustomers: number;
  totalProducts: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary");
      return data;
    },
  });
}

export interface ChartData {
  period: string;
  revenueTrend: { bucket: string; total: number }[];
  categoryPerformance: { category: string; total: number }[];
  productPerformance: { name: string; total: number; quantity: number }[];
}

export function useDashboardCharts(period: "daily" | "weekly" | "monthly" | "yearly") {
  return useQuery({
    queryKey: ["dashboard", "charts", period],
    queryFn: async () => {
      const { data } = await api.get<ChartData>("/dashboard/charts", { params: { period } });
      return data;
    },
  });
}
