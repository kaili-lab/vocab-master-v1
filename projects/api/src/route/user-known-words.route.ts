/**
 * 用户已认知词汇路由模块
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../types/bindings";
import type { AppVariables } from "../types/variables";
import { ensureAuthenticated } from "../utils/session";
import {
  addKnownWord,
  updateKnownWord,
  removeKnownWord,
  getUserKnownWordsList,
} from "../service/user-known-words.service";
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

export type KnownWordItem = {
  id: number;
  word: string;
  lemma: string;
  createdAt: Date;
};

export type GetKnownWordsListResponse = {
  success: true;
  data: {
    words: KnownWordItem[];
    count: number;
  };
};

export type AddKnownWordResponse = {
  success: true;
  data: {
    id?: number;
    message: string;
    alreadyExists?: boolean;
  };
};

export type RemoveKnownWordResponse = {
  success: true;
  data: {
    message: string;
  };
};

export type UpdateKnownWordResponse = {
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

const addKnownWordSchema = z.object({
  word: z.string().min(1, "单词不能为空"),
  lemma: z.string().optional(),
  note: z.string().optional(),
});

const removeKnownWordSchema = z.object({
  lemma: z.string().min(1, "词根不能为空"),
});

const updateKnownWordSchema = z.object({
  id: z.number().positive("ID必须为正整数"),
  word: z.string().min(1, "单词不能为空"),
  lemma: z.string().optional(),
});

/**
 * ============================================
 * 路由定义
 * ============================================
 */

export const userKnownWordsRoute = new Hono<{
  Bindings: Bindings;
  Variables: AppVariables;
}>()
  .post("/add", zValidator("json", addKnownWordSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { word, lemma } = c.req.valid("json");
      const db = c.get("db");

      // 如果没有提供lemma，使用word作为lemma
      const finalLemma = lemma && lemma.trim() ? lemma : word;
      const id = await addKnownWord(db, userId, word, finalLemma);

      if (id === null) {
        return c.json(
          successResponse({
            message: "该词汇已在已认知列表中",
            alreadyExists: true,
          })
        );
      }

      return c.json(
        successResponse({
          id,
          message: "成功添加到已认知词汇",
        })
      );
    } catch (error) {
      return handleServiceError(c, error, "添加已认知词汇失败");
    }
  })

  .put("/update", zValidator("json", updateKnownWordSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { id, word, lemma } = c.req.valid("json");
      const db = c.get("db");

      // 如果没有提供lemma，使用word作为lemma
      const finalLemma = lemma && lemma.trim() ? lemma : word;
      await updateKnownWord(db, userId, id, word, finalLemma);

      return c.json(
        successResponse({
          message: "成功更新已认知词汇",
        })
      );
    } catch (error) {
      return handleServiceError(c, error, "更新已认知词汇失败");
    }
  })

  .delete("/remove", zValidator("json", removeKnownWordSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { lemma } = c.req.valid("json");
      const db = c.get("db");

      await removeKnownWord(db, userId, lemma);

      return c.json(
        successResponse({
          message: "成功从已认知词汇中移除",
        })
      );
    } catch (error) {
      return handleServiceError(c, error, "删除已认知词汇失败");
    }
  })

  .get("/list", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const db = c.get("db");
      const sortOrder = c.req.query("sort") as "asc" | "desc" | undefined;
      const words = await getUserKnownWordsList(
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
      return handleServiceError(c, error, "查询已认知词汇失败");
    }
  });
