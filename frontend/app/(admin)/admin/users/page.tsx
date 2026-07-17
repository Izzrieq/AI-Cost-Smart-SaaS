"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminSidebar from "@/app/(admin)/components/AdminSidebar";
import { API_URL } from "@/lib/api";

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  provider: string;
  created_at: string;
  business_id?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  // ─── Compute isSuperAdmin from userData using useMemo ──────
  const isSuperAdmin = useMemo(() => {
    return userData?.role === "super_admin";
  }, [userData]);

  // ─── Fetch Users ──────────────────────────────────────────────
  const fetchUsers = useCallback(async (token?: string) => {
    const authToken = token || localStorage.getItem("token");
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API_URL}/admin/users${query}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // ─── Initialize Auth ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.role !== "admin" && parsed.role !== "super_admin") {
        router.push("/home");
        return;
      }

      // ── Set userData instead of isSuperAdmin ──
      setUserData(parsed);
      fetchUsers(token);
    } catch (err) {
      console.error("Auth error:", err);
      router.push("/login");
    }
  }, []); // Empty dependency array - only runs once

  // ─── Handlers ─────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <span className="badge badge-super">⭐ Super Admin</span>;
      case "admin":
        return <span className="badge badge-admin">Admin</span>;
      case "business_owner":
        return <span className="badge badge-owner">Pemilik Perniagaan</span>;
      case "staff":
        return <span className="badge badge-staff">Staff</span>;
      default:
        return <span className="badge badge-user">User</span>;
    }
  };

  if (loading && users.length === 0) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <span>Memuatkan pengguna...</span>
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

        .page-root {
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
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .topbar h1 { font-size: 22px; font-weight: 700; color: #0f172a; }
        .topbar p { font-size: 14px; color: #64748b; }

        .search-box {
          display: flex;
          gap: 10px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 14px;
          align-items: center;
          flex: 1;
          max-width: 400px;
        }
        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: transparent;
          color: #1e293b;
        }
        .search-box input::placeholder { color: #94a3b8; }
        .search-box button {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
        }

        .stats-badge {
          font-size: 13px;
          color: #64748b;
          background: #fff;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .stats-badge strong { color: #0f172a; }

        .table-wrap {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          text-align: left;
          padding: 14px 18px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
        }
        td {
          padding: 14px 18px;
          font-size: 13px;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f8fafc; }

        .badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .badge-super { background: #fef3c7; color: #92400e; }
        .badge-admin { background: #dbeafe; color: #1d4ed8; }
        .badge-owner { background: #d1fae5; color: #065f46; }
        .badge-staff { background: #f3e8ff; color: #6b21a8; }
        .badge-user { background: #f1f5f9; color: #475569; }

        .text-muted { color: #94a3b8; font-size: 12px; }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #94a3b8;
        }
        .empty-state .icon { font-size: 48px; margin-bottom: 12px; }

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
          .table-wrap { overflow-x: auto; }
          .search-box { max-width: 100%; }
        }
      `}</style>

      <div className="page-root">
        <AdminSidebar isSuperAdmin={isSuperAdmin} onLogout={handleLogout} />

        <main className="main-content">
          <div className="topbar">
            <div>
              <h1>
                👥 Pengguna
                {isSuperAdmin && <span className="super-admin-badge">⭐ Super Admin</span>}
              </h1>
              <p>Urus dan lihat semua pengguna dalam platform</p>
            </div>
            <div className="stats-badge">
              Jumlah: <strong>{total}</strong>
            </div>
          </div>

          <form onSubmit={handleSearch} className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Cari</button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>E-mel</th>
                  <th>Peranan</th>
                  <th>Penyedia</th>
                  <th>Tarikh Daftar</th>
                  {isSuperAdmin && <th>Tindakan</th>}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5}>
                      <div className="empty-state">
                        <div className="icon">👤</div>
                        <p>Tiada pengguna dijumpai.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.user_id}>
                      <td><strong>{u.name || "—"}</strong></td>
                      <td>{u.email}</td>
                      <td>{getRoleBadge(u.role)}</td>
                      <td className="text-muted">{u.provider || "local"}</td>
                      <td className="text-muted">
                        {new Date(u.created_at).toLocaleDateString("ms-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      {isSuperAdmin && (
                        <td>
                          <button
                            className="text-muted"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ef4444",
                              fontSize: 12,
                            }}
                            onClick={() => {
                              if (confirm(`Padam pengguna ${u.name}?`)) {
                                // Delete user logic - API call needed
                              }
                            }}
                          >
                            Padam
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}

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