"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8080/register", {
        name,
        email,
        password,
      });

      toast.success("Akaun berjaya dicipta!");

      setTimeout(() => {
        router.push("/login");
      }, 800);
    } catch (err) {
      let message = "Server error. Try again.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #d6eeff;
          --card: #eef6ff;
          --card-border: #c2dff7;
          --accent: #3b82f6;
          --accent-dark: #1d4ed8;
          --accent-soft: #bfdbfe;
          --text-primary: #1e3a5f;
          --text-secondary: #4a7ead;
          --text-muted: #7aaecc;
          --input-bg: #dbeeff;
          --input-border: #b8d8f5;
          --input-focus: #3b82f6;
          --shadow: 0 8px 32px rgba(59,130,246,0.10);
          --shadow-btn: 0 4px 16px rgba(59,130,246,0.22);
        }

        body {
          background-color: var(--bg);
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        /* ---- page bg dots ---- */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: radial-gradient(circle, #93c5fd22 1.5px, transparent 1.5px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        /* ---- floating blobs ---- */
        body::after {
          content: '';
          position: fixed;
          width: 420px; height: 420px;
          top: -100px; right: -120px;
          border-radius: 50%;
          background: radial-gradient(circle, #bfdbfe55 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .blob-bottom {
          position: fixed;
          width: 320px; height: 320px;
          bottom: -80px; left: -80px;
          border-radius: 50%;
          background: radial-gradient(circle, #93c5fd33 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ---- card ---- */
        .card {
          position: relative;
          z-index: 1;
          background: var(--card);
          border: 1.5px solid var(--card-border);
          border-radius: 24px;
          padding: 40px 36px 36px;
          width: 100%;
          max-width: 400px;
          box-shadow: var(--shadow);
          animation: cardIn 0.55s cubic-bezier(.22,1,.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* ---- illustration ---- */
        .illustration-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          animation: fadeUp 0.5s 0.1s both;
        }

        /* ---- heading ---- */
        .greeting {
          font-family: 'Fraunces', serif;
          font-size: 1.9rem;
          font-weight: 600;
          color: var(--text-primary);
          text-align: center;
          line-height: 1.2;
          animation: fadeUp 0.5s 0.18s both;
        }
        .greeting em {
          font-style: italic;
          color: var(--accent);
        }

        .slogan {
          font-size: 0.78rem;
          font-weight: 400;
          color: var(--text-muted);
          text-align: center;
          margin-top: 6px;
          letter-spacing: 0.01em;
          animation: fadeUp 0.5s 0.25s both;
        }

        .divider {
          border: none;
          border-top: 1.5px solid var(--card-border);
          margin: 22px 0 20px;
          animation: fadeUp 0.5s 0.3s both;
        }

        /* ---- form ---- */
        form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .field-wrap {
          position: relative;
          display: flex;
          align-items: center;
          animation: fadeUp 0.5s both;
        }
        .field-wrap:nth-child(1) { animation-delay: 0.33s; }
        .field-wrap:nth-child(2) { animation-delay: 0.39s; }
        .field-wrap:nth-child(3) { animation-delay: 0.45s; }

        .field-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .field-wrap input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          background: var(--input-bg);
          border: 1.5px solid var(--input-border);
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.88rem;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-wrap input::placeholder { color: var(--text-muted); }
        .field-wrap input:focus {
          border-color: var(--input-focus);
          background: #e8f3ff;
          box-shadow: 0 0 0 3px #bfdbfe66;
        }

        /* password toggle */
        .pw-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s;
        }
        .pw-toggle:hover { color: var(--accent); }

        /* ---- submit button ---- */
        .btn-submit {
          margin-top: 4px;
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: #e8f3ff;
          border: none;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: var(--shadow-btn);
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          animation: fadeUp 0.5s 0.52s both;
        }
        .btn-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(59,130,246,0.32);
        }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* loading spinner inside button */
        .btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .spinner {
          width: 15px; height: 15px;
          border: 2px solid #ffffff55;
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ---- footer link ---- */
        .footer-link {
          margin-top: 20px;
          text-align: center;
          animation: fadeUp 0.5s 0.58s both;
        }
        .footer-link p {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .btn-outline {
          display: block;
          width: 100%;
          padding: 11px;
          background: transparent;
          border: 1.5px solid var(--card-border);
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--accent);
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          transition: background 0.18s, border-color 0.18s, transform 0.15s;
        }
        .btn-outline:hover {
          background: #dbeeff;
          border-color: var(--accent-soft);
          transform: translateY(-1px);
        }

        /* ---- step badge ---- */
        .step-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-soft);
          color: var(--accent-dark);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 20px;
          margin: 0 auto 14px;
          width: fit-content;
          animation: fadeUp 0.5s 0.08s both;
        }
        .step-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="blob-bottom" />

      <div className="card">

        {/* Step badge */}
        <div className="step-badge">
          <span className="step-dot" />
          Cipta Akaun Baru
        </div>

        {/* Illustration */}
        <div className="illustration-wrap">
          <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* outer circle bg */}
            <circle cx="44" cy="44" r="44" fill="#dbeeff"/>
            {/* paper / form shape */}
            <rect x="22" y="18" width="44" height="54" rx="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5"/>
            {/* lines on paper */}
            <rect x="29" y="28" width="18" height="3" rx="1.5" fill="#60a5fa"/>
            <rect x="29" y="34" width="30" height="2" rx="1" fill="#93c5fd"/>
            <rect x="29" y="39" width="26" height="2" rx="1" fill="#93c5fd"/>
            <rect x="29" y="44" width="30" height="2" rx="1" fill="#93c5fd"/>
            {/* checkmark circle */}
            <circle cx="55" cy="60" r="11" fill="#3b82f6"/>
            <polyline points="50,60 54,64 61,56" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* top clip */}
            <rect x="36" y="14" width="16" height="8" rx="4" fill="#60a5fa" stroke="#bfdbfe" strokeWidth="1.5"/>
          </svg>
        </div>

        {/* Greeting */}
        <h1 className="greeting">
          Buat <em>Akaun</em> Anda
        </h1>
        <p className="slogan">Jom mula kira kos dengan lebih sistematik</p>

        <hr className="divider" />

        {/* Form */}
        <form onSubmit={handleRegister}>

          {/* Name */}
          <div className="field-wrap">
            <span className="field-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Nama penuh"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="field-wrap">
            <span className="field-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3"/>
                <polyline points="2,4 12,13 22,4"/>
              </svg>
            </span>
            <input
              type="email"
              placeholder="Alamat e-mel"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
            />
          </div>

          {/* Password */}
          <div className="field-wrap">
            <span className="field-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="11" rx="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Kata laluan (min. 6 aksara)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: "42px" }}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C7 19 2.73 15.11 1 12c.74-1.49 1.86-2.87 3.23-4.01"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c5 0 9.27 3.89 11 7a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-submit" disabled={loading}>
            <span className="btn-inner">
              {loading && <span className="spinner" />}
              {loading ? "Sedang mendaftar..." : "Daftar Sekarang"}
            </span>
          </button>
        </form>

        {/* Footer */}
        <div className="footer-link">
          <p>Sudah ada akaun?</p>
          <Link href="/login" className="btn-outline">
            Log Masuk
          </Link>
        </div>

      </div>
    </>
  );
}