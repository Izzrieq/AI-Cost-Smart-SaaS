"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../components/AdminSidebar";
import { API_URL } from "@/lib/api";

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardStats {
  totalUsers: number;
  usersByRole: { role: string; count: number }[];
  totalProducts: number;
  totalCost: number;
  avgMargin: number;
  totalBusinesses: number;
  recentUsers: {
    user_id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
  }[];
}

interface Feedback {
  report_id: number;
  user_id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface DailyReport {
  resetIn: string;
  resetInMs: number;
  newBusinesses: number;
  newProducts: number;
  newUsers: number;
  newReports: number;
  totalActivities: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.role !== "admin" && parsed.role !== "super_admin") {
      router.push("/home");
      return;
    }
    setUser(parsed);
    setIsSuperAdmin(parsed.role === "super_admin");

    const fetchDashboardData = async () => {
      try {
        const statsRes = await fetch(`${API_URL}/admin/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          const homeRes = await fetch(`${API_URL}/home/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (homeRes.ok) {
            const homeStats = await homeRes.json();
            setStats({
              totalUsers: 0,
              usersByRole: [],
              totalProducts: homeStats.totalProducts || 0,
              totalCost: homeStats.totalKos || 0,
              avgMargin: homeStats.marginPurata || 0,
              totalBusinesses: 1,
              recentUsers: [],
            });
          }
        }

        const dailyRes = await fetch(`${API_URL}/admin/daily-report`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dailyRes.ok) {
          const dailyData = await dailyRes.json();
          setDailyReport(dailyData);
        }

        const feedbackRes = await fetch(`${API_URL}/admin/reports?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json();
          setFeedbacks(feedbackData.reports || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  // ─── Countdown timer ──────────────────────────────────────────
  useEffect(() => {
    if (!dailyReport?.resetInMs) return;

    const resetTarget = new Date().getTime() + dailyReport.resetInMs;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = resetTarget - now;

      if (remaining <= 0) {
        setCountdown("Reset sekarang...");
        return;
      }

      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [dailyReport]);

  // ─── Format helpers ──────────────────────────────────────────
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "A";
  };

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Baru sahaja";
      if (diffMins < 60) return `${diffMins} minit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays === 1) return "Semalam";
      return `${diffDays} hari lalu`;
    } catch {
      return "Terkini";
    }
  };

  // ─── Stats cards data ────────────────────────────────────────
  const adminCount = stats?.usersByRole?.find(r => r.role === "admin")?.count || 0;

  const statsCards = [
    {
      label: "Jumlah Pengguna",
      value: stats?.totalUsers?.toLocaleString() || "0",
      icon: <UsersIcon />,
      change: adminCount > 0 ? `${adminCount} Admin` : "Tiada Admin",
    },
    {
      label: "Jumlah Produk",
      value: stats?.totalProducts?.toLocaleString() || "0",
      icon: <PackageIcon />,
      change: (stats?.totalProducts || 0) > 0 ? "Seluruh platform" : "Tiada produk",
    },
  ];

  const dailyStats = [
    { label: "Perniagaan Baru", value: dailyReport?.newBusinesses || 0, icon: <BuildingIcon /> },
    { label: "Produk Baru", value: dailyReport?.newProducts || 0, icon: <PackageIcon /> },
    { label: "Pengguna Baru", value: dailyReport?.newUsers || 0, icon: <UsersIcon /> },
    { label: "Laporan Baru", value: dailyReport?.newReports || 0, icon: <FileTextIcon /> },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "🔴";
      case "reviewing": return "🟡";
      case "resolved": return "🟢";
      case "closed": return "⚪";
      default: return "🔵";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Perlu Tindakan";
      case "reviewing": return "Sedang Dikaji";
      case "resolved": return "Selesai";
      case "closed": return "Ditutup";
      default: return status;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <span>Memuatkan dashboard...</span>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .admin-root {
          display: flex;
          min-height: 100vh;
          background: #f1f5f9;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .main-content {
          flex: 1;
          padding: 24px 32px 40px;
          min-width: 0;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .topbar-left h2 { font-size: 22px; font-weight: 700; color: #0f172a; }
        .topbar-left p { font-size: 14px; color: #64748b; }
        .topbar-right .user-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          padding: 6px 14px 6px 6px;
          border-radius: 99px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .topbar-right .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
        }
        .topbar-right .user-name { font-size: 14px; font-weight: 600; color: #1e293b; }
        .topbar-right .user-role { font-size: 11px; color: #94a3b8; font-weight: 500; }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 18px 20px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
          transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .stat-card .stat-icon { 
          width: 32px; 
          height: 32px;
          margin-bottom: 8px;
          color: #2563eb;
        }
        .stat-card .stat-icon svg { width: 100%; height: 100%; }
        .stat-card .stat-label { font-size: 13px; font-weight: 500; color: #64748b; margin-bottom: 4px; }
        .stat-card .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
        .stat-card .stat-change {
          font-size: 12px;
          font-weight: 600;
          margin-top: 6px;
          display: inline-block;
          padding: 2px 10px;
          border-radius: 99px;
          background: #f1f5f9;
          color: #64748b;
        }

        .daily-report-card {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 20px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          border: 1px solid #334155;
        }
        .daily-report-left { display: flex; align-items: center; gap: 16px; }
        .daily-report-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #60a5fa;
        }
        .daily-report-icon svg { width: 24px; height: 24px; }
        .daily-report-title { font-size: 16px; font-weight: 700; }
        .daily-report-sub { font-size: 13px; color: #94a3b8; margin-top: 2px; }
        .daily-report-stats {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .daily-stat-item { text-align: center; }
        .daily-stat-item .daily-stat-icon {
          width: 20px;
          height: 20px;
          margin: 0 auto 4px;
          color: #60a5fa;
        }
        .daily-stat-item .daily-stat-icon svg { width: 100%; height: 100%; }
        .daily-stat-value { font-size: 20px; font-weight: 700; color: #60a5fa; }
        .daily-stat-label { font-size: 11px; color: #94a3b8; font-weight: 500; }
        .daily-report-reset {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #94a3b8;
        }
        .daily-report-reset strong { color: #fbbf24; }

        .feedback-section {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          padding: 20px 24px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        .feedback-section h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .feedback-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f8fafc;
        }
        .feedback-item:last-child { border-bottom: none; }
        .feedback-status { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
        .feedback-content { flex: 1; }
        .feedback-title { font-size: 14px; font-weight: 600; color: #1e293b; }
        .feedback-meta {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .feedback-meta .badge {
          padding: 1px 8px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 600;
        }
        .badge-pending { background: #fef2f2; color: #dc2626; }
        .badge-reviewing { background: #fffbeb; color: #d97706; }
        .badge-resolved { background: #f0fdf4; color: #16a34a; }
        .badge-closed { background: #f1f5f9; color: #64748b; }
        .feedback-empty { color: #94a3b8; font-size: 14px; padding: 12px 0; text-align: center; }

        .super-admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 10px;
          border-radius: 99px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #78350f;
          margin-left: 6px;
        }

        @media (max-width: 768px) {
          .main-content { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .daily-report-card { flex-direction: column; align-items: stretch; }
          .daily-report-stats { justify-content: space-around; }
        }
      `}</style>

      <div className="admin-root">
        {/* ─── Sidebar Component ─── */}
        <AdminSidebar isSuperAdmin={isSuperAdmin} onLogout={handleLogout} />

        {/* ─── MAIN CONTENT ─── */}
        <main className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              <h2>
                Selamat datang, {user?.name?.split(" ")[0] || "Admin"}
                {isSuperAdmin && <span className="super-admin-badge">⭐ Super Admin</span>}
              </h2>
              <p>Ringkasan statistik dan aktiviti seluruh platform</p>
            </div>
            <div className="topbar-right">
              <div className="user-badge">
                <div className="user-avatar">{user?.name ? getInitials(user.name) : "A"}</div>
                <div>
                  <div className="user-name">{user?.name || "Admin"}</div>
                  <div className="user-role">{isSuperAdmin ? "Super Admin" : "Pentadbir"}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Stats Cards */}
          <section className="stats-grid">
            {statsCards.map((stat, idx) => (
              <div key={idx} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-change">{stat.change}</div>
              </div>
            ))}
          </section>

          {/* Daily Report Card */}
          <div className="daily-report-card">
            <div className="daily-report-left">
              <div className="daily-report-icon">
                <TrendingUpIcon />
              </div>
              <div>
                <div className="daily-report-title">Laporan 24 Jam</div>
                <div className="daily-report-sub">{dailyReport?.totalActivities || 0} aktiviti dalam 24 jam terkini</div>
              </div>
            </div>
            <div className="daily-report-stats">
              {dailyStats.map((item, idx) => (
                <div key={idx} className="daily-stat-item">
                  <div className="daily-stat-icon">{item.icon}</div>
                  <div className="daily-stat-value">{item.value}</div>
                  <div className="daily-stat-label">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="daily-report-reset">
              <RefreshIcon />
              <span>Reset dalam <strong>{countdown || dailyReport?.resetIn || "--"}</strong></span>
            </div>
          </div>

          {/* Feedback Section */}
          <section className="feedback-section">
            <h3>
              📋 Feedback Terkini
              <Link href="/admin/reports" style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6", textDecoration: "none" }}>
                Lihat Semua →
              </Link>
            </h3>
            {feedbacks.length > 0 ? (
              feedbacks.map((fb) => (
                <div key={fb.report_id} className="feedback-item">
                  <div className="feedback-status">{getStatusColor(fb.status)}</div>
                  <div className="feedback-content">
                    <div className="feedback-title">{fb.title}</div>
                    <div className="feedback-meta">
                      <span>Dari: {fb.user_name || fb.user_email || "Unknown"}</span>
                      <span>•</span>
                      <span>{getTimeAgo(fb.created_at)}</span>
                      <span>•</span>
                      <span className={`badge badge-${fb.status}`}>{getStatusText(fb.status)}</span>
                      <span className="badge" style={{ background: "#f1f5f9", color: "#64748b" }}>
                        {fb.type === "bug" ? "🐛 Bug" : 
                         fb.type === "feature" ? "✨ Feature" : 
                         fb.type === "feedback" ? "💬 Feedback" : "📝 Other"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="feedback-empty">Tiada feedback. User belum buat sebarang laporan.</div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

// ─── SVG ICONS ──────────────────────────────────────────────────
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);

const styles = {
  loading: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: "#f5f7fa",
    color: "#64748b",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};