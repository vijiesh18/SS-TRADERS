"use client";

import { useState } from "react";
import { TrendingUp, IndianRupee, Receipt, Boxes, Users, Wallet, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const S = {
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
  cardHeaderText: { fontSize: 14, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  cardHeaderSub: { fontSize: 11, color: "rgba(180,155,110,0.75)", marginTop: 2 } as React.CSSProperties,
  th: { padding: "10px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "rgba(220,205,180,0.85)", whiteSpace: "nowrap" as const, background: "#2c2820" } as React.CSSProperties,
  td: { padding: "10px 12px", fontSize: 13, color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)" } as React.CSSProperties,
  money: { color: "#c47a3a", fontFamily: "Georgia, serif", fontWeight: 700 } as React.CSSProperties,
  stat: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 12, padding: "14px 16px" } as React.CSSProperties,
  statLabel: { fontSize: 11, color: "#a8937a", fontWeight: 600, marginBottom: 4 } as React.CSSProperties,
  statValue: { fontSize: 18, fontWeight: 700, fontFamily: "Georgia, serif", color: "#c47a3a" } as React.CSSProperties,
};

function ThTable({ headers, children, sticky }: { headers: React.ReactNode[]; children: React.ReactNode; sticky?: boolean }) {
  return (
    <div className={`overflow-x-auto rounded-xl border`} style={{ borderColor: "rgba(180,155,110,0.22)" }}>
      <div className={sticky ? "max-h-96 overflow-y-auto" : ""}>
        <table className="w-full text-sm">
          <thead className={sticky ? "sticky top-0" : ""}>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children, align, isMoney, className }: { children: React.ReactNode; align?: "right"; isMoney?: boolean; className?: string }) {
  return (
    <td style={{ ...S.td, textAlign: align, ...(isMoney ? S.money : {}) }} className={className}>
      {children}
    </td>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return <tr><td colSpan={cols} style={{ ...S.td, textAlign: "center", padding: "24px 12px", color: "#a8937a" }}>{text}</td></tr>;
}

function LoadingRow({ cols }: { cols: number }) {
  return <EmptyRow cols={cols} text="Loading..." />;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={S.stat}>
      <p style={S.statLabel}>{label}</p>
      <p style={{ ...S.statValue, ...(accent === false ? { color: "#6b7c45" } : {}) }}>{value}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, exportBtn, children }: { title: string; subtitle?: string; exportBtn?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div>
          <p style={S.cardHeaderText}>{title}</p>
          {subtitle && <p style={S.cardHeaderSub}>{subtitle}</p>}
        </div>
        {exportBtn}
      </div>
      <div style={{ padding: "16px" }}>
        {children}
      </div>
    </div>
  );
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
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418" }}>Reports</h1>
          <p style={{ fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 }}>
            Sales, profit, GST, inventory, customer and credit reports
          </p>
        </div>
        <DateRangeFilter from={from} to={to} onChange={handleDateChange} />
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales"><TrendingUp className="h-4 w-4 mr-1.5" />Sales</TabsTrigger>
          <TabsTrigger value="profit"><IndianRupee className="h-4 w-4 mr-1.5" />Profit</TabsTrigger>
          <TabsTrigger value="gst"><Receipt className="h-4 w-4 mr-1.5" />GST</TabsTrigger>
          <TabsTrigger value="gstr1"><FileText className="h-4 w-4 mr-1.5" />GSTR-1</TabsTrigger>
          <TabsTrigger value="inventory"><Boxes className="h-4 w-4 mr-1.5" />Inventory</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1.5" />Customers</TabsTrigger>
          <TabsTrigger value="credit"><Wallet className="h-4 w-4 mr-1.5" />Credit</TabsTrigger>
        </TabsList>

        {/* Sales */}
        <TabsContent value="sales">
          <SectionCard title="Sales Report" exportBtn={<ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("sales", f)} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Sales" value={sales.isLoading ? "..." : formatCurrency(sales.data?.totalSales || 0)} />
              <StatCard label="Invoices" value={sales.isLoading ? "..." : String(sales.data?.count || 0)} accent={false} />
              <StatCard label="Avg Invoice Value" value={sales.isLoading ? "..." : formatCurrency(sales.data && sales.data.count > 0 ? sales.data.totalSales / sales.data.count : 0)} />
            </div>
            <ThTable sticky headers={[
              <span style={{ textAlign: "left" }}>Invoice</span>,
              <span style={{ textAlign: "left" }}>Date</span>,
              <span style={{ textAlign: "left" }}>Customer</span>,
              <span style={{ textAlign: "left" }}>Payment</span>,
              <span style={{ textAlign: "right" }}>GST</span>,
              <span style={{ textAlign: "right" }}>Total</span>,
            ]}>
              {sales.isLoading ? <LoadingRow cols={6} /> : !sales.data || sales.data.rows.length === 0 ? (
                <EmptyRow cols={6} text="No invoices in this period." />
              ) : sales.data.rows.map((r, i) => (
                <tr key={i}>
                  <Td><span className="font-medium">{r.invoiceNumber}</span></Td>
                  <Td><span className="text-xs" style={{ color: "#a8937a" }}>{formatDate(r.date)}</span></Td>
                  <Td>{r.customer}</Td>
                  <Td><span className="text-xs">{r.paymentMethod}</span></Td>
                  <Td align="right" isMoney>{formatCurrency(r.gst)}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.grandTotal)}</Td>
                </tr>
              ))}
            </ThTable>
          </SectionCard>
        </TabsContent>

        {/* Profit */}
        <TabsContent value="profit">
          <SectionCard title="Profit Report" exportBtn={<ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("profit", f)} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Revenue" value={profit.isLoading ? "..." : formatCurrency(profit.data?.totalRevenue || 0)} />
              <StatCard label="Total Profit" value={profit.isLoading ? "..." : formatCurrency(profit.data?.totalProfit || 0)} />
              <StatCard label="Margin" value={profit.isLoading || !profit.data || profit.data.totalRevenue === 0 ? "..." : `${((profit.data.totalProfit / profit.data.totalRevenue) * 100).toFixed(1)}%`} accent={false} />
            </div>
            <ThTable sticky headers={[
              <span style={{ textAlign: "left" }}>Invoice</span>,
              <span style={{ textAlign: "left" }}>Date</span>,
              <span style={{ textAlign: "left" }}>Product</span>,
              <span style={{ textAlign: "right" }}>Qty</span>,
              <span style={{ textAlign: "right" }}>Revenue</span>,
              <span style={{ textAlign: "right" }}>Profit</span>,
            ]}>
              {profit.isLoading ? <LoadingRow cols={6} /> : !profit.data || profit.data.rows.length === 0 ? (
                <EmptyRow cols={6} text="No sales in this period." />
              ) : profit.data.rows.map((r, i) => (
                <tr key={i}>
                  <Td><span className="font-medium">{r.invoiceNumber}</span></Td>
                  <Td><span className="text-xs" style={{ color: "#a8937a" }}>{formatDate(r.date)}</span></Td>
                  <Td>{r.product}</Td>
                  <Td align="right">{r.quantity}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.revenue)}</Td>
                  <Td align="right"><span style={{ color: "#6b7c45", fontFamily: "Georgia, serif", fontWeight: 700 }}>{formatCurrency(r.profit)}</span></Td>
                </tr>
              ))}
            </ThTable>
          </SectionCard>
        </TabsContent>

        {/* GST */}
        <TabsContent value="gst">
          <SectionCard title="GST Report (CGST + SGST)" exportBtn={<ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("gst", f)} />}>
            <ThTable headers={[
              <span style={{ textAlign: "left" }}>HSN Code</span>,
              <span style={{ textAlign: "right" }}>GST %</span>,
              <span style={{ textAlign: "right" }}>Taxable Amount</span>,
              <span style={{ textAlign: "right" }}>CGST</span>,
              <span style={{ textAlign: "right" }}>SGST</span>,
              <span style={{ textAlign: "right" }}>Total GST</span>,
            ]}>
              {gst.isLoading ? <LoadingRow cols={6} /> : !gst.data || gst.data.rows.length === 0 ? (
                <EmptyRow cols={6} text="No GST data for this period." />
              ) : gst.data.rows.map((r, i) => (
                <tr key={i}>
                  <Td><span className="font-medium">{r.hsnCode}</span></Td>
                  <Td align="right">{r.gstPercentage}%</Td>
                  <Td align="right" isMoney>{formatCurrency(r.taxable)}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.cgst)}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.sgst)}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.cgst + r.sgst)}</Td>
                </tr>
              ))}
            </ThTable>
          </SectionCard>
        </TabsContent>

        {/* GSTR-1 */}
        <TabsContent value="gstr1">
          <div className="space-y-4">
            {/* Summary banner */}
            <SectionCard title="GSTR-1 Filing Report" subtitle="B2B, B2C and HSN summary ready for your GST return filing" exportBtn={<ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("gstr1", f)} />}>
              {gstr1.isLoading ? (
                <p style={{ fontSize: 13, color: "#a8937a" }}>Loading...</p>
              ) : gstr1.data ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                  {[
                    { label: "Total Taxable", value: formatCurrency(gstr1.data.totals.totalTaxable) },
                    { label: "Total CGST", value: formatCurrency(gstr1.data.totals.totalCgst) },
                    { label: "Total SGST", value: formatCurrency(gstr1.data.totals.totalSgst) },
                    { label: "B2B Invoices", value: String(gstr1.data.totals.b2bCount) },
                    { label: "B2C Invoices", value: String(gstr1.data.totals.b2cInvoiceCount) },
                  ].map((s) => (
                    <StatCard key={s.label} label={s.label} value={s.value} />
                  ))}
                </div>
              ) : null}
            </SectionCard>

            {/* B2B section */}
            <SectionCard title="B2B — Registered Customers (with GSTIN)">
              <ThTable headers={[
                <span style={{ textAlign: "left" }}>GSTIN</span>,
                <span style={{ textAlign: "left" }}>Customer</span>,
                <span style={{ textAlign: "left" }}>Invoice</span>,
                <span style={{ textAlign: "left" }}>Date</span>,
                <span style={{ textAlign: "right" }}>Invoice Value</span>,
                <span style={{ textAlign: "right" }}>Taxable</span>,
                <span style={{ textAlign: "right" }}>CGST</span>,
                <span style={{ textAlign: "right" }}>SGST</span>,
              ]}>
                {!gstr1.data || gstr1.data.b2b.length === 0 ? (
                  <EmptyRow cols={8} text="No B2B (registered customer) invoices in this period." />
                ) : gstr1.data.b2b.map((r, i) => (
                  <tr key={i}>
                    <Td><span className="font-mono text-xs">{r.gstin}</span></Td>
                    <Td>{r.customerName}</Td>
                    <Td><span className="font-medium">{r.invoiceNumber}</span></Td>
                    <Td><span style={{ color: "#a8937a" }}>{r.invoiceDate}</span></Td>
                    <Td align="right" isMoney>{formatCurrency(r.invoiceValue)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.taxableValue)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.cgst)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.sgst)}</Td>
                  </tr>
                ))}
              </ThTable>
            </SectionCard>

            {/* B2C section */}
            <SectionCard title="B2C — Walk-in / Unregistered (summary by rate)">
              <ThTable headers={[
                <span style={{ textAlign: "left" }}>GST Rate</span>,
                <span style={{ textAlign: "right" }}>Taxable</span>,
                <span style={{ textAlign: "right" }}>CGST</span>,
                <span style={{ textAlign: "right" }}>SGST</span>,
                <span style={{ textAlign: "right" }}>Total GST</span>,
              ]}>
                {!gstr1.data || gstr1.data.b2cSummary.length === 0 ? (
                  <EmptyRow cols={5} text="No B2C sales in this period." />
                ) : gstr1.data.b2cSummary.map((r, i) => (
                  <tr key={i}>
                    <Td><span className="font-medium">{r.rate}%</span></Td>
                    <Td align="right" isMoney>{formatCurrency(r.taxable)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.cgst)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.sgst)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.cgst + r.sgst)}</Td>
                  </tr>
                ))}
              </ThTable>
            </SectionCard>

            {/* HSN summary */}
            <SectionCard title="HSN Summary">
              <ThTable headers={[
                <span style={{ textAlign: "left" }}>HSN</span>,
                <span style={{ textAlign: "right" }}>GST %</span>,
                <span style={{ textAlign: "right" }}>Qty</span>,
                <span style={{ textAlign: "right" }}>Taxable</span>,
                <span style={{ textAlign: "right" }}>CGST</span>,
                <span style={{ textAlign: "right" }}>SGST</span>,
              ]}>
                {!gstr1.data || gstr1.data.hsnSummary.length === 0 ? (
                  <EmptyRow cols={6} text="No data for this period." />
                ) : gstr1.data.hsnSummary.map((r, i) => (
                  <tr key={i}>
                    <Td><span className="font-medium">{r.hsn}</span></Td>
                    <Td align="right">{r.rate}%</Td>
                    <Td align="right">{r.qty}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.taxable)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.cgst)}</Td>
                    <Td align="right" isMoney>{formatCurrency(r.sgst)}</Td>
                  </tr>
                ))}
              </ThTable>
            </SectionCard>
          </div>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <SectionCard title="Inventory Valuation Report" exportBtn={<ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("inventory", f)} />}>
            <div className="mb-4">
              <StatCard label="Total Stock Value" value={inventory.isLoading ? "..." : formatCurrency(inventory.data?.totalStockValue || 0)} />
            </div>
            <ThTable sticky headers={[
              <span style={{ textAlign: "left" }}>Product</span>,
              <span style={{ textAlign: "left" }}>Code</span>,
              <span style={{ textAlign: "right" }}>Stock</span>,
              <span style={{ textAlign: "right" }}>Purchase Price</span>,
              <span style={{ textAlign: "right" }}>Selling Price</span>,
              <span style={{ textAlign: "right" }}>Stock Value</span>,
            ]}>
              {inventory.isLoading ? <LoadingRow cols={6} /> : !inventory.data || inventory.data.rows.length === 0 ? (
                <EmptyRow cols={6} text="No products found." />
              ) : inventory.data.rows.map((r: any, i: number) => (
                <tr key={i}>
                  <Td><span className="font-medium">{r.product}</span></Td>
                  <Td><span className="text-xs" style={{ color: "#a8937a" }}>{r.productCode}</span></Td>
                  <Td align="right">{r.stock}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.purchasePrice)}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.sellingPrice)}</Td>
                  <Td align="right" isMoney>{formatCurrency(r.stockValue)}</Td>
                </tr>
              ))}
            </ThTable>
          </SectionCard>
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <SectionCard title="Customer Report" exportBtn={<ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("customers", f)} />}>
            <p style={{ fontSize: 13, color: "#a8937a" }}>
              Export a complete customer report including total orders and lifetime spend per customer.
              Use the buttons above to download as PDF, Excel, or CSV.
            </p>
          </SectionCard>
        </TabsContent>

        {/* Credit */}
        <TabsContent value="credit">
          <SectionCard title="Credit Report" exportBtn={<ExportButtons isPending={downloadReport.isPending} onDownload={(f) => download("credit", f)} />}>
            <p style={{ fontSize: 13, color: "#a8937a" }}>
              Export all credit records including pending, settled, and overdue balances. For a live view,
              visit the Credit Management page.
            </p>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
