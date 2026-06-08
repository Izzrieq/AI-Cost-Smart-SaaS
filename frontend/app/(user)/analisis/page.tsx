"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/app/(user)/components/BottomNavbar";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Product {
  product_id: string;
  name: string;
  selling_price: number;
  image_url: string | null;
}

interface Cost {
  costs_id: string;
  type: string;      // "tenaga" | "indirect"
  behavior: string;  // "fixed" | "variable"
  total_cost: number;
}

interface Production {
  production_id: string;
  total_cost: number;
  units_produced: number;
}

interface ProductCVP {
  product_id: string;
  name: string;
  selling_price: number;

  // Cost breakdown
  bahan_total: number;
  tenaga_total: number;
  overhead_total: number;
  total_variable_cost: number;
  total_fixed_cost: number;
  total_batch_cost: number;
  units_produced: number;

  // Single Product CVP
  variable_cost_per_unit: number;
  total_cost_per_unit: number;
  cm_per_unit: number;
  cm_ratio: number;               // CM/unit ÷ SP × 100
  net_profit_margin_pct: number;  // (SP − total_cost/unit) / SP × 100
  bep_units_single: number;       // FC / CM per unit (single product)
  min_selling_price: number;      // total_batch_cost / units_produced
  net_profit_batch: number;       // CM/unit × units − FC

  // Multiple Product CVP (filled after all products calculated)
  sales_mix_pct: number;          // units / total_units × 100
  weighted_cm: number;            // CM/unit × sales_mix%
  bep_units_multi: number;        // BEP_total × sales_mix%
}

// ─── ICONS ───────────────────────────────────────────────────────────────────

const IconChart      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const IconBox        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>;
const IconUser       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconZap        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconArrowRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>;
const IconTrend      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconEmpty      = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
const IconTarget     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconShield     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Net Profit Margin — header label (SME friendly)
const getMarginMeta = (m: number) => {
  if (m >= 30) return { label: "Sihat",     bar: "#22c55e", text: "#15803d", bg: "#f0fdf4", dot: "#4ade80" };
  if (m >= 15) return { label: "Sederhana", bar: "#f59e0b", text: "#b45309", bg: "#fffbeb", dot: "#fbbf24" };
  return               { label: "Rendah",   bar: "#ef4444", text: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" };
};

// ─── MULTIPLE PRODUCT CVP CALCULATOR ─────────────────────────────────────────
//
//  For each product:
//    Variable Cost/unit  = total_variable_cost / units_produced
//    Total Cost/unit     = total_batch_cost / units_produced
//    CM/unit             = selling_price − variable_cost/unit
//    CM Ratio            = CM/unit / selling_price × 100
//    Net Profit Margin % = (SP − total_cost/unit) / SP × 100   ← main display
//    BEP single          = fixed_cost / CM/unit
//    Min Selling Price   = total_batch_cost / units_produced
//
//  Across all products:
//    total_units         = Σ units_produced
//    Sales Mix %         = product_units / total_units × 100
//    Weighted CM (WACM)  = Σ (CM/unit × sales_mix%)
//    Total Fixed Cost    = Σ all fixed costs across all products
//    BEP total units     = total_fixed_cost / WACM
//    BEP per product     = BEP_total × sales_mix%

const calcMultiCVP = (products: ProductCVP[]) => {
  const validProducts  = products.filter(p => p.units_produced > 0 && p.selling_price > 0);
  const total_units    = validProducts.reduce((s, p) => s + p.units_produced, 0);
  const total_fc       = validProducts.reduce((s, p) => s + p.total_fixed_cost, 0);
  const total_vc       = validProducts.reduce((s, p) => s + p.total_variable_cost, 0);
  const total_revenue  = validProducts.reduce((s, p) => s + p.selling_price * p.units_produced, 0);

  // Weighted Average CM
  const wacm = total_units > 0
    ? validProducts.reduce((s, p) => {
        const mix = p.units_produced / total_units;
        return s + p.cm_per_unit * mix;
      }, 0)
    : 0;

  // BEP total units
  const bep_total_units = wacm > 0 ? total_fc / wacm : Infinity;
  const bep_total_rm    = bep_total_units === Infinity ? Infinity : Math.ceil(bep_total_units) * (total_revenue / total_units);

  // Per-product BEP & sales mix
  const enriched = products.map(p => {
    const sales_mix_pct   = total_units > 0 ? (p.units_produced / total_units) * 100 : 0;
    const weighted_cm     = p.cm_per_unit * (sales_mix_pct / 100);
    const bep_units_multi = bep_total_units === Infinity ? Infinity : bep_total_units * (sales_mix_pct / 100);
    return { ...p, sales_mix_pct, weighted_cm, bep_units_multi };
  });

  return {
    enriched,
    total_units,
    total_fc,
    total_vc,
    total_revenue,
    wacm,
    bep_total_units,
    bep_total_rm,
  };
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const router = useRouter();
  const [products, setProducts]       = useState<ProductCVP[]>([]);
  const [loading,  setLoading]        = useState(true);
  const [selected, setSelected]       = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ── FETCH ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const prodRes  = await fetch("http://localhost:8080/products", { headers: { Authorization: `Bearer ${token}` } });
        const prodData = await prodRes.json();
        const prods: Product[] = prodData.products || [];

        if (prods.length === 0) { setProducts([]); setLoading(false); return; }

        const cvpArr: ProductCVP[] = await Promise.all(
          prods.map(async (p) => {
            const [costsRes, prodsRes] = await Promise.all([
              fetch(`http://localhost:8080/products/${p.product_id}/costs`,       { headers: { Authorization: `Bearer ${token}` } }),
              fetch(`http://localhost:8080/products/${p.product_id}/productions`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const costsData = await costsRes.json();
            const prodsData = await prodsRes.json();
            const costs:       Cost[]       = costsData.costs       || [];
            const productions: Production[] = prodsData.productions || [];

            // units_produced = max across all batches (most recent representative batch)
            const units_produced = productions.length > 0
              ? Math.max(...productions.map(pr => Number(pr.units_produced) || 0).filter(n => n > 0), 0) || 1
              : 1;

            // Bahan = always variable
            const bahan_total = productions.reduce((s, pr) => s + parseFloat(String(pr.total_cost ?? 0)), 0);

            const tenaga_total   = costs.filter(c => c.type === "tenaga").reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
            const overhead_total = costs.filter(c => c.type === "indirect").reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);

            const variable_costs = costs.filter(c => c.behavior === "variable");
            const fixed_costs    = costs.filter(c => c.behavior === "fixed");

            const total_variable_other = variable_costs.reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
            const total_fixed_cost     = fixed_costs.reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
            const total_variable_cost  = bahan_total + total_variable_other;
            const total_batch_cost     = total_variable_cost + total_fixed_cost;

            const sp                   = parseFloat(String(p.selling_price));
            const variable_cost_per_unit = units_produced > 0 ? total_variable_cost / units_produced : 0;
            const total_cost_per_unit    = units_produced > 0 ? total_batch_cost     / units_produced : 0;
            const cm_per_unit            = sp - variable_cost_per_unit;
            const cm_ratio               = sp > 0 ? (cm_per_unit / sp) * 100 : 0;
            const net_profit_margin_pct  = sp > 0 ? ((sp - total_cost_per_unit) / sp) * 100 : 0;
            const bep_units_single       = cm_per_unit > 0 ? total_fixed_cost / cm_per_unit : Infinity;
            const min_selling_price      = units_produced > 0 ? total_batch_cost / units_produced : 0;
            const net_profit_batch       = (cm_per_unit * units_produced) - total_fixed_cost;

            return {
              product_id: p.product_id,
              name: p.name,
              selling_price: sp,
              bahan_total,
              tenaga_total,
              overhead_total,
              total_variable_cost,
              total_fixed_cost,
              total_batch_cost,
              units_produced,
              variable_cost_per_unit,
              total_cost_per_unit,
              cm_per_unit,
              cm_ratio,
              net_profit_margin_pct,
              bep_units_single,
              min_selling_price,
              net_profit_batch,
              // multi-product fields filled later
              sales_mix_pct:   0,
              weighted_cm:     0,
              bep_units_multi: 0,
            };
          })
        );

        setProducts(cvpArr);
        if (cvpArr.length > 0) setSelected(cvpArr[0].product_id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── MULTI-PRODUCT CVP ─────────────────────────────────────────────────────
  const multi    = calcMultiCVP(products);
  const enriched = multi.enriched;

  const selectedProduct = enriched.find(p => p.product_id === selected) ?? null;

  // Summary counts using Net Profit Margin (not stored margin_percentage)
  const sihatCount     = enriched.filter(p => p.net_profit_margin_pct >= 30).length;
  const sederhanaCount = enriched.filter(p => p.net_profit_margin_pct >= 15 && p.net_profit_margin_pct < 30).length;
  const rendahCount    = enriched.filter(p => p.net_profit_margin_pct < 15).length;
  const avgNetMargin   = enriched.length > 0
    ? enriched.reduce((s, p) => s + p.net_profit_margin_pct, 0) / enriched.length : 0;
  const maxMargin      = Math.max(...enriched.map(p => p.net_profit_margin_pct), 1);

  // Pie chart for selected product
  const pie = selectedProduct && selectedProduct.total_batch_cost > 0 ? (() => {
    const total    = selectedProduct.total_batch_cost;
    const segments = [
      { label: "Bahan",   value: selectedProduct.bahan_total,   color: "#3b82f6" },
      { label: "Tenaga",  value: selectedProduct.tenaga_total,  color: "#6366f1" },
      { label: "Overhead",value: selectedProduct.overhead_total,color: "#f59e0b" },
    ].filter(s => s.value > 0);
    let cumulative = 0;
    return segments.map(seg => {
      const pct        = seg.value / total;
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
      cumulative      += pct;
      const endAngle   = cumulative * 2 * Math.PI - Math.PI / 2;
      const r = 62; const cx = 80; const cy = 80;
      const x1 = cx + r * Math.cos(startAngle); const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);   const y2 = cy + r * Math.sin(endAngle);
      const largeArc = pct > 0.5 ? 1 : 0;
      return { ...seg, pct, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` };
    });
  })() : [];

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#f5f7fa", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"sans-serif" }}>
        <div style={{ width:34, height:34, borderRadius:"50%", border:"3px solid #dbeafe", borderTopColor:"#2563eb", animation:"spin 0.75s linear infinite" }} />
        <span style={{ fontSize:13, color:"#94a3b8" }}>Memuatkan analisis...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .an-root { min-height:100vh; background:#f5f7fa; font-family:'Plus Jakarta Sans',sans-serif; padding-bottom:110px; -webkit-font-smoothing:antialiased; }

        .an-header { background:linear-gradient(145deg,#1a56db 0%,#2563eb 60%,#3b82f6 100%); padding:52px 20px 72px; position:relative; overflow:hidden; }
        .an-header::before { content:''; position:absolute; top:-60px; right:-40px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.06); }
        .an-header::after  { content:''; position:absolute; bottom:-50px; left:-30px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.04); }
        .an-header-inner { position:relative; z-index:1; }
        .an-header-title    { font-size:22px; font-weight:800; color:#fff; letter-spacing:-0.03em; }
        .an-header-subtitle { font-size:13px; color:rgba(255,255,255,0.65); margin-top:3px; font-weight:500; }

        .an-body { margin-top:-36px; padding:0 16px; position:relative; z-index:10; }

        .an-card { background:#fff; border-radius:20px; border:1px solid #f1f5f9; box-shadow:0 2px 8px rgba(0,0,0,0.04); padding:14px 16px; margin-bottom:14px; animation:fadeUp 0.35s ease both; }
        .an-section-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:12px; display:block; }

        /* Summary strip */
        .an-summary-strip { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; animation:fadeUp 0.3s ease both; }
        .an-summary-chip { border-radius:16px; padding:12px 10px; text-align:center; }
        .an-summary-chip-val { font-size:22px; font-weight:800; letter-spacing:-0.03em; line-height:1; }
        .an-summary-chip-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-top:4px; }
        .an-summary-chip.green { background:#f0fdf4; } .an-summary-chip.green .an-summary-chip-val { color:#15803d; } .an-summary-chip.green .an-summary-chip-label { color:#16a34a; }
        .an-summary-chip.amber { background:#fffbeb; } .an-summary-chip.amber .an-summary-chip-val { color:#b45309; } .an-summary-chip.amber .an-summary-chip-label { color:#d97706; }
        .an-summary-chip.red   { background:#fef2f2; } .an-summary-chip.red .an-summary-chip-val   { color:#dc2626; } .an-summary-chip.red .an-summary-chip-label   { color:#ef4444; }

        /* Multi CVP summary card */
        .an-multi-card { background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:20px; padding:16px; margin-bottom:14px; animation:fadeUp 0.32s ease both; }
        .an-multi-title { font-size:13px; font-weight:800; color:#fff; margin-bottom:3px; }
        .an-multi-sub   { font-size:11px; color:#64748b; margin-bottom:14px; line-height:1.5; }
        .an-multi-grid  { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
        .an-multi-kpi   { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:11px 12px; }
        .an-multi-kpi.highlight { background:rgba(59,130,246,0.2); border-color:rgba(59,130,246,0.35); }
        .an-multi-kpi-label { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:4px; }
        .an-multi-kpi.highlight .an-multi-kpi-label { color:#60a5fa; }
        .an-multi-kpi-val { font-size:15px; font-weight:800; color:#fff; letter-spacing:-0.02em; }
        .an-multi-kpi.highlight .an-multi-kpi-val { color:#93c5fd; }
        .an-multi-kpi-sub { font-size:9px; color:#475569; margin-top:2px; font-weight:500; }
        .an-multi-info { background:rgba(255,255,255,0.04); border-radius:12px; padding:10px 12px; font-size:10.5px; color:#64748b; line-height:1.7; }
        .an-multi-info strong { color:#94a3b8; font-weight:700; }

        /* Bar chart */
        .an-bar-item { margin-bottom:14px; cursor:pointer; }
        .an-bar-item:last-child { margin-bottom:0; }
        .an-bar-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; gap:8px; }
        .an-bar-name { font-size:13px; font-weight:700; color:#1e293b; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .an-bar-name.active { color:#2563eb; }
        .an-bar-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .an-bar-track { height:8px; background:#f1f5f9; border-radius:99px; overflow:hidden; margin-bottom:4px; }
        .an-bar-fill  { height:100%; border-radius:99px; transition:width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .an-bar-meta  { display:flex; justify-content:space-between; }
        .an-bar-meta-text { font-size:10px; color:#94a3b8; font-weight:500; }
        .an-margin-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .an-margin-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:700; }
        .an-selected-indicator { width:20px; height:20px; border-radius:50%; background:#eff6ff; border:1.5px solid #93c5fd; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .an-avg-row { display:flex; align-items:center; justify-content:space-between; padding-top:10px; margin-top:10px; border-top:1px solid #f1f5f9; }
        .an-avg-label { font-size:12px; color:#64748b; font-weight:500; }
        .an-avg-val   { font-size:14px; font-weight:800; color:#1e293b; }

        /* Product pills */
        .an-product-pills { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; -ms-overflow-style:none; scrollbar-width:none; }
        .an-product-pills::-webkit-scrollbar { display:none; }
        .an-product-pill { flex-shrink:0; padding:7px 14px; border-radius:99px; font-size:12px; font-weight:700; border:1.5px solid #f1f5f9; background:#fff; color:#64748b; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; white-space:nowrap; }
        .an-product-pill.active { background:linear-gradient(135deg,#1a56db,#3b82f6); color:#fff; border-color:transparent; box-shadow:0 3px 10px rgba(37,99,235,0.3); }

        /* Detail card sections */
        .an-section-divider { display:flex; align-items:center; gap:8px; margin:14px 0 10px; }
        .an-section-divider-line  { flex:1; height:1px; background:#f1f5f9; }
        .an-section-divider-label { font-size:9px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.12em; white-space:nowrap; }

        /* KPI grid */
        .an-kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
        .an-kpi { border-radius:14px; padding:11px 12px; }
        .an-kpi-label { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:4px; }
        .an-kpi-val   { font-size:15px; font-weight:800; letter-spacing:-0.02em; }
        .an-kpi-sub   { font-size:9px; margin-top:2px; font-weight:500; opacity:0.75; }
        .an-kpi.blue   { background:#eff6ff; } .an-kpi.blue .an-kpi-label { color:#3b82f6; } .an-kpi.blue .an-kpi-val { color:#1d4ed8; }
        .an-kpi.green  { background:#f0fdf4; } .an-kpi.green .an-kpi-label { color:#16a34a; } .an-kpi.green .an-kpi-val { color:#15803d; }
        .an-kpi.amber  { background:#fffbeb; } .an-kpi.amber .an-kpi-label { color:#d97706; } .an-kpi.amber .an-kpi-val { color:#b45309; }
        .an-kpi.red    { background:#fef2f2; } .an-kpi.red .an-kpi-label   { color:#ef4444; } .an-kpi.red .an-kpi-val   { color:#dc2626; }
        .an-kpi.purple { background:#f5f3ff; } .an-kpi.purple .an-kpi-label { color:#7c3aed; } .an-kpi.purple .an-kpi-val { color:#6d28d9; }
        .an-kpi.slate  { background:#f8fafc; } .an-kpi.slate .an-kpi-label  { color:#64748b; } .an-kpi.slate .an-kpi-val  { color:#334155; }

        /* BEP dark sub-card */
        .an-bep-card { background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:16px; padding:12px; margin-bottom:10px; }
        .an-bep-header { display:flex; align-items:center; gap:7px; margin-bottom:10px; }
        .an-bep-header-icon { width:24px; height:24px; border-radius:7px; background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.3); display:flex; align-items:center; justify-content:center; }
        .an-bep-title    { font-size:12px; font-weight:800; color:#fff; }
        .an-bep-subtitle { font-size:9px; color:#64748b; margin-top:1px; }
        .an-bep-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
        .an-bep-kpi { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:11px; padding:9px 10px; }
        .an-bep-kpi.hl { background:rgba(59,130,246,0.15); border-color:rgba(59,130,246,0.3); }
        .an-bep-kpi-label { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; }
        .an-bep-kpi.hl .an-bep-kpi-label { color:#60a5fa; }
        .an-bep-kpi-val { font-size:14px; font-weight:800; color:#fff; letter-spacing:-0.02em; }
        .an-bep-kpi.hl .an-bep-kpi-val { color:#93c5fd; }
        .an-bep-kpi-sub { font-size:9px; color:#475569; margin-top:2px; font-weight:500; }

        /* Safety margin */
        .an-safety { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:11px; padding:10px 11px; margin-top:8px; }
        .an-safety-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .an-safety-label  { display:flex; align-items:center; gap:5px; font-size:9.5px; font-weight:700; color:#94a3b8; }
        .an-safety-pct    { font-size:11px; font-weight:800; color:#22c55e; }
        .an-safety-track  { height:6px; background:rgba(255,255,255,0.07); border-radius:99px; overflow:hidden; margin-bottom:6px; display:flex; }
        .an-safety-legend { display:flex; gap:12px; }
        .an-safety-legend-item { display:flex; align-items:center; gap:4px; font-size:9px; font-weight:600; color:#64748b; }
        .an-safety-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

        /* Pie */
        .an-pie-wrap { display:flex; align-items:center; gap:16px; }
        .an-pie-legend { flex:1; display:flex; flex-direction:column; gap:10px; }
        .an-legend-item-label { display:flex; align-items:center; justify-content:space-between; margin-bottom:3px; }
        .an-legend-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .an-legend-name { font-size:12px; font-weight:600; color:#475569; }
        .an-legend-val  { font-size:12px; font-weight:800; }
        .an-legend-bar-track { height:4px; background:#f1f5f9; border-radius:99px; overflow:hidden; margin-bottom:2px; }
        .an-legend-bar-fill  { height:100%; border-radius:99px; }
        .an-legend-pct { font-size:10px; color:#94a3b8; font-weight:500; }

        /* Cost rows */
        .an-cost-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
        .an-cost-row-left { display:flex; align-items:center; gap:7px; }
        .an-cost-icon { width:24px; height:24px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .an-cost-label { font-size:12px; color:#64748b; font-weight:500; }
        .an-cost-val   { font-size:12px; color:#334155; font-weight:700; }
        .an-cost-divider { height:1px; background:#f1f5f9; margin:8px 0; }
        .an-cost-total-row { display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:14px; padding:11px 14px; margin-top:10px; }
        .an-cost-total-label { font-size:13px; font-weight:700; color:rgba(255,255,255,0.75); }
        .an-cost-total-val   { font-size:16px; font-weight:800; color:#fff; }

        /* Status banner */
        .an-status-banner { border-radius:16px; padding:13px 14px; display:flex; align-items:center; gap:12px; margin-bottom:10px; }
        .an-status-banner.profit  { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; }
        .an-status-banner.warning { background:linear-gradient(135deg,#fffbeb,#fef3c7); border:1px solid #fde68a; }
        .an-status-banner.danger  { background:linear-gradient(135deg,#fef2f2,#fee2e2); border:1px solid #fecaca; }
        .an-status-icon  { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .an-status-title { font-size:13px; font-weight:800; }
        .an-status-banner.profit .an-status-title  { color:#15803d; }
        .an-status-banner.warning .an-status-title { color:#b45309; }
        .an-status-banner.danger .an-status-title  { color:#dc2626; }
        .an-status-desc { font-size:11px; margin-top:2px; line-height:1.5; }
        .an-status-banner.profit .an-status-desc  { color:#16a34a; }
        .an-status-banner.warning .an-status-desc { color:#d97706; }
        .an-status-banner.danger .an-status-desc  { color:#ef4444; }

        .an-cta-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:6px; padding:13px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; font-size:13px; font-weight:700; color:#2563eb; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:background 0.2s; }
        .an-cta-btn:hover { background:#eff6ff; border-color:#93c5fd; }

        .an-empty { background:#fff; border:2px dashed #e2e8f0; border-radius:20px; padding:48px 24px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; margin-bottom:14px; }
        .an-empty:hover { border-color:#93c5fd; }
        .an-empty-icon { width:56px; height:56px; border-radius:18px; background:linear-gradient(135deg,#dbeafe,#eff6ff); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
        .an-empty-title { font-size:15px; font-weight:700; color:#1e293b; }
        .an-empty-desc  { font-size:13px; color:#94a3b8; text-align:center; line-height:1.5; }
        .an-empty-cta   { margin-top:6px; font-size:13px; font-weight:700; color:#2563eb; background:#eff6ff; border:none; padding:9px 20px; border-radius:99px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }

        .an-no-data { text-align:center; padding:20px 0 8px; color:#94a3b8; font-size:12px; line-height:1.6; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>

      <div className="an-root">

        {/* ── HEADER ── */}
        <div className="an-header">
          <div className="an-header-inner">
            <div className="an-header-title">Analisis Produk</div>
            <div className="an-header-subtitle">
              {enriched.length > 0
                ? `${enriched.length} produk · purata margin bersih ${avgNetMargin.toFixed(1)}%`
                : "Semak margin dan pecahan kos produk anda"}
            </div>
          </div>
        </div>

        <div className="an-body">

          {/* ── EMPTY ── */}
          {enriched.length === 0 ? (
            <div className="an-empty" onClick={() => router.push("/produk")}>
              <div className="an-empty-icon"><IconEmpty /></div>
              <div className="an-empty-title">Tiada data analisis</div>
              <div className="an-empty-desc">Tambah produk dan masukkan kos untuk lihat analisis CVP.</div>
              <button className="an-empty-cta">+ Tambah Produk Pertama</button>
            </div>
          ) : (
            <>
              {/* ── SUMMARY STRIP (uses Net Profit Margin, not stored margin_percentage) ── */}
              <div className="an-summary-strip">
                <div className="an-summary-chip green">
                  <div className="an-summary-chip-val">{sihatCount}</div>
                  <div className="an-summary-chip-label">Sihat</div>
                </div>
                <div className="an-summary-chip amber">
                  <div className="an-summary-chip-val">{sederhanaCount}</div>
                  <div className="an-summary-chip-label">Sederhana</div>
                </div>
                <div className="an-summary-chip red">
                  <div className="an-summary-chip-val">{rendahCount}</div>
                  <div className="an-summary-chip-label">Rendah</div>
                </div>
              </div>

              {/* ── MULTIPLE PRODUCT CVP SUMMARY ── */}
              <div className="an-multi-card" style={{ animationDelay:"0.05s" }}>
                <div className="an-multi-title">📊 CVP Pelbagai Produk</div>
                <div className="an-multi-sub">
                  Jumlah {multi.total_units} unit dari {enriched.length} produk · Formula: WACM + BEP Gabungan
                </div>
                <div className="an-multi-grid">
                  {/* WACM */}
                  <div className="an-multi-kpi highlight">
                    <div className="an-multi-kpi-label">Purata Berwajaran CM (WACM)</div>
                    <div className="an-multi-kpi-val">RM {multi.wacm.toFixed(2)}</div>
                    <div className="an-multi-kpi-sub">Σ (CM/unit × sales mix%)</div>
                  </div>
                  {/* BEP Total */}
                  <div className="an-multi-kpi highlight">
                    <div className="an-multi-kpi-label">BEP Gabungan (unit)</div>
                    <div className="an-multi-kpi-val">
                      {multi.bep_total_units === Infinity ? "∞" : Math.ceil(multi.bep_total_units)}
                    </div>
                    <div className="an-multi-kpi-sub">Jumlah FC ÷ WACM</div>
                  </div>
                  {/* Total Fixed Cost */}
                  <div className="an-multi-kpi">
                    <div className="an-multi-kpi-label">Jumlah Kos Tetap</div>
                    <div className="an-multi-kpi-val">RM {multi.total_fc.toFixed(0)}</div>
                    <div className="an-multi-kpi-sub">semua produk</div>
                  </div>
                  {/* Total Revenue at capacity */}
                  <div className="an-multi-kpi">
                    <div className="an-multi-kpi-label">Hasil Jualan (kapasiti)</div>
                    <div className="an-multi-kpi-val">RM {multi.total_revenue.toFixed(0)}</div>
                    <div className="an-multi-kpi-sub">SP × unit per produk</div>
                  </div>
                </div>

                {/* Sales mix table */}
                <div className="an-multi-info">
                  {enriched.map(p => (
                    <div key={p.product_id} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <strong>{p.name}</strong>
                      <span>
                        Mix: {p.sales_mix_pct.toFixed(1)}% ·
                        CM: RM {p.cm_per_unit.toFixed(2)} ·
                        BEP: {p.bep_units_multi === Infinity ? "∞" : Math.ceil(p.bep_units_multi)} unit
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── BAR CHART — uses Net Profit Margin ── */}
              <div className="an-card" style={{ animationDelay:"0.08s" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div>
                    <span className="an-section-label" style={{ marginBottom:2 }}>Carta Margin</span>
                    <div style={{ fontSize:14, fontWeight:800, color:"#1e293b", letterSpacing:"-0.01em" }}>
                      Margin Untung Bersih % Per Produk
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                    {[{ dot:"#22c55e", label:"Sihat" },{ dot:"#f59e0b", label:"Sederhana" },{ dot:"#ef4444", label:"Rendah" }].map(l => (
                      <div key={l.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:l.dot }} />
                        <span style={{ fontSize:10, fontWeight:600, color:"#94a3b8" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {enriched.map((p, idx) => {
                  const meta     = getMarginMeta(p.net_profit_margin_pct);
                  const barWidth = Math.max(4, (p.net_profit_margin_pct / Math.max(maxMargin, 50)) * 100);
                  const isSel    = selected === p.product_id;
                  return (
                    <div key={p.product_id} className="an-bar-item" style={{ animationDelay:`${0.08 + idx * 0.04}s` }} onClick={() => setSelected(p.product_id)}>
                      <div className="an-bar-header">
                        <span className={`an-bar-name ${isSel ? "active" : ""}`}>{p.name}</span>
                        <div className="an-bar-right">
                          <span className="an-margin-pill" style={{ background:meta.bg }}>
                            <div className="an-margin-dot" style={{ background:meta.dot }} />
                            <span style={{ color:meta.text }}>{p.net_profit_margin_pct.toFixed(1)}%</span>
                          </span>
                          {isSel && (
                            <div className="an-selected-indicator">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="an-bar-track">
                        <div className="an-bar-fill" style={{ width:`${barWidth}%`, background:meta.bar }} />
                      </div>
                      <div className="an-bar-meta">
                        {p.total_batch_cost > 0 ? (
                          <>
                            <span className="an-bar-meta-text">Kos batch: RM {p.total_batch_cost.toFixed(2)}</span>
                            <span className="an-bar-meta-text">Jual: RM {p.selling_price.toFixed(2)}/unit</span>
                          </>
                        ) : (
                          <span className="an-bar-meta-text">Belum ada data kos</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="an-avg-row">
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:20, height:20, borderRadius:6, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <IconTrend />
                    </div>
                    <span className="an-avg-label">Purata Margin Untung Bersih</span>
                  </div>
                  <span className="an-avg-val">{avgNetMargin.toFixed(1)}%</span>
                </div>
              </div>

              {/* ── PRODUCT PILLS ── */}
              <div className="an-card" style={{ animationDelay:"0.12s" }}>
                <span className="an-section-label">Pilih Produk untuk Analisis Terperinci</span>
                <div className="an-product-pills">
                  {enriched.map(p => (
                    <button key={p.product_id} className={`an-product-pill ${selected === p.product_id ? "active" : ""}`} onClick={() => setSelected(p.product_id)}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── SELECTED PRODUCT DETAIL ── */}
              {selectedProduct && (
                <div className="an-card" style={{ animationDelay:"0.16s" }}>

                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <div>
                      <span className="an-section-label" style={{ marginBottom:2 }}>Analisis Produk</span>
                      <div style={{ fontSize:14, fontWeight:800, color:"#1e293b" }}>{selectedProduct.name}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                      {/* Net Profit Margin — primary */}
                      <div className="an-margin-pill" style={{ background: getMarginMeta(selectedProduct.net_profit_margin_pct).bg }}>
                        <div className="an-margin-dot" style={{ background: getMarginMeta(selectedProduct.net_profit_margin_pct).dot }} />
                        <span style={{ color: getMarginMeta(selectedProduct.net_profit_margin_pct).text, fontSize:11, fontWeight:700 }}>
                          Untung {selectedProduct.net_profit_margin_pct.toFixed(1)}% — {getMarginMeta(selectedProduct.net_profit_margin_pct).label}
                        </span>
                      </div>
                      {/* CM Ratio — secondary */}
                      <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>CM Ratio: {selectedProduct.cm_ratio.toFixed(1)}%</span>
                    </div>
                  </div>

                  {selectedProduct.total_batch_cost === 0 ? (
                    <div className="an-no-data">Belum ada data kos untuk produk ini.<br/>Klik butang di bawah untuk tambah kos.</div>
                  ) : (
                    <>
                      {/* Pie chart */}
                      <div className="an-pie-wrap" style={{ marginBottom:14 }}>
                        <div style={{ flexShrink:0 }}>
                          <svg width="160" height="160" viewBox="0 0 160 160">
                            {pie.map((seg, i) => (
                              <path key={i} d={seg.path} fill={seg.color} stroke="#fff" strokeWidth="2.5" />
                            ))}
                            <circle cx="80" cy="80" r="36" fill="white" />
                            <text x="80" y="75" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">KOS BATCH</text>
                            <text x="80" y="90" textAnchor="middle" fontSize="11" fill="#1e293b" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
                              RM {selectedProduct.total_batch_cost.toFixed(0)}
                            </text>
                          </svg>
                        </div>
                        <div className="an-pie-legend">
                          {[
                            { label:"Bahan",   value:selectedProduct.bahan_total,   color:"#3b82f6", textColor:"#1d4ed8" },
                            { label:"Tenaga",  value:selectedProduct.tenaga_total,  color:"#6366f1", textColor:"#4338ca" },
                            { label:"Overhead",value:selectedProduct.overhead_total,color:"#f59e0b", textColor:"#b45309" },
                          ].map(item => {
                            const pct = selectedProduct.total_batch_cost > 0 ? ((item.value / selectedProduct.total_batch_cost) * 100).toFixed(1) : "0";
                            return (
                              <div key={item.label}>
                                <div className="an-legend-item-label">
                                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                    <div className="an-legend-dot" style={{ background:item.color }} />
                                    <span className="an-legend-name">{item.label}</span>
                                  </div>
                                  <span className="an-legend-val" style={{ color:item.textColor }}>RM {item.value.toFixed(2)}</span>
                                </div>
                                <div className="an-legend-bar-track">
                                  <div className="an-legend-bar-fill" style={{ width:`${selectedProduct.total_batch_cost > 0 ? (item.value / selectedProduct.total_batch_cost) * 100 : 0}%`, background:item.color }} />
                                </div>
                                <span className="an-legend-pct">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* SECTION: Margin & CM */}
                      <div className="an-section-divider">
                        <div className="an-section-divider-line" />
                        <div className="an-section-divider-label">Margin &amp; Sumbangan</div>
                        <div className="an-section-divider-line" />
                      </div>
                      <div className="an-kpi-grid">
                        <div className={`an-kpi ${selectedProduct.net_profit_margin_pct >= 30 ? "green" : selectedProduct.net_profit_margin_pct >= 15 ? "amber" : "red"}`}>
                          <div className="an-kpi-label">Margin Untung Bersih</div>
                          <div className="an-kpi-val">{selectedProduct.net_profit_margin_pct.toFixed(1)}%</div>
                          <div className="an-kpi-sub">(SP − kos/unit) ÷ SP</div>
                        </div>
                        <div className={`an-kpi ${selectedProduct.cm_ratio >= 30 ? "green" : selectedProduct.cm_ratio >= 15 ? "amber" : "red"}`}>
                          <div className="an-kpi-label">CM Ratio</div>
                          <div className="an-kpi-val">{selectedProduct.cm_ratio.toFixed(1)}%</div>
                          <div className="an-kpi-sub">CM/unit ÷ harga jual</div>
                        </div>
                        <div className="an-kpi blue">
                          <div className="an-kpi-label">Kos Berubah/Unit</div>
                          <div className="an-kpi-val">RM {selectedProduct.variable_cost_per_unit.toFixed(2)}</div>
                          <div className="an-kpi-sub">bahan + kos berubah</div>
                        </div>
                        <div className={`an-kpi ${selectedProduct.cm_per_unit >= 0 ? "green" : "red"}`}>
                          <div className="an-kpi-label">CM / Unit</div>
                          <div className="an-kpi-val">RM {selectedProduct.cm_per_unit.toFixed(2)}</div>
                          <div className="an-kpi-sub">SP − kos berubah/unit</div>
                        </div>
                      </div>

                      {/* SECTION: Multiple Product CVP per this product */}
                      <div className="an-section-divider">
                        <div className="an-section-divider-line" />
                        <div className="an-section-divider-label">CVP Pelbagai Produk — Bahagian Ini</div>
                        <div className="an-section-divider-line" />
                      </div>
                      <div className="an-kpi-grid">
                        <div className="an-kpi slate">
                          <div className="an-kpi-label">Sales Mix %</div>
                          <div className="an-kpi-val">{selectedProduct.sales_mix_pct.toFixed(1)}%</div>
                          <div className="an-kpi-sub">{selectedProduct.units_produced} / {multi.total_units} unit</div>
                        </div>
                        <div className="an-kpi blue">
                          <div className="an-kpi-label">Weighted CM</div>
                          <div className="an-kpi-val">RM {selectedProduct.weighted_cm.toFixed(2)}</div>
                          <div className="an-kpi-sub">CM/unit × sales mix%</div>
                        </div>
                        <div className="an-kpi purple">
                          <div className="an-kpi-label">BEP (Pelbagai Produk)</div>
                          <div className="an-kpi-val">
                            {selectedProduct.bep_units_multi === Infinity ? "∞" : Math.ceil(selectedProduct.bep_units_multi)} unit
                          </div>
                          <div className="an-kpi-sub">BEP total × sales mix%</div>
                        </div>
                        <div className="an-kpi slate">
                          <div className="an-kpi-label">Harga Minimum Jual</div>
                          <div className="an-kpi-val">RM {selectedProduct.min_selling_price.toFixed(2)}</div>
                          <div className="an-kpi-sub">kos batch ÷ {selectedProduct.units_produced} unit</div>
                        </div>
                      </div>

                      {/* SECTION: BEP dark card */}
                      <div className="an-section-divider">
                        <div className="an-section-divider-line" />
                        <div className="an-section-divider-label">Titik Pulang Modal (BEP)</div>
                        <div className="an-section-divider-line" />
                      </div>
                      <div className="an-bep-card">
                        <div className="an-bep-header">
                          <div className="an-bep-header-icon"><IconTarget /></div>
                          <div>
                            <div className="an-bep-title">Break-Even Point (Single Product)</div>
                            <div className="an-bep-subtitle">Angka minimum untuk produk ini tidak rugi</div>
                          </div>
                        </div>
                        <div className="an-bep-grid">
                          <div className="an-bep-kpi hl">
                            <div className="an-bep-kpi-label">Harga Minimum Jual</div>
                            <div className="an-bep-kpi-val">RM {selectedProduct.min_selling_price.toFixed(2)}</div>
                            <div className="an-bep-kpi-sub">kos batch ÷ {selectedProduct.units_produced} unit</div>
                          </div>
                          <div className="an-bep-kpi hl">
                            <div className="an-bep-kpi-label">Unit Minimum Jual</div>
                            <div className="an-bep-kpi-val">
                              {selectedProduct.bep_units_single === Infinity ? "∞" : Math.ceil(selectedProduct.bep_units_single)} unit
                            </div>
                            <div className="an-bep-kpi-sub">dari {selectedProduct.units_produced} unit batch</div>
                          </div>
                          <div className="an-bep-kpi">
                            <div className="an-bep-kpi-label">Hasil Jualan BEP</div>
                            <div className="an-bep-kpi-val" style={{ fontSize:13 }}>
                              {selectedProduct.bep_units_single === Infinity ? "∞"
                                : `RM ${(Math.ceil(selectedProduct.bep_units_single) * selectedProduct.selling_price).toFixed(2)}`}
                            </div>
                            <div className="an-bep-kpi-sub">BEP unit × RM {selectedProduct.selling_price.toFixed(2)}</div>
                          </div>
                          <div className="an-bep-kpi">
                            <div className="an-bep-kpi-label">Kos Seunit (Total)</div>
                            <div className="an-bep-kpi-val" style={{ fontSize:13 }}>RM {selectedProduct.total_cost_per_unit.toFixed(2)}</div>
                            <div className="an-bep-kpi-sub">kos batch ÷ {selectedProduct.units_produced} unit</div>
                          </div>
                        </div>

                        {/* Safety margin bar */}
                        {selectedProduct.bep_units_single !== Infinity && (
                          <div className="an-safety">
                            <div className="an-safety-header">
                              <div className="an-safety-label"><IconShield /><span>Margin Keselamatan</span></div>
                              <div className="an-safety-pct">
                                {(() => {
                                  const bepCeil   = Math.ceil(selectedProduct.bep_units_single);
                                  const safeUnits = Math.max(0, selectedProduct.units_produced - bepCeil);
                                  const safePct   = (safeUnits / selectedProduct.units_produced) * 100;
                                  return `${safePct.toFixed(1)}% (${safeUnits} unit buffer)`;
                                })()}
                              </div>
                            </div>
                            {(() => {
                              const bepCeil    = Math.ceil(selectedProduct.bep_units_single);
                              const bepBarFill = Math.min(100, (bepCeil / selectedProduct.units_produced) * 100);
                              const safeUnits  = Math.max(0, selectedProduct.units_produced - bepCeil);
                              return (
                                <>
                                  <div className="an-safety-track">
                                    <div style={{ width:`${bepBarFill}%`, background:"linear-gradient(90deg,#ef4444,#f97316)", borderRadius:"99px 0 0 99px" }} />
                                    <div style={{ flex:1, background:"linear-gradient(90deg,#22c55e,#4ade80)", borderRadius:"0 99px 99px 0" }} />
                                  </div>
                                  <div className="an-safety-legend">
                                    <div className="an-safety-legend-item"><div className="an-safety-dot" style={{ background:"#ef4444" }} />BEP: {bepCeil} unit</div>
                                    <div className="an-safety-legend-item"><div className="an-safety-dot" style={{ background:"#22c55e" }} />Selamat: {safeUnits} unit</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Cost breakdown */}
                      <div style={{ marginBottom:10 }}>
                        <div className="an-cost-row">
                          <div className="an-cost-row-left">
                            <div className="an-cost-icon" style={{ background:"#eff6ff" }}><IconBox /></div>
                            <span className="an-cost-label">Bahan Mentah (Berubah)</span>
                          </div>
                          <span className="an-cost-val">RM {selectedProduct.bahan_total.toFixed(2)}</span>
                        </div>
                        <div className="an-cost-row">
                          <div className="an-cost-row-left">
                            <div className="an-cost-icon" style={{ background:"#f5f3ff" }}><IconUser /></div>
                            <span className="an-cost-label">Tenaga Kerja</span>
                          </div>
                          <span className="an-cost-val">RM {selectedProduct.tenaga_total.toFixed(2)}</span>
                        </div>
                        <div className="an-cost-row">
                          <div className="an-cost-row-left">
                            <div className="an-cost-icon" style={{ background:"#fffbeb" }}><IconZap /></div>
                            <span className="an-cost-label">Overhead</span>
                          </div>
                          <span className="an-cost-val">RM {selectedProduct.overhead_total.toFixed(2)}</span>
                        </div>
                        <div className="an-cost-divider" />
                        <div className="an-cost-row">
                          <span className="an-cost-label" style={{ fontWeight:700, color:"#1e293b" }}>Total Kos Batch</span>
                          <span className="an-cost-val" style={{ fontSize:14 }}>RM {selectedProduct.total_batch_cost.toFixed(2)}</span>
                        </div>
                        <div className="an-cost-total-row">
                          <span className="an-cost-total-label">💰 Harga Minimum Jual</span>
                          <span className="an-cost-total-val">RM {selectedProduct.min_selling_price.toFixed(2)} / unit</span>
                        </div>
                      </div>

                      {/* Profit banner */}
                      {(() => {
                        const meta        = getMarginMeta(selectedProduct.net_profit_margin_pct);
                        const bannerClass = meta.label === "Sihat" ? "profit" : meta.label === "Sederhana" ? "warning" : "danger";
                        const iconBg      = meta.label === "Sihat" ? "#dcfce7" : meta.label === "Sederhana" ? "#fef3c7" : "#fee2e2";
                        return (
                          <div className={`an-status-banner ${bannerClass}`}>
                            <div className="an-status-icon" style={{ background:iconBg }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={meta.text} strokeWidth="2.5" strokeLinecap="round">
                                {meta.label === "Sihat"
                                  ? <polyline points="20 6 9 17 4 12" />
                                  : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                              </svg>
                            </div>
                            <div>
                              <div className="an-status-title">
                                {selectedProduct.net_profit_batch >= 0
                                  ? `Untung batch: RM ${selectedProduct.net_profit_batch.toFixed(2)}`
                                  : `Rugi batch: RM ${Math.abs(selectedProduct.net_profit_batch).toFixed(2)}`}
                              </div>
                              <div className="an-status-desc">
                                {meta.label === "Sihat"
                                  ? `Margin ${selectedProduct.net_profit_margin_pct.toFixed(1)}% — produk ini menguntungkan. Teruskan strategi semasa.`
                                  : meta.label === "Sederhana"
                                  ? `Margin ${selectedProduct.net_profit_margin_pct.toFixed(1)}% — cuba kurangkan kos atau naikkan harga.`
                                  : `Margin ${selectedProduct.net_profit_margin_pct.toFixed(1)}% — semak semula kos dan harga jual segera.`}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  <button className="an-cta-btn" style={{ marginTop: selectedProduct.total_batch_cost === 0 ? 14 : 10 }} onClick={() => router.push(`/produk/${selectedProduct.product_id}`)}>
                    <IconChart />
                    Edit Kos Produk
                    <IconArrowRight />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <BottomNavbar />
      </div>
    </>
  );
}
