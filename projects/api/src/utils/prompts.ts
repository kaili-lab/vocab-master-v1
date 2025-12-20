/**
 * AI Prompt 构建工具
 * 用于生成词汇学习相关的 AI Prompt
 */

/**
 * 构建单词解释的 AI Prompt
 *
 * @param articleContent - 文章内容
 * @param newWords - 完全陌生的词汇列表（包含 word 和 lemma）
 * @param wordsWithMeanings - 有已学含义的词汇列表（包含 word 和 lemma）
 * @returns 完整的 AI Prompt 字符串
 */
export function buildWordExplanationPrompt(
  articleContent: string,
  newWords: Array<{ word: string; lemma: string }>,
  wordsWithMeanings: Array<{
    word: string;
    lemma: string;
    existingMeanings: string[];
  }>
): string {
  // 构建新单词部分
  const newWordsSection =
    newWords.length > 0
      ? `New Words (no existing meanings):\n${newWords
          .map((w) => `- "${w.word}" (lemma: ${w.lemma})`)
          .join("\n")}`
      : "New Words (no existing meanings):\n(无)";

  // 构建有已学含义的单词部分
  const wordsWithMeaningsSection =
    wordsWithMeanings.length > 0
      ? wordsWithMeanings
          .map(
            (item) => `- Word: "${item.word}" (lemma: ${item.lemma})
  Existing meanings in user's vocabulary:
  ${item.existingMeanings.map((m, i) => `  ${i + 1}. ${m}`).join("\n")}`
          )
          .join("\n\n")
      : "Words with Existing Meanings:\n(无)";

  // 构建完整的 Prompt
  const prompt = `You are a vocabulary learning assistant. Analyze the following words from an article and provide contextual explanations.

⚠️ CRITICAL: ALL fields (wordInText, lemma, meaningText, exampleSentence, isExisting) are REQUIRED for EVERY word.
Missing any required field will cause REJECTION.

Article Context:
${articleContent}

Words to Analyze:
${newWordsSection}

${wordsWithMeaningsSection}

Instructions:
For NEW WORDS:
- Provide concise explanation in Chinese based on article context
- Set "isExisting" to false
- Extract complete sentence from article for "exampleSentence"

For WORDS WITH EXISTING MEANINGS:
- Check if ANY existing meaning fits current context
- If YES: Set "isExisting" to true (still provide contextual "meaningText" in Chinese for display)
- If NO: Set "isExisting" to false and provide NEW contextual explanation in Chinese
- Extract complete sentence from article for "exampleSentence"

Response Format (JSON only):
{
  "words": [
    {
      "wordInText": "excited",
      "lemma": "excited",
      "meaningText": "感到兴奋的；激动的",
      "isExisting": false,
      "pos": "adjective",
      "exampleSentence": "We're excited about the arrival of AI."
    },
    {
      "wordInText": "developers",
      "lemma": "developer",
      "meaningText": "开发者；程序员",
      "isExisting": true,
      "pos": "noun",
      "exampleSentence": "AI now helps developers write code, design interfaces, analyze data, create documentation, and even review code."
    }
  ]
}

Field Requirements:
1. wordInText (REQUIRED): word as it appears in article, preserve capitalization
2. lemma (REQUIRED): root form in lowercase
3. meaningText (REQUIRED): Chinese meaning based on article context
4. exampleSentence (REQUIRED): complete sentence from article containing this word
5. isExisting (REQUIRED): boolean - true if user knows this meaning, false otherwise
6. pos (OPTIONAL): part of speech

Output valid JSON only, no additional text.`;

  return prompt;
}

/**
 * 获取系统消息（用于 OpenAI API）
 */
export function getSystemMessage(): string {
  return "You are a professional vocabulary learning assistant. Your task is to analyze words in specific contexts and provide accurate explanations. Always return valid JSON format only.";
}
