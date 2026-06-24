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
import { useCreateCustomer, useUpdateCustomer, type Customer, type CustomerFormValues } from "@/hooks/use-customers";

const EMPTY_FORM: CustomerFormValues = { name: "", phone: "", address: "", gstNumber: "" };

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEdit = !!customer;

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone,
        address: customer.address || "",
        gstNumber: customer.gstNumber || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [customer, open]);

  function update<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      ...form,
      address: form.address || undefined,
      gstNumber: form.gstNumber || undefined,
    };

    try {
      if (isEdit && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save customer");
    }
  }

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required minLength={10} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>GST Number</Label>
            <Input value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
