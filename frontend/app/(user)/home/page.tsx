// app/home/page.tsx
"use client";

import { useHome } from "@/hooks/useHome";
import HomeView from "@/components/home/HomeView";
import "@/app/(user)/home/home.css";

export default function HomePage() {
  const {
    loading,
    user,
    business,
    stats,
    aiPrompt,
    setAiPrompt,
    aiResponse,
    aiLoading,
    getFirstName,
    formatRM,
    quote,
    marginStatus,
    hasProducts,
    marginVal,
    marginPercent,
    askAI,
    router,
  } = useHome();

  return (
    <HomeView
      loading={loading}
      user={user}
      business={business}
      stats={stats}
      aiPrompt={aiPrompt}
      setAiPrompt={setAiPrompt}
      aiResponse={aiResponse}
      aiLoading={aiLoading}
      getFirstName={getFirstName}
      formatRM={formatRM}
      quote={quote}
      marginStatus={marginStatus}
      hasProducts={hasProducts}
      marginVal={marginVal}
      marginPercent={marginPercent}
      askAI={askAI}
      router={router}
    />
  );
}