/**
 * 文本分析路由模块
 *
 * 提供三个核心 API：
 * 1. POST /analyze - 分析文章，返回陌生词汇列表
 * 2. POST /explain - 获取单词的 AI 解释和分类
 * 3. POST /save - 保存选中的单词到词汇表
 *
 * 职责：
 * - 请求参数验证（Zod schema）
 * - 用户认证检查
 * - 调用 service 层处理业务逻辑
 * - 统一错误处理和响应格式
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../types/bindings";
import type { AppVariables } from "../types/variables";
import { ensureAuthenticated } from "../utils/session";
import {
  analyzeArticle,
  explainWordsByAi,
  classifyWordMeanings,
  saveWordMeanings,
  queryExistingMeanings,
} from "../service/text.service";
import { saveOrUpdateArticle } from "../service/article.service";
import {
  getUserId,
  successResponse,
  handleServiceError,
} from "../utils/route-helpers";
import { isFallbackData } from "../utils/ai-fallback";
import {
  getUserFriendlyMessage,
  classifyAIError,
} from "../utils/ai-error-handler";
import { quotaCheck } from "../middleware/quota-check.middleware";

/**
 * ============================================
 * 请求验证 Schema 定义
 * ============================================
 */

/**
 * POST /analyze - 分析文章
 */
const analyzeTextSchema = z.object({
  content: z.string().min(10, "文章内容至少需要10个字符"),
});

/**
 * POST /explain - 获取 AI 解释
 */
const explainWordsSchema = z.object({
  unfamiliarWords: z
    .array(
      z.object({
        word: z.string(), // 单词在文中的形式
        lemma: z.string(), // 单词原型（小写）
      })
    )
    .min(1, "至少需要一个陌生词"),
  articleContent: z.string().min(10, "需要提供文章内容"),
});

/**
 * POST /save - 保存单词
 */
const saveMeaningsSchema = z.object({
  words: z
    .array(
      z.object({
        word: z.string(), // 单词在文章中的形式（用于展示）
        lemma: z.string(), // 单词原型（用于保存到数据库）
        pos: z.string().optional(),
        meaningText: z.string(), // 在上下文中的含义（中文）
        exampleSentence: z.string(), // 单词在上下文中的句子（必填）
        isExisting: z.literal(false), // 必须是 false，不允许保存已掌握的含义
        type: z.enum(["new", "extend", "existing"]),
      })
    )
    .min(1, "至少需要一个单词"),
  articleContent: z.string().min(10, "需要提供文章内容"),
  articleTitle: z.string().optional(), // 可选的文章标题
});

/**
 * ============================================
 * 路由定义
 * ============================================
 */

export const textRoute = new Hono<{
  Bindings: Bindings;
  Variables: AppVariables;
}>()
  /**
   * POST /analyze - 分析文章
   *
   * 功能：使用 Google NLP 分析文章，返回陌生词汇列表
   *
   * 流程：
   * 1. 调用 Google NLP API 分析文本
   * 2. 根据用户词汇等级过滤陌生词
   * 3. 返回陌生词列表和统计信息
   */
  .post(
    "/analyze",
    zValidator("json", analyzeTextSchema), // 可以看成也是一种中间件
    quotaCheck, // 配额检查中间件，这是标准的中间件；
    async (c) => {
      // 认证检查
      const authError = ensureAuthenticated(c);
      if (authError) return authError;

      const session = c.get("session")!;
      const userId = getUserId(session);

      try {
        const { content } = c.req.valid("json");
        const db = c.get("db");
        const googleApiKey = c.env.GOOGLE_NLP_API_KEY;

        // 检查 API Key 配置
        if (!googleApiKey) {
          return c.json({ error: "Google NLP API Key 未配置" }, 500);
        }

        // 调用服务层分析文章
        const result = await analyzeArticle(db, userId, content, googleApiKey);

        // 返回结果
        return c.json(
          successResponse({
            unfamiliarWords: result.unfamiliarWords,
            totalWords: result.totalWords,
          })
        );
      } catch (error) {
        return handleServiceError(c, error, "文章分析失败，请稍后重试");
      }
    }
  )

  /**
   * POST /explain - 获取 AI 解释
   *
   * 功能：为陌生词汇生成 AI 解释，并分类为 new/extend/existing
   *
   * 流程：
   * 1. 查询用户已学过的含义
   * 2. 调用 AI 生成上下文相关的解释
   * 3. AI 判断是否为已掌握的含义（isExisting）
   * 4. 根据学习历史分类（new/extend/existing）
   * 5. 返回分类后的解释列表
   */
  .post("/explain", zValidator("json", explainWordsSchema), async (c) => {
    // 认证检查
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { unfamiliarWords, articleContent } = c.req.valid("json");
      const db = c.get("db");
      const apiKey = c.env.AIHUBMIX_API_KEY;

      // 检查 API Key 配置
      if (!apiKey) {
        return c.json({ error: "AI API Key 未配置" }, 500);
      }

      // 1. 查询已学习的含义
      const { newWords, wordsWithMeanings } = await queryExistingMeanings(
        unfamiliarWords,
        userId,
        db
      );

      // 2. 调用 AI 生成解释（传递所有陌生词汇用于降级方案）
      const aiExplanations = await explainWordsByAi(
        articleContent,
        newWords,
        wordsWithMeanings,
        apiKey,
        unfamiliarWords // 传递所有陌生词汇，用于降级方案
      );

      // 3. 检查是否为降级数据
      const isFallback = isFallbackData(aiExplanations);

      // 4. 分类（生成 type 字段：new/extend/existing）
      const classifiedMeanings = await classifyWordMeanings(
        aiExplanations,
        unfamiliarWords,
        userId,
        db
      );

      console.log("返回给前端的数据：", {
        count: classifiedMeanings.length,
        isFallback,
      });

      // 5. 返回结果（包含降级标记）
      return c.json(
        successResponse({
          results: classifiedMeanings,
          isFallback, // 标记是否为降级数据
        })
      );
    } catch (error) {
      // 处理 AI 错误，返回用户友好的消息
      const aiError = classifyAIError(error);
      const userMessage = getUserFriendlyMessage(aiError);
      return handleServiceError(c, new Error(userMessage), userMessage);
    }
  })

  /**
   * POST /save - 保存单词到词汇表
   *
   * 功能：保存用户选中的单词和含义到数据库
   *
   * 流程：
   * 1. 保存或更新文章记录（避免重复）
   * 2. 过滤 isExisting=true 的单词（已掌握，无需保存）
   * 3. 批量保存单词含义到 user_learned_meanings 表
   * 4. 返回保存结果统计
   *
   * 注意：文章保存失败不影响词汇保存
   */
  .post("/save", zValidator("json", saveMeaningsSchema), async (c) => {
    // 认证检查
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId = getUserId(session);

    try {
      const { words, articleContent, articleTitle } = c.req.valid("json");
      const db = c.get("db");

      // 1. 保存或更新文章记录
      const articleId = await saveOrUpdateArticle(db, userId, articleContent, {
        title: articleTitle,
        unfamiliarWordCount: words.length,
      });

      // 2. 转换前端格式为后端格式
      const classifiedMeanings = words.map((w) => ({
        word: w.word, // 单词在文章中的形式（用于展示）
        lemma: w.lemma.toLowerCase(), // 单词原型（用于保存到数据库）
        pos: w.pos,
        meaningText: w.meaningText, // 中文含义
        exampleSentence: w.exampleSentence, // 上下文中的句子
        type: w.type,
        isExisting: w.isExisting,
      }));

      // 3. 保存选中的词汇（后端会再次过滤 isExisting=true 的记录）
      const saveResult = await saveWordMeanings(
        classifiedMeanings,
        userId,
        articleId,
        db
      );

      // 4. 返回结果
      return c.json(
        successResponse({
          savedCount: saveResult.savedCount,
          totalCount: words.length,
          articleId,
        })
      );
    } catch (error) {
      return handleServiceError(c, error, "保存词汇失败，请稍后重试");
    }
  });

// 导出类型供前端使用
export type TextRouteType = typeof textRoute;
