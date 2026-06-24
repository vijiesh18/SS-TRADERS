import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AuditLog {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { name: string; email: string; role: string } | null;
}

interface AuditLogFilters {
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const { data } = await api.get("/audit-logs", { params: filters });
      return data as { items: AuditLog[]; total: number; page: number; limit: number };
    },
  });
}

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "PASSWORD_RESET_REQUEST",
  "PASSWORD_RESET",
  "INVOICE_CREATE",
  "INVOICE_EDIT",
  "INVOICE_CANCEL",
  "INVOICE_DELETE",
  "INVOICE_RESTORE",
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRODUCT_DELETE",
  "STOCK_ADJUSTMENT",
  "STOCK_CHANGE",
  "BACKUP_CREATE",
  "BACKUP_RESTORE",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DEACTIVATE",
] as const;
