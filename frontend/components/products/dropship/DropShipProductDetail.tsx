// components/products/dropship/DropshipProductDetail.tsx
"use client";

import React from "react";
import { useProductDetail } from "@/hooks/useProductDetail";
import {
  IconBox,
  IconUser,
  IconZap,
  IconPlus,
  IconSearch,
  IconInfo,
  IconArrowRight,
} from "@/components/products/Icons";
import ProductHeader from "../shared/ProductHeader";
import ProgressCard from "../shared/ProgressCard";
import CVPAnalysis from "../shared/CVPAnalysis";
import RingkasanKos from "../shared/RingkasanKos";
import Toast from "../shared/Toast";
import AddCostModal from "../shared/modals/AddCostModal";
import EditCostModal from "../shared/modals/EditCostModal";
import EditPriceModal from "../shared/modals/EditPriceModal";
import "@/app/(user)/produk/[product_id]/product-detail.css";

// ─── LOADING SPINNER ─────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "3px solid #dbeafe",
          borderTopColor: "#2563eb",
          animation: "spin 0.75s linear infinite",
        }}
      />
      <span style={{ fontSize: 13, color: "#94a3b8" }}>Memuatkan...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function DropshipProductDetail() {
  const {
    product,
    costs,
    tab,
    loading,
    deleting,
    search,
    showAddCost,
    addingCost,
    selectedCost,
    savingEdit,
    deletingItem,
    showEditPriceModal,
    tempPrice,
    updatingPrice,
    toast,
    setToast,
    isDropship,
    supplierCostForm,
    costForm,
    batchSize,
    setBatchSize,
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
    setTab,
    setSearch,
    setShowAddCost,
    setSupplierCostForm,
    setCostForm,
    setTempPrice,
    setShowEditPriceModal,
    showToast,
    openEditPriceModal,
    handleUpdatePrice,
    handleDelete,
    handleAddSupplierCost,
    handleAddCost,
    openEditCost,
    handleEditCost,
    handleDeleteCost,
    editCostForm,
    setEditCostForm,
    setSelectedCost,
    router,
  } = useProductDetail();

  if (loading) return <LoadingSpinner />;

  const tabs: { key: "supplier" | "tenaga" | "lain"; label: string; icon: JSX.Element }[] = [
    { key: "supplier", label: "Supplier", icon: <IconBox /> },
    { key: "tenaga", label: "Tenaga Kerja", icon: <IconUser /> },
    { key: "lain", label: "Lain-Lain", icon: <IconZap /> },
  ];

  return (
    <div className="pd-root">
      <ProductHeader
        product={product}
        sellingPrice={sellingPrice}
        marginMeta={marginMeta}
        cvp={cvp}
        isDropship={isDropship}
        onBack={() => router.back()}
        onDelete={handleDelete}
        onEditPrice={openEditPriceModal}
        deleting={deleting}
      />

      <div className="pd-body">
        {/* Tabs */}
        <div className="pd-card" style={{ padding: 6 }}>
          <div className="pd-tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`pd-tab-btn ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <ProgressCard
          isDropship={isDropship}
          hasBahan={hasBahan}
          hasTenaga={hasTenaga}
          hasLain={hasLain}
          completedSteps={completedSteps}
        />

        {/* Tooltip */}
        <div className="pd-tooltip">
          <div className="pd-tooltip-icon">
            <IconInfo />
          </div>
          <p>
            {tab === "supplier" && "Masukkan kos belian dari supplier untuk 1 batch."}
            {tab === "tenaga" && "Kos upah pekerja untuk 1 batch. Bukan gaji bulanan."}
            {tab === "lain" && "Kos overhead seperti gas, elektrik, pembungkusan per batch."}
          </p>
        </div>

        {latestBatch && (
          <div className="pd-batch-badge">
            🏭 Batch semasa: <strong>{unitsProduced} unit dihasilkan</strong>
            &nbsp;·&nbsp;
            {latestBatch.batch_date
              ? new Date(latestBatch.batch_date).toLocaleDateString("ms-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </div>
        )}

        {/* ─── BATCH SIZE CARD (Dropship only) ─── */}
        {isDropship && (
          <div className="pd-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <span style={{ marginRight: 6 }}><IconBox /></span> Saiz Batch (unit dihasilkan)
              </span>
              <div className="pd-qty-controls">
                <button
                  className="pd-qty-btn minus"
                  onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                >
                  −
                </button>
                <span className="pd-qty-val">{batchSize}</span>
                <button
                  className="pd-qty-btn plus"
                  onClick={() => setBatchSize(batchSize + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Jumlah unit yang dihasilkan dalam setiap batch. Ini digunakan untuk mengira kos seunit dan margin.
            </div>
          </div>
        )}

        {/* ─── SUPPLIER TAB ─── */}
        {tab === "supplier" && (
          <>
            <div
              className="pd-card"
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IconBox />
                <div>
                  <div style={{ fontWeight: 700, color: "#15803d", fontSize: 14 }}>
                    Mod Dropship
                  </div>
                  <div style={{ fontSize: 12, color: "#16a34a" }}>
                    Anda tidak perlu masukkan bahan mentah. Masukkan kos belian dari supplier sahaja.
                  </div>
                </div>
              </div>
            </div>

            {costs.filter((c) => c.cost_category === "supplier").length > 0 ? (
              costs
                .filter((c) => c.cost_category === "supplier")
                .map((c, idx) => (
                  <div
                    key={c.costs_id}
                    className="pd-item-card"
                    style={{ animationDelay: `${0.05 + idx * 0.04}s` }}
                    onClick={() => openEditCost(c)}
                  >
                    <div className="pd-item-top">
                      <div className="pd-item-icon supplier">
                        <IconBox />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="pd-item-name">{c.name}</div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 3,
                          }}
                        >
                          <span className={`pd-behavior-badge ${c.behavior}`}>
                            {c.behavior === "fixed" ? "Tetap" : "Berubah"}
                          </span>
                          <span
                            className="pd-behavior-badge"
                            style={{
                              background: "#dcfce7",
                              color: "#16a34a",
                            }}
                          >
                            Supplier
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="pd-item-amount">
                          RM {parseFloat(String(c.total_cost)).toFixed(2)}
                        </div>
                        <div className="pd-item-amount-sub">
                          RM {parseFloat(String(c.cost_per_unit)).toFixed(4)}/unit
                        </div>
                      </div>
                      <div className="pd-item-arrow">
                        <IconArrowRight />
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="pd-empty" onClick={() => setShowAddCost(true)}>
                <div className="pd-empty-icon">
                  <IconBox />
                </div>
                <div className="pd-empty-title">Tiada kos supplier</div>
                <div className="pd-empty-desc">
                  Masukkan kos belian dari supplier untuk produk ini.
                </div>
                <button
                  className="pd-empty-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddCost(true);
                  }}
                >
                  + Tambah Kos Supplier
                </button>
              </div>
            )}

            <button className="pd-add-full-btn" onClick={() => setShowAddCost(true)}>
              <IconPlus size={16} color="#fff" />
              Tambah Kos Supplier
            </button>
          </>
        )}

        {/* ─── TENAGA & LAIN TABS ─── */}
        {(tab === "tenaga" || tab === "lain") && (
          <>
            <button className="pd-add-full-btn" onClick={() => setShowAddCost(true)}>
              <IconPlus size={16} color="#fff" />
              {tab === "tenaga" ? "Tambah Tenaga Kerja" : "Tambah Overhead / Lain-lain"}
            </button>
            {costs.filter(
              (c) =>
                c?.type === (tab === "tenaga" ? "tenaga" : "indirect") &&
                c.cost_category !== "supplier"
            ).length === 0 ? (
              <div className="pd-empty">
                <div className="pd-empty-icon">
                  {tab === "tenaga" ? <IconUser /> : <IconZap />}
                </div>
                <div className="pd-empty-title">
                  {tab === "tenaga" ? "Tiada rekod tenaga kerja" : "Tiada rekod utiliti"}
                </div>
                <div className="pd-empty-desc">
                  {tab === "tenaga"
                    ? "Tambah kos upah per batch."
                    : "Tambah kos overhead per batch."}
                </div>
              </div>
            ) : (
              costs
                .filter(
                  (c) =>
                    c?.type === (tab === "tenaga" ? "tenaga" : "indirect") &&
                    c.cost_category !== "supplier"
                )
                .map((c, idx) => (
                  <div
                    key={c.costs_id}
                    className="pd-item-card"
                    style={{ animationDelay: `${0.05 + idx * 0.04}s` }}
                    onClick={() => openEditCost(c)}
                  >
                    <div className="pd-item-top">
                      <div className={`pd-item-icon ${tab}`}>
                        {tab === "tenaga" ? <IconUser /> : <IconZap />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="pd-item-name">{c.name}</div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 3,
                          }}
                        >
                          <span className={`pd-behavior-badge ${c.behavior}`}>
                            {c.behavior === "fixed" ? "Tetap" : "Berubah"}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="pd-item-amount">
                          RM {parseFloat(String(c.total_cost)).toFixed(2)}
                        </div>
                        <div className="pd-item-amount-sub">
                          RM {parseFloat(String(c.cost_per_unit)).toFixed(4)}/unit
                        </div>
                      </div>
                      <div className="pd-item-arrow">
                        <IconArrowRight />
                      </div>
                    </div>
                  </div>
                ))
            )}
          </>
        )}

        {/* CVP & Ringkasan */}
        <CVPAnalysis
          cvp={cvp}
          unitsProduced={unitsProduced}
          sellingPrice={sellingPrice}
          isDropship={isDropship}
          bepUnitsCeil={bepUnitsCeil}
          bepBarFill={bepBarFill}
        />

        <RingkasanKos
          isDropship={isDropship}
          bahanTotal={bahanTotal}
          tenagaTotal={tenagaTotal}
          lainTotal={lainTotal}
          cvp={cvp}
          unitsProduced={unitsProduced}
        />

        {/* Modals */}
        <EditPriceModal
          show={showEditPriceModal}
          tempPrice={tempPrice}
          updatingPrice={updatingPrice}
          cvp={cvp}
          onClose={() => setShowEditPriceModal(false)}
          onChange={setTempPrice}
          onSave={handleUpdatePrice}
        />

        <AddCostModal
          show={showAddCost}
          tab={tab}
          isDropship={isDropship}
          supplierCostForm={supplierCostForm}
          costForm={costForm}
          addingCost={addingCost}
          unitsProduced={unitsProduced}
          onClose={() => setShowAddCost(false)}
          onSupplierChange={setSupplierCostForm}
          onCostChange={setCostForm}
          onSupplierSave={handleAddSupplierCost}
          onCostSave={handleAddCost}
        />

        <EditCostModal
          show={!!selectedCost}
          selectedCost={selectedCost}
          editCostForm={editCostForm}
          savingEdit={savingEdit}
          deletingItem={deletingItem}
          onClose={() => setSelectedCost(null)}
          onEditChange={setEditCostForm}
          onSave={handleEditCost}
          onDelete={handleDeleteCost}
        />

        <Toast
          toast={toast}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </div>
    </div>
  );
}