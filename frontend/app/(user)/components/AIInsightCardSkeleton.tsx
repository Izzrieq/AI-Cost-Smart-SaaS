// components/AIInsightCardSkeleton.tsx
export default function AIInsightCardSkeleton() {
  return (
    <div className="skeleton-card">
      {/* Fake header */}
      <div className="skeleton-header">
        <div className="skeleton-header-left">
          <div className="skel skel-icon" />
          <div>
            <div className="skel" style={{ width: 100, height: 12, borderRadius: 6 }} />
            <div className="skel" style={{ width: 130, height: 10, borderRadius: 6, marginTop: 5 }} />
          </div>
        </div>
        <div className="skel" style={{ width: 36, height: 18, borderRadius: 20 }} />
      </div>

      {/* Fake rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-row">
          <div className="skel skel-dot" />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ width: "80%", height: 11, borderRadius: 6 }} />
            <div className="skel" style={{ width: "55%", height: 11, borderRadius: 6, marginTop: 6 }} />
          </div>
        </div>
      ))}

      <style jsx>{`
        .skeleton-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e8f0fb;
          overflow: hidden;
        }
        .skeleton-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: linear-gradient(135deg, #c7d7f5 0%, #d8e8ff 100%);
        }
        .skeleton-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .skeleton-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .skeleton-row:last-child {
          border-bottom: none;
        }
        /* Base shimmer */
        .skel {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        .skel-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          flex-shrink: 0;
        }
        .skel-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
