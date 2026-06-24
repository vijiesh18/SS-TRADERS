"use client";

import { useState } from "react";
import { Plus, FileText, ArrowRightCircle, Pencil, Printer, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NewEstimateDialog } from "@/components/estimates/new-estimate-dialog";
import { ConvertEstimateDialog } from "@/components/estimates/convert-estimate-dialog";
import { useEstimates, printEstimatePdf, downloadEstimatePdf, type Estimate } from "@/hooks/use-estimates";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<Estimate["status"], "secondary" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "warning",
  CONVERTED: "success",
  EXPIRED: "destructive",
};

export default function EstimatesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Estimate | null>(null);
  const [convertTarget, setConvertTarget] = useState<Estimate | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: estimates, isLoading } = useEstimates(statusFilter);

  function openNewDialog() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEditDialog(est: Estimate) {
    setEditTarget(est);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            Create estimates for customers and convert them to GST invoices when confirmed
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-1" />
          New Estimate
        </Button>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft</TabsTrigger>
          <TabsTrigger value="CONVERTED">Converted</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter || "all"}>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Estimate #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Items</th>
                    <th className="px-4 py-3 text-right">Grand Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Loading estimates...
                      </td>
                    </tr>
                  ) : !estimates || estimates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground/50" />
                          No estimates found.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    estimates.map((est) => (
                      <tr key={est.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{est.estimateNumber}</td>
                        <td className="px-4 py-3">{est.customer?.name || "Walk-in"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(est.createdAt)}</td>
                        <td className="px-4 py-3 text-right">{est.items.length}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(Number(est.grandTotal))}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[est.status]}>{est.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {est.status === "DRAFT" && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(est)}>
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setConvertTarget(est)}>
                                  <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
                                  Convert
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Print" onClick={() => printEstimatePdf(est.id)}>
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Download PDF"
                              onClick={() => downloadEstimatePdf(est.id, est.estimateNumber)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewEstimateDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditTarget(null);
        }}
        estimate={editTarget}
      />
      <ConvertEstimateDialog estimate={convertTarget} onClose={() => setConvertTarget(null)} />
    </div>
  );
}
