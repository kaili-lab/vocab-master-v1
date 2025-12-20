/**
 * Google NLP 服务模块
 *
 * 职责：
 * 1. 调用 Google Cloud Natural Language API 进行文本分析
 * 2. 处理和合并连字符复合词（如 state-of-the-art）
 * 3. 过滤无意义的 token（符号、数字、缩写片段等）
 *
 * 核心流程：
 * 文本 → Google NLP API → Token 列表 → 过滤处理 → 有效单词列表
 */

/**
 * NLP Token 类型
 * 表示文本分析后的单个词汇单元
 */
export interface NLPToken {
  word: string; // 单词在文中的形式（如 "running", "You"）
  lemma: string; // 单词的原型/词根（如 "run", "you"）
  pos: string; // 词性标注（NOUN, VERB, ADJ 等）
  offset: number; // 在原文中的位置偏移
}

/**
 * Google NLP API 响应类型
 * 定义 Google Cloud Natural Language API 返回的数据结构
 */
export interface GoogleNLPResponse {
  tokens: Array<{
    text: {
      content: string; // token 的文本内容
      beginOffset: number; // 在原文中的起始位置
    };
    lemma: string; // 词根形式
    partOfSpeech: {
      tag: string; // 词性标签
    };
  }>;
}

/**
 * 调用 Google NLP API 分析文本
 *
 * 将原始文本发送到 Google Cloud Natural Language API，
 * 进行句法分析（Syntax Analysis），获取每个词的：
 * - 原型（lemma）
 * - 词性（part of speech）
 * - 位置信息
 *
 * @param text - 要分析的原始文本
 * @param apiKey - Google Cloud API Key
 * @returns 分析后的 token 列表（已过滤和处理）
 * @throws 如果 API 调用失败
 */
export async function analyzeTextWithGoogleNLP(
  text: string,
  apiKey: string
): Promise<NLPToken[]> {
  const response = await fetch(
    `https://language.googleapis.com/v1/documents:analyzeSyntax?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document: {
          type: "PLAIN_TEXT",
          content: text,
        },
        encodingType: "UTF8",
      }),
    }
  );

  if (!response.ok) {
    const error = (await response.json()) as { error?: { message?: string } };
    throw new Error(
      `Google NLP API error: ${error.error?.message || response.statusText}`
    );
  }

  const data = (await response.json()) as GoogleNLPResponse;

  // 处理连字符复合词并过滤无效 token
  return mergeHyphenatedWords(data.tokens);
}

/**
 * 英语缩写词片段集合
 * 这些是英语中常见的缩写形式，不应作为独立单词
 *
 * 注意：只需存储直单引号版本，因为代码中会先进行引号规范化处理
 * 规范化会将所有引号变体（' ' '）统一转换为直单引号 (')
 * 这样可以正确处理复制文章时可能出现的各种引号字符
 */
const MEANINGLESS_FRAGMENTS = new Set([
  "n't", // not 的缩写 (don't, can't, won't)
  "'t", // not 的缩写变体 (ain't)
  "'s", // is/has 的缩写，或所有格 (he's, John's, it's)
  "'m", // am 的缩写 (I'm)
  "'re", // are 的缩写 (you're, they're, we're)
  "'ve", // have 的缩写 (I've, you've, we've)
  "'ll", // will 的缩写 (I'll, you'll, he'll)
  "'d", // would/had 的缩写 (I'd, you'd, he'd)
]);

/**
 * 检查文本是否只包含符号字符
 *
 * 用于过滤像 +, =, @, #, $ 这样的纯符号 token
 * 允许连字符，因为它用于识别复合词
 *
 * @param text - 要检查的文本
 * @returns 如果只包含符号返回 true
 */
function isOnlySymbols(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // 匹配：非字母、非数字、非连字符的字符
  // 例如：+, =, @, #, $ 等
  return /^[^\w\s-]+$/.test(trimmed);
}

/**
 * 检查文本是否为纯数字
 *
 * 用于过滤数字 token，因为我们只需要英语单词
 * 支持整数、小数、带千位分隔符的数字
 *
 * @param text - 要检查的文本
 * @returns 如果是纯数字返回 true
 *
 * @example
 * isOnlyNumbers("200")      // true
 * isOnlyNumbers("3.14")     // true
 * isOnlyNumbers("1,000")    // true
 * isOnlyNumbers("word123")  // false
 */
function isOnlyNumbers(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // 匹配：整数、小数、带千位分隔符的数字
  // \d+ : 一个或多个数字
  // ([.,]\d+)* : 可选的小数点或逗号后跟数字
  return /^\d+([.,]\d+)*$/.test(trimmed);
}

/**
 * 检查单词的字母数量是否少于指定数量
 *
 * 用于过滤过短的单词（如 "a", "I", "is" 等）
 * 只计算英文字母数量，忽略数字、标点等
 *
 * @param text - 要检查的文本
 * @param minLength - 最小字母数量（默认 3）
 * @returns 如果字母数量少于最小值返回 true
 *
 * @example
 * isTooShort("a")          // true (1个字母)
 * isTooShort("is")         // true (2个字母)
 * isTooShort("the")        // false (3个字母)
 * isTooShort("I'm")        // true (只有1个字母I)
 */
function isTooShort(text: string, minLength: number = 3): boolean {
  // 提取所有英文字母
  const letters = text.match(/[a-zA-Z]/g);

  // 如果没有字母或字母数量少于最小值，返回 true
  return !letters || letters.length < minLength;
}

/**
 * 合并连字符复合词并过滤无效 token
 *
 * 主要功能：
 * 1. 识别并合并连字符复合词（如 "state-of-the-art" → "state-of-the-art"）
 * 2. 过滤标点符号（保留连字符用于复合词识别）
 * 3. 过滤纯数字（200, 3.14 等）
 * 4. 过滤纯符号（+, =, @ 等）
 * 5. 过滤英语缩写片段（n't, 's 等）
 * 6. 过滤字母数量少于3的短单词（a, I, is 等）
 *
 * 目标：只保留真正的英语单词
 *
 * @param tokens - Google NLP API 返回的原始 token 列表
 * @returns 过滤和处理后的有效单词列表
 */
function mergeHyphenatedWords(tokens: GoogleNLPResponse["tokens"]): NLPToken[] {
  const result: NLPToken[] = [];
  let i = 0;

  // 遍历所有 token，进行过滤和合并处理
  while (i < tokens.length) {
    const current = tokens[i];
    const currentText = current.text.content.trim();

    // 1. 过滤标点符号（保留连字符用于识别复合词）
    if (current.partOfSpeech.tag === "PUNCT" && current.text.content !== "-") {
      i++;
      continue;
    }

    // 2. 过滤纯数字（200, 3.14, 1,000 等）
    // 数字不是我们需要的英语单词
    if (isOnlyNumbers(currentText)) {
      i++;
      continue;
    }

    // 3. 过滤纯符号（+, =, @ 等）
    // 这些符号可能被 NLP 识别为非 PUNCT 类型，需要额外过滤
    if (isOnlySymbols(currentText)) {
      i++;
      continue;
    }

    // 4. 过滤英语缩写词片段（n't, 's 等）
    // 规范化处理：将不同的引号字符统一为直单引号，便于匹配
    // 文章复制时可能出现不同的引号字符，需要统一处理：
    // - 左单引号 ' (U+2018)
    // - 右单引号 ' (U+2019)
    // - 反引号 ` (U+0060)
    const normalizedText = currentText
      .replace(/[''`]/g, "'") // 统一为直单引号 ' (U+0027)
      .toLowerCase();

    if (MEANINGLESS_FRAGMENTS.has(normalizedText)) {
      i++;
      continue;
    }

    // 5. 过滤字母数量少于3的短单词（a, I, is, in 等）
    // 这些单词通常是冠词、代词、介词等基础词汇
    if (isTooShort(currentText)) {
      i++;
      continue;
    }

    // 6. 识别并合并连字符复合词
    // 模式：word - word - word
    // 例如：state-of-the-art, well-known
    if (
      i + 2 < tokens.length &&
      current.partOfSpeech.tag !== "PUNCT" &&
      tokens[i + 1].text.content === "-" &&
      tokens[i + 1].partOfSpeech.tag === "PUNCT" &&
      tokens[i + 2].partOfSpeech.tag !== "PUNCT"
    ) {
      // 找到连字符复合词的起始位置
      const parts = [current.text.content]; // 文中形式的各部分
      const lemmaParts = [current.lemma]; // 原型形式的各部分
      let j = i + 1;

      // 持续收集连字符连接的所有部分
      // 例如：state - of - the - art
      while (
        j + 1 < tokens.length &&
        tokens[j].text.content === "-" &&
        tokens[j].partOfSpeech.tag === "PUNCT" &&
        tokens[j + 1].partOfSpeech.tag !== "PUNCT"
      ) {
        parts.push(tokens[j + 1].text.content);
        lemmaParts.push(tokens[j + 1].lemma);
        j += 2; // 跳过连字符和下一个单词
      }

      // 合并为一个完整的复合词
      result.push({
        word: parts.join("-"), // "state-of-the-art"
        lemma: lemmaParts.join("-"), // "state-of-the-art"
        pos: current.partOfSpeech.tag,
        offset: current.text.beginOffset,
      });

      i = j; // 继续处理后续 token
    } else {
      // 7. 普通单词（非标点符号、非复合词）
      if (current.partOfSpeech.tag !== "PUNCT") {
        result.push({
          word: current.text.content,
          lemma: current.lemma,
          pos: current.partOfSpeech.tag,
          offset: current.text.beginOffset,
        });
      }
      i++;
    }
  }

  return result;
}
