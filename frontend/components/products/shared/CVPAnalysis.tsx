// components/produk/shared/CVPAnalysis.tsx
"use client";

import { IconTarget, IconShield } from "@/components/products/Icons";

// ─── TYPES ──────────────────────────────────────────────────────────────
interface CVPData {
  totalBatchCost: number;
  netProfitMarginPct: number;
  cmRatio: number;
  variableCostPerUnit: number;
  cmPerUnit: number;
  minSellingPrice: number;
  bepRevenue: number;
  costPerUnitTotal: number;
  safetyMarginPct: number;
  safetyMarginUnits: number;
  netProfitBatch: number;
  totalFixedCost: number;
  totalVariableCost: number;
}

interface CVPAnalysisProps {
  cvp: CVPData;
  unitsProduced: number;
  sellingPrice: number;
  isDropship: boolean;
  bepUnitsCeil: number | "Infinity";
  bepBarFill: number;
}

// ─── ICONS (inline SVGs to replace emojis) ─────────────────────────────
const IconChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2" />
    <circle cx="12" cy="16" r="5" />
    <path d="M12 11v5" />
    <path d="M9 13l3 3 3-3" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
);

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function CVPAnalysis({
  cvp,
  unitsProduced,
  sellingPrice,
  isDropship,
  bepUnitsCeil,
  bepBarFill,
}: CVPAnalysisProps) {
  if (cvp.totalBatchCost === 0) {
    return (
      <div className="pd-cvp">
        <div className="pd-cvp-header">
          <div className="pd-cvp-title">
            <IconChart /> Analisis CVP {isDropship && "(Dropship)"}
          </div>
          <div className="pd-cvp-sub">
            Berdasarkan {unitsProduced} unit dihasilkan · Harga jual RM {sellingPrice.toFixed(2)}/unit
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 12 }}>
          {isDropship
            ? "Tambah kos supplier, tenaga kerja dan lain-lain dahulu untuk lihat pengiraan CVP."
            : "Tambah bahan, tenaga kerja dan lain-lain dahulu untuk lihat pengiraan CVP."}
        </div>
      </div>
    );
  }

  const bepRevDisplay = cvp.bepRevenue === Infinity ? "N/A" : `RM ${cvp.bepRevenue.toFixed(2)}`;

  return (
    <div className="pd-cvp">
      <div className="pd-cvp-header">
        <div className="pd-cvp-title">
          <IconChart /> Analisis CVP {isDropship && "(Dropship)"}
        </div>
        <div className="pd-cvp-sub">
          Berdasarkan {unitsProduced} unit dihasilkan · Harga jual RM {sellingPrice.toFixed(2)}/unit
        </div>
      </div>

      <div className="pd-section-divider">
        <div className="pd-section-divider-line" />
        <div className="pd-section-divider-label">Margin &amp; Sumbangan</div>
        <div className="pd-section-divider-line" />
      </div>

      <div className="pd-kpi-grid">
        <div
          className={`pd-kpi ${
            cvp.netProfitMarginPct >= 30 ? "green" : cvp.netProfitMarginPct >= 10 ? "amber" : "red"
          }`}
        >
          <div className="pd-kpi-label">Margin Untung Bersih</div>
          <div className="pd-kpi-val">{cvp.netProfitMarginPct.toFixed(1)}%</div>
          <div className="pd-kpi-sub">(SP − kos/unit) ÷ SP</div>
        </div>
        <div
          className={`pd-kpi ${
            cvp.cmRatio >= 30 ? "green" : cvp.cmRatio >= 15 ? "amber" : "red"
          }`}
        >
          <div className="pd-kpi-label">CM Ratio</div>
          <div className="pd-kpi-val">{cvp.cmRatio.toFixed(1)}%</div>
          <div className="pd-kpi-sub">CM/unit ÷ harga jual</div>
        </div>
        <div className="pd-kpi blue">
          <div className="pd-kpi-label">Kos Berubah/Unit</div>
          <div className="pd-kpi-val">RM {cvp.variableCostPerUnit.toFixed(2)}</div>
          <div className="pd-kpi-sub">{isDropship ? "supplier + kos berubah" : "bahan + kos berubah"}</div>
        </div>
        <div className={`pd-kpi ${cvp.cmPerUnit >= 0 ? "green" : "red"}`}>
          <div className="pd-kpi-label">CM / Unit</div>
          <div className="pd-kpi-val">RM {cvp.cmPerUnit.toFixed(2)}</div>
          <div className="pd-kpi-sub">SP − kos berubah/unit</div>
        </div>
      </div>

      <div className="pd-section-divider">
        <div className="pd-section-divider-line" />
        <div className="pd-section-divider-label">Titik Pulang Modal (BEP)</div>
        <div className="pd-section-divider-line" />
      </div>

      <div className="pd-bep-card">
        <div className="pd-bep-header">
          <div className="pd-bep-header-icon">
            <IconTarget />
          </div>
          <div>
            <div className="pd-bep-title">Break-Even Point</div>
            <div className="pd-bep-subtitle">Angka minimum untuk tidak rugi</div>
          </div>
        </div>
        <div className="pd-bep-grid">
          <div className="pd-bep-kpi highlight">
            <div className="pd-bep-kpi-label">Harga Minimum Jual</div>
            <div className="pd-bep-kpi-val">RM {cvp.minSellingPrice.toFixed(2)}</div>
            <div className="pd-bep-kpi-sub">kos batch ÷ {unitsProduced} unit</div>
          </div>
          <div className="pd-bep-kpi highlight">
            <div className="pd-bep-kpi-label">Unit Minimum Jual</div>
            <div className="pd-bep-kpi-val">
              {bepUnitsCeil === Infinity ? "N/A" : `${bepUnitsCeil} unit`}
            </div>
            <div className="pd-bep-kpi-sub">dari {unitsProduced} unit batch</div>
          </div>
          <div className="pd-bep-kpi">
            <div className="pd-bep-kpi-label">Hasil Jualan BEP</div>
            <div className="pd-bep-kpi-val" style={{ fontSize: 13 }}>
              {bepRevDisplay}
            </div>
            <div className="pd-bep-kpi-sub">
              {bepUnitsCeil !== Infinity
                ? `${bepUnitsCeil} unit × RM ${sellingPrice.toFixed(2)}`
                : "—"}
            </div>
          </div>
          <div className="pd-bep-kpi">
            <div className="pd-bep-kpi-label">Kos Seunit (Total)</div>
            <div className="pd-bep-kpi-val" style={{ fontSize: 13 }}>
              RM {cvp.costPerUnitTotal.toFixed(2)}
            </div>
            <div className="pd-bep-kpi-sub">kos batch ÷ {unitsProduced} unit</div>
          </div>
        </div>

        {bepUnitsCeil !== Infinity && (
          <div className="pd-safety-card">
            <div className="pd-safety-header">
              <div className="pd-safety-label">
                <IconShield />
                <span>Margin Keselamatan</span>
              </div>
              <div className="pd-safety-pct">
                {cvp.safetyMarginPct.toFixed(1)}% ({cvp.safetyMarginUnits} unit buffer)
              </div>
            </div>
            <div className="pd-safety-bar-track">
              <div className="pd-safety-bar-bep" style={{ width: `${bepBarFill}%` }} />
              <div
                className="pd-safety-bar-safe"
                style={{
                  left: `${bepBarFill}%`,
                  width: `${Math.max(0, 100 - bepBarFill)}%`,
                }}
              />
            </div>
            <div className="pd-safety-legend">
              <div className="pd-safety-legend-item">
                <div className="pd-safety-legend-dot" style={{ background: "#ef4444" }} />
                BEP: {bepUnitsCeil} unit
              </div>
              <div className="pd-safety-legend-item">
                <div className="pd-safety-legend-dot" style={{ background: "#22c55e" }} />
                Selamat: {cvp.safetyMarginUnits} unit
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pd-cost-info-row">
        <strong>Kos Tetap/Batch:</strong> RM {cvp.totalFixedCost.toFixed(2)}&nbsp;&nbsp;·&nbsp;&nbsp;
        <strong>Kos Berubah Total:</strong> RM {cvp.totalVariableCost.toFixed(2)}&nbsp;&nbsp;·&nbsp;&nbsp;
        <strong>Jumlah Kos Batch:</strong> RM {cvp.totalBatchCost.toFixed(2)}
      </div>

      {sellingPrice > 0 && (
        <div className={`pd-profit-banner ${cvp.netProfitBatch >= 0 ? "profit" : "loss"}`}>
          <div className="pd-profit-banner-icon">
            {cvp.netProfitBatch >= 0 ? <IconCheckCircle /> : <IconAlertTriangle />}
          </div>
          <div>
            <div className="pd-profit-banner-title">
              {cvp.netProfitBatch >= 0
                ? `Untung batch: RM ${cvp.netProfitBatch.toFixed(2)}`
                : `Rugi batch: RM ${Math.abs(cvp.netProfitBatch).toFixed(2)}`}
            </div>
            <div className="pd-profit-banner-desc">
              {cvp.netProfitBatch >= 0
                ? `RM ${cvp.cmPerUnit.toFixed(2)} CM/unit × ${unitsProduced} unit − RM ${cvp.totalFixedCost.toFixed(2)} kos tetap`
                : `Naikkan harga melebihi RM ${cvp.minSellingPrice.toFixed(2)}/unit atau jual lebih dari ${
                    bepUnitsCeil === Infinity ? "N/A" : bepUnitsCeil
                  } unit.`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}