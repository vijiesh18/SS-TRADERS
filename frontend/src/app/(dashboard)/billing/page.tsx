"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  PlayCircle,
  FileDown,
  Printer,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeScanner } from "@/components/billing/barcode-scanner";
import {
  useProductSearch,
  useProductRecommendations,
  useCalculateBill,
  useCreateInvoice,
  useBarcodeLookup,
  useHeldBills,
  useHoldBill,
  useDeleteHeldBill,
  useCustomerSearch,
  type ProductSearchResult,
} from "@/hooks/use-billing";
import { useBillingStore, type CartItem } from "@/store/billing-store";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api-client";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "CREDIT"] as const;

function todayDisplay() {
  return new Date().toLocaleDateString("en-GB").split("/").join("/"); // DD/MM/YYYY
}

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoiceNumber: string; whatsappLink: string | null } | null>(
    null
  );
  const [recommendationProductId, setRecommendationProductId] = useState<string | null>(null);

  const { items, customerId, customerName, addItem, updateQuantity, updateDiscount, updateRate, updateGst, updateShadeCode, removeItem, setCustomer, clearCart, loadCart } =
    useBillingStore();

  const { data: searchResults } = useProductSearch(searchQuery);
  const { data: customerResults } = useCustomerSearch(customerQuery);
  const { data: recommendations } = useProductRecommendations(recommendationProductId);
  const calculateBill = useCalculateBill();
  const createInvoice = useCreateInvoice();
  const barcodeLookup = useBarcodeLookup();
  const { data: heldBills } = useHeldBills();
  const holdBill = useHoldBill();
  const deleteHeldBill = useDeleteHeldBill();

  function handleAddProduct(product: ProductSearchResult) {
    const cartItem: CartItem = {
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      hsnCode: product.hsnCode,
      shadeCode: product.shadeCode,
      unit: product.unit,
      quantity: 1,
      rate: Number(product.sellingPrice),
      discountPercent: 0,
      gstPercentage: Number(product.gstPercentage),
      stockQuantity: Number(product.stockQuantity),
    };
    addItem(cartItem);
    setSearchQuery("");
    setRecommendationProductId(product.id);
  }

  function handleScan(code: string) {
    setShowScanner(false);
    barcodeLookup.mutate(code, {
      onSuccess: (product) => handleAddProduct(product),
      onError: () => alert(`No product found for barcode: ${code}`),
    });
  }

  async function recalculate() {
    if (items.length === 0) return null;
    return calculateBill.mutateAsync({
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        rate: i.rate,
        discountPercent: i.discountPercent,
        gstPercentage: i.gstPercentage,
      })),
    });
  }

  const [totals, setTotals] = useState<{
    subTotal: number;
    gstAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    grandTotal: number;
    totalDiscount: number;
  } | null>(null);

  // recompute totals whenever items change
  useEffect(() => {
    if (items.length === 0) {
      setTotals(null);
      return;
    }
    let cancelled = false;
    recalculate().then((t) => {
      if (!cancelled && t) setTotals(t);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  async function handleGenerateInvoice() {
    if (items.length === 0) return alert("Add at least one item to the bill");

    const grandTotal = totals?.grandTotal || 0;
    const paid = paymentMethod === "CREDIT" ? Number(paidAmount || 0) : grandTotal;

    try {
      const result = await createInvoice.mutateAsync({
        customerId,
        walkInPhone: !customerId && mobileNo ? mobileNo : undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          rate: i.rate,
          discountPercent: i.discountPercent,
          gstPercentage: i.gstPercentage,
        })),
        paymentMethod,
        paidAmount: paid,
        roundOff: 0,
      });

      setLastInvoice({
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        whatsappLink: result.whatsappLink,
      });
      clearCart();
      setTotals(null);
      setPaidAmount("");
      setMobileNo("");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to generate invoice");
    }
  }

  function handleNewBill() {
    clearCart();
    setTotals(null);
    setPaidAmount("");
    setMobileNo("");
    setLastInvoice(null);
    setPaymentMethod("CASH");
  }

  function handleHoldBill() {
    if (items.length === 0) return;
    holdBill.mutate(
      { label: customerName || undefined, customerId, items },
      {
        onSuccess: () => {
          clearCart();
          setTotals(null);
        },
      }
    );
  }

  function handleResumeBill(bill: { id: string; itemsJson: CartItem[]; customer?: { name: string } | null }) {
    loadCart(bill.itemsJson);
    deleteHeldBill.mutate(bill.id);
  }

  async function downloadInvoicePdf(invoiceId: string) {
    const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${lastInvoice?.invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Opens the invoice PDF in a new tab for printing. The browser's native
   * PDF viewer print dialog only prints the invoice itself (not the app UI).
   */
  async function printInvoicePdf(invoiceId: string) {
    const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
      });
    }
  }

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const balanceAmount =
    paymentMethod === "CREDIT"
      ? Math.max((totals?.grandTotal || 0) - Number(paidAmount || 0), 0)
      : 0;

  return (
    <div className="space-y-4">
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* ===== Invoice header bar ===== */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Invoice No</label>
              <Input
                readOnly
                value={lastInvoice ? lastInvoice.invoiceNumber : "Draft (assigned on save)"}
                className="bg-slate-50 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input readOnly value={todayDisplay()} className="bg-slate-50 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Customer</label>
              <Input
                placeholder="Customer Name"
                value={customerName || customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setCustomer(null, null);
                }}
              />
              {customerQuery && customerResults?.results && customerResults.results.length > 0 && !customerId && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-sm">
                  {customerResults.results.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomer(c.id, c.name);
                        setCustomerQuery("");
                        setMobileNo(c.phone);
                      }}
                      className="block w-full p-2 text-left text-sm hover:bg-slate-50"
                    >
                      {c.name} · {c.phone}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mobile No</label>
              <Input
                placeholder="Enter Mobile No"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ===== LEFT: Items table ===== */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search Product by Name / Barcode"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setShowScanner(true)}>
                <ScanLine className="h-4 w-4 mr-1" />
                Scan Barcode
              </Button>
            </div>

            {/* Autocomplete dropdown */}
            {searchQuery && (
              <div className="rounded-md border bg-white max-h-64 overflow-y-auto divide-y">
                {(searchResults?.results || []).length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No products found</p>
                ) : (
                  searchResults?.results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.productCode} {p.shadeCode ? `· Shade: ${p.shadeCode}` : ""} · Stock: {p.stockQuantity}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(Number(p.sellingPrice))}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Items table */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2">Product Name</th>
                    <th className="px-3 py-2">Colour Code</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 w-24">Qty</th>
                    <th className="px-3 py-2 w-28">Rate (₹)</th>
                    <th className="px-3 py-2 w-20">Disc %</th>
                    <th className="px-3 py-2 w-20">GST %</th>
                    <th className="px-3 py-2 text-right w-28">Amount (₹)</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-12 text-center text-sm text-muted-foreground">
                        No items added. Search or scan a product to begin.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2">
                          <Input
                            className="h-8 w-20 text-xs"
                            value={item.shadeCode || ""}
                            placeholder="-"
                            onChange={(e) => updateShadeCode(item.productId, e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{item.unit}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="rounded border p-0.5 text-muted-foreground hover:bg-slate-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="rounded border p-0.5 text-muted-foreground hover:bg-slate-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            className="h-8 w-24 text-xs"
                            value={item.rate}
                            min={0}
                            step="any"
                            onChange={(e) => updateRate(item.productId, Number(e.target.value))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            className="h-8 w-16 text-xs"
                            value={item.discountPercent}
                            min={0}
                            max={100}
                            onChange={(e) => updateDiscount(item.productId, Number(e.target.value))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            className="h-8 w-16 text-xs"
                            value={item.gstPercentage}
                            min={0}
                            max={100}
                            step="any"
                            onChange={(e) => updateGst(item.productId, Number(e.target.value))}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(
                            item.quantity * item.rate * (1 - item.discountPercent / 100) * (1 + item.gstPercentage / 100)
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {items.length > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total Items: {items.length}</span>
                <span>Total Qty: {totalQty.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Frequently Bought Together */}
          {recommendations && recommendations.results.length > 0 && (
            <div className="rounded-lg border bg-white p-4 space-y-2">
              <p className="text-sm font-semibold">Frequently Bought Together</p>
              <div className="flex flex-wrap gap-2">
                {recommendations.results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAddProduct(p)}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 text-left"
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(p.sellingPrice))}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Held Bills */}
          {heldBills && heldBills.length > 0 && (
            <div className="rounded-lg border bg-white p-4 space-y-2">
              <p className="text-sm font-semibold">Held Bills</p>
              <div className="space-y-2">
                {heldBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">{bill.label || "Untitled bill"}</p>
                      <p className="text-xs text-muted-foreground">{bill.itemsJson.length} items</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleResumeBill(bill)}>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Invoice Summary + Payment ===== */}
        <div className="space-y-4">
          {/* Invoice Summary */}
          <div className="overflow-hidden rounded-lg border bg-white">
            <div className="bg-slate-900 px-4 py-2.5">
              <p className="text-sm font-semibold text-white">Invoice Summary</p>
            </div>
            <div className="space-y-2 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sub Total</span>
                <span>{formatCurrency(totals?.subTotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span>{formatCurrency(totals?.totalDiscount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span>{formatCurrency(totals?.subTotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatCurrency(totals?.cgstAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatCurrency(totals?.sgstAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Round Off</span>
                <span>-0.00</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Grand Total</span>
                <span className="text-blue-600">{formatCurrency(totals?.grandTotal || 0)}</span>
              </div>
              {totals && totals.grandTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Amount in words available on the printed invoice.
                </p>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="overflow-hidden rounded-lg border bg-white">
            <div className="bg-slate-900 px-4 py-2.5">
              <p className="text-sm font-semibold text-white">Payment Details</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={paymentMethod === m ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setPaymentMethod(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>

              {paymentMethod === "CREDIT" && !customerId && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                  ⚠ Add a customer name above to track this credit sale properly.
                </p>
              )}

              {paymentMethod === "CREDIT" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Received Amount</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Amount</span>
                    <span className="font-semibold">{formatCurrency(balanceAmount)}</span>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" onClick={handleHoldBill} disabled={items.length === 0}>
                  <PauseCircle className="h-4 w-4 mr-1" />
                  Hold Bill
                </Button>
                <Button onClick={handleGenerateInvoice} disabled={items.length === 0 || createInvoice.isPending}>
                  <FileDown className="h-4 w-4 mr-1" />
                  {createInvoice.isPending ? "Generating..." : "Generate Invoice"}
                </Button>
              </div>

              {/* Post-invoice actions */}
              {lastInvoice && (
                <div className="mt-2 space-y-2 rounded-md border bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-700">
                    Invoice {lastInvoice.invoiceNumber} created successfully
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => printInvoicePdf(lastInvoice.id)}>
                      <Printer className="h-3 w-3 mr-1" />
                      Print
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(lastInvoice.id)}>
                      <FileDown className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                    {lastInvoice.whatsappLink ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={lastInvoice.whatsappLink} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          WhatsApp
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled title="Add customer mobile number to enable WhatsApp">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="w-full" onClick={handleNewBill}>
                    Start New Bill
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
