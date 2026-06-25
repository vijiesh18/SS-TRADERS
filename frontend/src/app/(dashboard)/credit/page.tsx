"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useCreditRecords, useCreditSummary, useRecordCreditPayment,
  useConvertToCredit, type CreditRecord, type PendingInvoice,
} from "@/hooks/use-credit";
import { useInvoice, printInvoicePdfById, downloadInvoicePdfById } from "@/hooks/use-billing";
import { useCustomerSearch } from "@/hooks/use-billing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CreditCard, AlertCircle, Calendar, ChevronDown, ChevronUp,
  Printer, Download, X, Eye, Receipt, CheckCircle2,
  Search, ArrowRight, UserPlus, IndianRupee, Clock,
} from "lucide-react";

// ─── Invoice Quick View ────────────────────────────────────────
function InvoicePreviewModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        style={{ animation: "slideUp 0.2s ease" }}>
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2"><Receipt className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <p className="font-bold text-slate-900">{invoice?.invoiceNumber || "Loading..."}</p>
              <p className="text-xs text-muted-foreground">{invoice ? formatDate(invoice.createdAt) : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoice && <>
              <Button size="sm" variant="outline" onClick={() => printInvoicePdfById(invoiceId)}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadInvoicePdfById(invoiceId, invoice.invoiceNumber)}>
                <Download className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            </>}
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-200 transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 space-y-4">{[1,2,3].map(i => <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : invoice ? (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Bill To</p>
                <p className="font-semibold">{invoice.customer?.name || "Walk-in Customer"}</p>
                {invoice.customer?.phone && <p className="text-muted-foreground">{invoice.customer.phone}</p>}
              </div>
              <div className="rounded-xl bg-slate-50 p-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Invoice Details</p>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Invoice No</span><span className="font-medium">{invoice.invoiceNumber}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Date</span><span className="font-medium">{formatDate(invoice.createdAt)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Status</span>
                  <Badge variant={invoice.status === "PAID" ? "success" : invoice.status === "PARTIAL" ? "warning" : "destructive"} className="text-xs py-0">{invoice.status}</Badge>
                </div>
              </div>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items?.map((item: any, i: number) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                      <td className="px-4 py-2.5 text-right">{Number(item.quantity)}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(Number(item.rate))}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(Number(item.totalAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 rounded-xl border p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sub Total</span><span>{formatCurrency(Number(invoice.subTotal))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(Number(invoice.gstAmount))}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand Total</span><span className="text-indigo-600">{formatCurrency(Number(invoice.grandTotal))}</span></div>
              </div>
              <div className="w-48 rounded-xl bg-slate-900 p-4 space-y-2.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Payment</p>
                <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="text-white font-semibold">{formatCurrency(Number(invoice.grandTotal))}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Paid</span><span className="text-emerald-400 font-semibold">{formatCurrency(Number(invoice.paidAmount))}</span></div>
                {Number(invoice.pendingAmount) > 0 && (
                  <div className="flex justify-between border-t border-slate-700 pt-2"><span className="text-slate-300">Balance Due</span><span className="text-red-400 font-bold text-base">{formatCurrency(Number(invoice.pendingAmount))}</span></div>
                )}
              </div>
            </div>
          </div>
        ) : <div className="p-8 text-center text-muted-foreground">Not found.</div>}
      </div>
    </div>
  );
}

// ─── Collect Payment Dialog ─────────────────────────────────────
function CollectPaymentDialog({ record, onClose }: { record: CreditRecord; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const recordPayment = useRecordCreditPayment();

  const pending = Number(record.pendingAmount);
  const enteredAmount = Number(amount) || 0;
  const newBalance = Math.max(pending - enteredAmount, 0);
  const isFullPayment = enteredAmount >= pending;
  const isOverpay = enteredAmount > pending;

  async function handleSubmit() {
    setErr(null);
    if (!enteredAmount || enteredAmount <= 0) { setErr("Enter a valid amount"); return; }
    if (isOverpay) { setErr(`Cannot exceed balance due of ${formatCurrency(pending)}`); return; }
    try {
      await recordPayment.mutateAsync({ creditRecordId: record.id, amount: enteredAmount, paymentMethod: method, note });
      setSuccess(true);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Failed to record payment");
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto rounded-full bg-emerald-100 p-4 w-fit">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{isFullPayment ? "Bill Closed!" : "Payment Recorded"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isFullPayment
                  ? `Full payment of ${formatCurrency(enteredAmount)} received. Account settled.`
                  : `${formatCurrency(enteredAmount)} collected. Remaining balance: ${formatCurrency(newBalance)}`}
              </p>
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50 rounded-t-xl">
            <div>
              <p className="font-bold text-slate-900">Collect Payment</p>
              <p className="text-xs text-muted-foreground">{record.customer.name} · {record.invoice.invoiceNumber}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-200"><X className="h-4 w-4" /></button>
          </div>

          <div className="p-5 space-y-5">
            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Bill</p>
                <p className="font-bold text-sm">{formatCurrency(Number(record.totalAmount))}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Already Paid</p>
                <p className="font-bold text-sm text-emerald-600">{formatCurrency(Number(record.paidAmount))}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-center border border-red-100">
                <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
                <p className="font-bold text-base text-red-600">{formatCurrency(pending)}</p>
              </div>
            </div>

            {/* Payment History */}
            {record.payments.length > 0 && (
              <div className="rounded-xl border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment History</p>
                {record.payments.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-600 font-bold">{i + 1}</div>
                      <span className="text-muted-foreground">{formatDate(p.paidAt)} · {p.paymentMethod}</span>
                    </div>
                    <span className="font-semibold text-emerald-600">+{formatCurrency(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount Collecting Now (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-9 text-lg font-bold"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErr(null); }}
                    autoFocus
                  />
                </div>
                {/* Quick amount buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[pending, pending / 2, 5000, 10000].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v <= pending).slice(0, 4).map((v) => (
                    <button key={v} onClick={() => setAmount(v.toFixed(2))}
                      className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors">
                      {v === pending ? "Full Amount" : formatCurrency(v)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live balance calculator */}
              {enteredAmount > 0 && !isOverpay && (
                <div className={`rounded-xl p-4 ${isFullPayment ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-100"}`}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Current balance</span><span className="text-red-600 font-semibold">{formatCurrency(pending)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Collecting now</span><span className="text-emerald-600 font-semibold">- {formatCurrency(enteredAmount)}</span></div>
                    <div className={`flex justify-between font-bold border-t pt-2 ${isFullPayment ? "text-emerald-700" : "text-slate-900"}`}>
                      <span>{isFullPayment ? "🎉 Bill Fully Settled!" : "Remaining balance"}</span>
                      <span>{isFullPayment ? "₹0.00" : formatCurrency(newBalance)}</span>
                    </div>
                  </div>
                </div>
              )}

              {isOverpay && <p className="text-sm text-red-500">⚠ Amount exceeds balance due of {formatCurrency(pending)}</p>}

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="flex gap-2">
                  {(["CASH", "UPI", "CARD"] as const).map((m) => (
                    <button key={m} onClick={() => setMethod(m)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        method === m ? "bg-slate-900 text-white" : "border hover:bg-slate-50 text-slate-700"
                      }`}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Note (optional)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cash collected at shop" />
              </div>
            </div>

            {err && <p className="text-sm text-red-500">{err}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className={`flex-1 font-bold ${isFullPayment ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                onClick={handleSubmit} disabled={recordPayment.isPending || !enteredAmount || isOverpay}>
                {recordPayment.isPending ? "Recording..." : isFullPayment ? "Close Bill ✓" : "Collect Payment"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Link to Customer Dialog (for walk-in credits) ─────────────
function LinkCustomerDialog({ invoice, onClose }: { invoice: PendingInvoice; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const { data: results } = useCustomerSearch(query);
  const convert = useConvertToCredit();
  const [err, setErr] = useState<string | null>(null);

  async function handleLink() {
    if (!selectedId) { setErr("Select a customer"); return; }
    try {
      await convert.mutateAsync({ invoiceId: invoice.id, customerId: selectedId });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Failed to link customer");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">Link to Customer</p>
            <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <p className="text-xs text-muted-foreground">Invoice {invoice.invoiceNumber} · Balance: <span className="font-semibold text-red-600">{formatCurrency(Number(invoice.pendingAmount))}</span></p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Name or phone..." value={selectedName || query} onChange={(e) => { setQuery(e.target.value); setSelectedId(null); setSelectedName(""); }} />
            </div>
            {query && !selectedId && results?.results && results.results.length > 0 && (
              <div className="rounded-xl border bg-white divide-y max-h-40 overflow-y-auto shadow-sm">
                {results.results.map((c) => (
                  <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm" onClick={() => { setSelectedId(c.id); setSelectedName(c.name); setQuery(""); }}>
                    <span className="font-medium">{c.name}</span> <span className="text-muted-foreground">· {c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedId && <p className="text-xs text-emerald-600 font-medium">✓ Selected: {selectedName}</p>}
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleLink} disabled={!selectedId || convert.isPending}>
              {convert.isPending ? "Linking..." : "Link & Track"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Credit Record Row ──────────────────────────────────────────
function CreditRow({ record }: { record: CreditRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  return (
    <>
      <tr className={`hover:bg-slate-50 cursor-pointer transition-colors ${expanded ? "bg-slate-50" : ""}`} onClick={() => setExpanded(e => !e)}>
        <td className="px-4 py-3">
          <p className="font-medium">{record.customer.name}</p>
          <p className="text-xs text-muted-foreground">{record.customer.phone}</p>
        </td>
        <td className="px-4 py-3 text-sm text-indigo-600 font-medium">{record.invoice.invoiceNumber}</td>
        <td className="px-4 py-3 text-right text-sm">{formatCurrency(Number(record.totalAmount))}</td>
        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{formatCurrency(Number(record.paidAmount))}</td>
        <td className="px-4 py-3 text-right text-red-600 font-bold text-base">{formatCurrency(Number(record.pendingAmount))}</td>
        <td className="px-4 py-3">
          {record.payments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />{record.payments.length} payment{record.payments.length > 1 ? "s" : ""}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View Bill" onClick={() => setPreviewId(record.id)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => setPayOpen(true)}>
              Collect
            </Button>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-5 py-4 border-b">
            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Payment progress</span>
                <span className="font-semibold">{Math.round((Number(record.paidAmount) / Number(record.totalAmount)) * 100)}% paid</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min((Number(record.paidAmount) / Number(record.totalAmount)) * 100, 100)}%` }} />
              </div>
            </div>
            {/* Payment timeline */}
            {record.payments.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Payment History</p>
                {record.payments.map((p, i) => {
                  const runningPaid = record.payments.slice(0, i + 1).reduce((s, x) => s + Number(x.amount), Number(record.paidAmount) - record.payments.reduce((s, x) => s + Number(x.amount), 0));
                  return (
                    <div key={p.id} className="flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-700 font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1">
                        <span className="text-muted-foreground">{formatDate(p.paidAt)}</span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="font-medium">{p.paymentMethod}</span>
                        {p.note && <span className="ml-2 text-xs text-muted-foreground">"{p.note}"</span>}
                      </div>
                      <span className="font-bold text-emerald-600">+{formatCurrency(Number(p.amount))}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-3 text-sm border-t pt-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold flex-shrink-0">∑</div>
                  <div className="flex-1 font-medium">Total collected</div>
                  <span className="font-bold text-slate-900">{formatCurrency(Number(record.paidAmount))}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No installment payments yet — only the initial payment of {formatCurrency(Number(record.paidAmount))} was made at the time of sale.</p>
            )}
          </td>
        </tr>
      )}
      {payOpen && <CollectPaymentDialog record={record} onClose={() => setPayOpen(false)} />}
      {previewId && <InvoicePreviewModal invoiceId={previewId} onClose={() => setPreviewId(null)} />}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function CreditPage() {
  const [filter, setFilter] = useState<"all" | "overdue" | "due-today">("all");
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [linkInvoice, setLinkInvoice] = useState<PendingInvoice | null>(null);
  const { data, isLoading } = useCreditRecords(filter);
  const { data: summary } = useCreditSummary();

  const records = (data?.items || []).filter((r) =>
    !search || r.customer.name.toLowerCase().includes(search.toLowerCase()) || r.customer.phone.includes(search)
  );
  const pendingInvoices = data?.pendingInvoices || [];
  const totalPendingBalance = pendingInvoices.reduce((s, i) => s + Number(i.pendingAmount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Credit Management</h1>
        <p className="text-sm text-muted-foreground">Track outstanding balances and collect payments</p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {[
          { label: "Total Pending", value: formatCurrency(Number(summary?.totalPending || 0) + totalPendingBalance), icon: CreditCard, ic: "#6b7c45", ibg: "rgba(107,124,69,0.12)" },
          { label: "Pending Bills", value: String((summary?.pendingCount || 0) + pendingInvoices.length), icon: AlertCircle, ic: "#c47a3a", ibg: "rgba(196,122,58,0.12)" },
          { label: "Due Today", value: String(summary?.dueTodayCount || 0), icon: Calendar, ic: "#8a4a10", ibg: "rgba(196,122,58,0.12)" },
          { label: "Overdue", value: String(summary?.overdueCount || 0), icon: AlertCircle, ic: "#c0552a", ibg: "rgba(192,85,42,0.12)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 4px 20px rgba(100,80,40,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: s.ibg, color: s.ic, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#a8937a", fontWeight: 600 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", color: "#6b7c45", marginTop: 2 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by customer name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(["all", "due-today", "overdue"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "All Pending" : f === "due-today" ? "Due Today" : "Overdue"}
            </Button>
          ))}
        </div>
      </div>

      {/* Named Customer Credit Records */}
      <Card>
        <div style={{ background: "#2c2820", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" }}>Credit Records — Named Customers</p>
          <p style={{ fontSize: 11, color: "rgba(180,155,110,0.75)" }}>Click any row to see payment history ↓</p>
        </div>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase" style={{ background: "#2c2820", color: "rgba(220,205,180,0.85)" }}>
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3 text-right">Total Bill</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3">Payments</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">
                  {search ? `No customers matching "${search}"` : "No pending credit records. Select a customer when doing a credit sale to track it here."}
                </td></tr>
              ) : (
                records.map((r) => <CreditRow key={r.id} record={r} />)
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Walk-in Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <Card>
          <div style={{ background: "#2c2820", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" }}>Partial / Unpaid Bills — Walk-in</p>
              <p style={{ fontSize: 11, color: "rgba(196,122,58,0.85)" }}>Link to a customer to enable installment payment tracking.</p>
            </div>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase" style={{ background: "#2c2820", color: "rgba(220,205,180,0.85)" }}>
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-amber-50/50 cursor-pointer" onClick={() => setPreviewId(inv.id)}>
                    <td className="px-4 py-3 font-medium text-indigo-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(inv.grandTotal))}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatCurrency(Number(inv.paidAmount))}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">{formatCurrency(Number(inv.pendingAmount))}</td>
                    <td className="px-4 py-3"><Badge variant={inv.status === "UNPAID" ? "destructive" : "warning"}>{inv.status}</Badge></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => setLinkInvoice(inv)}>
                        <UserPlus className="h-3 w-3" /> Link Customer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {previewId && <InvoicePreviewModal invoiceId={previewId} onClose={() => setPreviewId(null)} />}
      {linkInvoice && <LinkCustomerDialog invoice={linkInvoice} onClose={() => setLinkInvoice(null)} />}
    </div>
  );
}
