"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/app/(user)/components/BottomNavbar";
import { matchFoodImage } from "@/lib/foodImages";
import { API_URL } from "@/lib/api";

interface Product {
  product_id: string;
  business_id: string;
  name: string;
  description: string;
  selling_price: number;
  margin_percentage: number;
  image_url: string | null;
  created_at: string;
  sale_unit?: string; // NEW: e.g., "slice", "whole", "box", "pack"
}

const getMarginMeta = (margin: number) => {
  if (margin >= 30) return { label: "Sihat", bg: "#f0fdf4", text: "#16a34a", dot: "#4ade80", bar: "#22c55e" };
  if (margin >= 15) return { label: "Sederhana", bg: "#fffbeb", text: "#d97706", dot: "#fbbf24", bar: "#f59e0b" };
  return { label: "Rendah", bg: "#fef2f2", text: "#ef4444", dot: "#fca5a5", bar: "#ef4444" };
};

function SkeletonCard() {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid #f1f5f9",
    }}>
      <div style={{
        width: "100%", height: 130,
        background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }} />
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 12, width: "75%", borderRadius: 6, background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: 11, width: "50%", borderRadius: 6, background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: 18, width: "40%", borderRadius: 99, background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      </div>
    </div>
  );
}

export default function ProdukPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sihat" | "sederhana" | "rendah">("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "sihat" ? p.margin_percentage >= 30 :
      filter === "sederhana" ? p.margin_percentage >= 15 && p.margin_percentage < 30 :
      p.margin_percentage < 15;
    return matchSearch && matchFilter;
  });

  const sihatCount = products.filter(p => p.margin_percentage >= 30).length;
  const sederhanaCount = products.filter(p => p.margin_percentage >= 15 && p.margin_percentage < 30).length;
  const rendahCount = products.filter(p => p.margin_percentage < 15).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .pp-root {
          min-height: 100vh;
          background: #f5f7fa;
          padding-bottom: 110px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .pp-header {
          background: linear-gradient(145deg, #1a56db 0%, #2563eb 60%, #3b82f6 100%);
          padding: 52px 20px 72px;
          position: relative;
          overflow: hidden;
        }
        .pp-header::before {
          content: '';
          position: absolute;
          top: -50px; right: -50px;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .pp-header::after {
          content: '';
          position: absolute;
          bottom: -40px; left: -30px;
          width: 140px; height: 140px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .pp-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
          position: relative;
          z-index: 1;
        }

        .pp-header-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
        }
        .pp-header-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          margin-top: 2px;
          font-weight: 500;
        }

        .pp-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.18);
          border: 1.5px solid rgba(255,255,255,0.28);
          backdrop-filter: blur(8px);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          padding: 9px 16px;
          border-radius: 99px;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: background 0.2s, transform 0.15s;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .pp-add-btn:hover { background: rgba(255,255,255,0.26); }
        .pp-add-btn:active { transform: scale(0.96); }

        .pp-search-wrap {
          position: relative;
          z-index: 1;
        }
        .pp-search {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .pp-search input {
          flex: 1;
          font-size: 14px;
          color: #1e293b;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 500;
        }
        .pp-search input::placeholder { color: #9ca3af; font-weight: 400; }
        .pp-search-clear {
          background: #f1f5f9;
          border: none;
          width: 24px; height: 24px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .pp-search-clear:hover { background: #e2e8f0; }

        .pp-body {
          margin-top: -36px;
          padding: 0 16px;
          position: relative;
          z-index: 10;
        }

        .pp-stats-strip {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
          overflow-x: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .pp-stats-strip::-webkit-scrollbar { display: none; }

        .pp-stat-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1.5px solid #f1f5f9;
          border-radius: 12px;
          padding: 8px 12px;
          white-space: nowrap;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          flex-shrink: 0;
        }
        .pp-stat-chip:active { transform: scale(0.97); }
        .pp-stat-chip.active {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08), 0 1px 4px rgba(0,0,0,0.06);
        }
        .pp-stat-chip-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pp-stat-chip-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .pp-stat-chip-count {
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          background: #f8fafc;
          border-radius: 6px;
          padding: 1px 6px;
        }
        .pp-stat-chip.active .pp-stat-chip-label { color: #2563eb; }
        .pp-stat-chip.active .pp-stat-chip-count { background: #eff6ff; color: #1d4ed8; }

        .pp-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .pp-section-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .pp-section-count {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
        }

        .pp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .pp-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: fadeUp 0.35s ease both;
        }
        .pp-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        }
        .pp-card:active {
          transform: scale(0.97);
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }

        .pp-card-img-wrap {
          position: relative;
          width: 100%;
          height: 130px;
          overflow: hidden;
          background: #f8fafc;
        }
        .pp-card-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s ease;
        }
        .pp-card:hover .pp-card-img-wrap img {
          transform: scale(1.04);
        }
        .pp-card-img-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(to top, rgba(0,0,0,0.22), transparent);
        }
        .pp-card-price-badge {
          position: absolute;
          bottom: 8px; right: 8px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          border-radius: 8px;
          padding: 3px 8px;
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.01em;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        }

        .pp-card-body {
          padding: 12px 13px 13px;
        }
        .pp-card-name {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
        }
        .pp-card-price-unit {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }
        .pp-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }
        .pp-margin-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px 3px 5px;
          border-radius: 99px;
          letter-spacing: 0.01em;
          text-transform: uppercase;
        }
        .pp-margin-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pp-card-arrow {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #f8fafc;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .pp-card:hover .pp-card-arrow { background: #eff6ff; }

        .pp-empty {
          background: #fff;
          border: 2px dashed #e2e8f0;
          border-radius: 24px;
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.15s;
        }
        .pp-empty:hover { border-color: #93c5fd; }
        .pp-empty:active { transform: scale(0.99); }
        .pp-empty-icon {
          width: 56px; height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 4px;
        }
        .pp-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.01em;
        }
        .pp-empty-desc {
          font-size: 13px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.5;
        }
        .pp-empty-cta {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          border: none;
          padding: 9px 20px;
          border-radius: 99px;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: 0.01em;
          transition: background 0.2s;
        }
        .pp-empty-cta:hover { background: #dbeafe; }

        .pp-loading {
          min-height: 100vh;
          background: #f5f7fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          flex-direction: column;
          gap: 12px;
        }
        .pp-spinner {
          width: 34px; height: 34px;
          border-radius: 50%;
          border: 3px solid #dbeafe;
          border-top-color: #2563eb;
          animation: spin 0.75s linear infinite;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pp-fade-1 { animation: fadeUp 0.4s ease both; }
        .pp-fade-2 { animation: fadeUp 0.4s 0.06s ease both; }
        .pp-fade-3 { animation: fadeUp 0.4s 0.12s ease both; }
      `}</style>

      {loading ? (
        <div className="pp-loading">
          <div className="pp-spinner" />
          <span style={{ fontSize: 13, color: "#94a3b8", letterSpacing: "0.02em" }}>Memuatkan produk...</span>
        </div>
      ) : (
        <div className="pp-root">

          {/* ── HERO HEADER ── */}
          <div className="pp-header">
            <div className="pp-header-top">
              <div>
                <div className="pp-header-title">Produk</div>
                <div className="pp-header-subtitle">
                  {products.length > 0 ? `${products.length} produk berdaftar` : "Tiada produk lagi"}
                </div>
              </div>
              <button className="pp-add-btn" onClick={() => router.push("/produk/tambah-produk")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Tambah
              </button>
            </div>

            {/* Search */}
            <div className="pp-search-wrap">
              <div className="pp-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="pp-search-clear" onClick={() => setSearch("")}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="pp-body">

            {/* Filter chips */}
            {products.length > 0 && (
              <div className="pp-stats-strip pp-fade-1">
                {/* All */}
                <div
                  className={`pp-stat-chip ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  <div className="pp-stat-chip-dot" style={{ background: "#94a3b8" }} />
                  <span className="pp-stat-chip-label">Semua</span>
                  <span className="pp-stat-chip-count">{products.length}</span>
                </div>
                {/* Sihat */}
                <div
                  className={`pp-stat-chip ${filter === "sihat" ? "active" : ""}`}
                  onClick={() => setFilter("sihat")}
                >
                  <div className="pp-stat-chip-dot" style={{ background: "#4ade80" }} />
                  <span className="pp-stat-chip-label">Sihat</span>
                  <span className="pp-stat-chip-count">{sihatCount}</span>
                </div>
                {/* Sederhana */}
                <div
                  className={`pp-stat-chip ${filter === "sederhana" ? "active" : ""}`}
                  onClick={() => setFilter("sederhana")}
                >
                  <div className="pp-stat-chip-dot" style={{ background: "#fbbf24" }} />
                  <span className="pp-stat-chip-label">Sederhana</span>
                  <span className="pp-stat-chip-count">{sederhanaCount}</span>
                </div>
                {/* Rendah */}
                <div
                  className={`pp-stat-chip ${filter === "rendah" ? "active" : ""}`}
                  onClick={() => setFilter("rendah")}
                >
                  <div className="pp-stat-chip-dot" style={{ background: "#f87171" }} />
                  <span className="pp-stat-chip-label">Rendah</span>
                  <span className="pp-stat-chip-count">{rendahCount}</span>
                </div>
              </div>
            )}

            {/* Section label */}
            {filtered.length > 0 && (
              <div className="pp-section-header pp-fade-2">
                <span className="pp-section-label">Senarai Produk</span>
                <span className="pp-section-count">{filtered.length} item</span>
              </div>
            )}

            {/* Grid / Empty */}
            {filtered.length === 0 ? (
              <div className="pp-empty pp-fade-2" onClick={() => !search && router.push("/produk/tambah-produk")}>
                <div className="pp-empty-icon">
                  {search ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  )}
                </div>
                <div className="pp-empty-title">
                  {search ? "Tiada hasil ditemui" : "Tiada produk lagi"}
                </div>
                <div className="pp-empty-desc">
                  {search
                    ? `Tiada produk sepadan dengan "${search}"`
                    : "Mulakan dengan menambah produk pertama anda ke dalam sistem."}
                </div>
                {!search && (
                  <button className="pp-empty-cta" onClick={() => router.push("/produk/tambah-produk")}>
                    + Tambah Produk Pertama
                  </button>
                )}
              </div>
            ) : (
              <div className="pp-grid pp-fade-3">
                {filtered.map((product, idx) => {
                  const meta = getMarginMeta(product.margin_percentage);
                  // Display unit: use sale_unit if available, otherwise default to "unit"
                  const unit = product.sale_unit || "unit";
                  return (
                    <div
                      key={product.product_id}
                      className="pp-card"
                      style={{ animationDelay: `${0.05 + idx * 0.04}s` }}
                      onClick={() => router.push(`/produk/${product.product_id}`)}
                    >
                      {/* Image */}
                      <div className="pp-card-img-wrap">
                        <img
                          src={product.image_url || matchFoodImage(product.name)}
                          alt={product.name}
                        />
                        <div className="pp-card-img-overlay" />
                        <div className="pp-card-price-badge">
                          RM {parseFloat(String(product.selling_price)).toFixed(2)}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="pp-card-body">
                        <div className="pp-card-name">{product.name}</div>
                        <div className="pp-card-price-unit">
                          / {unit}
                        </div>
                        <div className="pp-card-footer">
                          <div
                            className="pp-margin-badge"
                            style={{ background: meta.bg, color: meta.text }}
                          >
                            <div className="pp-margin-badge-dot" style={{ background: meta.dot }} />
                            {product.margin_percentage}%
                          </div>
                          <div className="pp-card-arrow">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <BottomNavbar />
        </div>
      )}
    </>
  );
}