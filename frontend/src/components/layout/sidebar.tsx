"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, History, FileText, Boxes,
  Package, Users, Truck, ClipboardList, Wallet, Receipt,
  BarChart3, Download, DatabaseBackup, Settings, UserCog,
  ScrollText, LogOut, Paintbrush, X, Menu,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";

interface NavItem {
  label: string; href: string; icon: React.ElementType; permission?: string;
}

const NAV_GROUPS = [
  { section: "Operations", items: [
    { label: "Dashboard",       href: "/dashboard",       icon: LayoutDashboard },
    { label: "Billing POS",     href: "/billing",         icon: ShoppingCart,  permission: "billing:read" },
    { label: "Billing History", href: "/billing-history", icon: History,       permission: "billing:read" },
    { label: "Estimates",       href: "/estimates",       icon: FileText,      permission: "estimates:read" },
    { label: "Credit",          href: "/credit",          icon: Wallet,        permission: "credit:read" },
  ] as NavItem[] },
  { section: "Inventory", items: [
    { label: "Inventory",  href: "/inventory",  icon: Boxes,        permission: "inventory:read" },
    { label: "Products",   href: "/products",   icon: Package,      permission: "products:read" },
    { label: "Purchases",  href: "/purchases",  icon: ClipboardList },
  ] as NavItem[] },
  { section: "People", items: [
    { label: "Customers", href: "/customers", icon: Users, permission: "customers:read" },
    { label: "Suppliers", href: "/suppliers", icon: Truck },
  ] as NavItem[] },
  { section: "Finance", items: [
    { label: "Reports",  href: "/reports",  icon: BarChart3, permission: "reports:read" },
    { label: "Expenses", href: "/expenses", icon: Receipt },
  ] as NavItem[] },
  { section: "System", items: [
    { label: "Users",       href: "/users",      icon: UserCog,        permission: "admin:full" },
    { label: "Audit Logs",  href: "/audit-logs", icon: ScrollText,     permission: "admin:full" },
    { label: "Data Export", href: "/export",     icon: Download,       permission: "admin:full" },
    { label: "Backup",      href: "/backup",     icon: DatabaseBackup, permission: "admin:full" },
    { label: "Settings",    href: "/settings",   icon: Settings },
  ] as NavItem[] },
];

export function Sidebar() {
  const pathname      = usePathname();
  const router        = useRouter();
  const user          = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout        = useLogout();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on ESC
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // Prevent body scroll + flag drawer-open state when open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("drawer-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("drawer-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("drawer-open");
    };
  }, [open]);

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <>
      {/* Ambient blobs */}
      <div className="glass-scene" aria-hidden="true">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      </div>
      <div className="paint-grid" aria-hidden="true" />

      {/* Hamburger — mobile only (CSS hides on desktop) */}
      <button className="hamburger-btn" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>

      {/* Backdrop — mobile only */}
      <div
        className={`sidebar-backdrop${open ? "" : " hidden"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar-glass${open ? " sidebar-open" : ""}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div className="sidebar-logo-mark"><Paintbrush size={16} /></div>
              <div>
                <div className="sidebar-logo-text">S.S Traders</div>
                <div className="sidebar-logo-sub">SMART POS · NAGERCOIL</div>
              </div>
            </div>
            {/* Close btn — shown on mobile via CSS */}
            <button
              className="sidebar-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(180,155,110,0.7)", padding:4, borderRadius:6, display:"flex", alignItems:"center" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"6px 0", overflowY:"auto", WebkitOverflowScrolling:"touch", minHeight:0 }}>
          {NAV_GROUPS.map((group) => {
            const visible = group.items.filter(
              (it) => !it.permission || hasPermission(it.permission)
            );
            if (!visible.length) return null;
            return (
              <div key={group.section}>
                <div className="sidebar-section-label">{group.section}</div>
                {visible.map((item) => {
                  const active = item.href === "/billing"
                    ? pathname === "/billing"
                    : pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}
                      className={`sidebar-item${active ? " active" : ""}`}>
                      <Icon size={15} style={{ flexShrink:0 }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(180,155,110,0.15)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 12px", marginBottom:2 }}>
            <div style={{
              width:32, height:32, borderRadius:"50%",
              background:"linear-gradient(135deg,#6b7c45,#c47a3a)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, fontWeight:700, color:"#fff", flexShrink:0,
            }}>
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"rgba(245,240,230,0.95)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {user?.name}
              </div>
              <div style={{ fontSize:10, color:"rgba(180,155,110,0.6)", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                {user?.role}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item"
            style={{ width:"calc(100% - 16px)", background:"none", border:"none", cursor:"pointer" }}>
            <LogOut size={14} style={{ flexShrink:0 }} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
