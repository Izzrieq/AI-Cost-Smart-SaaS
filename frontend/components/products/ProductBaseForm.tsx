// components/produk/ProductBaseForm.tsx
"use client";

import { SALE_UNIT_OPTIONS } from "./constants";

type Props = {
  form: { name: string; description: string; selling_price: string; sale_unit: string; custom_sale_unit: string };
  focusedField: string | null;
  onFieldChange: (field: string, value: string) => void;
  onFocus: (field: string | null) => void;
  onNameBlur: () => void;
  displayUnit: string;
  priceVal: number;
  isDropship: boolean;
};

export default function ProductBaseForm({
  form,
  focusedField,
  onFieldChange,
  onFocus,
  onNameBlur,
  displayUnit,
  priceVal,
  isDropship,
}: Props) {
  return (
    <>
      {/* Nama Produk */}
      <div className={`tp-form-card tp-delay-1 ${focusedField === "name" ? "focused" : ""}`}>
        <div className="tp-field-label">
          <div className="tp-field-label-dot" />
          Nama Produk <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        </div>
        <div className="tp-input-row">
          <input
            type="text"
            className="tp-input"
            placeholder="cth: Ayam Gunting Berempah"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            onFocus={() => onFocus("name")}
            onBlur={onNameBlur}
          />
        </div>
      </div>

      {/* Penerangan */}
      <div className={`tp-form-card tp-delay-2 ${focusedField === "desc" ? "focused" : ""}`}>
        <div className="tp-field-label">
          <div className="tp-field-label-dot" />
          Penerangan <span style={{ fontSize: 9, color: "#cbd5e1", marginLeft: 4 }}>PILIHAN</span>
        </div>
        <textarea
          className="tp-textarea"
          placeholder="cth: Ayam goreng berempah dengan resepi rahsia..."
          value={form.description}
          rows={3}
          onChange={(e) => onFieldChange("description", e.target.value)}
          onFocus={() => onFocus("desc")}
          onBlur={() => onFocus(null)}
        />
      </div>

      {/* Unit Jualan (only for non-dropship, but we still show it for dropship to set the unit) */}
      {!isDropship && (
        <div
          className={`tp-form-card tp-delay-3 ${focusedField === "unit" ? "focused" : ""}`}
          onFocus={() => onFocus("unit")}
          onBlur={() => onFocus(null)}
        >
          <div className="tp-field-label">
            <div className="tp-field-label-dot" />
            Unit Jualan <span style={{ fontSize: 9, color: "#cbd5e1", marginLeft: 4 }}>PILIHAN</span>
          </div>
          <div className="tp-unit-grid">
            {SALE_UNIT_OPTIONS.map((unit) => {
              const isActive = form.sale_unit === unit && !form.custom_sale_unit.trim();
              return (
                <button
                  key={unit}
                  type="button"
                  className={`tp-unit-pill ${isActive ? "active" : ""}`}
                  onClick={() => {
                    onFieldChange("sale_unit", unit);
                    onFieldChange("custom_sale_unit", "");
                  }}
                >
                  {unit}
                </button>
              );
            })}
            <button
              type="button"
              className={`tp-unit-pill custom ${form.custom_sale_unit.trim() ? "active" : ""}`}
              onClick={() => {
                onFieldChange("sale_unit", "Custom");
                document.getElementById("customUnitInput")?.focus();
              }}
            >
              ✏️ Custom
            </button>
          </div>
          <input
            id="customUnitInput"
            className="tp-unit-custom-input"
            placeholder="cth: Loyang, Paket, Bekas..."
            value={form.custom_sale_unit}
            onChange={(e) => {
              onFieldChange("custom_sale_unit", e.target.value);
              onFieldChange("sale_unit", "Custom");
            }}
          />
          <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
            Contoh: &quot;Slice&quot; = harga per potong, &quot;Whole&quot; = harga sekeping/loyang
          </div>
        </div>
      )}

      {/* Harga Jual */}
      <div className={`tp-form-card tp-delay-4 ${focusedField === "price" ? "focused" : ""}`}>
        <div className="tp-field-label">
          <div className="tp-field-label-dot" />
          Harga Jual <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        </div>
        <div className="tp-input-row">
          <span className="tp-input-prefix">RM</span>
          <input
            type="number"
            className="tp-input"
            placeholder="0.00"
            value={form.selling_price}
            onChange={(e) => onFieldChange("selling_price", e.target.value)}
            onFocus={() => onFocus("price")}
            onBlur={() => onFocus(null)}
          />
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap" }}>
            / {displayUnit || "unit"}
          </span>
        </div>
        {priceVal > 0 && !isDropship && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
            Margin akan dikira selepas kos dimasukkan di halaman seterusnya.
          </div>
        )}
      </div>
    </>
  );
}