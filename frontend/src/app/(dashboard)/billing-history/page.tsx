"use client";

import { useState } from "react";
import { Search, Printer, Download, XCircle, Receipt, Trash2, CheckSquare, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { useInvoices, useCancelInvoice, useBulkCancelInvoices, printInvoicePdfById, downloadInvoicePdfById } from "@/hooks/use-billing";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_BADGE: Record<string, [string, string]> = {
  PAID: ["rgba(107,124,69,0.14)", "#4a5e28"],
  PARTIAL: ["rgba(196,122,58,0.14)", "#8a4a10"],
  UNPAID: ["rgba(180,155,110,0.14)", "#6b5d4a"],
  CANCELLED: ["rgba(192,85,42,0.14)", "#7a2010"],
};

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  cardHeaderText: { fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  th: { padding: "12px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "rgba(220,205,180,0.85)", whiteSpace: "nowrap" as const, textAlign: "left" as const, background: "#2c2820" } as React.CSSProperties,
  td: { padding: "12px 16px", fontSize: 13, color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)" } as React.CSSProperties,
  money: { color: "#c47a3a", fontFamily: "Georgia, serif", fontWeight: 700 } as React.CSSProperties,
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  input: { background: "rgba(255,252,248,0.9)", border: "1px solid rgba(180,155,110,0.30)", borderRadius: 8, padding: "9px 12px 9px 36px", fontSize: 13, color: "#2c2418", width: "100%", outline: "none" } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function BillingHistoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("Test invoice cleanup");

  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const { data, isLoading } = useInvoices({
    page, limit: 25,
    status: status !== "all" ? status : undefined,
    from: from || undefined, to: to || undefined, search: search || undefined,
  });
  const cancelInvoice = useCancelInvoice();
  const bulkCancel = useBulkCancelInvoices();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkCancel() {
    if (selectedIds.size === 0) return;
    await bulkCancel.mutateAsync({ invoiceIds: Array.from(selectedIds), reason: bulkReason.trim() || "Bulk cancel" });
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkCancelOpen(false);
  }

  async function handleCancel(id: string) {
    if (!cancelReason.trim()) {
      setCancelError("Please enter a reason for cancellation");
      return;
    }
    try {
      await cancelInvoice.mutateAsync({ id, reason: cancelReason.trim() });
      setCancelTarget(null);
      setCancelReason("");
      setCancelError(null);
    } catch (err: any) {
      setCancelError(err?.response?.data?.error?.toString() || "Failed to cancel invoice");
    }
  }

  return (
    <div style={S.page}>
      <div>
        <h1 style={S.title}>Billing History</h1>
        <p style={S.subtitle}>All invoices generated from Billing POS</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
        <div style={{ position: "relative", width: 260 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8937a", pointerEvents: "none" }} />
          <input style={S.input} placeholder="Invoice no, customer name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <button
            style={selectMode ? { ...S.btnGhost, background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", border: "none", padding: "9px 14px" } : { ...S.btnGhost, padding: "9px 14px" }}
            onClick={() => { setSelectMode((s) => !s); setSelectedIds(new Set()); }}
          >
            {selectMode ? <CheckSquare size={14} /> : <Square size={14} />}
            {selectMode ? "Cancel Selection" : "Select Multiple"}
          </button>
        )}
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(192,85,42,0.3)", background: "rgba(192,85,42,0.08)", padding: "10px 16px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#7a2010" }}>{selectedIds.size} invoice(s) selected</p>
          <button style={{ ...S.btnGhost, background: "rgba(192,85,42,0.12)", color: "#7a2010", border: "1px solid rgba(192,85,42,0.3)", padding: "7px 14px" }} onClick={() => setBulkCancelOpen(true)}>
            <Trash2 size={14} /> Cancel Selected
          </button>
        </div>
      )}

      <div style={S.card}>
        <div style={S.cardHeader}>
          <Receipt size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Invoice History</span>
        </div>
        {isLoading ? (
          <p style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "#a8937a" }}>Loading...</p>
        ) : !data || data.items.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#a8937a" }}>
            <Receipt size={28} style={{ margin: "0 auto 8px", color: "rgba(180,155,110,0.5)" }} />
            No invoices found for these filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {selectMode && <th style={{ ...S.th, width: 40 }}></th>}
                  <th style={S.th}>Invoice No</th>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Customer</th>
                  <th style={S.th}>Items</th>
                  <th style={S.th}>Payment</th>
                  <th style={S.th}>Status</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Total</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((inv) => {
                  const [bg, c] = STATUS_BADGE[inv.status] || STATUS_BADGE.UNPAID;
                  return (
                    <tr key={inv.id}
                      style={{ background: selectMode && selectedIds.has(inv.id) ? "rgba(192,85,42,0.05)" : "transparent" }}
                      onMouseEnter={(e) => { if (!(selectMode && selectedIds.has(inv.id))) e.currentTarget.style.background = "rgba(180,155,110,0.05)"; }}
                      onMouseLeave={(e) => { if (!(selectMode && selectedIds.has(inv.id))) e.currentTarget.style.background = "transparent"; }}
                    >
                      {selectMode && (
                        <td style={S.td}>
                          {inv.status !== "CANCELLED" ? (
                            <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => toggleSelect(inv.id)}>
                              {selectedIds.has(inv.id) ? <CheckSquare size={16} color="#c0552a" /> : <Square size={16} color="#a8937a" />}
                            </button>
                          ) : null}
                        </td>
                      )}
                      <td style={{ ...S.td, fontWeight: 600 }}>{inv.invoiceNumber}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{formatDate(inv.createdAt)}</td>
                      <td style={S.td}>{inv.customer ? inv.customer.name : "Walk-in"}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{inv.items.length}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{inv.paymentMethod}</td>
                      <td style={S.td}><span style={S.badge(bg, c)}>{inv.status}</span></td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(inv.grandTotal))}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button style={S.btnGhost} title="Print" onClick={() => printInvoicePdfById(inv.id)}>
                            <Printer size={13} />
                          </button>
                          <button style={S.btnGhost} title="Download PDF" onClick={() => downloadInvoicePdfById(inv.id, inv.invoiceNumber)}>
                            <Download size={13} />
                          </button>
                          {isAdmin && inv.status !== "CANCELLED" && (
                            <button style={S.btnGhost} title="Cancel Invoice" onClick={() => setCancelTarget(inv.id)}>
                              <XCircle size={13} color="#c0552a" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > data.limit && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#a8937a" }}>
          <p>Showing {(page - 1) * data.limit + 1}-{Math.min(page * data.limit, data.total)} of {data.total}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnGhost, opacity: page === 1 ? 0.5 : 1, padding: "7px 14px" }} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button style={{ ...S.btnGhost, opacity: page * data.limit >= data.total ? 0.5 : 1, padding: "7px 14px" }} disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {bulkCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-6">
              <p className="font-medium">Cancel {selectedIds.size} invoice(s)?</p>
              <p className="text-sm text-muted-foreground">This will mark all selected invoices as cancelled and restock their items. This cannot be undone.</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason</label>
                <Input value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} placeholder="e.g. Test invoice cleanup" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBulkCancelOpen(false)}>Keep Invoices</Button>
                <Button variant="destructive" onClick={handleBulkCancel} disabled={bulkCancel.isPending}>
                  {bulkCancel.isPending ? "Cancelling..." : `Cancel ${selectedIds.size} Invoice(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-6">
              <p className="font-medium">Cancel this invoice?</p>
              <p className="text-sm text-muted-foreground">This will mark the invoice as cancelled and restock all items. This cannot be undone.</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason for cancellation</label>
                <Input value={cancelReason} onChange={(e) => { setCancelReason(e.target.value); setCancelError(null); }} placeholder="e.g. Customer returned items, billing error" />
              </div>
              {cancelError && <p className="text-sm text-red-500">{cancelError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(""); setCancelError(null); }}>Keep Invoice</Button>
                <Button variant="destructive" onClick={() => handleCancel(cancelTarget)} disabled={cancelInvoice.isPending}>
                  {cancelInvoice.isPending ? "Cancelling..." : "Cancel Invoice"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}