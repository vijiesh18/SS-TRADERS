"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Trash2, Plus } from "lucide-react";
import { useSupplierSearch, type Supplier } from "@/hooks/use-suppliers";
import { useProductSearch, type ProductSearchResult } from "@/hooks/use-billing";
import { useCreatePurchase } from "@/hooks/use-purchases";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  productId: string;
  name: string;
  quantity: number;
  purchaseRate: number;
  gstPercentage: number;
}

interface NewPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPurchaseDialog({ open, onOpenChange }: NewPurchaseDialogProps) {
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: supplierResults } = useSupplierSearch(supplierQuery);
  const { data: productResults } = useProductSearch(productQuery);
  const createPurchase = useCreatePurchase();

  const total = items.reduce(
    (sum, i) => sum + i.quantity * i.purchaseRate * (1 + i.gstPercentage / 100),
    0
  );

  function reset() {
    setSupplierQuery("");
    setSupplier(null);
    setSupplierInvoiceNo("");
    setPaidAmount("");
    setProductQuery("");
    setItems([]);
    setError(null);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function addProduct(p: ProductSearchResult) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          quantity: 1,
          purchaseRate: 0,
          gstPercentage: Number(p.gstPercentage),
        },
      ];
    });
    setProductQuery("");
  }

  function updateItem(productId: string, key: "quantity" | "purchaseRate", value: number) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, [key]: value } : i)));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supplier) return setError("Please select a supplier");
    if (items.length === 0) return setError("Add at least one item");
    if (items.some((i) => i.purchaseRate <= 0)) return setError("Enter purchase rate for all items");

    try {
      await createPurchase.mutateAsync({
        supplierId: supplier.id,
        supplierInvoiceNo: supplierInvoiceNo || undefined,
        paidAmount: Number(paidAmount) || 0,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          purchaseRate: i.purchaseRate,
          gstPercentage: i.gstPercentage,
        })),
      });
      handleClose(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to record purchase");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Purchase Entry</DialogTitle>
          <DialogDescription>Record a stock-in purchase from a supplier</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            {supplier ? (
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <p className="font-medium">{supplier.name}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSupplier(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search supplier by name"
                    value={supplierQuery}
                    onChange={(e) => setSupplierQuery(e.target.value)}
                  />
                </div>
                {supplierQuery && (
                  <div className="max-h-32 overflow-y-auto rounded-md border divide-y">
                    {(supplierResults?.results || []).length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">No suppliers found</p>
                    ) : (
                      supplierResults?.results.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSupplier(s);
                            setSupplierQuery("");
                          }}
                          className="block w-full p-2 text-left text-sm hover:bg-slate-50"
                        >
                          {s.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Supplier Invoice No.</Label>
              <Input value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount Paid Now</Label>
              <Input type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            </div>
          </div>

          {/* Product search */}
          <div className="space-y-1.5">
            <Label>Add Products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search products to add..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
              />
            </div>
            {productQuery && (
              <div className="max-h-32 overflow-y-auto rounded-md border divide-y">
                {(productResults?.results || []).length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No products found</p>
                ) : (
                  productResults?.results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center justify-between p-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span>{p.name}</span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-2 rounded-md border p-2">
                  <p className="flex-1 text-sm font-medium truncate">{item.name}</p>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-8 w-20 text-xs"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.productId, "quantity", Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-8 w-24 text-xs"
                    placeholder="Rate"
                    value={item.purchaseRate || ""}
                    onChange={(e) => updateItem(item.productId, "purchaseRate", Number(e.target.value))}
                  />
                  <p className="w-24 text-right text-sm font-medium">
                    {formatCurrency(item.quantity * item.purchaseRate * (1 + item.gstPercentage / 100))}
                  </p>
                  <button type="button" onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex justify-end border-t pt-2 text-sm font-semibold">
                Total: {formatCurrency(total)}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPurchase.isPending}>
              {createPurchase.isPending ? "Saving..." : "Record Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
