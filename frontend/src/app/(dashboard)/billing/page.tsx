"use client";

import { useState, useEffect } from "react";
import {
  Search, ScanLine, Plus, Minus, Trash2,
  PauseCircle, PlayCircle, FileDown, Printer,
  MessageCircle, User, Phone, Receipt, Tag,
  CheckCircle2, Package,
} from "lucide-react";
import { BarcodeScanner } from "@/components/billing/barcode-scanner";
import {
  useProductSearch, useProductRecommendations, useCalculateBill,
  useCreateInvoice, useBarcodeLookup, useHeldBills, useHoldBill,
  useDeleteHeldBill, useCustomerSearch, type ProductSearchResult,
} from "@/hooks/use-billing";
import { useBillingStore, type CartItem } from "@/store/billing-store";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api-client";

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "CREDIT"] as const;

const PM_ICONS: Record<string, string> = {
  CASH: "💵", UPI: "📲", CARD: "💳", CREDIT: "📋",
};

function todayDisplay() {
  return new Date().toLocaleDateString("en-GB");
}

/* ── Inline styles (no Tailwind conflicts, pure SS Traders theme) ── */
const S = {
  card: {
    background: "rgba(250,247,242,0.95)",
    border: "1px solid rgba(180,155,110,0.22)",
    borderRadius: 14,
    boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)",
  } as React.CSSProperties,
  cardHeader: (color = "#2c2820") => ({
    background: color,
    padding: "10px 16px",
    borderRadius: "13px 13px 0 0",
    display: "flex", alignItems: "center", gap: 8,
  }) as React.CSSProperties,
  label: {
    fontSize: 11, fontWeight: 600, color: "#a8937a",
    textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: 4,
    display: "block",
  },
  readonlyInput: {
    background: "rgba(180,155,110,0.08)",
    border: "1px solid rgba(180,155,110,0.20)",
    borderRadius: 8, padding: "8px 12px",
    fontSize: 13, fontWeight: 600, color: "#2c2418",
    width: "100%",
  } as React.CSSProperties,
  liveInput: {
    background: "rgba(255,252,248,0.9)",
    border: "1px solid rgba(180,155,110,0.30)",
    borderRadius: 8, padding: "8px 12px",
    fontSize: 13, color: "#2c2418",
    width: "100%", outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  } as React.CSSProperties,
  tinyInput: {
    background: "rgba(255,252,248,0.9)",
    border: "1px solid rgba(180,155,110,0.25)",
    borderRadius: 6, padding: "4px 8px",
    fontSize: 12, color: "#2c2418", outline: "none",
    width: "100%",
  } as React.CSSProperties,
  th: {
    padding: "10px 12px",
    fontSize: 10, fontWeight: 700,
    textTransform: "uppercase" as const, letterSpacing: "0.8px",
    color: "#a8937a", whiteSpace: "nowrap" as const,
    background: "rgba(180,155,110,0.08)",
    borderBottom: "1px solid rgba(180,155,110,0.18)",
  },
  td: {
    padding: "10px 12px", fontSize: 13,
    color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)",
  },
};

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [lastInvoice, setLastInvoice] = useState<{
    id: string; invoiceNumber: string; whatsappLink: string | null;
  } | null>(null);
  const [recommendationProductId, setRecommendationProductId] = useState<string | null>(null);

  const {
    items, customerId, customerName,
    addItem, updateQuantity, updateDiscount, updateRate, updateGst, updateShadeCode,
    removeItem, setCustomer, clearCart, loadCart,
  } = useBillingStore();

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
        productId: i.productId, quantity: i.quantity, rate: i.rate,
        discountPercent: i.discountPercent, gstPercentage: i.gstPercentage,
      })),
    });
  }

  const [totals, setTotals] = useState<{
    subTotal: number; gstAmount: number; cgstAmount: number;
    sgstAmount: number; grandTotal: number; totalDiscount: number;
  } | null>(null);

  useEffect(() => {
    if (items.length === 0) { setTotals(null); return; }
    let cancelled = false;
    recalculate().then((t) => { if (!cancelled && t) setTotals(t); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  async function handleGenerateInvoice() {
    if (items.length === 0) return alert("Add at least one item to the bill");
    const grandTotal = totals?.grandTotal || 0;
    const paid = paymentMethod === "CREDIT" ? Number(paidAmount || 0) : grandTotal;
    try {
      const result = await createInvoice.mutateAsync({
        customerId, walkInPhone: !customerId && mobileNo ? mobileNo : undefined,
        items: items.map((i) => ({
          productId: i.productId, quantity: i.quantity, rate: i.rate,
          discountPercent: i.discountPercent, gstPercentage: i.gstPercentage,
        })),
        paymentMethod, paidAmount: paid, roundOff: 0,
      });
      setLastInvoice({ id: result.invoice.id, invoiceNumber: result.invoice.invoiceNumber, whatsappLink: result.whatsappLink });
      clearCart(); setTotals(null); setPaidAmount(""); setMobileNo("");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to generate invoice");
    }
  }

  function handleNewBill() {
    clearCart(); setTotals(null); setPaidAmount(""); setMobileNo("");
    setLastInvoice(null); setPaymentMethod("CASH");
  }

  function handleHoldBill() {
    if (items.length === 0) return;
    holdBill.mutate({ label: customerName || undefined, customerId, items }, {
      onSuccess: () => { clearCart(); setTotals(null); },
    });
  }

  function handleResumeBill(bill: { id: string; itemsJson: CartItem[]; customer?: { name: string } | null }) {
    loadCart(bill.itemsJson);
    deleteHeldBill.mutate(bill.id);
  }

  async function downloadInvoicePdf(invoiceId: string) {
    const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", `${lastInvoice?.invoiceNumber}.pdf`);
    document.body.appendChild(link); link.click(); link.remove();
  }

  async function printInvoicePdf(invoiceId: string) {
    const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const w = window.open(url, "_blank");
    if (w) w.addEventListener("load", () => { w.focus(); w.print(); });
  }

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const balanceAmount = paymentMethod === "CREDIT"
    ? Math.max((totals?.grandTotal || 0) - Number(paidAmount || 0), 0) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* ── Invoice Header Bar ── */}
      <div style={S.card}>
        <div style={{ padding: "14px 18px" }}>
          <div className="billing-header-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left: Invoice No + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={S.label}>📄 Invoice No</span>
                <div style={S.readonlyInput}>
                  {lastInvoice ? lastInvoice.invoiceNumber : "Draft (on save)"}
                </div>
              </div>
              <div>
                <span style={S.label}>📅 Date</span>
                <div style={S.readonlyInput}>{todayDisplay()}</div>
              </div>
            </div>
            {/* Right: Customer + Mobile */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <span style={S.label}><User size={10} style={{ display: "inline", marginRight: 4 }} />Customer</span>
                <input
                  style={S.liveInput}
                  placeholder="Search customer…"
                  value={customerName || customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setCustomer(null, null); }}
                  onFocus={(e) => { e.target.style.borderColor = "#6b7c45"; e.target.style.boxShadow = "0 0 0 3px rgba(107,124,69,0.10)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(180,155,110,0.30)"; e.target.style.boxShadow = "none"; }}
                />
                {customerQuery && (customerResults?.results?.length ?? 0) > 0 && !customerId && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                    background: "rgba(250,247,242,0.98)", border: "1px solid rgba(180,155,110,0.30)",
                    borderRadius: 10, boxShadow: "0 8px 24px rgba(100,80,40,0.14)",
                    marginTop: 4, overflow: "hidden",
                  }}>
                    {customerResults?.results.map((c: any) => (
                      <button key={c.id} onClick={() => { setCustomer(c.id, c.name); setCustomerQuery(""); setMobileNo(c.phone); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid rgba(180,155,110,0.12)", cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(107,124,69,0.07)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(107,124,69,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <User size={13} color="#6b7c45" />
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2418" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#a8937a" }}>{c.phone}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <span style={S.label}><Phone size={10} style={{ display: "inline", marginRight: 4 }} />Mobile No</span>
                <input
                  style={S.liveInput}
                  placeholder="Enter mobile…"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  onFocus={(e) => { e.target.style.borderColor = "#6b7c45"; e.target.style.boxShadow = "0 0 0 3px rgba(107,124,69,0.10)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(180,155,110,0.30)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="billing-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

        {/* ── LEFT: Search + Cart ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Search bar */}
          <div style={S.card}>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8937a", pointerEvents: "none" }} />
                  <input
                    style={{ ...S.liveInput, paddingLeft: 36 }}
                    placeholder="Search product by name, code or barcode…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={(e) => { e.target.style.borderColor = "#6b7c45"; e.target.style.boxShadow = "0 0 0 3px rgba(107,124,69,0.10)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(180,155,110,0.30)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 8,
                    border: "1px solid rgba(180,155,110,0.35)",
                    background: "rgba(180,155,110,0.08)",
                    color: "#6b5d4a", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(107,124,69,0.10)"; e.currentTarget.style.borderColor = "#6b7c45"; e.currentTarget.style.color = "#4a5e28"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(180,155,110,0.08)"; e.currentTarget.style.borderColor = "rgba(180,155,110,0.35)"; e.currentTarget.style.color = "#6b5d4a"; }}
                >
                  <ScanLine size={15} /> Scan Barcode
                </button>
              </div>

              {/* Search dropdown */}
              {searchQuery && (
                <div style={{
                  marginTop: 8,
                  background: "rgba(250,247,242,0.98)", border: "1px solid rgba(180,155,110,0.25)",
                  borderRadius: 10, boxShadow: "0 8px 28px rgba(100,80,40,0.12)",
                  maxHeight: 280, overflowY: "auto",
                }}>
                  {(searchResults?.results || []).length === 0 ? (
                    <div style={{ padding: "16px 14px", fontSize: 13, color: "#a8937a", textAlign: "center" }}>
                      No products found for "{searchQuery}"
                    </div>
                  ) : (
                    searchResults?.results.map((p: ProductSearchResult) => (
                      <button
                        key={p.id}
                        onClick={() => handleAddProduct(p)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "10px 14px", textAlign: "left",
                          background: "transparent", border: "none",
                          borderBottom: "1px solid rgba(180,155,110,0.10)", cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(107,124,69,0.07)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(107,124,69,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Package size={14} color="#6b7c45" />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2418" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#a8937a", marginTop: 2 }}>
                              {p.productCode}
                              {p.shadeCode ? <span style={{ marginLeft: 6, padding: "1px 6px", background: "rgba(196,122,58,0.10)", borderRadius: 4, color: "#c47a3a" }}>#{p.shadeCode}</span> : null}
                              <span style={{ marginLeft: 6 }}>Stock: <b style={{ color: Number(p.stockQuantity) > 0 ? "#6b7c45" : "#c0552a" }}>{p.stockQuantity}</b></span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#c47a3a", fontFamily: "Georgia,serif" }}>{formatCurrency(Number(p.sellingPrice))}</div>
                          <div style={{ fontSize: 10, color: "#a8937a" }}>GST {p.gstPercentage}%</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart table */}
          <div style={S.card}>
            <div style={S.cardHeader()}>
              <Receipt size={14} color="rgba(180,155,110,0.8)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" }}>Bill Items</span>
              {items.length > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 11, background: "rgba(107,124,69,0.25)", color: "#a8c07a", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                  {items.length} item{items.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#", "Product Name", "Shade Code", "Unit", "Qty", "Rate (₹)", "Disc %", "GST %", "Amount (₹)", ""].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ ...S.td, padding: "40px 20px", textAlign: "center", color: "#a8937a" }}>
                        <div style={{ fontSize: 13 }}>No items added · Search or scan a product above</div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.productId}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        style={{ transition: "background 0.15s" }}
                      >
                        <td style={{ ...S.td, color: "#a8937a", width: 32 }}>{idx + 1}</td>
                        <td style={{ ...S.td, fontWeight: 600, maxWidth: 180 }}>{item.name}</td>
                        <td style={{ ...S.td, width: 90 }}>
                          <input style={S.tinyInput} value={item.shadeCode || ""} placeholder="—"
                            onChange={(e) => updateShadeCode(item.productId, e.target.value)} />
                        </td>
                        <td style={{ ...S.td, color: "#a8937a" }}>{item.unit}</td>
                        <td style={{ ...S.td, width: 96 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                              <Minus size={10} color="#6b5d4a" />
                            </button>
                            <span style={{ width: 28, textAlign: "center", fontSize: 13, fontWeight: 700 }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(107,124,69,0.10)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                              <Plus size={10} color="#4a5e28" />
                            </button>
                          </div>
                        </td>
                        <td style={{ ...S.td, width: 100 }}>
                          <input type="number" style={S.tinyInput} value={item.rate} min={0} step="any"
                            onChange={(e) => updateRate(item.productId, Number(e.target.value))} />
                        </td>
                        <td style={{ ...S.td, width: 72 }}>
                          <input type="number" style={S.tinyInput} value={item.discountPercent} min={0} max={100}
                            onChange={(e) => updateDiscount(item.productId, Number(e.target.value))} />
                        </td>
                        <td style={{ ...S.td, width: 72 }}>
                          <input type="number" style={S.tinyInput} value={item.gstPercentage} min={0} max={100} step="any"
                            onChange={(e) => updateGst(item.productId, Number(e.target.value))} />
                        </td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: "#c47a3a", fontFamily: "Georgia,serif", width: 110 }}>
                          {formatCurrency(item.quantity * item.rate * (1 - item.discountPercent / 100) * (1 + item.gstPercentage / 100))}
                        </td>
                        <td style={{ ...S.td, width: 36 }}>
                          <button onClick={() => removeItem(item.productId)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(192,85,42,0.10)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            <Trash2 size={14} color="#c0552a" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {items.length > 0 && (
              <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a8937a", borderTop: "1px solid rgba(180,155,110,0.12)" }}>
                <span>{items.length} item{items.length > 1 ? "s" : ""}</span>
                <span>Total Qty: <b style={{ color: "#2c2418" }}>{totalQty.toFixed(2)}</b></span>
              </div>
            )}
          </div>

          {/* Frequently Bought Together */}
          {recommendations && recommendations.results.length > 0 && (
            <div style={S.card}>
              <div style={{ ...S.cardHeader("rgba(180,155,110,0.15)"), borderRadius: "13px 13px 0 0" }}>
                <Tag size={13} color="#a8937a" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6b5d4a" }}>Frequently Bought Together</span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                {recommendations.results.map((p: ProductSearchResult) => (
                  <button key={p.id} onClick={() => handleAddProduct(p)}
                    style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(250,247,242,0.9)", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(107,124,69,0.08)"; e.currentTarget.style.borderColor = "#6b7c45"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(250,247,242,0.9)"; e.currentTarget.style.borderColor = "rgba(180,155,110,0.25)"; }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#2c2418" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#c47a3a", fontFamily: "Georgia,serif", marginTop: 2 }}>{formatCurrency(Number(p.sellingPrice))}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Held Bills */}
          {heldBills && heldBills.length > 0 && (
            <div style={S.card}>
              <div style={{ ...S.cardHeader("rgba(196,122,58,0.12)"), borderRadius: "13px 13px 0 0" }}>
                <PauseCircle size={13} color="#c47a3a" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#8a4a10" }}>Held Bills</span>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {heldBills.map((bill: any) => (
                  <div key={bill.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(196,122,58,0.20)", background: "rgba(196,122,58,0.05)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2418" }}>{bill.label || "Untitled Bill"}</div>
                      <div style={{ fontSize: 11, color: "#a8937a" }}>{bill.itemsJson.length} items</div>
                    </div>
                    <button onClick={() => handleResumeBill(bill)}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(196,122,58,0.35)", background: "rgba(196,122,58,0.10)", color: "#8a4a10", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <PlayCircle size={12} /> Resume
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary + Payment ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Invoice Summary */}
          <div style={S.card}>
            <div style={S.cardHeader()}>
              <Receipt size={14} color="rgba(180,155,110,0.8)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" }}>Invoice Summary</span>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Sub Total", value: totals?.subTotal || 0 },
                { label: "Discount", value: -(totals?.totalDiscount || 0), isNeg: true },
                { label: "Taxable Amount", value: totals?.subTotal || 0, divider: true },
                { label: "CGST", value: totals?.cgstAmount || 0 },
                { label: "SGST", value: totals?.sgstAmount || 0 },
                { label: "Round Off", value: 0 },
              ].map(({ label, value, divider, isNeg }) => (
                <div key={label}>
                  {divider && <div style={{ borderTop: "1px dashed rgba(180,155,110,0.22)", margin: "6px 0" }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                    <span style={{ color: "#a8937a" }}>{label}</span>
                    <span style={{ color: isNeg && value !== 0 ? "#c0552a" : "#2c2418", fontWeight: 500 }}>
                      {isNeg && value !== 0 ? "-" : ""}{formatCurrency(Math.abs(value))}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: "2px solid rgba(180,155,110,0.25)", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#2c2418" }}>Grand Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#6b7c45", fontFamily: "Georgia,serif" }}>
                  {formatCurrency(totals?.grandTotal || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div style={S.card}>
            <div style={S.cardHeader()}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" }}>Payment Details</span>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Payment method pills */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {PAYMENT_METHODS.map((m) => {
                  const active = paymentMethod === m;
                  return (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      style={{
                        padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${active ? "#6b7c45" : "rgba(180,155,110,0.28)"}`,
                        background: active ? "linear-gradient(135deg,#6b7c45,#8fa05a)" : "rgba(250,247,242,0.9)",
                        color: active ? "#fff" : "#6b5d4a",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        boxShadow: active ? "0 4px 12px rgba(107,124,69,0.30)" : "none",
                        transition: "all 0.18s",
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{PM_ICONS[m]}</span>
                      {m}
                    </button>
                  );
                })}
              </div>

              {paymentMethod === "CREDIT" && !customerId && (
                <div style={{ padding: "8px 11px", borderRadius: 8, background: "rgba(196,122,58,0.08)", border: "1px solid rgba(196,122,58,0.25)", fontSize: 12, color: "#8a4a10" }}>
                  ⚠ Add a customer above to track this credit properly.
                </div>
              )}

              {paymentMethod === "CREDIT" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <span style={S.label}>Received Amount</span>
                    <input type="number" style={S.liveInput} placeholder="0.00" value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      onFocus={(e) => { e.target.style.borderColor = "#6b7c45"; e.target.style.boxShadow = "0 0 0 3px rgba(107,124,69,0.10)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(180,155,110,0.30)"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                    <span style={{ color: "#a8937a" }}>Balance Due</span>
                    <span style={{ fontWeight: 700, color: "#c0552a", fontFamily: "Georgia,serif" }}>{formatCurrency(balanceAmount)}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={handleHoldBill} disabled={items.length === 0}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 8px", borderRadius: 9, border: "1.5px solid rgba(180,155,110,0.35)",
                    background: "rgba(180,155,110,0.08)", color: "#6b5d4a",
                    fontSize: 13, fontWeight: 600, cursor: items.length === 0 ? "not-allowed" : "pointer",
                    opacity: items.length === 0 ? 0.5 : 1,
                  }}>
                  <PauseCircle size={15} /> Hold
                </button>
                <button onClick={handleGenerateInvoice} disabled={items.length === 0 || createInvoice.isPending}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 8px", borderRadius: 9, border: "none",
                    background: items.length === 0 ? "rgba(107,124,69,0.4)" : "linear-gradient(135deg,#6b7c45,#8fa05a)",
                    color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: items.length === 0 ? "not-allowed" : "pointer",
                    boxShadow: items.length > 0 ? "0 4px 16px rgba(107,124,69,0.35)" : "none",
                  }}>
                  <FileDown size={15} />
                  {createInvoice.isPending ? "Generating…" : "Generate"}
                </button>
              </div>

              {/* Post-invoice success panel */}
              {lastInvoice && (
                <div style={{ borderRadius: 10, border: "1px solid rgba(107,124,69,0.30)", background: "rgba(107,124,69,0.07)", padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <CheckCircle2 size={16} color="#6b7c45" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#4a5e28" }}>
                      {lastInvoice.invoiceNumber} created!
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 8 }}>
                    {[
                      { label: "Print", icon: <Printer size={12} />, action: () => printInvoicePdf(lastInvoice.id) },
                      { label: "PDF", icon: <FileDown size={12} />, action: () => downloadInvoicePdf(lastInvoice.id) },
                    ].map(({ label, icon, action }) => (
                      <button key={label} onClick={action}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 7, border: "1px solid rgba(107,124,69,0.25)", background: "rgba(107,124,69,0.08)", color: "#4a5e28", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {icon}{label}
                      </button>
                    ))}
                    {lastInvoice.whatsappLink ? (
                      <a href={lastInvoice.whatsappLink} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 7, border: "1px solid rgba(37,211,102,0.35)", background: "rgba(37,211,102,0.08)", color: "#1a7a42", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                        <MessageCircle size={12} />WA
                      </a>
                    ) : (
                      <button disabled style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.20)", background: "rgba(180,155,110,0.06)", color: "#a8937a", fontSize: 11, fontWeight: 600, cursor: "not-allowed", opacity: 0.5 }}>
                        <MessageCircle size={12} />WA
                      </button>
                    )}
                  </div>
                  <button onClick={handleNewBill}
                    style={{ width: "100%", padding: "8px", borderRadius: 7, border: "1px solid rgba(107,124,69,0.30)", background: "rgba(107,124,69,0.12)", color: "#4a5e28", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    + New Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}