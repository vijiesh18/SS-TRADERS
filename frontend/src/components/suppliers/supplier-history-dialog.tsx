"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSupplierHistory } from "@/hooks/use-suppliers";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SupplierHistoryDialogProps {
  supplierId: string | null;
  onClose: () => void;
}

export function SupplierHistoryDialog({ supplierId, onClose }: SupplierHistoryDialogProps) {
  const { data, isLoading } = useSupplierHistory(supplierId);

  return (
    <Dialog open={!!supplierId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{data?.supplier.name || "Supplier"}</DialogTitle>
          <DialogDescription>
            Outstanding Balance: {data ? formatCurrency(Number(data.supplier.outstandingBalance)) : "-"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : !data || data.purchases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No purchases recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Purchase #</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Items</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Paid</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 font-medium">{p.purchaseNumber}</td>
                    <td className="py-2 text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                    <td className="py-2 text-right">{p.items.length}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(p.totalAmount))}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(p.paidAmount))}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(p.balanceAmount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
