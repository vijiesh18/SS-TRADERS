"use client";

import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, FileDown } from "lucide-react";
import type { ExportFormat } from "@/hooks/use-reports";

interface ExportButtonsProps {
  onDownload: (format: ExportFormat) => void;
  isPending?: boolean;
}

export function ExportButtons({ onDownload, isPending }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => onDownload("pdf")}>
        <FileText className="h-3.5 w-3.5 mr-1" />
        PDF
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => onDownload("excel")}>
        <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
        Excel
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => onDownload("csv")}>
        <FileDown className="h-3.5 w-3.5 mr-1" />
        CSV
      </Button>
    </div>
  );
}
