/**
 * 用户学习单词服务模块
 *
 * 职责：
 * 1. 添加/删除/更新用户正在学习的单词
 * 2. 查询用户的学习单词列表
 * 3. 管理单词的复习记录和进度
 */

import { type DB } from "../db/db";
import { userLearnedMeanings } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

/**
 * 添加单词到用户学习列表
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param word - 单词原形
 * @param meaningText - 含义解释
 * @param options - 可选字段
 * @returns 添加的记录 ID
 */
export async function addLearningWord(
  db: DB,
  userId: number,
  word: string,
  meaningText: string,
  options?: {
    wordInText?: string;
    pos?: string;
    exampleSentence?: string;
    sourceTextId?: number;
  }
): Promise<number> {
  try {
    const [result] = await db
      .insert(userLearnedMeanings)
      .values({
        userId,
        word: word.toLowerCase(),
        meaningText,
        wordInText: options?.wordInText,
        pos: options?.pos,
        exampleSentence: options?.exampleSentence,
        sourceTextId: options?.sourceTextId,
      })
      .returning({ id: userLearnedMeanings.id });

    return result.id;
  } catch (error) {
    console.error("添加学习单词失败:", error);
    throw new Error("添加学习单词失败");
  }
}

/**
 * 更新学习单词
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param id - 记录 ID
 * @param word - 单词原形
 * @param meaningText - 含义解释
 * @returns 是否更新成功
 */
export async function updateLearningWord(
  db: DB,
  userId: number,
  id: number,
  word: string,
  meaningText: string
): Promise<boolean> {
  try {
    await db
      .update(userLearnedMeanings)
      .set({
        word: word.toLowerCase(),
        meaningText,
      })
      .where(
        and(
          eq(userLearnedMeanings.id, id),
          eq(userLearnedMeanings.userId, userId)
        )
      );

    return true;
  } catch (error) {
    console.error("更新学习单词失败:", error);
    throw error;
  }
}

/**
 * 删除学习单词
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param id - 记录 ID
 * @returns 是否删除成功
 */
export async function removeLearningWord(
  db: DB,
  userId: number,
  id: number
): Promise<boolean> {
  try {
    await db
      .delete(userLearnedMeanings)
      .where(
        and(
          eq(userLearnedMeanings.id, id),
          eq(userLearnedMeanings.userId, userId)
        )
      );

    return true;
  } catch (error) {
    console.error("删除学习单词失败:", error);
    throw new Error("删除学习单词失败");
  }
}

/**
 * 查询用户的所有学习单词
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param sortOrder - 排序方式: 'asc' 升序, 'desc' 降序，默认降序
 * @returns 学习单词列表
 */
export async function getUserLearningWordsList(
  db: DB,
  userId: number,
  sortOrder: "asc" | "desc" = "desc"
) {
  try {
    const orderByFn = sortOrder === "desc" ? desc : asc;

    const words = await db
      .select({
        id: userLearnedMeanings.id,
        word: userLearnedMeanings.word,
        meaningText: userLearnedMeanings.meaningText,
        pos: userLearnedMeanings.pos,
        exampleSentence: userLearnedMeanings.exampleSentence,
        easeFactor: userLearnedMeanings.easeFactor,
        intervalDays: userLearnedMeanings.intervalDays,
        repetitions: userLearnedMeanings.repetitions,
        nextReviewDate: userLearnedMeanings.nextReviewDate,
        lastReviewedAt: userLearnedMeanings.lastReviewedAt,
        totalReviews: userLearnedMeanings.totalReviews,
        createdAt: userLearnedMeanings.createdAt,
      })
      .from(userLearnedMeanings)
      .where(eq(userLearnedMeanings.userId, userId))
      .orderBy(orderByFn(userLearnedMeanings.createdAt));

    return words;
  } catch (error) {
    console.error("查询学习单词失败:", error);
    throw new Error("查询学习单词失败");
  }
}

/**
 * 获取用户学习单词的统计信息
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @returns 统计信息
 */
export async function getLearningWordsStats(db: DB, userId: number) {
  try {
    const allWords = await db
      .select()
      .from(userLearnedMeanings)
      .where(eq(userLearnedMeanings.userId, userId));

    const stats = {
      total: allWords.length,
      newWords: allWords.filter((w) => w.repetitions === 0).length,
      learning: allWords.filter((w) => w.repetitions > 0 && w.repetitions <= 3)
        .length,
      reviewing: allWords.filter((w) => w.repetitions > 3).length,
    };

    return stats;
  } catch (error) {
    console.error("获取学习单词统计失败:", error);
    throw new Error("获取学习单词统计失败");
  }
}
