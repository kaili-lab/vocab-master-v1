/**
 * 用户已认知词汇服务模块
 *
 * 职责：
 * 1. 添加/删除用户已认知的词汇
 * 2. 查询用户的已认知词汇列表
 * 3. 批量操作已认知词汇
 * 4. 检查词汇是否已被标记为已认知
 *
 * 使用场景：
 * - 用户在文章分析时标记词汇为"已认识"
 * - 用户手动管理自己的已知词汇库
 * - 文章分析时过滤已认知词汇
 */

import { type DB } from "../db/db";
import { userKnownWords } from "../db/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

/**
 * 添加单词到用户已认知列表
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param word - 单词在文章中的形式
 * @param lemma - 单词的词根形式（小写）
 * @returns 添加的记录 ID，如果已存在返回 null
 *
 * @example
 * await addKnownWord(db, 1, "cryptocurrency", "cryptocurrency", "manual");
 */
export async function addKnownWord(
  db: DB,
  userId: number,
  word: string,
  lemma: string
): Promise<number | null> {
  try {
    // 标准化 lemma（确保小写）
    const normalizedLemma = lemma.toLowerCase();

    // 检查是否已存在
    const existing = await db
      .select({ id: userKnownWords.id })
      .from(userKnownWords)
      .where(
        and(
          eq(userKnownWords.userId, userId),
          eq(userKnownWords.lemma, normalizedLemma)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 已存在，返回 null
      return null;
    }

    // 插入新记录
    const [result] = await db
      .insert(userKnownWords)
      .values({
        userId,
        word,
        lemma: normalizedLemma,
      })
      .returning({ id: userKnownWords.id });

    return result.id;
  } catch (error) {
    console.error("添加已认知词汇失败:", error);
    throw new Error("添加已认知词汇失败");
  }
}

/**
 * 更新用户已认知的单词
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param id - 单词记录 ID
 * @param word - 新的单词形式
 * @param lemma - 新的词根形式（小写）
 * @returns 是否更新成功
 *
 * @example
 * await updateKnownWord(db, 1, 123, "running", "run");
 */
export async function updateKnownWord(
  db: DB,
  userId: number,
  id: number,
  word: string,
  lemma: string
): Promise<boolean> {
  try {
    const normalizedLemma = lemma.toLowerCase();

    // 检查新的lemma是否与其他记录冲突
    const existing = await db
      .select({ id: userKnownWords.id })
      .from(userKnownWords)
      .where(
        and(
          eq(userKnownWords.userId, userId),
          eq(userKnownWords.lemma, normalizedLemma)
        )
      )
      .limit(1);

    // 如果存在且不是当前记录，说明冲突
    if (existing.length > 0 && existing[0].id !== id) {
      throw new Error("该词根已存在于已认知词汇中");
    }

    // 更新记录
    await db
      .update(userKnownWords)
      .set({
        word,
        lemma: normalizedLemma,
      })
      .where(and(eq(userKnownWords.id, id), eq(userKnownWords.userId, userId)));

    return true;
  } catch (error) {
    console.error("更新已认知词汇失败:", error);
    throw error;
  }
}

/**
 * 删除用户已认知的单词
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param lemma - 单词的词根形式（小写）
 * @returns 是否删除成功
 *
 * @example
 * await removeKnownWord(db, 1, "cryptocurrency");
 */
export async function removeKnownWord(
  db: DB,
  userId: number,
  lemma: string
): Promise<boolean> {
  try {
    const normalizedLemma = lemma.toLowerCase();

    await db
      .delete(userKnownWords)
      .where(
        and(
          eq(userKnownWords.userId, userId),
          eq(userKnownWords.lemma, normalizedLemma)
        )
      );

    return true;
  } catch (error) {
    console.error("删除已认知词汇失败:", error);
    throw new Error("删除已认知词汇失败");
  }
}

/**
 * 批量添加已认知词汇
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param words - 单词列表（{ word, lemma }）
 * @param source - 来源标识
 * @returns 成功添加的数量
 *
 * @example
 * const words = [
 *   { word: "cryptocurrency", lemma: "cryptocurrency" },
 *   { word: "blockchain", lemma: "blockchain" }
 * ];
 * await batchAddKnownWords(db, 1, words, "batch_import");
 */
export async function batchAddKnownWords(
  db: DB,
  userId: number,
  words: Array<{ word: string; lemma: string }>,
  source: string = "batch_import"
): Promise<number> {
  try {
    if (words.length === 0) {
      return 0;
    }

    // 标准化所有 lemma
    const normalizedWords = words.map((w) => ({
      word: w.word,
      lemma: w.lemma.toLowerCase(),
    }));

    // 查询已存在的词汇
    const existingLemmas = await db
      .select({ lemma: userKnownWords.lemma })
      .from(userKnownWords)
      .where(
        and(
          eq(userKnownWords.userId, userId),
          inArray(
            userKnownWords.lemma,
            normalizedWords.map((w) => w.lemma)
          )
        )
      );

    const existingSet = new Set(existingLemmas.map((e) => e.lemma));

    // 过滤掉已存在的词汇
    const newWords = normalizedWords.filter((w) => !existingSet.has(w.lemma));

    if (newWords.length === 0) {
      return 0;
    }

    // 批量插入
    await db.insert(userKnownWords).values(
      newWords.map((w) => ({
        userId,
        word: w.word,
        lemma: w.lemma,
        source,
      }))
    );

    return newWords.length;
  } catch (error) {
    console.error("批量添加已认知词汇失败:", error);
    throw new Error("批量添加已认知词汇失败");
  }
}

/**
 * 批量删除已认知词汇
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param lemmas - 要删除的词根列表
 * @returns 删除的数量
 */
export async function batchRemoveKnownWords(
  db: DB,
  userId: number,
  lemmas: string[]
): Promise<number> {
  try {
    if (lemmas.length === 0) {
      return 0;
    }

    const normalizedLemmas = lemmas.map((l) => l.toLowerCase());

    await db
      .delete(userKnownWords)
      .where(
        and(
          eq(userKnownWords.userId, userId),
          inArray(userKnownWords.lemma, normalizedLemmas)
        )
      );

    return normalizedLemmas.length;
  } catch (error) {
    console.error("批量删除已认知词汇失败:", error);
    throw new Error("批量删除已认知词汇失败");
  }
}

/**
 * 查询用户的所有已认知词汇
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param sortOrder - 排序方式: 'asc' 升序, 'desc' 降序，默认降序
 * @returns 已认知词汇列表
 */
export async function getUserKnownWordsList(
  db: DB,
  userId: number,
  sortOrder: "asc" | "desc" = "desc"
) {
  try {
    const orderByFn = sortOrder === "desc" ? desc : asc;

    const words = await db
      .select({
        id: userKnownWords.id,
        word: userKnownWords.word,
        lemma: userKnownWords.lemma,
        createdAt: userKnownWords.createdAt,
      })
      .from(userKnownWords)
      .where(eq(userKnownWords.userId, userId))
      .orderBy(orderByFn(userKnownWords.createdAt));

    return words;
  } catch (error) {
    console.error("查询已认知词汇失败:", error);
    throw new Error("查询已认知词汇失败");
  }
}

/**
 * 获取用户已认知词汇的 lemma 集合（用于过滤）
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @returns 已认知词汇的 lemma 集合（小写）
 */
export async function getUserKnownWordsSet(
  db: DB,
  userId: number
): Promise<Set<string>> {
  try {
    const words = await db
      .select({ lemma: userKnownWords.lemma })
      .from(userKnownWords)
      .where(eq(userKnownWords.userId, userId));

    return new Set(words.map((w) => w.lemma));
  } catch (error) {
    console.error("查询已认知词汇集合失败:", error);
    return new Set();
  }
}

/**
 * 检查单词是否已被标记为已认知
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param lemma - 单词的词根形式
 * @returns 是否已认知
 */
export async function isWordKnown(
  db: DB,
  userId: number,
  lemma: string
): Promise<boolean> {
  try {
    const normalizedLemma = lemma.toLowerCase();

    const result = await db
      .select({ id: userKnownWords.id })
      .from(userKnownWords)
      .where(
        and(
          eq(userKnownWords.userId, userId),
          eq(userKnownWords.lemma, normalizedLemma)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("检查词汇是否已认知失败:", error);
    return false;
  }
}

/**
 * 获取用户已认知词汇的统计信息
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @returns 统计信息
 */
export async function getKnownWordsStats(db: DB, userId: number) {
  try {
    const allWords = await db
      .select()
      .from(userKnownWords)
      .where(eq(userKnownWords.userId, userId));

    const stats = {
      total: allWords.length,
    };

    return stats;
  } catch (error) {
    console.error("获取已认知词汇统计失败:", error);
    throw new Error("获取已认知词汇统计失败");
  }
}
