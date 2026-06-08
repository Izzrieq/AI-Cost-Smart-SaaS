"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { matchFoodImage } from "@/lib/foodImages";

export default function TambahProdukPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    selling_price: "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fetchImage = (name: string) => {
    if (!name.trim()) return;
    setImageUrl(matchFoodImage(name));
  };

  const handleNameBlur = () => {
    setFocusedField(null);
    if (form.name.trim()) fetchImage(form.name);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.selling_price) {
      setError("Sila lengkapkan nama produk dan harga jual.");
      return;
    }
    if (parseFloat(form.selling_price) <= 0) {
      setError("Harga jual mesti lebih daripada RM 0.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name:          form.name,
          description:   form.description,
          selling_price: parseFloat(form.selling_price),
          // margin_percentage intentionally NOT sent — auto-calculated from costs
          image_url:     imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      setSuccess(true);
      setTimeout(() => router.push("/produk"), 1200);
    } catch {
      setError("Tidak dapat sambung ke server.");
    } finally {
      setLoading(false);
    }
  };

  const priceVal = parseFloat(form.selling_price) || 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .tp-root {
          min-height: 100vh;
          background: #f5f7fa;
          padding-bottom: 40px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ── HEADER ── */
        .tp-header {
          background: linear-gradient(145deg, #1a56db 0%, #2563eb 60%, #3b82f6 100%);
          padding: 52px 20px 72px;
          position: relative;
          overflow: hidden;
        }
        .tp-header::before {
          content: '';
          position: absolute;
          top: -50px; right: -50px;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .tp-header::after {
          content: '';
          position: absolute;
          bottom: -40px; left: -30px;
          width: 140px; height: 140px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .tp-header-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
          position: relative;
          z-index: 1;
        }

        .tp-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          border-radius: 12px;
          background: rgba(255,255,255,0.16);
          border: 1.5px solid rgba(255,255,255,0.24);
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          flex-shrink: 0;
        }
        .tp-back-btn:hover { background: rgba(255,255,255,0.26); }
        .tp-back-btn:active { transform: scale(0.92); }

        .tp-header-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
        }
        .tp-header-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          margin-top: 2px;
          font-weight: 500;
        }

        /* Live preview pill in header */
        .tp-preview-pill {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tp-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(8px);
          border-radius: 99px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.01em;
        }

        /* ── BODY ── */
        .tp-body {
          margin-top: -36px;
          padding: 0 16px;
          position: relative;
          z-index: 10;
        }

        /* ── IMAGE CARD ── */
        .tp-img-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          margin-bottom: 12px;
          animation: fadeUp 0.35s ease both;
        }
        .tp-img-area {
          width: 100%;
          height: 160px;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
        }
        .tp-img-area img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s ease;
        }
        .tp-img-card:hover .tp-img-area img { transform: scale(1.03); }
        .tp-img-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
        }
        .tp-img-badge {
          position: absolute;
          top: 10px; left: 10px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px);
          border-radius: 8px;
          padding: 3px 9px;
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .tp-img-placeholder {
          width: 100%; height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .tp-img-placeholder-icon {
          width: 44px; height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          display: flex; align-items: center; justify-content: center;
        }
        .tp-img-placeholder p {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
          text-align: center;
          line-height: 1.4;
        }
        .tp-img-footer {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tp-img-footer-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .tp-refresh-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: #eff6ff;
          border: none;
          border-radius: 99px;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: background 0.2s, transform 0.15s;
        }
        .tp-refresh-btn:hover { background: #dbeafe; }
        .tp-refresh-btn:active { transform: scale(0.95); }

        /* ── INFO BANNER ── */
        .tp-info-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 12px 14px;
          margin-bottom: 12px;
          animation: fadeUp 0.3s ease both;
        }
        .tp-info-icon {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #dbeafe;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .tp-info-text {
          font-size: 12px;
          font-weight: 500;
          color: #1d4ed8;
          line-height: 1.6;
        }
        .tp-info-text strong { font-weight: 700; }

        /* ── FORM CARDS ── */
        .tp-form-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          padding: 14px 16px;
          margin-bottom: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
          animation: fadeUp 0.35s ease both;
        }
        .tp-form-card.focused {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.07), 0 2px 10px rgba(0,0,0,0.04);
        }

        .tp-field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }
        .tp-field-label-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #e2e8f0;
          flex-shrink: 0;
        }
        .tp-form-card.focused .tp-field-label { color: #3b82f6; }
        .tp-form-card.focused .tp-field-label-dot { background: #3b82f6; }

        .tp-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tp-input-prefix {
          font-size: 13px;
          font-weight: 700;
          color: #cbd5e1;
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .tp-form-card.focused .tp-input-prefix { color: #93c5fd; }

        .tp-input {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .tp-input::placeholder { color: #cbd5e1; font-weight: 400; }

        .tp-textarea {
          width: 100%;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          line-height: 1.6;
        }
        .tp-textarea::placeholder { color: #cbd5e1; font-weight: 400; }

        /* ── NEXT STEPS CARD ── */
        .tp-steps-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          padding: 14px 16px;
          margin-bottom: 12px;
          animation: fadeUp 0.35s 0.1s ease both;
        }
        .tp-steps-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
        }
        .tp-step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .tp-step-item:last-child { margin-bottom: 0; }
        .tp-step-num {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a56db, #3b82f6);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
        }
        .tp-step-label { font-size: 12px; font-weight: 600; color: #475569; }
        .tp-step-sub { font-size: 11px; color: #94a3b8; margin-top: 1px; }

        /* ── ERROR ── */
        .tp-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 16px;
          padding: 12px 14px;
          margin-bottom: 12px;
          animation: shake 0.4s ease both, fadeUp 0.3s ease both;
        }
        .tp-error-icon {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #fee2e2;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tp-error-text { font-size: 13px; font-weight: 600; color: #ef4444; line-height: 1.4; }

        /* ── SUBMIT BUTTON ── */
        .tp-submit-btn {
          width: 100%;
          padding: 16px;
          border-radius: 18px;
          border: none;
          font-size: 14px;
          font-weight: 800;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.01em;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: fadeUp 0.4s 0.2s ease both;
        }
        .tp-submit-btn.default {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #fff;
          box-shadow: 0 4px 16px rgba(37,99,235,0.3);
        }
        .tp-submit-btn.default:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(37,99,235,0.38); }
        .tp-submit-btn.default:active { transform: scale(0.98); }
        .tp-submit-btn.loading { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; box-shadow: none; }
        .tp-submit-btn.done { background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; box-shadow: 0 4px 16px rgba(22,163,74,0.3); }

        .tp-spinner {
          width: 16px; height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(148,163,184,0.4);
          border-top-color: #94a3b8;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes spin { to { transform: rotate(360deg); } }

        .tp-delay-1 { animation-delay: 0.04s; }
        .tp-delay-2 { animation-delay: 0.08s; }
        .tp-delay-3 { animation-delay: 0.12s; }
      `}</style>

      <div className="tp-root">

        {/* ── HEADER ── */}
        <div className="tp-header">
          <div className="tp-header-top">
            <button className="tp-back-btn" onClick={() => router.back()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div>
              <div className="tp-header-title">Tambah Produk</div>
              <div className="tp-header-subtitle">Langkah 1 daripada 3</div>
            </div>
          </div>

          {/* Live preview pills */}
          <div className="tp-preview-pill">
            {form.name && (
              <div className="tp-pill">{form.name}</div>
            )}
            {priceVal > 0 && (
              <div className="tp-pill">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
                RM {priceVal.toFixed(2)} / unit
              </div>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="tp-body">

          {/* Error */}
          {error && (
            <div className="tp-error">
              <div className="tp-error-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </div>
              <div className="tp-error-text">{error}</div>
            </div>
          )}

          {/* Info banner — explains why no margin field */}
          <div className="tp-info-banner">
            <div className="tp-info-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="tp-info-text">
              <strong>Margin dikira secara automatik.</strong> Selepas simpan produk, masukkan bahan, tenaga kerja dan overhead — sistem akan kira margin % sebenar berdasarkan CVP formula.
            </div>
          </div>

          {/* Image Preview */}
          <div className="tp-img-card">
            <div className="tp-img-area">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="product preview" />
                  <div className="tp-img-overlay" />
                  <div className="tp-img-badge">Pratonton</div>
                </>
              ) : (
                <div className="tp-img-placeholder">
                  <div className="tp-img-placeholder-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="4"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                  <p>Imej akan muncul<br/>selepas nama diisi</p>
                </div>
              )}
            </div>
            <div className="tp-img-footer">
              <span className="tp-img-footer-label">Gambar Produk</span>
              {imageUrl && (
                <button className="tp-refresh-btn" onClick={() => fetchImage(form.name)}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                  </svg>
                  Cuba lain
                </button>
              )}
            </div>
          </div>

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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onFocus={() => setFocusedField("name")}
                onBlur={handleNameBlur}
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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              onFocus={() => setFocusedField("desc")}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Harga Jual */}
          <div className={`tp-form-card tp-delay-3 ${focusedField === "price" ? "focused" : ""}`}>
            <div className="tp-field-label">
              <div className="tp-field-label-dot" />
              Harga Jual Per Unit <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
            </div>
            <div className="tp-input-row">
              <span className="tp-input-prefix">RM</span>
              <input
                type="number"
                className="tp-input"
                placeholder="0.00"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                onFocus={() => setFocusedField("price")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            {priceVal > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                Margin akan dikira selepas kos dimasukkan di halaman seterusnya.
              </div>
            )}
          </div>

          {/* What happens next */}
          <div className="tp-steps-card">
            <div className="tp-steps-title">🗺️ Apa yang perlu dibuat seterusnya?</div>
            <div className="tp-step-item">
              <div className="tp-step-num">1</div>
              <div>
                <div className="tp-step-label">Simpan produk ini ✅</div>
                <div className="tp-step-sub">Nama + harga jual sahaja diperlukan</div>
              </div>
            </div>
            <div className="tp-step-item">
              <div className="tp-step-num">2</div>
              <div>
                <div className="tp-step-label">Masukkan bahan mentah</div>
                <div className="tp-step-sub">Kos bahan + bilangan unit dihasilkan per batch</div>
              </div>
            </div>
            <div className="tp-step-item">
              <div className="tp-step-num">3</div>
              <div>
                <div className="tp-step-label">Masukkan tenaga kerja & overhead</div>
                <div className="tp-step-sub">Pilih sama ada kos tetap atau berubah</div>
              </div>
            </div>
            <div className="tp-step-item">
              <div className="tp-step-num">4</div>
              <div>
                <div className="tp-step-label">Margin & BEP dikira automatik 📊</div>
                <div className="tp-step-sub">Menggunakan formula CVP sebenar</div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            className={`tp-submit-btn ${success ? "done" : loading ? "loading" : "default"}`}
            onClick={handleSubmit}
            disabled={loading || success}
          >
            {loading ? (
              <><div className="tp-spinner" />Menyimpan...</>
            ) : success ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                Berjaya! Masukkan kos sekarang...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <path d="M17 21v-8H7v8M7 3v5h8"/>
                </svg>
                Simpan & Masukkan Kos
              </>
            )}
          </button>

        </div>
      </div>
    </>
  );
}