"use client";

import { useState } from "react";
import { DatabaseBackup, Download, RotateCcw, RefreshCw, ShieldCheck, Clock, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RestoreBackupDialog } from "@/components/backup/restore-backup-dialog";
import { useBackups, useCreateBackup, downloadBackup, type Backup } from "@/hooks/use-backup";
import { formatDate } from "@/lib/utils";

const TYPE_COLORS: Record<Backup["type"], [string, string]> = {
  MANUAL: ["rgba(107,124,69,0.14)", "#4a5e28"],
  DAILY: ["rgba(196,122,58,0.14)", "#8a4a10"],
  WEEKLY: ["rgba(180,155,110,0.14)", "#6b5d4a"],
};

const STATUS_COLORS: Record<Backup["status"], [string, string]> = {
  COMPLETED: ["rgba(107,124,69,0.14)", "#4a5e28"],
  PENDING: ["rgba(196,122,58,0.14)", "#8a4a10"],
  FAILED: ["rgba(192,85,42,0.14)", "#7a2010"],
  RESTORED: ["rgba(180,155,110,0.14)", "#6b5d4a"],
};

function formatSize(bytes?: number | null) {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

const S = {
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
  cardHeaderText: { fontSize: 14, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  cardHeaderSub: { fontSize: 11, color: "rgba(180,155,110,0.75)", marginTop: 2 } as React.CSSProperties,
  th: { padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "rgba(220,205,180,0.85)", whiteSpace: "nowrap" as const, background: "#2c2820" } as React.CSSProperties,
  td: { padding: "12px 14px", fontSize: 13, color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)" } as React.CSSProperties,
  olive: { background: "linear-gradient(135deg, #6b7c45, #8fa05a)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  ghost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(180,155,110,0.30)", background: "rgba(250,247,242,0.7)", color: "#6b5d4a", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function BackupPage() {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const { data: backups, isLoading, refetch, isFetching } = useBackups();
  const createBackup = useCreateBackup();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418" }}>Backup Center</h1>
          <p style={{ fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 }}>
            Download full database backups or restore from a previous backup ZIP
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.ghost} onClick={() => setRestoreOpen(true)}>
            <RotateCcw style={{ width: 15, height: 15 }} />
            Restore Backup
          </button>
          <button style={{ ...S.olive, opacity: createBackup.isPending ? 0.7 : 1 }}
            onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>
            <DatabaseBackup style={{ width: 15, height: 15 }} />
            {createBackup.isPending ? "Creating..." : "Download Full Backup"}
          </button>
        </div>
      </div>

      {/* Info card */}
      <div style={{ ...S.card, borderStyle: "dashed" }}>
        <div style={{ padding: "16px 18px", display: "flex", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(107,124,69,0.12)", color: "#6b7c45", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck style={{ width: 20, height: 20 }} />
          </div>
          <div style={{ fontSize: 13, color: "#6b5d4a", lineHeight: 1.7 }}>
            <p style={{ fontWeight: 700, color: "#2c2418", marginBottom: 4 }}>What's included in a backup?</p>
            <p>
              Products, customers, suppliers, invoices, estimates, credit records, purchases, stock movements,
              expenses, settings, and users (passwords excluded). Backups are named{" "}
              <span style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(180,155,110,0.12)", padding: "2px 6px", borderRadius: 4 }}>SS_Traders_Backup_YYYY_MM_DD.zip</span>.
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, color: "#a8937a" }}>
              <Clock style={{ width: 13, height: 13 }} />
              Daily backups run automatically at 2:00 AM, and weekly backups every Sunday at 3:00 AM.
            </p>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div>
            <p style={S.cardHeaderText}>Backup History</p>
            <p style={S.cardHeaderSub}>Recent manual, daily, and weekly backups</p>
          </div>
          <button
            onClick={() => refetch()} disabled={isFetching}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(180,155,110,0.3)", background: "rgba(250,247,242,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(220,205,180,0.85)" }}>
            <RefreshCw style={{ width: 14, height: 14, animation: isFetching ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
        <div style={{ padding: 0 }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: "left" }}>File Name</th>
                <th style={{ ...S.th, textAlign: "left" }}>Type</th>
                <th style={{ ...S.th, textAlign: "left" }}>Status</th>
                <th style={{ ...S.th, textAlign: "right" }}>Size</th>
                <th style={{ ...S.th, textAlign: "left" }}>Created</th>
                <th style={{ ...S.th, textAlign: "left" }}>By</th>
                <th style={{ ...S.th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "32px 14px", color: "#a8937a" }}>Loading...</td>
                </tr>
              ) : !backups || backups.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "32px 14px", color: "#a8937a" }}>
                    No backups yet. Click "Download Full Backup" to create one.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} style={{ transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <HardDrive style={{ width: 14, height: 14, color: "#a8937a", flexShrink: 0 }} />
                        {b.fileName}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(...TYPE_COLORS[b.type])}>{b.type}</span>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(...STATUS_COLORS[b.status])}>{b.status}</span>
                    </td>
                    <td style={{ ...S.td, textAlign: "right", color: "#c47a3a", fontFamily: "Georgia, serif", fontWeight: 700 }}>
                      {formatSize(b.sizeBytes)}
                    </td>
                    <td style={{ ...S.td, color: "#a8937a" }}>{formatDate(b.createdAt)}</td>
                    <td style={{ ...S.td, color: "#a8937a" }}>{b.createdBy?.name || "System"}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      {b.status === "COMPLETED" && (
                        <button style={S.ghost} onClick={() => downloadBackup(b)}>
                          <Download style={{ width: 14, height: 14 }} />
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RestoreBackupDialog open={restoreOpen} onOpenChange={setRestoreOpen} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
