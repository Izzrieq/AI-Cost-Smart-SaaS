// app/daftar-perniagaan/page.tsx
"use client";

import { useBusinessRegistration } from "@/hooks/useBusinessRegistration";
import RegisterBusinessForm from "@/components/business/RegisterbusinessForm";
import "@/app/(user)/daftar-perniagaan/daftar-perniagaan.css"; // optional if already in the component

export default function DaftarPerniagaanPage() {
  const { form, loading, error, handleChange, handleSubmit, router } =
    useBusinessRegistration();

  return (
    <RegisterBusinessForm
      form={form}
      loading={loading}
      error={error}
      onFieldChange={handleChange}
      onSubmit={handleSubmit}
      onBack={() => router.back()}
    />
  );
}