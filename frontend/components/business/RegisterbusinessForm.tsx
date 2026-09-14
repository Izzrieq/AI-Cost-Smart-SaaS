// components/business/RegisterBusinessForm.tsx
"use client";

import "@/app/(user)/daftar-perniagaan/daftar-perniagaan.css";

// ─── ICONS ──────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// Business type icons (replace emojis)
const IconHome = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconStore = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const IconDropship = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

type BusinessType = { value: string; label: string; icon: React.ReactNode; desc: string };

const businessTypes: BusinessType[] = [
  { value: "home", label: "Perniagaan Rumah", icon: <IconHome />, desc: "Beroperasi dari rumah" },
  { value: "stall", label: "Gerai / Kedai", icon: <IconStore />, desc: "Gerai atau kedai fizikal" },
  { value: "dropship", label: "Dropship / Online", icon: <IconDropship />, desc: "Perniagaan atas talian" },
];

type RegisterBusinessFormProps = {
  form: { name: string; description: string; type: string };
  loading: boolean;
  error: string;
  onFieldChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export default function RegisterBusinessForm({
  form,
  loading,
  error,
  onFieldChange,
  onSubmit,
  onBack,
}: RegisterBusinessFormProps) {
  return (
    <div className="db-root">
      {/* ── HEADER ── */}
      <div className="db-header">
        <div className="db-header-inner">
          <button className="db-back-btn" onClick={onBack}>
            <IconBack /> Kembali
          </button>
          <div className="db-header-title">Daftar Perniagaan</div>
          <div className="db-header-subtitle">Lengkapkan maklumat perniagaan anda</div>
        </div>
      </div>

      <div className="db-body">
        {/* ── FORM ── */}
        <div className="db-card" style={{ animationDelay: "0.05s" }}>
          {/* Nama Perniagaan */}
          <div className="db-field">
            <label className="db-field-label">Nama Perniagaan</label>
            <input
              type="text"
              placeholder="cth: Kuih Mak Teh"
              value={form.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
            />
          </div>

          {/* Penerangan */}
          <div className="db-field">
            <label className="db-field-label">Penerangan Perniagaan</label>
            <textarea
              placeholder="cth: Menjual pelbagai jenis kuih tradisional..."
              value={form.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {/* Jenis Perniagaan */}
          <label className="db-field-label" style={{ margin: "0 4px 10px 4px" }}>
            Jenis Perniagaan
          </label>
          <div className="db-type-grid">
            {businessTypes.map((type) => {
              const selected = form.type === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => onFieldChange("type", type.value)}
                  className={`db-type-card ${selected ? "active" : ""}`}
                >
                  <div className="db-type-icon">{type.icon}</div>
                  <div className="db-type-label">{type.label}</div>
                  <div className="db-type-desc">{type.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && <div className="db-error">{error}</div>}

          {/* Submit */}
          <button onClick={onSubmit} disabled={loading} className="db-save-btn">
            {loading ? "Mendaftar..." : "Daftar Perniagaan"}
          </button>
        </div>
      </div>
    </div>
  );
}