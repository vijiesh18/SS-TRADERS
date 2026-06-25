"use client";

import { useState } from "react";
import { Plus, Pencil, UserX, UserCheck, Users } from "lucide-react";
import { AccessDenied } from "@/components/access-denied";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { useUsers, useUpdateUser, useDeactivateUser, type AppUser } from "@/hooks/use-users";
import { useAuthStore } from "@/store/auth-store";
import { formatDate } from "@/lib/utils";

const ROLE_BADGE: Record<string, [string, string]> = {
  ADMIN: ["rgba(107,124,69,0.14)", "#4a5e28"],
  STAFF: ["rgba(180,155,110,0.14)", "#6b5d4a"],
  ACCOUNTANT: ["rgba(196,122,58,0.14)", "#8a4a10"],
};

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const },
  title: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#a8937a", marginTop: 5, fontWeight: 500 } as React.CSSProperties,
  card: { background: "rgba(250,247,242,0.95)", border: "1px solid rgba(180,155,110,0.22)", borderRadius: 14, boxShadow: "0 4px 20px rgba(100,80,40,0.07), inset 0 1px 0 rgba(255,255,255,0.8)", overflow: "hidden" } as React.CSSProperties,
  cardHeader: { background: "#2c2820", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  cardHeaderText: { fontSize: 13, fontWeight: 700, color: "rgba(245,240,230,0.92)" } as React.CSSProperties,
  th: { padding: "12px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "rgba(220,205,180,0.85)", whiteSpace: "nowrap" as const, textAlign: "left" as const, background: "#2c2820" } as React.CSSProperties,
  td: { padding: "12px 16px", fontSize: 13, color: "#2c2418", borderBottom: "1px solid rgba(180,155,110,0.10)" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6b7c45,#8fa05a)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(107,124,69,0.30)", whiteSpace: "nowrap" as const } as React.CSSProperties,
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(180,155,110,0.25)", background: "rgba(180,155,110,0.06)", color: "#6b5d4a", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  badge: (bg: string, c: string): React.CSSProperties => ({ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: c }),
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
      <div style={S.page}>
        <div>
          <h1 style={S.title}>Users</h1>
          <p style={S.subtitle}>Manage Admin, Staff and Accountant accounts</p>
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
    if (user.isActive) deactivateUser.mutate(user.id);
    else updateUser.mutate({ id: user.id, isActive: true });
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Users</h1>
          <p style={S.subtitle}>Manage Admin, Staff and Accountant accounts</p>
        </div>
        <button style={S.btnPrimary} onClick={openAddForm}>
          <Plus size={15} /> Add User
        </button>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>
          <Users size={14} color="rgba(180,155,110,0.8)" />
          <span style={S.cardHeaderText}>Access Management</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Email</th>
                <th style={S.th}>Phone</th>
                <th style={S.th}>Role</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Created</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>Loading users...</td></tr>
              ) : !users || users.length === 0 ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "40px", color: "#a8937a" }}>No users found.</td></tr>
              ) : (
                users.map((u) => {
                  const [rbg, rc] = ROLE_BADGE[u.role] || ROLE_BADGE.STAFF;
                  return (
                    <tr key={u.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(180,155,110,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...S.td, fontWeight: 600 }}>{u.name}</td>
                      <td style={S.td}>{u.email}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{u.phone || "-"}</td>
                      <td style={S.td}><span style={S.badge(rbg, rc)}>{u.role}</span></td>
                      <td style={S.td}>
                        {u.isActive
                          ? <span style={S.badge("rgba(107,124,69,0.14)", "#4a5e28")}>Active</span>
                          : <span style={S.badge("rgba(180,155,110,0.14)", "#6b5d4a")}>Inactive</span>}
                      </td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{formatDate(u.createdAt)}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button style={S.btnGhost} onClick={() => openEditForm(u)}>
                            <Pencil size={13} />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button style={S.btnGhost} onClick={() => toggleActive(u)} title={u.isActive ? "Deactivate" : "Activate"}>
                              {u.isActive ? <UserX size={13} color="#c0552a" /> : <UserCheck size={13} color="#4a5e28" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />
    </div>
  );
}