// components/produk/FormSteps.tsx
"use client";

import { TargetIcon } from "./Icons";

type Step = { label: string; sub: string };

type Props = {
  steps: Step[];
};

export default function FormSteps({ steps }: Props) {
  return (
    <div className="tp-steps-card">
      <div className="tp-steps-title">
        <TargetIcon />
        Apa yang perlu dibuat seterusnya?
      </div>
      {steps.map((step, index) => (
        <div key={index} className="tp-step-item">
          <div className="tp-step-num">{index + 1}</div>
          <div>
            <div className="tp-step-label">{step.label}</div>
            <div className="tp-step-sub">{step.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}