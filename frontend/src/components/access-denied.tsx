import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AccessDenied({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground max-w-md">
          {message || "This section is only available to Admin users."}
        </p>
      </CardContent>
    </Card>
  );
}
