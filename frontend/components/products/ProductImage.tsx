// components/produk/ProductImage.tsx
"use client";

import { RefreshIcon } from "./Icons";

type Props = {
  imageUrl: string | null;
  productName: string;
  onRefresh: () => void;
};

export default function ProductImage({ imageUrl, productName, onRefresh }: Props) {
  return (
    <div className="tp-img-card">
      <div className="tp-img-area">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={productName || "product preview"} />
            <div className="tp-img-overlay" />
            <div className="tp-img-badge">Pratonton</div>
          </>
        ) : (
          <div className="tp-img-placeholder">
            <div className="tp-img-placeholder-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <p>Imej akan muncul<br />selepas nama diisi</p>
          </div>
        )}
      </div>
      <div className="tp-img-footer">
        <span className="tp-img-footer-label">Gambar Produk</span>
        {imageUrl && (
          <button className="tp-refresh-btn" onClick={onRefresh}>
            <RefreshIcon />
            Cuba lain
          </button>
        )}
      </div>
    </div>
  );
}