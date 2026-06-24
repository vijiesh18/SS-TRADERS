"use client";

import { useState } from "react";
import { Plus, Pencil, UserX, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/access-denied";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { useUsers, useUpdateUser, useDeactivateUser, type AppUser } from "@/hooks/use-users";
import { useAuthStore } from "@/store/auth-store";
import { formatDate } from "@/lib/utils";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  STAFF: "secondary",
  ACCOUNTANT: "outline",
};

export default function UsersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";

  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage Admin, Staff and Accountant accounts</p>
        </div>
        <AccessDenied message="Only Admin users can manage user accounts." />
      </div>
    );
  }

  function openAddForm() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function openEditForm(user: AppUser) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function toggleActive(user: AppUser) {
    if (user.isActive) {
      deactivateUser.mutate(user.id);
    } else {
      updateUser.mutate({ id: user.id, isActive: true });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage Admin, Staff and Accountant accounts</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="h-4 w-4 mr-1" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : !users || users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "secondary"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditForm(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {u.id !== currentUser?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => toggleActive(u)}
                            title={u.isActive ? "Deactivate" : "Activate"}
                          >
                            {u.isActive ? (
                              <UserX className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />
    </div>
  );
}
