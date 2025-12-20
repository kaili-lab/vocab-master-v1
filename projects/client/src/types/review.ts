/**
 * 复习系统类型定义
 * 
 * 说明：与后端 API 返回的数据结构保持一致
 */

// ==================== 统计数据 ====================

export interface ReviewStats {
  todayDue: number;      // 今日待复习
  newCards: number;      // 新卡片
  learning: number;      // 学习中
  reviewing: number;     // 复习中
  totalVocab: number;    // 总词汇量
  completedToday: number; // 今日已完成
}

// ==================== 卡片数据 ====================

export interface CardData {
  id: number;
  word: string;
  pronunciation?: string;
  pos?: string;
  meaning: string;
  sentence?: string;
  highlightedWord: string;
  type: "new" | "extend";
  learnedMeanings?: string[];
}

// ==================== 会话数据 ====================

export interface ReviewSessionData {
  current: number;
  total: number;
  progress: number;
}

// ==================== 完成统计 ====================

export interface CompleteStats {
  totalReviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

// ==================== 答题评级 ====================

export type DifficultyRating = "again" | "hard" | "good" | "easy";

