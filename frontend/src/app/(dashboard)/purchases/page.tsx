"use client";

import { useState } from "react";
import { Plus, Package } from "lucide-react";
import { NewPurchaseDialog } from "@/components/purchases/new-purchase-dialog";
import { usePurchases } from "@/hooks/use-purchases";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShimmerTable } from "@/components/ui/shimmer";

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
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = usePurchases(page, 25);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Purchases</h1>
          <p style={S.subtitle}>Record supplier purchases, update stock-in, and track payment balances</p>
        </div>
        <button style={S.btnPrimary} onClick={() => setDialogOpen(true)}>
          <Plus size={15} /> New Purchase Entry
        </button>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <Package size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Purchase Records</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Purchase #</th>
                <th style={S.th}>Supplier</th>
                <th style={S.th}>Date</th>
                <th style={{ ...S.th, textAlign: "right" }}>Items</th>
                <th style={{ ...S.th, textAlign: "right" }}>Total</th>
                <th style={{ ...S.th, textAlign: "right" }}>Paid</th>
                <th style={{ ...S.th, textAlign: "right" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <ShimmerTable rows={4} cols={5} />
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <Package size={28} color="rgba(180,155,110,0.5)" />
                    No purchases recorded yet.
                  </div>
                </td></tr>
              ) : (
                data.items.map((p) => {
                  const balance = Number(p.balanceAmount);
                  return (
                    <tr key={p.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...S.td, fontWeight: 600 }}>{p.purchaseNumber}</td>
                      <td style={S.td}>{p.supplier.name}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{formatDate(p.createdAt)}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{p.items.length}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(p.totalAmount))}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{formatCurrency(Number(p.paidAmount))}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        {balance > 0 ? (
                          <span style={S.badge("rgba(196,122,58,0.14)", "#8a4a10")}>{formatCurrency(balance)}</span>
                        ) : (
                          <span style={S.badge("rgba(107,124,69,0.14)", "#4a5e28")}>Paid</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

      <NewPurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}