// components/produk/shared/modals/EditProductionModal.tsx
"use client";

import { IconClose } from "@/components/products/Icons";
import {
  recalcCosts,
  convertToBaseUnit,
  getBaseUnitDisplay,
} from "@/hooks/useProductDetail";

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

interface EditProdForm {
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

interface EditProductionModalProps {
  show: boolean;
  selectedProduction: Production | null;
  editProdForm: EditProdForm;
  savingEdit: boolean;
  deletingItem: boolean;
  onClose: () => void;
  onEditChange: (form: EditProdForm) => void;
  onSave: () => void;
  onDelete: () => void;
}

export default function EditProductionModal({
  show,
  selectedProduction,
  editProdForm,
  savingEdit,
  deletingItem,
  onClose,
  onEditChange,
  onSave,
  onDelete,
}: EditProductionModalProps) {
  if (!show || !selectedProduction) return null;

  return (
    <div className="pd-modal-backdrop" onClick={onClose}>
      <div className="pd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-handle" />
        <div className="pd-modal-title-row">
          <span className="pd-modal-title">Edit Bahan</span>
          <button className="pd-modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <div
          className="pd-field"
          style={{ border: "1.5px solid #bfdbfe", background: "#eff6ff" }}
        >
          <label className="pd-field-label" style={{ color: "#3b82f6" }}>
            ⭐ Bilangan Unit Dihasilkan (per batch)
          </label>
          <input
            type="number"
            placeholder="cth: 10"
            value={editProdForm.units_produced}
            onChange={(e) =>
              onEditChange({ ...editProdForm, units_produced: e.target.value })
            }
          />
        </div>

        <div className="pd-field">
          <label className="pd-field-label">Nama Bahan</label>
          <input
            type="text"
            value={editProdForm.name}
            onChange={(e) =>
              onEditChange({ ...editProdForm, name: e.target.value })
            }
          />
        </div>

        <div className="pd-field">
          <label className="pd-field-label">Tarikh Batch</label>
          <input
            type="date"
            value={editProdForm.batch_date}
            onChange={(e) =>
              onEditChange({ ...editProdForm, batch_date: e.target.value })
            }
          />
        </div>

        <div className="pd-field">
          <label className="pd-field-label">Harga Belian (RM)</label>
          <input
            type="number"
            placeholder="cth: 1.35"
            value={editProdForm.purchase_price}
            onChange={(e) => {
              const harga = parseFloat(e.target.value) || 0;
              const calc = recalcCosts(
                harga,
                parseFloat(editProdForm.purchase_qty) || 0,
                editProdForm.purchase_unit,
                parseFloat(editProdForm.quantity) || 0,
                editProdForm.unit
              );
              onEditChange({
                ...editProdForm,
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
              value={editProdForm.purchase_qty}
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
                  parseFloat(editProdForm.purchase_price) || 0,
                  beliQty,
                  editProdForm.purchase_unit,
                  parseFloat(editProdForm.quantity) || 0,
                  editProdForm.unit
                );
                onEditChange({
                  ...editProdForm,
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
                    editProdForm.purchase_unit === u ? "active" : ""
                  }`}
                  onClick={() => {
                    const calc = recalcCosts(
                      parseFloat(editProdForm.purchase_price) || 0,
                      parseFloat(editProdForm.purchase_qty) || 0,
                      u,
                      parseFloat(editProdForm.quantity) || 0,
                      editProdForm.unit
                    );
                    onEditChange({
                      ...editProdForm,
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
          <label className="pd-field-label">Kuantiti Digunakan &amp; Unit</label>
          <div className="pd-qty-input-row">
            <input
              type="number"
              value={editProdForm.quantity}
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
                const qty = parseFloat(e.target.value) || 0;
                const calc = recalcCosts(
                  parseFloat(editProdForm.purchase_price) || 0,
                  parseFloat(editProdForm.purchase_qty) || 0,
                  editProdForm.purchase_unit,
                  qty,
                  editProdForm.unit
                );
                onEditChange({
                  ...editProdForm,
                  quantity: e.target.value,
                  ...calc,
                });
              }}
            />
            <div className="pd-pill-group">
              {["unit", "kg", "g", "ml", "l"].map((u) => (
                <button
                  key={u}
                  className={`pd-pill ${
                    editProdForm.unit === u ? "active" : ""
                  }`}
                  onClick={() => {
                    const calc = recalcCosts(
                      parseFloat(editProdForm.purchase_price) || 0,
                      parseFloat(editProdForm.purchase_qty) || 0,
                      editProdForm.purchase_unit,
                      parseFloat(editProdForm.quantity) || 0,
                      u
                    );
                    onEditChange({
                      ...editProdForm,
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
                editProdForm.cost_per_unit
                  ? `RM ${parseFloat(editProdForm.cost_per_unit).toFixed(6)}`
                  : ""
              }
            />
          </div>
          <div className="pd-field pd-field-readonly">
            <label className="pd-field-label">Jumlah Kos (Auto)</label>
            <input
              type="text"
              placeholder="0.0000"
              readOnly
              value={
                editProdForm.total_cost
                  ? `RM ${parseFloat(editProdForm.total_cost).toFixed(2)}`
                  : ""
              }
            />
          </div>
        </div>

        {editProdForm.purchase_price &&
        editProdForm.purchase_qty &&
        editProdForm.quantity &&
        editProdForm.total_cost && (
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
            ✅ <strong>Kiraan:</strong>
            <br />
            Kos/unit kecil = RM
            {parseFloat(editProdForm.purchase_price).toFixed(2)} ÷{" "}
            {convertToBaseUnit(
              parseFloat(editProdForm.purchase_qty) || 0,
              editProdForm.purchase_unit
            ).toFixed(0)}
            {getBaseUnitDisplay(editProdForm.purchase_unit)} = RM
            {editProdForm.cost_per_unit
              ? parseFloat(editProdForm.cost_per_unit).toFixed(6)
              : "0"}
            /{getBaseUnitDisplay(editProdForm.purchase_unit)}
            <br />
            Kos digunakan = RM
            {editProdForm.cost_per_unit
              ? parseFloat(editProdForm.cost_per_unit).toFixed(6)
              : "0"} ×{" "}
            {convertToBaseUnit(
              parseFloat(editProdForm.quantity) || 0,
              editProdForm.unit
            ).toFixed(0)}
            {getBaseUnitDisplay(editProdForm.unit)} ={" "}
            <strong>
              RM{editProdForm.total_cost ? parseFloat(editProdForm.total_cost).toFixed(2) : "0"}
            </strong>
          </div>
        )}

        <button
          className="pd-save-btn"
          onClick={onSave}
          disabled={savingEdit}
        >
          {savingEdit ? <span className="pd-spinner" /> : "Simpan Perubahan"}
        </button>

        <button
          className="pd-delete-danger-btn"
          onClick={onDelete}
          disabled={deletingItem}
        >
          {deletingItem ? "Memadamkan..." : "Padam Bahan Ini"}
        </button>
      </div>
    </div>
  );
}