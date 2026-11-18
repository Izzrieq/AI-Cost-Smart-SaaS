"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/app/(admin)/components/AdminSidebar";
import { API_URL } from "@/lib/api";
import styles from "./dashboard.module.css";

type AdminUser = { user_id: string; name: string; email: string; role: string };
type RoleCount = { role: string; count: number };
type RecentUser = AdminUser & { created_at: string };
type DashboardStats = {
  totalUsers: number;
  usersByRole: RoleCount[];
  totalProducts: number;
  totalCost: number;
  avgMargin: number;
  totalBusinesses: number;
  recentUsers: RecentUser[];
};
type DailyReport = {
  resetIn: string;
  resetInMs: number;
  newBusinesses: number;
  newProducts: number;
  newUsers: number;
  newReports: number;
  totalActivities: number;
};
type Feedback = {
  report_id: number;
  type: string;
  title: string;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
};

const emptyStats: DashboardStats = {
  totalUsers: 0,
  usersByRole: [],
  totalProducts: 0,
  totalCost: 0,
  avgMargin: 0,
  totalBusinesses: 0,
  recentUsers: [],
};

async function getJson<T>(url: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ms-MY").format(Number(value) || 0);
}

function formatMoney(value: number) {
  return `RM ${new Intl.NumberFormat("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;
}

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Masa tidak diketahui";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Baru sahaja";
  if (minutes < 60) return `${minutes} minit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Semalam" : `${days} hari lalu`;
}

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

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [reports, setReports] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";

  const loadDashboard = useCallback(async (token: string) => {
    const [statsData, dailyData, reportsData] = await Promise.all([
      getJson<DashboardStats>(`${API_URL}/admin/dashboard-stats`, token),
      getJson<DailyReport>(`${API_URL}/admin/daily-report`, token),
      getJson<{ reports?: Feedback[] }>(`${API_URL}/admin/reports?limit=5`, token),
    ]);
    if (statsData) setStats({ ...emptyStats, ...statsData });
    setDaily(dailyData);
    setReports(reportsData?.reports || []);
    setLoadError(!statsData && !dailyData && !reportsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(storedUser) as AdminUser;
      if (parsed.role !== "admin" && parsed.role !== "super_admin") {
        router.replace("/home");
        return;
      }
      setUser(parsed);
      void loadDashboard(token);
    } catch {
      router.replace("/login");
    }
  }, [loadDashboard, router]);

  const roleTotal = useMemo(
    () => stats.usersByRole.reduce((total, item) => total + Number(item.count || 0), 0),
    [stats.usersByRole],
  );
  const roleGradient = useMemo(() => {
    if (!roleTotal) return "conic-gradient(#eaf1eb 0deg 360deg)";
    const palette = ["#398558", "#85b995", "#b9d9c0", "#d8e6d9"];
    let angle = 0;
    const slices = stats.usersByRole.map((item, index) => {
      const nextAngle = angle + (Number(item.count || 0) / roleTotal) * 360;
      const slice = `${palette[index % palette.length]} ${angle}deg ${nextAngle}deg`;
      angle = nextAngle;
      return slice;
    });
    return `conic-gradient(${slices.join(", ")})`;
  }, [roleTotal, stats.usersByRole]);

  const activity = [
    { label: "Pengguna baharu", count: daily?.newUsers || 0, icon: <UsersIcon /> },
    { label: "Perniagaan baharu", count: daily?.newBusinesses || 0, icon: <BuildingIcon /> },
    { label: "Produk ditambah", count: daily?.newProducts || 0, icon: <BoxIcon /> },
    { label: "Laporan diterima", count: daily?.newReports || 0, icon: <FlagIcon /> },
  ];
  const maxActivity = Math.max(1, ...activity.map((item) => item.count));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  const firstName = user?.name?.trim().split(/\s+/)[0] || "Admin";
  const today = new Intl.DateTimeFormat("ms-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loader} aria-hidden="true" />
        <p>Memuatkan gambaran keseluruhan...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminShell}>
      <AdminSidebar isSuperAdmin={isSuperAdmin} onLogout={logout} />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>PUSAT KAWALAN</p>
            <h1>Gambaran keseluruhan</h1>
            <p className={styles.date}>{today}</p>
          </div>
          <div className={styles.profile}>
            <div className={styles.avatar}>{firstName.charAt(0).toUpperCase()}</div>
            <div className={styles.profileCopy}>
              <strong>{user?.name || "Admin"}</strong>
              <span>{isSuperAdmin ? "Super admin" : "Pentadbir"}</span>
            </div>
            <span className={styles.onlineDot} aria-label="Aktif" />
          </div>
        </header>

        {loadError && (
          <div className={styles.errorBanner} role="status">
            Data dashboard belum dapat dimuatkan. Cuba segarkan semula halaman.
            <button onClick={() => {
              const token = localStorage.getItem("token");
              if (token) {
                setLoading(true);
                void loadDashboard(token);
              }
            }}>Cuba lagi</button>
          </div>
        )}

        <section className={styles.welcomeCard}>
          <div className={styles.welcomeCopy}>
            <span className={styles.welcomePill}><span /> Ringkasan platform</span>
            <h2>Hai {firstName}, selamat kembali.</h2>
            <p>Ini ringkasan aktiviti CostSmart dan perkembangan komuniti hari ini.</p>
          </div>
          <div className={styles.welcomeArtwork} aria-hidden="true">
            <div className={styles.artRing} />
            <div className={styles.artCard}><span /><span /><span /></div>
            <div className={styles.artDot} />
          </div>
        </section>

        <section className={styles.metricGrid} aria-label="Statistik platform">
          <MetricCard label="Jumlah pengguna" value={formatNumber(stats.totalUsers)} hint="Akaun berdaftar" icon={<UsersIcon />} accent="green" />
          <MetricCard label="Perniagaan" value={formatNumber(stats.totalBusinesses)} hint="Perniagaan berdaftar" icon={<BuildingIcon />} accent="blue" />
          <MetricCard label="Produk" value={formatNumber(stats.totalProducts)} hint="Di seluruh platform" icon={<BoxIcon />} accent="violet" />
          <MetricCard label="Jumlah kos direkod" value={formatMoney(stats.totalCost)} hint="Terkumpul dalam sistem" icon={<WalletIcon />} accent="amber" />
        </section>

        <section className={styles.contentGrid}>
          <article className={`${styles.panel} ${styles.activityPanel}`}>
            <div className={styles.panelHeading}>
              <div><span className={styles.sectionEyebrow}>AKTIVITI</span><h2>Aktiviti 24 jam</h2></div>
              <span className={styles.periodTag}>24 jam terkini</span>
            </div>
            <div className={styles.activityTotal}>
              <strong>{formatNumber(daily?.totalActivities || 0)}</strong>
              <span>aktiviti direkodkan</span>
            </div>
            <div className={styles.activityList}>
              {activity.map((item) => (
                <div className={styles.activityRow} key={item.label}>
                  <span className={styles.activityIcon}>{item.icon}</span>
                  <span className={styles.activityLabel}>{item.label}</span>
                  <div className={styles.barTrack}><span style={{ width: item.count ? `${Math.max(2, (item.count / maxActivity) * 100)}%` : "0%" }} /></div>
                  <strong className={styles.activityCount}>{formatNumber(item.count)}</strong>
                </div>
              ))}
            </div>
            <p className={styles.resetNote}>Kiraan aktiviti bermula semula setiap hari pada tengah malam.</p>
          </article>

          <article className={`${styles.panel} ${styles.peoplePanel}`}>
            <div className={styles.panelHeading}>
              <div><span className={styles.sectionEyebrow}>KOMUNITI</span><h2>Pengguna mengikut peranan</h2></div>
              <Link href="/admin/users" className={styles.textLink}>Lihat pengguna <ArrowIcon /></Link>
            </div>
            <div className={styles.peopleSummary}>
              <div className={styles.donut} style={{ "--donut-gradient": roleGradient } as CSSProperties}>
                <div><strong>{formatNumber(stats.totalUsers)}</strong><span>pengguna</span></div>
              </div>
              <div className={styles.roleLegend}>
                {stats.usersByRole.length ? stats.usersByRole.map((item, index) => (
                  <div className={styles.legendRow} key={item.role}>
                    <span className={`${styles.legendDot} ${styles[`legend${index % 4}`]}`} />
                    <span>{displayRole(item.role)}</span>
                    <strong>{formatNumber(Number(item.count))}</strong>
                  </div>
                )) : <p className={styles.emptyInline}>Belum ada data pengguna.</p>}
              </div>
            </div>
            <div className={styles.marginStrip}>
              <div className={styles.marginIcon}><TrendIcon /></div>
              <div><span>Purata margin produk</span><strong>{Number(stats.avgMargin || 0).toLocaleString("ms-MY", { maximumFractionDigits: 1 })}%</strong></div>
              <span className={styles.marginCaption}>Seluruh platform</span>
            </div>
          </article>
        </section>

        <section className={styles.lowerGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span className={styles.sectionEyebrow}>PENDAFTARAN</span><h2>Pengguna terkini</h2></div>
              <Link href="/admin/users" className={styles.textLink}>Lihat semua <ArrowIcon /></Link>
            </div>
            {stats.recentUsers.length ? (
              <div className={styles.userList}>
                {stats.recentUsers.map((person) => (
                  <div className={styles.userRow} key={person.user_id}>
                    <div className={styles.userAvatar}>{(person.name || "U").charAt(0).toUpperCase()}</div>
                    <div className={styles.userInfo}><strong>{person.name || "Pengguna"}</strong><span>{person.email}</span></div>
                    <span className={styles.roleBadge}>{displayRole(person.role)}</span>
                    <time>{timeAgo(person.created_at)}</time>
                  </div>
                ))}
              </div>
            ) : <EmptyState text="Belum ada pendaftaran untuk dipaparkan." />}
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span className={styles.sectionEyebrow}>MAKLUM BALAS</span><h2>Laporan terkini</h2></div>
              <Link href="/admin/reports" className={styles.textLink}>Lihat semua <ArrowIcon /></Link>
            </div>
            {reports.length ? (
              <div className={styles.reportList}>
                {reports.slice(0, 5).map((report) => (
                  <Link className={styles.reportRow} href="/admin/reports" key={report.report_id}>
                    <span className={`${styles.reportType} ${report.type === "bug" ? styles.reportBug : report.type === "feature" ? styles.reportFeature : ""}`}>
                      {report.type === "bug" ? <BugIcon /> : report.type === "feature" ? <SparkIcon /> : <ChatIcon />}
                    </span>
                    <span className={styles.reportInfo}><strong>{report.title}</strong><span>{report.user_name || report.user_email || "Pengguna"} · {timeAgo(report.created_at)}</span></span>
                    <span className={`${styles.statusBadge} ${styles[`status_${report.status}`] || ""}`}>{report.status === "pending" ? "Baharu" : report.status === "reviewing" ? "Disemak" : report.status === "resolved" ? "Selesai" : "Ditutup"}</span>
                  </Link>
                ))}
              </div>
            ) : <EmptyState text="Tiada laporan baharu buat masa ini." />}
          </article>
        </section>

        <footer className={styles.footer}>
          <span>CostSmart Admin</span><span>Maklumat dikemas kini daripada pangkalan data platform</span>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({ label, value, hint, icon, accent }: { label: string; value: string; hint: string; icon: ReactNode; accent: string }) {
  return <article className={styles.metricCard}>
    <div className={`${styles.metricIcon} ${styles[`accent_${accent}`]}`}>{icon}</div>
    <div className={styles.metricText}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
  </article>;
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.emptyState}><span className={styles.emptyMark}><CheckIcon /></span><p>{text}</p></div>;
}

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
const UsersIcon = () => <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
const BuildingIcon = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 21V9h6v12M7 7h.01M17 7h.01M7 11h.01M17 11h.01"/></Icon>;
const BoxIcon = () => <Icon><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></Icon>;
const WalletIcon = () => <Icon><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 14h2M6 5V4a2 2 0 0 1 2-2h10"/></Icon>;
const FlagIcon = () => <Icon><path d="M5 21V5m0 0c5-4 9 4 14 0v11c-5 4-9-4-14 0"/></Icon>;
const TrendIcon = () => <Icon><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></Icon>;
const ArrowIcon = () => <Icon><path d="M5 12h14m-6-6 6 6-6 6"/></Icon>;
const BugIcon = () => <Icon><path d="m8 8-2-2m10 2 2-2M9 3l1.5 3m4-3L13 6M3 13h3m12 0h3M5 19l2-2m10 0 2 2"/><rect x="7" y="7" width="10" height="14" rx="5"/><path d="M12 8v12m-5-8h5m5 0h-5m-5 4h5m5 0h-5"/></Icon>;
const SparkIcon = () => <Icon><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7L5 3Z"/></Icon>;
const ChatIcon = () => <Icon><path d="M21 11.5a8.5 8.5 0 0 1-12.9 7.3L3 20l1.2-4.4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11h8m-8 4h5"/></Icon>;
const CheckIcon = () => <Icon><path d="m5 12 4 4L19 6"/></Icon>;
