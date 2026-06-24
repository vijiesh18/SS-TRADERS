"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { AnalyticsCard } from "@/components/dashboard/analytics-card";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { useExpenses, useDeleteExpense, EXPENSE_CATEGORIES } from "@/hooks/use-expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet } from "lucide-react";

function defaultFrom() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_COLORS: Record<string, "secondary" | "warning" | "success" | "destructive" | "default"> = {
  Salary: "default",
  Rent: "secondary",
  Electricity: "warning",
  Transport: "success",
  Miscellaneous: "destructive",
};

export default function ExpensesPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [category, setCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useExpenses({
    from: new Date(from).toISOString(),
    to: new Date(new Date(to).setHours(23, 59, 59)).toISOString(),
    category: category !== "all" ? category : undefined,
  });
  const deleteExpense = useDeleteExpense();

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of data?.items || []) {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track salary, rent, electricity, transport and miscellaneous expenses
          </p>
        </div>
        <div className="flex items-end gap-3">
          <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          label="Total Expenses (period)"
          value={isLoading ? "..." : formatCurrency(data?.totalAmount || 0)}
          icon={Wallet}
          accent="danger"
        />
        {breakdown.slice(0, 3).map(([cat, amt]) => (
          <AnalyticsCard key={cat} label={cat} value={formatCurrency(amt)} icon={Receipt} />
        ))}
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Entered By</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading expenses...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No expenses recorded for this period.
                  </td>
                </tr>
              ) : (
                data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(e.expenseDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={CATEGORY_COLORS[e.category] || "secondary"}>{e.category}</Badge>
                    </td>
                    <td className="px-4 py-3">{e.description || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.enteredBy.name}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => deleteExpense.mutate(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
