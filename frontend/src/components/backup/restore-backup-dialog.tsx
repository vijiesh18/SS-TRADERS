"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRestoreBackup } from "@/hooks/use-backup";
import { AlertTriangle, UploadCloud, CheckCircle2 } from "lucide-react";

interface RestoreBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreBackupDialog({ open, onOpenChange }: RestoreBackupDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const restore = useRestoreBackup();

  function reset() {
    setFile(null);
    setConfirmText("");
    setError(null);
    setSuccess(null);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function handleRestore() {
    setError(null);
    if (!file) return setError("Please select a backup ZIP file");
    if (confirmText !== "RESTORE") return setError('Type "RESTORE" to confirm this action');

    try {
      const result = await restore.mutateAsync(file);
      setSuccess(result.message);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Restore failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Restore Database
          </DialogTitle>
          <DialogDescription>
            This will overwrite existing products, customers, suppliers, categories, brands, expenses, and
            settings with the data in the backup file. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="rounded-md border bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-slate-50">
              <UploadCloud className="h-6 w-6" />
              {file ? <span className="font-medium text-foreground">{file.name}</span> : "Click to select backup ZIP file"}
              <Input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="space-y-1.5">
              <p className="text-sm">
                Type <span className="font-mono font-semibold">RESTORE</span> to confirm:
              </p>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESTORE" />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {success ? "Close" : "Cancel"}
          </Button>
          {!success && (
            <Button variant="destructive" onClick={handleRestore} disabled={restore.isPending}>
              {restore.isPending ? "Restoring..." : "Restore Database"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
