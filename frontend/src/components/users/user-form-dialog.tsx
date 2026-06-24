"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
