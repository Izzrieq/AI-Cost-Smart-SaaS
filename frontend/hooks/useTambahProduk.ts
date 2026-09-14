// hooks/useTambahProduk.ts
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { matchFoodImage } from "@/lib/foodImages";

export interface ProductForm {
  name: string;
  description: string;
  selling_price: string;
  sale_unit: string;
  custom_sale_unit: string;
}

export interface DropshipCosts {
  supplierCost: string;
  shippingCost: string;
  packagingCost: string;
}

export function useTambahProduk() {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    selling_price: "",
    sale_unit: "Unit",
    custom_sale_unit: "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string>("");
  const [productMode, setProductMode] = useState<"dropship" | "regular">("regular");
  const [dropshipCosts, setDropshipCosts] = useState<DropshipCosts>({
    supplierCost: "",
    shippingCost: "",
    packagingCost: "",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [batchSize, setBatchSize] = useState(1); // NEW

  useEffect(() => {
    const fetchBusinessType = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/business`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const type = data.business?.type || "";
          setBusinessType(type);
          setProductMode(type === "dropship" ? "dropship" : "regular");
        }
      } catch (err) {
        console.error("Failed to fetch business type:", err);
      }
    };
    fetchBusinessType();
  }, []);

  const isDropship = productMode === "dropship";

  const getSaleUnit = () => form.custom_sale_unit.trim() || form.sale_unit;

  const fetchImage = (name: string) => {
    if (!name.trim()) return;
    setImageUrl(matchFoodImage(name));
  };

  const handleNameBlur = () => {
    setFocusedField(null);
    if (form.name.trim()) fetchImage(form.name);
  };

  const saveDropshipCosts = async (productId: string, token: string | null) => {
    const costs = [];
    const { supplierCost, shippingCost, packagingCost } = dropshipCosts;

    if (supplierCost && parseFloat(supplierCost) > 0) {
      costs.push({
        name: "Kos Supplier",
        type: "indirect",
        behavior: "variable",
        cost_per_unit: parseFloat(supplierCost),
        total_cost: parseFloat(supplierCost),
        cost_category: "supplier",
      });
    }
    if (shippingCost && parseFloat(shippingCost) > 0) {
      costs.push({
        name: "Kos Penghantaran",
        type: "indirect",
        behavior: "variable",
        cost_per_unit: parseFloat(shippingCost),
        total_cost: parseFloat(shippingCost),
        cost_category: "shipping",
      });
    }
    if (packagingCost && parseFloat(packagingCost) > 0) {
      costs.push({
        name: "Kos Pembungkusan",
        type: "indirect",
        behavior: "variable",
        cost_per_unit: parseFloat(packagingCost),
        total_cost: parseFloat(packagingCost),
        cost_category: "packaging",
      });
    }

    for (const cost of costs) {
      try {
        await fetch(`${API_URL}/products/${productId}/costs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(cost),
        });
      } catch (err) {
        console.error("Failed to save dropship cost:", err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.selling_price) {
      setError("Sila lengkapkan nama produk dan harga jual.");
      return;
    }
    if (parseFloat(form.selling_price) <= 0) {
      setError("Harga jual mesti lebih daripada RM 0.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const payload: any = {
        name: form.name,
        description: form.description,
        selling_price: parseFloat(form.selling_price),
        image_url: imageUrl,
        sale_unit: getSaleUnit(),
        mode: productMode,
        batch_size: batchSize, // ← include batch size
      };

      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal menambah produk.");
        return;
      }

      setSuccess(true);

      if (isDropship && data.product) {
        await saveDropshipCosts(data.product.product_id, token);
      }

      setTimeout(() => router.push("/produk"), 1200);
    } catch {
      setError("Tidak dapat sambung ke server.");
    } finally {
      setLoading(false);
    }
  };

  const priceVal = parseFloat(form.selling_price) || 0;
  const displayUnit = getSaleUnit();
  const supplierVal = parseFloat(dropshipCosts.supplierCost) || 0;
  const shippingVal = parseFloat(dropshipCosts.shippingCost) || 0;
  const packagingVal = parseFloat(dropshipCosts.packagingCost) || 0;
  const totalCost = supplierVal + shippingVal + packagingVal;
  const profitVal = priceVal - totalCost;
  const profitMarginPct = priceVal > 0 ? (profitVal / priceVal) * 100 : 0;

  return {
    form,
    setForm,
    imageUrl,
    loading,
    success,
    error,
    focusedField,
    setFocusedField,
    businessType,
    productMode,
    setProductMode,
    isDropship,
    dropshipCosts,
    setDropshipCosts,
    showAdvanced,
    setShowAdvanced,
    batchSize,      // ← added
    setBatchSize,   // ← added
    getSaleUnit,
    fetchImage,
    handleNameBlur,
    handleSubmit,
    priceVal,
    displayUnit,
    supplierVal,
    shippingVal,
    packagingVal,
    totalCost,
    profitVal,
    profitMarginPct,
    router,
  };
}