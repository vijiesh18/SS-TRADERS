"use client";

import { Lock } from "lucide-react";
import { useDemoStore } from "@/store/demo-store";

export function DemoLockDialog() {
  const open = useDemoStore((s) => s.blockedOpen);
  const hide = useDemoStore((s) => s.hideBlocked);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "rgba(44,40,32,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) hide(); }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: 380, padding: 26, textAlign: "center",
          background: "rgba(250,247,242,0.98)", border: "1px solid rgba(180,155,110,0.30)",
          borderRadius: 18, boxShadow: "0 24px 64px rgba(100,80,40,0.22)",
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(196,122,58,0.12)", color: "#c47a3a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Lock size={24} />
        </div>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, color: "#2c2418", marginBottom: 8 }}>
          Not available in the demo
        </p>
        <p style={{ fontSize: 13.5, color: "#6b5d4a", lineHeight: 1.6, marginBottom: 22 }}>
          This is a read-only demo so you can explore the full app freely.
          Adding, editing, or deleting records is disabled — nothing is saved.
          The live version has everything fully enabled.
        </p>
        <button
          onClick={hide}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(107,124,69,0.35)",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
