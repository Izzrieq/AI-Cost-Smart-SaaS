// app/produk/page.tsx
"use client";

import { useProducts } from "@/hooks/useProducts";
import ProductsView from "@/components/products/ProductsView";
import "@/app/(user)/produk/produk.css"; 

export default function ProdukPage() {
  const {
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
  } = useProducts();

  return (
    <ProductsView
      loading={loading}
      products={products}
      search={search}
      setSearch={setSearch}
      filter={filter}
      setFilter={setFilter}
      filtered={filtered}
      sihatCount={sihatCount}
      sederhanaCount={sederhanaCount}
      rendahCount={rendahCount}
      getMarginMeta={getMarginMeta}
      router={router}
    />
  );
}