"use client";

import { useState } from "react";
import { Plus, Upload, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductImportDialog } from "@/components/products/product-import-dialog";
import { useProducts, useCategories, useDeleteProduct, type Product } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your full catalog including paints, hardware, motors and borewell materials
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          {canManage && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, barcode, shade..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.items.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="sm"
            onClick={() => { setLowStockOnly((v) => !v); setPage(1); }}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Low Stock Only
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Code / Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">GST</th>
                <th className="px-4 py-3 text-right">Purchase</th>
                <th className="px-4 py-3 text-right">Selling</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading products...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLowStock = Number(p.stockQuantity) <= Number(p.minimumStock);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.brand?.name} {p.variant ? `· ${p.variant}` : ""}{" "}
                          {p.shadeCode ? `· Shade: ${p.shadeCode}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p>{p.productCode}</p>
                        <p className="text-muted-foreground">{p.barcode || "-"}</p>
                      </td>
                      <td className="px-4 py-3">{p.category?.name || "-"}</td>
                      <td className="px-4 py-3">{Number(p.gstPercentage)}%</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(p.purchasePrice))}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(p.sellingPrice))}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLowStock && <Badge variant="warning">Low</Badge>}
                          <span>{Number(p.stockQuantity)} {p.unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditForm(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
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

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} />
      <ProductImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.name}" will be soft-deleted and can be restored later. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason for deletion"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
