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
import { useCreateSupplier, useUpdateSupplier, type Supplier, type SupplierFormValues } from "@/hooks/use-suppliers";

const EMPTY_FORM: SupplierFormValues = { name: "", phone: "", gstNumber: "", address: "" };

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  const [form, setForm] = useState<SupplierFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEdit = !!supplier;

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        phone: supplier.phone || "",
        gstNumber: supplier.gstNumber || "",
        address: supplier.address || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [supplier, open]);

  function update<K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      ...form,
      phone: form.phone || undefined,
      gstNumber: form.gstNumber || undefined,
      address: form.address || undefined,
    };

    try {
      if (isEdit && supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...payload });
      } else {
        await createSupplier.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save supplier");
    }
  }

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>GST Number</Label>
            <Input value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
