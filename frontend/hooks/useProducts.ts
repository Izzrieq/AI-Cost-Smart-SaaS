// hooks/useProducts.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  sale_unit?: string;
}

export function useProducts() {
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

  const getMarginMeta = (margin: number) => {
    if (margin >= 30) return { label: "Sihat", bg: "#f0fdf4", text: "#16a34a", dot: "#4ade80", bar: "#22c55e" };
    if (margin >= 15) return { label: "Sederhana", bg: "#fffbeb", text: "#d97706", dot: "#fbbf24", bar: "#f59e0b" };
    return { label: "Rendah", bg: "#fef2f2", text: "#ef4444", dot: "#fca5a5", bar: "#ef4444" };
  };

  return {
    products,
    loading,
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
  };
}