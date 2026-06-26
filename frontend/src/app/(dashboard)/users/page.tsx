"use client";

import { useState } from "react";
import { Plus, Pencil, UserX, UserCheck, Users, Phone, Calendar } from "lucide-react";
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
  title: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: "#2c2418", lineHeight: 1.2 } as React.CSSProperties,
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

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span style={S.badge("rgba(107,124,69,0.14)", "#4a5e28")}>Active</span>
    : <span style={S.badge("rgba(180,155,110,0.14)", "#6b5d4a")}>Inactive</span>;
}

// Confirmation before activating / deactivating an account
function ConfirmDialog({ user, onConfirm, onClose, pending }: { user: AppUser; onConfirm: () => void; onClose: () => void; pending: boolean }) {
  const deactivating = user.isActive;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div style={{ ...S.card, width: "100%", maxWidth: 380, padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#2c2418", marginBottom: 6 }}>
          {deactivating ? "Deactivate user?" : "Activate user?"}
        </p>
        <p style={{ fontSize: 13, color: "#6b5d4a", lineHeight: 1.5, marginBottom: 18 }}>
          {deactivating
            ? <>This will block <b>{user.name}</b> from logging in. You can reactivate them anytime.</>
            : <>This will restore login access for <b>{user.name}</b>.</>}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={{ ...S.btnGhost, padding: "9px 16px" }} onClick={onClose}>Cancel</button>
          <button
            style={{ ...S.btnPrimary, padding: "9px 16px", background: deactivating ? "linear-gradient(135deg,#c0552a,#d4623a)" : undefined, boxShadow: deactivating ? "0 4px 14px rgba(192,85,42,0.3)" : S.btnPrimary.boxShadow }}
            onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : deactivating ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AppUser | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "ADMIN";
  const isDemo = !!currentUser?.isDemo;

  // In the public demo, mask real contact details
  const showEmail = (email: string) => (isDemo ? "••••••@••••••" : email);
  const showPhone = (phone?: string | null) => (isDemo ? "••••••••" : phone || "-");

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
  function confirmToggle() {
    if (!confirmTarget) return;
    const user = confirmTarget;
    if (user.isActive) {
      deactivateUser.mutate(user.id, { onSuccess: () => setConfirmTarget(null) });
    } else {
      updateUser.mutate({ id: user.id, isActive: true }, { onSuccess: () => setConfirmTarget(null) });
    }
  }

  const togglePending = deactivateUser.isPending || updateUser.isPending;

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

      {/* ── Desktop: table ── */}
      <div style={S.card} className="users-table-card">
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
                <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
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
                      <td style={{ ...S.td, fontWeight: 600 }}>{u.name}{u.id === currentUser?.id && <span style={{ ...S.badge("rgba(180,155,110,0.14)", "#6b5d4a"), marginLeft: 8 }}>You</span>}</td>
                      <td style={S.td}>{showEmail(u.email)}</td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{showPhone(u.phone)}</td>
                      <td style={S.td}><span style={S.badge(rbg, rc)}>{u.role}</span></td>
                      <td style={S.td}><StatusBadge active={u.isActive} /></td>
                      <td style={{ ...S.td, color: "#a8937a" }}>{formatDate(u.createdAt)}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button style={S.btnGhost} onClick={() => openEditForm(u)} title="Edit user">
                            <Pencil size={13} /> Edit
                          </button>
                          {u.id !== currentUser?.id && (
                            <button style={S.btnGhost} onClick={() => setConfirmTarget(u)} title={u.isActive ? "Deactivate" : "Activate"}>
                              {u.isActive ? <UserX size={13} color="#c0552a" /> : <UserCheck size={13} color="#4a5e28" />}
                              {u.isActive ? "Deactivate" : "Activate"}
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

      {/* ── Mobile: card list ── */}
      <div className="users-card-view" style={{ display: "none", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          <div style={{ ...S.card, padding: 24, textAlign: "center", color: "#a8937a", fontSize: 13 }}>Loading users…</div>
        ) : !users || users.length === 0 ? (
          <div style={{ ...S.card, padding: 24, textAlign: "center", color: "#a8937a", fontSize: 13 }}>No users found.</div>
        ) : (
          users.map((u) => {
            const [rbg, rc] = ROLE_BADGE[u.role] || ROLE_BADGE.STAFF;
            const isSelf = u.id === currentUser?.id;
            return (
              <div key={u.id} style={{ ...S.card, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "#2c2418", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {u.name}
                      {isSelf && <span style={S.badge("rgba(180,155,110,0.14)", "#6b5d4a")}>You</span>}
                    </p>
                    <p style={{ fontSize: 12, color: "#a8937a", marginTop: 2, wordBreak: "break-all" }}>{showEmail(u.email)}</p>
                  </div>
                  <span style={S.badge(rbg, rc)}>{u.role}</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, color: "#6b5d4a" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} color="#a8937a" /> {showPhone(u.phone)}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} color="#a8937a" /> {formatDate(u.createdAt)}</span>
                  <StatusBadge active={u.isActive} />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.btnGhost, flex: 1, justifyContent: "center", padding: "10px" }} onClick={() => openEditForm(u)}>
                    <Pencil size={14} /> Edit
                  </button>
                  {!isSelf && (
                    <button style={{ ...S.btnGhost, flex: 1, justifyContent: "center", padding: "10px", color: u.isActive ? "#c0552a" : "#4a5e28" }} onClick={() => setConfirmTarget(u)}>
                      {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />
      {confirmTarget && (
        <ConfirmDialog user={confirmTarget} pending={togglePending} onClose={() => setConfirmTarget(null)} onConfirm={confirmToggle} />
      )}
    </div>
  );
}
