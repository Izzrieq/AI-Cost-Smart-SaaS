// hooks/useAuth.ts
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/lib/firebase";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const emailLogin = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) {
      toast.error("Email and password are required");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      if (!res.data?.token) {
        toast.error("Login failed");
        return false;
      }
      const user = res.data.user;
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      toast.success("Login successful");

      // Redirect after a short delay
      setTimeout(() => {
        if (user.role === "admin") router.push("/dashboard");
        else if (user.role === "staff") router.push("/staff-dashboard");
        else router.push("/home");
      }, 500);
      return true;
    } catch (err) {
      let message = "Server error. Try again.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const res = await axios.post(`${API_URL}/auth/google`, { token: idToken });
      const user = res.data.user;
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      toast.success("Google login successful");
      router.push(user.role === "admin" ? "/dashboard" : "/home");
    } catch (err: unknown) {
      console.error(err);
      if (typeof err === "object" && err !== null && "code" in err) {
        const errorCode = (err as { code: string }).code;
        if (errorCode === "auth/popup-closed-by-user") {
          toast("Popup ditutup", { icon: "ℹ️" }); // Fixed from "i" to "ℹ️"
          return;
        }
        if (errorCode === "auth/popup-blocked") {
          toast.error("Popup disekat. Benarkan popup untuk laman ini.");
          return;
        }
      }
      let message = "Google login failed";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, emailLogin, googleLogin };
}