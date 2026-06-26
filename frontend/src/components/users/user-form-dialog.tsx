"use client";

import { useEffect, useState } from "react";
import { X, UserCog, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreateUser, useUpdateUser, type AppUser } from "@/hooks/use-users";
import type { Role } from "@/store/auth-store";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "ADMIN", label: "Admin", description: "Full access, exports, backups, user management" },
  { value: "STAFF", label: "Staff", description: "Billing, customers, inventory view, estimates" },
  { value: "ACCOUNTANT", label: "Accountant", description: "Reports, GST, credit, profit reports" },
];

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AppUser | null;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [error, setError] = useState<string | null>(null);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEdit = !!user;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || "");
      setRole(user.role);
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("STAFF");
      setPassword("");
    }
    setError(null);
  }, [user, open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onOpenChange]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({
          id: user.id,
          name,
          phone: phone || undefined,
          role,
          password: password || undefined,
        });
      } else {
        if (!password || password.length < 6) return setError("Password must be at least 6 characters");
        await createUser.mutateAsync({ name, email, phone: phone || undefined, password, role });
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save user");
    }
  }

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="dialog-head">
            <div className="dialog-head-icon">
              {isEdit ? <UserCog size={18} /> : <UserPlus size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="dialog-head-title">{isEdit ? "Edit User" : "Add User"}</p>
              <p className="dialog-head-sub">{isEdit ? "Update account details & role" : "Create a new staff or admin account"}</p>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="dialog-close" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isEdit} />
              {isEdit && <p className="text-xs text-muted-foreground">Email cannot be changed</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLES.find((r) => r.value === role)?.description}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>{isEdit ? "New Password (optional)" : "Password *"}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Leave blank to keep current password" : "Minimum 6 characters"}
                required={!isEdit}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
