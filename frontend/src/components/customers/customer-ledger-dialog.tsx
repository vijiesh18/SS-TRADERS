"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCustomerLedger } from "@/hooks/use-customers";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "destructive",
  CANCELLED: "secondary",
};

interface CustomerLedgerDialogProps {
  customerId: string | null;
  onClose: () => void;
}

export function CustomerLedgerDialog({ customerId, onClose }: CustomerLedgerDialogProps) {
  const { data, isLoading } = useCustomerLedger(customerId);

  return (
    <Dialog open={!!customerId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data?.customer.name || "Customer"}</DialogTitle>
          <DialogDescription>{data?.customer.phone}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data found.</p>
        ) : (
          <div className="space-y-4">
            {/* Analytics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="text-lg font-semibold">{formatCurrency(data.analytics.totalSpent)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-lg font-semibold">{data.analytics.totalOrders}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
                <p className="text-lg font-semibold">{formatCurrency(data.analytics.avgOrderValue)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Pending Credit</p>
                <p className="text-lg font-semibold text-amber-600">
                  {formatCurrency(data.analytics.totalPendingCredit)}
                </p>
              </div>
            </div>

            <Tabs defaultValue="purchases">
              <TabsList>
                <TabsTrigger value="purchases">Purchase History</TabsTrigger>
                <TabsTrigger value="credit">Credit History</TabsTrigger>
              </TabsList>

              <TabsContent value="purchases">
                <div className="max-h-72 overflow-y-auto">
                  {data.invoices.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2">Invoice</th>
                          <th className="py-2">Date</th>
                          <th className="py-2">Payment</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="py-2 font-medium">{inv.invoiceNumber}</td>
                            <td className="py-2 text-xs text-muted-foreground">{formatDate(inv.createdAt)}</td>
                            <td className="py-2 text-xs">{inv.paymentMethod}</td>
                            <td className="py-2">
                              <Badge variant={STATUS_VARIANT[inv.status] || "secondary"}>{inv.status}</Badge>
                            </td>
                            <td className="py-2 text-right font-medium">{formatCurrency(Number(inv.grandTotal))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="credit">
                <div className="max-h-72 overflow-y-auto">
                  {data.credits.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No credit records.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2">Due Date</th>
                          <th className="py-2 text-right">Total</th>
                          <th className="py-2 text-right">Paid</th>
                          <th className="py-2 text-right">Pending</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.credits.map((c) => (
                          <tr key={c.id}>
                            <td className="py-2 text-xs text-muted-foreground">
                              {c.dueDate ? formatDate(c.dueDate) : "-"}
                            </td>
                            <td className="py-2 text-right">{formatCurrency(Number(c.totalAmount))}</td>
                            <td className="py-2 text-right">{formatCurrency(Number(c.paidAmount))}</td>
                            <td className="py-2 text-right font-medium">{formatCurrency(Number(c.pendingAmount))}</td>
                            <td className="py-2">
                              <Badge variant={c.isSettled ? "success" : "warning"}>
                                {c.isSettled ? "Settled" : "Pending"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
