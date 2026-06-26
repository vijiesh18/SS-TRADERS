"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";
import { useAuthStore } from "@/store/auth-store";

const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/dashboard":       { title: "Dashboard",        sub: "Overview & analytics" },
  "/billing":         { title: "Billing POS",       sub: "Create & manage invoices" },
  "/billing-history": { title: "Billing History",   sub: "All past invoices" },
  "/estimates":       { title: "Estimates",          sub: "Quotations & estimates" },
  "/credit":          { title: "Credit",             sub: "Track pending payments" },
  "/inventory":       { title: "Inventory",          sub: "Stock management" },
  "/products":        { title: "Products",           sub: "Product catalogue" },
  "/purchases":       { title: "Purchases",          sub: "Purchase records" },
  "/customers":       { title: "Customers",          sub: "Customer directory" },
  "/suppliers":       { title: "Suppliers",          sub: "Supplier management" },
  "/reports":         { title: "Reports",            sub: "Business analytics" },
  "/expenses":        { title: "Expenses",           sub: "Expense tracking" },
  "/users":           { title: "Users",              sub: "Access management" },
  "/audit-logs":      { title: "Audit Logs",         sub: "Activity history" },
  "/export":          { title: "Data Export",        sub: "Download your data" },
  "/backup":          { title: "Backup Centre",      sub: "Backup & restore" },
  "/settings":        { title: "Settings",           sub: "Business configuration" },
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

export function TopBar() {
  const pathname = usePathname();
  const isDemo = useAuthStore((s) => s.user?.isDemo);
  const meta =
    PAGE_META[pathname] ??
    Object.entries(PAGE_META).find(([k]) => pathname?.startsWith(k))?.[1] ??
    { title: "S.S Traders", sub: "Management System" };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <>
    {isDemo && (
      <div className="demo-banner" style={{
        background: "linear-gradient(135deg, #c47a3a, #e8a45a)", color: "#fff",
        textAlign: "center", padding: "6px 12px", fontSize: 12, fontWeight: 700,
        letterSpacing: "0.5px", zIndex: 41, position: "sticky", top: 0,
      }}>
        DEMO MODE — Explore freely, nothing is saved to the database
      </div>
    )}
    <header className="topbar-glass">
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.3px", color:"#2c2418", lineHeight:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {meta.title}
        </div>
        <div style={{ fontSize:11, color:"#a8937a", marginTop:2, fontWeight:500 }} className="topbar-sub">
          {meta.sub}
        </div>
      </div>

      {/* Date + time — hidden on mobile via CSS class */}
      <div className="topbar-date" style={{
        display:"flex", alignItems:"center", gap:8,
        background:"rgba(250,247,242,0.9)", border:"1px solid rgba(180,155,110,0.25)",
        borderRadius:999, padding:"5px 12px", fontSize:12, color:"#6b5d4a", whiteSpace:"nowrap",
      }}>
        <span>{today}</span>
        <span style={{ width:1, height:10, background:"rgba(180,155,110,0.35)", display:"inline-block" }} />
        <Clock />
      </div>

      {/* New Bill — always visible, compact on mobile */}
      <Link href="/billing" className="topbar-newbill" style={{
        display:"inline-flex", alignItems:"center", gap:6,
        background:"linear-gradient(135deg,#6b7c45,#8fa05a)",
        color:"#fff", fontWeight:700, fontSize:13,
        padding:"8px 16px", borderRadius:10, textDecoration:"none",
        boxShadow:"0 4px 14px rgba(107,124,69,0.35)", whiteSpace:"nowrap", flexShrink:0,
      }}>
        + New Bill
      </Link>
    </header>
    </>
  );
}
