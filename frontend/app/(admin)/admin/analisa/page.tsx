"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/(admin)/components/AdminSidebar";
import { API_URL } from "@/lib/api";
import styles from "./analisa.module.css";

type AdminUser = { user_id: string; name: string; email: string; role: string };

type GrowthPoint = {
  day: string;
  users: number;
  businesses: number;
  products: number;
  reports: number;
};

type TopBusiness = {
  business_id: string;
  business_name: string;
  type: string;
  owner_name?: string | null;
  product_count: number;
  total_cost: number;
  avg_margin: number;
};

type CostSlice = { type: string; total: number };
type CountRow = { role?: string; type?: string; status?: string; band?: string; count: number };

type AnalyticsData = {
  days: number;
  growth: GrowthPoint[];
  topBusinesses: TopBusiness[];
  costSplit: CostSlice[];
  roleDist: CountRow[];
  bizTypeDist: CountRow[];
  marginBands: CountRow[];
  reportStats: CountRow[];
  totals: {
    total_users: number;
    total_businesses: number;
    total_products: number;
    total_cost: number;
    avg_margin: number;
    total_reports: number;
    open_reports: number;
  };
};

const emptyData: AnalyticsData = {
  days: 30,
  growth: [],
  topBusinesses: [],
  costSplit: [],
  roleDist: [],
  bizTypeDist: [],
  marginBands: [],
  reportStats: [],
  totals: {
    total_users: 0,
    total_businesses: 0,
    total_products: 0,
    total_cost: 0,
    avg_margin: 0,
    total_reports: 0,
    open_reports: 0,
  },
};

function formatNumber(v: number) {
  return new Intl.NumberFormat("ms-MY").format(Number(v) || 0);
}
function formatMoney(v: number) {
  return `RM ${new Intl.NumberFormat("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0)}`;
}
function shortMoney(v: number) {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}j`;
  if (n >= 1_000) return `RM ${(n / 1_000).toFixed(1)}k`;
  return `RM ${n.toFixed(0)}`;
}
function formatRole(r?: string) {
  const m: Record<string, string> = {
    super_admin: "Super admin",
    admin: "Admin",
    business_owner: "Pemilik perniagaan",
    staff: "Kakitangan",
    user: "Pengguna",
  };
  return (r && m[r]) || r || "—";
}
function formatBizType(t?: string) {
  const m: Record<string, string> = {
    home: "Rumah",
    stall: "Gerai",
    dropship: "Dropship",
  };
  return (t && m[t]) || t || "—";
}
function formatCostType(t?: string) {
  const m: Record<string, string> = {
    tenaga: "Tenaga kerja",
    indirect: "Tidak langsung",
  };
  return (t && m[t]) || t || "—";
}

const PALETTE = ["#398558", "#4776ab", "#7763ad", "#b27b34", "#7a9a54"];

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [data, setData] = useState<AnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [days, setDays] = useState(30);

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

  const fetchData = useCallback(
    async (token: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(`${API_URL}/admin/analytics?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          setLoadError(true);
          return;
        }
        const json = (await res.json()) as AnalyticsData;
        setData({ ...emptyData, ...json });
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days],
  );

  useEffect(() => {
    const token = authGuard();
    if (!token) return;
    void fetchData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authGuard, days]);

  const refresh = () => {
    const token = localStorage.getItem("token");
    if (token) void fetchData(token, { silent: true });
  };

  const firstName = me?.name?.trim().split(/\s+/)[0] || "Admin";
  const today = new Intl.DateTimeFormat("ms-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // ─── Chart data prep ────────────────────────────────────────
  const growthSeries = useMemo(() => {
    const g = data.growth;
    return {
      labels: g.map((p) => p.day),
      users: g.map((p) => p.users),
      businesses: g.map((p) => p.businesses),
      products: g.map((p) => p.products),
      reports: g.map((p) => p.reports),
    };
  }, [data.growth]);

  const growthTotals = useMemo(() => {
    return data.growth.reduce(
      (acc, d) => ({
        users: acc.users + d.users,
        businesses: acc.businesses + d.businesses,
        products: acc.products + d.products,
        reports: acc.reports + d.reports,
      }),
      { users: 0, businesses: 0, products: 0, reports: 0 },
    );
  }, [data.growth]);

  const costSlices = data.costSplit.filter((c) => c.total > 0);
  const costTotal = costSlices.reduce((s, c) => s + c.total, 0);

  return (
    <div className={styles.adminShell}>
      <AdminSidebar isSuperAdmin={isSuperAdmin} onLogout={logout} />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>WAWASAN</p>
            <h1>Analisa</h1>
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
            Data analitik tidak dapat dimuatkan. Cuba segarkan semula.
            <button onClick={refresh}>Cuba lagi</button>
          </div>
        )}

        <div className={styles.periodBar}>
          <div className={styles.periodLabel}>Tempoh analisis</div>
          <div className={styles.periodPills}>
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                className={`${styles.pill} ${days === d ? styles.pillActive : ""}`}
                onClick={() => setDays(d)}
                disabled={loading}
              >
                {d}h
              </button>
            ))}
            {refreshing && <span className={styles.refreshDot} />}
          </div>
        </div>

        <section className={styles.summaryGrid}>
          <SummaryCard label="Pengguna" value={formatNumber(data.totals.total_users)} hint={`+${growthTotals.users} dalam ${days}h`} tone="green" />
          <SummaryCard label="Perniagaan" value={formatNumber(data.totals.total_businesses)} hint={`+${growthTotals.businesses} dalam ${days}h`} tone="blue" />
          <SummaryCard label="Produk" value={formatNumber(data.totals.total_products)} hint={`+${growthTotals.products} dalam ${days}h`} tone="violet" />
          <SummaryCard label="Jumlah kos" value={shortMoney(data.totals.total_cost)} hint="Kos terkumpul" tone="amber" />
        </section>

        <section className={styles.growthPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.sectionEyebrow}>PERTUMBUHAN</span>
              <h2>Aktiviti platform ({days} hari)</h2>
            </div>
            <div className={styles.legendRow}>
              <Legend color={PALETTE[0]} label="Pengguna" />
              <Legend color={PALETTE[1]} label="Perniagaan" />
              <Legend color={PALETTE[2]} label="Produk" />
              <Legend color={PALETTE[3]} label="Laporan" />
            </div>
          </div>

          {loading ? (
            <div className={styles.skChart} />
          ) : growthSeries.labels.length === 0 ? (
            <EmptyState title="Tiada data pertumbuhan" hint="Aktiviti akan dipaparkan apabila pengguna mula menggunakan platform." />
          ) : (
            <StackedAreaChart
              labels={growthSeries.labels}
              series={[
                { key: "users", label: "Pengguna", color: PALETTE[0], values: growthSeries.users },
                { key: "businesses", label: "Perniagaan", color: PALETTE[1], values: growthSeries.businesses },
                { key: "products", label: "Produk", color: PALETTE[2], values: growthSeries.products },
                { key: "reports", label: "Laporan", color: PALETTE[3], values: growthSeries.reports },
              ]}
            />
          )}
        </section>

        <section className={styles.twoCol}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionEyebrow}>KOS</span>
                <h2>Pembahagian jenis kos</h2>
              </div>
            </div>
            {loading ? (
              <div className={styles.skChart} />
            ) : costSlices.length === 0 ? (
              <EmptyState title="Tiada kos direkod" hint="Kos yang ditambah oleh perniagaan akan muncul di sini." />
            ) : (
              <div className={styles.donutWrap}>
                <Donut
                  slices={costSlices.map((c, i) => ({
                    value: c.total,
                    color: PALETTE[i % PALETTE.length],
                    label: formatCostType(c.type),
                  }))}
                  total={costTotal}
                  centerLabel={shortMoney(costTotal)}
                  centerSub="jumlah kos"
                />
                <div className={styles.donutLegend}>
                  {costSlices.map((c, i) => (
                    <div className={styles.legendItem} key={c.type}>
                      <span className={styles.legendDot} style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className={styles.legendName}>{formatCostType(c.type)}</span>
                      <strong>{shortMoney(c.total)}</strong>
                      <span className={styles.legendPct}>
                        {costTotal ? ((c.total / costTotal) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionEyebrow}>KOMUNITI</span>
                <h2>Pengguna mengikut peranan</h2>
              </div>
            </div>
            {loading ? (
              <div className={styles.skChart} />
            ) : data.roleDist.length === 0 ? (
              <EmptyState title="Tiada data" hint="Pengguna akan muncul di sini." />
            ) : (
              <BarBreakdown
                rows={data.roleDist.map((r, i) => ({
                  label: formatRole(r.role),
                  value: r.count,
                  color: PALETTE[i % PALETTE.length],
                }))}
              />
            )}
          </article>
        </section>

        <section className={styles.twoCol}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionEyebrow}>PERNIAGAAN</span>
                <h2>Top 10 perniagaan aktif</h2>
              </div>
            </div>
            {loading ? (
              <div className={styles.skList} />
            ) : data.topBusinesses.length === 0 ? (
              <EmptyState title="Tiada perniagaan" hint="Data akan muncul di sini." />
            ) : (
              <div className={styles.topList}>
                {data.topBusinesses.map((b, i) => (
                  <div className={styles.topRow} key={b.business_id}>
                    <span className={styles.topRank}>{i + 1}</span>
                    <div className={styles.topBody}>
                      <strong>{b.business_name}</strong>
                      <span>
                        {formatBizType(b.type)} · {b.owner_name || "Tiada pemilik"}
                      </span>
                    </div>
                    <div className={styles.topStats}>
                      <strong>{formatNumber(b.product_count)}</strong>
                      <span>produk</span>
                    </div>
                    <div className={styles.topMargin}>
                      {b.avg_margin.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionEyebrow}>MARGIN</span>
                <h2>Taburan margin produk</h2>
              </div>
            </div>
            {loading ? (
              <div className={styles.skChart} />
            ) : data.marginBands.length === 0 ? (
              <EmptyState title="Tiada data margin" hint="Margin produk akan muncul di sini." />
            ) : (
              <BarBreakdown
                rows={data.marginBands.map((b) => ({
                  label: b.band || "—",
                  value: b.count,
                  color: "#398558",
                }))}
                valueSuffix="produk"
              />
            )}
          </article>
        </section>

        <section className={styles.twoCol}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionEyebrow}>JENIS</span>
                <h2>Jenis perniagaan</h2>
              </div>
            </div>
            {loading ? (
              <div className={styles.skChart} />
            ) : data.bizTypeDist.length === 0 ? (
              <EmptyState title="Tiada data" hint="Jenis perniagaan akan muncul di sini." />
            ) : (
              <BarBreakdown
                rows={data.bizTypeDist.map((b, i) => ({
                  label: formatBizType(b.type),
                  value: b.count,
                  color: PALETTE[i % PALETTE.length],
                }))}
              />
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.sectionEyebrow}>LAPORAN</span>
                <h2>Status laporan</h2>
              </div>
            </div>
            {loading ? (
              <div className={styles.skChart} />
            ) : data.reportStats.length === 0 ? (
              <EmptyState title="Tiada laporan" hint="Laporan pengguna akan muncul di sini." />
            ) : (
              <div className={styles.reportStatusGrid}>
                {data.reportStats.map((s, i) => (
                  <div className={styles.statusTile} key={s.status}>
                    <span className={styles.statusDot} style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className={styles.statusLabel}>
                      {s.status === "pending" ? "Baharu" :
                       s.status === "reviewing" ? "Disemak" :
                       s.status === "resolved" ? "Selesai" :
                       s.status === "closed" ? "Ditutup" : s.status}
                    </span>
                    <strong>{formatNumber(s.count)}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <footer className={styles.footer}>
          <span>CostSmart Admin</span>
          <span>Analitik platform · {days} hari terakhir</span>
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
}: {
  label: string;
  value: string;
  hint: string;
  tone: "green" | "blue" | "violet" | "amber";
}) {
  return (
    <article className={styles.summaryCard}>
      <div className={`${styles.summaryIcon} ${styles[`tone_${tone}`]}`}>
        <DotIcon />
      </div>
      <div className={styles.summaryText}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className={styles.legendItem}>
      <span className={styles.legendDot} style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}

/* Inline stacked area chart using SVG */
function StackedAreaChart({
  labels,
  series,
}: {
  labels: string[];
  series: { key: string; label: string; color: string; values: number[] }[];
}) {
  const W = 800;
  const H = 240;
  const pad = { top: 16, right: 16, bottom: 26, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const totalsByDay = labels.map((_, i) =>
    series.reduce((s, ser) => s + (ser.values[i] || 0), 0),
  );
  const max = Math.max(1, ...totalsByDay);

  // Compute Y for each series cumulative stack
  const cumulative: number[][] = [];
  series.forEach((s, si) => {
    cumulative[si] = s.values.map((v, i) => {
      let base = 0;
      for (let k = 0; k < si; k++) base += series[k].values[i] || 0;
      return base + (v || 0);
    });
  });

  const xFor = (i: number) =>
    pad.left + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * innerW);
  const yFor = (v: number) => pad.top + innerH - (v / max) * innerH;

  // build paths from top series down
  const paths = series.map((s, si) => {
    const top = s.values.map((_, i) => `${xFor(i)},${yFor(cumulative[si][i])}`);
    const baseIdx = si - 1;
    const base = s.values.map((_, i) =>
      `${xFor(i)},${yFor(baseIdx < 0 ? 0 : cumulative[baseIdx][i])}`,
    );
    return `M${top.join(" L")} L${base.reverse().join(" L")} Z`;
  });

  // Grid lines (4)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: pad.top + innerH - p * innerH,
    value: Math.round(p * max),
  }));

  // X labels: show ~6
  const step = Math.max(1, Math.ceil(labels.length / 6));
  const xLabels = labels.filter((_, i) => i % step === 0);

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} preserveAspectRatio="none">
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={g.y} y2={g.y} stroke="#eef2ee" strokeWidth="1" />
            <text x={pad.left - 8} y={g.y + 3} fontSize="9" textAnchor="end" fill="#9aa49e">
              {formatNumber(g.value)}
            </text>
          </g>
        ))}
        {paths.map((d, i) => (
          <path key={series[i].key} d={d} fill={series[i].color} opacity="0.85" />
        ))}
        {xLabels.map((label, i) => {
          const idx = labels.indexOf(label);
          const x = xFor(idx);
          const date = new Date(label);
          const short = Number.isFinite(date.getTime())
            ? new Intl.DateTimeFormat("ms-MY", { day: "2-digit", month: "short" }).format(date)
            : label.slice(5);
          return (
            <text key={label} x={x} y={H - 8} fontSize="9" textAnchor="middle" fill="#9aa49e">
              {short}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function Donut({
  slices,
  total,
  centerLabel,
  centerSub,
}: {
  slices: { value: number; color: string; label: string }[];
  total: number;
  centerLabel: string;
  centerSub: string;
}) {
  const size = 180;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.donutSvg}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef2ee" strokeWidth={stroke} />
      {slices.map((s, i) => {
        const frac = total ? s.value / total : 0;
        const dash = frac * circ;
        const offset = -acc;
        acc += dash;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x={cx} y={cy - 4} fontSize="16" fontWeight="800" textAnchor="middle" fill="#193426">
        {centerLabel}
      </text>
      <text x={cx} y={cy + 13} fontSize="10" textAnchor="middle" fill="#9aa49e">
        {centerSub}
      </text>
    </svg>
  );
}

function BarBreakdown({
  rows,
  valueSuffix,
}: {
  rows: { label: string; value: number; color: string }[];
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={styles.barBreakdown}>
      {rows.map((r) => (
        <div className={styles.barRow} key={r.label}>
          <div className={styles.barLabel}>
            <span>{r.label}</span>
            <strong>
              {formatNumber(r.value)}
              {valueSuffix ? ` ${valueSuffix}` : ""}
            </strong>
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, background: r.color }}
            />
          </div>
        </div>
      ))}
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
const DotIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />
  </Icon>
);