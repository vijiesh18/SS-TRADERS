"use client";

import { useState } from "react";
import { Plus, Search, BookOpen, Pencil, Truck } from "lucide-react";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SupplierHistoryDialog } from "@/components/suppliers/supplier-history-dialog";
import { useSuppliers, type Supplier } from "@/hooks/use-suppliers";
import { formatCurrency } from "@/lib/utils";
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
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.30)", whiteSpace: "nowrap" as const } as React.CSSProperties,
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  input: { background: "rgba(255,252,248,0.9)", border: "1px solid rgba(180,155,110,0.30)", borderRadius: 8, padding: "9px 12px 9px 36px", fontSize: 13, color: "#2c2418", width: "100%", outline: "none" } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);

  const { data: suppliers, isLoading } = useSuppliers();

  const filtered = (suppliers || []).filter(
    (s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search))
  );

  function openAddForm() {
    setEditingSupplier(null);
    setFormOpen(true);
  }
  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Suppliers</h1>
          <p style={S.subtitle}>Manage supplier directory and track outstanding balances</p>
        </div>
        <button style={S.btnPrimary} onClick={openAddForm}>
          <Plus size={15} /> Add Supplier
        </button>
      </div>

      <div style={S.card}>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ position: "relative", maxWidth: 380 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8937a", pointerEvents: "none" }} />
            <input style={S.input} placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <Truck size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Supplier Directory</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Phone</th>
                <th style={S.th}>GST Number</th>
                <th style={{ ...S.th, textAlign: "right" }}>Outstanding Balance</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <ShimmerTable rows={4} cols={4} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>No suppliers found.</td></tr>
              ) : (
                filtered.map((s) => {
                  const outstanding = Number(s.outstandingBalance);
                  return (
                    <tr key={s.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...S.td, fontWeight: 600 }}>{s.name}</td>
                      <td style={S.td}>{s.phone || "-"}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{s.gstNumber || "-"}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        {outstanding > 0 ? (
                          <span style={S.badge("rgba(196,122,58,0.14)", "#8a4a10")}>{formatCurrency(outstanding)}</span>
                        ) : (
                          <span style={{ color: "#a8937a" }}>{formatCurrency(0)}</span>
                        )}
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button style={S.btnGhost} onClick={() => setHistoryTarget(s.id)}>
                            <BookOpen size={13} /> History
                          </button>
                          <button style={{ ...S.btnGhost, padding: "6px 8px" }} onClick={() => openEditForm(s)}>
                            <Pencil size={13} />
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

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editingSupplier} />
      <SupplierHistoryDialog supplierId={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}