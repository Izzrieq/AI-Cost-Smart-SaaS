"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import BottomNavbar from "@/app/(user)/components/BottomNavbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@/app/globals.css";

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface Business {
  business_id: string;
  user_id: string;
  name: string;
  description: string;
  type: string;
  created_at: string;
}

interface HomeStats {
  hasBusiness: boolean;
  business_id?: string;
  totalKos: number;
  marginPurata: number;
  totalProducts: number;
  latestProducts: { name: string; selling_price: number; margin_percentage: number }[];
}

const quotes = [
  "Smart Cost. Turning Numbers Into Growth.",
  "Kawal kos, tingkatkan untung.",
  "Setiap sen yang dijimatkan adalah keuntungan.",
  "Perniagaan bijak bermula dengan kos yang terkawal.",
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── AI CHAT STATE ──────────────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const suggestedQuestions = [
    "Bagaimana saya boleh meningkatkan margin keuntungan?",
    "Produk mana yang paling menguntungkan?",
    "Berapa harga jual yang sesuai untuk produk saya?",
    "Apakah cara untuk mengurangkan kos pengeluaran?",
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [userRes, businessRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/business`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/home/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!userRes.ok) {
          router.push("/login");
          return;
        }

        const userData = await userRes.json();
        const businessData = await businessRes.json();
        const statsData = await statsRes.json();

        setUser(userData.user);
        setBusiness(businessData.business);
        setStats(statsData);
      } catch (err) {
        console.error("Fetch error:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ─── AI FUNCTION (Streaming + Markdown) ──────────────────────────────────
  const askAI = async (question: string) => {
    if (!question.trim()) return;

    setAiPrompt(question);
    setAiLoading(true);
    setAiResponse("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question,
          stats: {
            totalProducts: stats?.totalProducts || 0,
            marginPurata: stats?.marginPurata || 0,
            totalKos: stats?.totalKos || 0,
          },
          products: stats?.latestProducts || [],
        }),
      });

      // If the response is not a stream (error), read JSON
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setAiResponse(errorData.reply || "Maaf, berlaku ralat.");
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setAiResponse("Maaf, tidak dapat membaca respons.");
        setAiLoading(false);
        return;
      }

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              setAiResponse(accumulated);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
      setAiLoading(false);
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse("Maaf, berlaku ralat. Sila cuba sebentar lagi.");
      setAiLoading(false);
    }
  };

  const getFirstName = () => (user ? user.name.split(" ")[0] : "");
  const formatRM = (val: number) =>
    `RM ${val.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getMarginStatus = (margin: number) => {
    if (margin === 0) return { label: "Tiada Rekod", bg: "#f3f4f6", text: "#9ca3af", bar: "#e5e7eb" };
    if (margin >= 30) return { label: "Sihat", bg: "#f0fdf4", text: "#16a34a", bar: "#4ade80" };
    if (margin >= 15) return { label: "Sederhana", bg: "#fffbeb", text: "#d97706", bar: "#fbbf24" };
    return { label: "Rendah", bg: "#fef2f2", text: "#ef4444", bar: "#f87171" };
  };

  const quote = quotes[new Date().getDay() % quotes.length];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #dbeafe", borderTopColor: "#2563eb", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "#9ca3af", letterSpacing: "0.02em" }}>Memuatkan...</span>
        </div>
      </div>
    );
  }

  const marginStatus = getMarginStatus(stats?.marginPurata ?? 0);
  const hasProducts = (stats?.totalProducts ?? 0) > 0;
  const marginVal = stats?.marginPurata ?? 0;
  const marginPercent = Math.min(marginVal, 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .hp-root {
          min-height: 100vh;
          background: #f5f7fa;
          padding-bottom: 108px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Hero Header ── */
        .hp-header {
          background: linear-gradient(145deg, #1a56db 0%, #2563eb 55%, #3b82f6 100%);
          padding: 52px 20px 56px;
          position: relative;
          overflow: hidden;
        }
        .hp-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .hp-header::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -20px;
          width: 160px; height: 160px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .hp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .hp-logo {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
        }
        .hp-logo span {
          color: rgba(255,255,255,0.55);
          font-weight: 500;
          font-style: italic;
          font-size: 16px;
          margin-left: 2px;
        }

        .hp-notif-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
        }
        .hp-notif-btn:hover { background: rgba(255,255,255,0.22); }
        .hp-notif-dot {
          position: absolute;
          top: 9px; right: 9px;
          width: 7px; height: 7px;
          background: #f87171;
          border-radius: 50%;
          border: 2px solid #2563eb;
        }

        /* Greeting row */
        .hp-greeting {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          position: relative;
          z-index: 1;
        }
        .hp-greeting-text h2 {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
          line-height: 1.2;
        }
        .hp-greeting-text p {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          line-height: 1.55;
          max-width: 200px;
          font-style: italic;
          font-weight: 500;
        }

        .hp-avatar {
          width: 72px; height: 72px;
          min-width: 72px;
          border-radius: 18px;
          background: rgba(255,255,255,0.12);
          border: 2px dashed rgba(255,255,255,0.3);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 4px;
          color: rgba(255,255,255,0.55);
          backdrop-filter: blur(4px);
        }
        .hp-avatar span {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* Floating stats card pulled up from header */
        .hp-hero-card {
          margin: -28px 16px 0;
          background: #fff;
          border-radius: 20px;
          padding: 18px 20px;
          box-shadow: 0 4px 24px rgba(37,99,235,0.13), 0 1px 4px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          gap: 0;
          position: relative;
          z-index: 10;
        }
        .hp-hero-stat {
          flex: 1;
          text-align: center;
          padding: 0 8px;
        }
        .hp-hero-stat + .hp-hero-stat {
          border-left: 1px solid #f1f5f9;
        }
        .hp-hero-stat-label {
          font-size: 10px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .hp-hero-stat-value {
          font-size: 17px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .hp-hero-stat-value.blue { color: #2563eb; }
        .hp-hero-stat-badge {
          display: inline-block;
          margin-top: 5px;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* Section label */
        .hp-section-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0 20px;
          margin-bottom: 10px;
        }

        /* Cards body */
        .hp-body { margin-top: 24px; }
        .hp-section { margin-bottom: 20px; }

        /* Stat row cards */
        .hp-card {
          background: #fff;
          border-radius: 18px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .hp-card:active { transform: scale(0.985); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

        .hp-kos-card {
          margin: 0 16px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }
        .hp-card-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }
        .hp-card-value {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .hp-card-empty {
          font-size: 13px;
          color: #cbd5e1;
          font-style: italic;
        }

        /* Margin card with progress */
        .hp-margin-card {
          margin: 0 16px;
          padding: 18px 20px;
          cursor: pointer;
        }
        .hp-margin-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .hp-margin-progress-track {
          height: 6px;
          background: #f1f5f9;
          border-radius: 99px;
          overflow: hidden;
        }
        .hp-margin-progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 1s cubic-bezier(0.34,1.56,0.64,1);
        }
        .hp-margin-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }

        /* 2-col grid cards */
        .hp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 0 16px;
        }
        .hp-grid-card {
          background: #fff;
          border-radius: 18px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
          padding: 16px;
          cursor: pointer;
          transition: transform 0.18s ease;
        }
        .hp-grid-card:active { transform: scale(0.97); }

        .hp-grid-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 10px;
        }
        .hp-grid-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .hp-grid-value {
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.01em;
        }

        /* AI Card */
        .hp-ai-card {
          margin: 0 16px;
          background: #fff;
          border-radius: 18px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .hp-ai-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 18px 14px;
          border-bottom: 1px solid #f8fafc;
          background: linear-gradient(135deg, #f8fbff 0%, #fff 100%);
        }
        .hp-ai-icon-wrap {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          display: flex; align-items: center; justify-content: center;
        }
        .hp-ai-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.01em;
        }
        .hp-ai-badge {
          margin-left: auto;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 9px;
          border-radius: 99px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          color: #1d4ed8;
        }

        /* AI Chat Input & Response */
        .hp-ai-chat-area {
          padding: 12px 18px;
          border-bottom: 1px solid #f8fafc;
        }
        .hp-ai-input-wrap {
          display: flex;
          gap: 10px;
        }
        .hp-ai-input {
          flex: 1;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          font-size: 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          background: #f8fafc;
          transition: border-color 0.2s;
        }
        .hp-ai-input:focus {
          border-color: #93c5fd;
          background: #fff;
        }
        .hp-ai-input::placeholder {
          color: #c4cdd6;
        }
        .hp-ai-send-btn {
          padding: 10px 16px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          min-width: 80px;
          box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }
        .hp-ai-send-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: scale(0.98);
        }
        .hp-ai-send-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .hp-ai-suggestions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .hp-ai-suggestion-btn {
          font-size: 11px;
          padding: 4px 12px;
          border-radius: 99px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .hp-ai-suggestion-btn:hover {
          border-color: #93c5fd;
          color: #2563eb;
        }

        .hp-ai-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
        }
        .hp-ai-loading-spinner {
          width: 20px; height: 20px;
          border-radius: 50%;
          border: 2px solid #dbeafe;
          border-top-color: #2563eb;
          animation: spin 0.8s linear infinite;
        }
        .hp-ai-loading-text {
          font-size: 13px;
          color: #94a3b8;
        }

        .hp-ai-response {
          padding: 14px 18px;
          background: #f8fbff;
          border-bottom-left-radius: 18px;
          border-bottom-right-radius: 18px;
        }
        .hp-ai-response-text {
          font-size: 13px;
          color: #1e293b;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        /* ── Markdown custom styles ── */
        .hp-ai-response h1,
        .hp-ai-response h2,
        .hp-ai-response h3,
        .hp-ai-response h4 {
          margin: 0.6rem 0 0.3rem 0;
          font-weight: 700;
          color: #0f172a;
        }
        .hp-ai-response h1 { font-size: 1.2rem; }
        .hp-ai-response h2 { font-size: 1.1rem; }
        .hp-ai-response h3 { font-size: 1.0rem; }
        .hp-ai-response p {
          margin: 0.3rem 0;
          line-height: 1.6;
          color: #1e293b;
        }
        .hp-ai-response ul,
        .hp-ai-response ol {
          padding-left: 1.5rem;
          margin: 0.3rem 0;
        }
        .hp-ai-response li {
          margin: 0.1rem 0;
        }
        .hp-ai-response strong {
          font-weight: 700;
          color: #0f172a;
        }

        /* No Business overlay */
        .hp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 24px;
        }
        .hp-overlay-card {
          background: #fff;
          border-radius: 24px;
          padding: 36px 28px 28px;
          text-align: center;
          width: 100%;
          max-width: 320px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .hp-overlay-icon {
          width: 60px; height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
        }
        .hp-overlay-card h3 {
          font-size: 16px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .hp-overlay-card p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 22px;
        }
        .hp-overlay-btn {
          width: 100%;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 16px rgba(37,99,235,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .hp-overlay-btn:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(37,99,235,0.25); }

        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hp-fade-1 { animation: fadeUp 0.4s ease forwards; }
        .hp-fade-2 { animation: fadeUp 0.4s 0.07s ease both; }
        .hp-fade-3 { animation: fadeUp 0.4s 0.14s ease both; }
        .hp-fade-4 { animation: fadeUp 0.4s 0.21s ease both; }
        .hp-fade-5 { animation: fadeUp 0.4s 0.28s ease both; }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="hp-root">
        {/* ── HERO HEADER ── */}
        <div className="hp-header">
          {/* Top Bar */}
          <div className="hp-topbar">
            <div className="hp-logo">
              Cost<span>Smart</span>
            </div>
            <button className="hp-notif-btn" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span className="hp-notif-dot" />
            </button>
          </div>

          {/* Greeting */}
          <div className="hp-greeting">
            <div className="hp-greeting-text">
              <h2>Hi, {getFirstName()}</h2>
              <p>{quote}</p>
            </div>
            <div className="hp-avatar">
              <Image
                src="/images/demo-logo.png"
                alt="logo"
                width={72}
                height={72}
                className="logo-image"
              />
            </div>
          </div>
        </div>

        {/* ── FLOATING HERO STATS CARD ── */}
        <div className="hp-hero-card hp-fade-1">
          <div className="hp-hero-stat">
            <div className="hp-hero-stat-label">Jumlah Kos</div>
            {hasProducts ? (
              <div className="hp-hero-stat-value">{formatRM(stats?.totalKos ?? 0)}</div>
            ) : (
              <div className="hp-card-empty">—</div>
            )}
          </div>
          <div className="hp-hero-stat">
            <div className="hp-hero-stat-label">Margin Purata</div>
            {hasProducts ? (
              <>
                <div className="hp-hero-stat-value blue">{marginVal}%</div>
                <div className="hp-hero-stat-badge" style={{ background: marginStatus.bg, color: marginStatus.text }}>
                  {marginStatus.label}
                </div>
              </>
            ) : (
              <div className="hp-card-empty">—</div>
            )}
          </div>
          <div className="hp-hero-stat">
            <div className="hp-hero-stat-label">Produk</div>
            <div className="hp-hero-stat-value">{stats?.totalProducts ?? 0}</div>
            <div className="hp-hero-stat-badge" style={{ background: "#eff6ff", color: "#2563eb" }}>Aktif</div>
          </div>
        </div>

        {/* ── BODY ── */}
        {business ? (
          <div className="hp-body">
            {/* Margin Progress Card */}
            <div className="hp-section hp-fade-2">
              <div className="hp-section-label">Prestasi Margin</div>
              <div className="hp-margin-card hp-card" style={{ cursor: "pointer" }} onClick={() => router.push("/analisis")}>
                <div className="hp-margin-top">
                  <div>
                    <div className="hp-card-label">Margin Purata</div>
                    {hasProducts ? (
                      <div className="hp-card-value">{marginVal}%</div>
                    ) : (
                      <div className="hp-card-empty">Tiada rekod</div>
                    )}
                  </div>
                  {hasProducts && (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: marginStatus.bg, color: marginStatus.text }}>
                        {marginStatus.label}
                      </span>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Sasaran: 30%</div>
                    </div>
                  )}
                </div>
                {hasProducts && (
                  <>
                    <div className="hp-margin-progress-track">
                      <div className="hp-margin-progress-fill" style={{ width: `${marginPercent}%`, background: marginStatus.bar }} />
                    </div>
                    <div className="hp-margin-footer">
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>0%</span>
                      <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>Lihat Analisis &rarr;</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>100%</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 2-col quick actions */}
            <div className="hp-section hp-fade-3">
              <div className="hp-section-label">Tindakan Pantas</div>
              <div className="hp-grid">
                {/* Cadangan Harga */}
                <div className="hp-grid-card" onClick={() => router.push("/produk")}>
                  <div className="hp-grid-icon" style={{ background: "#eff6ff" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  <div className="hp-grid-title">Urus Produk</div>
                  {hasProducts ? (
                    <>
                      <div className="hp-grid-value">{stats?.totalProducts} produk</div>
                      <div style={{ marginTop: 6, display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#eff6ff", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Terbaru</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic", marginTop: 4 }}>Tiada produk</div>
                  )}
                </div>

                {/* AI Panduan */}
                <div className="hp-grid-card" onClick={() => document.getElementById("ai-chat-input")?.focus()}>
                  <div className="hp-grid-icon" style={{ background: "linear-gradient(135deg, #dbeafe, #eff6ff)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div className="hp-grid-title">Tanya AI</div>
                  {hasProducts ? (
                    <>
                      <div className="hp-grid-value" style={{ color: "#2563eb" }}>Panduan Pintar</div>
                      <div style={{ marginTop: 6, display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "linear-gradient(135deg, #dbeafe, #eff6ff)", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic", marginTop: 4 }}>Tiada rekod</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── AI CHAT CARD ── */}
            <div className="hp-section hp-fade-4">
              <div className="hp-section-label">Tanya CostSmart AI</div>
              <div className="hp-ai-card">
                <div className="hp-ai-header">
                  <div className="hp-ai-icon-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" />
                      <path d="M12 8v4l3 3" />
                    </svg>
                  </div>
                  <div>
                    <div className="hp-ai-title">CostSmart AI</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                      Tanya apa-apa tentang perniagaan anda
                    </div>
                  </div>
                  <div className="hp-ai-badge">Beta</div>
                </div>

                {/* ── INPUT AREA ── */}
                <div className="hp-ai-chat-area">
                  <div className="hp-ai-input-wrap">
                    <input
                      id="ai-chat-input"
                      type="text"
                      className="hp-ai-input"
                      placeholder="Tanya soalan... cth: Macam mana nak naikkan margin?"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !aiLoading && aiPrompt.trim()) {
                          askAI(aiPrompt);
                        }
                      }}
                    />
                    <button
                      className="hp-ai-send-btn"
                      onClick={() => askAI(aiPrompt)}
                      disabled={aiLoading || !aiPrompt.trim()}
                    >
                      {aiLoading ? "..." : "Hantar"}
                    </button>
                  </div>

                  {/* ── SUGGESTED QUESTIONS ── */}
                  {!aiResponse && !aiLoading && (
                    <div className="hp-ai-suggestions">
                      {suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          className="hp-ai-suggestion-btn"
                          onClick={() => askAI(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── LOADING ── */}
                {aiLoading && (
                  <div className="hp-ai-loading">
                    <div className="hp-ai-loading-spinner" />
                    <span className="hp-ai-loading-text">CostSmart AI sedang berfikir...</span>
                  </div>
                )}

                {/* ── RESPONSE (Markdown) ── */}
                {aiResponse && !aiLoading && (
                  <div className="hp-ai-response">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => <h1 {...props} />,
                        h2: ({ node, ...props }) => <h2 {...props} />,
                        h3: ({ node, ...props }) => <h3 {...props} />,
                        p: ({ node, ...props }) => <p {...props} />,
                        ul: ({ node, ...props }) => <ul {...props} />,
                        ol: ({ node, ...props }) => <ol {...props} />,
                        li: ({ node, ...props }) => <li {...props} />,
                        strong: ({ node, ...props }) => <strong {...props} />,
                      }}
                    >
                      {aiResponse}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hp-overlay">
            <div className="hp-overlay-card">
              <div className="hp-overlay-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3>Mulakan Perniagaan Anda</h3>
              <p>Daftarkan perniagaan anda untuk mula mengurus kos dengan lebih bijak menggunakan CostSmart.</p>
              <button className="hp-overlay-btn" onClick={() => router.push("/daftar-perniagaan")}>
                Daftar Sekarang
              </button>
            </div>
          </div>
        )}

        <BottomNavbar />
      </div>
    </>
  );
}