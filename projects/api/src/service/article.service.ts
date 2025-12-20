/**
 * 文章管理服务模块
 *
 * 职责：
 * 1. 保存和更新用户阅读的文章记录
 * 2. 查询文章历史
 * 3. 关联文章与学习的单词
 *
 * 核心功能：
 * - 避免重复保存相同内容的文章
 * - 自动更新文章的最后阅读时间
 * - 统计文章的单词数和陌生词数
 */

import { type DB } from "../db/db";
import { articles } from "../db/schema";
import { sql } from "drizzle-orm";

/**
 * 保存或更新文章记录
 *
 * 逻辑：
 * 1. 先查找是否已存在相同内容的文章（同一用户）
 * 2. 如果存在：更新最后阅读时间
 * 3. 如果不存在：创建新文章记录
 *
 * 避免重复：通过 userId + content 判断文章是否已存在
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param content - 文章内容（用于判断是否重复）
 * @param options - 可选参数
 * @param options.title - 文章标题（可选）
 * @param options.unfamiliarWordCount - 陌生词数量（可选）
 * @returns 文章 ID，如果保存失败返回 null
 */
export async function saveOrUpdateArticle(
  db: DB,
  userId: number,
  content: string,
  options?: {
    title?: string;
    unfamiliarWordCount?: number;
  }
): Promise<number | null> {
  try {
    // 1. 查找是否已有相同内容的文章
    const existingArticle = await db
      .select({ id: articles.id })
      .from(articles)
      .where(
        sql`${articles.userId} = ${userId} AND ${articles.content} = ${content}`
      )
      .limit(1);

    if (existingArticle.length > 0) {
      // 2. 文章已存在：更新最后阅读时间
      const articleId = existingArticle[0].id;
      await db
        .update(articles)
        .set({
          lastReadAt: new Date(),
          updatedAt: new Date(),
        })
        .where(sql`${articles.id} = ${articleId}`);

      console.log(`更新现有文章记录: articleId=${articleId}`);
      return articleId;
    } else {
      // 3. 文章不存在：创建新记录
      const wordCount = calculateWordCount(content);

      const [newArticle] = await db
        .insert(articles)
        .values({
          userId,
          title: options?.title || null,
          content,
          wordCount,
          unfamiliarWordCount: options?.unfamiliarWordCount || 0,
          analyzedAt: new Date(),
          lastReadAt: new Date(),
        })
        .returning({ id: articles.id });

      console.log(`创建新文章记录: articleId=${newArticle.id}`);
      return newArticle.id;
    }
  } catch (error) {
    // 文章保存失败不应该影响词汇保存流程
    // 记录错误日志，返回 null 让调用方决定如何处理
    console.error("保存文章失败:", error);
    return null;
  }
}

/**
 * 计算文章单词数
 *
 * 简单统计：按空白字符分割，过滤空字符串
 * 注意：这是简化版本，不考虑标点符号等细节
 *
 * @param content - 文章内容
 * @returns 单词数量
 */
function calculateWordCount(content: string): number {
  return content.split(/\s+/).filter((word) => word.trim().length > 0).length;
}
