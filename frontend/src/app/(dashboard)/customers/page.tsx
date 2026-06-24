"use client";

import { useState } from "react";
import { Plus, Search, BookOpen, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomerLedgerDialog } from "@/components/customers/customer-ledger-dialog";
import { useCustomers, type Customer } from "@/hooks/use-customers";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [ledgerTarget, setLedgerTarget] = useState<string | null>(null);

  const { data, isLoading } = useCustomers(page, 25);

  const customers = data?.items || [];
  const filtered = search.trim()
    ? customers.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
      )
    : customers;

  function openAddForm() {
    setEditingCustomer(null);
    setFormOpen(true);
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer details, view purchase history and credit ledger
          </p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="h-4 w-4 mr-1" />
          Add Customer
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
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">GST Number</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.address || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.gstNumber || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setLedgerTarget(c.id)}>
                          <BookOpen className="h-3.5 w-3.5 mr-1" />
                          Ledger
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditForm(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} />
      <CustomerLedgerDialog customerId={ledgerTarget} onClose={() => setLedgerTarget(null)} />
    </div>
  );
}
