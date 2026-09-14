"use client";

import Link from "next/link";
import { useState } from "react"; 
import "@/app/register/register.css";
type RegisterFormProps = {
  // form state
  name: string;
  setName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  // invite state
  inviteToken: string | null;
  isInviteValid: boolean | null;
  verifyingInvite: boolean;
  // handlers
  onSubmit: (e: React.FormEvent) => void;
  onGoogleRegister: () => void;
};

export default function RegisterForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  loading,
  showPassword,
  setShowPassword,
  inviteToken,
  isInviteValid,
  verifyingInvite,
  onSubmit,
  onGoogleRegister,
}: RegisterFormProps) {
  // If verifying invite, show loading
  if (verifyingInvite) {
    return (
      <div style={{ minHeight: "100vh", background: "#d6eeff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#eef6ff", padding: 40, borderRadius: 24, textAlign: "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid #dbeafe", borderTopColor: "#2563eb", animation: "spin 0.75s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#1e3a5f", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Memeriksa pautan jemputan...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // If invite token exists but invalid
  if (inviteToken && !isInviteValid) {
    return (
      <div style={{ minHeight: "100vh", background: "#d6eeff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#eef6ff", padding: 40, borderRadius: 24, maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: "#dc2626", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 8 }}>Pautan Tidak Sah</h2>
          <p style={{ color: "#4a7ead", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Pautan jemputan ini telah tamat tempoh atau tidak sah.
            <br />
            Sila hubungi pemilik perniagaan untuk pautan baharu.
          </p>
          <Link href="/login" style={{ display: "inline-block", marginTop: 16, color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}>
            Kembali ke Log Masuk →
          </Link>
        </div>
      </div>
    );
  }

  // Normal form render (with all styles, same as original)
  return (
    <>
      <div className="blob-bottom" />
      <div className="card">
        <div className="step-badge">
          <span className="step-dot" />
          {inviteToken ? "Daftar Sebagai Staff" : "Cipta Akaun Baru"}
        </div>

        {inviteToken && isInviteValid && (
          <div className="invite-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            Anda dijemput menyertai perniagaan sebagai Staff
          </div>
        )}

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

        <h1 className="greeting">
          {inviteToken ? "Sertai Pasukan" : "Buat Akaun Anda"}
        </h1>
        <p className="slogan">
          {inviteToken
            ? "Daftar sebagai staff untuk mula bekerja"
            : "Jom mula kira kos dengan lebih sistematik"}
        </p>

        <hr className="divider" />

        <form onSubmit={onSubmit}>
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
              onClick={() => setShowPassword(!showPassword)}
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
                <span>{inviteToken ? "Daftar Sebagai Staff" : "Daftar Sekarang"}</span>
              </>
            )}
          </button>

          <div className="or-divider">
            <span>atau</span>
          </div>

          <button
            type="button"
            className="btn-google"
            onClick={onGoogleRegister}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.8-3 5.1-5.8 6.5l6.2 5.2C39.8 35.9 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            {inviteToken ? "Daftar Staff Dengan Google" : "Daftar Dengan Google"}
          </button>
        </form>

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