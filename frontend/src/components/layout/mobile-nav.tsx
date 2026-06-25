"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShoppingCart, Package, Boxes, Menu } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Billing", icon: ShoppingCart, href: "/billing" },
  { label: "Products", icon: Package, href: "/products" },
  { label: "Inventory", icon: Boxes, href: "/inventory" },
];

export function MobileNav() {
  const pathname = usePathname();

  const handleMore = () => {
    (document.querySelector(".hamburger-btn") as HTMLElement)?.click();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="mobile-nav" style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 45,
      background: "rgba(250,247,242,0.95)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(180,155,110,0.20)",
      boxShadow: "0 -4px 20px rgba(100,80,40,0.08)",
      height: 60,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      display: "none",
      alignItems: "center",
      justifyContent: "space-around",
    }}>
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 2,
              textDecoration: "none",
              color: active ? "#6b7c45" : "#a8937a",
              position: "relative",
              paddingTop: 8,
              paddingBottom: 4,
            }}
          >
            <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>
              {item.label}
            </span>
            {active && (
              <span style={{
                position: "absolute",
                bottom: 0,
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#6b7c45",
              }} />
            )}
          </Link>
        );
      })}

      {/* More button */}
      <button
        onClick={handleMore}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 2,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#a8937a",
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <Menu size={20} strokeWidth={1.8} />
        <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>
          More
        </span>
      </button>
    </nav>
  );
}
