"use client";

import { useState } from "react";
import { Plus, FileText, ArrowRightCircle, Pencil, Printer, Download } from "lucide-react";
import { NewEstimateDialog } from "@/components/estimates/new-estimate-dialog";
import { ConvertEstimateDialog } from "@/components/estimates/convert-estimate-dialog";
import { useEstimates, printEstimatePdf, downloadEstimatePdf, type Estimate } from "@/hooks/use-estimates";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShimmerTable } from "@/components/ui/shimmer";

const STATUS_BADGE: Record<Estimate["status"], [string, string]> = {
  DRAFT: ["rgba(180,155,110,0.14)", "#6b5d4a"],
  SENT: ["rgba(196,122,58,0.14)", "#8a4a10"],
  CONVERTED: ["rgba(107,124,69,0.14)", "#4a5e28"],
  EXPIRED: ["rgba(192,85,42,0.14)", "#7a2010"],
};

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const },
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  cardHeaderText: { fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  th: { padding: "12px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "rgba(220,205,180,0.85)", whiteSpace: "nowrap" as const, textAlign: "left" as const, background: "#2c2820" } as React.CSSProperties,
  td: { padding: "12px 16px", fontSize: 13, color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)" } as React.CSSProperties,
  money: { color: "#c47a3a", fontFamily: "Georgia, serif", fontWeight: 700 } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.30)", whiteSpace: "nowrap" as const } as React.CSSProperties,
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "linear-gradient(135deg,#6b7c45,#8fa05a)" : "transparent", color: active ? "#fff" : "#6b5d4a", boxShadow: active ? "0 2px 8px rgba(107,124,69,0.3)" : "none" }),
  tablist: { display: "inline-flex", gap: 3, padding: 3, background: "rgba(245,240,232,0.9)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 10 } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function EstimatesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Estimate | null>(null);
  const [convertTarget, setConvertTarget] = useState<Estimate | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: estimates, isLoading } = useEstimates(statusFilter);

  const tabs: { label: string; value: string | undefined }[] = [
    { label: "All", value: undefined },
    { label: "Draft", value: "DRAFT" },
    { label: "Converted", value: "CONVERTED" },
  ];

  function openNewDialog() {
    setEditTarget(null);
    setDialogOpen(true);
  }
  function openEditDialog(est: Estimate) {
    setEditTarget(est);
    setDialogOpen(true);
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Estimates</h1>
          <p style={S.subtitle}>Create estimates for customers and convert them to GST invoices when confirmed</p>
        </div>
        <button style={S.btnPrimary} onClick={openNewDialog}>
          <Plus size={15} /> New Estimate
        </button>
      </div>

      <div style={S.tablist}>
        {tabs.map((t) => (
          <button key={t.label} style={S.tab(statusFilter === t.value)} onClick={() => setStatusFilter(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <FileText size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Quotations & Estimates</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Estimate #</th>
                <th style={S.th}>Customer</th>
                <th style={S.th}>Date</th>
                <th style={{ ...S.th, textAlign: "right" }}>Items</th>
                <th style={{ ...S.th, textAlign: "right" }}>Grand Total</th>
                <th style={S.th}>Status</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <ShimmerTable rows={4} cols={6} />
              ) : !estimates || estimates.length === 0 ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <FileText size={28} color="rgba(180,155,110,0.5)" />
                    No estimates found.
                  </div>
                </td></tr>
              ) : (
                estimates.map((est) => {
                  const [bg, c] = STATUS_BADGE[est.status];
                  return (
                    <tr key={est.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...S.td, fontWeight: 600 }}>{est.estimateNumber}</td>
                      <td style={S.td}>{est.customer?.name || "Walk-in"}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{formatDate(est.createdAt)}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{est.items.length}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(est.grandTotal))}</td>
                      <td style={S.td}><span style={S.badge(bg, c)}>{est.status}</span></td>
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          {est.status === "DRAFT" && (
                            <>
                              <button style={S.btnGhost} onClick={() => openEditDialog(est)}>
                                <Pencil size={13} /> Edit
                              </button>
                              <button style={S.btnGhost} onClick={() => setConvertTarget(est)}>
                                <ArrowRightCircle size={13} /> Convert
                              </button>
                            </>
                          )}
                          <button style={S.btnGhost} title="Print" onClick={() => printEstimatePdf(est.id)}>
                            <Printer size={13} />
                          </button>
                          <button style={S.btnGhost} title="Download PDF" onClick={() => downloadEstimatePdf(est.id, est.estimateNumber)}>
                            <Download size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewEstimateDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null); }}
        estimate={editTarget}
      />
      <ConvertEstimateDialog estimate={convertTarget} onClose={() => setConvertTarget(null)} />
    </div>
  );
}