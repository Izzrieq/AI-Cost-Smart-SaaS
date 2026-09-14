// components/produk/shared/ProgressCard.tsx
"use client";

import { IconCheck } from "@/components/products/Icons";

// ─── TYPES ──────────────────────────────────────────────────────────────
interface ProgressCardProps {
  isDropship: boolean;
  hasBahan: boolean;
  hasTenaga: boolean;
  hasLain: boolean;
  completedSteps: number;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function ProgressCard({
  isDropship,
  hasBahan,
  hasTenaga,
  hasLain,
  completedSteps,
}: ProgressCardProps) {
  const steps = isDropship
    ? [
        { label: "Kos Supplier ditambah", done: hasBahan },
        { label: "Tenaga kerja diisi", done: hasTenaga },
        { label: "Perbelanjaan lain diisi", done: hasLain },
      ]
    : [
        { label: "Bahan ditambah", done: hasBahan },
        { label: "Tenaga kerja diisi", done: hasTenaga },
        { label: "Perbelanjaan lain diisi", done: hasLain },
      ];

  return (
    <div className="pd-card">
      <div className="pd-progress-header">
        <span className="pd-progress-label">Kelengkapan Kos</span>
        <span className="pd-progress-count">{completedSteps}/3 langkah</span>
      </div>
      <div className="pd-progress-track">
        <div
          className="pd-progress-fill"
          style={{ width: `${(completedSteps / 3) * 100}%` }}
        />
      </div>
      {steps.map((item) => (
        <div className="pd-step-row" key={item.label}>
          <div className={`pd-step-dot ${item.done ? "done" : "pending"}`}>
            {item.done ? <IconCheck /> : <div className="pd-step-dot-inner" />}
          </div>
          <span className={`pd-step-label ${item.done ? "done" : "pending"}`}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}