/**
 * 句子提取工具
 * 
 * 从文章中提取包含指定单词的句子
 * 用于在 AI 未提供 exampleSentence 时的兜底方案
 */

/**
 * 从文章中提取包含指定单词的句子
 * 
 * 策略：
 * 1. 按标点符号（.!?）分割文章为句子
 * 2. 查找包含目标单词的句子（不区分大小写，支持词形变化）
 * 3. 返回第一个匹配的完整句子
 * 
 * @param articleContent - 文章内容
 * @param word - 目标单词（可以是任何形式，如 "running", "You"）
 * @returns 包含该单词的句子，如果未找到则返回空字符串
 */
export function extractSentenceFromArticle(
  articleContent: string,
  word: string
): string {
  if (!articleContent || !word) {
    return "";
  }

  // 1. 按句子分割（保留句号、感叹号、问号）
  // 使用正则表达式匹配句子结束符，并保留它们
  const sentences = articleContent
    .split(/([.!?]+)/)
    .reduce((acc: string[], curr, index, array) => {
      // 将句子和标点符号组合在一起
      if (index % 2 === 0 && curr.trim()) {
        const sentence = curr.trim();
        const punctuation = array[index + 1] || "";
        acc.push(sentence + punctuation);
      }
      return acc;
    }, []);

  // 2. 创建搜索模式：匹配单词（不区分大小写，边界匹配）
  // 使用 \b 确保匹配完整单词，不会匹配到单词的一部分
  const searchPattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");

  // 3. 查找第一个包含该单词的句子
  for (const sentence of sentences) {
    if (searchPattern.test(sentence)) {
      return sentence.trim();
    }
  }

  // 4. 如果没找到，尝试更宽松的匹配（不要求单词边界）
  // 这可以匹配到复合词中的部分，如 "AI-powered" 中的 "AI"
  const loosePattern = new RegExp(escapeRegExp(word), "i");
  for (const sentence of sentences) {
    if (loosePattern.test(sentence)) {
      return sentence.trim();
    }
  }

  // 5. 如果仍然没找到，返回文章的第一句话作为兜底
  return sentences.length > 0 ? sentences[0].trim() : "";
}

/**
 * 转义正则表达式特殊字符
 * 
 * @param str - 要转义的字符串
 * @returns 转义后的字符串
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 批量提取句子
 * 
 * 为多个单词提取句子
 * 
 * @param articleContent - 文章内容
 * @param words - 单词列表
 * @returns 单词到句子的映射
 */
export function batchExtractSentences(
  articleContent: string,
  words: string[]
): Map<string, string> {
  const result = new Map<string, string>();

  for (const word of words) {
    const sentence = extractSentenceFromArticle(articleContent, word);
    result.set(word, sentence);
  }

  return result;
}

