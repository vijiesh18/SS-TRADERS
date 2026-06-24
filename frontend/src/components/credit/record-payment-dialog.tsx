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
import { Label } from "@/components/ui/label";
import { useRecordCreditPayment, type CreditRecord } from "@/hooks/use-credit";
import { formatCurrency } from "@/lib/utils";

const METHODS = ["CASH", "UPI", "CARD"] as const;

interface RecordPaymentDialogProps {
  record: CreditRecord | null;
  onClose: () => void;
}

export function RecordPaymentDialog({ record, onClose }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recordPayment = useRecordCreditPayment();

  function reset() {
    setAmount("");
    setMethod("CASH");
    setNote("");
    setError(null);
  }

  function handleClose(o: boolean) {
    if (!o) {
      reset();
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!record) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount");
    if (amt > Number(record.pendingAmount)) return setError("Amount exceeds pending balance");

    try {
      await recordPayment.mutateAsync({
        creditRecordId: record.id,
        amount: amt,
        paymentMethod: method,
        note: note || undefined,
      });
      handleClose(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to record payment");
    }
  }

  return (
    <Dialog open={!!record} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {record?.customer.name} · Invoice {record?.invoice.invoiceNumber} · Pending:{" "}
            {record ? formatCurrency(Number(record.pendingAmount)) : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              {METHODS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={method === m ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMethod(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid in person" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
