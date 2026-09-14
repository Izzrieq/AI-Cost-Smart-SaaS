// components/products/ProductsView.tsx
"use client";

import { useEffect } from "react";
import BottomNavbar from "@/app/(user)/components/BottomNavbar";
import { matchFoodImage } from "@/lib/foodImages";
import "@/app/(user)/produk/produk.css";

interface Product {
  product_id: string;
  name: string;
  selling_price: number;
  margin_percentage: number;
  image_url: string | null;
  sale_unit?: string;
}

type ProductsViewProps = {
  loading: boolean;
  products: Product[];
  search: string;
  setSearch: (val: string) => void;
  filter: "all" | "sihat" | "sederhana" | "rendah";
  setFilter: (val: "all" | "sihat" | "sederhana" | "rendah") => void;
  filtered: Product[];
  sihatCount: number;
  sederhanaCount: number;
  rendahCount: number;
  getMarginMeta: (margin: number) => { label: string; bg: string; text: string; dot: string; bar: string };
  router: any;
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

export default function ProductsView({
  loading,
  products,
  search,
  setSearch,
  filter,
  setFilter,
  filtered,
  sihatCount,
  sederhanaCount,
  rendahCount,
  getMarginMeta,
  router,
}: ProductsViewProps) {
  if (loading) {
    return (
      <div className="pp-loading">
        <div className="pp-spinner" />
        <span style={{ fontSize: 13, color: "#94a3b8", letterSpacing: "0.02em" }}>Memuatkan produk...</span>
      </div>
    );
  }

  return (
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
            <div
              className={`pp-stat-chip ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              <div className="pp-stat-chip-dot" style={{ background: "#94a3b8" }} />
              <span className="pp-stat-chip-label">Semua</span>
              <span className="pp-stat-chip-count">{products.length}</span>
            </div>
            <div
              className={`pp-stat-chip ${filter === "sihat" ? "active" : ""}`}
              onClick={() => setFilter("sihat")}
            >
              <div className="pp-stat-chip-dot" style={{ background: "#4ade80" }} />
              <span className="pp-stat-chip-label">Sihat</span>
              <span className="pp-stat-chip-count">{sihatCount}</span>
            </div>
            <div
              className={`pp-stat-chip ${filter === "sederhana" ? "active" : ""}`}
              onClick={() => setFilter("sederhana")}
            >
              <div className="pp-stat-chip-dot" style={{ background: "#fbbf24" }} />
              <span className="pp-stat-chip-label">Sederhana</span>
              <span className="pp-stat-chip-count">{sederhanaCount}</span>
            </div>
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
              const unit = product.sale_unit || "unit";
              return (
                <div
                  key={product.product_id}
                  className="pp-card"
                  style={{ animationDelay: `${0.05 + idx * 0.04}s` }}
                  onClick={() => router.push(`/produk/${product.product_id}`)}
                >
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
  );
}