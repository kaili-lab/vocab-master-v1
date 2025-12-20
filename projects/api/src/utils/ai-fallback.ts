/**
 * AI 降级和兜底方案模块
 *
 * 职责：
 * 1. 降级方案：AI 服务不可用时返回基础数据
 * 2. 兜底方案：确保即使 AI 完全失败，也能返回可用的数据
 *
 * 使用场景：
 * - 中转站故障：重试后仍失败，返回降级数据
 * - OpenAI 服务器问题：返回降级数据
 * - 超时：返回降级数据
 */

import { type WordExplanation } from "../service/text-ai.service";
import { type UnfamiliarWord } from "../service/text.service";

/**
 * 生成降级数据
 *
 * 当 AI 服务完全不可用时，返回基础单词列表
 * 所有单词的 meaningText 为空，isExisting 设为 false
 * 前端可以显示"AI 服务暂时不可用"的提示
 *
 * @param unfamiliarWords - 陌生词汇列表
 * @returns 降级后的单词解释列表
 */
export function generateFallbackExplanations(
  unfamiliarWords: UnfamiliarWord[]
): WordExplanation[] {
  return unfamiliarWords.map((word) => ({
    wordInText: word.word, // 单词在文章中的形式
    lemma: word.lemma.toLowerCase(), // 单词原型（小写）
    meaningText: "", // 空字符串，前端显示"AI 服务暂时不可用"
    isExisting: false, // 默认未掌握
    exampleSentence: "", // 空字符串
  }));
}

/**
 * 检查是否为降级数据
 *
 * 判断返回的数据是否为降级方案生成的数据
 *
 * @param explanations - 单词解释列表
 * @returns 是否为降级数据
 */
export function isFallbackData(explanations: WordExplanation[]): boolean {
  // 如果所有解释的 meaningText 都为空，则认为是降级数据
  return (
    explanations.length > 0 &&
    explanations.every((exp) => exp.meaningText.trim() === "")
  );
}

/**
 * 合并降级数据和部分成功的数据
 *
 * 如果部分单词成功获取了 AI 解释，部分失败，则合并结果
 *
 * @param successfulExplanations - 成功获取的 AI 解释
 * @param failedWords - 失败的单词列表
 * @returns 合并后的解释列表
 */
export function mergeFallbackData(
  successfulExplanations: WordExplanation[],
  failedWords: UnfamiliarWord[]
): WordExplanation[] {
  const fallbackExplanations = generateFallbackExplanations(failedWords);
  return [...successfulExplanations, ...fallbackExplanations];
}
