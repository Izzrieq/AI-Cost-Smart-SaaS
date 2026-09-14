// components/produk/shared/modals/EditPriceModal.tsx
"use client";

import { IconClose } from "@/components/products/Icons";

// ─── TYPES ──────────────────────────────────────────────────────────────
interface CVPData {
  totalBatchCost: number;
  minSellingPrice: number;
}

interface EditPriceModalProps {
  show: boolean;
  tempPrice: number;
  updatingPrice: boolean;
  cvp: CVPData;
  onClose: () => void;
  onChange: (value: number) => void;
  onSave: () => void;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function EditPriceModal({
  show,
  tempPrice,
  updatingPrice,
  cvp,
  onClose,
  onChange,
  onSave,
}: EditPriceModalProps) {
  if (!show) return null;

  return (
    <div className="pd-modal-backdrop" onClick={onClose}>
      <div className="pd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-handle" />
        <div className="pd-modal-title-row">
          <span className="pd-modal-title">Edit Harga Jual</span>
          <button className="pd-modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        {cvp.totalBatchCost > 0 && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 11,
              color: "#1d4ed8",
              lineHeight: 1.6,
            }}
          >
            💡 Harga minimum berdasarkan kos semasa:{" "}
            <strong>RM {cvp.minSellingPrice.toFixed(2)}/unit</strong>
          </div>
        )}
        <div className="pd-field">
          <label className="pd-field-label">Harga Jual (RM / unit)</label>
          <input
            type="number"
            placeholder="0.00"
            value={tempPrice}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            step="0.01"
            min="0"
          />
        </div>
        <button className="pd-save-btn" onClick={onSave} disabled={updatingPrice}>
          {updatingPrice ? <span className="pd-spinner" /> : "Simpan Harga"}
        </button>
      </div>
    </div>
  );
}