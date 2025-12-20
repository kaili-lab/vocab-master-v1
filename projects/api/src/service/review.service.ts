/**
 * 复习系统服务模块
 *
 * 职责：
 * 1. 查询复习统计数据（待复习数量、总词汇量等）
 * 2. 获取待复习卡片（基于 Anki 算法）
 * 3. 更新复习记录（提交答案后更新间隔）
 * 4. 更新学习统计（每日学习数据）
 */

import { type DB } from "../db/db";
import { userLearnedMeanings, userLearningStats } from "../db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import {
  calculateNextReview,
  getNextReviewDate,
  type DifficultyRating,
} from "../utils/anki-algorithm";

/**
 * 复习统计数据类型
 */
export interface ReviewStats {
  todayDue: number; // 今日待复习
  newCards: number; // 新卡片（从未复习过）
  learning: number; // 学习中（间隔 < 21 天）
  reviewing: number; // 复习中（间隔 >= 21 天）
  totalVocab: number; // 总词汇量
  completedToday: number; // 今日已完成
}

/**
 * 卡片数据类型
 */
export interface CardData {
  id: number;
  word: string; // 单词在文中的形式（用于展示）
  pronunciation?: string; // 音标（暂时为空，后续可扩展）
  pos?: string; // 词性
  meaning: string; // 中文含义
  sentence?: string; // 例句
  highlightedWord: string; // 例句中高亮的单词
  type: "new" | "extend"; // 类型（动态计算）
  learnedMeanings?: string[]; // 已学过的其他含义（仅 extend 类型）
}

/**
 * 查询用户的复习统计数据
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @returns 复习统计数据
 */
export async function getReviewStats(
  db: DB,
  userId: number
): Promise<ReviewStats> {
  const now = new Date();

  // 查询所有待复习的卡片（nextReviewDate <= now）
  const dueCards = await db
    .select({
      id: userLearnedMeanings.id,
      intervalDays: userLearnedMeanings.intervalDays,
      repetitions: userLearnedMeanings.repetitions,
    })
    .from(userLearnedMeanings)
    .where(
      and(
        eq(userLearnedMeanings.userId, userId),
        lte(userLearnedMeanings.nextReviewDate, now)
      )
    );

  // 分类统计
  let newCards = 0;
  let learning = 0;
  let reviewing = 0;

  for (const card of dueCards) {
    if (card.repetitions === 0) {
      // 从未复习过
      newCards++;
    } else if (card.intervalDays < 21) {
      // 学习中（短期记忆）
      learning++;
    } else {
      // 复习中（长期记忆）
      reviewing++;
    }
  }

  // 查询总词汇量
  const [totalVocabResult] = await db
    .select({
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(userLearnedMeanings)
    .where(eq(userLearnedMeanings.userId, userId));

  const totalVocab = totalVocabResult?.count || 0;

  // 查询今日已完成数量（从 userLearningStats 表）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayStatsResult] = await db
    .select({
      reviewedCount: userLearningStats.reviewedCount,
    })
    .from(userLearningStats)
    .where(
      and(
        eq(userLearningStats.userId, userId),
        eq(userLearningStats.date, today)
      )
    )
    .limit(1);

  const completedToday = todayStatsResult?.reviewedCount || 0;

  return {
    todayDue: dueCards.length,
    newCards,
    learning,
    reviewing,
    totalVocab,
    completedToday,
  };
}

/**
 * 获取下一张待复习卡片
 *
 * 策略：
 * 1. 优先返回新卡片（repetitions = 0）
 * 2. 其次返回学习中的卡片（intervalDays < 21）
 * 3. 最后返回复习中的卡片（intervalDays >= 21）
 * 4. 同优先级按 nextReviewDate 升序排序（越早到期的越优先）
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @returns 卡片数据或 null（无待复习卡片）
 */
export async function getNextCard(
  db: DB,
  userId: number
): Promise<CardData | null> {
  const now = new Date();

  // 查询待复习的卡片（按优先级排序）
  const cards = await db
    .select({
      id: userLearnedMeanings.id,
      word: userLearnedMeanings.word,
      wordInText: userLearnedMeanings.wordInText,
      pos: userLearnedMeanings.pos,
      meaningText: userLearnedMeanings.meaningText,
      exampleSentence: userLearnedMeanings.exampleSentence,
      repetitions: userLearnedMeanings.repetitions,
      intervalDays: userLearnedMeanings.intervalDays,
      nextReviewDate: userLearnedMeanings.nextReviewDate,
    })
    .from(userLearnedMeanings)
    .where(
      and(
        eq(userLearnedMeanings.userId, userId),
        lte(userLearnedMeanings.nextReviewDate, now)
      )
    )
    .orderBy(
      // 优先级排序：repetitions 升序（新卡片优先）
      userLearnedMeanings.repetitions,
      // 同优先级按到期时间排序
      userLearnedMeanings.nextReviewDate
    )
    .limit(1);

  if (cards.length === 0) {
    return null; // 无待复习卡片
  }

  const card = cards[0];

  // 查询该单词的所有学习记录（用于判断 type）
  const allMeaningsForWord = await db
    .select({
      id: userLearnedMeanings.id,
      meaningText: userLearnedMeanings.meaningText,
      pos: userLearnedMeanings.pos,
    })
    .from(userLearnedMeanings)
    .where(
      and(
        eq(userLearnedMeanings.userId, userId),
        eq(userLearnedMeanings.word, card.word)
      )
    );

  // 动态判断 type
  const type = allMeaningsForWord.length > 1 ? "extend" : "new";

  // 如果是 extend 类型，收集其他含义
  let learnedMeanings: string[] | undefined;
  if (type === "extend") {
    learnedMeanings = allMeaningsForWord
      .filter((m) => m.id !== card.id) // 排除当前卡片
      .map((m) => {
        const posStr = m.pos ? ` (${m.pos})` : "";
        return `${m.meaningText}${posStr}`;
      });
  }

  return {
    id: card.id,
    word: card.word,
    pronunciation: undefined, // TODO: 后续可从词典 API 获取
    pos: card.pos || undefined,
    meaning: card.meaningText,
    sentence: card.exampleSentence || undefined,
    highlightedWord: card.wordInText || card.word, // 优先使用文中形态，兼容旧数据
    type,
    learnedMeanings,
  };
}

/**
 * 提交答案并更新卡片状态
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param cardId - 卡片 ID
 * @param rating - 难度评级
 * @returns 是否成功
 */
export async function submitAnswer(
  db: DB,
  userId: number,
  cardId: number,
  rating: DifficultyRating
): Promise<boolean> {
  // 1. 查询卡片当前状态
  const [card] = await db
    .select({
      id: userLearnedMeanings.id,
      userId: userLearnedMeanings.userId,
      easeFactor: userLearnedMeanings.easeFactor,
      intervalDays: userLearnedMeanings.intervalDays,
      repetitions: userLearnedMeanings.repetitions,
      totalReviews: userLearnedMeanings.totalReviews,
    })
    .from(userLearnedMeanings)
    .where(
      and(
        eq(userLearnedMeanings.id, cardId),
        eq(userLearnedMeanings.userId, userId)
      )
    )
    .limit(1);

  if (!card) {
    return false; // 卡片不存在或不属于该用户
  }

  // 2. 计算新的复习参数（Anki 算法）
  const newState = calculateNextReview(
    {
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
    },
    rating
  );

  // 3. 计算下次复习日期
  const nextReviewDate = getNextReviewDate(newState.intervalDays);

  // 4. 更新数据库
  await db
    .update(userLearnedMeanings)
    .set({
      easeFactor: newState.easeFactor,
      intervalDays: newState.intervalDays,
      repetitions: newState.repetitions,
      lastReviewedAt: new Date(),
      nextReviewDate,
      totalReviews: card.totalReviews + 1,
    })
    .where(eq(userLearnedMeanings.id, cardId));

  return true;
}

/**
 * 更新每日学习统计
 *
 * @param db - 数据库实例
 * @param userId - 用户 ID
 * @param reviewedCount - 复习数量（增量）
 * @param correctCount - 答对数量（增量，rating !== 'again'）
 */
export async function updateDailyStats(
  db: DB,
  userId: number,
  reviewedCount: number,
  correctCount: number
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 尝试更新现有记录
  const result = await db
    .update(userLearningStats)
    .set({
      reviewedCount: sql`${userLearningStats.reviewedCount} + ${reviewedCount}`,
      correctCount: sql`${userLearningStats.correctCount} + ${correctCount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userLearningStats.userId, userId),
        eq(userLearningStats.date, today)
      )
    )
    .returning({ id: userLearningStats.id });

  // 如果没有更新任何记录，说明今天还没有记录，需要插入
  if (result.length === 0) {
    await db.insert(userLearningStats).values({
      userId,
      date: today,
      reviewedCount,
      correctCount,
      newWordsCount: 0,
      articlesRead: 0,
      wordsRead: 0,
      timeSpentMinutes: 0,
    });
  }
}
