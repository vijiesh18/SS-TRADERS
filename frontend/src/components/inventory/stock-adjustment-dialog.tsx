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
import { useProductSearch, type ProductSearchResult } from "@/hooks/use-billing";
import { useStockAdjustment } from "@/hooks/use-inventory";
import { Search, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockAdjustmentDialog({ open, onOpenChange }: StockAdjustmentDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProductSearchResult | null>(null);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: searchResults } = useProductSearch(query);
  const adjustment = useStockAdjustment();

  function reset() {
    setQuery("");
    setSelected(null);
    setDirection("IN");
    setQuantity("");
    setReason("");
    setError(null);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) return setError("Please select a product");
    const qty = Number(quantity);
    if (!qty || qty <= 0) return setError("Enter a valid quantity");
    if (!reason.trim()) return setError("Please provide a reason");

    try {
      await adjustment.mutateAsync({
        productId: selected.id,
        quantity: qty,
        direction,
        reason: reason.trim(),
      });
      handleClose(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to adjust stock");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Manually correct stock levels for damages, returns, recounts, or other adjustments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product</Label>
            {selected ? (
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <p className="font-medium">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.productCode} · Current stock: {selected.stockQuantity}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search product by name, code or barcode"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {query && (
                  <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                    {(searchResults?.results || []).length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">No products found</p>
                    ) : (
                      searchResults?.results.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelected(p);
                            setQuery("");
                          }}
                          className="block w-full p-2 text-left text-sm hover:bg-slate-50"
                        >
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.productCode} · Stock: {p.stockQuantity}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={direction === "IN" ? "default" : "outline"}
              onClick={() => setDirection("IN")}
              className="justify-start"
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Stock In
            </Button>
            <Button
              type="button"
              variant={direction === "OUT" ? "default" : "outline"}
              onClick={() => setDirection("OUT")}
              className="justify-start"
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Stock Out
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. Damaged stock, Stock recount, Returned by customer"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={adjustment.isPending}>
              {adjustment.isPending ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
