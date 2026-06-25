"use client";

import { Package, Users, Receipt, Boxes, Wallet, Truck, FileSpreadsheet } from "lucide-react";
import { ExportButtons } from "@/components/reports/export-buttons";
import { useDownloadExport, type ExportEntity } from "@/hooks/use-reports";
import type { LucideIcon } from "lucide-react";

const EXPORT_OPTIONS: { entity: ExportEntity; label: string; description: string; icon: LucideIcon }[] = [
  { entity: "products", label: "Export Products", description: "Full product catalog with codes, pricing, GST, and stock levels", icon: Package },
  { entity: "customers", label: "Export Customers", description: "Customer directory with contact details and GST numbers", icon: Users },
  { entity: "invoices", label: "Export Invoices", description: "All GST invoices with totals, status, and payment method", icon: Receipt },
  { entity: "inventory", label: "Export Inventory", description: "Current stock levels and stock valuation by product", icon: Boxes },
  { entity: "expenses", label: "Export Expenses", description: "All recorded expenses by category and date", icon: Wallet },
  { entity: "credit", label: "Export Credit Records", description: "Customer credit balances, due dates, and settlement status", icon: Wallet },
  { entity: "suppliers", label: "Export Suppliers", description: "Supplier directory with outstanding balances", icon: Truck },
];

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", padding: 20 } as React.CSSProperties,
  iconBox: { width: 42, height: 42, borderRadius: 11, background: "rgba(107,124,69,0.12)", color: "#6b7c45", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 } as React.CSSProperties,
  optTitle: { fontSize: 15, fontWeight: 700, color: "#2c2418", fontFamily: "Georgia, serif" } as React.CSSProperties,
  optDesc: { fontSize: 12, color: "#a8937a", marginTop: 4, marginBottom: 14, lineHeight: 1.4 } as React.CSSProperties,
};

export default function ExportPage() {
  const downloadExport = useDownloadExport();

  return (
    <div style={S.page}>
      <div>
        <h1 style={S.title}>Data Export</h1>
        <p style={S.subtitle}>Export your business data in Excel, CSV, or PDF format for backup, accounting, or sharing</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {EXPORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <div key={opt.entity} style={S.card}>
              <div style={S.iconBox}><Icon size={20} /></div>
              <div style={S.optTitle}>{opt.label}</div>
              <div style={S.optDesc}>{opt.description}</div>
              <ExportButtons
                isPending={downloadExport.isPending}
                onDownload={(format) => downloadExport.mutate({ entity: opt.entity, format })}
              />
            </div>
          );
        })}
      </div>

      <div style={{ ...S.card, background: "rgba(180,155,110,0.06)", border: "1px dashed rgba(180,155,110,0.4)", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <FileSpreadsheet size={20} color="#a8937a" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#6b5d4a" }}>
          <p style={{ fontWeight: 700, color: "#2c2418" }}>Note</p>
          <p style={{ marginTop: 2 }}>Data exports reflect the current state of your records. For a full database backup including all related data, use the Backup Center.</p>
        </div>
      </div>
    </div>
  );
}