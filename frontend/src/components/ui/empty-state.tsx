import { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(180,155,110,0.10)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={24} style={{ color: "#a8937a" }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#2c2418", marginBottom: 6, fontFamily: "Georgia, serif" }}>{title}</p>
      <p style={{ fontSize: 13, color: "#a8937a", maxWidth: 300, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}
