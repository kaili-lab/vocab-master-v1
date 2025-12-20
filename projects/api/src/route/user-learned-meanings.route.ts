/**
 * 用户学习单词路由模块
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../types/bindings";
import type { AppVariables } from "../types/variables";
import { ensureAuthenticated } from "../utils/session";
import {
  addLearningWord,
  updateLearningWord,
  removeLearningWord,
  getUserLearningWordsList,
} from "../service/user-learned-meanings.service";
import {
  getUserId,
  successResponse,
  handleServiceError,
} from "../utils/route-helpers";

/**
 * ============================================
 * 响应类型定义（供前端 TypeScript 使用）
 * ============================================
 */

export type LearningWordItem = {
  id: number;
  word: string;
  meaningText: string;
  pos: string | null;
  exampleSentence: string | null;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: Date | null;
  lastReviewedAt: Date | null;
  totalReviews: number;
  createdAt: Date;
};

export type GetLearningWordsListResponse = {
  success: true;
  data: {
    words: LearningWordItem[];
    count: number;
  };
};

export type AddLearningWordResponse = {
  success: true;
  data: {
    id: number;
    message: string;
  };
};

export type UpdateLearningWordResponse = {
  success: true;
  data: {
    message: string;
  };
};

export type RemoveLearningWordResponse = {
  success: true;
  data: {
    message: string;
  };
};

/**
 * ============================================
 * 请求验证 Schema 定义
 * ============================================
 */

const addLearningWordSchema = z.object({
  word: z.string().min(1, "单词不能为空"),
  meaningText: z.string().min(1, "含义不能为空"),
  pos: z.string().optional(),
  exampleSentence: z.string().optional(),
});

const updateLearningWordSchema = z.object({
  id: z.number().positive("ID必须为正整数"),
  word: z.string().min(1, "单词不能为空"),
  meaningText: z.string().min(1, "含义不能为空"),
});

const removeLearningWordSchema = z.object({
  id: z.number().positive("ID必须为正整数"),
});

/**
 * ============================================
 * 路由定义
 * ============================================
 */

export const userLearningWordsRoute = new Hono<{
  Bindings: Bindings;
  Variables: AppVariables;
}>()
  .post("/add", zValidator("json", addLearningWordSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { word, meaningText, pos, exampleSentence } = c.req.valid("json");
      const db = c.get("db");

      const id = await addLearningWord(db, userId, word, meaningText, {
        pos,
        exampleSentence,
      });

      return c.json(
        successResponse({
          id,
          message: "成功添加到学习列表",
        })
      );
    } catch (error) {
      return handleServiceError(c, error, "添加学习单词失败");
    }
  })

  .put("/update", zValidator("json", updateLearningWordSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { id, word, meaningText } = c.req.valid("json");
      const db = c.get("db");

      await updateLearningWord(db, userId, id, word, meaningText);

      return c.json(
        successResponse({
          message: "成功更新学习单词",
        })
      );
    } catch (error) {
      return handleServiceError(c, error, "更新学习单词失败");
    }
  })

  .delete(
    "/remove",
    zValidator("json", removeLearningWordSchema),
    async (c) => {
      const authError = ensureAuthenticated(c);
      if (authError) return authError;

      const session = c.get("session")!;
      const userId = getUserId(session);

      try {
        const { id } = c.req.valid("json");
        const db = c.get("db");

        await removeLearningWord(db, userId, id);

        return c.json(
          successResponse({
            message: "成功从学习列表中移除",
          })
        );
      } catch (error) {
        return handleServiceError(c, error, "删除学习单词失败");
      }
    }
  )

  .get("/list", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const db = c.get("db");
      const sortOrder = c.req.query("sort") as "asc" | "desc" | undefined;
      const words = await getUserLearningWordsList(
        db,
        userId,
        sortOrder || "desc"
      );

      return c.json(
        successResponse({
          words,
          count: words.length,
        })
      );
    } catch (error) {
      return handleServiceError(c, error, "查询学习单词失败");
    }
  });
