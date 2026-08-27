"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

const businessTypes = [
  { value: "home", label: "Perniagaan Rumah", icon: "🏠", desc: "Beroperasi dari rumah" },
  { value: "stall", label: "Gerai / Kedai", icon: "🏪", desc: "Gerai atau kedai fizikal" },
  { value: "dropship", label: "Dropship / Online", icon: "📦", desc: "Perniagaan atas talian" },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export default function DaftarPerniagaanPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.type) {
      setError("Sila lengkapkan semua maklumat.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/business`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Ralat berlaku. Cuba lagi.");
        return;
      }

      router.push("/home");
    } catch (err) {
      setError("Tidak dapat sambung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .db-root { min-height: 100vh; background: #f5f7fa; font-family: 'Plus Jakarta Sans', sans-serif; padding-bottom: 60px; }
        .db-header { background: linear-gradient(145deg, #1a56db, #3b82f6); padding: 52px 20px 72px; position: relative; overflow: hidden; }
        .db-header::before { content:''; position:absolute; top:-60px; right:-40px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.06); }
        .db-header::after  { content:''; position:absolute; bottom:-50px; left:-30px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.04); }
        .db-header-inner { position:relative; z-index:1; }

        .db-back-btn { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.16); border:1.5px solid rgba(255,255,255,0.24); backdrop-filter:blur(8px); color:#fff; font-size:13px; font-weight:600; padding:8px 14px; border-radius:99px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:background 0.2s; margin-bottom:16px; }
        .db-back-btn:hover { background:rgba(255,255,255,0.24); }

        .db-header-title { font-size:22px; font-weight:800; color:#fff; letter-spacing:-0.03em; }
        .db-header-subtitle { font-size:13px; color:rgba(255,255,255,0.65); margin-top:3px; font-weight:500; }

        .db-body { margin-top:-36px; padding:0 16px; position:relative; z-index:10; }

        .db-card { background:#fff; border-radius:20px; border:1px solid #f1f5f9; box-shadow:0 2px 8px rgba(0,0,0,0.04); padding:14px 16px; margin-bottom:14px; animation:fadeUp 0.35s ease both; }

        .db-field { background:#f8fafc; border:1.5px solid #f1f5f9; border-radius:14px; padding:12px 14px; margin-bottom:10px; transition:border-color 0.2s; }
        .db-field:focus-within { border-color:#93c5fd; background:#fff; }
        .db-field-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:5px; display:block; }
        .db-field input { width:100%; font-size:14px; font-weight:600; color:#1e293b; background:transparent; border:none; outline:none; font-family:'Plus Jakarta Sans',sans-serif; }
        .db-field input::placeholder { color:#c4cdd6; font-weight:400; }
        .db-field textarea { width:100%; font-size:14px; font-weight:600; color:#1e293b; background:transparent; border:none; outline:none; font-family:'Plus Jakarta Sans',sans-serif; resize:none; }
        .db-field textarea::placeholder { color:#c4cdd6; font-weight:400; }

        .db-field-readonly { background:#f1f5f9 !important; }
        .db-field-readonly input { color:#94a3b8 !important; cursor:not-allowed; }

        .db-pill-group { display:flex; gap:6px; flex-wrap:wrap; }
        .db-pill { padding:6px 12px; border-radius:99px; font-size:11px; font-weight:700; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; }
        .db-pill.active { background:#1a56db; color:#fff; border-color:transparent; }

        .db-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

        .db-save-btn { width:100%; padding:14px; background:linear-gradient(135deg,#1a56db,#3b82f6); border:none; border-radius:14px; color:#fff; font-size:14px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; box-shadow:0 3px 10px rgba(37,99,235,0.3); margin-bottom:10px; transition:opacity 0.15s; }
        .db-save-btn:disabled { opacity:0.55; pointer-events:none; }

        .db-error { padding:12px 14px; background:#fef2f2; border:1px solid #fecaca; border-radius:14px; color:#dc2626; font-size:13px; font-weight:500; margin-bottom:14px; }

        .db-type-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        .db-type-card { border-radius:16px; border:2px solid #f1f5f9; padding:14px 14px; cursor:pointer; transition:all 0.15s; background:#fff; }
        .db-type-card.active { border-color:#2563eb; background:#eff6ff; }
        .db-type-card:hover { border-color:#93c5fd; }
        .db-type-icon { font-size:24px; margin-bottom:6px; }
        .db-type-label { font-size:13px; font-weight:700; color:#1e293b; }
        .db-type-card.active .db-type-label { color:#2563eb; }
        .db-type-desc { font-size:11px; color:#94a3b8; margin-top:2px; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="db-root">

        {/* ── HEADER ── */}
        <div className="db-header">
          <div className="db-header-inner">
            <button className="db-back-btn" onClick={() => router.back()}>
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Penerangan */}
            <div className="db-field">
              <label className="db-field-label">Penerangan Perniagaan</label>
              <textarea
                placeholder="cth: Menjual pelbagai jenis kuih tradisional..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                    onClick={() => setForm({ ...form, type: type.value })}
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
            {error && (
              <div className="db-error">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="db-save-btn"
            >
              {loading ? "Mendaftar..." : "Daftar Perniagaan"}
            </button>

          </div>

        </div>
      </div>
    </>
  );
}