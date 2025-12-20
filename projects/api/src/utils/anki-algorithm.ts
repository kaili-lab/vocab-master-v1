/**
 * Anki SM-2 间隔重复算法
 * 
 * 基于 SuperMemo SM-2 算法，用于计算复习间隔
 * 
 * 参考：https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html
 * 
 * 核心参数：
 * - easeFactor: 难度系数（1.3 - 2.5+，默认 2.5）
 * - intervalDays: 当前间隔天数
 * - repetitions: 连续正确次数
 * 
 * 四个难度等级：
 * - again: 完全忘记，重置进度
 * - hard: 困难，减小难度系数，缩短间隔
 * - good: 正常，标准间隔增长
 * - easy: 简单，增加难度系数，扩大间隔
 */

export type DifficultyRating = "again" | "hard" | "good" | "easy";

export interface AnkiState {
  easeFactor: number;      // 难度系数
  intervalDays: number;    // 间隔天数
  repetitions: number;     // 连续正确次数
}

/**
 * 计算下次复习的参数
 * 
 * @param currentState - 当前卡片状态
 * @param rating - 用户答题评级
 * @returns 新的卡片状态
 */
export function calculateNextReview(
  currentState: AnkiState,
  rating: DifficultyRating
): AnkiState {
  const { easeFactor, intervalDays, repetitions } = currentState;

  // ===== 情况1: Again（完全忘记） =====
  if (rating === "again") {
    return {
      easeFactor: Math.max(1.3, easeFactor - 0.2), // 降低难度系数，但不低于 1.3
      intervalDays: 1,  // 重置为 1 天
      repetitions: 0,   // 重置连续正确次数
    };
  }

  // ===== 情况2-4: Hard / Good / Easy（记住了） =====

  // 更新难度系数
  let newEaseFactor = easeFactor;
  if (rating === "hard") {
    newEaseFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === "good") {
    // good 不改变难度系数
    newEaseFactor = easeFactor;
  } else if (rating === "easy") {
    newEaseFactor = easeFactor + 0.15;
  }

  // 计算新的间隔天数
  let newIntervalDays: number;
  const newRepetitions = repetitions + 1;

  if (newRepetitions === 1) {
    // 第一次正确：1 天
    newIntervalDays = 1;
  } else if (newRepetitions === 2) {
    // 第二次正确：6 天
    newIntervalDays = 6;
  } else {
    // 第三次及以后：应用难度系数
    newIntervalDays = Math.round(intervalDays * newEaseFactor);
  }

  // 根据难度等级调整间隔
  if (rating === "hard") {
    // 困难：间隔乘以 1.2（比标准短）
    newIntervalDays = Math.max(1, Math.round(newIntervalDays * 1.2));
  } else if (rating === "easy") {
    // 简单：间隔乘以 1.3（比标准长）
    newIntervalDays = Math.round(newIntervalDays * 1.3);
  }

  return {
    easeFactor: newEaseFactor,
    intervalDays: newIntervalDays,
    repetitions: newRepetitions,
  };
}

/**
 * 计算下次复习的日期
 * 
 * @param intervalDays - 间隔天数
 * @returns 下次复习的日期
 */
export function getNextReviewDate(intervalDays: number): Date {
  const now = new Date();
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + intervalDays);
  return nextDate;
}

