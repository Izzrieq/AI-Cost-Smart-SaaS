"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminSidebar from "@/app/(admin)/components/AdminSidebar";
import { API_URL } from "@/lib/api";

interface Product {
  product_id: string;
  name: string;
  description: string;
  selling_price: number;
  margin_percentage: number;
  sale_unit: string;
  image_url: string | null;
  created_at: string;
  business_name?: string;
  owner_name?: string;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
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
    setIsSuperAdmin(parsed.role === "super_admin");

    fetchProducts(token);
  }, [router]);

  const fetchProducts = async (token?: string) => {
    const authToken = token || localStorage.getItem("token");
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API_URL}/admin/products${query}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const formatRM = (val: number) =>
    `RM ${val.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getMarginBadge = (margin: number) => {
    if (margin >= 30) return <span className="badge badge-high">Sihat</span>;
    if (margin >= 15) return <span className="badge badge-medium">Sederhana</span>;
    return <span className="badge badge-low">Rendah</span>;
  };

  if (loading && products.length === 0) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <span>Memuatkan produk...</span>
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
        .badge-high { background: #d1fae5; color: #065f46; }
        .badge-medium { background: #fef3c7; color: #92400e; }
        .badge-low { background: #fee2e2; color: #991b1b; }

        .text-muted { color: #94a3b8; font-size: 12px; }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #94a3b8;
        }
        .empty-state .icon { font-size: 48px; margin-bottom: 12px; }

        .product-img {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          background: #f1f5f9;
        }

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
                📦 Produk
                {isSuperAdmin && <span className="super-admin-badge">⭐ Super Admin</span>}
              </h1>
              <p>Urus dan lihat semua produk dalam platform</p>
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
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Cari</button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Harga Jual</th>
                  <th>Margin</th>
                  <th>Perniagaan</th>
                  <th>Tarikh</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="icon">📦</div>
                        <p>Tiada produk dijumpai.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <img
                            src={p.image_url || "/images/placeholder-product.png"}
                            alt={p.name}
                            className="product-img"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/placeholder-product.png";
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {p.sale_unit || "unit"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        {formatRM(p.selling_price)}
                      </td>
                      <td>
                        {getMarginBadge(p.margin_percentage)}
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {p.margin_percentage}%
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.business_name || "—"}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {p.owner_name || ""}
                        </div>
                      </td>
                      <td className="text-muted">
                        {new Date(p.created_at).toLocaleDateString("ms-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
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