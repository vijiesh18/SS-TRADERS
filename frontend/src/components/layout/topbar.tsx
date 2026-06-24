"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/dashboard":       { title: "Dashboard",         sub: "Overview & analytics" },
  "/billing":         { title: "Billing POS",        sub: "Create & manage invoices" },
  "/billing-history": { title: "Billing History",    sub: "All past invoices" },
  "/estimates":       { title: "Estimates",           sub: "Create estimates and convert to GST invoices" },
  "/credit":          { title: "Credit Management",  sub: "Track & collect pending payments" },
  "/inventory":       { title: "Inventory",           sub: "Stock levels & adjustments" },
  "/products":        { title: "Products",            sub: "Product catalogue" },
  "/purchases":       { title: "Purchases",           sub: "Purchase records from suppliers" },
  "/customers":       { title: "Customers",           sub: "Customer directory & ledger" },
  "/suppliers":       { title: "Suppliers",           sub: "Supplier management" },
  "/reports":         { title: "Reports",             sub: "Business analytics & GST reports" },
  "/expenses":        { title: "Expenses",            sub: "Category-based expense tracking" },
  "/users":           { title: "Users",               sub: "Access & role management" },
  "/audit-logs":      { title: "Audit Logs",          sub: "Full activity history" },
  "/export":          { title: "Data Export",         sub: "Download your data" },
  "/backup":          { title: "Backup Centre",       sub: "Manual & scheduled backups" },
  "/settings":        { title: "Settings",            sub: "Business configuration" },
};

function Clock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily:"Georgia,serif", fontWeight:600, color:"#6b7c45", fontSize:13 }}>
      {time.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true })}
    </span>
  );
}

import React from "react";

export function TopBar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const meta =
    PAGE_META[pathname] ??
    Object.entries(PAGE_META).find(([k]) => pathname?.startsWith(k))?.[1] ??
    { title: "S.S Traders", sub: "Smart POS" };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <header style={{
      background: "rgba(245,240,232,0.92)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(180,155,110,0.22)",
      height: 64,
      display: "flex",
      alignItems: "center",
      padding: "0 32px",
      position: "sticky",
      top: 0,
      zIndex: 40,
      gap: 16,
    }}>
      {/* Page title */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize:17, fontWeight:700, letterSpacing:"-0.4px", color:"#2c2418", lineHeight:1 }}>
          {meta.title}
        </div>
        <div style={{ fontSize:11, color:"#a8937a", marginTop:3, fontWeight:500 }}>
          {meta.sub}
        </div>
      </div>

      {/* Date + time */}
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        background:"rgba(250,247,242,0.9)", border:"1px solid rgba(180,155,110,0.25)",
        borderRadius:999, padding:"5px 14px", fontSize:12, color:"#6b5d4a",
      }}>
        <span>📅</span>
        <span style={{ fontWeight:500 }}>{today}</span>
        <span style={{ width:1, height:12, background:"rgba(180,155,110,0.35)", display:"inline-block" }} />
        <Clock />
      </div>

      {/* New Bill quick action */}
      <Link href="/billing" style={{
        display:"inline-flex", alignItems:"center", gap:7,
        background:"linear-gradient(135deg, #6b7c45, #8fa05a)",
        color:"#fff", fontWeight:700, fontSize:13,
        padding:"8px 18px", borderRadius:10, textDecoration:"none",
        boxShadow:"0 4px 14px rgba(107,124,69,0.35)",
        transition:"all 0.2s",
      }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(107,124,69,0.5)")}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(107,124,69,0.35)")}
      >
        + New Bill
      </Link>
    </header>
  );
}
