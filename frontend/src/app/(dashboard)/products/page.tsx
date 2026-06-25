"use client";

import { useState } from "react";
import { Plus, Upload, Pencil, Trash2, Search, AlertTriangle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductImportDialog } from "@/components/products/product-import-dialog";
import { useProducts, useCategories, useDeleteProduct, type Product } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const },
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  cardHeaderText: { fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  th: { padding: "12px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "rgba(220,205,180,0.85)", whiteSpace: "nowrap" as const, textAlign: "left" as const, background: "#2c2820" } as React.CSSProperties,
  td: { padding: "12px 16px", fontSize: 13, color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)" } as React.CSSProperties,
  money: { color: "#c47a3a", fontFamily: "Georgia, serif", fontWeight: 700 } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.30)", whiteSpace: "nowrap" as const } as React.CSSProperties,
  btnOutline: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "1px solid rgba(180,155,110,0.35)", background: "rgba(250,247,242,0.9)", color: "#6b5d4a", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const } as React.CSSProperties,
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  input: { background: "rgba(255,252,248,0.9)", border: "1px solid rgba(180,155,110,0.30)", borderRadius: 8, padding: "9px 12px 9px 36px", fontSize: 13, color: "#2c2418", width: "100%", outline: "none" } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission("*");
  const canDelete = hasPermission("*");

  const { data: categories } = useCategories();
  const { data, isLoading } = useProducts({
    page,
    limit: 25,
    categoryId: categoryId !== "all" ? categoryId : undefined,
    lowStock: lowStockOnly,
  });
  const deleteProduct = useDeleteProduct();

  const products = data?.items || [];
  const filtered = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.productCode.toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode && p.barcode.includes(search)) ||
          (p.shadeCode && p.shadeCode.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  function openAddForm() {
    setEditingProduct(null);
    setFormOpen(true);
  }
  function openEditForm(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteProduct.mutateAsync({ id: deleteTarget.id, reason: deleteReason || "No reason provided" });
    setDeleteTarget(null);
    setDeleteReason("");
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Products</h1>
          <p style={S.subtitle}>Manage your full catalog including paints, hardware, motors and borewell materials</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btnOutline} onClick={() => setImportOpen(true)}>
            <Upload size={15} /> Import
          </button>
          {canManage && (
            <button style={S.btnPrimary} onClick={openAddForm}>
              <Plus size={15} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={S.card}>
        <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8937a", pointerEvents: "none" }} />
            <input style={S.input} placeholder="Search by name, code, barcode, shade..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.items.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            style={lowStockOnly ? S.btnPrimary : S.btnOutline}
            onClick={() => { setLowStockOnly((v) => !v); setPage(1); }}
          >
            <AlertTriangle size={15} /> Low Stock Only
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <Package size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Product Catalogue</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Product</th>
                <th style={S.th}>Code / Barcode</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>GST</th>
                <th style={{ ...S.th, textAlign: "right" }}>Purchase</th>
                <th style={{ ...S.th, textAlign: "right" }}>Selling</th>
                <th style={{ ...S.th, textAlign: "right" }}>Stock</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>Loading products...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>No products found.</td></tr>
              ) : (
                filtered.map((p) => {
                  const isLowStock = Number(p.stockQuantity) <= Number(p.minimumStock);
                  return (
                    <tr key={p.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={S.td}>
                        <p style={{ fontWeight: 600 }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: "#a8937a", marginTop: 2 }}>
                          {p.brand?.name} {p.variant ? `· ${p.variant}` : ""} {p.shadeCode ? `· Shade: ${p.shadeCode}` : ""}
                        </p>
                      </td>
                      <td style={{ ...S.td, fontSize: 11 }}>
                        <p>{p.productCode}</p>
                        <p style={{ color: "#a8937a" }}>{p.barcode || "-"}</p>
                      </td>
                      <td style={S.td}>{p.category?.name || "-"}</td>
                      <td style={S.td}>{Number(p.gstPercentage)}%</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{formatCurrency(Number(p.purchasePrice))}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.money }}>{formatCurrency(Number(p.sellingPrice))}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                          {isLowStock && <span style={S.badge("rgba(196,122,58,0.14)", "#8a4a10")}>Low</span>}
                          <span>{Number(p.stockQuantity)} {p.unit}</span>
                        </div>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          {canManage && (
                            <button style={S.btnGhost} onClick={() => openEditForm(p)}>
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button style={S.btnGhost} onClick={() => setDeleteTarget(p)}>
                              <Trash2 size={13} color="#c0552a" />
                            </button>
                          )}
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
          <p>Showing {(page - 1) * data.limit + 1}-{Math.min(page * data.limit, data.total)} of {data.total}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnGhost, opacity: page === 1 ? 0.5 : 1 }} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button style={{ ...S.btnGhost, opacity: page * data.limit >= data.total ? 0.5 : 1 }} disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} />
      <ProductImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.name}" will be soft-deleted and can be restored later. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="Reason for deletion" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}