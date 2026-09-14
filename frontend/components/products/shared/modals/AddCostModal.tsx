// components/produk/shared/modals/AddCostModal.tsx
"use client";

import { IconClose } from "@/components/products/Icons";

interface AddCostModalProps {
  show: boolean;
  tab: string;
  isDropship: boolean;
  supplierCostForm: any;
  costForm: any;
  addingCost: boolean;
  unitsProduced: number;
  onClose: () => void;
  onSupplierChange: (form: any) => void;
  onCostChange: (form: any) => void;
  onSupplierSave: () => void;
  onCostSave: (type: string) => void;
}

export default function AddCostModal({
  show,
  tab,
  isDropship,
  supplierCostForm,
  costForm,
  addingCost,
  unitsProduced,
  onClose,
  onSupplierChange,
  onCostChange,
  onSupplierSave,
  onCostSave,
}: AddCostModalProps) {
  if (!show) return null;

  const getTitle = () => {
    if (tab === "supplier") return "Tambah Kos Supplier";
    if (tab === "tenaga") return "Tambah Tenaga Kerja";
    return "Tambah Utiliti / Overhead";
  };

  return (
    <div className="pd-modal-backdrop" onClick={onClose}>
      <div className="pd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-handle" />
        <div className="pd-modal-title-row">
          <span className="pd-modal-title">{getTitle()}</span>
          <button className="pd-modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        {tab === "supplier" && isDropship ? (
          // ─── SUPPLIER COST FORM ───
          <>
            <div className="pd-field">
              <label className="pd-field-label">Nama Kos Supplier</label>
              <input
                type="text"
                placeholder="cth: Kos Belian dari Supplier"
                value={supplierCostForm.name}
                onChange={(e) =>
                  onSupplierChange({ ...supplierCostForm, name: e.target.value })
                }
              />
            </div>
            <div className="pd-field">
              <label className="pd-field-label">Jenis Kos</label>
              <div className="pd-pill-group">
                <button className="pd-pill active" disabled>
                  Berubah (Variable)
                </button>
              </div>
            </div>
            <div className="pd-field">
              <label className="pd-field-label">⭐ Bilangan Unit Dihasilkan (per batch)</label>
              <input
                type="number"
                placeholder="cth: 10"
                value={supplierCostForm.units_produced}
                onChange={(e) => {
                  const units = e.target.value;
                  onSupplierChange({ ...supplierCostForm, units_produced: units });
                  const costPerUnit = parseFloat(supplierCostForm.cost_per_unit) || 0;
                  if (costPerUnit > 0 && parseFloat(units) > 0) {
                    onSupplierChange({
                      ...supplierCostForm,
                      units_produced: units,
                      total_cost: (costPerUnit * parseFloat(units)).toFixed(2),
                    });
                  }
                }}
              />
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                * Kos supplier untuk 1 batch pengeluaran.
              </div>
            </div>
            <div className="pd-modal-grid">
              <div className="pd-field">
                <label className="pd-field-label">Kos/Unit (RM)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={supplierCostForm.cost_per_unit}
                  onChange={(e) => {
                    const cpu = e.target.value;
                    const units =
                      parseFloat(supplierCostForm.units_produced) || unitsProduced;
                    onSupplierChange({
                      ...supplierCostForm,
                      cost_per_unit: cpu,
                      total_cost: cpu && units ? (parseFloat(cpu) * units).toFixed(2) : "",
                    });
                  }}
                />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Jumlah Kos (RM)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={supplierCostForm.total_cost}
                  onChange={(e) => {
                    const total = e.target.value;
                    const units =
                      parseFloat(supplierCostForm.units_produced) || unitsProduced;
                    onSupplierChange({
                      ...supplierCostForm,
                      total_cost: total,
                      cost_per_unit: total && units ? (parseFloat(total) / units).toFixed(4) : "",
                    });
                  }}
                />
              </div>
            </div>
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 10,
                fontSize: 11,
                color: "#1d4ed8",
                lineHeight: 1.6,
              }}
            >
              💡 Kos supplier akan dikira sebagai <strong>kos berubah</strong>. Sistem akan
              gunakan ini sebagai "bahan" untuk pengiraan margin dropship.
            </div>
            <button
              className="pd-save-btn"
              onClick={onSupplierSave}
              disabled={addingCost}
            >
              {addingCost ? <span className="pd-spinner" /> : "Simpan Kos Supplier"}
            </button>
          </>
        ) : tab === "tenaga" ? (
          // ─── TENAGA KERJA ───
          <>
            <div className="pd-field">
              <label className="pd-field-label">Nama Pekerja / Peranan</label>
              <input
                type="text"
                placeholder="cth: Upah Baker"
                value={costForm.name}
                onChange={(e) => onCostChange({ ...costForm, name: e.target.value })}
              />
            </div>
            <div className="pd-field">
              <label className="pd-field-label">Jenis Kos</label>
              <div className="pd-pill-group">
                {["fixed", "variable"].map((b) => (
                  <button
                    key={b}
                    className={`pd-pill ${costForm.behavior === b ? "active" : ""}`}
                    onClick={() => onCostChange({ ...costForm, behavior: b })}
                  >
                    {b === "fixed" ? "Tetap (Fixed)" : "Berubah (Variable)"}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 10,
                fontSize: 11,
                color: "#1d4ed8",
                lineHeight: 1.6,
              }}
            >
              <strong>Tetap</strong>: RM50 upah baker untuk 1 batch. <strong>Berubah</strong>:
              RM8/jam × bilangan jam.
            </div>
            <div className="pd-modal-grid">
              <div className="pd-field">
                <label className="pd-field-label">Kos/Unit (RM)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={costForm.cost_per_unit}
                  onChange={(e) => {
                    const cpu = e.target.value;
                    onCostChange({ ...costForm, cost_per_unit: cpu, total_cost: cpu });
                  }}
                />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Jumlah Kos (RM)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={costForm.total_cost}
                  onChange={(e) =>
                    onCostChange({ ...costForm, total_cost: e.target.value })
                  }
                />
              </div>
            </div>
            <button
              className="pd-save-btn"
              onClick={() => onCostSave("tenaga")}
              disabled={addingCost}
            >
              {addingCost ? <span className="pd-spinner" /> : "Simpan"}
            </button>
          </>
        ) : (
          // ─── LAIN-LAIN (Overhead) ───
          <>
            <div className="pd-field">
              <label className="pd-field-label">Nama Utiliti / Overhead</label>
              <input
                type="text"
                placeholder="cth: Elektrik, Gas"
                value={costForm.name}
                onChange={(e) => onCostChange({ ...costForm, name: e.target.value })}
              />
            </div>
            <div className="pd-field">
              <label className="pd-field-label">Jenis Kos</label>
              <div className="pd-pill-group">
                {["fixed", "variable"].map((b) => (
                  <button
                    key={b}
                    className={`pd-pill ${costForm.behavior === b ? "active" : ""}`}
                    onClick={() => onCostChange({ ...costForm, behavior: b })}
                  >
                    {b === "fixed" ? "Tetap (Fixed)" : "Berubah (Variable)"}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 10,
                fontSize: 11,
                color: "#1d4ed8",
                lineHeight: 1.6,
              }}
            >
              {isDropship ? (
                <>
                  <strong>Tetap</strong>: Kos tetap bulanan seperti sewa laman web.{" "}
                  <strong>Berubah</strong>: Kos iklan, komisen platform.
                </>
              ) : (
                <>
                  <strong>Tetap</strong>: Sewa RM5/batch. <strong>Berubah</strong>: Gas RM2
                  setiap kali masak.
                </>
              )}
            </div>
            <div className="pd-modal-grid">
              <div className="pd-field">
                <label className="pd-field-label">Kos/Unit (RM)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={costForm.cost_per_unit}
                  onChange={(e) => {
                    const cpu = e.target.value;
                    onCostChange({ ...costForm, cost_per_unit: cpu, total_cost: cpu });
                  }}
                />
              </div>
              <div className="pd-field">
                <label className="pd-field-label">Jumlah Kos (RM)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={costForm.total_cost}
                  onChange={(e) =>
                    onCostChange({ ...costForm, total_cost: e.target.value })
                  }
                />
              </div>
            </div>
            <button
              className="pd-save-btn"
              onClick={() => onCostSave("indirect")}
              disabled={addingCost}
            >
              {addingCost ? <span className="pd-spinner" /> : "Simpan"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}