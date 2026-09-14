// components/produk/SubmitButton.tsx
"use client";

import { CheckIcon, SaveIcon } from "./Icons";

type Props = {
  loading: boolean;
  success: boolean;
  isDropship: boolean;
  onClick: () => void;
};

export default function SubmitButton({ loading, success, isDropship, onClick }: Props) {
  return (
    <button
      className={`tp-submit-btn ${success ? "done" : loading ? "loading" : "default"}`}
      onClick={onClick}
      disabled={loading || success}
    >
      {loading ? (
        <>
          <div className="tp-spinner" />
          Menyimpan...
        </>
      ) : success ? (
        <>
          <CheckIcon />
          Berjaya! Ke halaman produk...
        </>
      ) : (
        <>
          <SaveIcon />
          {isDropship ? "Simpan & Kira Margin" : "Simpan & Masukkan Kos"}
        </>
      )}
    </button>
  );
}