"use client";

import { useEffect, useState } from "react";
import { Building2, Receipt, FileText, DatabaseBackup, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { useAuthStore } from "@/store/auth-store";

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  cardHeaderText: { fontSize: 14, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  cardHeaderSub: { fontSize: 11, color: "rgba(180,155,110,0.75)", marginTop: 1 } as React.CSSProperties,
  body: { padding: 20, display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: 6 } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.30)" } as React.CSSProperties,
  switchRow: { display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 10, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(250,247,242,0.6)", padding: 14 } as React.CSSProperties,
  savedTag: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "#4a5e28" } as React.CSSProperties,
};

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const [business, setBusiness] = useState(settings?.business);
  const [gst, setGst] = useState(settings?.gst);
  const [invoice, setInvoice] = useState(settings?.invoice);
  const [estimate, setEstimate] = useState(settings?.estimate);
  const [backup, setBackup] = useState(settings?.backup);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBusiness(settings.business);
      setGst(settings.gst);
      setInvoice(settings.invoice);
      setEstimate(settings.estimate);
      setBackup(settings.backup);
    }
  }, [settings]);

  async function save(key: string, value: unknown) {
    await updateSetting.mutateAsync({ key, value });
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  }

  if (isLoading || !business || !gst || !invoice || !estimate || !backup) {
    return <p style={{ fontSize: 13, color: "#a8937a" }}>Loading settings...</p>;
  }

  return (
    <div style={S.page}>
      <div>
        <h1 style={S.title}>Settings</h1>
        <p style={S.subtitle}>Business details, GST configuration, invoice numbering, and backup schedule</p>
      </div>

      {!isAdmin && (
        <p style={{ fontSize: 13, color: "#8a4a10", background: "rgba(196,122,58,0.10)", border: "1px solid rgba(196,122,58,0.30)", borderRadius: 10, padding: 12 }}>
          You're viewing settings in read-only mode. Only Admin users can make changes.
        </p>
      )}

      {/* Business Details */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <Building2 size={15} color="rgba(180,155,110,0.8)" />
          <div>
            <div style={S.cardHeaderText}>Business Details</div>
            <div style={S.cardHeaderSub}>Shown on invoices, estimates, and reports</div>
          </div>
        </div>
        <div style={S.body}>
          <div style={S.grid2}>
            <div style={S.field}>
              <Label>Business Name</Label>
              <Input value={business.name} disabled={!isAdmin} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
            </div>
            <div style={S.field}>
              <Label>GSTIN</Label>
              <Input value={business.gstin} disabled={!isAdmin} onChange={(e) => setBusiness({ ...business, gstin: e.target.value })} />
            </div>
          </div>
          <div style={S.grid2}>
            <div style={S.field}>
              <Label>Phone</Label>
              <Input value={business.phone} disabled={!isAdmin} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
            </div>
            <div style={S.field}>
              <Label>Business Types</Label>
              <Input value={business.types.join(", ")} disabled={!isAdmin} onChange={(e) => setBusiness({ ...business, types: e.target.value.split(",").map((s) => s.trim()) })} />
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button style={S.btnPrimary} onClick={() => save("business", business)} disabled={updateSetting.isPending}>Save</button>
              {saved === "business" && <span style={S.savedTag}><CheckCircle2 size={14} /> Saved</span>}
            </div>
          )}
        </div>
      </div>

      {/* GST Configuration */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <Receipt size={15} color="rgba(180,155,110,0.8)" />
          <div>
            <div style={S.cardHeaderText}>GST Configuration</div>
            <div style={S.cardHeaderSub}>Default tax rate and CGST/SGST split behavior</div>
          </div>
        </div>
        <div style={S.body}>
          <div style={S.grid2}>
            <div style={S.field}>
              <Label>Default GST Rate (%)</Label>
              <Input type="number" value={gst.defaultRate} disabled={!isAdmin} onChange={(e) => setGst({ ...gst, defaultRate: Number(e.target.value) })} />
            </div>
            <div style={S.switchRow}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#2c2418" }}>Intra-State (CGST + SGST)</p>
                <p style={{ fontSize: 11, color: "#a8937a" }}>Tamil Nadu — split GST into CGST and SGST equally</p>
              </div>
              <Switch checked={gst.intraState} disabled={!isAdmin} onCheckedChange={(v) => setGst({ ...gst, intraState: v })} />
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button style={S.btnPrimary} onClick={() => save("gst", gst)} disabled={updateSetting.isPending}>Save</button>
              {saved === "gst" && <span style={S.savedTag}><CheckCircle2 size={14} /> Saved</span>}
            </div>
          )}
        </div>
      </div>

      {/* Document Numbering */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <FileText size={15} color="rgba(180,155,110,0.8)" />
          <div>
            <div style={S.cardHeaderText}>Document Numbering</div>
            <div style={S.cardHeaderSub}>Invoice: {invoice.prefix}-YYYY-NNNNNN · Estimate: {estimate.prefix}-YYYY-NNNNNN</div>
          </div>
        </div>
        <div style={S.body}>
          <div style={S.grid2}>
            <div style={S.field}>
              <Label>Invoice Prefix</Label>
              <Input value={invoice.prefix} disabled={!isAdmin} onChange={(e) => setInvoice({ ...invoice, prefix: e.target.value.toUpperCase() })} />
            </div>
            <div style={S.field}>
              <Label>Estimate Prefix</Label>
              <Input value={estimate.prefix} disabled={!isAdmin} onChange={(e) => setEstimate({ ...estimate, prefix: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div style={S.switchRow}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#2c2418" }}>Reset numbering yearly</p>
              <p style={{ fontSize: 11, color: "#a8937a" }}>Numbering restarts from 000001 at the start of each year</p>
            </div>
            <Switch checked={invoice.nextResetYearly} disabled={!isAdmin} onCheckedChange={(v) => { setInvoice({ ...invoice, nextResetYearly: v }); setEstimate({ ...estimate, nextResetYearly: v }); }} />
          </div>
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button style={S.btnPrimary} onClick={async () => { await save("invoice", invoice); await save("estimate", estimate); }} disabled={updateSetting.isPending}>Save</button>
              {(saved === "invoice" || saved === "estimate") && <span style={S.savedTag}><CheckCircle2 size={14} /> Saved</span>}
            </div>
          )}
        </div>
      </div>

      {/* Backup Schedule */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <DatabaseBackup size={15} color="rgba(180,155,110,0.8)" />
          <div>
            <div style={S.cardHeaderText}>Backup Schedule</div>
            <div style={S.cardHeaderSub}>Automated backup configuration</div>
          </div>
        </div>
        <div style={S.body}>
          <div style={S.switchRow}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#2c2418" }}>Daily Backup</p>
              <p style={{ fontSize: 11, color: "#a8937a" }}>Runs automatically at 2:00 AM</p>
            </div>
            <Switch checked={backup.dailyEnabled} disabled={!isAdmin} onCheckedChange={(v) => setBackup({ ...backup, dailyEnabled: v })} />
          </div>
          <div style={S.switchRow}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#2c2418" }}>Weekly Backup</p>
              <p style={{ fontSize: 11, color: "#a8937a" }}>Runs automatically every Sunday at 3:00 AM</p>
            </div>
            <Switch checked={backup.weeklyEnabled} disabled={!isAdmin} onCheckedChange={(v) => setBackup({ ...backup, weeklyEnabled: v })} />
          </div>
          <div style={{ ...S.field, maxWidth: 280 }}>
            <Label>Retention (days)</Label>
            <Input type="number" value={backup.retentionDays} disabled={!isAdmin} onChange={(e) => setBackup({ ...backup, retentionDays: Number(e.target.value) })} />
          </div>
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button style={S.btnPrimary} onClick={() => save("backup", backup)} disabled={updateSetting.isPending}>Save</button>
              {saved === "backup" && <span style={S.savedTag}><CheckCircle2 size={14} /> Saved</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}