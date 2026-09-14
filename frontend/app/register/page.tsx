// app/register/page.tsx
"use client";

import { Suspense } from "react";
import { useRegister } from "@/hooks/useRegister";
import RegisterForm from "@/components/auth/RegisterForm";

function RegisterContent() {
  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    showPassword,
    setShowPassword,
    inviteToken,
    isInviteValid,
    verifyingInvite,
    handleRegister,
    handleGoogleRegister,
  } = useRegister();

  return (
    <RegisterForm
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      loading={loading}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      inviteToken={inviteToken}
      isInviteValid={isInviteValid}
      verifyingInvite={verifyingInvite}
      onSubmit={handleRegister}
      onGoogleRegister={handleGoogleRegister}
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#d6eeff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Plus Jakarta Sans, sans-serif",
          }}
        >
          Loading...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}