"use client";

import { useEffect, useState } from "react";
import { Building2, Receipt, FileText, DatabaseBackup, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { useAuthStore } from "@/store/auth-store";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  // Local editable copies
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
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business details, GST configuration, invoice numbering, and backup schedule
        </p>
      </div>

      {!isAdmin && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
          You're viewing settings in read-only mode. Only Admin users can make changes.
        </p>
      )}

      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Details
          </CardTitle>
          <CardDescription>Shown on invoices, estimates, and reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input
                value={business.name}
                disabled={!isAdmin}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>GSTIN</Label>
              <Input
                value={business.gstin}
                disabled={!isAdmin}
                onChange={(e) => setBusiness({ ...business, gstin: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={business.phone}
                disabled={!isAdmin}
                onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business Types</Label>
              <Input
                value={business.types.join(", ")}
                disabled={!isAdmin}
                onChange={(e) => setBusiness({ ...business, types: e.target.value.split(",").map((s) => s.trim()) })}
              />
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => save("business", business)} disabled={updateSetting.isPending}>
                Save
              </Button>
              {saved === "business" && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GST Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            GST Configuration
          </CardTitle>
          <CardDescription>Default tax rate and CGST/SGST split behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Default GST Rate (%)</Label>
              <Input
                type="number"
                value={gst.defaultRate}
                disabled={!isAdmin}
                onChange={(e) => setGst({ ...gst, defaultRate: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Intra-State (CGST + SGST)</p>
                <p className="text-xs text-muted-foreground">Tamil Nadu — split GST into CGST and SGST equally</p>
              </div>
              <Switch
                checked={gst.intraState}
                disabled={!isAdmin}
                onCheckedChange={(v) => setGst({ ...gst, intraState: v })}
              />
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => save("gst", gst)} disabled={updateSetting.isPending}>
                Save
              </Button>
              {saved === "gst" && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice & Estimate Numbering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Document Numbering
          </CardTitle>
          <CardDescription>
            Invoice format: {invoice.prefix}-YYYY-NNNNNN &middot; Estimate format: {estimate.prefix}-YYYY-NNNNNN
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Prefix</Label>
              <Input
                value={invoice.prefix}
                disabled={!isAdmin}
                onChange={(e) => setInvoice({ ...invoice, prefix: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estimate Prefix</Label>
              <Input
                value={estimate.prefix}
                disabled={!isAdmin}
                onChange={(e) => setEstimate({ ...estimate, prefix: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Reset numbering yearly</p>
              <p className="text-xs text-muted-foreground">
                Numbering restarts from 000001 at the start of each year
              </p>
            </div>
            <Switch
              checked={invoice.nextResetYearly}
              disabled={!isAdmin}
              onCheckedChange={(v) => {
                setInvoice({ ...invoice, nextResetYearly: v });
                setEstimate({ ...estimate, nextResetYearly: v });
              }}
            />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  await save("invoice", invoice);
                  await save("estimate", estimate);
                }}
                disabled={updateSetting.isPending}
              >
                Save
              </Button>
              {(saved === "invoice" || saved === "estimate") && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-4 w-4" />
            Backup Schedule
          </CardTitle>
          <CardDescription>Automated backup configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Daily Backup</p>
              <p className="text-xs text-muted-foreground">Runs automatically at 2:00 AM</p>
            </div>
            <Switch
              checked={backup.dailyEnabled}
              disabled={!isAdmin}
              onCheckedChange={(v) => setBackup({ ...backup, dailyEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Weekly Backup</p>
              <p className="text-xs text-muted-foreground">Runs automatically every Sunday at 3:00 AM</p>
            </div>
            <Switch
              checked={backup.weeklyEnabled}
              disabled={!isAdmin}
              onCheckedChange={(v) => setBackup({ ...backup, weeklyEnabled: v })}
            />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label>Retention (days)</Label>
            <Input
              type="number"
              value={backup.retentionDays}
              disabled={!isAdmin}
              onChange={(e) => setBackup({ ...backup, retentionDays: Number(e.target.value) })}
            />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => save("backup", backup)} disabled={updateSetting.isPending}>
                Save
              </Button>
              {saved === "backup" && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
