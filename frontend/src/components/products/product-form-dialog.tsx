"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
  useBrands,
  type Product,
  type ProductFormValues,
} from "@/hooks/use-products";

const UNITS = ["PCS", "CAN", "BAG", "LTR", "KG", "BOX", "ROLL"];

const EMPTY_FORM: ProductFormValues = {
  productCode: "",
  barcode: "",
  name: "",
  brandId: "",
  categoryId: "",
  subcategoryId: "",
  hsnCode: "",
  gstPercentage: 18,
  unit: "PCS",
  variant: "",
  shadeCode: "",
  shadeName: "",
  purchasePrice: 0,
  sellingPrice: 0,
  stockQuantity: 0,
  minimumStock: 5,
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const isEdit = !!product;
  const selectedCategory = categories?.items.find((c) => c.id === form.categoryId);

  useEffect(() => {
    if (product) {
      setForm({
        productCode: product.productCode,
        barcode: product.barcode || "",
        name: product.name,
        brandId: product.brandId || "",
        categoryId: product.categoryId || "",
        subcategoryId: product.subcategoryId || "",
        hsnCode: product.hsnCode || "",
        gstPercentage: Number(product.gstPercentage),
        unit: product.unit,
        variant: product.variant || "",
        shadeCode: product.shadeCode || "",
        shadeName: product.shadeName || "",
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        stockQuantity: Number(product.stockQuantity),
        minimumStock: Number(product.minimumStock),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [product, open]);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: ProductFormValues = {
      ...form,
      barcode: form.barcode || undefined,
      brandId: form.brandId || undefined,
      categoryId: form.categoryId || undefined,
      subcategoryId: form.subcategoryId || undefined,
      hsnCode: form.hsnCode || undefined,
      variant: form.variant || undefined,
      shadeCode: form.shadeCode || undefined,
      shadeName: form.shadeName || undefined,
    };

    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.error?.formErrors?.[0] || err?.response?.data?.error || "Failed to save product");
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Code *</Label>
              <Input value={form.productCode} onChange={(e) => update("productCode", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => update("barcode", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select value={form.brandId} onValueChange={(v) => update("brandId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands?.items.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => update("unit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => update("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.items.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subcategory</Label>
              <Select value={form.subcategoryId} onValueChange={(v) => update("subcategoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory?.subcategories?.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Variant</Label>
              <Input placeholder="e.g. 20L" value={form.variant} onChange={(e) => update("variant", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Shade Code</Label>
              <Input value={form.shadeCode} onChange={(e) => update("shadeCode", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Shade Name</Label>
              <Input value={form.shadeName} onChange={(e) => update("shadeName", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>HSN Code</Label>
              <Input value={form.hsnCode} onChange={(e) => update("hsnCode", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>GST %</Label>
              <Input
                type="number"
                value={form.gstPercentage}
                onChange={(e) => update("gstPercentage", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => update("purchasePrice", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Selling Price *</Label>
              <Input
                type="number"
                value={form.sellingPrice}
                onChange={(e) => update("sellingPrice", Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={form.stockQuantity}
                onChange={(e) => update("stockQuantity", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum Stock Level</Label>
              <Input
                type="number"
                value={form.minimumStock}
                onChange={(e) => update("minimumStock", Number(e.target.value))}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
