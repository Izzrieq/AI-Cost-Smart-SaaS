"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/(admin)/components/AdminSidebar";
import { API_URL } from "@/lib/api";
import styles from "./produk.module.css";

type AdminUser = { user_id: string; name: string; email: string; role: string };

type ProductDemand = {
  key: string;
  name: string;
  businessCount: number;
  productCount: number;
  avgMargin: number;
  avgPrice: number;
  lastAdded: string;
};

type Totals = {
  total_products: number;
  total_businesses: number;
  unique_names: number;
};

type SortMode = "businesses" | "products" | "margin" | "name";

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

export default function AdminProductsPage() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);

  const [products, setProducts] = useState<ProductDemand[]>([]);
  const [totals, setTotals] = useState<Totals>({
    total_products: 0,
    total_businesses: 0,
    unique_names: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("businesses");

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

  const fetchData = useCallback(async (token: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`${API_URL}/admin/product-demand`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setLoadError(true);
        if (!opts?.silent) setProducts([]);
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setTotals(
        data.totals || { total_products: 0, total_businesses: 0, unique_names: 0 },
      );
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const token = authGuard();
    if (!token) return;
    void fetchData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authGuard]);

  const refresh = () => {
    const token = localStorage.getItem("token");
    if (token) void fetchData(token, { silent: true });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter((p) => p.key.includes(q) || p.name.toLowerCase().includes(q))
      : products.slice();

    switch (sortMode) {
      case "businesses":
        list.sort((a, b) => b.businessCount - a.businessCount);
        break;
      case "products":
        list.sort((a, b) => b.productCount - a.productCount);
        break;
      case "margin":
        list.sort((a, b) => b.avgMargin - a.avgMargin);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [products, search, sortMode]);

  const topTen = useMemo(() => filtered.slice(0, 10), [filtered]);
  const maxBusinessCount = Math.max(
    1,
    ...topTen.map((p) => p.businessCount),
  );

  const topProduct = products[0]; // API already sorts by business_count desc

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
            <p className={styles.eyebrow}>ANALITIK</p>
            <h1>Produk</h1>
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
            Data produk tidak dapat dimuatkan. Cuba segarkan semula.
            <button onClick={refresh}>Cuba lagi</button>
          </div>
        )}

        <section className={styles.summaryGrid}>
          <SummaryCard
            label="Jumlah produk"
            value={formatNumber(totals.total_products)}
            hint="Di seluruh platform"
            tone="green"
            icon={<BoxIcon />}
          />
          <SummaryCard
            label="Nama unik"
            value={formatNumber(totals.unique_names)}
            hint="Selepas pengelompokan"
            tone="blue"
            icon={<TagIcon />}
          />
          <SummaryCard
            label="Perniagaan menjual"
            value={formatNumber(totals.total_businesses)}
            hint="Perniagaan aktif"
            tone="violet"
            icon={<BuildingIcon />}
          />
          <SummaryCard
            label="Produk paling popular"
            value={topProduct ? topProduct.name : "—"}
            hint={
              topProduct
                ? `${topProduct.businessCount} perniagaan menjual`
                : "Belum ada data"
            }
            tone="amber"
            icon={<TrendIcon />}
            small
          />
        </section>

        <section className={styles.chartPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.sectionEyebrow}>PERMINTAAN</span>
              <h2>10 produk teratas mengikut bilangan perniagaan</h2>
            </div>
            {refreshing && <span className={styles.refreshDot} />}
          </div>

          {loading ? (
            <ChartSkeleton />
          ) : topTen.length === 0 ? (
            <EmptyState
              title="Tiada produk untuk dipaparkan"
              hint="Data akan muncul apabila perniagaan mula menambah produk."
            />
          ) : (
            <div className={styles.chartWrap}>
              {topTen.map((p, i) => (
                <div className={styles.chartRow} key={p.key}>
                  <span className={styles.chartRank}>{i + 1}</span>
                  <div className={styles.chartLabel}>
                    <strong>{p.name}</strong>
                    <span>{p.productCount} produk · {p.businessCount} perniagaan</span>
                  </div>
                  <div className={styles.chartTrack}>
                    <div
                      className={styles.chartBar}
                      style={{
                        width: `${Math.max(4, (p.businessCount / maxBusinessCount) * 100)}%`,
                      }}
                    >
                      <span className={styles.chartBarValue}>{p.businessCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.sectionEyebrow}>SEMUA PRODUK</span>
              <h2>Produk mengikut permintaan</h2>
            </div>
            <div className={styles.headingActions}>
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
                placeholder="Cari nama produk…"
                aria-label="Cari produk"
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
              <label htmlFor="sort-filter" className={styles.filterLabel}>
                Susun
              </label>
              <select
                id="sort-filter"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
              >
                <option value="businesses">Perniagaan terbanyak</option>
                <option value="products">Produk terbanyak</option>
                <option value="margin">Margin tertinggi</option>
                <option value="name">Nama A–Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <CardGridSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={search ? "Tiada padanan dijumpai" : "Belum ada produk"}
              hint={
                search
                  ? "Cuba kata kunci carian yang lain."
                  : "Produk yang ditambah oleh perniagaan akan muncul di sini."
              }
            />
          ) : (
            <div className={styles.productGrid}>
              {filtered.map((p) => (
                <article className={styles.productCard} key={p.key}>
                  <div className={styles.productCardTop}>
                    <div className={styles.productAvatar}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.productMeta}>
                      <strong title={p.name}>{p.name}</strong>
                      <span>Ditambah {timeAgo(p.lastAdded)}</span>
                    </div>
                  </div>

                  <div className={styles.productStats}>
                    <div className={styles.statBox}>
                      <span>Perniagaan</span>
                      <strong>{formatNumber(p.businessCount)}</strong>
                    </div>
                    <div className={styles.statBox}>
                      <span>Produk</span>
                      <strong>{formatNumber(p.productCount)}</strong>
                    </div>
                  </div>

                  <div className={styles.productFooter}>
                    <div>
                      <span className={styles.footerLabel}>Harga purata</span>
                      <strong>{formatMoney(p.avgPrice)}</strong>
                    </div>
                    <div className={styles.marginBadge}>
                      <TrendIcon />
                      <span>{p.avgMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <span>CostSmart Admin</span>
          <span>Analitik permintaan produk</span>
        </footer>
      </main>
    </div>
  );
}

/* -------------------- Subcomponents -------------------- */

function SummaryCard({
  label,
  value,
  hint,
  tone,
  icon,
  small,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "green" | "blue" | "violet" | "amber";
  icon: ReactNode;
  small?: boolean;
}) {
  return (
    <article className={styles.summaryCard}>
      <div className={`${styles.summaryIcon} ${styles[`tone_${tone}`]}`}>{icon}</div>
      <div className={styles.summaryText}>
        <span>{label}</span>
        <strong className={small ? styles.summarySmall : undefined}>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function ChartSkeleton() {
  return (
    <div className={styles.chartWrap}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className={styles.chartRow} key={i}>
          <span className={styles.skRank} />
          <span className={styles.skLabel} />
          <span className={styles.skBar} />
        </div>
      ))}
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className={styles.productGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className={styles.skeletonCard} key={i}>
          <div className={styles.skeletonTop}>
            <span className={styles.skAvatar} />
            <span className={styles.skLines} />
          </div>
          <span className={styles.skStats} />
          <span className={styles.skFooter} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyMark}>
        <BoxIcon />
      </span>
      <strong>{title}</strong>
      <p>{hint}</p>
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
const BoxIcon = () => (
  <Icon>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="M3 8v9l9 5 9-5V8M12 13v9" />
  </Icon>
);
const TagIcon = () => (
  <Icon>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-8-8A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8Z" />
    <circle cx="7" cy="7" r="1.2" />
  </Icon>
);
const BuildingIcon = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 21V9h6v12M7 7h.01M17 7h.01M7 11h.01M17 11h.01" />
  </Icon>
);
const TrendIcon = () => (
  <Icon>
    <path d="m3 17 6-6 4 4 8-9" />
    <path d="M15 6h6v6" />
  </Icon>
);
const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);