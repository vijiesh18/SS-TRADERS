"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Receipt, Wallet } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { useExpenses, useDeleteExpense, EXPENSE_CATEGORIES } from "@/hooks/use-expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShimmerTable } from "@/components/ui/shimmer";

function defaultFrom() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

const CAT_BADGE: Record<string, [string, string]> = {
  Salary: ["rgba(107,124,69,0.14)", "#4a5e28"],
  Rent: ["rgba(180,155,110,0.14)", "#6b5d4a"],
  Electricity: ["rgba(196,122,58,0.14)", "#8a4a10"],
  Transport: ["rgba(122,158,126,0.14)", "#2a6035"],
  Miscellaneous: ["rgba(192,85,42,0.14)", "#7a2010"],
};

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const },
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
  metric: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, padding: "18px 20px", boxShadow: "0 4px 20px rgba(100,80,40,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
  metricLabel: { fontSize: 12, color: "#a8937a", fontWeight: 600 } as React.CSSProperties,
  metricValue: { fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", color: "#6b7c45", marginTop: 4 } as React.CSSProperties,
  metricIcon: { width: 44, height: 44, borderRadius: 11, background: "rgba(192,85,42,0.12)", color: "#c0552a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function ExpensesPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [category, setCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useExpenses({
    from: new Date(from).toISOString(),
    to: new Date(new Date(to).setHours(23, 59, 59)).toISOString(),
    category: category !== "all" ? category : undefined,
  });
  const deleteExpense = useDeleteExpense();

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of data?.items || []) {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Expenses</h1>
          <p style={S.subtitle}>Track salary, rent, electricity, transport and miscellaneous expenses</p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <button style={S.btnPrimary} onClick={() => setDialogOpen(true)}>
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <div style={S.metric}>
          <div>
            <div style={S.metricLabel}>Total Expenses (period)</div>
            <div style={{ ...S.metricValue, color: "#c0552a" }}>{isLoading ? "..." : formatCurrency(data?.totalAmount || 0)}</div>
          </div>
          <div style={S.metricIcon}><Wallet size={20} /></div>
        </div>
        {breakdown.slice(0, 3).map(([cat, amt]) => (
          <div key={cat} style={S.metric}>
            <div>
              <div style={S.metricLabel}>{cat}</div>
              <div style={S.metricValue}>{formatCurrency(amt)}</div>
            </div>
            <div style={{ ...S.metricIcon, background: "rgba(107,124,69,0.12)", color: "#6b7c45" }}><Receipt size={20} /></div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={S.card}>
        <div style={{ padding: "12px 16px" }}>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <Receipt size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Expense Records</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>Description</th>
                <th style={S.th}>Entered By</th>
                <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <ShimmerTable rows={4} cols={5} />
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>No expenses recorded for this period.</td></tr>
              ) : (
                data.items.map((e) => {
                  const [bg, c] = CAT_BADGE[e.category] || ["rgba(180,155,110,0.14)", "#6b5d4a"];
                  return (
                    <tr key={e.id}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...S.td, color: "#a8937a" }}>{formatDate(e.expenseDate)}</td>
                      <td style={S.td}><span style={S.badge(bg, c)}>{e.category}</span></td>
                      <td style={S.td}>{e.description || "-"}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{e.enteredBy.name}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(e.amount))}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <button style={S.btnGhost} onClick={() => deleteExpense.mutate(e.id)}>
                          <Trash2 size={13} color="#c0552a" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}