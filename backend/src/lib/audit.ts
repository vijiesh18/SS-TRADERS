import prisma from "@/lib/prisma";

interface AuditEntry {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Records an audit log entry. Never throws - audit failures should not
 * break the primary request flow, but are logged to console.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details ? (entry.details as object) : undefined,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// Common audit action names
export const AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
  PASSWORD_RESET: "PASSWORD_RESET",
  INVOICE_CREATE: "INVOICE_CREATE",
  INVOICE_EDIT: "INVOICE_EDIT",
  INVOICE_CANCEL: "INVOICE_CANCEL",
  INVOICE_DELETE: "INVOICE_DELETE",
  INVOICE_RESTORE: "INVOICE_RESTORE",
  PRODUCT_CREATE: "PRODUCT_CREATE",
  PRODUCT_UPDATE: "PRODUCT_UPDATE",
  PRODUCT_DELETE: "PRODUCT_DELETE",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  STOCK_CHANGE: "STOCK_CHANGE",
  BACKUP_CREATE: "BACKUP_CREATE",
  BACKUP_RESTORE: "BACKUP_RESTORE",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DEACTIVATE: "USER_DEACTIVATE",
} as const;
