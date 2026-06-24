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
import { useConvertEstimate, type Estimate } from "@/hooks/use-estimates";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "CREDIT"] as const;

interface ConvertEstimateDialogProps {
  estimate: Estimate | null;
  onClose: () => void;
}

export function ConvertEstimateDialog({ estimate, onClose }: ConvertEstimateDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const convertEstimate = useConvertEstimate();

  function reset() {
    setPaymentMethod("CASH");
    setPaidAmount("");
    setError(null);
    setSuccess(null);
  }

  function handleClose(o: boolean) {
    if (!o) {
      reset();
      onClose();
    }
  }

  async function handleConvert() {
    if (!estimate) return;
    setError(null);

    const grandTotal = Number(estimate.grandTotal);
    const paid = paymentMethod === "CREDIT" ? Number(paidAmount) || 0 : grandTotal;

    try {
      const result = await convertEstimate.mutateAsync({
        id: estimate.id,
        paymentMethod,
        paidAmount: paid,
      });
      setSuccess(`Invoice ${result.invoiceNumber} generated successfully.`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to convert estimate");
    }
  }

  return (
    <Dialog open={!!estimate} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Invoice</DialogTitle>
          <DialogDescription>
            {estimate?.estimateNumber} · Grand Total: {estimate ? formatCurrency(Number(estimate.grandTotal)) : ""}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="rounded-md border bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Payment Method</p>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={paymentMethod === m ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setPaymentMethod(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === "CREDIT" && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Amount Paid Now</p>
                <Input
                  type="number"
                  min="0"
                  placeholder="0 if fully on credit"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {success ? "Close" : "Cancel"}
          </Button>
          {!success && (
            <Button onClick={handleConvert} disabled={convertEstimate.isPending}>
              {convertEstimate.isPending ? "Converting..." : "Generate Invoice"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
