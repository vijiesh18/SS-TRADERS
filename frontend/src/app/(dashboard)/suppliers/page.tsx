"use client";

import { useState } from "react";
import { Plus, Search, BookOpen, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SupplierHistoryDialog } from "@/components/suppliers/supplier-history-dialog";
import { useSuppliers, type Supplier } from "@/hooks/use-suppliers";
import { formatCurrency } from "@/lib/utils";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);

  const { data: suppliers, isLoading } = useSuppliers();

  const filtered = (suppliers || []).filter(
    (s) =>
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search))
  );

  function openAddForm() {
    setEditingSupplier(null);
    setFormOpen(true);
  }

  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage supplier directory and track outstanding balances
          </p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="h-4 w-4 mr-1" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">GST Number</th>
                <th className="px-4 py-3 text-right">Outstanding Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading suppliers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const outstanding = Number(s.outstandingBalance);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3">{s.phone || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.gstNumber || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {outstanding > 0 ? (
                          <Badge variant="warning">{formatCurrency(outstanding)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{formatCurrency(0)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(s.id)}>
                            <BookOpen className="h-3.5 w-3.5 mr-1" />
                            History
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditForm(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editingSupplier} />
      <SupplierHistoryDialog supplierId={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}
