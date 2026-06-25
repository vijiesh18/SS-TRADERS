"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { AccessDenied } from "@/components/access-denied";
import { useAuditLogs, AUDIT_ACTIONS } from "@/hooks/use-audit-logs";
import { useAuthStore } from "@/store/auth-store";
import { formatDate } from "@/lib/utils";

const ACTION_BADGE: Record<string, [string, string]> = {
  LOGIN: ["rgba(107,124,69,0.14)", "#4a5e28"],
  LOGOUT: ["rgba(180,155,110,0.14)", "#6b5d4a"],
  LOGIN_FAILED: ["rgba(192,85,42,0.14)", "#7a2010"],
  INVOICE_CREATE: ["rgba(107,124,69,0.14)", "#4a5e28"],
  INVOICE_EDIT: ["rgba(196,122,58,0.14)", "#8a4a10"],
  INVOICE_CANCEL: ["rgba(192,85,42,0.14)", "#7a2010"],
  INVOICE_DELETE: ["rgba(192,85,42,0.14)", "#7a2010"],
  PRODUCT_CREATE: ["rgba(107,124,69,0.14)", "#4a5e28"],
  PRODUCT_UPDATE: ["rgba(196,122,58,0.14)", "#8a4a10"],
  PRODUCT_DELETE: ["rgba(192,85,42,0.14)", "#7a2010"],
  STOCK_ADJUSTMENT: ["rgba(196,122,58,0.14)", "#8a4a10"],
  USER_CREATE: ["rgba(107,124,69,0.14)", "#4a5e28"],
  USER_DEACTIVATE: ["rgba(192,85,42,0.14)", "#7a2010"],
};

function actionLabel(action: string) {
  return action.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}
function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const },
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  cardHeaderText: { fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function AuditLogsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [action, setAction] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useAuditLogs({
    from: new Date(from).toISOString(),
    to: new Date(new Date(to).setHours(23, 59, 59)).toISOString(),
    action: action !== "all" ? action : undefined,
    page,
    limit: 50,
  });

  if (!isAdmin) {
    return (
      <div style={S.page}>
        <div>
          <h1 style={S.title}>Audit Logs</h1>
          <p style={S.subtitle}>System activity and security trail</p>
        </div>
        <AccessDenied message="Only Admin users can view audit logs." />
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Audit Logs</h1>
          <p style={S.subtitle}>Track logins, invoice changes, product/stock edits, backups, and user management</p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{actionLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <ScrollText size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Activity History</span>
        </div>
        {isLoading ? (
          <p style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "#a8937a" }}>Loading...</p>
        ) : !data || data.items.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#a8937a" }}>
            <ScrollText size={28} style={{ margin: "0 auto 8px", color: "rgba(180,155,110,0.5)" }} />
            No audit log entries found for this period.
          </div>
        ) : (
          <div>
            {data.items.map((log) => {
              const expanded = expandedId === log.id;
              const hasDetails = log.details && Object.keys(log.details).length > 0;
              const [bg, c] = ACTION_BADGE[log.action] || ["rgba(180,155,110,0.14)", "#6b5d4a"];
              return (
                <div key={log.id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(180,155,110,0.10)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {hasDetails ? (
                        <button onClick={() => setExpandedId(expanded ? null : log.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8937a" }}>
                          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      ) : (
                        <span style={{ width: 16, display: "inline-block" }} />
                      )}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={S.badge(bg, c)}>{actionLabel(log.action)}</span>
                          {log.entityType && <span style={{ fontSize: 11, color: "#a8937a" }}>{log.entityType}</span>}
                        </div>
                        <p style={{ fontSize: 13, marginTop: 2, color: "#2c2418" }}>
                          {log.user ? `${log.user.name} (${log.user.role})` : "System"}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "#a8937a" }}>
                      <p>{formatDate(log.createdAt)}</p>
                      <p>{new Date(log.createdAt).toLocaleTimeString("en-IN")}</p>
                      {log.ipAddress && <p>{log.ipAddress}</p>}
                    </div>
                  </div>
                  {expanded && hasDetails && (
                    <pre style={{ marginTop: 8, marginLeft: 28, borderRadius: 8, background: "rgba(180,155,110,0.08)", padding: 8, fontSize: 11, overflowX: "auto", color: "#2c2418" }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data && data.total > data.limit && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#a8937a" }}>
          <p>Showing {(page - 1) * data.limit + 1}-{Math.min(page * data.limit, data.total)} of {data.total}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnGhost, opacity: page === 1 ? 0.5 : 1 }} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button style={{ ...S.btnGhost, opacity: page * data.limit >= data.total ? 0.5 : 1 }} disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}