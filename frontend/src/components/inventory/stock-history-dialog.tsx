"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useStockMovements } from "@/hooks/use-inventory";
import { formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<string, { label: string; variant: "success" | "destructive" | "secondary" | "warning" }> = {
  PURCHASE_IN: { label: "Purchase In", variant: "success" },
  SALE_OUT: { label: "Sale Out", variant: "secondary" },
  ADJUSTMENT_IN: { label: "Adjustment In", variant: "success" },
  ADJUSTMENT_OUT: { label: "Adjustment Out", variant: "destructive" },
  RETURN_IN: { label: "Return In", variant: "success" },
  RETURN_OUT: { label: "Return Out", variant: "destructive" },
  DAMAGE_OUT: { label: "Damage Out", variant: "destructive" },
  TRANSFER: { label: "Transfer", variant: "warning" },
};

interface StockHistoryDialogProps {
  productId: string | null;
  productName?: string;
  onClose: () => void;
}

export function StockHistoryDialog({ productId, productName, onClose }: StockHistoryDialogProps) {
  const { data: movements, isLoading } = useStockMovements(productId);

  return (
    <Dialog open={!!productId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Stock Movement History</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : !movements || movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No stock movements recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Balance After</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((m) => {
                  const meta = TYPE_LABELS[m.type] || { label: m.type, variant: "secondary" as const };
                  return (
                    <tr key={m.id}>
                      <td className="py-2">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="py-2 text-right">{Number(m.quantity)}</td>
                      <td className="py-2 text-right">{Number(m.balanceAfter)}</td>
                      <td className="py-2 text-xs text-muted-foreground">{m.reference || m.note || "-"}</td>
                      <td className="py-2 text-xs text-muted-foreground">{formatDate(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
