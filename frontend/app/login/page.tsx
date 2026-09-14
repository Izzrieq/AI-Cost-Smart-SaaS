"use client";

import { useAuth } from "@/hooks/useAuth";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const { loading, emailLogin, googleLogin } = useAuth();
  
  return (
    <LoginForm
      loading={loading}
      onEmailLogin={emailLogin}
      onGoogleLogin={googleLogin}
    />
  );
}