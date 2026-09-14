// components/produk/regular/RegularProductDetail.tsx
"use client";

import React from "react"; // ← ADD THIS
import { useProductDetail } from "@/hooks/useProductDetail";
import {
  IconBox,
  IconUser,
  IconZap,
  IconPlus,
  IconSearch,
  IconArrowRight,
  IconInfo,
} from "@/components/products/Icons";
import ProductHeader from "../shared/ProductHeader";
import ProgressCard from "../shared/ProgressCard";
import CVPAnalysis from "../shared/CVPAnalysis";
import RingkasanKos from "../shared/RingkasanKos";
import Toast from "../shared/Toast";
import AddCostModal from "../shared/modals/AddCostModal";
import EditCostModal from "../shared/modals/EditCostModal";
import EditPriceModal from "../shared/modals/EditPriceModal";
import AddProductionModal from "../shared/modals/AddProductionModal";
import EditProductionModal from "../shared/modals/EditProductionModal";
import "@/app/(user)/produk/[product_id]/product-detail.css";

import {
  getBaseUnitDisplay,
  formatQuantityDisplay,
  getStep,
} from "@/hooks/useProductDetail";

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

export default function RegularProductDetail() {
  const {
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
    setToast,
    isDropship,
    supplierCostForm,
    costForm,
    prodForm,
    editProdForm,
    editCostForm,
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
    setShowEditPriceModal,
    setSelectedProduction,
    setSelectedCost,
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
  } = useProductDetail();

  if (loading) return <LoadingSpinner />;

  // ✅ Use React.ReactElement instead of JSX.Element
  const tabs: { key: "bahan" | "tenaga" | "lain"; label: string; icon: React.ReactElement }[] = [
    { key: "bahan", label: "Bahan", icon: <IconBox /> },
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

        <div className="pd-tooltip">
          <div className="pd-tooltip-icon">
            <IconInfo />
          </div>
          <p>
            {tab === "bahan" && "Masukkan semua bahan mentah untuk 1 batch pengeluaran."}
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

        {/* ─── BAHAN TAB ─── */}
        {tab === "bahan" && (
          <>
            <div className="pd-action-row">
              <div className="pd-search-box">
                <IconSearch />
                <input
                  type="text"
                  placeholder="Cari bahan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="pd-add-fab" onClick={openAddProduction}>
                <IconPlus size={18} color="#fff" />
              </button>
            </div>

            {filteredProductions.length === 0 ? (
              <div className="pd-empty" onClick={openAddProduction}>
                <div className="pd-empty-icon">
                  <IconBox />
                </div>
                <div className="pd-empty-title">
                  {search ? "Tiada hasil" : "Tiada bahan lagi"}
                </div>
                <div className="pd-empty-desc">
                  {search
                    ? `Tiada bahan sepadan dengan "${search}"`
                    : "Tambah bahan dan bilangan unit yang dihasilkan per batch."}
                </div>
                {!search && (
                  <button
                    className="pd-empty-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddProduction();
                    }}
                  >
                    + Tambah Bahan
                  </button>
                )}
              </div>
            ) : (
              filteredProductions.map((p, idx) => (
                <div
                  key={p.production_id}
                  className="pd-item-card"
                  style={{ animationDelay: `${0.05 + idx * 0.04}s` }}
                  onClick={() => openEditProduction(p)}
                >
                  <div className="pd-item-top">
                    <div className="pd-item-icon bahan">
                      <IconBox />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pd-item-name">{p.name ?? "—"}</div>
                      <div className="pd-item-sub">
                        RM {parseFloat(String(p.cost_per_unit)).toFixed(6)} / {getBaseUnitDisplay(p.unit)}
                        {p.units_produced ? ` · ${p.units_produced} unit dihasilkan` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="pd-item-amount">
                        RM {parseFloat(String(p.total_cost)).toFixed(2)}
                      </div>
                      <div className="pd-item-amount-sub">
                        {formatQuantityDisplay(p.quantity, p.unit)} {p.unit}
                      </div>
                    </div>
                    <div className="pd-item-arrow">
                      <IconArrowRight />
                    </div>
                  </div>
                  <div className="pd-item-divider" />
                  <div className="pd-qty-row" onClick={(e) => e.stopPropagation()}>
                    <span className="pd-qty-label">Kuantiti Digunakan</span>
                    <div className="pd-qty-controls">
                      <button
                        className="pd-qty-btn minus"
                        onClick={() =>
                          handleUpdateQuantity(p.production_id, -getStep(p.unit))
                        }
                      >
                        −
                      </button>
                      <span className="pd-qty-val">
                        {formatQuantityDisplay(p.quantity, p.unit)} {p.unit}
                      </span>
                      <button
                        className="pd-qty-btn plus"
                        onClick={() =>
                          handleUpdateQuantity(p.production_id, getStep(p.unit))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
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

        <AddProductionModal
          show={showAddProduction}
          prodForm={prodForm}
          addingProd={addingProd}
          productions={productions}
          unitsProduced={unitsProduced}
          onClose={() => setShowAddProduction(false)}
          onChange={setProdForm}
          onSave={handleAddProduction}
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

        <EditProductionModal
          show={!!selectedProduction}
          selectedProduction={selectedProduction}
          editProdForm={editProdForm}
          savingEdit={savingEdit}
          deletingItem={deletingItem}
          onClose={() => setSelectedProduction(null)}
          onEditChange={setEditProdForm}
          onSave={handleEditProduction}
          onDelete={handleDeleteProduction}
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