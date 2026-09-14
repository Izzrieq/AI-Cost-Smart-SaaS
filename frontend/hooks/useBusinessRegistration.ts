// hooks/useBusinessRegistration.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export interface BusinessForm {
  name: string;
  description: string;
  type: string;
}

export function useBusinessRegistration() {
  const router = useRouter();
  const [form, setForm] = useState<BusinessForm>({
    name: "",
    description: "",
    type: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── handles field changes (accepts a string field name) ──
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.type) {
      setError("Sila lengkapkan semua maklumat.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/business`, {
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

  return {
    form,
    loading,
    error,
    handleChange,
    handleSubmit,
    router, // for back navigation
  };
}