"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/(admin)/components/AdminSidebar";
import { API_URL } from "@/lib/api";
import styles from "./pengguna.module.css";

type AdminUser = { user_id: string; name: string; email: string; role: string };
type UserRow = AdminUser & {
  created_at: string;
  business_name?: string | null;
  status?: string;
};
type RoleCount = { role: string; count: number };
type Pagination = { page: number; limit: number; total: number; totalPages: number };

const ROLE_OPTIONS = [
  { value: "", label: "Semua peranan" },
  { value: "super_admin", label: "Super admin" },
  { value: "admin", label: "Admin" },
  { value: "business_owner", label: "Pemilik perniagaan" },
  { value: "staff", label: "Kakitangan" },
  { value: "user", label: "Pengguna" },
];

function displayRole(role: string) {
  const labels: Record<string, string> = {
    super_admin: "Super admin",
    admin: "Admin",
    business_owner: "Pemilik perniagaan",
    staff: "Kakitangan",
    user: "Pengguna",
  };
  return labels[role] || role;
}

function roleTone(role: string) {
  switch (role) {
    case "super_admin": return styles.roleSuper;
    case "admin": return styles.roleAdmin;
    case "business_owner": return styles.roleOwner;
    case "staff": return styles.roleStaff;
    default: return styles.roleUser;
  }
}

function formatDate(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Baru sahaja";
  if (minutes < 60) return `${minutes} minit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Semalam" : `${days} hari lalu`;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);

  // data
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roleCounts, setRoleCounts] = useState<RoleCount[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // query state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  // ui state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // modals
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");

  const isSuperAdmin = me?.role === "super_admin";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  const authGuard = useCallback(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      router.replace("/login");
      return null;
    }
    try {
      const parsed = JSON.parse(storedUser) as AdminUser;
      if (parsed.role !== "admin" && parsed.role !== "super_admin") {
        router.replace("/home");
        return null;
      }
      setMe(parsed);
      return token;
    } catch {
      router.replace("/login");
      return null;
    }
  }, [router]);

  const fetchUsers = useCallback(
    async (token: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter) params.set("role", roleFilter);

      try {
        const res = await fetch(`${API_URL}/admin/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!res.ok) {
          setLoadError(true);
          if (!opts?.silent) setUsers([]);
          return;
        }

        const data = await res.json();
        const list: UserRow[] = Array.isArray(data) ? data : data.users || [];
        setUsers(list);

        if (!Array.isArray(data) && data.pagination) {
          setPagination({
            page: data.pagination.page ?? page,
            limit: data.pagination.limit ?? 10,
            total: data.pagination.total ?? list.length,
            totalPages:
              data.pagination.totalPages ??
              Math.max(1, Math.ceil((data.pagination.total ?? list.length) / 10)),
          });
        } else {
          setPagination((p) => ({
            ...p,
            page,
            total: list.length,
            totalPages: Math.max(1, Math.ceil(list.length / p.limit)),
          }));
        }

        if (!Array.isArray(data) && Array.isArray(data.roleCounts)) {
          setRoleCounts(data.roleCounts);
        }

        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, roleFilter],
  );

  useEffect(() => {
    const token = authGuard();
    if (!token) return;
    void fetchUsers(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authGuard, page, roleFilter]);

  // debounce search
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const t = setTimeout(() => {
      setPage(1);
      void fetchUsers(token);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalUsers = useMemo(
    () => roleCounts.reduce((sum, r) => sum + Number(r.count || 0), 0),
    [roleCounts],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const refresh = () => {
    const token = localStorage.getItem("token");
    if (token) void fetchUsers(token, { silent: true });
  };

  const submitEdit = async (newRole: string, newName: string) => {
    if (!editUser) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await fetch(`${API_URL}/admin/users/${editUser.user_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName, role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.message || "Gagal mengemas kini pengguna.");
        return;
      }
      setEditUser(null);
      showToast("Perubahan disimpan.");
      refresh();
    } catch {
      setActionError("Ralat rangkaian. Cuba lagi.");
    } finally {
      setActionBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteUser) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await fetch(`${API_URL}/admin/users/${deleteUser.user_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.message || "Gagal memadam pengguna.");
        return;
      }
      setDeleteUser(null);
      showToast("Pengguna dipadam.");
      refresh();
    } catch {
      setActionError("Ralat rangkaian. Cuba lagi.");
    } finally {
      setActionBusy(false);
    }
  };

  const firstName = me?.name?.trim().split(/\s+/)[0] || "Admin";
  const today = new Intl.DateTimeFormat("ms-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className={styles.adminShell}>
      <AdminSidebar isSuperAdmin={isSuperAdmin} onLogout={logout} />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>PENGURUSAN</p>
            <h1>Pengguna</h1>
            <p className={styles.date}>{today}</p>
          </div>
          <div className={styles.profile}>
            <div className={styles.avatar}>{firstName.charAt(0).toUpperCase()}</div>
            <div className={styles.profileCopy}>
              <strong>{me?.name || "Admin"}</strong>
              <span>{isSuperAdmin ? "Super admin" : "Pentadbir"}</span>
            </div>
            <span className={styles.onlineDot} aria-label="Aktif" />
          </div>
        </header>

        {loadError && (
          <div className={styles.errorBanner} role="status">
            Data pengguna tidak dapat dimuatkan. Cuba segarkan semula.
            <button onClick={refresh}>Cuba lagi</button>
          </div>
        )}

        <section className={styles.summaryGrid}>
          <SummaryCard label="Jumlah pengguna" value={totalUsers} hint="Akaun berdaftar" tone="green" />
          {roleCounts.slice(0, 3).map((r, i) => (
            <SummaryCard
              key={r.role}
              label={displayRole(r.role)}
              value={Number(r.count || 0)}
              hint="Akaun aktif"
              tone={i === 0 ? "blue" : i === 1 ? "violet" : "amber"}
            />
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.sectionEyebrow}>SENARAI</span>
              <h2>Semua pengguna</h2>
            </div>
            <div className={styles.headingActions}>
              {refreshing && <span className={styles.refreshDot} />}
              <button className={styles.ghostBtn} onClick={refresh}>
                Segarkan
              </button>
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <SearchIcon />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau e-mel…"
                aria-label="Cari pengguna"
              />
              {search && (
                <button
                  className={styles.clearBtn}
                  onClick={() => setSearch("")}
                  aria-label="Kosongkan carian"
                >
                  ×
                </button>
              )}
            </div>

            <div className={styles.filterWrap}>
              <label htmlFor="role-filter" className={styles.filterLabel}>Peranan</label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : users.length === 0 ? (
            <EmptyState
              title={search || roleFilter ? "Tiada padanan dijumpai" : "Belum ada pengguna"}
              hint={
                search || roleFilter
                  ? "Cuba tukar carian atau penapis peranan."
                  : "Pengguna akan dipaparkan di sini apabila mereka mendaftar."
              }
            />
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Pengguna</th>
                      <th>Peranan</th>
                      <th>Perniagaan</th>
                      <th>Mendaftar</th>
                      <th aria-label="Tindakan" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = u.user_id === me?.user_id;
                      const rowIsSuperAdmin = u.role === "super_admin";
                      // Super admin's role can only be edited by another super admin
                      const canEditRole = isSuperAdmin || !rowIsSuperAdmin;
                      const canDelete = isSuperAdmin && !isSelf;

                      return (
                        <tr key={u.user_id}>
                          <td>
                            <div className={styles.userCell}>
                              <div className={styles.userAvatar}>
                                {(u.name || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.userMeta}>
                                <strong>{u.name || "Pengguna"}</strong>
                                <span>{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.roleBadge} ${roleTone(u.role)}`}>
                              {displayRole(u.role)}
                            </span>
                          </td>
                          <td>
                            <span className={styles.bizCell}>{u.business_name || "—"}</span>
                          </td>
                          <td>
                            <div className={styles.dateCell}>
                              <span>{formatDate(u.created_at)}</span>
                              <small>{timeAgo(u.created_at)}</small>
                            </div>
                          </td>
                          <td className={styles.actionCell}>
                            <button
                              className={styles.iconBtn}
                              onClick={() => {
                                setActionError("");
                                setEditUser(u);
                              }}
                              title="Sunting"
                              aria-label={`Sunting ${u.name}`}
                            >
                              <PencilIcon />
                            </button>

                            {isSuperAdmin && (
                              <button
                                className={`${styles.iconBtn} ${styles.danger}`}
                                onClick={() => {
                                  setActionError("");
                                  setDeleteUser(u);
                                }}
                                disabled={!canDelete}
                                title={
                                  isSelf
                                    ? "Tidak boleh padam akaun sendiri"
                                    : "Padam"
                                }
                                aria-label={`Padam ${u.name}`}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onChange={setPage}
              />
            </>
          )}
        </section>

        <footer className={styles.footer}>
          <span>CostSmart Admin</span>
          <span>Pengurusan pengguna platform</span>
        </footer>
      </main>

      {editUser && (
        <EditModal
          user={editUser}
          busy={actionBusy}
          error={actionError}
          canChangeRole={isSuperAdmin || editUser.role !== "super_admin"}
          onClose={() => !actionBusy && setEditUser(null)}
          onSave={submitEdit}
        />
      )}

      {deleteUser && (
        <ConfirmModal
          title="Padam pengguna?"
          message={`Akaun "${deleteUser.name || deleteUser.email}" akan dipadam secara kekal. Tindakan ini tidak boleh dibatalkan.`}
          busy={actionBusy}
          error={actionError}
          onCancel={() => !actionBusy && setDeleteUser(null)}
          onConfirm={submitDelete}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

/* -------------------- Subcomponents -------------------- */

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: string;
}) {
  return (
    <article className={styles.summaryCard}>
      <span className={`${styles.summaryDot} ${styles[`tone_${tone}`] || ""}`} />
      <div>
        <span className={styles.summaryLabel}>{label}</span>
        <strong>{new Intl.NumberFormat("ms-MY").format(value)}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function TableSkeleton() {
  return (
    <div className={styles.skeletonWrap}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className={styles.skeletonRow} key={i}>
          <span className={styles.skAvatar} />
          <span className={styles.skLine} />
          <span className={styles.skPill} />
          <span className={styles.skLineShort} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyMark}>
        <UsersIcon />
      </span>
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = useMemo(() => {
    const out: (number | "…")[] = [];
    const push = (n: number | "…") => out.push(n);
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages, page + 1);
    if (start > 1) {
      push(1);
      if (start > 2) push("…");
    }
    for (let i = start; i <= end; i++) push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) push("…");
      push(totalPages);
    }
    return out;
  }, [page, totalPages]);

  return (
    <div className={styles.pagination}>
      <span className={styles.pageInfo}>
        Halaman <strong>{page}</strong> daripada <strong>{Math.max(1, totalPages)}</strong> · {total} pengguna
      </span>
      <div className={styles.pageButtons}>
        <button
          className={styles.pageBtn}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className={styles.pageEllipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.pageActive : ""}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          className={styles.pageBtn}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Halaman seterusnya"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

function EditModal({
  user,
  busy,
  error,
  canChangeRole,
  onClose,
  onSave,
}: {
  user: UserRow;
  busy: boolean;
  error: string;
  canChangeRole: boolean;
  onClose: () => void;
  onSave: (role: string, name: string) => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState(user.role || "user");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div className={styles.modalBackdrop} onMouseDown={() => !busy && onClose()}>
      <div
        className={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHead}>
          <div>
            <span className={styles.sectionEyebrow}>SUNTING</span>
            <h3>Kemas kini pengguna</h3>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <label className={styles.field}>
            <span>Nama</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>E-mel</span>
            <input value={user.email} disabled readOnly />
          </label>

          <label className={styles.field}>
            <span>Peranan</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={busy || !canChangeRole}
              title={
                !canChangeRole
                  ? "Hanya Super Admin boleh menukar peranan Super Admin."
                  : undefined
              }
            >
              {ROLE_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {!canChangeRole && (
            <p className={styles.confirmText} style={{ margin: 0 }}>
              Peranan Super Admin tidak boleh diubah oleh Admin biasa.
            </p>
          )}

          {error && <div className={styles.modalError}>{error}</div>}
        </div>

        <div className={styles.modalFoot}>
          <button className={styles.ghostBtn} onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button
            className={styles.primaryBtn}
            onClick={() => onSave(role, name.trim())}
            disabled={busy || !name.trim()}
          >
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={styles.modalBackdrop} onMouseDown={() => !busy && onCancel()}>
      <div
        className={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className={styles.modalHead}>
          <div>
            <span className={styles.sectionEyebrow}>PENGESAHAN</span>
            <h3>{title}</h3>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onCancel}
            disabled={busy}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmText}>{message}</p>
          {error && <div className={styles.modalError}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={styles.ghostBtn} onClick={onCancel} disabled={busy}>
            Batal
          </button>
          <button className={styles.dangerBtn} onClick={onConfirm} disabled={busy}>
            {busy ? "Memadam…" : "Padam"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Icons -------------------- */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const UsersIcon = () => (
  <Icon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);
const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
const PencilIcon = () => (
  <Icon>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);
const TrashIcon = () => (
  <Icon>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Icon>
);
const ChevronLeft = () => (
  <Icon>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);
const ChevronRight = () => (
  <Icon>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);