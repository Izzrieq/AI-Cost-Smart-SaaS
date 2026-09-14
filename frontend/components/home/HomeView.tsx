// components/home/HomeView.tsx
"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BottomNavbar from "@/app/(user)/components/BottomNavbar";
import "@/app/(user)/home/home.css"; 

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

type HomeViewProps = {
  loading: boolean;
  user: User | null;
  business: Business | null;
  stats: HomeStats | null;
  aiPrompt: string;
  setAiPrompt: (val: string) => void;
  aiResponse: string;
  aiLoading: boolean;
  getFirstName: () => string;
  formatRM: (val: number) => string;
  quote: string;
  marginStatus: { label: string; bg: string; text: string; bar: string };
  hasProducts: boolean;
  marginVal: number;
  marginPercent: number;
  askAI: (question: string) => Promise<void>;
  router: any;
};

const suggestedQuestions = [
  "Bagaimana saya boleh meningkatkan margin keuntungan?",
  "Produk mana yang paling menguntungkan?",
  "Berapa harga jual yang sesuai untuk produk saya?",
  "Apakah cara untuk mengurangkan kos pengeluaran?",
];

export default function HomeView({
  loading,
  user,
  business,
  stats,
  aiPrompt,
  setAiPrompt,
  aiResponse,
  aiLoading,
  getFirstName,
  formatRM,
  quote,
  marginStatus,
  hasProducts,
  marginVal,
  marginPercent,
  askAI,
  router,
}: HomeViewProps) {
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

  return (
    <div className="hp-root">
      {/* ── HERO HEADER ── */}
      <div className="hp-header">
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

        <div className="hp-greeting">
          <div className="hp-greeting-text">
            <h2>Hi, {getFirstName()}</h2>
            <p>{quote}</p>
          </div>
          <div className="hp-avatar">
            <Image
              src="/images/hero.png"
              alt="logo"
              width={200}
              height={150}
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

              {aiLoading && (
                <div className="hp-ai-loading">
                  <div className="hp-ai-loading-spinner" />
                  <span className="hp-ai-loading-text">CostSmart AI sedang berfikir...</span>
                </div>
              )}

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
  );
}