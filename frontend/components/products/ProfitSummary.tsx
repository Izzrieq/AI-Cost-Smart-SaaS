// components/produk/ProfitSummary.tsx
"use client";

import { WarningIcon } from "./Icons";

type Props = {
  priceVal: number;
  supplierVal: number;
  shippingVal: number;
  packagingVal: number;
  profitVal: number;
  profitMarginPct: number;
};

export default function ProfitSummary({
  priceVal,
  supplierVal,
  shippingVal,
  packagingVal,
  profitVal,
  profitMarginPct,
}: Props) {
  if (priceVal === 0 || (supplierVal === 0 && shippingVal === 0 && packagingVal === 0)) {
    return null;
  }

  return (
    <div className="tp-profit-summary">
      <div className="tp-profit-row">
        <span className="label">Harga Jual</span>
        <span className="value">RM {priceVal.toFixed(2)}</span>
      </div>
      <div className="tp-profit-row">
        <span className="label">Kos Supplier</span>
        <span className="value red">- RM {supplierVal.toFixed(2)}</span>
      </div>
      {shippingVal > 0 && (
        <div className="tp-profit-row">
          <span className="label">Kos Penghantaran</span>
          <span className="value red">- RM {shippingVal.toFixed(2)}</span>
        </div>
      )}
      {packagingVal > 0 && (
        <div className="tp-profit-row">
          <span className="label">Kos Pembungkusan</span>
          <span className="value red">- RM {packagingVal.toFixed(2)}</span>
        </div>
      )}
      <div className="tp-profit-divider" />
      <div className="tp-profit-row">
        <span className="label" style={{ fontWeight: 700 }}>
          Untung Bersih
        </span>
        <span className={`value ${profitVal >= 0 ? "green" : "red"}`}>
          RM {profitVal.toFixed(2)}
          {priceVal > 0 && (
            <span style={{ fontSize: 12, marginLeft: 6, fontWeight: 600 }}>
              ({profitMarginPct.toFixed(1)}%)
            </span>
          )}
        </span>
      </div>
      {profitMarginPct < 10 && profitVal > 0 && (
        <div className="tp-warning-box">
          <WarningIcon />
          <span>
            Margin rendah ({profitMarginPct.toFixed(1)}%). Cuba cari supplier dengan harga lebih rendah atau naikkan harga jual.
          </span>
        </div>
      )}
    </div>
  );
}