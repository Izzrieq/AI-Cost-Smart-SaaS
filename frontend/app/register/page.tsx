"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/lib/firebase";

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
      await axios.post("http://localhost:8080/register", {
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

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      // /auth/google on your backend auto-registers if user doesn't exist
      const res = await axios.post("http://localhost:8080/auth/google", {
        token: idToken,
      });

      const user = res.data.user;

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Akaun Google berjaya dibuat!");

      setTimeout(() => {
        if (user.role === "admin") {
          router.push("/dashboard");
        } else {
          router.push("/home");
        }
      }, 500);
    } catch (err) {
      console.error(err);
      let message = "Google sign-up failed";
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

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: radial-gradient(circle, #93c5fd22 1.5px, transparent 1.5px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

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

        .illustration-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          animation: fadeUp 0.5s 0.1s both;
        }

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

        /* ---- OR divider ---- */
        .or-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 2px 0;
          animation: fadeUp 0.5s 0.48s both;
        }
        .or-divider::before,
        .or-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--card-border);
        }
        .or-divider span {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* ---- submit button ---- */
        .btn-submit {
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
          animation: fadeUp 0.5s 0.51s both;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(59,130,246,0.32);
        }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ---- Google button ---- */
        .btn-google {
          width: 100%;
          padding: 12px;
          background: transparent;
          color: var(--accent);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          border: 1.5px solid #93c4e8;
          border-radius: 12px;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
          animation: fadeUp 0.5s 0.54s both;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .btn-google:hover:not(:disabled) {
          background: #dbeeff;
          border-color: #3b9ade;
          transform: translateY(-1px);
        }
        .btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 15px; height: 15px;
          border: 2px solid #ffffff55;
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

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
          display: flex;
          align-items: center;
          justify-content: center;
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
            <circle cx="44" cy="44" r="44" fill="#dbeeff"/>
            <rect x="22" y="18" width="44" height="54" rx="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5"/>
            <rect x="29" y="28" width="18" height="3" rx="1.5" fill="#60a5fa"/>
            <rect x="29" y="34" width="30" height="2" rx="1" fill="#93c5fd"/>
            <rect x="29" y="39" width="26" height="2" rx="1" fill="#93c5fd"/>
            <rect x="29" y="44" width="30" height="2" rx="1" fill="#93c5fd"/>
            <circle cx="55" cy="60" r="11" fill="#3b82f6"/>
            <polyline points="50,60 54,64 61,56" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
              autoComplete="name"
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
              autoComplete="email"
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
              autoComplete="new-password"
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
            {loading ? (
              <>
                <span className="spinner" />
                <span>Sedang mendaftar...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                <span>Daftar Sekarang</span>
              </>
            )}
          </button>

          {/* OR divider */}
          <div className="or-divider">
            <span>atau</span>
          </div>

          {/* Google Sign-Up */}
          <button
            type="button"
            className="btn-google"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.8-3 5.1-5.8 6.5l6.2 5.2C39.8 35.9 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            Daftar Dengan Google
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