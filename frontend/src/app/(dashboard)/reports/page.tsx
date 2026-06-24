"use client";

import { useState } from "react";
import { TrendingUp, IndianRupee, Receipt, Boxes, Users, Wallet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { ExportButtons } from "@/components/reports/export-buttons";
import {
  useDownloadReport,
  useSalesReportPreview,
  useProfitReportPreview,
  useGstReportPreview,
  useInventoryReportPreview,
  useGstr1Report,
  type ReportType,
} from "@/hooks/use-reports";
import { formatCurrency, formatDate } from "@/lib/utils";

function defaultFrom() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());

  const downloadReport = useDownloadReport();

  const sales = useSalesReportPreview(from, to);
  const profit = useProfitReportPreview(from, to);
  const gst = useGstReportPreview(from, to);
  const gstr1 = useGstr1Report(from, to);
  const inventory = useInventoryReportPreview();

  function handleDateChange(f: string, t: string) {
    setFrom(f);
    setTo(t);
  }

  function download(type: ReportType, format: "pdf" | "excel" | "csv" | "json") {
    downloadReport.mutate({ type, format, from, to });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Sales, profit, GST, inventory, customer and credit reports
          </p>
        </div>
        <DateRangeFilter from={from} to={to} onChange={handleDateChange} />
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="profit">
            <IndianRupee className="h-4 w-4 mr-1.5" />
            Profit
          </TabsTrigger>
          <TabsTrigger value="gst">
            <Receipt className="h-4 w-4 mr-1.5" />
            GST
          </TabsTrigger>
          <TabsTrigger value="gstr1">
            <FileText className="h-4 w-4 mr-1.5" />
            GSTR-1
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Boxes className="h-4 w-4 mr-1.5" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-1.5" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="credit">
            <Wallet className="h-4 w-4 mr-1.5" />
            Credit
          </TabsTrigger>
        </TabsList>

        {/* Sales */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Report</CardTitle>
              <ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("sales", f)} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-lg font-semibold">
                    {sales.isLoading ? "..." : formatCurrency(sales.data?.totalSales || 0)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Invoices</p>
                  <p className="text-lg font-semibold">{sales.isLoading ? "..." : sales.data?.count || 0}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Avg Invoice Value</p>
                  <p className="text-lg font-semibold">
                    {sales.isLoading
                      ? "..."
                      : formatCurrency(
                          sales.data && sales.data.count > 0 ? sales.data.totalSales / sales.data.count : 0
                        )}
                  </p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2 text-right">GST</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sales.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : !sales.data || sales.data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          No invoices in this period.
                        </td>
                      </tr>
                    ) : (
                      sales.data.rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{r.invoiceNumber}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(r.date)}</td>
                          <td className="px-3 py-2">{r.customer}</td>
                          <td className="px-3 py-2 text-xs">{r.paymentMethod}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.gst)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.grandTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit */}
        <TabsContent value="profit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profit Report</CardTitle>
              <ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("profit", f)} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-semibold">
                    {profit.isLoading ? "..." : formatCurrency(profit.data?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {profit.isLoading ? "..." : formatCurrency(profit.data?.totalProfit || 0)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className="text-lg font-semibold">
                    {profit.isLoading || !profit.data || profit.data.totalRevenue === 0
                      ? "..."
                      : `${((profit.data.totalProfit / profit.data.totalRevenue) * 100).toFixed(1)}%`}
                  </p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {profit.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : !profit.data || profit.data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          No sales in this period.
                        </td>
                      </tr>
                    ) : (
                      profit.data.rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{r.invoiceNumber}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(r.date)}</td>
                          <td className="px-3 py-2">{r.product}</td>
                          <td className="px-3 py-2 text-right">{r.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.revenue)}</td>
                          <td className="px-3 py-2 text-right font-medium text-emerald-600">
                            {formatCurrency(r.profit)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST */}
        <TabsContent value="gst">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>GST Report (CGST + SGST)</CardTitle>
              <ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("gst", f)} />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">HSN Code</th>
                      <th className="px-3 py-2 text-right">GST %</th>
                      <th className="px-3 py-2 text-right">Taxable Amount</th>
                      <th className="px-3 py-2 text-right">CGST</th>
                      <th className="px-3 py-2 text-right">SGST</th>
                      <th className="px-3 py-2 text-right">Total GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {gst.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : !gst.data || gst.data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          No GST data for this period.
                        </td>
                      </tr>
                    ) : (
                      gst.data.rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{r.hsnCode}</td>
                          <td className="px-3 py-2 text-right">{r.gstPercentage}%</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.taxable)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.cgst)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.sgst)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.cgst + r.sgst)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GSTR-1 */}
        <TabsContent value="gstr1">
          <div className="space-y-4">
            {/* Summary banner */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>GSTR-1 Filing Report</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    B2B, B2C and HSN summary ready for your GST return filing
                  </p>
                </div>
                <ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("gstr1", f)} />
              </CardHeader>
              <CardContent>
                {gstr1.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : gstr1.data ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {[
                      { label: "Total Taxable", value: formatCurrency(gstr1.data.totals.totalTaxable) },
                      { label: "Total CGST", value: formatCurrency(gstr1.data.totals.totalCgst) },
                      { label: "Total SGST", value: formatCurrency(gstr1.data.totals.totalSgst) },
                      { label: "B2B Invoices", value: String(gstr1.data.totals.b2bCount) },
                      { label: "B2C Invoices", value: String(gstr1.data.totals.b2cInvoiceCount) },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="font-bold text-slate-900">{s.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* B2B section */}
            <Card>
              <CardHeader><CardTitle className="text-base">B2B — Registered Customers (with GSTIN)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">GSTIN</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Invoice</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Invoice Value</th>
                        <th className="px-3 py-2 text-right">Taxable</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {!gstr1.data || gstr1.data.b2b.length === 0 ? (
                        <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No B2B (registered customer) invoices in this period.</td></tr>
                      ) : (
                        gstr1.data.b2b.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-xs">{r.gstin}</td>
                            <td className="px-3 py-2">{r.customerName}</td>
                            <td className="px-3 py-2 font-medium">{r.invoiceNumber}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.invoiceDate}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.invoiceValue)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.taxableValue)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.cgst)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.sgst)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* B2C section */}
            <Card>
              <CardHeader><CardTitle className="text-base">B2C — Walk-in / Unregistered (summary by rate)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">GST Rate</th>
                        <th className="px-3 py-2 text-right">Taxable</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                        <th className="px-3 py-2 text-right">Total GST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {!gstr1.data || gstr1.data.b2cSummary.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No B2C sales in this period.</td></tr>
                      ) : (
                        gstr1.data.b2cSummary.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{r.rate}%</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.taxable)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.cgst)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.sgst)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.cgst + r.sgst)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* HSN summary */}
            <Card>
              <CardHeader><CardTitle className="text-base">HSN Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">HSN</th>
                        <th className="px-3 py-2 text-right">GST %</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Taxable</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {!gstr1.data || gstr1.data.hsnSummary.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No data for this period.</td></tr>
                      ) : (
                        gstr1.data.hsnSummary.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{r.hsn}</td>
                            <td className="px-3 py-2 text-right">{r.rate}%</td>
                            <td className="px-3 py-2 text-right">{r.qty}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.taxable)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.cgst)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(r.sgst)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventory Valuation Report</CardTitle>
              <ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("inventory", f)} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-3 w-fit">
                <p className="text-xs text-muted-foreground">Total Stock Value</p>
                <p className="text-lg font-semibold">
                  {inventory.isLoading ? "..." : formatCurrency(inventory.data?.totalStockValue || 0)}
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">Purchase Price</th>
                      <th className="px-3 py-2 text-right">Selling Price</th>
                      <th className="px-3 py-2 text-right">Stock Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventory.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : !inventory.data || inventory.data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      inventory.data.rows.map((r: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{r.product}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{r.productCode}</td>
                          <td className="px-3 py-2 text-right">{r.stock}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.purchasePrice)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.sellingPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.stockValue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Customer Report</CardTitle>
              <ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("customers", f)} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Export a complete customer report including total orders and lifetime spend per customer.
                Use the buttons above to download as PDF, Excel, or CSV.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit */}
        <TabsContent value="credit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Credit Report</CardTitle>
              <ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("credit", f)} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Export all credit records including pending, settled, and overdue balances. For a live view,
                visit the Credit Management page.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
