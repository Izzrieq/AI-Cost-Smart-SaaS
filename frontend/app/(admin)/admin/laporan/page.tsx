"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/(admin)/components/AdminSidebar";
import { API_URL } from "@/lib/api";
import styles from "./laporan.module.css";

type AdminUser = { user_id: string; name: string; email: string; role: string };

type Report = {
  report_id: number;
  user_id?: string | null;
  type: "bug" | "feedback" | "feature" | "other";
  title: string;
  description: string;
  status: "pending" | "reviewing" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolution_note?: string | null;
  user_name?: string | null;
  user_email?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Baharu",
  reviewing: "Disemak",
  resolved: "Selesai",
  closed: "Ditutup",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Rendah",
  medium: "Sederhana",
  high: "Tinggi",
  critical: "Kritikal",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feedback: "Maklum balas",
  feature: "Cadangan",
  other: "Lain-lain",
};

function timeAgo(value: string) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "—";
  const m = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (m < 1) return "Baru sahaja";
  if (m < 60) return `${m} minit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Semalam" : `${d} hari lalu`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [active, setActive] = useState<Report | null>(null);
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

  const fetchReports = useCallback(
    async (token: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      params.set("limit", "100");
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      try {
        const res = await fetch(`${API_URL}/admin/reports?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          setLoadError(true);
          if (!opts?.silent) setReports([]);
          return;
        }
        const data = await res.json();
        setReports(data.reports || []);

        // backend returns `counts` as [{status, count}] + `priorityCounts` [{priority, count}]
        const c: Record<string, number> = {};
        (data.counts || []).forEach((r: { status: string; count: number }) => {
          c[r.status] = Number(r.count);
        });
        setCounts(c);
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, typeFilter, priorityFilter],
  );

  useEffect(() => {
    const token = authGuard();
    if (!token) return;
    void fetchReports(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authGuard, statusFilter, typeFilter, priorityFilter]);

  const refresh = () => {
    const token = localStorage.getItem("token");
    if (token) void fetchReports(token, { silent: true });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.user_name || "").toLowerCase().includes(q) ||
        (r.user_email || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q),
    );
  }, [reports, search]);

  const totalAll = Object.values(counts).reduce((s, n) => s + n, 0);

  const updateReport = async (
    reportId: number,
    patch: Partial<Pick<Report, "status" | "priority" | "resolution_note">>,
  ) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.message || "Gagal mengemas kini laporan.");
        return;
      }
      const data = await res.json();
      // update local list
      setReports((prev) =>
        prev.map((r) =>
          r.report_id === reportId ? { ...r, ...data.report } : r,
        ),
      );
      setActive((cur) => (cur && cur.report_id === reportId ? { ...cur, ...data.report } : cur));
      showToast("Laporan dikemaskini.");
      // refresh counts
      refresh();
    } catch {
      setActionError("Ralat rangkaian. Cuba lagi.");
    } finally {
      setActionBusy(false);
    }
  };

  const deleteReport = async (reportId: number) => {
    if (!isSuperAdmin) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.message || "Gagal memadam laporan.");
        return;
      }
      setReports((prev) => prev.filter((r) => r.report_id !== reportId));
      setActive(null);
      showToast("Laporan dipadam.");
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
            <p className={styles.eyebrow}>MAKLUM BALAS</p>
            <h1>Laporan</h1>
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
            Data laporan tidak dapat dimuatkan. Cuba segarkan semula.
            <button onClick={refresh}>Cuba lagi</button>
          </div>
        )}

        <section className={styles.summaryGrid}>
          <SummaryCard label="Jumlah laporan" value={totalAll} tone="green" />
          <SummaryCard label="Baharu" value={counts.pending || 0} tone="amber" />
          <SummaryCard label="Disemak" value={counts.reviewing || 0} tone="blue" />
          <SummaryCard label="Selesai" value={counts.resolved || 0} tone="violet" />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.sectionEyebrow}>SENARAI</span>
              <h2>Semua laporan</h2>
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
                placeholder="Cari tajuk, pengguna, keterangan…"
                aria-label="Cari laporan"
              />
              {search && (
                <button className={styles.clearBtn} onClick={() => setSearch("")}>
                  ×
                </button>
              )}
            </div>

            <select
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Status"
            >
              <option value="">Semua status</option>
              <option value="pending">Baharu</option>
              <option value="reviewing">Disemak</option>
              <option value="resolved">Selesai</option>
              <option value="closed">Ditutup</option>
            </select>

            <select
              className={styles.select}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Jenis"
            >
              <option value="">Semua jenis</option>
              <option value="bug">Bug</option>
              <option value="feedback">Maklum balas</option>
              <option value="feature">Cadangan</option>
              <option value="other">Lain-lain</option>
            </select>

            <select
              className={styles.select}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Keutamaan"
            >
              <option value="">Semua keutamaan</option>
              <option value="critical">Kritikal</option>
              <option value="high">Tinggi</option>
              <option value="medium">Sederhana</option>
              <option value="low">Rendah</option>
            </select>
          </div>

          {loading ? (
            <SkeletonList />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={search || statusFilter || typeFilter || priorityFilter ? "Tiada padanan" : "Tiada laporan"}
              hint={
                search || statusFilter || typeFilter || priorityFilter
                  ? "Cuba tukar penapis atau kata kunci carian."
                  : "Laporan pengguna akan muncul di sini."
              }
            />
          ) : (
            <div className={styles.list}>
              {filtered.map((r) => (
                <button
                  key={r.report_id}
                  className={styles.row}
                  onClick={() => {
                    setActionError("");
                    setActive(r);
                  }}
                >
                  <span className={`${styles.typeIcon} ${styles[`type_${r.type}`]}`}>
                    {r.type === "bug" ? <BugIcon /> : r.type === "feature" ? <SparkIcon /> : r.type === "feedback" ? <ChatIcon /> : <FileIcon />}
                  </span>

                  <div className={styles.rowBody}>
                    <div className={styles.rowTitle}>
                      <strong>{r.title}</strong>
                      <span className={`${styles.priorityBadge} ${styles[`priority_${r.priority}`]}`}>
                        {PRIORITY_LABELS[r.priority]}
                      </span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{r.user_name || r.user_email || "Pengguna"}</span>
                      <span>·</span>
                      <span>{TYPE_LABELS[r.type]}</span>
                      <span>·</span>
                      <span>{timeAgo(r.created_at)}</span>
                    </div>
                  </div>

                  <span className={`${styles.statusBadge} ${styles[`status_${r.status}`]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>

                  <span className={styles.rowArrow}>
                    <ChevronRight />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <span>CostSmart Admin</span>
          <span>Pengurusan laporan & maklum balas</span>
        </footer>
      </main>

      {active && (
        <ReportDetailModal
          report={active}
          busy={actionBusy}
          error={actionError}
          isSuperAdmin={isSuperAdmin}
          onClose={() => !actionBusy && setActive(null)}
          onUpdate={(patch) => updateReport(active.report_id, patch)}
          onDelete={() => deleteReport(active.report_id)}
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
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "blue" | "violet";
}) {
  return (
    <article className={styles.summaryCard}>
      <span className={`${styles.summaryDot} ${styles[`tone_${tone}`]}`} />
      <div>
        <span className={styles.summaryLabel}>{label}</span>
        <strong>{new Intl.NumberFormat("ms-MY").format(value)}</strong>
      </div>
    </article>
  );
}

function SkeletonList() {
  return (
    <div className={styles.list}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className={styles.skRow} key={i}>
          <span className={styles.skIcon} />
          <span className={styles.skLines} />
          <span className={styles.skPill} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyMark}><ChatIcon /></span>
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}

function ReportDetailModal({
  report,
  busy,
  error,
  isSuperAdmin,
  onClose,
  onUpdate,
  onDelete,
}: {
  report: Report;
  busy: boolean;
  error: string;
  isSuperAdmin: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<Pick<Report, "status" | "priority" | "resolution_note">>) => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState(report.status);
  const [priority, setPriority] = useState(report.priority);
  const [note, setNote] = useState(report.resolution_note || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const dirty =
    status !== report.status ||
    priority !== report.priority ||
    note !== (report.resolution_note || "");

  return (
    <div className={styles.modalBackdrop} onMouseDown={() => !busy && onClose()}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHead}>
          <div className={styles.modalHeadTop}>
            <span className={`${styles.typeIcon} ${styles[`type_${report.type}`]}`}>
              {report.type === "bug" ? <BugIcon /> : report.type === "feature" ? <SparkIcon /> : report.type === "feedback" ? <ChatIcon /> : <FileIcon />}
            </span>
            <div className={styles.modalHeadText}>
              <span className={styles.sectionEyebrow}>LAPORAN #{report.report_id}</span>
              <h3>{report.title}</h3>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={busy} aria-label="Tutup">×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.metaGrid}>
            <div><span>Pengguna</span><strong>{report.user_name || report.user_email || "Pengguna"}</strong></div>
            <div><span>Jenis</span><strong>{TYPE_LABELS[report.type]}</strong></div>
            <div><span>Dicipta</span><strong>{formatDate(report.created_at)}</strong></div>
            {report.resolved_at && (
              <div><span>Selesai</span><strong>{formatDate(report.resolved_at)}</strong></div>
            )}
            {report.resolved_by_name && (
              <div><span>Diselesaikan oleh</span><strong>{report.resolved_by_name}</strong></div>
            )}
          </div>

          <div className={styles.description}>
            <span className={styles.fieldLabel}>Keterangan</span>
            <p>{report.description}</p>
          </div>

          <div className={styles.controlGrid}>
            <label className={styles.field}>
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as Report["status"])} disabled={busy}>
                <option value="pending">Baharu</option>
                <option value="reviewing">Disemak</option>
                <option value="resolved">Selesai</option>
                <option value="closed">Ditutup</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Keutamaan</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Report["priority"])} disabled={busy}>
                <option value="low">Rendah</option>
                <option value="medium">Sederhana</option>
                <option value="high">Tinggi</option>
                <option value="critical">Kritikal</option>
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Nota penyelesaian</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambah nota untuk rujukan akan datang…"
              disabled={busy}
            />
          </label>

          {error && <div className={styles.modalError}>{error}</div>}
        </div>

        <div className={styles.modalFoot}>
          <div className={styles.modalFootLeft}>
            {isSuperAdmin && !confirmDelete && (
              <button className={styles.dangerLink} onClick={() => setConfirmDelete(true)} disabled={busy}>
                Padam laporan
              </button>
            )}
            {isSuperAdmin && confirmDelete && (
              <div className={styles.confirmInline}>
                <span>Padam kekal?</span>
                <button className={styles.dangerBtn} onClick={onDelete} disabled={busy}>
                  {busy ? "Memadam…" : "Ya, padam"}
                </button>
                <button className={styles.ghostBtn} onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Batal
                </button>
              </div>
            )}
          </div>
          <div className={styles.modalFootRight}>
            <button className={styles.ghostBtn} onClick={onClose} disabled={busy}>
              Tutup
            </button>
            <button
              className={styles.primaryBtn}
              onClick={() => onUpdate({ status, priority, resolution_note: note.trim() })}
              disabled={busy || !dirty}
            >
              {busy ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Icons -------------------- */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const BugIcon = () => (
  <Icon>
    <path d="m8 8-2-2m10 2 2-2M9 3l1.5 3m4-3L13 6M3 13h3m12 0h3M5 19l2-2m10 0 2 2" />
    <rect x="7" y="7" width="10" height="14" rx="5" />
    <path d="M12 8v12m-5-8h5m5 0h-5m-5 4h5m5 0h-5" />
  </Icon>
);
const SparkIcon = () => (
  <Icon>
    <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
  </Icon>
);
const ChatIcon = () => (
  <Icon>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.9 7.3L3 20l1.2-4.4A8.5 8.5 0 1 1 21 11.5Z" />
    <path d="M8 11h8m-8 4h5" />
  </Icon>
);
const FileIcon = () => (
  <Icon>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
    <path d="M14 3v6h6M8 13h8M8 17h5" />
  </Icon>
);
const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
const ChevronRight = () => (
  <Icon>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);