"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { matchFoodImage } from "@/lib/foodImages";
import { API_URL } from "@/lib/api";

interface Product {
  product_id: string;
  name: string;
  description: string;
  selling_price: number;
  image_url: string | null;
}

interface Cost {
  costs_id: string;
  name: string;
  type: string;
  behavior: string;
  cost_per_unit: number;
  total_cost: number;
}

interface Production {
  production_id: string;
  name: string;
  quantity: number;
  unit: string;
  total_cost: number;
  cost_per_unit: number;
  units_produced: number;
  batch_date: string;
  created_at: string;
}

type Tab = "bahan" | "tenaga" | "lain";

const IconBack     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>;
const IconPlus     = ({ size=16, color="currentColor" }: { size?:number; color?:string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IconTrash    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;
const IconClose    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IconSearch   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const IconCheck    = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconBox      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconUser     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconZap      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconInfo     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconArrowRight = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>;
const IconShield   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconTarget   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;

// ─── CVP CALCULATOR ───────────────────────────────────────────────────────────
//
//  All formulas (Single Product CVP):
//
//  Variable Cost/unit    = Total Variable Cost / units_produced
//  Fixed Cost/batch      = sum costs where behavior="fixed"
//  Total Batch Cost      = Variable + Fixed
//  Total Cost/unit       = Total Batch Cost / units_produced         ← Kos Seunit
//
//  CM/unit               = Selling Price − Variable Cost/unit        ← CVP core
//  CM Ratio %            = CM/unit / Selling Price × 100             ← shown as secondary
//
//  Net Profit Margin %   = (SP − Total Cost/unit) / SP × 100        ← HEADER (SME friendly)
//
//  Min Selling Price     = Total Batch Cost / units_produced         ← same as Total Cost/unit
//  BEP units             = Fixed Cost / CM/unit                      ← uses Math.ceil for display
//  BEP Revenue           = Math.ceil(BEP units) × Selling Price      ← FIXED: use ceil not float
//
//  Safety Margin units   = units_produced − ceil(BEP units)
//  Safety Margin %       = Safety units / units_produced × 100
//
//  Net Profit/batch      = (CM/unit × units_produced) − Fixed Cost

const calcCVP = (
  productions: Production[],
  costs: Cost[],
  sellingPrice: number,
  unitsProduced: number,
) => {
  if (unitsProduced <= 0 || sellingPrice <= 0) {
    return {
      variableCostPerUnit: 0, fixedCostPerBatch: 0, totalVariableCost: 0,
      totalFixedCost: 0, totalBatchCost: 0, cmPerUnit: 0,
      cmRatio: 0, netProfitMarginPct: 0, bepUnits: 0, bepRevenue: 0,
      costPerUnitTotal: 0, minSellingPrice: 0, safetyMarginUnits: 0,
      safetyMarginPct: 0, netProfitBatch: 0, isProfitable: false,
    };
  }

  const bahanTotal             = productions.reduce((s, p) => s + parseFloat(String(p.total_cost ?? 0)), 0);
  const variableCosts          = costs.filter((c) => c.behavior === "variable");
  const fixedCosts             = costs.filter((c) => c.behavior === "fixed");
  const totalVariableCostOther = variableCosts.reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
  const totalFixedCost         = fixedCosts.reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);

  const totalVariableCost   = bahanTotal + totalVariableCostOther;
  const variableCostPerUnit = totalVariableCost / unitsProduced;
  const totalBatchCost      = totalVariableCost + totalFixedCost;
  const costPerUnitTotal    = totalBatchCost / unitsProduced;
  const minSellingPrice     = costPerUnitTotal; // same value, clearer label for UI

  const cmPerUnit           = sellingPrice - variableCostPerUnit;
  const cmRatio             = sellingPrice > 0 ? (cmPerUnit / sellingPrice) * 100 : 0;

  // Net Profit Margin — what SME owners understand (uses TOTAL cost per unit)
  const netProfitMarginPct  = sellingPrice > 0
    ? ((sellingPrice - costPerUnitTotal) / sellingPrice) * 100 : 0;

  // BEP
  const bepUnitsRaw   = cmPerUnit > 0 ? totalFixedCost / cmPerUnit : Infinity;
  const bepUnitsCeil  = bepUnitsRaw === Infinity ? Infinity : Math.ceil(bepUnitsRaw);
  // FIXED: BEP Revenue uses ceil units, not raw float
  const bepRevenue    = bepUnitsCeil === Infinity ? Infinity : bepUnitsCeil * sellingPrice;

  // Safety Margin
  const safetyMarginUnits = bepUnitsCeil === Infinity ? 0 : Math.max(0, unitsProduced - bepUnitsCeil);
  const safetyMarginPct   = unitsProduced > 0 ? (safetyMarginUnits / unitsProduced) * 100 : 0;

  // Net profit per batch
  const netProfitBatch = (cmPerUnit * unitsProduced) - totalFixedCost;

  return {
    variableCostPerUnit, fixedCostPerBatch: totalFixedCost, totalVariableCost,
    totalFixedCost, totalBatchCost, cmPerUnit, cmRatio,
    netProfitMarginPct, bepUnits: bepUnitsRaw, bepRevenue,
    costPerUnitTotal, minSellingPrice, safetyMarginUnits,
    safetyMarginPct, netProfitBatch, isProfitable: cmPerUnit > 0,
  };
};

// Header uses Net Profit Margin (37%) NOT CM Ratio (69%)
const getMarginMeta = (margin: number) => {
  if (margin >= 30) return { label: "Sihat",     dot: "#4ade80", color: "#15803d" };
  if (margin >= 15) return { label: "Sederhana", dot: "#fbbf24", color: "#b45309" };
  return               { label: "Rendah",     dot: "#fca5a5", color: "#dc2626" };
};

export default function ProductDetailPage() {
  const router = useRouter();
  const { product_id } = useParams();

  const [product,     setProduct]     = useState<Product | null>(null);
  const [costs,       setCosts]       = useState<Cost[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [tab,         setTab]         = useState<Tab>("bahan");
  const [loading,     setLoading]     = useState(true);
  const [deleting,    setDeleting]    = useState(false);
  const [search,      setSearch]      = useState("");

  const [showAddCost,       setShowAddCost]       = useState(false);
  const [showAddProduction, setShowAddProduction] = useState(false);
  const [addingCost,        setAddingCost]        = useState(false);
  const [addingProd,        setAddingProd]        = useState(false);

  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [selectedCost,       setSelectedCost]       = useState<Cost | null>(null);
  const [savingEdit,         setSavingEdit]          = useState(false);
  const [deletingItem,       setDeletingItem]        = useState(false);

  const [costForm, setCostForm] = useState({ name: "", behavior: "fixed", cost_per_unit: "", total_cost: "" });
  const [prodForm, setProdForm] = useState({
    name: "", quantity: "", unit: "unit", cost_per_unit: "", total_cost: "",
    units_produced: "", batch_date: new Date().toISOString().split("T")[0],
  });
  const [editProdForm, setEditProdForm] = useState({
    name: "", quantity: "", unit: "unit", cost_per_unit: "", total_cost: "",
    units_produced: "", batch_date: "",
  });
  const [editCostForm, setEditCostForm] = useState({ name: "", behavior: "fixed", cost_per_unit: "", total_cost: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [prodRes, costsRes, prodsRes] = await Promise.all([
          fetch(`${API_URL}/${product_id}`,             { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/${product_id}/costs`,       { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/${product_id}/productions`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [pd, cd, prd] = await Promise.all([prodRes.json(), costsRes.json(), prodsRes.json()]);
        setProduct(pd.product);
        setCosts(cd.costs || []);
        setProductions(prd.productions || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [product_id]);

  // ── DERIVED CVP ───────────────────────────────────────────────────────────
  const latestBatch   = productions.length > 0 ? productions[0] : null;
  const unitsProduced = latestBatch
    ? Math.max(...productions.map(p => Number(p.units_produced) || 0).filter(n => n > 0), 0) || 1
    : 1;
  const sellingPrice  = parseFloat(String(product?.selling_price ?? 0));
  const cvp           = calcCVP(productions, costs, sellingPrice, unitsProduced);

  const bahanTotal  = productions.reduce((s, p) => s + parseFloat(String(p.total_cost ?? 0)), 0);
  const tenagaTotal = costs.filter(c => c?.type === "tenaga").reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
  const lainTotal   = costs.filter(c => c?.type === "indirect").reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);

  const hasBahan       = productions.length > 0;
  const hasTenaga      = costs.filter(c => c?.type === "tenaga").length > 0;
  const hasLain        = costs.filter(c => c?.type === "indirect").length > 0;
  const completedSteps = [hasBahan, hasTenaga, hasLain].filter(Boolean).length;

  // FIXED: header uses Net Profit Margin (37%), not CM Ratio (69%)
  const marginMeta = getMarginMeta(cvp.netProfitMarginPct);

  // BEP display values
  const bepUnitsCeil  = cvp.bepUnits === Infinity ? Infinity : Math.ceil(cvp.bepUnits);
  const bepRevDisplay = cvp.bepRevenue === Infinity ? "N/A" : `RM ${cvp.bepRevenue.toFixed(2)}`;
  const bepBarFill    = unitsProduced > 0 && bepUnitsCeil !== Infinity
    ? Math.min(100, (bepUnitsCeil / unitsProduced) * 100) : 100;

  // ── HANDLERS ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm("Padam produk ini?")) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/products/${product_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      router.push("/produk");
    } catch { console.error("Delete error"); } finally { setDeleting(false); }
  };

  const handleAddProduction = async () => {
    if (!prodForm.name || !prodForm.quantity || !prodForm.total_cost || !prodForm.units_produced) return;
    setAddingProd(true);
    try {
      const res = await fetch(`${API_URL}/products/${product_id}/productions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: prodForm.name, quantity: parseFloat(prodForm.quantity), unit: prodForm.unit,
          cost_per_unit: parseFloat(prodForm.cost_per_unit) || parseFloat(prodForm.total_cost) / parseFloat(prodForm.quantity),
          total_cost: parseFloat(prodForm.total_cost), units_produced: parseInt(prodForm.units_produced),
          batch_date: prodForm.batch_date,
        }),
      });
      const data = await res.json();
      if (data.production) setProductions(prev => [data.production, ...prev]);
      setProdForm({ name: "", quantity: "", unit: "unit", cost_per_unit: "", total_cost: "", units_produced: "", batch_date: new Date().toISOString().split("T")[0] });
      setShowAddProduction(false);
    } catch { console.error("Add production error"); } finally { setAddingProd(false); }
  };

  const handleAddCost = async (type: string) => {
    if (!costForm.name || !costForm.cost_per_unit || !costForm.total_cost) return;
    setAddingCost(true);
    try {
      const res = await fetch(`${API_URL}/products/${product_id}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: costForm.name, type, behavior: costForm.behavior, cost_per_unit: parseFloat(costForm.cost_per_unit), total_cost: parseFloat(costForm.total_cost) }),
      });
      const data = await res.json();
      if (data.cost) setCosts(prev => [data.cost, ...prev]);
      setCostForm({ name: "", behavior: "fixed", cost_per_unit: "", total_cost: "" });
      setShowAddCost(false);
    } catch { console.error("Add cost error"); } finally { setAddingCost(false); }
  };

  const handleUpdateQuantity = async (production_id: string, newQty: number) => {
    if (newQty <= 0) return;
    try {
      const prod = productions.find(p => p.production_id === production_id);
      if (!prod) return;
      const newTotal = (newQty * parseFloat(String(prod.cost_per_unit))).toFixed(2);
      setProductions(prev => prev.map(p => p.production_id === production_id ? { ...p, quantity: newQty, total_cost: parseFloat(newTotal) } : p));
      await fetch(`${API_URL}/productions/${production_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: prod.name, quantity: newQty, unit: prod.unit, cost_per_unit: prod.cost_per_unit, total_cost: parseFloat(newTotal), units_produced: prod.units_produced, batch_date: prod.batch_date }),
      });
    } catch { console.error("Update quantity error"); }
  };

  const openEditProduction = (p: Production) => {
    setSelectedProduction(p);
    setEditProdForm({ name: p.name ?? "", quantity: String(p.quantity), unit: p.unit ?? "unit", cost_per_unit: String(p.cost_per_unit), total_cost: String(p.total_cost), units_produced: String(p.units_produced ?? 1), batch_date: p.batch_date ? p.batch_date.split("T")[0] : new Date().toISOString().split("T")[0] });
  };

  const openEditCost = (c: Cost) => {
    setSelectedCost(c);
    setEditCostForm({ name: c.name, behavior: c.behavior, cost_per_unit: String(c.cost_per_unit), total_cost: String(c.total_cost) });
  };

  const handleEditProduction = async () => {
    if (!selectedProduction) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/productions/${selectedProduction.production_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editProdForm.name, quantity: parseFloat(editProdForm.quantity), unit: editProdForm.unit, cost_per_unit: parseFloat(editProdForm.cost_per_unit), total_cost: parseFloat(editProdForm.total_cost), units_produced: parseInt(editProdForm.units_produced), batch_date: editProdForm.batch_date }),
      });
      const data = await res.json();
      setProductions(prev => prev.map(p => p.production_id === selectedProduction.production_id ? data.production : p));
      setSelectedProduction(null);
    } catch { console.error("Edit production error"); } finally { setSavingEdit(false); }
  };

  const handleDeleteProduction = async () => {
    if (!selectedProduction) return;
    setDeletingItem(true);
    try {
      await fetch(`${API_URL}/productions/${selectedProduction.production_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setProductions(prev => prev.filter(p => p.production_id !== selectedProduction.production_id));
      setSelectedProduction(null);
    } catch { console.error("Delete production error"); } finally { setDeletingItem(false); }
  };

  const handleEditCost = async () => {
    if (!selectedCost) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/costs/${selectedCost.costs_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editCostForm.name, behavior: editCostForm.behavior, cost_per_unit: parseFloat(editCostForm.cost_per_unit), total_cost: parseFloat(editCostForm.total_cost) }),
      });
      const data = await res.json();
      setCosts(prev => prev.map(c => c.costs_id === selectedCost.costs_id ? data.cost : c));
      setSelectedCost(null);
    } catch { console.error("Edit cost error"); } finally { setSavingEdit(false); }
  };

  const handleDeleteCost = async () => {
    if (!selectedCost) return;
    setDeletingItem(true);
    try {
      await fetch(`${API_URL}/costs/${selectedCost.costs_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setCosts(prev => prev.filter(c => c.costs_id !== selectedCost.costs_id));
      setSelectedCost(null);
    } catch { console.error("Delete cost error"); } finally { setDeletingItem(false); }
  };

  const filteredProductions = productions.filter(Boolean).filter(p => (p.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "bahan",  label: "Bahan",     icon: <IconBox  /> },
    { key: "tenaga", label: "Tenaga",    icon: <IconUser /> },
    { key: "lain",   label: "Lain-Lain", icon: <IconZap  /> },
  ];
  const tabTooltips: Record<Tab, string> = {
    bahan:  "Masukkan semua bahan mentah untuk 1 batch pengeluaran. Sertakan bilangan unit yang dihasilkan.",
    tenaga: "Kos upah pekerja untuk 1 batch. Bukan gaji bulanan.",
    lain:   "Kos overhead seperti gas, elektrik, pembungkusan per batch.",
  };
  const tabCostType: Record<Tab, string> = { bahan: "", tenaga: "tenaga", lain: "indirect" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "sans-serif" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid #dbeafe", borderTopColor: "#2563eb", animation: "spin 0.75s linear infinite" }} />
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Memuatkan...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pd-root { min-height: 100vh; background: #f5f7fa; font-family: 'Plus Jakarta Sans', sans-serif; padding-bottom: 60px; }

        .pd-header { background: linear-gradient(145deg, #1a56db, #3b82f6); padding: 52px 20px 80px; position: relative; overflow: hidden; }
        .pd-header::before { content:''; position:absolute; top:-60px; right:-40px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.06); }
        .pd-header-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; position:relative; z-index:1; }
        .pd-back-btn { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.16); border:1.5px solid rgba(255,255,255,0.24); backdrop-filter:blur(8px); color:#fff; font-size:13px; font-weight:600; padding:8px 14px; border-radius:99px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:background 0.2s; }
        .pd-back-btn:hover { background:rgba(255,255,255,0.24); }
        .pd-delete-btn { display:flex; align-items:center; justify-content:center; width:36px; height:36px; background:rgba(255,255,255,0.12); border:1.5px solid rgba(255,255,255,0.2); border-radius:50%; cursor:pointer; transition:background 0.2s; }
        .pd-delete-btn:hover { background:rgba(239,68,68,0.2); }
        .pd-delete-btn:disabled { opacity:0.5; pointer-events:none; }
        .pd-hero-info { display:flex; align-items:center; gap:14px; position:relative; z-index:1; }
        .pd-hero-img { width:60px; height:60px; border-radius:18px; overflow:hidden; flex-shrink:0; border:2px solid rgba(255,255,255,0.3); }
        .pd-hero-img img { width:100%; height:100%; object-fit:cover; }
        .pd-hero-name { font-size:20px; font-weight:800; color:#fff; letter-spacing:-0.03em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pd-hero-sub { font-size:13px; color:rgba(255,255,255,0.65); font-weight:500; margin-top:3px; }
        .pd-pills-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
        /* Primary pill: Net Profit Margin */
        .pd-margin-pill { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; font-size:11px; font-weight:700; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.28); }
        /* Secondary pill: CM Ratio */
        .pd-cm-pill { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; font-size:11px; font-weight:600; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); }

        .pd-body { margin-top:-44px; padding:0 16px; position:relative; z-index:10; }
        .pd-card { background:#fff; border-radius:20px; border:1px solid #f1f5f9; box-shadow:0 2px 8px rgba(0,0,0,0.04); padding:14px 16px; margin-bottom:14px; animation:fadeUp 0.35s ease both; }

        .pd-tabs { display:flex; gap:4px; padding:6px; }
        .pd-tab-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 6px; border-radius:14px; border:none; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; font-weight:600; transition:all 0.2s ease; background:transparent; color:#94a3b8; }
        .pd-tab-btn.active { background:linear-gradient(135deg,#1a56db,#3b82f6); color:#fff; box-shadow:0 3px 10px rgba(37,99,235,0.3); }

        .pd-progress-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .pd-progress-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; }
        .pd-progress-count { font-size:11px; font-weight:700; color:#2563eb; background:#eff6ff; padding:2px 8px; border-radius:99px; }
        .pd-progress-track { height:4px; background:#f1f5f9; border-radius:99px; margin-bottom:10px; overflow:hidden; }
        .pd-progress-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,#2563eb,#3b82f6); transition:width 0.5s ease; }
        .pd-step-row { display:flex; align-items:center; gap:10px; margin-bottom:5px; }
        .pd-step-dot { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pd-step-dot.done { background:#22c55e; }
        .pd-step-dot.pending { background:#e2e8f0; }
        .pd-step-dot-inner { width:7px; height:7px; border-radius:50%; background:#94a3b8; }
        .pd-step-label { font-size:13px; font-weight:500; }
        .pd-step-label.done { color:#1e293b; font-weight:600; }
        .pd-step-label.pending { color:#94a3b8; }

        .pd-tooltip { display:flex; align-items:flex-start; gap:10px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:16px; padding:12px 14px; margin-bottom:14px; }
        .pd-tooltip-icon { width:24px; height:24px; border-radius:50%; background:#dbeafe; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pd-tooltip p { font-size:12px; color:#1d4ed8; line-height:1.6; font-weight:500; }

        .pd-action-row { display:flex; gap:10px; margin-bottom:14px; }
        .pd-search-box { flex:1; display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid #f1f5f9; border-radius:14px; padding:11px 14px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
        .pd-search-box input { flex:1; font-size:13px; color:#1e293b; background:transparent; border:none; outline:none; font-family:'Plus Jakarta Sans',sans-serif; font-weight:500; }
        .pd-search-box input::placeholder { color:#c4cdd6; }
        .pd-add-fab { width:44px; height:44px; background:linear-gradient(135deg,#1a56db,#3b82f6); border:none; border-radius:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; box-shadow:0 3px 10px rgba(37,99,235,0.3); }
        .pd-add-full-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg,#1a56db,#3b82f6); border:none; border-radius:14px; padding:13px; color:#fff; font-size:13px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; box-shadow:0 3px 10px rgba(37,99,235,0.3); margin-bottom:14px; }

        .pd-item-card { background:#fff; border-radius:18px; border:1px solid #f1f5f9; box-shadow:0 1px 6px rgba(0,0,0,0.04); padding:13px 14px; cursor:pointer; margin-bottom:10px; transition:transform 0.2s ease, box-shadow 0.2s ease; animation:fadeUp 0.35s ease both; }
        .pd-item-card:hover { transform:translateY(-2px); box-shadow:0 5px 18px rgba(0,0,0,0.07); }
        .pd-item-top { display:flex; align-items:center; gap:12px; }
        .pd-item-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pd-item-icon.bahan { background:#f0f9ff; }
        .pd-item-icon.tenaga { background:#f5f3ff; }
        .pd-item-icon.lain { background:#fffbeb; }
        .pd-item-name { font-size:13px; font-weight:700; color:#1e293b; }
        .pd-item-sub { font-size:11px; color:#94a3b8; margin-top:2px; font-weight:500; }
        .pd-item-amount { font-size:14px; font-weight:800; color:#1e293b; }
        .pd-item-amount-sub { font-size:10px; color:#94a3b8; margin-top:2px; text-align:right; }
        .pd-item-divider { height:1px; background:#f8fafc; margin:10px 0; }
        .pd-qty-row { display:flex; align-items:center; justify-content:space-between; }
        .pd-qty-label { font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; }
        .pd-qty-controls { display:flex; align-items:center; gap:10px; }
        .pd-qty-btn { width:28px; height:28px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; font-weight:600; }
        .pd-qty-btn.minus { background:#f1f5f9; color:#475569; }
        .pd-qty-btn.plus { background:linear-gradient(135deg,#1a56db,#3b82f6); color:#fff; }
        .pd-qty-val { font-size:13px; font-weight:700; color:#1e293b; min-width:56px; text-align:center; }
        .pd-behavior-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; }
        .pd-behavior-badge.fixed { background:#f0fdf4; color:#16a34a; }
        .pd-behavior-badge.variable { background:#fffbeb; color:#d97706; }
        .pd-item-arrow { width:22px; height:22px; border-radius:50%; background:#f8fafc; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

        .pd-empty { background:#fff; border:2px dashed #e2e8f0; border-radius:20px; padding:44px 24px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; }
        .pd-empty:hover { border-color:#93c5fd; }
        .pd-empty-icon { width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg,#dbeafe,#eff6ff); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
        .pd-empty-title { font-size:14px; font-weight:700; color:#1e293b; }
        .pd-empty-desc { font-size:12px; color:#94a3b8; text-align:center; line-height:1.5; }
        .pd-empty-cta { margin-top:4px; font-size:12px; font-weight:700; color:#2563eb; background:#eff6ff; border:none; padding:8px 18px; border-radius:99px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }

        /* ── CVP CARD ── */
        .pd-cvp { background:#fff; border-radius:20px; border:1px solid #f1f5f9; box-shadow:0 2px 8px rgba(0,0,0,0.04); padding:16px; margin-bottom:14px; animation:fadeUp 0.4s ease both; }
        .pd-cvp-header { margin-bottom:14px; }
        .pd-cvp-title { font-size:13px; font-weight:800; color:#1e293b; }
        .pd-cvp-sub { font-size:11px; color:#94a3b8; margin-top:3px; line-height:1.5; }

        .pd-section-divider { display:flex; align-items:center; gap:8px; margin:14px 0 10px; }
        .pd-section-divider-line { flex:1; height:1px; background:#f1f5f9; }
        .pd-section-divider-label { font-size:9px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.12em; white-space:nowrap; }

        .pd-kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
        .pd-kpi { border-radius:14px; padding:11px 12px; }
        .pd-kpi-label { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:4px; }
        .pd-kpi-val { font-size:16px; font-weight:800; letter-spacing:-0.02em; }
        .pd-kpi-sub { font-size:9.5px; margin-top:2px; font-weight:500; opacity:0.75; }
        .pd-kpi.blue   { background:#eff6ff; } .pd-kpi.blue .pd-kpi-label { color:#3b82f6; } .pd-kpi.blue .pd-kpi-val { color:#1d4ed8; }
        .pd-kpi.green  { background:#f0fdf4; } .pd-kpi.green .pd-kpi-label { color:#16a34a; } .pd-kpi.green .pd-kpi-val { color:#15803d; }
        .pd-kpi.amber  { background:#fffbeb; } .pd-kpi.amber .pd-kpi-label { color:#d97706; } .pd-kpi.amber .pd-kpi-val { color:#b45309; }
        .pd-kpi.red    { background:#fef2f2; } .pd-kpi.red .pd-kpi-label { color:#ef4444; } .pd-kpi.red .pd-kpi-val { color:#dc2626; }
        .pd-kpi.purple { background:#f5f3ff; } .pd-kpi.purple .pd-kpi-label { color:#7c3aed; } .pd-kpi.purple .pd-kpi-val { color:#6d28d9; }
        .pd-kpi.slate  { background:#f8fafc; } .pd-kpi.slate .pd-kpi-label { color:#64748b; } .pd-kpi.slate .pd-kpi-val { color:#334155; }

        /* BEP dark card */
        .pd-bep-card { background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:18px; padding:14px; margin-bottom:10px; }
        .pd-bep-header { display:flex; align-items:center; gap:7px; margin-bottom:12px; }
        .pd-bep-header-icon { width:26px; height:26px; border-radius:8px; background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.3); display:flex; align-items:center; justify-content:center; }
        .pd-bep-title { font-size:12px; font-weight:800; color:#fff; }
        .pd-bep-subtitle { font-size:10px; color:#64748b; margin-top:1px; }
        .pd-bep-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .pd-bep-kpi { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px 11px; }
        .pd-bep-kpi-label { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:4px; }
        .pd-bep-kpi-val { font-size:15px; font-weight:800; color:#fff; }
        .pd-bep-kpi-sub { font-size:9px; color:#475569; margin-top:2px; font-weight:500; }
        /* Highlighted BEP items (min price & min units) */
        .pd-bep-kpi.highlight { background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); }
        .pd-bep-kpi.highlight .pd-bep-kpi-val { color:#93c5fd; }
        .pd-bep-kpi.highlight .pd-bep-kpi-label { color:#60a5fa; }

        /* Safety margin */
        .pd-safety-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:11px 12px; margin-top:10px; }
        .pd-safety-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .pd-safety-label { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:700; color:#94a3b8; }
        .pd-safety-pct { font-size:11px; font-weight:800; color:#22c55e; }
        .pd-safety-bar-track { height:7px; background:rgba(255,255,255,0.07); border-radius:99px; overflow:hidden; margin-bottom:7px; position:relative; }
        .pd-safety-bar-bep  { height:100%; border-radius:99px 0 0 99px; background:linear-gradient(90deg,#ef4444,#f97316); }
        .pd-safety-bar-safe { position:absolute; top:0; height:100%; border-radius:0 99px 99px 0; background:linear-gradient(90deg,#22c55e,#4ade80); }
        .pd-safety-legend { display:flex; align-items:center; gap:12px; }
        .pd-safety-legend-item { display:flex; align-items:center; gap:5px; font-size:9.5px; font-weight:600; color:#64748b; }
        .pd-safety-legend-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

        .pd-cost-info-row { background:#f8fafc; border-radius:12px; padding:10px 12px; margin-bottom:10px; font-size:10.5px; color:#64748b; line-height:1.7; font-weight:500; }
        .pd-cost-info-row strong { color:#334155; font-weight:700; }

        .pd-profit-banner { border-radius:16px; padding:13px 14px; display:flex; align-items:center; gap:12px; }
        .pd-profit-banner.profit { background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; }
        .pd-profit-banner.loss   { background:linear-gradient(135deg,#fef2f2,#fee2e2); border:1px solid #fecaca; }
        .pd-profit-banner-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:18px; }
        .pd-profit-banner.profit .pd-profit-banner-icon { background:#dcfce7; }
        .pd-profit-banner.loss   .pd-profit-banner-icon { background:#fee2e2; }
        .pd-profit-banner-title { font-size:13px; font-weight:800; }
        .pd-profit-banner.profit .pd-profit-banner-title { color:#15803d; }
        .pd-profit-banner.loss   .pd-profit-banner-title { color:#dc2626; }
        .pd-profit-banner-desc { font-size:10.5px; margin-top:2px; line-height:1.5; }
        .pd-profit-banner.profit .pd-profit-banner-desc { color:#16a34a; }
        .pd-profit-banner.loss   .pd-profit-banner-desc { color:#ef4444; }

        /* Ringkasan */
        .pd-ringkasan { background:#fff; border-radius:20px; border:1px solid #f1f5f9; padding:14px 16px; margin-bottom:14px; animation:fadeUp 0.45s ease both; }
        .pd-ringkasan-title { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; }
        .pd-cost-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .pd-cost-row-label { font-size:12px; color:#64748b; font-weight:500; }
        .pd-cost-row-val { font-size:12px; color:#334155; font-weight:700; }
        .pd-cost-divider { height:1px; background:#f1f5f9; margin:8px 0; }
        /* FIXED: bottom row now shows Harga Minimum Jual, NOT CM per Unit */
        .pd-cost-total-row { display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:14px; padding:11px 14px; margin-top:10px; }
        .pd-cost-total-label { font-size:13px; font-weight:700; color:rgba(255,255,255,0.75); }
        .pd-cost-total-val { font-size:16px; font-weight:800; color:#fff; }

        .pd-batch-badge { display:inline-flex; align-items:center; gap:6px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:99px; padding:4px 10px; font-size:11px; font-weight:600; color:#1d4ed8; margin-bottom:14px; }

        /* Modal */
        .pd-modal-backdrop { position:fixed; inset:0; z-index:60; background:rgba(15,23,42,0.45); display:flex; align-items:flex-end; backdrop-filter:blur(2px); animation:backdropIn 0.2s ease; }
        @keyframes backdropIn { from{opacity:0} to{opacity:1} }
        .pd-modal-sheet { width:100%; background:#fff; border-radius:28px 28px 0 0; max-height:88vh; overflow-y:auto; padding:6px 16px 32px; animation:sheetUp 0.3s cubic-bezier(0.32,0.72,0,1) both; }
        @keyframes sheetUp { from{transform:translateY(100%);opacity:0.6} to{transform:translateY(0);opacity:1} }
        .pd-modal-handle { width:36px; height:4px; background:#e2e8f0; border-radius:99px; margin:10px auto 18px; }
        .pd-modal-title-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .pd-modal-title { font-size:16px; font-weight:800; color:#1e293b; }
        .pd-modal-close { width:32px; height:32px; border-radius:50%; background:#f1f5f9; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
        .pd-field { background:#f8fafc; border:1.5px solid #f1f5f9; border-radius:14px; padding:12px 14px; margin-bottom:10px; transition:border-color 0.2s; }
        .pd-field:focus-within { border-color:#93c5fd; background:#fff; }
        .pd-field-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:5px; display:block; }
        .pd-field input { width:100%; font-size:14px; font-weight:600; color:#1e293b; background:transparent; border:none; outline:none; font-family:'Plus Jakarta Sans',sans-serif; }
        .pd-field input::placeholder { color:#c4cdd6; font-weight:400; }
        .pd-field-readonly { background:#f1f5f9 !important; }
        .pd-field-readonly input { color:#94a3b8 !important; cursor:not-allowed; }
        .pd-pill-group { display:flex; gap:6px; flex-wrap:wrap; }
        .pd-pill { padding:6px 12px; border-radius:99px; font-size:11px; font-weight:700; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; }
        .pd-pill.active { background:#1a56db; color:#fff; border-color:transparent; }
        .pd-modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .pd-qty-input-row { display:flex; align-items:center; gap:10px; }
        .pd-save-btn { width:100%; padding:14px; background:linear-gradient(135deg,#1a56db,#3b82f6); border:none; border-radius:14px; color:#fff; font-size:14px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; box-shadow:0 3px 10px rgba(37,99,235,0.3); margin-bottom:10px; transition:opacity 0.15s; }
        .pd-save-btn:disabled { opacity:0.55; pointer-events:none; }
        .pd-delete-danger-btn { width:100%; padding:14px; background:#fef2f2; border:1.5px solid #fecaca; border-radius:14px; color:#ef4444; font-size:14px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
        .pd-delete-danger-btn:disabled { opacity:0.55; pointer-events:none; }
        .pd-spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; animation:spin 0.65s linear infinite; display:inline-block; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>

      <div className="pd-root">
        {/* ── HEADER ── */}
        <div className="pd-header">
          <div className="pd-header-top">
            <button className="pd-back-btn" onClick={() => router.back()}><IconBack /> Kira Kos</button>
            <button className="pd-delete-btn" onClick={handleDelete} disabled={deleting}><IconTrash /></button>
          </div>
          <div className="pd-hero-info">
            <div className="pd-hero-img">
              <img src={product?.image_url || matchFoodImage(product?.name ?? "")} alt={product?.name} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pd-hero-name">{product?.name}</div>
              <div className="pd-hero-sub">Harga jual: RM {sellingPrice.toFixed(2)} / unit</div>
              <div className="pd-pills-row">
                {/* PRIMARY pill: Net Profit Margin (37%) — what owners understand */}
                <div className="pd-margin-pill">
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: marginMeta.dot }} />
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    Untung {cvp.netProfitMarginPct.toFixed(1)}% — {marginMeta.label}
                  </span>
                </div>
                {/* SECONDARY pill: CM Ratio (69%) — CVP term */}
                {cvp.totalBatchCost > 0 && (
                  <div className="pd-cm-pill">
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 600 }}>
                      CM {cvp.cmRatio.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pd-body">
          {/* TABS */}
          <div className="pd-card" style={{ padding: 6 }}>
            <div className="pd-tabs">
              {tabs.map(t => (
                <button key={t.key} className={`pd-tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* PROGRESS */}
          <div className="pd-card">
            <div className="pd-progress-header">
              <span className="pd-progress-label">Kelengkapan Kos</span>
              <span className="pd-progress-count">{completedSteps}/3 langkah</span>
            </div>
            <div className="pd-progress-track">
              <div className="pd-progress-fill" style={{ width: `${(completedSteps / 3) * 100}%` }} />
            </div>
            {[
              { label: "Bahan ditambah",         done: hasBahan  },
              { label: "Tenaga kerja diisi",      done: hasTenaga },
              { label: "Perbelanjaan lain diisi", done: hasLain   },
            ].map(item => (
              <div className="pd-step-row" key={item.label}>
                <div className={`pd-step-dot ${item.done ? "done" : "pending"}`}>
                  {item.done ? <IconCheck /> : <div className="pd-step-dot-inner" />}
                </div>
                <span className={`pd-step-label ${item.done ? "done" : "pending"}`}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* TOOLTIP */}
          <div className="pd-tooltip">
            <div className="pd-tooltip-icon"><IconInfo /></div>
            <p>{tabTooltips[tab]}</p>
          </div>

          {/* BATCH BADGE */}
          {latestBatch && (
            <div className="pd-batch-badge">
              📦 Batch semasa: <strong>{unitsProduced} unit dihasilkan</strong>
              &nbsp;·&nbsp;
              {latestBatch.batch_date
                ? new Date(latestBatch.batch_date).toLocaleDateString("ms-MY", { day:"numeric", month:"short", year:"numeric" })
                : "—"}
            </div>
          )}

          {/* TAB: BAHAN */}
          {tab === "bahan" && (
            <>
              <div className="pd-action-row">
                <div className="pd-search-box">
                  <IconSearch />
                  <input type="text" placeholder="Cari bahan..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="pd-add-fab" onClick={() => setShowAddProduction(true)}>
                  <IconPlus size={18} color="#fff" />
                </button>
              </div>
              {filteredProductions.length === 0 ? (
                <div className="pd-empty" onClick={() => setShowAddProduction(true)}>
                  <div className="pd-empty-icon"><IconBox /></div>
                  <div className="pd-empty-title">{search ? "Tiada hasil" : "Tiada bahan lagi"}</div>
                  <div className="pd-empty-desc">{search ? `Tiada bahan sepadan dengan "${search}"` : "Tambah bahan dan bilangan unit yang dihasilkan per batch."}</div>
                  {!search && <button className="pd-empty-cta" onClick={e => { e.stopPropagation(); setShowAddProduction(true); }}>+ Tambah Bahan</button>}
                </div>
              ) : (
                filteredProductions.map((p, idx) => (
                  <div key={p.production_id} className="pd-item-card" style={{ animationDelay: `${0.05 + idx * 0.04}s` }} onClick={() => openEditProduction(p)}>
                    <div className="pd-item-top">
                      <div className="pd-item-icon bahan"><IconBox /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pd-item-name">{p.name ?? "—"}</div>
                        <div className="pd-item-sub">RM {parseFloat(String(p.cost_per_unit)).toFixed(4)} / {p.unit ?? "unit"}{p.units_produced ? ` · ${p.units_produced} unit dihasilkan` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="pd-item-amount">RM {parseFloat(String(p.total_cost)).toFixed(2)}</div>
                        <div className="pd-item-amount-sub">{p.quantity} {p.unit}</div>
                      </div>
                      <div className="pd-item-arrow"><IconArrowRight /></div>
                    </div>
                    <div className="pd-item-divider" />
                    <div className="pd-qty-row" onClick={e => e.stopPropagation()}>
                      <span className="pd-qty-label">Kuantiti</span>
                      <div className="pd-qty-controls">
                        <button className="pd-qty-btn minus" onClick={() => handleUpdateQuantity(p.production_id, p.quantity - 1)}>−</button>
                        <span className="pd-qty-val">{p.quantity} {p.unit}</span>
                        <button className="pd-qty-btn plus" onClick={() => handleUpdateQuantity(p.production_id, p.quantity + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* TAB: TENAGA / LAIN */}
          {(tab === "tenaga" || tab === "lain") && (
            <>
              <button className="pd-add-full-btn" onClick={() => setShowAddCost(true)}>
                <IconPlus size={16} color="#fff" />
                {tab === "tenaga" ? "Tambah Tenaga Kerja" : "Tambah Utiliti / Lain-Lain"}
              </button>
              {costs.filter(c => c?.type === tabCostType[tab]).length === 0 ? (
                <div className="pd-empty">
                  <div className="pd-empty-icon">{tab === "tenaga" ? <IconUser /> : <IconZap />}</div>
                  <div className="pd-empty-title">{tab === "tenaga" ? "Tiada rekod tenaga kerja" : "Tiada rekod utiliti"}</div>
                  <div className="pd-empty-desc">{tab === "tenaga" ? "Tambah kos upah per batch." : "Tambah kos overhead per batch."}</div>
                </div>
              ) : (
                costs.filter(c => c?.type === tabCostType[tab]).map((c, idx) => (
                  <div key={c.costs_id} className="pd-item-card" style={{ animationDelay: `${0.05 + idx * 0.04}s` }} onClick={() => openEditCost(c)}>
                    <div className="pd-item-top">
                      <div className={`pd-item-icon ${tab}`}>{tab === "tenaga" ? <IconUser /> : <IconZap />}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pd-item-name">{c.name}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                          <span className={`pd-behavior-badge ${c.behavior}`}>{c.behavior === "fixed" ? "Tetap" : "Berubah"}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div className="pd-item-amount">RM {parseFloat(String(c.total_cost)).toFixed(2)}</div>
                        <div className="pd-item-amount-sub">RM {parseFloat(String(c.cost_per_unit)).toFixed(2)}/unit</div>
                      </div>
                      <div className="pd-item-arrow"><IconArrowRight /></div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* ── CVP ANALYSIS CARD ── */}
          <div className="pd-cvp">
            <div className="pd-cvp-header">
              <div className="pd-cvp-title">📊 Analisis CVP (Single Product)</div>
              <div className="pd-cvp-sub">
                Berdasarkan {unitsProduced} unit dihasilkan per batch · Harga jual RM {sellingPrice.toFixed(2)}/unit
              </div>
            </div>

            {cvp.totalBatchCost === 0 ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#94a3b8", fontSize:12 }}>
                Tambah bahan, tenaga kerja dan lain-lain dahulu untuk lihat pengiraan CVP.
              </div>
            ) : (
              <>
                {/* SECTION 1: Margin & Sumbangan */}
                <div className="pd-section-divider">
                  <div className="pd-section-divider-line" />
                  <div className="pd-section-divider-label">Margin &amp; Sumbangan</div>
                  <div className="pd-section-divider-line" />
                </div>
                <div className="pd-kpi-grid">
                  {/* Net Profit Margin — PRIMARY, SME friendly */}
                  <div className={`pd-kpi ${cvp.netProfitMarginPct >= 30 ? "green" : cvp.netProfitMarginPct >= 10 ? "amber" : "red"}`}>
                    <div className="pd-kpi-label">Margin Untung Bersih</div>
                    <div className="pd-kpi-val">{cvp.netProfitMarginPct.toFixed(1)}%</div>
                    <div className="pd-kpi-sub">(SP − kos/unit) ÷ SP</div>
                  </div>
                  {/* CM Ratio — CVP academic */}
                  <div className={`pd-kpi ${cvp.cmRatio >= 30 ? "green" : cvp.cmRatio >= 15 ? "amber" : "red"}`}>
                    <div className="pd-kpi-label">CM Ratio</div>
                    <div className="pd-kpi-val">{cvp.cmRatio.toFixed(1)}%</div>
                    <div className="pd-kpi-sub">CM/unit ÷ harga jual</div>
                  </div>
                  {/* Variable Cost per Unit */}
                  <div className="pd-kpi blue">
                    <div className="pd-kpi-label">Kos Berubah/Unit</div>
                    <div className="pd-kpi-val">RM {cvp.variableCostPerUnit.toFixed(2)}</div>
                    <div className="pd-kpi-sub">bahan + kos berubah</div>
                  </div>
                  {/* CM per Unit */}
                  <div className={`pd-kpi ${cvp.cmPerUnit >= 0 ? "green" : "red"}`}>
                    <div className="pd-kpi-label">CM / Unit</div>
                    <div className="pd-kpi-val">RM {cvp.cmPerUnit.toFixed(2)}</div>
                    <div className="pd-kpi-sub">SP − kos berubah/unit</div>
                  </div>
                </div>

                {/* SECTION 2: BEP */}
                <div className="pd-section-divider">
                  <div className="pd-section-divider-line" />
                  <div className="pd-section-divider-label">Titik Pulang Modal (BEP)</div>
                  <div className="pd-section-divider-line" />
                </div>
                <div className="pd-bep-card">
                  <div className="pd-bep-header">
                    <div className="pd-bep-header-icon"><IconTarget /></div>
                    <div>
                      <div className="pd-bep-title">Break-Even Point</div>
                      <div className="pd-bep-subtitle">Angka minimum untuk tidak rugi</div>
                    </div>
                  </div>
                  <div className="pd-bep-grid">
                    {/* Harga Minimum Jual — most important for owners */}
                    <div className="pd-bep-kpi highlight">
                      <div className="pd-bep-kpi-label">Harga Minimum Jual</div>
                      <div className="pd-bep-kpi-val">RM {cvp.minSellingPrice.toFixed(2)}</div>
                      <div className="pd-bep-kpi-sub">kos batch ÷ {unitsProduced} unit</div>
                    </div>
                    {/* Unit Minimum Jual */}
                    <div className="pd-bep-kpi highlight">
                      <div className="pd-bep-kpi-label">Unit Minimum Jual</div>
                      <div className="pd-bep-kpi-val">
                        {bepUnitsCeil === Infinity ? "N/A" : `${bepUnitsCeil} unit`}
                      </div>
                      <div className="pd-bep-kpi-sub">dari {unitsProduced} unit batch</div>
                    </div>
                    {/* BEP Revenue — FIXED: uses Math.ceil(bepUnits) */}
                    <div className="pd-bep-kpi">
                      <div className="pd-bep-kpi-label">Hasil Jualan BEP</div>
                      <div className="pd-bep-kpi-val" style={{ fontSize:13 }}>{bepRevDisplay}</div>
                      <div className="pd-bep-kpi-sub">
                        {bepUnitsCeil !== Infinity ? `${bepUnitsCeil} unit × RM ${sellingPrice.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    {/* Kos Seunit Total */}
                    <div className="pd-bep-kpi">
                      <div className="pd-bep-kpi-label">Kos Seunit (Total)</div>
                      <div className="pd-bep-kpi-val" style={{ fontSize:13 }}>RM {cvp.costPerUnitTotal.toFixed(2)}</div>
                      <div className="pd-bep-kpi-sub">kos batch ÷ {unitsProduced} unit</div>
                    </div>
                  </div>

                  {/* Safety Margin bar */}
                  {bepUnitsCeil !== Infinity && (
                    <div className="pd-safety-card">
                      <div className="pd-safety-header">
                        <div className="pd-safety-label">
                          <IconShield />
                          <span>Margin Keselamatan</span>
                        </div>
                        <div className="pd-safety-pct">
                          {cvp.safetyMarginPct.toFixed(1)}% ({cvp.safetyMarginUnits} unit buffer)
                        </div>
                      </div>
                      <div className="pd-safety-bar-track">
                        <div className="pd-safety-bar-bep" style={{ width: `${bepBarFill}%` }} />
                        <div className="pd-safety-bar-safe" style={{ left: `${bepBarFill}%`, width: `${Math.max(0, 100 - bepBarFill)}%` }} />
                      </div>
                      <div className="pd-safety-legend">
                        <div className="pd-safety-legend-item">
                          <div className="pd-safety-legend-dot" style={{ background:"#ef4444" }} />
                          BEP: {bepUnitsCeil} unit
                        </div>
                        <div className="pd-safety-legend-item">
                          <div className="pd-safety-legend-dot" style={{ background:"#22c55e" }} />
                          Selamat: {cvp.safetyMarginUnits} unit
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost info strip */}
                <div className="pd-cost-info-row">
                  <strong>Kos Tetap/Batch:</strong> RM {cvp.totalFixedCost.toFixed(2)}
                  &nbsp;&nbsp;·&nbsp;&nbsp;
                  <strong>Kos Berubah Total:</strong> RM {cvp.totalVariableCost.toFixed(2)}
                  &nbsp;&nbsp;·&nbsp;&nbsp;
                  <strong>Jumlah Kos Batch:</strong> RM {cvp.totalBatchCost.toFixed(2)}
                </div>

                {/* Profit / Loss banner */}
                {sellingPrice > 0 && (
                  <div className={`pd-profit-banner ${cvp.netProfitBatch >= 0 ? "profit" : "loss"}`}>
                    <div className="pd-profit-banner-icon">
                      {cvp.netProfitBatch >= 0 ? "✅" : "⚠️"}
                    </div>
                    <div>
                      <div className="pd-profit-banner-title">
                        {cvp.netProfitBatch >= 0
                          ? `Untung batch: RM ${cvp.netProfitBatch.toFixed(2)}`
                          : `Rugi batch: RM ${Math.abs(cvp.netProfitBatch).toFixed(2)}`}
                      </div>
                      <div className="pd-profit-banner-desc">
                        {cvp.netProfitBatch >= 0
                          ? `RM ${cvp.cmPerUnit.toFixed(2)} CM/unit × ${unitsProduced} unit − RM ${cvp.totalFixedCost.toFixed(2)} kos tetap`
                          : `Naikkan harga melebihi RM ${cvp.minSellingPrice.toFixed(2)}/unit atau jual lebih dari ${bepUnitsCeil === Infinity ? "N/A" : bepUnitsCeil} unit.`}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RINGKASAN KOS ── */}
          <div className="pd-ringkasan">
            <div className="pd-ringkasan-title">Ringkasan Kos Batch</div>
            <div className="pd-cost-row">
              <span className="pd-cost-row-label">🥄 Bahan Mentah (Berubah)</span>
              <span className="pd-cost-row-val">RM {bahanTotal.toFixed(2)}</span>
            </div>
            <div className="pd-cost-row">
              <span className="pd-cost-row-label">👷 Tenaga Kerja</span>
              <span className="pd-cost-row-val">RM {tenagaTotal.toFixed(2)}</span>
            </div>
            <div className="pd-cost-row">
              <span className="pd-cost-row-label">⚡ Overhead / Lain-Lain</span>
              <span className="pd-cost-row-val">RM {lainTotal.toFixed(2)}</span>
            </div>
            <div className="pd-cost-divider" />
            <div className="pd-cost-row">
              <span className="pd-cost-row-label" style={{ fontWeight:700, color:"#1e293b" }}>Total Kos Batch</span>
              <span className="pd-cost-row-val" style={{ fontSize:14, color:"#1e293b" }}>RM {cvp.totalBatchCost.toFixed(2)}</span>
            </div>
            <div className="pd-cost-row">
              <span className="pd-cost-row-label">Kos Berubah / Unit ({unitsProduced} unit)</span>
              <span className="pd-cost-row-val">RM {cvp.variableCostPerUnit.toFixed(2)}</span>
            </div>
            <div className="pd-cost-row">
              <span className="pd-cost-row-label">Kos Tetap / Batch</span>
              <span className="pd-cost-row-val">RM {cvp.totalFixedCost.toFixed(2)}</span>
            </div>
            <div className="pd-cost-row">
              <span className="pd-cost-row-label" style={{ fontWeight:600, color:"#334155" }}>Kos Seunit (Total)</span>
              <span className="pd-cost-row-val" style={{ color:"#334155" }}>RM {cvp.costPerUnitTotal.toFixed(2)}</span>
            </div>
            <div className="pd-cost-divider" />
            {/* FIXED: bottom gradient row = Harga Minimum Jual, NOT CM per Unit */}
            <div className="pd-cost-total-row">
              <span className="pd-cost-total-label">💰 Harga Minimum Jual</span>
              <span className="pd-cost-total-val">RM {cvp.minSellingPrice.toFixed(2)} / unit</span>
            </div>
          </div>
        </div>

        {/* ADD PRODUCTION MODAL */}
        {showAddProduction && (
          <div className="pd-modal-backdrop" onClick={() => setShowAddProduction(false)}>
            <div className="pd-modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="pd-modal-handle" />
              <div className="pd-modal-title-row">
                <span className="pd-modal-title">Tambah Bahan</span>
                <button className="pd-modal-close" onClick={() => setShowAddProduction(false)}><IconClose /></button>
              </div>
              <div className="pd-field" style={{ border:"1.5px solid #bfdbfe", background:"#eff6ff" }}>
                <label className="pd-field-label" style={{ color:"#3b82f6" }}>⭐ Bilangan Unit Dihasilkan (per batch)</label>
                <input type="number" placeholder="cth: 50 (ayam gunting per batch)" value={prodForm.units_produced} onChange={e => setProdForm({ ...prodForm, units_produced: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Nama Bahan</label>
                <input type="text" placeholder="cth: Tepung Gandum" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Tarikh Batch</label>
                <input type="date" value={prodForm.batch_date} onChange={e => setProdForm({ ...prodForm, batch_date: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Kuantiti &amp; Unit Bahan</label>
                <div className="pd-qty-input-row">
                  <input type="number" placeholder="cth: 4" value={prodForm.quantity}
                    style={{ width:80, background:"transparent", border:"none", outline:"none", fontSize:14, fontWeight:600, color:"#1e293b", fontFamily:"inherit" }}
                    onChange={e => {
                      const qty = e.target.value;
                      const cpu = (parseFloat(prodForm.total_cost || "0") / parseFloat(qty)).toFixed(4);
                      setProdForm({ ...prodForm, quantity: qty, cost_per_unit: isNaN(parseFloat(cpu)) || !isFinite(parseFloat(cpu)) ? "" : cpu });
                    }} />
                  <div className="pd-pill-group">
                    {["unit","kg","g","ml","l"].map(u => (
                      <button key={u} className={`pd-pill ${prodForm.unit === u ? "active" : ""}`} onClick={() => setProdForm({ ...prodForm, unit: u })}>{u}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pd-modal-grid">
                <div className="pd-field">
                  <label className="pd-field-label">Jumlah Kos Bahan (RM)</label>
                  <input type="number" placeholder="0.00" value={prodForm.total_cost}
                    onChange={e => {
                      const total = e.target.value;
                      const cpu = (parseFloat(total) / parseFloat(prodForm.quantity || "1")).toFixed(4);
                      setProdForm({ ...prodForm, total_cost: total, cost_per_unit: isNaN(parseFloat(cpu)) || !isFinite(parseFloat(cpu)) ? "" : cpu });
                    }} />
                </div>
                <div className="pd-field pd-field-readonly">
                  <label className="pd-field-label">Kos/Unit Bahan (Auto)</label>
                  <input type="text" placeholder="0.00" value={prodForm.cost_per_unit ? parseFloat(prodForm.cost_per_unit).toFixed(4) : ""} readOnly />
                </div>
              </div>
              <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"10px 12px", marginBottom:12, fontSize:11, color:"#92400e", lineHeight:1.6 }}>
                💡 <strong>Contoh:</strong> Beli 4 telur (RM2.40) untuk hasilkan 50 ayam gunting. Bilangan unit = 50, kuantiti = 4, jumlah kos = RM2.40.
              </div>
              <button className="pd-save-btn" onClick={handleAddProduction} disabled={addingProd || !prodForm.name || !prodForm.quantity || !prodForm.total_cost || !prodForm.units_produced}>
                {addingProd ? <span className="pd-spinner" /> : "Simpan Bahan"}
              </button>
            </div>
          </div>
        )}

        {/* ADD COST MODAL */}
        {showAddCost && (
          <div className="pd-modal-backdrop" onClick={() => setShowAddCost(false)}>
            <div className="pd-modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="pd-modal-handle" />
              <div className="pd-modal-title-row">
                <span className="pd-modal-title">{tab === "tenaga" ? "Tambah Tenaga Kerja" : "Tambah Utiliti"}</span>
                <button className="pd-modal-close" onClick={() => setShowAddCost(false)}><IconClose /></button>
              </div>
              <div className="pd-field">
                <label className="pd-field-label">{tab === "tenaga" ? "Nama Pekerja / Peranan" : "Nama Utiliti"}</label>
                <input type="text" placeholder={tab === "tenaga" ? "cth: Upah Baker" : "cth: Elektrik, Gas"} value={costForm.name} onChange={e => setCostForm({ ...costForm, name: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Jenis Kos</label>
                <div className="pd-pill-group">
                  {["fixed","variable"].map(b => (
                    <button key={b} className={`pd-pill ${costForm.behavior === b ? "active" : ""}`} onClick={() => setCostForm({ ...costForm, behavior: b })}>
                      {b === "fixed" ? "Tetap (Fixed)" : "Berubah (Variable)"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"10px 12px", marginBottom:10, fontSize:11, color:"#1d4ed8", lineHeight:1.6 }}>
                {tab === "tenaga"
                  ? <><strong>Tetap</strong>: RM50 upah baker untuk 1 batch. <strong>Berubah</strong>: RM8/jam × bilangan jam.</>
                  : <><strong>Tetap</strong>: Sewa RM5/batch. <strong>Berubah</strong>: Gas RM2 setiap kali masak.</>}
              </div>
              <div className="pd-modal-grid">
                <div className="pd-field">
                  <label className="pd-field-label">Kos/Unit (RM)</label>
                  <input type="number" placeholder="0.00" value={costForm.cost_per_unit} onChange={e => { const cpu = e.target.value; setCostForm({ ...costForm, cost_per_unit: cpu, total_cost: cpu }); }} />
                </div>
                <div className="pd-field">
                  <label className="pd-field-label">Jumlah Kos (RM)</label>
                  <input type="number" placeholder="0.00" value={costForm.total_cost} onChange={e => setCostForm({ ...costForm, total_cost: e.target.value })} />
                </div>
              </div>
              <button className="pd-save-btn" onClick={() => handleAddCost(tab === "tenaga" ? "tenaga" : "indirect")} disabled={addingCost}>
                {addingCost ? <span className="pd-spinner" /> : "Simpan"}
              </button>
            </div>
          </div>
        )}

        {/* EDIT PRODUCTION MODAL */}
        {selectedProduction && (
          <div className="pd-modal-backdrop" onClick={() => setSelectedProduction(null)}>
            <div className="pd-modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="pd-modal-handle" />
              <div className="pd-modal-title-row">
                <span className="pd-modal-title">Edit Bahan</span>
                <button className="pd-modal-close" onClick={() => setSelectedProduction(null)}><IconClose /></button>
              </div>
              <div className="pd-field" style={{ border:"1.5px solid #bfdbfe", background:"#eff6ff" }}>
                <label className="pd-field-label" style={{ color:"#3b82f6" }}>⭐ Bilangan Unit Dihasilkan (per batch)</label>
                <input type="number" placeholder="cth: 50" value={editProdForm.units_produced} onChange={e => setEditProdForm({ ...editProdForm, units_produced: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Nama Bahan</label>
                <input type="text" value={editProdForm.name} onChange={e => setEditProdForm({ ...editProdForm, name: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Tarikh Batch</label>
                <input type="date" value={editProdForm.batch_date} onChange={e => setEditProdForm({ ...editProdForm, batch_date: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Kuantiti &amp; Unit Bahan</label>
                <div className="pd-qty-input-row">
                  <input type="number" value={editProdForm.quantity}
                    style={{ width:80, background:"transparent", border:"none", outline:"none", fontSize:14, fontWeight:600, color:"#1e293b", fontFamily:"inherit" }}
                    onChange={e => {
                      const qty = e.target.value;
                      const cpu = (parseFloat(editProdForm.total_cost || "0") / parseFloat(qty)).toFixed(4);
                      setEditProdForm({ ...editProdForm, quantity: qty, cost_per_unit: isNaN(parseFloat(cpu)) || !isFinite(parseFloat(cpu)) ? "" : cpu });
                    }} />
                  <div className="pd-pill-group">
                    {["unit","kg","g","ml","l"].map(u => (
                      <button key={u} className={`pd-pill ${editProdForm.unit === u ? "active" : ""}`} onClick={() => setEditProdForm({ ...editProdForm, unit: u })}>{u}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pd-modal-grid">
                <div className="pd-field">
                  <label className="pd-field-label">Jumlah Kos (RM)</label>
                  <input type="number" value={editProdForm.total_cost}
                    onChange={e => {
                      const total = e.target.value;
                      const cpu = (parseFloat(total) / parseFloat(editProdForm.quantity || "1")).toFixed(4);
                      setEditProdForm({ ...editProdForm, total_cost: total, cost_per_unit: isNaN(parseFloat(cpu)) || !isFinite(parseFloat(cpu)) ? "" : cpu });
                    }} />
                </div>
                <div className="pd-field pd-field-readonly">
                  <label className="pd-field-label">Kos/Unit (Auto)</label>
                  <input type="text" value={editProdForm.cost_per_unit ? parseFloat(editProdForm.cost_per_unit).toFixed(4) : ""} readOnly />
                </div>
              </div>
              <button className="pd-save-btn" onClick={handleEditProduction} disabled={savingEdit}>
                {savingEdit ? <span className="pd-spinner" /> : "Simpan Perubahan"}
              </button>
              <button className="pd-delete-danger-btn" onClick={handleDeleteProduction} disabled={deletingItem}>
                {deletingItem ? "Memadamkan..." : "Padam Bahan Ini"}
              </button>
            </div>
          </div>
        )}

        {/* EDIT COST MODAL */}
        {selectedCost && (
          <div className="pd-modal-backdrop" onClick={() => setSelectedCost(null)}>
            <div className="pd-modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="pd-modal-handle" />
              <div className="pd-modal-title-row">
                <span className="pd-modal-title">{selectedCost.type === "tenaga" ? "Edit Tenaga Kerja" : "Edit Utiliti"}</span>
                <button className="pd-modal-close" onClick={() => setSelectedCost(null)}><IconClose /></button>
              </div>
              <div className="pd-field">
                <label className="pd-field-label">{selectedCost.type === "tenaga" ? "Nama Pekerja / Peranan" : "Nama Utiliti"}</label>
                <input type="text" value={editCostForm.name} onChange={e => setEditCostForm({ ...editCostForm, name: e.target.value })} />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Jenis Kos</label>
                <div className="pd-pill-group">
                  {["fixed","variable"].map(b => (
                    <button key={b} className={`pd-pill ${editCostForm.behavior === b ? "active" : ""}`} onClick={() => setEditCostForm({ ...editCostForm, behavior: b })}>
                      {b === "fixed" ? "Tetap (Fixed)" : "Berubah (Variable)"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pd-modal-grid">
                <div className="pd-field">
                  <label className="pd-field-label">Kos/Unit (RM)</label>
                  <input type="number" value={editCostForm.cost_per_unit} onChange={e => { const cpu = e.target.value; setEditCostForm({ ...editCostForm, cost_per_unit: cpu, total_cost: cpu }); }} />
                </div>
                <div className="pd-field">
                  <label className="pd-field-label">Jumlah Kos (RM)</label>
                  <input type="number" value={editCostForm.total_cost} onChange={e => setEditCostForm({ ...editCostForm, total_cost: e.target.value })} />
                </div>
              </div>
              <button className="pd-save-btn" onClick={handleEditCost} disabled={savingEdit}>
                {savingEdit ? <span className="pd-spinner" /> : "Simpan Perubahan"}
              </button>
              <button className="pd-delete-danger-btn" onClick={handleDeleteCost} disabled={deletingItem}>
                {deletingItem ? "Memadamkan..." : "Padam"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
