// hooks/useHome.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface Business {
  business_id: string;
  user_id: string;
  name: string;
  description: string;
  type: string;
  created_at: string;
}

interface HomeStats {
  hasBusiness: boolean;
  business_id?: string;
  totalKos: number;
  marginPurata: number;
  totalProducts: number;
  latestProducts: { name: string; selling_price: number; margin_percentage: number }[];
}

export function useHome() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ─── Fetch data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [userRes, businessRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/business`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/home/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!userRes.ok) {
          router.push("/login");
          return;
        }

        const userData = await userRes.json();
        const businessData = await businessRes.json();
        const statsData = await statsRes.json();

        setUser(userData.user);
        setBusiness(businessData.business);
        setStats(statsData);
      } catch (err) {
        console.error("Fetch error:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ─── AI function ─────────────────────────────────────────────────────────
  const askAI = async (question: string) => {
    if (!question.trim()) return;

    setAiPrompt(question);
    setAiLoading(true);
    setAiResponse("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question,
          stats: {
            totalProducts: stats?.totalProducts || 0,
            marginPurata: stats?.marginPurata || 0,
            totalKos: stats?.totalKos || 0,
          },
          products: stats?.latestProducts || [],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setAiResponse(errorData.reply || "Maaf, berlaku ralat.");
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setAiResponse("Maaf, tidak dapat membaca respons.");
        setAiLoading(false);
        return;
      }

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              setAiResponse(accumulated);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
      setAiLoading(false);
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse("Maaf, berlaku ralat. Sila cuba sebentar lagi.");
      setAiLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getFirstName = () => (user ? user.name.split(" ")[0] : "");
  const formatRM = (val: number) =>
    `RM ${val.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getMarginStatus = (margin: number) => {
    if (margin === 0) return { label: "Tiada Rekod", bg: "#f3f4f6", text: "#9ca3af", bar: "#e5e7eb" };
    if (margin >= 30) return { label: "Sihat", bg: "#f0fdf4", text: "#16a34a", bar: "#4ade80" };
    if (margin >= 15) return { label: "Sederhana", bg: "#fffbeb", text: "#d97706", bar: "#fbbf24" };
    return { label: "Rendah", bg: "#fef2f2", text: "#ef4444", bar: "#f87171" };
  };

  const quotes = [
    "Smart Cost. Turning Numbers Into Growth.",
    "Kawal kos, tingkatkan untung.",
    "Setiap sen yang dijimatkan adalah keuntungan.",
    "Perniagaan bijak bermula dengan kos yang terkawal.",
  ];
  const quote = quotes[new Date().getDay() % quotes.length];

  const marginStatus = getMarginStatus(stats?.marginPurata ?? 0);
  const hasProducts = (stats?.totalProducts ?? 0) > 0;
  const marginVal = stats?.marginPurata ?? 0;
  const marginPercent = Math.min(marginVal, 100);

  return {
    // state
    user,
    business,
    stats,
    loading,
    aiPrompt,
    setAiPrompt,
    aiResponse,
    aiLoading,
    // helpers
    getFirstName,
    formatRM,
    getMarginStatus,
    quote,
    marginStatus,
    hasProducts,
    marginVal,
    marginPercent,
    // actions
    askAI,
    router,
  };
}