import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Icon className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            This module is part of the S.S Traders Smart POS scaffold. The backend API endpoints are
            implemented — connect this page to the corresponding API to complete the UI.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
