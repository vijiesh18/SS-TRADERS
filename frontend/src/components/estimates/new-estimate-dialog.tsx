"use client";

import { useEffect, useState } from "react";
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
import { useCustomerSearch, useProductSearch, type ProductSearchResult } from "@/hooks/use-billing";
import { useCreateEstimate, useUpdateEstimate, type Estimate } from "@/hooks/use-estimates";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  productId: string;
  name: string;
  quantity: number;
  rate: number;
  gstPercentage: number;
}

interface NewEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this existing draft estimate instead of creating a new one. */
  estimate?: Estimate | null;
}

export function NewEstimateDialog({ open, onOpenChange, estimate }: NewEstimateDialogProps) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!estimate;

  const { data: customerResults } = useCustomerSearch(customerQuery);
  const { data: productResults } = useProductSearch(productQuery);
  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();

  const subTotal = items.reduce((sum, i) => sum + i.quantity * i.rate, 0);
  const gstAmount = items.reduce((sum, i) => sum + i.quantity * i.rate * (i.gstPercentage / 100), 0);
  const grandTotal = subTotal + gstAmount;

  // Prefill when editing an existing estimate
  useEffect(() => {
    if (estimate) {
      setCustomer(estimate.customer ? { id: estimate.customer.id, name: estimate.customer.name } : null);
      setItems(
        estimate.items.map((i) => ({
          productId: i.productId,
          name: i.productName,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          gstPercentage: Number(i.gstPercentage),
        }))
      );
    } else {
      setCustomer(null);
      setItems([]);
    }
    setCustomerQuery("");
    setProductQuery("");
    setError(null);
  }, [estimate, open]);

  function reset() {
    setCustomerQuery("");
    setCustomer(null);
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
          rate: Number(p.sellingPrice),
          gstPercentage: Number(p.gstPercentage),
        },
      ];
    });
    setProductQuery("");
  }

  function updateItem(productId: string, key: "quantity" | "rate" | "gstPercentage", value: number) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, [key]: value } : i)));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (items.length === 0) return setError("Add at least one item");

    const payload = {
      customerId: customer?.id || null,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        rate: i.rate,
        gstPercentage: i.gstPercentage,
      })),
    };

    try {
      if (isEdit && estimate) {
        await updateEstimate.mutateAsync({ id: estimate.id, ...payload });
      } else {
        await createEstimate.mutateAsync(payload);
      }
      handleClose(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || `Failed to ${isEdit ? "update" : "create"} estimate`);
    }
  }

  const isPending = createEstimate.isPending || updateEstimate.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Estimate ${estimate?.estimateNumber}` : "New Estimate"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Edit items, rates, and GST for this draft estimate."
              : "Create a draft estimate. No stock is affected until converted to an invoice."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Customer (optional)</Label>
            {customer ? (
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <p className="font-medium">{customer.name}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search customer by name or phone"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                  />
                </div>
                {customerQuery && (
                  <div className="max-h-32 overflow-y-auto rounded-md border divide-y">
                    {(customerResults?.results || []).length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">No customers found</p>
                    ) : (
                      customerResults?.results.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomer({ id: c.id, name: c.name });
                            setCustomerQuery("");
                          }}
                          className="block w-full p-2 text-left text-sm hover:bg-slate-50"
                        >
                          {c.name} · {c.phone}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
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
                <div key={item.productId} className="rounded-md border p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <button type="button" onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">Qty</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="h-8 w-20 text-xs"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.productId, "quantity", Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">Rate ₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="h-8 w-24 text-xs"
                        value={item.rate}
                        onChange={(e) => updateItem(item.productId, "rate", Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">GST%</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        className="h-8 w-16 text-xs"
                        value={item.gstPercentage}
                        onChange={(e) => updateItem(item.productId, "gstPercentage", Number(e.target.value))}
                      />
                    </div>
                    <p className="flex-1 text-right text-sm font-medium">
                      {formatCurrency(item.quantity * item.rate * (1 + item.gstPercentage / 100))}
                    </p>
                  </div>
                </div>
              ))}

              <div className="space-y-1 border-t pt-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub Total</span>
                  <span>{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST</span>
                  <span>{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
