"use client";

import { useState } from "react";
import { DatabaseBackup, Download, RotateCcw, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RestoreBackupDialog } from "@/components/backup/restore-backup-dialog";
import { useBackups, useCreateBackup, downloadBackup, type Backup } from "@/hooks/use-backup";
import { formatDate } from "@/lib/utils";

const TYPE_VARIANT: Record<Backup["type"], "secondary" | "default" | "outline"> = {
  MANUAL: "default",
  DAILY: "secondary",
  WEEKLY: "outline",
};

const STATUS_VARIANT: Record<Backup["status"], "success" | "warning" | "destructive" | "secondary"> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "destructive",
  RESTORED: "secondary",
};

function formatSize(bytes?: number | null) {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function BackupPage() {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const { data: backups, isLoading, refetch, isFetching } = useBackups();
  const createBackup = useCreateBackup();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Backup Center</h1>
          <p className="text-sm text-muted-foreground">
            Download full database backups or restore from a previous backup ZIP
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRestoreOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Restore Backup
          </Button>
          <Button onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>
            <DatabaseBackup className="h-4 w-4 mr-1" />
            {createBackup.isPending ? "Creating..." : "Download Full Backup"}
          </Button>
        </div>
      </div>

      <Card className="bg-slate-50 border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">What's included in a backup?</p>
          <p>
            Products, customers, suppliers, invoices, estimates, credit records, purchases, stock movements,
            expenses, settings, and users (passwords excluded). Backups are named{" "}
            <span className="font-mono">SS_Traders_Backup_YYYY_MM_DD.zip</span>.
          </p>
          <p>Daily backups run automatically at 2:00 AM, and weekly backups every Sunday at 3:00 AM.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Backup History</CardTitle>
            <CardDescription>Recent manual, daily, and weekly backups</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : !backups || backups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No backups yet. Click "Download Full Backup" to create one.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.fileName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_VARIANT[b.type]}>{b.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[b.status]}>{b.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatSize(b.sizeBytes)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(b.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.createdBy?.name || "System"}</td>
                    <td className="px-4 py-3 text-right">
                      {b.status === "COMPLETED" && (
                        <Button size="sm" variant="ghost" onClick={() => downloadBackup(b)}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <RestoreBackupDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
    </div>
  );
}
