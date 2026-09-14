// components/produk/TambahProdukPage.tsx
"use client";

import { useTambahProduk } from "@/hooks/useTambahProduk";
import ProductImage from "./ProductImage";
import ProductBaseForm from "./ProductBaseForm";
import DropshipCostFields from "./DropshipCostFields";
import ProfitSummary from "./ProfitSummary";
import FormSteps from "./FormSteps";
import SubmitButton from "./SubmitButton";
import {
  BoxIcon,
  InfoIcon,
  IconHome,
  IconDropship,
} from "@/components/products/Icons";
import "@/app/(user)/produk/tambah-produk/tambah-produk.css";

export default function TambahProdukPage() {
  const {
    form,
    setForm,
    imageUrl,
    loading,
    success,
    error,
    focusedField,
    setFocusedField,
    productMode,
    setProductMode,
    isDropship,
    dropshipCosts,
    setDropshipCosts,
    showAdvanced,
    setShowAdvanced,
    getSaleUnit,
    fetchImage,
    handleNameBlur,
    handleSubmit,
    priceVal,
    displayUnit,
    supplierVal,
    shippingVal,
    packagingVal,
    profitVal,
    profitMarginPct,
    batchSize,        // ← from hook
    setBatchSize,     // ← from hook
    router,
  } = useTambahProduk();

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDropshipCostChange = (field: string, value: string) => {
    setDropshipCosts((prev) => ({ ...prev, [field]: value }));
  };

  const handleModeChange = (mode: "dropship" | "regular") => {
    setProductMode(mode);
  };

  // ─── Steps ────────────────────────────────────────────────────────
  const regularSteps = [
    { label: "Simpan produk ini ✓", sub: "Nama + harga jual + unit jualan" },
    { label: "Masukkan bahan mentah", sub: "Kos bahan + bilangan unit dihasilkan per batch" },
    { label: "Masukkan tenaga kerja & overhead", sub: "Pilih sama ada kos tetap atau berubah" },
    { label: "Margin & BEP dikira automatik", sub: "Menggunakan formula CVP sebenar" },
  ];

  const dropshipSteps = [
    { label: "Simpan produk ini ✓", sub: "Nama + harga jual + kos supplier" },
    { label: "Margin dikira automatik", sub: "Berdasarkan harga jual dan kos supplier" },
    { label: "Lihat analisis keuntungan", sub: "Di halaman Analisis Produk" },
  ];

  return (
    <div className="tp-root">
      {/* ─── HEADER ─── */}
      <div className="tp-header">
        <div className="tp-header-top">
          <button className="tp-back-btn" onClick={() => router.back()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div className="tp-header-title">Tambah Produk</div>
            <div className="tp-header-subtitle">
              {isDropship ? "Mod Dropship - Masukkan kos supplier" : "Langkah 1 daripada 3"}
            </div>
          </div>
        </div>

        {/* ─── MODE SELECTOR ─── */}
        <div className="tp-mode-selector">
          <button
            className={`tp-mode-btn ${!isDropship ? "active" : ""}`}
            onClick={() => handleModeChange("regular")}
          >
            <IconHome /> Buatan Sendiri
          </button>
          <button
            className={`tp-mode-btn ${isDropship ? "active" : ""}`}
            onClick={() => handleModeChange("dropship")}
          >
            <IconDropship /> Dropship
          </button>
        </div>

        <div className="tp-preview-pill">
          {form.name && <div className="tp-pill">{form.name}</div>}
          {priceVal > 0 && (
            <div className="tp-pill">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              RM {priceVal.toFixed(2)} / {displayUnit || "unit"}
            </div>
          )}
          {isDropship && supplierVal > 0 && (
            <div className="tp-pill">
              <BoxIcon />
              Kos: RM {supplierVal.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="tp-body">
        {error && (
          <div className="tp-error">
            <div className="tp-error-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <div className="tp-error-text">{error}</div>
          </div>
        )}

        <ProductImage
          imageUrl={imageUrl}
          productName={form.name}
          onRefresh={() => fetchImage(form.name)}
        />

        <div className="tp-info-banner">
          <div className="tp-info-icon">
            <InfoIcon />
          </div>
          <div className="tp-info-text">
            {isDropship ? (
              <><strong>Untung bersih dikira secara automatik.</strong> Masukkan harga jual dan kos supplier — sistem akan kira margin % sebenar anda.</>
            ) : (
              <><strong>Margin dikira secara automatik.</strong> Selepas simpan produk, masukkan bahan, tenaga kerja dan overhead — sistem akan kira margin % sebenar berdasarkan CVP formula.</>
            )}
          </div>
        </div>

        <ProductBaseForm
          form={form}
          focusedField={focusedField}
          onFieldChange={handleFieldChange}
          onFocus={setFocusedField}
          onNameBlur={handleNameBlur}
          displayUnit={displayUnit}
          priceVal={priceVal}
          isDropship={isDropship}
        />

        {isDropship && (
          <>
            <DropshipCostFields
              supplierCost={dropshipCosts.supplierCost}
              shippingCost={dropshipCosts.shippingCost}
              packagingCost={dropshipCosts.packagingCost}
              onCostChange={handleDropshipCostChange}
              displayUnit={displayUnit}
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            />

            {/* ─── BATCH SIZE INPUT ─── */}
            <div className="tp-field">
              <label className="tp-field-label">Saiz Batch (unit dihasilkan)</label>
              <div className="tp-qty-controls">
                <button
                  className="tp-qty-btn minus"
                  onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                >
                  −
                </button>
                <span className="tp-qty-val">{batchSize}</span>
                <button
                  className="tp-qty-btn plus"
                  onClick={() => setBatchSize(batchSize + 1)}
                >
                  +
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                Jumlah unit yang dihasilkan dalam setiap batch. Ini digunakan untuk mengira kos seunit dan margin.
              </div>
            </div>

            <ProfitSummary
              priceVal={priceVal}
              supplierVal={supplierVal}
              shippingVal={shippingVal}
              packagingVal={packagingVal}
              profitVal={profitVal}
              profitMarginPct={profitMarginPct}
            />
          </>
        )}

        <FormSteps steps={isDropship ? dropshipSteps : regularSteps} />

        <SubmitButton
          loading={loading}
          success={success}
          isDropship={isDropship}
          onClick={handleSubmit}
        />
      </div>

      {/* ─── STYLES FOR MODE BUTTONS & BATCH CONTROLS ─── */}
      <style>{`
        .tp-mode-selector {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          position: relative;
          z-index: 1;
        }
        .tp-mode-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 99px;
          border: 1.5px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Plus Jakarta Sans', sans-serif;
          backdrop-filter: blur(4px);
        }
        .tp-mode-btn svg {
          width: 16px;
          height: 16px;
          stroke: currentColor;
        }
        .tp-mode-btn:hover {
          background: rgba(255,255,255,0.15);
        }
        .tp-mode-btn.active {
          background: rgba(255,255,255,0.25);
          border-color: rgba(255,255,255,0.6);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .tp-qty-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tp-qty-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .tp-qty-btn.minus {
          background: #f1f5f9;
          color: #475569;
        }
        .tp-qty-btn.plus {
          background: linear-gradient(135deg, #1a56db, #3b82f6);
          color: #fff;
        }
        .tp-qty-val {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          min-width: 56px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}