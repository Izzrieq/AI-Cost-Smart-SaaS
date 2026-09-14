// components/produk/shared/RingkasanKos.tsx
"use client";

// ─── TYPES ──────────────────────────────────────────────────────────────
interface CVPData {
  totalBatchCost: number;
  variableCostPerUnit: number;
  totalFixedCost: number;
  costPerUnitTotal: number;
  minSellingPrice: number;
}

interface RingkasanKosProps {
  isDropship: boolean;
  bahanTotal: number;
  tenagaTotal: number;
  lainTotal: number;
  cvp: CVPData;
  unitsProduced: number;
}

// ─── ICON (replaces emoji) ─────────────────────────────────────────────
const IconPrice = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function RingkasanKos({
  isDropship,
  bahanTotal,
  tenagaTotal,
  lainTotal,
  cvp,
  unitsProduced,
}: RingkasanKosProps) {
  return (
    <div className="pd-ringkasan">
      <div className="pd-ringkasan-title">Ringkasan Kos Batch</div>

      <div className="pd-cost-row">
        <span className="pd-cost-row-label">
          {isDropship ? "Kos Supplier" : "Bahan Mentah"}
        </span>
        <span className="pd-cost-row-val">RM {bahanTotal.toFixed(2)}</span>
      </div>

      <div className="pd-cost-row">
        <span className="pd-cost-row-label">Tenaga Kerja</span>
        <span className="pd-cost-row-val">RM {tenagaTotal.toFixed(2)}</span>
      </div>

      <div className="pd-cost-row">
        <span className="pd-cost-row-label">Overhead / Lain-Lain</span>
        <span className="pd-cost-row-val">RM {lainTotal.toFixed(2)}</span>
      </div>

      <div className="pd-cost-divider" />

      <div className="pd-cost-row">
        <span className="pd-cost-row-label" style={{ fontWeight: 700, color: "#1e293b" }}>
          Total Kos Batch
        </span>
        <span className="pd-cost-row-val" style={{ fontSize: 14, color: "#1e293b" }}>
          RM {cvp.totalBatchCost.toFixed(2)}
        </span>
      </div>

      <div className="pd-cost-row">
        <span className="pd-cost-row-label">
          Kos Berubah / Unit ({unitsProduced} unit)
        </span>
        <span className="pd-cost-row-val">
          RM {cvp.variableCostPerUnit.toFixed(2)}
        </span>
      </div>

      <div className="pd-cost-row">
        <span className="pd-cost-row-label">Kos Tetap / Batch</span>
        <span className="pd-cost-row-val">
          RM {cvp.totalFixedCost.toFixed(2)}
        </span>
      </div>

      <div className="pd-cost-row">
        <span className="pd-cost-row-label" style={{ fontWeight: 600, color: "#334155" }}>
          Kos Seunit (Total)
        </span>
        <span className="pd-cost-row-val" style={{ color: "#334155" }}>
          RM {cvp.costPerUnitTotal.toFixed(2)}
        </span>
      </div>

      <div className="pd-cost-divider" />

      <div className="pd-cost-total-row">
        <span className="pd-cost-total-label">
          <IconPrice /> Harga Minimum Jual
        </span>
        <span className="pd-cost-total-val">
          RM {cvp.minSellingPrice.toFixed(2)} / unit
        </span>
      </div>
    </div>
  );
}