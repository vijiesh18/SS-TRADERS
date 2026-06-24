"use client";

import { useState } from "react";
import { Plus, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewPurchaseDialog } from "@/components/purchases/new-purchase-dialog";
import { usePurchases } from "@/hooks/use-purchases";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = usePurchases(page, 25);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Record supplier purchases, update stock-in, and track payment balances
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Purchase Entry
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Purchase #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading purchases...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      No purchases recorded yet.
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((p) => {
                  const balance = Number(p.balanceAmount);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{p.purchaseNumber}</td>
                      <td className="px-4 py-3">{p.supplier.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-right">{p.items.length}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(p.totalAmount))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(p.paidAmount))}</td>
                      <td className="px-4 py-3 text-right">
                        {balance > 0 ? (
                          <Badge variant="warning">{formatCurrency(balance)}</Badge>
                        ) : (
                          <Badge variant="success">Paid</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {(page - 1) * data.limit + 1}-{Math.min(page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * data.limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <NewPurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
