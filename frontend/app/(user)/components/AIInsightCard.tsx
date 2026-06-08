// components/AIInsightCard.tsx
"use client";

interface LatestProduct {
  name: string;
  selling_price: number;
  margin_percentage: number;
}

interface AIInsightCardProps {
  hasProducts: boolean;
  marginPurata: number;
  latestProducts: LatestProduct[];
  onAddProduct: () => void;
  formatRM: (val: number) => string;
}

export default function AIInsightCard({
  hasProducts,
  marginPurata,
  latestProducts,
  onAddProduct,
  formatRM,
}: AIInsightCardProps) {
  return (
    <div className="ai-card">
      {/* Header */}
      <div className="ai-card-header">
        <div className="ai-card-header-left">
          <div className="ai-icon-wrap">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <p className="ai-title">CostSmart AI</p>
            <p className="ai-subtitle">Analisis & cadangan pintar</p>
          </div>
        </div>
        <span className="ai-badge">LIVE</span>
      </div>

      {/* Body */}
      {hasProducts ? (
        <div className="ai-body">
          {marginPurata < 30 && (
            <div className="ai-row warn">
              <span className="ai-dot warn" />
              <p className="ai-row-text">
                Margin purata anda di bawah{" "}
                <strong>30%</strong>. Semak semula penetapan harga produk anda.
              </p>
            </div>
          )}
          {latestProducts.map((p, i) => (
            <div key={i} className="ai-row info">
              <span className="ai-dot info" />
              <p className="ai-row-text">
                <strong>{p.name}</strong> — Harga jual {formatRM(p.selling_price)},
                margin{" "}
                <span
                  className={
                    p.margin_percentage >= 30
                      ? "margin-good"
                      : p.margin_percentage >= 15
                      ? "margin-mid"
                      : "margin-bad"
                  }
                >
                  {p.margin_percentage}%
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="ai-empty">
          <div className="ai-empty-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#93c5fd"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="ai-empty-title">Tiada cadangan lagi</p>
          <p className="ai-empty-desc">
            Tambah produk untuk mula menerima cadangan AI.
          </p>
          <button className="ai-empty-btn" onClick={onAddProduct}>
            + Tambah Produk
          </button>
        </div>
      )}

      <style jsx>{`
        .ai-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e8f0fb;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(37, 99, 235, 0.06);
        }
        .ai-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: linear-gradient(135deg, #1a56db 0%, #3b82f6 100%);
        }
        .ai-card-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ai-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .ai-title {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .ai-subtitle {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }
        .ai-badge {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #22c55e;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          padding: 3px 8px;
          border-radius: 20px;
        }
        .ai-body {
          padding: 4px 0;
        }
        .ai-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .ai-row:last-child {
          border-bottom: none;
        }
        .ai-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .ai-dot.warn {
          background: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }
        .ai-dot.info {
          background: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        .ai-row-text {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
        }
        .ai-row-text strong {
          color: #111827;
          font-weight: 600;
        }
        .margin-good { color: #16a34a; font-weight: 600; }
        .margin-mid  { color: #d97706; font-weight: 600; }
        .margin-bad  { color: #dc2626; font-weight: 600; }
        .ai-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 20px;
          gap: 6px;
        }
        .ai-empty-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
        }
        .ai-empty-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        .ai-empty-desc {
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
          margin: 0;
        }
        .ai-empty-btn {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #1d4ed8;
          background: #eff6ff;
          border: none;
          padding: 8px 20px;
          border-radius: 20px;
          cursor: pointer;
        }
        .ai-empty-btn:active {
          opacity: 0.75;
        }
      `}</style>
    </div>
  );
}
