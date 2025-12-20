/**
 * 复习系统路由模块
 *
 * 提供五个核心 API：
 * 1. GET /stats - 获取复习统计数据
 * 2. GET /next - 获取下一张待复习卡片
 * 3. POST /answer - 提交答案并更新复习算法
 * 4. POST /skip - 跳过当前卡片（简单方案，不更新数据库）
 * 5. POST /exit - 退出复习会话并更新统计
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../types/bindings";
import type { AppVariables } from "../types/variables";
import { ensureAuthenticated } from "../utils/session";
import {
  getReviewStats,
  getNextCard,
  submitAnswer,
  updateDailyStats,
} from "../service/review.service";
import {
  getUserId,
  successResponse,
  handleServiceError,
} from "../utils/route-helpers";
import type { ReviewStats, CardData } from "../service/review.service";

/**
 * ============================================
 * 响应类型定义（供前端 TypeScript 使用）
 * ============================================
 */

/**
 * GET /stats - 复习统计响应
 */
export type ReviewStatsResponse = {
  success: true;
  data: ReviewStats;
};

/**
 * GET /next - 获取下一张卡片响应
 */
export type GetNextCardResponse = {
  success: true;
  data: {
    card: CardData | null;
  };
};

/**
 * POST /answer - 提交答案响应
 */
export type SubmitAnswerResponse = {
  success: true;
  data: {
    nextCard: CardData | null;
  };
};

/**
 * POST /skip - 跳过卡片响应
 */
export type SkipCardResponse = {
  success: true;
  data: {
    nextCard: CardData | null;
  };
};

/**
 * POST /exit - 退出会话响应
 */
export type ExitSessionResponse = {
  success: true;
  data: {
    success: true;
  };
};

/**
 * ============================================
 * 请求验证 Schema 定义
 * ============================================
 */

/**
 * POST /answer - 提交答案
 */
const answerSchema = z.object({
  cardId: z.number().int().positive(),
  rating: z.enum(["again", "hard", "good", "easy"]),
});

/**
 * POST /exit - 退出会话
 */
const exitSchema = z.object({
  reviewedCount: z.number().int().min(0), // 本次会话复习数量
  correctCount: z.number().int().min(0), // 本次会话答对数量
});

/**
 * ============================================
 * 路由定义
 * ============================================
 */

export const reviewRoute = new Hono<{
  Bindings: Bindings;
  Variables: AppVariables;
}>()
  /**
   * GET /stats - 获取复习统计数据
   *
   * 返回：
   * - todayDue: 今日待复习数量
   * - newCards: 新卡片数量
   * - learning: 学习中数量
   * - reviewing: 复习中数量
   * - totalVocab: 总词汇量
   * - completedToday: 今日已完成数量
   */
  .get("/stats", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const db = c.get("db");
      const stats = await getReviewStats(db, userId);

      return c.json(successResponse(stats));
    } catch (error) {
      return handleServiceError(c, error, "获取统计数据失败");
    }
  })

  /**
   * GET /next - 获取下一张待复习卡片
   *
   * 返回：
   * - CardData 或 null（无待复习卡片）
   */
  .get("/next", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const db = c.get("db");
      const card = await getNextCard(db, userId);

      return c.json(successResponse({ card }));
    } catch (error) {
      return handleServiceError(c, error, "获取卡片失败");
    }
  })

  /**
   * POST /answer - 提交答案并更新复习算法
   *
   * 流程：
   * 1. 使用 Anki 算法更新卡片状态
   * 2. 更新每日学习统计
   * 3. 返回下一张卡片
   *
   * 请求体：
   * - cardId: 卡片 ID
   * - rating: 难度评级（again/hard/good/easy）
   *
   * 返回：
   * - nextCard: 下一张卡片或 null
   */
  .post("/answer", zValidator("json", answerSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { cardId, rating } = c.req.valid("json");
      const db = c.get("db");

      // 1. 提交答案并更新卡片状态
      const success = await submitAnswer(db, userId, cardId, rating);

      if (!success) {
        return c.json({ error: "卡片不存在或无权限" }, 404);
      }

      // 2. 更新每日统计（异步，不阻塞响应）
      const correctCount = rating !== "again" ? 1 : 0;
      updateDailyStats(db, userId, 1, correctCount).catch((err) => {
        console.error("更新每日统计失败:", err);
      });

      // 3. 获取下一张卡片
      const nextCard = await getNextCard(db, userId);

      return c.json(successResponse({ nextCard }));
    } catch (error) {
      return handleServiceError(c, error, "提交答案失败");
    }
  })

  /**
   * POST /skip - 跳过当前卡片
   *
   * 简单方案：不更新数据库，只返回下一张卡片
   * 被跳过的卡片保持原 nextReviewDate，下次复习时仍会出现
   *
   * 请求体：无需参数（跳过不需要记录）
   *
   * 返回：
   * - nextCard: 下一张卡片或 null
   */
  .post("/skip", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const db = c.get("db");

      // 直接获取下一张卡片（不更新任何数据）
      const nextCard = await getNextCard(db, userId);

      return c.json(successResponse({ nextCard }));
    } catch (error) {
      return handleServiceError(c, error, "跳过卡片失败");
    }
  })

  /**
   * POST /exit - 退出复习会话并更新统计
   *
   * 用于记录本次会话的学习数据，更新 userLearningStats 表
   *
   * 请求体：
   * - reviewedCount: 本次会话复习数量
   * - correctCount: 本次会话答对数量
   *
   * 返回：
   * - success: true
   */
  .post("/exit", zValidator("json", exitSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { reviewedCount, correctCount } = c.req.valid("json");
      const db = c.get("db");

      // 更新每日统计
      if (reviewedCount > 0) {
        await updateDailyStats(db, userId, reviewedCount, correctCount);
      }

      return c.json(successResponse({ success: true }));
    } catch (error) {
      return handleServiceError(c, error, "保存进度失败");
    }
  });

// 导出类型（用于 Hono RPC）
export type ReviewRouteType = typeof reviewRoute;
