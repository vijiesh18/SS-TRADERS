"use client";

import { useState } from "react";
import { Plus, Search, BookOpen, Pencil, Users } from "lucide-react";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomerLedgerDialog } from "@/components/customers/customer-ledger-dialog";
import { useCustomers, type Customer } from "@/hooks/use-customers";

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
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [ledgerTarget, setLedgerTarget] = useState<string | null>(null);

  const { data, isLoading } = useCustomers(page, 25);

  const customers = data?.items || [];
  const filtered = search.trim()
    ? customers.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
      )
    : customers;

  function openAddForm() {
    setEditingCustomer(null);
    setFormOpen(true);
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Customers</h1>
          <p style={S.subtitle}>Manage customer details, view purchase history and credit ledger</p>
        </div>
        <button style={S.btnPrimary} onClick={openAddForm}>
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div style={S.card}>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ position: "relative", maxWidth: 380 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8937a", pointerEvents: "none" }} />
            <input
              style={S.input}
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <Users size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Customer Directory</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Phone</th>
                <th style={S.th}>Address</th>
                <th style={S.th}>GST Number</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>Loading customers...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>No customers found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
                    <td style={S.td}>{c.phone}</td>
                    <td style={{ ...S.td, color: "#a8937a" }}>{c.address || "-"}</td>
                    <td style={{ ...S.td, color: "#a8937a" }}>{c.gstNumber || "-"}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button style={S.btnGhost} onClick={() => setLedgerTarget(c.id)}>
                          <BookOpen size={13} /> Ledger
                        </button>
                        <button style={{ ...S.btnGhost, padding: "6px 8px" }} onClick={() => openEditForm(c)}>
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} />
      <CustomerLedgerDialog customerId={ledgerTarget} onClose={() => setLedgerTarget(null)} />
    </div>
  );
}