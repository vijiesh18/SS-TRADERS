"use client";

import {
  Package,
  Users,
  Receipt,
  Boxes,
  Wallet,
  Truck,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExportButtons } from "@/components/reports/export-buttons";
import { useDownloadExport, type ExportEntity } from "@/hooks/use-reports";
import type { LucideIcon } from "lucide-react";

const EXPORT_OPTIONS: { entity: ExportEntity; label: string; description: string; icon: LucideIcon }[] = [
  {
    entity: "products",
    label: "Export Products",
    description: "Full product catalog with codes, pricing, GST, and stock levels",
    icon: Package,
  },
  {
    entity: "customers",
    label: "Export Customers",
    description: "Customer directory with contact details and GST numbers",
    icon: Users,
  },
  {
    entity: "invoices",
    label: "Export Invoices",
    description: "All GST invoices with totals, status, and payment method",
    icon: Receipt,
  },
  {
    entity: "inventory",
    label: "Export Inventory",
    description: "Current stock levels and stock valuation by product",
    icon: Boxes,
  },
  {
    entity: "expenses",
    label: "Export Expenses",
    description: "All recorded expenses by category and date",
    icon: Wallet,
  },
  {
    entity: "credit",
    label: "Export Credit Records",
    description: "Customer credit balances, due dates, and settlement status",
    icon: Wallet,
  },
  {
    entity: "suppliers",
    label: "Export Suppliers",
    description: "Supplier directory with outstanding balances",
    icon: Truck,
  },
];

export default function ExportPage() {
  const downloadExport = useDownloadExport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Export</h1>
        <p className="text-sm text-muted-foreground">
          Export your business data in Excel, CSV, or PDF format for backup, accounting, or sharing
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Card key={opt.entity}>
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-2">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{opt.label}</CardTitle>
                <CardDescription>{opt.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ExportButtons
                  isPending={downloadExport.isPending}
                  onDownload={(format) => downloadExport.mutate({ entity: opt.entity, format })}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-50 border-dashed">
        <CardContent className="flex items-start gap-3 p-4">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Note</p>
            <p>
              Data exports reflect the current state of your records. For a full database backup including
              all related data, use the <span className="font-medium">Backup Center</span>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
