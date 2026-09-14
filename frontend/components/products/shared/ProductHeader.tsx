// components/produk/shared/ProductHeader.tsx
"use client";

import { IconBack, IconTrash, IconEdit, IconDropshipMode } from "@/components/products/Icons";
import { matchFoodImage } from "@/lib/foodImages";

// ─── TYPES ──────────────────────────────────────────────────────────────
interface MarginMeta {
  label: string;
  dot: string;
  color: string;
}

interface CVPData {
  netProfitMarginPct: number;
  cmRatio: number;
  totalBatchCost: number;
}

interface Product {
  product_id: string;
  name: string;
  description: string;
  selling_price: number;
  image_url: string | null;
  sale_unit?: string; // ← added for display
}

interface ProductHeaderProps {
  product: Product | null;
  sellingPrice: number;
  marginMeta: MarginMeta;
  cvp: CVPData;
  isDropship: boolean;
  onBack: () => void;
  onDelete: () => void;
  onEditPrice: () => void;
  deleting: boolean;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function ProductHeader({
  product,
  sellingPrice,
  marginMeta,
  cvp,
  isDropship,
  onBack,
  onDelete,
  onEditPrice,
  deleting,
}: ProductHeaderProps) {
  const unitDisplay = product?.sale_unit || "unit"; // fallback to "unit"

  return (
    <div className="pd-header">
      <div className="pd-header-top">
        <button className="pd-back-btn" onClick={onBack}>
          <IconBack /> Kira Kos
        </button>
        <button className="pd-delete-btn" onClick={onDelete} disabled={deleting}>
          <IconTrash />
        </button>
      </div>
      <div className="pd-hero-info">
        <div className="pd-hero-img">
          <img
            src={product?.image_url || matchFoodImage(product?.name ?? "")}
            alt={product?.name}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pd-hero-name">{product?.name}</div>
          <div className="pd-hero-price-wrap">
            <span className="pd-hero-price">
              Harga jual: RM {sellingPrice.toFixed(2)} / {unitDisplay}
            </span>
            <button className="pd-edit-price-btn" onClick={onEditPrice}>
              <IconEdit /> Edit
            </button>
          </div>
          <div className="pd-pills-row">
            <div className="pd-margin-pill">
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: marginMeta.dot,
                }}
              />
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                Untung {cvp.netProfitMarginPct.toFixed(1)}% — {marginMeta.label}
              </span>
            </div>
            {cvp.totalBatchCost > 0 && (
              <div className="pd-cm-pill">
                <span
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  CM {cvp.cmRatio.toFixed(1)}%
                </span>
              </div>
            )}
            {isDropship && (
              <div
                className="pd-cm-pill"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <IconDropshipMode />
                <span
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Dropship
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}