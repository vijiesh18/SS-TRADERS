import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface BusinessSettings {
  name: string;
  gstin: string;
  phone: string;
  types: string[];
}

export interface InvoiceSettings {
  prefix: string;
  nextResetYearly: boolean;
}

export interface GstSettings {
  defaultRate: number;
  intraState: boolean;
}

export interface BackupSettings {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  retentionDays: number;
}

export interface AllSettings {
  business: BusinessSettings;
  invoice: InvoiceSettings;
  estimate: InvoiceSettings;
  gst: GstSettings;
  backup: BackupSettings;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get("/settings");
      return data as AllSettings;
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data } = await api.put(`/settings/${key}`, { value });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
