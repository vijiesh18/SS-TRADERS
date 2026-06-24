"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className="h-9" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className="h-9" />
      </div>
    </div>
  );
}
