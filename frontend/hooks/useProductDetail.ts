// hooks/useProductDetail.ts
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { matchFoodImage } from "@/lib/foodImages";
import { API_URL } from "@/lib/api";

// ─── TYPES ───────────────────────────────────────────────────────────────
export interface Product {
  product_id: string;
  name: string;
  description: string;
  selling_price: number;
  image_url: string | null;
  mode?: "regular" | "dropship";
  batch_size?: number;
  sale_unit?: string;
}

export interface Cost {
  costs_id: string;
  name: string;
  type: string;
  behavior: string;
  cost_per_unit: number;
  total_cost: number;
  cost_category?: string;
}

export interface Production {
  production_id: string;
  name: string;
  quantity: number;
  unit: string;
  total_cost: number;
  cost_per_unit: number;
  units_produced: number;
  batch_date: string;
  created_at: string;
  purchase_price?: number;
  purchase_qty?: number;
  purchase_unit?: string;
}

export type Tab = "bahan" | "tenaga" | "lain" | "supplier";

export interface ProdForm {
  name: string;
  quantity: string;
  unit: string;
  cost_per_unit: string;
  total_cost: string;
  units_produced: string;
  batch_date: string;
  purchase_price: string;
  purchase_qty: string;
  purchase_unit: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────
export const normalizeUnit = (unit: string): string => {
  if (unit === "l") return "L";
  return unit;
};

export const convertToBaseUnit = (qty: number, unit: string): number => {
  const u = normalizeUnit(unit);
  if (u === "kg") return qty * 1000;
  if (u === "L") return qty * 1000;
  return qty;
};

export const getBaseUnitDisplay = (unit: string): string => {
  const u = normalizeUnit(unit);
  if (u === "kg" || u === "g") return "g";
  if (u === "L" || u === "ml") return "ml";
  return "unit";
};

export const getMinQuantity = (unit: string): number => {
  const u = normalizeUnit(unit);
  if (u === "g" || u === "ml") return 2;
  if (u === "kg" || u === "L") return 0.002;
  return 1;
};

export const getStep = (unit: string) => {
  const u = normalizeUnit(unit);
  if (u === "kg" || u === "L") return 0.001;
  return 1;
};

export const formatQuantityDisplay = (qty: number | string, unit: string) => {
  const num = typeof qty === "string" ? parseFloat(qty) : qty;
  if (isNaN(num)) return "0";
  const u = normalizeUnit(unit);
  if (u === "kg" || u === "L") return num.toFixed(3);
  return num.toFixed(0);
};

export const recalcCosts = (
  harga: number,
  beliQty: number,
  beliUnit: string,
  gunaQty: number,
  gunaUnit: string,
) => {
  const beliBase = convertToBaseUnit(beliQty, beliUnit);
  const gunaBase = convertToBaseUnit(gunaQty, gunaUnit);
  const costPerBaseUnit = beliBase > 0 ? harga / beliBase : 0;
  const totalCost = costPerBaseUnit * gunaBase;
  return {
    cost_per_unit: costPerBaseUnit > 0 ? costPerBaseUnit.toFixed(6) : "",
    total_cost: totalCost > 0 ? totalCost.toFixed(2) : "",
  };
};

export const formatPrice = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return "";
  return Number(value).toFixed(2);
};

export const formatQty = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return "";
  const num = Number(value);
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, "");
};

export const defaultProdForm = (): ProdForm => ({
  name: "",
  quantity: "",
  unit: "g",
  cost_per_unit: "",
  total_cost: "",
  units_produced: "",
  batch_date: new Date().toISOString().split("T")[0],
  purchase_price: "",
  purchase_qty: "",
  purchase_unit: "kg",
});

// ─── CVP CALCULATOR ──────────────────────────────────────────────────────
export const calcCVP = (
  productions: Production[],
  costs: Cost[],
  sellingPrice: number,
  unitsProduced: number,
  sharedFixedCost: number = 0,
  salesMixPct: number = 100,
  isDropship: boolean = false,
) => {
  const variableCosts = costs.filter(c => c.behavior === "variable");
  const fixedCosts = costs.filter(c => c.behavior === "fixed");

  const ownFixedCost = fixedCosts.reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
  const allocatedFixedCost = sharedFixedCost * (salesMixPct / 100);
  const totalFixedCost = ownFixedCost + allocatedFixedCost;

  let bahanTotal = 0;
  if (isDropship) {
    const supplierCosts = costs.filter(c => c.cost_category === "supplier" && c.behavior === "variable");
    bahanTotal = supplierCosts.reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
  } else {
    bahanTotal = productions.reduce((s, p) => s + parseFloat(String(p.total_cost ?? 0)), 0);
  }

  const totalVariableCostOther = variableCosts
    .filter(c => c.cost_category !== "supplier")
    .reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
  const totalVariableCost = bahanTotal + totalVariableCostOther;
  const variableCostPerUnit = unitsProduced > 0 ? totalVariableCost / unitsProduced : 0;

  const totalBatchCost = totalVariableCost + totalFixedCost;
  const costPerUnitTotal = unitsProduced > 0 ? totalBatchCost / unitsProduced : 0;
  const minSellingPrice = costPerUnitTotal;

  const cmPerUnit = sellingPrice - variableCostPerUnit;
  const cmRatio = sellingPrice > 0 ? (cmPerUnit / sellingPrice) * 100 : 0;
  const netProfitMarginPct = sellingPrice > 0 ? ((sellingPrice - costPerUnitTotal) / sellingPrice) * 100 : 0;

  const bepUnitsRaw = cmPerUnit > 0 ? totalFixedCost / cmPerUnit : Infinity;
  const bepRevenue = bepUnitsRaw === Infinity ? Infinity : Math.ceil(bepUnitsRaw) * sellingPrice;

  const safetyMarginUnits = bepUnitsRaw === Infinity ? 0 : Math.max(0, unitsProduced - Math.ceil(bepUnitsRaw));
  const safetyMarginPct = unitsProduced > 0 ? (safetyMarginUnits / unitsProduced) * 100 : 0;
  const netProfitBatch = (cmPerUnit * unitsProduced) - totalFixedCost;

  return {
    variableCostPerUnit,
    totalFixedCost,
    totalVariableCost,
    totalBatchCost,
    cmPerUnit,
    cmRatio,
    netProfitMarginPct,
    bepUnits: bepUnitsRaw,
    bepRevenue,
    costPerUnitTotal,
    minSellingPrice,
    safetyMarginUnits,
    safetyMarginPct,
    netProfitBatch,
    bahanTotal,
  };
};

export const getMarginMeta = (margin: number) => {
  if (margin >= 30) return { label: "Sihat", dot: "#4ade80", color: "#15803d" };
  if (margin >= 15) return { label: "Sederhana", dot: "#fbbf24", color: "#b45309" };
  return { label: "Rendah", dot: "#fca5a5", color: "#dc2626" };
};

// ─── MAIN HOOK ──────────────────────────────────────────────────────────
export function useProductDetail() {
  const router = useRouter();
  const { product_id } = useParams();

  // States
  const [product, setProduct] = useState<Product | null>(null);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [tab, setTab] = useState<Tab>("bahan");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddProduction, setShowAddProduction] = useState(false);
  const [addingCost, setAddingCost] = useState(false);
  const [addingProd, setAddingProd] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [selectedCost, setSelectedCost] = useState<Cost | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [sharedFixedCost, setSharedFixedCost] = useState(0);
  const [allProductsData, setAllProductsData] = useState<{ product_id: string; units: number }[]>([]);
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);
  const [tempPrice, setTempPrice] = useState(0);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "info" | "success"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false,
  });

  // ─── BATCH SIZE STATE ──────────────────────────────────────────────
  const [batchSize, setBatchSizeState] = useState(1);

  // ─── DERIVED: isDropship from product ──────────────────────────────
  const isDropship = useMemo(() => product?.mode === "dropship", [product]);

  // ─── SET INITIAL TAB ONCE ───────────────────────────────────────────
  const initialTabSet = useRef(false);
  useEffect(() => {
    if (product && !initialTabSet.current) {
      const mode = product.mode || "regular";
      setTab(mode === "dropship" ? "supplier" : "bahan");
      initialTabSet.current = true;
    }
  }, [product]);

  // ─── UPDATE BATCH SIZE FROM PRODUCT WHEN IT LOADS ──────────────────
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current && product?.batch_size !== undefined) {
      setBatchSizeState(product.batch_size);
      initialLoadRef.current = false;
    }
  }, [product]);

  // ─── Supplier Cost Form ──────────────────────────────────────────────
  const [supplierCostForm, setSupplierCostForm] = useState({
    name: "Kos Supplier",
    behavior: "variable",
    cost_per_unit: "",
    total_cost: "",
    units_produced: "",
  });
  const [costForm, setCostForm] = useState({ name: "", behavior: "fixed", cost_per_unit: "", total_cost: "" });
  const [prodForm, setProdForm] = useState<ProdForm>(defaultProdForm());
  const [editProdForm, setEditProdForm] = useState({
    name: "",
    quantity: "",
    unit: "g",
    cost_per_unit: "",
    total_cost: "",
    units_produced: "",
    batch_date: "",
    purchase_price: "",
    purchase_qty: "",
    purchase_unit: "kg",
  });
  const [editCostForm, setEditCostForm] = useState({ name: "", behavior: "fixed", cost_per_unit: "", total_cost: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── Toast helper ────────────────────────────────────────────────────
  const showToast = (message: string, type: "error" | "info" | "success" = "error") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  // ─── Fetch product data ─────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const allProdRes = await fetch(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } });
        const allProdData = await allProdRes.json();
        const allProducts: Product[] = allProdData.products || [];

        let totalFixedCost = 0;
        const productsWithUnits: { product_id: string; units: number }[] = [];

        for (const p of allProducts) {
          const [costsRes, prodsRes] = await Promise.all([
            fetch(`${API_URL}/products/${p.product_id}/costs`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/products/${p.product_id}/productions`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          const costsData: { costs: Cost[] } = await costsRes.json();
          const prodsData: { productions: Production[] } = await prodsRes.json();
          const c = costsData.costs || [];
          const pr = prodsData.productions || [];
          const units = pr.length > 0
            ? Math.max(...pr.map(x => Number(x.units_produced) || 0).filter(n => n > 0), 0) || 1
            : 1;
          productsWithUnits.push({ product_id: p.product_id, units });
          totalFixedCost += c.filter(x => x.behavior === "fixed").reduce((s, x) => s + parseFloat(String(x.total_cost ?? 0)), 0);
        }

        setSharedFixedCost(totalFixedCost);
        setAllProductsData(productsWithUnits);

        const [prodRes, costsRes, prodsRes] = await Promise.all([
          fetch(`${API_URL}/products/${product_id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/products/${product_id}/costs`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/products/${product_id}/productions`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [pd, cd, prd] = await Promise.all([prodRes.json(), costsRes.json(), prodsRes.json()]);
        setProduct(pd.product);
        setCosts(cd.costs || []);
        setProductions(prd.productions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [product_id]);

  // ─── AUTO‑SAVE BATCH SIZE ──────────────────────────────────────────
  const handleSetBatchSize = async (newSize: number) => {
    if (newSize < 1) return;
    setBatchSizeState(newSize);

    if (!product || !isDropship) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/${product_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: product.name,
          description: product.description || "",
          selling_price: product.selling_price,
          image_url: product.image_url,
          sale_unit: product.sale_unit || "unit",
          batch_size: newSize,
        }),
      });
      if (res.ok) {
        setProduct(prev => prev ? { ...prev, batch_size: newSize } : prev);
        showToast("Saiz batch dikemaskini!", "success");
      } else {
        setBatchSizeState(product.batch_size || 1);
        showToast("Gagal menyimpan saiz batch.", "error");
      }
    } catch (err) {
      console.error("Failed to save batch size:", err);
      setBatchSizeState(product.batch_size || 1);
      showToast("Ralat rangkaian.", "error");
    }
  };

  // ─── Derived values ──────────────────────────────────────────────────
  const latestBatch = productions.length > 0 ? productions[0] : null;

  const unitsProduced = isDropship
    ? batchSize
    : (latestBatch
        ? Math.max(...productions.map(p => Number(p.units_produced) || 0).filter(n => n > 0), 0) || 1
        : 1);

  const sellingPrice = parseFloat(String(product?.selling_price ?? 0));
  const totalUnits = allProductsData.reduce((s, p) => s + p.units, 0);
  const salesMixPct = totalUnits > 0 ? (unitsProduced / totalUnits) * 100 : 100;
  const cvp = calcCVP(productions, costs, sellingPrice, unitsProduced, sharedFixedCost, salesMixPct, isDropship);

  // ─── DEBUG LOGS ──────────────────────────────────────────────────────
  console.log("=== CVP DEBUG ===");
  console.log("isDropship:", isDropship);
  console.log("unitsProduced:", unitsProduced);
  console.log("costs:", costs);
  console.log("supplierCosts:", costs.filter(c => c.cost_category === "supplier" && c.behavior === "variable"));
  console.log("other variable costs:", costs.filter(c => c.behavior === "variable" && c.cost_category !== "supplier"));
  console.log("bahanTotal:", cvp.bahanTotal);
  console.log("totalVariableCost:", cvp.totalVariableCost);
  console.log("totalFixedCost:", cvp.totalFixedCost);
  console.log("totalBatchCost:", cvp.totalBatchCost);
  console.log("costPerUnitTotal:", cvp.costPerUnitTotal);
  console.log("netProfitMarginPct:", cvp.netProfitMarginPct);

  const bahanTotal = cvp.bahanTotal || 0;
  const tenagaTotal = costs.filter(c => c?.type === "tenaga").reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);
  const lainTotal = costs.filter(c => c?.type === "indirect" && c.cost_category !== "supplier").reduce((s, c) => s + parseFloat(String(c.total_cost ?? 0)), 0);

  const hasSupplierCost = costs.some(c => c.cost_category === "supplier");
  const hasBahan = productions.length > 0 || (isDropship && hasSupplierCost);
  const hasTenaga = costs.filter(c => c?.type === "tenaga").length > 0;
  const hasLain = costs.filter(c => c?.type === "indirect" && c.cost_category !== "supplier").length > 0;
  const completedSteps = [hasBahan, hasTenaga, hasLain].filter(Boolean).length;
  const marginMeta = getMarginMeta(cvp.netProfitMarginPct);
  const bepUnitsCeil = cvp.bepUnits === Infinity ? Infinity : Math.ceil(cvp.bepUnits);
  const bepBarFill = unitsProduced > 0 && bepUnitsCeil !== Infinity
    ? Math.min(100, (bepUnitsCeil / unitsProduced) * 100)
    : 100;

  // ─── Handlers ─────────────────────────────────────────────────────────

  const openEditPriceModal = () => { setTempPrice(sellingPrice); setShowEditPriceModal(true); };

  const handleUpdatePrice = async () => {
    if (!product || tempPrice <= 0) { showToast("Harga jual mesti lebih daripada 0.", "error"); return; }
    setUpdatingPrice(true);
    try {
      const res = await fetch(`${API_URL}/products/${product_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          selling_price: tempPrice,
          image_url: product.image_url,
          sale_unit: product.sale_unit || "unit",
          batch_size: product.batch_size || 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProduct(data.product);
        setShowEditPriceModal(false);
        showToast("Harga jual berjaya dikemaskini.", "success");
      } else {
        showToast(data.message || "Gagal mengemaskini harga.", "error");
      }
    } catch {
      showToast("Ralat rangkaian.", "error");
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Padam produk ini?")) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/products/${product_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      router.push("/produk");
    } catch {
      console.error("Delete error");
    } finally {
      setDeleting(false);
    }
  };

  const openAddProduction = () => { setProdForm(defaultProdForm()); setShowAddProduction(true); };

  const handleAddProduction = async () => {
    if (!prodForm.name || !prodForm.quantity || !prodForm.total_cost) return;
    const finalUnits = prodForm.units_produced ? parseInt(prodForm.units_produced) : unitsProduced;
    if (!finalUnits || finalUnits <= 0) {
      showToast("Sila masukkan bilangan unit dihasilkan per batch.", "error");
      return;
    }
    const qty = parseFloat(prodForm.quantity);
    const minQty = getMinQuantity(prodForm.unit);
    if (qty < minQty) {
      showToast(`Kuantiti minimum ialah ${minQty} ${prodForm.unit}.`, "error");
      return;
    }

    setAddingProd(true);
    try {
      const gunaBase = convertToBaseUnit(qty, prodForm.unit);
      const totalCost = parseFloat(prodForm.total_cost);
      const costPerUnit = gunaBase > 0 ? totalCost / gunaBase : 0;

      const res = await fetch(`${API_URL}/products/${product_id}/productions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: prodForm.name,
          quantity: qty,
          unit: prodForm.unit,
          cost_per_unit: costPerUnit,
          total_cost: totalCost,
          units_produced: finalUnits,
          batch_date: prodForm.batch_date,
          purchase_price: parseFloat(prodForm.purchase_price) || 0,
          purchase_qty: parseFloat(prodForm.purchase_qty) || 0,
          purchase_unit: prodForm.purchase_unit,
        }),
      });
      const data = await res.json();
      if (data.production) setProductions(prev => [data.production, ...prev]);
      setProdForm(defaultProdForm());
      setShowAddProduction(false);
      showToast("Bahan berjaya ditambah!", "success");
    } catch {
      console.error("Add production error");
    } finally {
      setAddingProd(false);
    }
  };

  const handleAddSupplierCost = async () => {
    if (!supplierCostForm.total_cost) {
      showToast("Sila masukkan jumlah kos supplier.", "error");
      return;
    }
    const totalCost = parseFloat(supplierCostForm.total_cost);
    if (totalCost <= 0) {
      showToast("Kos supplier mesti lebih daripada RM 0.", "error");
      return;
    }
    const units = supplierCostForm.units_produced ? parseInt(supplierCostForm.units_produced) : unitsProduced;
    if (!units || units <= 0) {
      showToast("Sila masukkan bilangan unit dihasilkan.", "error");
      return;
    }

    setAddingCost(true);
    try {
      const res = await fetch(`${API_URL}/products/${product_id}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: supplierCostForm.name || "Kos Supplier",
          type: "indirect",
          behavior: "variable",
          cost_per_unit: totalCost / units,
          total_cost: totalCost,
          cost_category: "supplier",
        }),
      });
      const data = await res.json();
      if (data.cost) {
        setCosts(prev => [data.cost, ...prev]);
        setSupplierCostForm({
          name: "Kos Supplier",
          behavior: "variable",
          cost_per_unit: "",
          total_cost: "",
          units_produced: "",
        });
        setShowAddCost(false);
        showToast("Kos supplier berjaya ditambah!", "success");
      }
    } catch {
      console.error("Add supplier cost error");
    } finally {
      setAddingCost(false);
    }
  };

  const handleAddCost = async (type: string) => {
    if (!costForm.name || !costForm.cost_per_unit || !costForm.total_cost) return;
    setAddingCost(true);
    try {
      const res = await fetch(`${API_URL}/products/${product_id}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: costForm.name,
          type,
          behavior: costForm.behavior,
          cost_per_unit: parseFloat(costForm.cost_per_unit),
          total_cost: parseFloat(costForm.total_cost),
          cost_category: "standard",
        }),
      });
      const data = await res.json();
      if (data.cost) setCosts(prev => [data.cost, ...prev]);
      setCostForm({ name: "", behavior: "fixed", cost_per_unit: "", total_cost: "" });
      setShowAddCost(false);
      showToast("Kos berjaya ditambah!", "success");
    } catch {
      console.error("Add cost error");
    } finally {
      setAddingCost(false);
    }
  };

  const handleUpdateQuantity = async (production_id: string, delta: number) => {
    const prod = productions.find(p => p.production_id === production_id);
    if (!prod) return;
    const currentQty = typeof prod.quantity === "string" ? parseFloat(prod.quantity) : prod.quantity;
    if (isNaN(currentQty)) return;

    const step = getStep(prod.unit);
    const minQty = getMinQuantity(prod.unit);
    let newQty = currentQty + delta;
    newQty = step === 0.001 ? Math.round(newQty * 1000) / 1000 : Math.round(newQty);
    if (newQty < minQty) {
      showToast(`Kuantiti minimum ialah ${minQty} ${prod.unit}.`, "error");
      return;
    }

    let newTotalCost = prod.total_cost;
    let newCostPerUnit = prod.cost_per_unit;
    if (prod.purchase_price !== undefined && prod.purchase_qty !== undefined && prod.purchase_unit) {
      const beliBase = convertToBaseUnit(prod.purchase_qty, prod.purchase_unit);
      const gunaBase = convertToBaseUnit(newQty, prod.unit);
      const costPerBase = beliBase > 0 ? prod.purchase_price / beliBase : 0;
      newTotalCost = costPerBase * gunaBase;
      newCostPerUnit = gunaBase > 0 ? newTotalCost / gunaBase : 0;
    } else {
      const oldBase = convertToBaseUnit(currentQty, prod.unit);
      const newBase = convertToBaseUnit(newQty, prod.unit);
      if (oldBase > 0) {
        newTotalCost = (newBase / oldBase) * prod.total_cost;
        newCostPerUnit = newBase > 0 ? newTotalCost / newBase : 0;
      }
    }

    setProductions(prev => prev.map(p =>
      p.production_id === production_id
        ? { ...p, quantity: newQty, total_cost: newTotalCost, cost_per_unit: newCostPerUnit }
        : p
    ));

    try {
      const res = await fetch(`${API_URL}/productions/${production_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: prod.name,
          quantity: newQty,
          unit: prod.unit,
          cost_per_unit: newCostPerUnit,
          total_cost: newTotalCost,
          units_produced: prod.units_produced,
          batch_date: prod.batch_date,
          purchase_price: prod.purchase_price,
          purchase_qty: prod.purchase_qty,
          purchase_unit: prod.purchase_unit,
        }),
      });
      if (!res.ok) {
        setProductions(prev => prev.map(p =>
          p.production_id === production_id
            ? { ...p, quantity: currentQty, total_cost: prod.total_cost, cost_per_unit: prod.cost_per_unit }
            : p
        ));
        showToast("Gagal mengemaskini kuantiti.", "error");
      } else {
        showToast("Kuantiti dikemaskini!", "success");
      }
    } catch {
      setProductions(prev => prev.map(p =>
        p.production_id === production_id
          ? { ...p, quantity: currentQty, total_cost: prod.total_cost, cost_per_unit: prod.cost_per_unit }
          : p
      ));
      showToast("Ralat rangkaian.", "error");
    }
  };

  const openEditProduction = (p: Production) => {
    let purchasePrice = p.purchase_price;
    let purchaseQty = p.purchase_qty;
    let purchaseUnit = p.purchase_unit || "kg";

    if (purchasePrice === undefined || purchaseQty === undefined) {
      const qty = typeof p.quantity === "string" ? parseFloat(p.quantity) : p.quantity;
      const baseQty = convertToBaseUnit(qty, p.unit);
      if (baseQty > 0 && p.total_cost > 0) {
        const effectivePricePerBase = p.total_cost / baseQty;
        const oneUnitBase = convertToBaseUnit(1, p.unit);
        purchasePrice = effectivePricePerBase * oneUnitBase;
        purchaseQty = 1;
        purchaseUnit = p.unit;
      } else {
        purchasePrice = 0;
        purchaseQty = 0;
      }
    }

    setSelectedProduction(p);
    setEditProdForm({
      name: p.name ?? "",
      quantity: String(p.quantity),
      unit: p.unit ?? "g",
      cost_per_unit: String(p.cost_per_unit),
      total_cost: String(p.total_cost),
      units_produced: String(p.units_produced ?? 1),
      batch_date: p.batch_date ? p.batch_date.split("T")[0] : new Date().toISOString().split("T")[0],
      purchase_price: purchasePrice ? formatPrice(purchasePrice) : "",
      purchase_qty: purchaseQty ? formatQty(purchaseQty) : "",
      purchase_unit: purchaseUnit,
    });
  };

  const handleEditProduction = async () => {
    if (!selectedProduction) return;
    const qty = parseFloat(editProdForm.quantity);
    const minQty = getMinQuantity(editProdForm.unit);
    if (qty < minQty) {
      showToast(`Kuantiti minimum ialah ${minQty} ${editProdForm.unit}.`, "error");
      return;
    }
    setSavingEdit(true);
    try {
      let totalCost = parseFloat(editProdForm.total_cost);
      let costPerUnit = parseFloat(editProdForm.cost_per_unit);
      const harga = parseFloat(editProdForm.purchase_price) || 0;
      const beliQty = parseFloat(editProdForm.purchase_qty) || 0;
      const beliUnit = editProdForm.purchase_unit;
      const gunaQty = qty;
      const gunaUnit = editProdForm.unit;
      if (harga > 0 && beliQty > 0) {
        const beliBase = convertToBaseUnit(beliQty, beliUnit);
        const gunaBase = convertToBaseUnit(gunaQty, gunaUnit);
        const costPerBase = beliBase > 0 ? harga / beliBase : 0;
        totalCost = costPerBase * gunaBase;
        costPerUnit = gunaBase > 0 ? totalCost / gunaBase : 0;
      }

      const res = await fetch(`${API_URL}/productions/${selectedProduction.production_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editProdForm.name,
          quantity: qty,
          unit: editProdForm.unit,
          cost_per_unit: costPerUnit,
          total_cost: totalCost,
          units_produced: parseInt(editProdForm.units_produced),
          batch_date: editProdForm.batch_date,
          purchase_price: harga,
          purchase_qty: beliQty,
          purchase_unit: beliUnit,
        }),
      });
      const data = await res.json();
      setProductions(prev => prev.map(p => p.production_id === selectedProduction.production_id ? data.production : p));
      setSelectedProduction(null);
      showToast("Bahan berjaya dikemaskini!", "success");
    } catch {
      console.error("Edit production error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduction = async () => {
    if (!selectedProduction) return;
    setDeletingItem(true);
    try {
      await fetch(`${API_URL}/productions/${selectedProduction.production_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductions(prev => prev.filter(p => p.production_id !== selectedProduction.production_id));
      setSelectedProduction(null);
      showToast("Bahan berjaya dipadam!", "success");
    } catch {
      console.error("Delete production error");
    } finally {
      setDeletingItem(false);
    }
  };

  const openEditCost = (c: Cost) => {
    setSelectedCost(c);
    setEditCostForm({
      name: c.name,
      behavior: c.behavior,
      cost_per_unit: String(c.cost_per_unit),
      total_cost: String(c.total_cost),
    });
  };

  const handleEditCost = async () => {
    if (!selectedCost) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/costs/${selectedCost.costs_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editCostForm.name,
          behavior: editCostForm.behavior,
          cost_per_unit: parseFloat(editCostForm.cost_per_unit),
          total_cost: parseFloat(editCostForm.total_cost),
        }),
      });
      const data = await res.json();
      setCosts(prev => prev.map(c => c.costs_id === selectedCost.costs_id ? data.cost : c));
      setSelectedCost(null);
      showToast("Kos berjaya dikemaskini!", "success");
    } catch {
      console.error("Edit cost error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCost = async () => {
    if (!selectedCost) return;
    setDeletingItem(true);
    try {
      await fetch(`${API_URL}/costs/${selectedCost.costs_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCosts(prev => prev.filter(c => c.costs_id !== selectedCost.costs_id));
      setSelectedCost(null);
      showToast("Kos berjaya dipadam!", "success");
    } catch {
      console.error("Delete cost error");
    } finally {
      setDeletingItem(false);
    }
  };

  const filteredProductions = productions.filter(Boolean).filter(p =>
    (p.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ─── Return ──────────────────────────────────────────────────────────
  return {
    // State
    product,
    costs,
    productions,
    tab,
    loading,
    deleting,
    search,
    showAddCost,
    showAddProduction,
    addingCost,
    addingProd,
    selectedProduction,
    selectedCost,
    savingEdit,
    deletingItem,
    showEditPriceModal,
    tempPrice,
    updatingPrice,
    toast,
    isDropship,
    supplierCostForm,
    costForm,
    prodForm,
    editProdForm,
    editCostForm,
    batchSize,
    // Derived
    unitsProduced,
    sellingPrice,
    cvp,
    bahanTotal,
    tenagaTotal,
    lainTotal,
    hasBahan,
    hasTenaga,
    hasLain,
    completedSteps,
    marginMeta,
    bepUnitsCeil,
    bepBarFill,
    latestBatch,
    filteredProductions,
    // Setters
    setTab,
    setSearch,
    setShowAddCost,
    setShowAddProduction,
    setProdForm,
    setSupplierCostForm,
    setCostForm,
    setEditProdForm,
    setEditCostForm,
    setTempPrice,
    setToast,
    setShowEditPriceModal,
    setSelectedCost,
    setBatchSize: handleSetBatchSize,
    // Handlers
    showToast,
    openEditPriceModal,
    handleUpdatePrice,
    handleDelete,
    openAddProduction,
    handleAddProduction,
    handleAddSupplierCost,
    handleAddCost,
    handleUpdateQuantity,
    openEditProduction,
    handleEditProduction,
    handleDeleteProduction,
    openEditCost,
    handleEditCost,
    handleDeleteCost,
    router,
  };
}