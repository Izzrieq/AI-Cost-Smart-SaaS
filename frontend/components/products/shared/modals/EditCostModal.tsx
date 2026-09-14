// components/produk/shared/modals/EditCostModal.tsx
"use client";

import { IconClose } from "@/components/products/Icons";

interface EditCostModalProps {
  show: boolean;
  selectedCost: any;
  editCostForm: any;
  savingEdit: boolean;
  deletingItem: boolean;
  onClose: () => void;
  onEditChange: (form: any) => void;
  onSave: () => void;
  onDelete: () => void;
}

export default function EditCostModal({
  show,
  selectedCost,
  editCostForm,
  savingEdit,
  deletingItem,
  onClose,
  onEditChange,
  onSave,
  onDelete,
}: EditCostModalProps) {
  if (!show || !selectedCost) return null;

  const getTitle = () => {
    if (selectedCost.cost_category === "supplier") return "Edit Kos Supplier";
    if (selectedCost.type === "tenaga") return "Edit Tenaga Kerja";
    return "Edit Utiliti";
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

        <div className="pd-field">
          <label className="pd-field-label">Nama</label>
          <input
            type="text"
            value={editCostForm.name}
            onChange={(e) => onEditChange({ ...editCostForm, name: e.target.value })}
          />
        </div>

        <div className="pd-field">
          <label className="pd-field-label">Jenis Kos</label>
          <div className="pd-pill-group">
            {["fixed", "variable"].map((b) => (
              <button
                key={b}
                className={`pd-pill ${editCostForm.behavior === b ? "active" : ""}`}
                onClick={() => onEditChange({ ...editCostForm, behavior: b })}
              >
                {b === "fixed" ? "Tetap (Fixed)" : "Berubah (Variable)"}
              </button>
            ))}
          </div>
        </div>

        <div className="pd-modal-grid">
          <div className="pd-field">
            <label className="pd-field-label">Kos/Unit (RM)</label>
            <input
              type="number"
              value={editCostForm.cost_per_unit}
              onChange={(e) => {
                const cpu = e.target.value;
                onEditChange({ ...editCostForm, cost_per_unit: cpu, total_cost: cpu });
              }}
            />
          </div>
          <div className="pd-field">
            <label className="pd-field-label">Jumlah Kos (RM)</label>
            <input
              type="number"
              value={editCostForm.total_cost}
              onChange={(e) =>
                onEditChange({ ...editCostForm, total_cost: e.target.value })
              }
            />
          </div>
        </div>

        <button className="pd-save-btn" onClick={onSave} disabled={savingEdit}>
          {savingEdit ? <span className="pd-spinner" /> : "Simpan Perubahan"}
        </button>

        <button
          className="pd-delete-danger-btn"
          onClick={onDelete}
          disabled={deletingItem}
        >
          {deletingItem ? "Memadamkan..." : "Padam"}
        </button>
      </div>
    </div>
  );
}