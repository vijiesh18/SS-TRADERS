"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Zap, History, Plus, Search, Pencil, PackagePlus, X, Check, Tag, ArrowRight, ChevronLeft, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { StockHistoryDialog } from "@/components/inventory/stock-history-dialog";
import { ShimmerTable } from "@/components/ui/shimmer";
import { useLowStock, useDeadStock, useFastMoving, useProducts, useCategories, useCreateProduct, useUpdateProduct, type ProductItem } from "@/hooks/use-inventory";
import { useStockAdjustment } from "@/hooks/use-inventory";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency } from "@/lib/utils";

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  cardHeaderText: { fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  th: { padding: "12px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "rgba(220,205,180,0.85)", whiteSpace: "nowrap" as const, textAlign: "left" as const, background: "#2c2820" } as React.CSSProperties,
  td: { padding: "12px 16px", fontSize: 13, color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)" } as React.CSSProperties,
  money: { color: "#c47a3a", fontFamily: "Georgia, serif", fontWeight: 700 } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.30)", whiteSpace: "nowrap" as const } as React.CSSProperties,
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  input: { background: "rgba(255,252,248,0.9)", border: "1px solid rgba(180,155,110,0.30)", borderRadius: 8, padding: "9px 12px 9px 36px", fontSize: 13, color: "#2c2418", width: "100%", outline: "none" } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "linear-gradient(135deg,#6b7c45,#8fa05a)" : "transparent", color: active ? "#fff" : "#6b5d4a", boxShadow: active ? "0 2px 8px rgba(107,124,69,0.3)" : "none" }),
  tablist: { display: "inline-flex", gap: 3, padding: 3, background: "rgba(245,240,232,0.9)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 10, flexWrap: "wrap" as const } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

const WARN_BADGE: [string, string] = ["rgba(196,122,58,0.14)", "#8a4a10"];
const OK_BADGE: [string, string] = ["rgba(180,155,110,0.14)", "#6b5d4a"];
const SUCCESS_BADGE: [string, string] = ["rgba(107,124,69,0.14)", "#4a5e28"];

// Sensible defaults + hints per S.S Traders product category (matched by name
// keywords). The unit is pre-filled (operational only); the HSN is suggested in
// the hint for the user to confirm, since HSN feeds GST filing.
function categoryDefaults(name: string): { unit?: string; hsnCode?: string; hint?: string } {
  const n = name.toLowerCase();
  if (/paint|emulsion|enamel|distemper|primer/.test(n))
    return { unit: "LTR", hsnCode: "3209", hint: "Paints sell per litre. Add the shade/pack to the name (e.g. “Royale 20L – Ivory”). Confirm the HSN (3208–3210) for this product." };
  if (/accessor|brush|roller|tray|tape|sandpaper|tool/.test(n))
    return { unit: "PCS", hsnCode: "9603", hint: "Accessories are counted pieces. Confirm the HSN before saving." };
  if (/borewell|bore ?well|pipe|casing|riser/.test(n))
    return { unit: "PCS", hint: "Borewell materials (pipes, casings) sell per piece or length. Enter the matching HSN." };
  if (/pump|motor|submersible/.test(n))
    return { unit: "PCS", hsnCode: "8413", hint: "Pumps are counted units. Confirm HSN 8413 applies to this model." };
  if (/hardware|fitting|fastener|nail|screw|bolt/.test(n))
    return { unit: "PCS", hint: "Hardware items are counted pieces. Enter the matching HSN." };
  return {};
}

// The shop's main categories — the Add Product picker shows only these so the
// shopkeeper isn't overwhelmed by every granular sub-category in the database.
const MAIN_CATEGORY_NAMES = ["paints", "accessory", "accessories", "borewell materials", "pumps", "motors", "hardware"];
function mainCategories<T extends { name: string }>(cats: T[]): T[] {
  const main = cats.filter((c) => MAIN_CATEGORY_NAMES.includes(c.name.trim().toLowerCase()));
  return main.length > 0 ? main : cats; // fall back to all if none matched
}

// ─── Quick Add-Stock Dialog (unchanged logic) ───
function QuickStockDialog({ product, onClose }: { product: ProductItem; onClose: () => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("Stock received");
  const adjustment = useStockAdjustment();

  async function handleSubmit() {
    if (!qty || isNaN(Number(qty)) || Number(qty) === 0) return;
    await adjustment.mutateAsync({ productId: product.id, direction: "IN", quantity: Number(qty), reason: note || "Stock received" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Add Stock</p>
            <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <p className="text-sm text-muted-foreground">{product.name}</p>
          <p className="text-xs text-muted-foreground">Current stock: {Number(product.stockQuantity)}</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Quantity to Add</Label>
            <Input type="number" placeholder="e.g. 10" value={qty} min={1} onChange={(e) => setQty(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={adjustment.isPending || !qty}>
              <PackagePlus className="h-4 w-4 mr-1" />
              {adjustment.isPending ? "Adding..." : "Add Stock"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Product Edit / Add Dialog (unchanged logic) ───
function ProductDialog({ product, onClose }: { product: ProductItem | null; onClose: () => void }) {
  const isNew = !product;
  const { data: cats } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [form, setForm] = useState({
    name: product?.name || "",
    productCode: product?.productCode || "",
    unit: product?.unit || "PCS",
    variant: product?.variant || "",
    hsnCode: product?.hsnCode || "",
    gstPercentage: product?.gstPercentage ? Number(product.gstPercentage) : 18,
    sellingPrice: product?.sellingPrice ? Number(product.sellingPrice) : 0,
    purchasePrice: product?.purchasePrice ? Number(product.purchasePrice) : 0,
    stockQuantity: product?.stockQuantity ? Number(product.stockQuantity) : 0,
    minimumStock: product?.minimumStock ? Number(product.minimumStock) : 2,
    barcode: product?.barcode || "",
    categoryId: product?.category?.id || "",
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const [err, setErr] = useState<string | null>(null);

  // Two-step flow for new products: pick a category first, then fill details.
  // Editing jumps straight to details (category already known).
  const [step, setStep] = useState<"category" | "details">(isNew ? "category" : "details");
  const selectedCat = (cats || []).find((c) => c.id === form.categoryId);
  const catHint = selectedCat ? categoryDefaults(selectedCat.name).hint : undefined;

  function chooseCategory(catId: string | null) {
    if (catId) {
      const cat = (cats || []).find((c) => c.id === catId);
      const d = cat ? categoryDefaults(cat.name) : {};
      setForm((f) => ({
        ...f,
        categoryId: catId,
        // Only pre-fill unit/HSN if the user hasn't set them yet
        unit: d.unit && f.unit === "PCS" ? d.unit : f.unit,
        hsnCode: d.hsnCode && !f.hsnCode ? d.hsnCode : f.hsnCode,
      }));
    } else {
      setForm((f) => ({ ...f, categoryId: "" }));
    }
    setStep("details");
  }

  async function handleSubmit() {
    setErr(null);
    if (!form.name.trim()) { setErr("Product name is required"); return; }
    if (!form.productCode.trim()) { setErr("Product code is required"); return; }
    try {
      const payload: Record<string, unknown> = {
        ...form,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId || undefined,
        variant: form.variant || undefined,
        hsnCode: form.hsnCode || undefined,
      };
      if (isNew) {
        await createProduct.mutateAsync(payload);
      } else {
        await updateProduct.mutateAsync({ id: product!.id, ...payload });
      }
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Failed to save product");
    }
  }

  const isSaving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="space-y-4 p-6">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 14, marginBottom: 4, borderBottom: "1px solid rgba(180,155,110,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {isNew && step === "details" && (cats || []).length > 0 && (
                <button onClick={() => setStep("category")} title="Back to category"
                  style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "#6b5d4a", padding: 2 }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <p style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: "#2c2418", letterSpacing: "-0.3px" }}>{isNew ? "Add New Product" : "Edit Product"}</p>
            </div>
            <button onClick={onClose} className="dialog-close" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>

          {isNew && step === "category" ? (
            /* ── STEP 1 — pick a category ── */
            <div className="space-y-4">
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "#a8937a" }}>Step 1 of 2</p>
                <p className="text-base font-semibold" style={{ marginTop: 4, color: "#2c2418" }}>What category is this product?</p>
                <p className="text-xs" style={{ color: "#a8937a", marginTop: 3 }}>We&apos;ll pre-fill the right unit and HSN code for you.</p>
              </div>
              {(cats || []).length === 0 ? (
                <p className="text-sm" style={{ color: "#a8937a" }}>No categories set up yet — you can continue without one.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {mainCategories(cats || []).map((c) => (
                    <button key={c.id} onClick={() => chooseCategory(c.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(180,155,110,0.28)", background: "rgba(250,247,242,0.9)", color: "#2c2418", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(107,124,69,0.08)"; e.currentTarget.style.borderColor = "#6b7c45"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(250,247,242,0.9)"; e.currentTarget.style.borderColor = "rgba(180,155,110,0.28)"; }}>
                      <Tag size={14} style={{ color: "#6b7c45", flexShrink: 0 }} /> {c.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <button onClick={() => chooseCategory(null)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#6b7c45", fontSize: 13, fontWeight: 600 }}>
                  Skip — no category <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* ── STEP 2 — product details ── */
            <>
              {isNew && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(107,124,69,0.08)", border: "1px solid rgba(107,124,69,0.20)", borderRadius: 10, padding: "8px 12px" }}>
                  <span style={{ fontSize: 13, color: "#4a5e28", display: "flex", alignItems: "center", gap: 6 }}>
                    <Tag size={13} /> Category: <b>{selectedCat?.name || "None"}</b>
                  </span>
                  <button onClick={() => setStep("category")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7c45", fontSize: 12, fontWeight: 700 }}>Change</button>
                </div>
              )}
              {catHint && (
                <p style={{ fontSize: 12, color: "#8a5520", background: "rgba(196,122,58,0.08)", border: "1px solid rgba(196,122,58,0.22)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "flex-start", gap: 7, lineHeight: 1.5 }}>
                  <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1, color: "#c47a3a" }} /> {catHint}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Product Name *</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Asian Paints Royale 20L" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Product Code *</Label>
                  <Input value={form.productCode} onChange={(e) => set("productCode", e.target.value)} placeholder="e.g. AP-001" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Barcode</Label>
                  <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="Scan or type barcode" />
                </div>
                {!isNew && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {(cats || []).map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["PCS", "LTR", "KG", "PACK", "BOX", "NOS", "CAN"].map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pack Size / Variant</Label>
                  <Input value={form.variant} onChange={(e) => set("variant", e.target.value)} placeholder="e.g. 20L, 1 KG" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">HSN Code</Label>
                  <Input value={form.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} placeholder="e.g. 3209" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">GST %</Label>
                  <Input type="number" value={form.gstPercentage} onChange={(e) => set("gstPercentage", Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Purchase Price (₹)</Label>
                  <Input type="number" value={form.purchasePrice} onChange={(e) => set("purchasePrice", Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Selling Price (₹)</Label>
                  <Input type="number" value={form.sellingPrice} onChange={(e) => set("sellingPrice", Number(e.target.value))} />
                </div>
                {isNew && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Opening Stock</Label>
                    <Input type="number" value={form.stockQuantity} onChange={(e) => set("stockQuantity", Number(e.target.value))} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum Stock Alert</Label>
                  <Input type="number" value={form.minimumStock} onChange={(e) => set("minimumStock", Number(e.target.value))} />
                </div>
              </div>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSaving}>
                  <Check className="h-4 w-4 mr-1" />
                  {isSaving ? "Saving..." : isNew ? "Add Product" : "Save Changes"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── All Products Tab ───
function AllProductsTab({ canEdit }: { canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editProduct, setEditProduct] = useState<ProductItem | null | "new">(null);
  const [stockProduct, setStockProduct] = useState<ProductItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useProducts({ search: search || undefined, page, limit: 30 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8937a", pointerEvents: "none" }} />
          <input style={S.input} placeholder="Search by product name or code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {canEdit && (
          <button style={S.btnPrimary} onClick={() => setEditProduct("new")}>
            <Plus size={15} /> Add New Product
          </button>
        )}
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardHeaderText}>Product Inventory</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Product</th>
                <th style={S.th}>Category</th>
                <th style={{ ...S.th, textAlign: "right" }}>Stock</th>
                <th style={{ ...S.th, textAlign: "right" }}>Selling Price</th>
                <th style={{ ...S.th, textAlign: "right" }}>Purchase Price</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <ShimmerTable rows={6} cols={6} />
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>{search ? `No products matching "${search}"` : "No products yet. Click Add New Product to get started."}</td></tr>
              ) : (
                data.items.map((p) => {
                  const low = Number(p.stockQuantity) <= Number(p.minimumStock);
                  const [bg, c] = low ? WARN_BADGE : OK_BADGE;
                  return (
                    <tr key={p.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={S.td}>
                        <p style={{ fontWeight: 600 }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: "#a8937a", marginTop: 2 }}>{p.productCode} {p.unit && `· ${p.unit}`}</p>
                      </td>
                      <td style={{ ...S.td, color: "#a8937a", fontSize: 12 }}>{p.category?.name || "-"}</td>
                      <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(bg, c)}>{Number(p.stockQuantity)}</span></td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(p.sellingPrice))}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "#a8937a" }}>{formatCurrency(Number(p.purchasePrice))}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          {canEdit && (
                            <>
                              <button style={S.btnGhost} title="Add Stock" onClick={() => setStockProduct(p)}><PackagePlus size={13} /></button>
                              <button style={S.btnGhost} title="Edit Product" onClick={() => setEditProduct(p)}><Pencil size={13} /></button>
                            </>
                          )}
                          <button style={S.btnGhost} title="Stock History" onClick={() => setHistoryTarget({ id: p.id, name: p.name })}><History size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total > data.limit && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#a8937a" }}>
          <p>Showing {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnGhost, opacity: page === 1 ? 0.5 : 1, padding: "7px 14px" }} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button style={{ ...S.btnGhost, opacity: page * data.limit >= data.total ? 0.5 : 1, padding: "7px 14px" }} disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {editProduct === "new" && <ProductDialog product={null} onClose={() => setEditProduct(null)} />}
      {editProduct && editProduct !== "new" && <ProductDialog product={editProduct} onClose={() => setEditProduct(null)} />}
      {stockProduct && <QuickStockDialog product={stockProduct} onClose={() => setStockProduct(null)} />}
      <StockHistoryDialog productId={historyTarget?.id || null} productName={historyTarget?.name} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}

// ─── Main Inventory Page ───
export default function InventoryPage() {
  const [tab, setTab] = useState("all-products");
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);
  const canEdit = useAuthStore((s) => s.hasPermission("*"));

  const { data: lowStock, isLoading: lowStockLoading } = useLowStock();
  const { data: deadStock, isLoading: deadStockLoading } = useDeadStock(90);
  const { data: fastMoving, isLoading: fastMovingLoading } = useFastMoving(30);

  return (
    <div style={S.page}>
      <div>
        <h1 style={S.title}>Inventory</h1>
        <p style={S.subtitle}>Manage products, update prices, add stock</p>
      </div>

      <div style={S.tablist}>
        <button style={S.tab(tab === "all-products")} onClick={() => setTab("all-products")}>All Products</button>
        <button style={S.tab(tab === "low-stock")} onClick={() => setTab("low-stock")}><AlertTriangle size={14} /> Low Stock</button>
        <button style={S.tab(tab === "dead-stock")} onClick={() => setTab("dead-stock")}><Archive size={14} /> Dead Stock</button>
        <button style={S.tab(tab === "fast-moving")} onClick={() => setTab("fast-moving")}><Zap size={14} /> Fast Moving</button>
      </div>

      {tab === "all-products" && <AllProductsTab canEdit={canEdit} />}

      {tab === "low-stock" && (
        <div style={S.card}>
          <div style={S.cardHeader}><AlertTriangle size={14} color="rgba(180,155,110,0.8)" /><span style={S.cardHeaderText}>Low Stock</span></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={S.th}>Product</th><th style={S.th}>Code</th>
                <th style={{ ...S.th, textAlign: "right" }}>Current Stock</th>
                <th style={{ ...S.th, textAlign: "right" }}>Minimum</th><th style={S.th}></th>
              </tr></thead>
              <tbody>
                {lowStockLoading ? (
                  <ShimmerTable rows={3} cols={5} />
                ) : !lowStock || lowStock.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: "32px", color: "#a8937a" }}>All products are well stocked.</td></tr>
                ) : (
                  lowStock.map((item) => (
                    <tr key={item.id} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ ...S.td, fontSize: 11, color: "#a8937a" }}>{item.productCode}</td>
                      <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(WARN_BADGE[0], WARN_BADGE[1])}>{Number(item.stockQuantity)}</span></td>
                      <td style={{ ...S.td, textAlign: "right", color: "#a8937a" }}>{Number(item.minimumStock)}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <button style={S.btnGhost} onClick={() => setHistoryTarget({ id: item.id, name: item.name })}><History size={13} /> History</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "dead-stock" && (
        <div style={S.card}>
          <div style={S.cardHeader}><Archive size={14} color="rgba(180,155,110,0.8)" /><span style={S.cardHeaderText}>Dead Stock</span></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={S.th}>Product</th>
                <th style={{ ...S.th, textAlign: "right" }}>Stock</th>
                <th style={{ ...S.th, textAlign: "right" }}>Selling Price</th>
                <th style={{ ...S.th, textAlign: "right" }}>Value</th><th style={S.th}></th>
              </tr></thead>
              <tbody>
                {deadStockLoading ? (
                  <ShimmerTable rows={3} cols={5} />
                ) : !deadStock || deadStock.items.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: "32px", color: "#a8937a" }}>No dead stock found.</td></tr>
                ) : (
                  deadStock.items.map((item) => (
                    <tr key={item.id} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{Number(item.stockQuantity)}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{formatCurrency(Number(item.sellingPrice))}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(item.stockQuantity) * Number(item.sellingPrice))}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <button style={S.btnGhost} onClick={() => setHistoryTarget({ id: item.id, name: item.name })}><History size={13} /> History</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "fast-moving" && (
        <div style={S.card}>
          <div style={S.cardHeader}><Zap size={14} color="rgba(180,155,110,0.8)" /><span style={S.cardHeaderText}>Fast Moving</span></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={S.th}>Product</th>
                <th style={{ ...S.th, textAlign: "right" }}>Qty Sold</th>
                <th style={{ ...S.th, textAlign: "right" }}>Current Stock</th>
                <th style={{ ...S.th, textAlign: "right" }}>Selling Price</th><th style={S.th}></th>
              </tr></thead>
              <tbody>
                {fastMovingLoading ? (
                  <ShimmerTable rows={3} cols={5} />
                ) : !fastMoving || fastMoving.items.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: "32px", color: "#a8937a" }}>No sales recorded yet.</td></tr>
                ) : (
                  fastMoving.items.map((item) => (
                    <tr key={item.id} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ ...S.td, textAlign: "right" }}><span style={S.badge(SUCCESS_BADGE[0], SUCCESS_BADGE[1])}>{Number(item.quantitySold)}</span></td>
                      <td style={{ ...S.td, textAlign: "right" }}>{Number(item.stockQuantity)}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(item.sellingPrice))}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <button style={S.btnGhost} onClick={() => setHistoryTarget({ id: item.id, name: item.name })}><History size={13} /> History</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StockHistoryDialog productId={historyTarget?.id || null} productName={historyTarget?.name} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}