/**
 * 文本分析服务模块（主入口）
 *
 * 职责：
 * 1. 协调各个子模块（NLP、AI、词汇查询）
 * 2. 提供文章分析的主入口函数
 * 3. 管理用户的词汇等级和已学单词
 * 4. 查询和过滤陌生词汇
 *
 * 主要流程：
 * 用户输入文章 → Google NLP 分析 → 过滤陌生词 → AI 生成解释 → 分类 → 保存
 */

import { type DB } from "../db/db";
import {
  users,
  vocabulary,
  userLearnedMeanings,
  userKnownWords,
} from "../db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { analyzeTextWithGoogleNLP, type NLPToken } from "./text-nlp.service";

// 导出 AI 相关的类型和函数
export type {
  WordExplanation,
  ClassifiedWordExplanation,
} from "./text-ai.service";
export {
  explainWordsByAi,
  classifyWordMeanings,
  saveWordMeanings,
} from "./text-ai.service";

/**
 * 获取用户已掌握的词汇列表
 *
 * 包含两部分：
 * 1. 基于用户词汇等级的系统词汇（vocabulary 表）
 * 2. 用户手动标记的已认知词汇（user_known_words 表）
 *
 * 等级顺序（从低到高）：
 * 小学 → 初中 → 高中 → CET4 → CET6 → 雅思/托福 → GRE
 *
 * 例如：用户设置为 CET4，则会查询小学、初中、高中、CET4 四个等级的所有词汇
 * 同时也包含用户手动添加的专业词汇
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @returns 已掌握的词汇集合（小写，使用 Set 便于快速查找）
 */
export async function getUserKnownWords(
  db: DB,
  userId: number
): Promise<Set<string>> {
  const knownWordsSet = new Set<string>();

  // 1. 查询用户的词汇等级设置
  const [user] = await db
    .select({ vocabularyLevel: users.vocabularyLevel })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // 2. 如果用户设置了词汇等级，查询系统词汇库
  if (user && user.vocabularyLevel) {
    // 定义等级顺序（从低到高）
    // 使用 as const 断言：将数组转换为只读的字面量元组类型
    // 原因：vocabulary.level 是枚举列，inArray 需要字面量类型数组，而非 string[]
    // 这样 TypeScript 会推断为具体的字面量类型，而不是宽泛的 string[]
    const levelOrder = [
      "primary_school", // 小学
      "middle_school", // 初中
      "high_school", // 高中
      "cet4", // 大学英语四级
      "cet6", // 大学英语六级
      "ielts_toefl", // 雅思/托福
      "gre", // GRE
    ] as const;

    const userLevelIndex = levelOrder.indexOf(user.vocabularyLevel);
    const levelsToInclude = levelOrder.slice(0, userLevelIndex + 1);

    // 查询该等级及以下的所有词汇
    const knownVocabulary = await db
      .select({ word: vocabulary.word })
      .from(vocabulary)
      .where(inArray(vocabulary.level, levelsToInclude));

    // 添加到集合（小写）
    knownVocabulary.forEach((v) => {
      if (v.word) knownWordsSet.add(v.word.toLowerCase());
    });
  }

  // 3. 查询用户手动标记的已认知词汇
  const userKnownWordsList = await db
    .select({ lemma: userKnownWords.lemma })
    .from(userKnownWords)
    .where(eq(userKnownWords.userId, userId));

  // 添加到集合（已经是小写）
  userKnownWordsList.forEach((w) => {
    if (w.lemma) knownWordsSet.add(w.lemma);
  });

  return knownWordsSet;
}

/**
 * 陌生词汇对象类型
 *
 * 包含单词的两种形式：
 * - word: 单词在文章中的实际形式（如 "running", "You"）
 * - lemma: 单词的原型/词根（如 "run", "you"）
 */
export interface UnfamiliarWord {
  word: string; // 单词在文中的形式（用于前端展示）
  lemma: string; // 单词原型（小写，用于查询和保存）
}

/**
 * 过滤陌生词汇
 *
 * 从 NLP 分析的 token 列表中，筛选出用户尚未掌握的词汇
 *
 * 过滤逻辑：
 * 1. 使用单词的原型（lemma）进行判断，而非文中形式
 * 2. 按 lemma 去重（如 "running" 和 "runs" 都是 "run" 的变形，只保留一个）
 * 3. 保留单词在文中的实际形式，便于前端展示
 *
 * @param tokens - NLP 分析后的 token 列表
 * @param knownWords - 用户已掌握的词汇集合（原型，小写）
 * @returns 陌生单词对象数组（已去重）
 *
 * @example
 * 输入 tokens: [{ word: "running", lemma: "run" }, { word: "runs", lemma: "run" }]
 * 输出: [{ word: "running", lemma: "run" }]  // 去重，只保留第一个
 */
export function filterUnfamiliarWords(
  tokens: NLPToken[],
  knownWords: Set<string>
): UnfamiliarWord[] {
  // 使用 Map 按 lemma 去重，保留每个 lemma 对应的第一个 word
  const unfamiliarWordsMap = new Map<string, UnfamiliarWord>();

  for (const token of tokens) {
    const lemma = token.lemma.toLowerCase();
    const word = token.word;

    // 判断该词的原型是否在已知词汇中
    if (!knownWords.has(lemma)) {
      // 如果这个 lemma 还没有记录，添加到陌生词列表
      // 注意：如果同一个 lemma 有多个变形，只保留第一个遇到的
      if (!unfamiliarWordsMap.has(lemma)) {
        unfamiliarWordsMap.set(lemma, {
          word: word, // 保留文中形式
          lemma: lemma, // 保存原型（小写）
        });
      }
    }
  }

  return Array.from(unfamiliarWordsMap.values());
}

/**
 * 分析文章并返回陌生词汇（主入口函数）
 *
 * 这是文本分析的主要入口，协调各个子模块完成分析流程：
 *
 * 流程：
 * 1. 调用 Google NLP API 分析文本，获取 token 列表
 * 2. 查询用户的词汇等级，获取已掌握的词汇集合
 * 3. 过滤出陌生词汇（未掌握的词）
 * 4. 返回陌生词汇列表和统计信息
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param content - 文章内容
 * @param googleApiKey - Google Cloud API Key
 * @returns 陌生词汇列表和总词数统计
 */
export async function analyzeArticle(
  db: DB,
  userId: number,
  content: string,
  googleApiKey: string
): Promise<{
  unfamiliarWords: UnfamiliarWord[];
  totalWords: number;
}> {
  // 1. 调用 Google NLP API 分析文本
  // 返回经过过滤的有效单词列表（已过滤标点、数字、符号等）
  const tokens = await analyzeTextWithGoogleNLP(content, googleApiKey);
  console.log("Google NLP 分析结果:", tokens);

  // 2. 获取用户已掌握的词汇列表（基于词汇等级）
  const knownWords = await getUserKnownWords(db, userId);

  // 3. 过滤陌生词汇（用户尚未掌握的词）
  const unfamiliarWords = filterUnfamiliarWords(tokens, knownWords);
  console.log("陌生词汇列表:", unfamiliarWords);

  return {
    unfamiliarWords, // 陌生词汇列表（带 word 和 lemma）
    totalWords: tokens.length, // 文章总词数（有效单词数）
  };
}

/**
 * 查询已学含义的结果类型
 *
 * 用于表示有学习记录的单词及其已学过的含义列表
 * 这些信息会发送给 AI，用于判断已有含义是否适用于当前上下文
 */
export interface WordsWithMeanings {
  word: string; // 单词在文中的形式（用于 AI prompt）
  lemma: string; // 单词原型（小写，用于查询数据库）
  existingMeanings: string[]; // 已学过的含义列表（中文）
}

/**
 * 查询用户已学习的含义
 *
 * 根据陌生词汇列表，从数据库中查询哪些词汇有学习记录，
 * 并将单词分为两类：
 * 1. newWords: 完全陌生的词（无任何学习记录）
 * 2. wordsWithMeanings: 有学习记录的词（含已学含义列表）
 *
 * 这个分类结果会影响后续的 AI 处理：
 * - newWords: AI 直接生成新解释（isExisting 必为 false）
 * - wordsWithMeanings: AI 判断已有含义是否适用（可能返回 isExisting=true）
 *
 * @param unfamiliarWords - 陌生词汇对象数组（包含 word 和 lemma）
 * @param userId - 用户 ID
 * @param db - 数据库实例
 * @returns 分类结果
 */
export async function queryExistingMeanings(
  unfamiliarWords: Array<{ word: string; lemma: string }>,
  userId: number,
  db: DB
): Promise<{
  newWords: Array<{ word: string; lemma: string }>;
  wordsWithMeanings: WordsWithMeanings[];
}> {
  if (unfamiliarWords.length === 0) {
    return { newWords: [], wordsWithMeanings: [] };
  }

  // 1. 提取所有 lemma（原型），用于查询数据库
  const lemmas = unfamiliarWords.map((w) => w.lemma.toLowerCase());

  // 2. 查询这些单词的所有学习记录
  // 注意：使用 lemma（原型）进行查询，因为数据库中保存的是原型
  const existingRecords = await db
    .select({
      word: userLearnedMeanings.word,
      meaningText: userLearnedMeanings.meaningText,
    })
    .from(userLearnedMeanings)
    .where(
      and(
        eq(userLearnedMeanings.userId, userId),
        inArray(userLearnedMeanings.word, lemmas)
      )
    );

  // 3. 按单词（lemma）分组，收集每个单词的所有已学含义
  const meaningsMap = new Map<string, Set<string>>();
  for (const record of existingRecords) {
    const lemma = record.word.toLowerCase();
    if (!meaningsMap.has(lemma)) {
      meaningsMap.set(lemma, new Set());
    }
    if (record.meaningText) {
      meaningsMap.get(lemma)!.add(record.meaningText);
    }
  }

  // 4. 分类：区分有学习记录和无学习记录的单词
  const newWords: Array<{ word: string; lemma: string }> = [];
  const wordsWithMeanings: WordsWithMeanings[] = [];

  for (const item of unfamiliarWords) {
    const lemma = item.lemma.toLowerCase();
    const existingMeanings = meaningsMap.get(lemma);

    if (existingMeanings && existingMeanings.size > 0) {
      // 有学习记录：添加到 wordsWithMeanings
      wordsWithMeanings.push({
        word: item.word, // 保留文中形式（用于 AI prompt）
        lemma: item.lemma, // 保留原型（用于查询）
        existingMeanings: Array.from(existingMeanings), // 已学含义列表
      });
    } else {
      // 无学习记录：添加到 newWords
      newWords.push({
        word: item.word, // 保留文中形式
        lemma: item.lemma, // 保留原型
      });
    }
  }

  return { newWords, wordsWithMeanings };
}
