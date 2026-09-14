// app/produk/[product_id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import DropshipProductDetail from "@/components/products/dropship/DropShipProductDetail";
import RegularProductDetail from "@/components/products/regular/RegularProductDetail";

function LoadingSpinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "sans-serif" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid #dbeafe", borderTopColor: "#2563eb", animation: "spin 0.75s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#94a3b8" }}>Memuatkan...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ProductDetailPage() {
  const [isDropship, setIsDropship] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/business`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setIsDropship(data.business?.type === "dropship");
      })
      .catch(() => setIsDropship(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return isDropship ? <DropshipProductDetail /> : <RegularProductDetail />;
}