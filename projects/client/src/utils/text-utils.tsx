import React from "react";

/**
 * 高亮例句中的目标单词
 */
export function highlightWordInSentence(
  sentence: string,
  word: string
): (string | React.ReactElement)[] {
  if (!word || !sentence) {
    return [sentence];
  }

  // 转义特殊字符，用于正则表达式
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 使用单词边界匹配，大小写不敏感
  // \b 确保匹配完整的单词，避免部分匹配（如 "run" 不会匹配 "running"）
  const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");

  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(sentence)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push(sentence.substring(lastIndex, match.index));
    }

    // 添加高亮的单词（保留原始大小写）
    const matchedText = match[0];
    parts.push(
      <strong key={key++} className="font-bold text-primary">
        {matchedText}
      </strong>
    );

    lastIndex = regex.lastIndex;

    // 避免无限循环（如果正则没有全局标志，或者匹配空字符串）
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  // 添加剩余的文本
  if (lastIndex < sentence.length) {
    parts.push(sentence.substring(lastIndex));
  }

  // 如果没有匹配到，返回原文本
  return parts.length > 0 ? parts : [sentence];
}
