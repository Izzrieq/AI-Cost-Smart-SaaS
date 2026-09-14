// components/produk/DropshipCostFields.tsx
"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowRightIcon, BoxIcon } from "./Icons";

type Props = {
  supplierCost: string;
  shippingCost: string;
  packagingCost: string;
  onCostChange: (field: string, value: string) => void;
  displayUnit: string;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
};

export default function DropshipCostFields({
  supplierCost,
  shippingCost,
  packagingCost,
  onCostChange,
  displayUnit,
  showAdvanced,
  onToggleAdvanced,
}: Props) {
  return (
    <>
      <div className="tp-dropship-banner">
        <div className="title">
          <BoxIcon />
          Mod Dropship
        </div>
        <div className="desc">
          Anda tidak perlu masukkan bahan mentah, tenaga kerja atau overhead.
          Cukup masukkan <strong>kos dari supplier</strong> dan sistem akan kira margin anda secara automatik.
        </div>
      </div>

      <div className={`tp-form-card tp-delay-3`}>
        <div className="tp-field-label">
          <div className="tp-field-label-dot" />
          Kos Belian dari Supplier <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        </div>
        <div className="tp-input-row">
          <span className="tp-input-prefix">RM</span>
          <input
            type="number"
            className="tp-input"
            placeholder="cth: 25.00"
            value={supplierCost}
            onChange={(e) => onCostChange("supplierCost", e.target.value)}
          />
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap" }}>
            / {displayUnit || "unit"}
          </span>
        </div>
      </div>

      <div className="tp-form-card">
        <button className="tp-advanced-toggle" onClick={onToggleAdvanced}>
          {showAdvanced ? (
            <span style={{ transform: "rotate(180deg)", display: "inline-block" }}>
              <ArrowDownIcon />
            </span>
          ) : (
            <>
              <ArrowRightIcon /> Kos Tambahan (Penghantaran, Pembungkusan)
            </>
          )}
        </button>
        {showAdvanced && (
          <div style={{ marginTop: 10 }}>
            <div className="tp-cost-grid">
              <div>
                <label className="tp-field-label" style={{ fontSize: 9 }}>
                  Kos Penghantaran (RM)
                </label>
                <input
                  type="number"
                  className="tp-input"
                  placeholder="cth: 5.00"
                  style={{
                    padding: "8px 12px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    width: "100%",
                    background: "#fafbfc",
                  }}
                  value={shippingCost}
                  onChange={(e) => onCostChange("shippingCost", e.target.value)}
                />
              </div>
              <div>
                <label className="tp-field-label" style={{ fontSize: 9 }}>
                  Kos Pembungkusan (RM)
                </label>
                <input
                  type="number"
                  className="tp-input"
                  placeholder="cth: 2.00"
                  style={{
                    padding: "8px 12px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    width: "100%",
                    background: "#fafbfc",
                  }}
                  value={packagingCost}
                  onChange={(e) => onCostChange("packagingCost", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}