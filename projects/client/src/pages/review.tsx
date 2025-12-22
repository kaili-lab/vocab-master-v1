import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import ReviewEntrance from "@/components/review/ReviewEntrance";
import ReviewSession from "@/components/review/ReviewSession";
import ReviewComplete from "@/components/review/ReviewComplete";
import { apiClient } from "@/lib/api-client";
import type { CompleteStats } from "@/types/review";
import { extractApiData, getErrorMessage } from "@/utils/api-helpers";
import type { ReviewStatsResponse } from "../../../api/src/route/review.route";

type ReviewPage = "entrance" | "session" | "complete";

export default function ReviewPage() {
  const [currentPage, setCurrentPage] = useState<ReviewPage>("entrance");
  const [stats, setStats] = useState<ReviewStatsResponse["data"] | null>(null);
  const [completeStats, setCompleteStats] = useState<CompleteStats>({
    totalReviewed: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 加载复习统计数据
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // ✅ 使用 extractApiData，类型自动推断
      const stats = await extractApiData<ReviewStatsResponse>(
        apiClient.api.review.stats.$get()
      );
      setStats(stats);
    } catch (error) {
      console.error("加载统计失败:", getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteReview = (sessionCompleteStats: CompleteStats) => {
    setCompleteStats(sessionCompleteStats);
    setCurrentPage("complete");
  };

  const handleBackToEntrance = () => {
    setCurrentPage("entrance");
    loadStats(); // 重新加载统计数据
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-linear-to-br from-background to-muted p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-muted-foreground">加载中...</div>
          </div>
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-linear-to-br from-background to-muted p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-muted-foreground">
              加载失败，请刷新重试
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-linear-to-br from-background to-muted p-4 md:p-8">
        {currentPage === "entrance" && (
          <ReviewEntrance
            stats={stats}
            onStartReview={() => setCurrentPage("session")}
          />
        )}

        {currentPage === "session" && (
          <ReviewSession
            initialTotalCards={stats.todayDue}
            onExit={handleBackToEntrance}
            onComplete={handleCompleteReview}
          />
        )}

        {currentPage === "complete" && (
          <ReviewComplete
            stats={completeStats}
            onBackToEntrance={handleBackToEntrance}
          />
        )}
      </div>
    </>
  );
}
