import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface AnalyticsCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "default" | "warning" | "danger" | "success";
}

const ACCENT_STYLES: Record<string, string> = {
  default: "bg-blue-50 text-blue-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  success: "bg-emerald-50 text-emerald-600",
};

export function AnalyticsCard({ label, value, icon: Icon, accent = "default" }: AnalyticsCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", ACCENT_STYLES[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
