import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { extractApiData } from "@/utils/api-helpers";

export interface QuotaInfo {
  tier: "free" | "premium";
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  maxArticleWords: number;
}

export function useQuota() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await extractApiData<{ success: true; data: QuotaInfo }>(
        apiClient.api.users.me.quota.$get()
      );
      setQuota(data);
    } catch (err) {
      console.error("Failed to fetch quota:", err);
      setError("获取配额信息失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  return {
    quota,
    isLoading,
    error,
    refetch: fetchQuota,
  };
}
