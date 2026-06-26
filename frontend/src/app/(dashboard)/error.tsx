"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Route-segment error boundary for all dashboard pages. Next.js auto-resets
 * it on navigation, so a crashing page no longer leaves a blank screen that
 * needs a manual refresh — moving to another page (or "Try again") recovers.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Dashboard page error:", error);
  }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 20px", textAlign: "center", minHeight: "60vh" }}>
      <div style={{ width: 60, height: 60, borderRadius: 17, background: "rgba(196,122,58,0.12)", color: "#c47a3a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <AlertTriangle size={26} />
      </div>
      <p style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#2c2418", marginBottom: 8 }}>
        Something went wrong on this page
      </p>
      <p style={{ fontSize: 13.5, color: "#a8937a", maxWidth: 340, lineHeight: 1.6, marginBottom: 22 }}>
        Try again — or use the menu to open another page.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => reset()}
          style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.35)" }}>
          Try again
        </button>
        <button onClick={() => { window.location.href = "/dashboard"; }}
          style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid rgba(180,155,110,0.30)", background: "rgba(250,247,242,0.8)", color: "#6b5d4a", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
