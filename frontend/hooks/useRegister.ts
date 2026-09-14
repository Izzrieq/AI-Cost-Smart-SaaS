// hooks/useRegister.ts
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/lib/firebase";

export function useRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isInviteValid, setIsInviteValid] = useState<boolean | null>(null);
  const [verifyingInvite, setVerifyingInvite] = useState(true);

  // Get invite params from URL
  useEffect(() => {
    const token = searchParams.get("invite");
    const business = searchParams.get("business");
    if (token && business) {
      setInviteToken(token);
      setBusinessId(business);
      verifyInvite(token, business);
    } else {
      setVerifyingInvite(false);
    }
  }, [searchParams]);

  const verifyInvite = async (token: string, business: string) => {
    try {
      const res = await axios.get(`${API_URL}/invites/verify`, {
        params: { token, business },
      });
      if (res.data.valid) {
        setIsInviteValid(true);
        toast.success("Pautan jemputan sah! Sila daftar sebagai staff.");
      } else {
        setIsInviteValid(false);
        toast.error("Pautan tidak sah atau sudah tamat tempoh.");
      }
    } catch {
      setIsInviteValid(false);
      toast.error("Pautan jemputan tidak sah.");
    } finally {
      setVerifyingInvite(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Semua ruangan perlu diisi.");
      return;
    }
    if (password.length < 6) {
      toast.error("Kata laluan mesti sekurang-kurangnya 6 aksara.");
      return;
    }
    setLoading(true);
    try {
      const payload: any = { name, email, password };
      if (inviteToken && businessId && isInviteValid) {
        payload.inviteToken = inviteToken;
        payload.businessId = businessId;
      }
      const res = await axios.post(`${API_URL}/register`, payload);
      toast.success(
        res.data.user.role === "staff"
          ? "Anda berjaya didaftarkan sebagai staff!"
          : "Akaun berjaya dicipta!"
      );
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      let message = "Ralat server. Sila cuba lagi.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      let payload: any = { token: idToken };
      if (inviteToken && businessId && isInviteValid) {
        payload.inviteToken = inviteToken;
        payload.businessId = businessId;
      }
      const res = await axios.post(`${API_URL}/auth/google`, payload);
      const user = res.data.user;
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      toast.success(
        user.role === "staff"
          ? "Staff berjaya didaftarkan!"
          : "Akaun berjaya dibuat!"
      );
      setTimeout(() => {
        if (user.role === "admin") router.push("/dashboard");
        else if (user.role === "staff") router.push("/staff-dashboard");
        else router.push("/home");
      }, 500);
    } catch (err) {
      console.error(err);
      let message = "Google sign-up gagal";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    // form state
    name, setName,
    email, setEmail,
    password, setPassword,
    loading,
    showPassword, setShowPassword,
    // invite state
    inviteToken,
    isInviteValid,
    verifyingInvite,
    // handlers
    handleRegister,
    handleGoogleRegister,
  };
}