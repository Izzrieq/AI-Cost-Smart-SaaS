// components/produk/shared/modals/AddProductionModal.tsx
"use client";

import { IconClose } from "@/components/products/Icons";
import {
  recalcCosts,
  convertToBaseUnit,
  getBaseUnitDisplay,
} from "@/hooks/useProductDetail";

interface ProdForm {
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

interface Production {
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

interface AddProductionModalProps {
  show: boolean;
  prodForm: ProdForm;
  addingProd: boolean;
  productions: Production[];
  unitsProduced: number;
  onClose: () => void;
  onChange: (form: ProdForm) => void;
  onSave: () => void;
}

export default function AddProductionModal({
  show,
  prodForm,
  addingProd,
  productions,
  unitsProduced,
  onClose,
  onChange,
  onSave,
}: AddProductionModalProps) {
  if (!show) return null;

  return (
    <div className="pd-modal-backdrop" onClick={onClose}>
      <div className="pd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-handle" />
        <div className="pd-modal-title-row">
          <span className="pd-modal-title">Tambah Bahan</span>
          <button className="pd-modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        {productions.length === 0 ? (
          <div
            className="pd-field"
            style={{ border: "1.5px solid #bfdbfe", background: "#eff6ff" }}
          >
            <label className="pd-field-label" style={{ color: "#3b82f6" }}>
               Bilangan Unit Dihasilkan (per batch)
            </label>
            <input
              type="number"
              placeholder="cth: 10 (balang kuih rose per batch)"
              value={prodForm.units_produced}
              onChange={(e) =>
                onChange({ ...prodForm, units_produced: e.target.value })
              }
            />
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              * Hanya perlu diisi untuk bahan pertama sahaja.
            </div>
          </div>
        ) : (
          <div className="pd-field" style={{ background: "#f8fafc" }}>
            <label className="pd-field-label" style={{ color: "#94a3b8" }}>
               Unit Dihasilkan — Auto: {unitsProduced} unit
            </label>
            <input
              type="text"
              value={`${unitsProduced} unit`}
              disabled
              style={{
                background: "transparent",
                color: "#475569",
                fontWeight: 600,
              }}
            />
          </div>
        )}

        <div className="pd-field">
          <label className="pd-field-label">Tarikh Batch</label>
          <input
            type="date"
            value={prodForm.batch_date}
            onChange={(e) =>
              onChange({ ...prodForm, batch_date: e.target.value })
            }
          />
        </div>

        <div className="pd-field">
          <label className="pd-field-label">Nama Bahan</label>
          <input
            type="text"
            placeholder="cth: Tepung Gandum"
            value={prodForm.name}
            onChange={(e) => onChange({ ...prodForm, name: e.target.value })}
          />
        </div>

        <div className="pd-field">
          <label className="pd-field-label">Harga Belian (RM)</label>
          <input
            type="number"
            placeholder="cth: 1.35"
            value={prodForm.purchase_price}
            onChange={(e) => {
              const harga = parseFloat(e.target.value) || 0;
              const calc = recalcCosts(
                harga,
                parseFloat(prodForm.purchase_qty) || 0,
                prodForm.purchase_unit,
                parseFloat(prodForm.quantity) || 0,
                prodForm.unit
              );
              onChange({
                ...prodForm,
                purchase_price: e.target.value,
                ...calc,
              });
            }}
          />
        </div>

        <div className="pd-field">
          <label className="pd-field-label">Kuantiti Pembelian</label>
          <div className="pd-qty-input-row">
            <input
              type="number"
              placeholder="cth: 1"
              value={prodForm.purchase_qty}
              style={{
                width: 80,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                fontWeight: 600,
                color: "#1e293b",
                fontFamily: "inherit",
              }}
              onChange={(e) => {
                const beliQty = parseFloat(e.target.value) || 0;
                const calc = recalcCosts(
                  parseFloat(prodForm.purchase_price) || 0,
                  beliQty,
                  prodForm.purchase_unit,
                  parseFloat(prodForm.quantity) || 0,
                  prodForm.unit
                );
                onChange({
                  ...prodForm,
                  purchase_qty: e.target.value,
                  ...calc,
                });
              }}
            />
            <div className="pd-pill-group">
              {["unit", "kg", "g", "ml", "l"].map((u) => (
                <button
                  key={u}
                  className={`pd-pill ${
                    prodForm.purchase_unit === u ? "active" : ""
                  }`}
                  onClick={() => {
                    const calc = recalcCosts(
                      parseFloat(prodForm.purchase_price) || 0,
                      parseFloat(prodForm.purchase_qty) || 0,
                      u,
                      parseFloat(prodForm.quantity) || 0,
                      prodForm.unit
                    );
                    onChange({
                      ...prodForm,
                      purchase_unit: u,
                      ...calc,
                    });
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pd-field">
          <label className="pd-field-label">
            Kuantiti Digunakan (untuk batch ini)
          </label>
          <div className="pd-qty-input-row">
            <input
              type="number"
              placeholder="cth: 250"
              value={prodForm.quantity}
              style={{
                width: 80,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                fontWeight: 600,
                color: "#1e293b",
                fontFamily: "inherit",
              }}
              onChange={(e) => {
                const gunaQty = parseFloat(e.target.value) || 0;
                const calc = recalcCosts(
                  parseFloat(prodForm.purchase_price) || 0,
                  parseFloat(prodForm.purchase_qty) || 0,
                  prodForm.purchase_unit,
                  gunaQty,
                  prodForm.unit
                );
                onChange({
                  ...prodForm,
                  quantity: e.target.value,
                  ...calc,
                });
              }}
            />
            <div className="pd-pill-group">
              {["unit", "kg", "g", "ml", "l"].map((u) => (
                <button
                  key={u}
                  className={`pd-pill ${prodForm.unit === u ? "active" : ""}`}
                  onClick={() => {
                    const calc = recalcCosts(
                      parseFloat(prodForm.purchase_price) || 0,
                      parseFloat(prodForm.purchase_qty) || 0,
                      prodForm.purchase_unit,
                      parseFloat(prodForm.quantity) || 0,
                      u
                    );
                    onChange({
                      ...prodForm,
                      unit: u,
                      ...calc,
                    });
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pd-modal-grid">
          <div className="pd-field pd-field-readonly">
            <label className="pd-field-label">Kos/Unit Kecil (Auto)</label>
            <input
              type="text"
              placeholder="0.000000"
              readOnly
              value={
                prodForm.cost_per_unit
                  ? `RM ${parseFloat(prodForm.cost_per_unit).toFixed(6)}`
                  : ""
              }
            />
          </div>
          <div className="pd-field pd-field-readonly">
            <label className="pd-field-label">Jumlah Kos Digunakan (Auto)</label>
            <input
              type="text"
              placeholder="0.0000"
              readOnly
              value={
                prodForm.total_cost
                  ? `RM ${parseFloat(prodForm.total_cost).toFixed(2)}`
                  : ""
              }
            />
          </div>
        </div>

        {prodForm.purchase_price &&
        prodForm.purchase_qty &&
        prodForm.quantity &&
        prodForm.total_cost ? (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 11,
              color: "#15803d",
              lineHeight: 1.8,
            }}
          >
             <strong>Kiraan:</strong>
            <br />
            Kos/unit kecil = RM
            {parseFloat(prodForm.purchase_price).toFixed(2)} ÷{" "}
            {convertToBaseUnit(
              parseFloat(prodForm.purchase_qty) || 0,
              prodForm.purchase_unit
            ).toFixed(0)}
            {getBaseUnitDisplay(prodForm.purchase_unit)} = RM
            {prodForm.cost_per_unit
              ? parseFloat(prodForm.cost_per_unit).toFixed(6)
              : "0"}
            /{getBaseUnitDisplay(prodForm.purchase_unit)}
            <br />
            Kos digunakan = RM
            {prodForm.cost_per_unit
              ? parseFloat(prodForm.cost_per_unit).toFixed(6)
              : "0"} ×{" "}
            {convertToBaseUnit(
              parseFloat(prodForm.quantity) || 0,
              prodForm.unit
            ).toFixed(0)}
            {getBaseUnitDisplay(prodForm.unit)} ={" "}
            <strong>
              RM{prodForm.total_cost ? parseFloat(prodForm.total_cost).toFixed(2) : "0"}
            </strong>
          </div>
        ) : (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 11,
              color: "#92400e",
              lineHeight: 1.6,
            }}
          >
             <strong>Contoh Tepung Gandum:</strong>
            <br />
            Harga belian: RM1.35 · Kuantiti belian: 1 kg (=1000g)
            <br />
            Kuantiti digunakan: 250 g
            <br />
            Kos = RM1.35 ÷ 1000g × 250g = <strong>RM0.34</strong>
          </div>
        )}

        <button
          className="pd-save-btn"
          onClick={onSave}
          disabled={
            addingProd ||
            !prodForm.name ||
            !prodForm.quantity ||
            !prodForm.total_cost ||
            (productions.length === 0 && !prodForm.units_produced)
          }
        >
          {addingProd ? <span className="pd-spinner" /> : "Simpan Bahan"}
        </button>
      </div>
    </div>
  );
}