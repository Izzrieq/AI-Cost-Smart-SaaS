"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const businessTypes = [
  { value: "home", label: "Perniagaan Rumah", icon: "🏠", desc: "Beroperasi dari rumah" },
  { value: "stall", label: "Gerai / Kedai", icon: "🏪", desc: "Gerai atau kedai fizikal" },
];

export default function DaftarPerniagaanPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.type) {
      setError("Sila lengkapkan semua maklumat.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Ralat berlaku. Cuba lagi.");
        return;
      }

      router.push("/home");
    } catch (err) {
      setError("Tidak dapat sambung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Kembali
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Daftar Perniagaan</h1>
        <p className="text-sm text-gray-500 mt-1">Lengkapkan maklumat perniagaan anda</p>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">

        {/* Nama Perniagaan */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Nama Perniagaan
          </label>
          <input
            type="text"
            placeholder="cth: Kuih Mak Teh"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full text-sm text-gray-900 placeholder-gray-300 outline-none bg-transparent"
          />
        </div>

        {/* Penerangan */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Penerangan Perniagaan
          </label>
          <textarea
            placeholder="cth: Menjual pelbagai jenis kuih tradisional..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full text-sm text-gray-900 placeholder-gray-300 outline-none bg-transparent resize-none"
          />
        </div>

        {/* Jenis Perniagaan */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block px-1">
            Jenis Perniagaan
          </label>
          <div className="grid grid-cols-2 gap-3">
            {businessTypes.map((type) => {
              const selected = form.type === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setForm({ ...form, type: type.value })}
                  className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    selected
                      ? "border-[#2563eb] bg-[#eff6ff]"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className={`text-sm font-semibold mb-0.5 ${selected ? "text-[#2563eb]" : "text-gray-900"}`}>
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-400">{type.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#2563eb] text-white py-4 rounded-2xl text-sm font-semibold disabled:opacity-60 active:opacity-80 transition-opacity"
        >
          {loading ? "Mendaftar..." : "Daftar Perniagaan"}
        </button>

      </div>
    </div>
  );
}