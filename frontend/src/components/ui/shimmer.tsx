"use client";

export function Shimmer({ width, height, radius = 8, className }: { width?: number | string; height?: number | string; radius?: number; className?: string }) {
  return (
    <div className={`shimmer-block ${className || ""}`} style={{ width: width || "100%", height: height || 16, borderRadius: radius }} />
  );
}

export function ShimmerRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "12px 14px" }}>
          <div className="shimmer-block" style={{ width: "80%", height: 14, borderRadius: 6 }} />
        </td>
      ))}
    </tr>
  );
}

export function ShimmerCard() {
  return (
    <div style={{ background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, padding: "20px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div className="shimmer-block" style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="shimmer-block" style={{ width: "60%", height: 10, borderRadius: 4, marginBottom: 8 }} />
        <div className="shimmer-block" style={{ width: "40%", height: 18, borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerRow key={i} cols={cols} />
      ))}
    </>
  );
}
