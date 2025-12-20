import { useState, useEffect } from "react";
import FlipCard from "./FlipCard";
import AnswerButtons from "./AnswerButtons";
import { showToastInfo, showToastError } from "@/utils/toast";
import { apiClient } from "@/lib/api-client";
import type { DifficultyRating, CompleteStats } from "@/types/review";
import { extractApiData, getErrorMessage } from "@/utils/api-helpers";
import type {
  GetNextCardResponse,
  SubmitAnswerResponse,
  // SkipCardResponse,
} from "../../../../api/src/route/review.route";

interface ReviewSessionProps {
  initialTotalCards: number;
  onExit: () => void;
  onComplete: (stats: CompleteStats) => void;
}

export default function ReviewSession({
  initialTotalCards,
  onExit,
  onComplete,
}: ReviewSessionProps) {
  const [currentCard, setCurrentCard] =
    useState<GetNextCardResponse["data"]["card"]>(null);
  const [showAnswerButtons, setShowAnswerButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 会话统计
  const [reviewedCount, setReviewedCount] = useState(0);
  const [ratingStats, setRatingStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // 加载第一张卡片
  useEffect(() => {
    loadNextCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 计算进度
  // const current = reviewedCount + 1;
  const total = initialTotalCards;
  const progress = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

  // 加载下一张卡片
  const loadNextCard = async () => {
    setIsLoading(true);
    try {
      // ✅ 使用 extractApiData，类型自动推断
      const data = await extractApiData<GetNextCardResponse>(
        apiClient.api.review.next.$get()
      );

      if (data.card) {
        setCurrentCard(data.card);
        setShowAnswerButtons(false);
      } else {
        // 没有更多卡片，复习完成
        handleComplete();
      }
    } catch (error) {
      console.error("加载卡片失败:", getErrorMessage(error));
      showToastError("加载失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 退出复习会话
  const handleExit = async () => {
    try {
      // 保存进度
      const correctCount =
        ratingStats.hard + ratingStats.good + ratingStats.easy;
      await apiClient.api.review.exit.$post({
        json: {
          reviewedCount,
          correctCount,
        },
      });
      showToastInfo("已保存进度");
    } catch (error) {
      console.error("保存进度失败:", error);
    } finally {
      onExit();
    }
  };

  // 跳过当前卡片
  // const handleSkip = async () => {
  //   if (!currentCard) return;

  //   try {
  //     // ✅ 使用 extractApiData，类型自动推断
  //     const data = await extractApiData<SkipCardResponse>(
  //       apiClient.api.review.skip.$post()
  //     );

  //     if (data.nextCard) {
  //       setCurrentCard(data.nextCard);
  //       setShowAnswerButtons(false);
  //       showToastInfo("已跳过");
  //     } else {
  //       handleComplete();
  //     }
  //   } catch (error) {
  //     console.error("跳过失败:", getErrorMessage(error));
  //     showToastError("跳过失败，请重试");
  //   }
  // };

  // 卡片翻转时显示答题按钮
  const handleCardFlip = () => {
    setShowAnswerButtons(true);
  };

  // 提交答案
  const handleAnswer = async (rating: DifficultyRating) => {
    if (!currentCard) return;

    try {
      // ✅ 使用 extractApiData，类型自动推断
      const data = await extractApiData<SubmitAnswerResponse>(
        apiClient.api.review.answer.$post({
          json: {
            cardId: currentCard.id,
            rating,
          },
        })
      );

      // 更新统计
      setReviewedCount((prev) => prev + 1);
      setRatingStats((prev) => ({
        ...prev,
        [rating]: prev[rating] + 1,
      }));

      // 获取下一张卡片
      if (data.nextCard) {
        setCurrentCard(data.nextCard);
        setShowAnswerButtons(false);
      } else {
        // 没有更多卡片，复习完成
        setTimeout(() => {
          handleComplete();
        }, 300);
      }
    } catch (error) {
      console.error("提交答案失败:", getErrorMessage(error));
      showToastError("提交失败，请重试");
    }
  };

  // 复习完成
  const handleComplete = () => {
    onComplete({
      totalReviewed: reviewedCount,
      again: ratingStats.again,
      hard: ratingStats.hard,
      good: ratingStats.good,
      easy: ratingStats.easy,
    });
  };

  if (isLoading || !currentCard) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">
            {isLoading ? "加载中..." : "加载失败"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleExit}
          className="px-6 py-3 rounded-xl hover:scale-105 transition-transform font-medium bg-card border border-border"
        >
          ← 退出
        </button>

        {/* <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">
            <span className="text-primary">{current}</span>
            <span className="text-muted-foreground"> / {total}</span>
          </div>
          <button
            onClick={handleSkip}
            className="px-6 py-3 rounded-xl hover:scale-105 transition-transform font-medium bg-card border border-border"
          >
            跳过 →
          </button>
        </div> */}
      </div>

      {/* 进度条 */}
      <div className="mb-8">
        <div className="h-2 rounded-full overflow-hidden bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500 bg-linear-to-r from-primary to-primary/80"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* 卡片 */}
      <div className="mb-8">
        <FlipCard cardData={currentCard} onFlip={handleCardFlip} />
      </div>

      {/* 答题按钮 */}
      {showAnswerButtons && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <AnswerButtons onAnswer={handleAnswer} />
        </div>
      )}
    </div>
  );
}
