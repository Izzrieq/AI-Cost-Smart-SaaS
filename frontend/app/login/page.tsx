"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8080/login", {
        email,
        password,
      });

      if (!res.data?.token) {
        toast.error("Login failed");
        return;
      }

      const user = res.data.user; 

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      toast.success("Login successful");

      setTimeout(() => {
        if (user.role === "admin") {
            router.push("/dashboard");
        } else {
            router.push("/home");
        }
      }, 500);
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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,300;0,400;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #dbeeff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle background circles */
        .login-root::before {
          content: '';
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, #bfdbfe 0%, transparent 70%);
          top: -120px;
          right: -100px;
          pointer-events: none;
        }
        .login-root::after {
          content: '';
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, #bae6fd 0%, transparent 70%);
          bottom: -80px;
          left: -80px;
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: #eff8ff;
          border: 1px solid #bae0fc;
          border-radius: 24px;
          padding: 40px 36px 36px;
          box-shadow:
            0 4px 6px rgba(56, 139, 202, 0.06),
            0 20px 40px rgba(56, 139, 202, 0.1);
          animation: cardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        /* --- Illustration --- */
        .illus-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
          animation: illus-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        @keyframes illus-in {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* --- Greeting --- */
        .greeting-block {
          text-align: center;
          margin-bottom: 28px;
          animation: fadeUp 0.5s ease 0.2s both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .greeting-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 2rem;
          font-weight: 300;
          color: #0e4f82;
          letter-spacing: -0.5px;
          line-height: 1.1;
          margin-bottom: 6px;
        }
        .greeting-title em {
          font-style: italic;
          color: #1a73c9;
        }
        .greeting-slogan {
          font-size: 0.8rem;
          font-weight: 400;
          color: #5a8db8;
          letter-spacing: 0.4px;
          line-height: 1.5;
        }

        /* --- Divider --- */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #bcd8ef, transparent);
          margin-bottom: 28px;
        }

        /* --- Form --- */
        .form-group {
          margin-bottom: 14px;
          animation: fadeUp 0.5s ease both;
        }
        .form-group:nth-child(1) { animation-delay: 0.28s; }
        .form-group:nth-child(2) { animation-delay: 0.34s; }

        .form-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #4a80ab;
          margin-bottom: 6px;
        }

        .input-wrap {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #7ab3d4;
          pointer-events: none;
        }
        .form-input {
          width: 100%;
          padding: 11px 14px 11px 38px;
          background: #dbeeff;
          border: 1.5px solid #b2d4f0;
          border-radius: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.88rem;
          color: #0e4f82;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .form-input::placeholder { color: #8ab8d8; }
        .form-input:focus {
          border-color: #3b9ade;
          background: #d4edfb;
          box-shadow: 0 0 0 3px rgba(59, 154, 222, 0.15);
        }

        .toggle-pw {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #7ab3d4;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .toggle-pw:hover { color: #1a73c9; }

        /* --- Submit Button --- */
        .btn-submit {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #2a8fd4, #1a6ab3);
          color: #e8f4fd;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 6px;
          letter-spacing: 0.3px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(26, 106, 179, 0.3);
          animation: fadeUp 0.5s ease 0.4s both;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-submit:hover:not(:disabled) {
          opacity: 0.93;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26, 106, 179, 0.38);
        }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Spinner */
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(232, 244, 253, 0.4);
          border-top-color: #e8f4fd;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* --- Footer --- */
        .signup-footer {
          margin-top: 22px;
          text-align: center;
          animation: fadeUp 0.5s ease 0.46s both;
        }
        .signup-text {
          font-size: 0.8rem;
          color: #5a8db8;
          margin-bottom: 10px;
        }
        .btn-signup {
          width: 100%;
          padding: 11px;
          background: transparent;
          color: #1a73c9;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          border: 1.5px solid #93c4e8;
          border-radius: 12px;
          cursor: pointer;
          letter-spacing: 0.2px;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
          text-decoration: none;
          display: block;
        }
        .btn-signup:hover {
          background: #d4edfb;
          border-color: #3b9ade;
          transform: translateY(-1px);
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          {/* Illustration */}
          <div className="illus-wrap">
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer circle */}
              <circle cx="44" cy="44" r="44" fill="#c7e8fb" />
              {/* Calculator body */}
              <rect x="22" y="20" width="44" height="52" rx="7" fill="#2a8fd4" />
              <rect x="26" y="24" width="36" height="16" rx="4" fill="#9dd5f5" />
              {/* Display text lines */}
              <rect x="30" y="30" width="20" height="3" rx="1.5" fill="#0e4f82" opacity="0.5" />
              <rect x="30" y="35" width="12" height="2.5" rx="1.2" fill="#0e4f82" opacity="0.35" />
              {/* Buttons grid */}
              {[0,1,2,3].map(col => [0,1,2].map(row => (
                <rect
                  key={`${col}-${row}`}
                  x={28 + col * 9}
                  y={46 + row * 8}
                  width="6"
                  height="5"
                  rx="1.5"
                  fill={row === 0 ? "#9dd5f5" : "#60b8ea"}
                  opacity={col === 3 && row === 2 ? "1" : "0.85"}
                />
              )))}
              {/* Accent equals button */}
              <rect x={28 + 3 * 9} y={46 + 2 * 8} width="6" height="5" rx="1.5" fill="#f0a500" />
              {/* Small sparkle */}
              <circle cx="67" cy="22" r="4" fill="#bae0fc" opacity="0.7" />
              <circle cx="72" cy="30" r="2" fill="#93c4e8" opacity="0.5" />
            </svg>
          </div>

          {/* Greeting */}
          <div className="greeting-block">
            <h1 className="greeting-title">Selamat <em>Datang</em></h1>
            <p className="greeting-slogan">Jom mula kira kos dengan lebih sistematik</p>
          </div>

          <div className="divider" />

          {/* Form */}
          <form onSubmit={handleLogin} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Emel</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  placeholder="contoh@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Kata Laluan</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata laluan"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Sedang Masuk...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  <span>Log Masuk</span>
                </>
              )}
            </button>
          </form>

          {/* Sign Up */}
          <div className="signup-footer">
            <p className="signup-text">Belum ada akaun?</p>
            <Link href="/register" className="btn-signup">
              Daftar Sekarang
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}