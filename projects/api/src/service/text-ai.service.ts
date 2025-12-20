/**
 * AI 解释服务模块
 *
 * 职责：
 * 1. 使用 AI 为单词生成上下文相关的中文解释
 * 2. 判断单词的含义是否已掌握（isExisting）
 * 3. 对单词进行分类（new / extend / existing）
 * 4. 保存新学习的单词含义到数据库
 *
 * 核心流程：
 * 单词列表 → AI 解释 → 含义分类 → 用户选择 → 数据库保存
 */

import { type DB } from "../db/db";
import { userLearnedMeanings } from "../db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { getOpenAIClient } from "../utils/openai-client";
import { buildWordExplanationPrompt, getSystemMessage } from "../utils/prompts";
import { type WordsWithMeanings, type UnfamiliarWord } from "./text.service";
import {
  withTimeout,
  classifyAIError,
  AIParseError,
  AIValidationError,
  getUserFriendlyMessage,
} from "../utils/ai-error-handler";
import { generateFallbackExplanations } from "../utils/ai-fallback";
import { extractSentenceFromArticle } from "../utils/sentence-extractor";

/**
 * AI 解释结果类型
 *
 * 表示 AI 为单词生成的解释，包含：
 * - 单词的不同形式（文中形式 vs 原型）
 * - 上下文中的中文含义
 * - 是否已掌握的判断（isExisting）
 * - 例句
 */
export interface WordExplanation {
  wordInText: string; // 单词在文章中的形式（用于前端展示，如 "running", "You"）
  lemma: string; // 单词原型/词根（小写，用于数据库保存，如 "run", "you"）
  pos?: string; // 词性（可选，如 NOUN, VERB, ADJ）
  meaningText: string; // 在当前上下文中的中文含义
  isExisting: boolean; // AI 判断：该含义是否已掌握（true=已掌握，无需保存）
  exampleSentence: string; // 单词在文章中的原句（用于展示上下文）
}

/**
 * 分类后的单词解释类型
 *
 * 在 WordExplanation 基础上，添加了：
 * - type: 前端展示用的分类标签
 * - learnedMeanings: extend 类型时，已学过的其他含义
 *
 * 分类逻辑：
 * - new: 全新单词，无任何学习记录
 * - extend: 同词新义，该词有其他含义，但当前含义是新的
 * - existing: 已学含义，AI 判断当前含义已掌握
 */
export interface ClassifiedWordExplanation {
  word: string; // 单词在文章中的形式（前端展示用）
  lemma: string; // 单词原型（数据库保存用）
  pos?: string; // 词性
  meaningText: string; // 中文含义
  exampleSentence: string; // 例句
  type: "new" | "extend" | "existing"; // 分类类型（前端 UI 展示用）
  isExisting: boolean; // AI 判断结果（后端验证用）
  learnedMeanings?: Array<{
    // extend 类型：已学过的其他含义
    id: number;
    meaningText: string;
    pos?: string;
  }>;
}

/**
 * 使用 AI 生成词汇解释
 *
 * 核心功能：
 * 1. 将单词列表和文章内容发送给 AI（GPT-4o-mini）
 * 2. AI 分析每个单词在上下文中的含义
 * 3. 对于有学习记录的单词，AI 判断已有含义是否适用（isExisting）
 * 4. 返回所有单词的解释（包括 isExisting=true 的，用于前端展示）
 *
 * 重要原则：
 * - 所有单词都必须返回解释（包括已掌握的）
 * - 即使 isExisting=true，也要提供 meaningText（用于前端展示上下文含义）
 * - 只有 isExisting=false 的单词会被保存到数据库
 *
 * 错误处理：
 * - 超时控制：60 秒超时
 * - 降级方案：如果 AI 调用失败，返回降级数据（单词列表，无解释）
 *
 * @param articleContent - 原始文章内容（用于 AI 分析上下文）
 * @param newWords - 完全陌生的词汇列表（无学习记录）
 * @param wordsWithMeanings - 有学习记录的词汇列表（需要 AI 判断是否适用）
 * @param apiKey - OpenAI API Key
 * @param allUnfamiliarWords - 所有陌生词汇列表（用于降级方案）
 * @returns AI 生成的单词解释列表（包含 isExisting 判断），如果失败则返回降级数据
 */
export async function explainWordsByAi(
  articleContent: string,
  newWords: Array<{ word: string; lemma: string }>,
  wordsWithMeanings: WordsWithMeanings[],
  apiKey: string,
  allUnfamiliarWords?: UnfamiliarWord[]
): Promise<WordExplanation[]> {
  // 1. 创建 OpenAI 客户端
  const openai = getOpenAIClient(apiKey);

  // 2. 构建 Prompt（详见 utils/prompts.ts）
  // Prompt 包含：文章内容、新单词列表、有学习记录的单词及其已学含义
  const prompt = buildWordExplanationPrompt(
    articleContent,
    newWords,
    wordsWithMeanings
  );

  try {
    // 3. 调用 OpenAI API（带超时控制）
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: getSystemMessage(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0, // 低温度确保输出稳定性和一致性
        response_format: { type: "json_object" }, // 强制返回 JSON 格式
      }),
      60000 // 60 秒超时
    );

    // 4. 解析响应
    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new AIParseError("AI 返回内容为空");
    }

    // 5. 解析 JSON
    // 使用 unknown 类型而非 any：
    // - unknown 是类型安全的，必须先进行类型检查才能使用
    // - any 会绕过所有类型检查，可能导致运行时错误
    // - AI 响应格式不固定，使用 unknown 强制我们进行运行时验证
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      // 移除 parseError 参数：catch 块中不需要使用错误对象
      // 只需记录错误信息并抛出自定义错误即可
      console.error("JSON 解析失败：", responseText);
      throw new AIParseError("AI 返回的内容不是有效的 JSON 格式");
    }
    console.log("AI响应结果: ", parsedResponse);

    // 6. 提取解释列表
    // 兼容多种可能的响应格式：{ words: [...] } 或 { explanations: [...] } 或直接数组
    let explanations: WordExplanation[] = [];

    // 使用类型守卫（type guards）进行安全的类型检查：
    // 1. 先检查 parsedResponse 是否为对象
    // 2. 使用 'in' 操作符检查属性是否存在
    // 3. 使用 Array.isArray() 验证是否为数组
    // 这样可以确保类型安全，避免运行时错误
    if (
      parsedResponse &&
      typeof parsedResponse === "object" &&
      "words" in parsedResponse &&
      Array.isArray(parsedResponse.words)
    ) {
      explanations = parsedResponse.words;
    } else if (
      parsedResponse &&
      typeof parsedResponse === "object" &&
      "explanations" in parsedResponse &&
      Array.isArray(parsedResponse.explanations)
    ) {
      explanations = parsedResponse.explanations;
    } else if (Array.isArray(parsedResponse)) {
      explanations = parsedResponse;
    } else {
      console.error("AI 返回的 JSON 格式不符合预期:", parsedResponse);
      throw new AIParseError(
        "AI 返回的 JSON 格式不符合预期，期望包含 words 数组"
      );
    }

    // 7. 验证并修复数据格式
    // 确保每个解释都包含必填字段，且格式正确
    // 如果缺少 exampleSentence，自动从文章中提取
    // 重要：所有单词（包括 isExisting=true）都必须有 meaningText（用于前端展示）
    const validExplanations = explanations
      .map((item) => {
        // 基础字段验证
        if (!item.wordInText || typeof item.wordInText !== "string") {
          console.warn("验证失败 - wordInText:", item);
          return null;
        }
        if (!item.lemma || typeof item.lemma !== "string") {
          console.warn("验证失败 - lemma:", item);
          return null;
        }
        if (typeof item.isExisting !== "boolean") {
          console.warn("验证失败 - isExisting:", item);
          return null;
        }

        // meaningText 验证：所有单词都必须提供含义（用于前端展示）
        // 无论 isExisting 状态如何，都需要提供上下文中的含义
        if (
          !item.meaningText ||
          typeof item.meaningText !== "string" ||
          item.meaningText.trim().length === 0
        ) {
          console.warn("验证失败 - meaningText:", item);
          return null;
        }

        // exampleSentence 验证：如果缺失，自动从文章中提取（兜底方案）
        if (!item.exampleSentence || typeof item.exampleSentence !== "string") {
          console.warn(
            `AI 未提供 exampleSentence，自动从文章中提取：${item.wordInText}`
          );
          const extractedSentence = extractSentenceFromArticle(
            articleContent,
            item.wordInText
          );

          if (extractedSentence) {
            // 补充缺失的 exampleSentence
            item.exampleSentence = extractedSentence;
            console.log(
              `已自动补充 exampleSentence：${item.wordInText} -> "${extractedSentence}"`
            );
          } else {
            console.warn(
              `无法从文章中提取 exampleSentence：${item.wordInText}，跳过该单词`
            );
            return null;
          }
        }

        return item;
      })
      .filter((item): item is WordExplanation => item !== null);

    // 验证：至少应该有一些有效的解释
    if (validExplanations.length === 0) {
      console.error("所有解释都未通过验证！原始数据:", explanations);
      throw new AIValidationError("AI 返回的解释数据格式不正确");
    }

    console.log(
      `验证通过：${validExplanations.length} 个有效解释（其中 ${
        validExplanations.filter((e) => e.isExisting).length
      } 个已掌握）`
    );

    return validExplanations;
  } catch (error) {
    // 错误分类和处理
    const aiError = classifyAIError(error);
    console.error("AI 解释生成失败：", {
      type: aiError.type,
      message: aiError.message,
      retryable: aiError.retryable,
      originalError: aiError.originalError,
    });

    // 如果提供了所有陌生词汇列表，返回降级数据
    if (allUnfamiliarWords && allUnfamiliarWords.length > 0) {
      console.warn(
        `AI 服务不可用，返回降级数据（${allUnfamiliarWords.length} 个单词）`
      );
      return generateFallbackExplanations(allUnfamiliarWords);
    }

    // 如果没有提供降级数据，抛出错误（由调用方处理）
    throw new Error(getUserFriendlyMessage(aiError));
  }
}

/**
 * 对单词解释进行分类
 *
 * 根据 AI 的 isExisting 判断和用户的学习历史，将单词分为三类：
 *
 * 1. **new（全新单词）**
 *    - 条件：isExisting=false 且无学习记录
 *    - 含义：该单词从未学过，是全新的
 *    - UI 样式：高亮，默认勾选
 *
 * 2. **extend（同词新义）**
 *    - 条件：isExisting=false 且有学习记录
 *    - 含义：该单词学过其他含义，但当前含义是新的
 *    - UI 样式：高亮，默认勾选，显示已学过的其他含义
 *
 * 3. **existing（已学含义）**
 *    - 条件：isExisting=true
 *    - 含义：AI 判断该含义已掌握，适用于当前上下文
 *    - UI 样式：正常展示，但不可选中，不会保存到数据库
 *
 * @param explanations - AI 返回的单词解释列表
 * @param originalWords - 原始单词列表（保留用于向后兼容，AI 现在直接返回 wordInText）
 * @param userId - 用户 ID
 * @param db - 数据库实例
 * @returns 分类后的单词解释列表（包含 type 字段）
 */
export async function classifyWordMeanings(
  explanations: WordExplanation[],
  _originalWords: Array<{ word: string; lemma: string }>, // 保留用于向后兼容，使用下划线前缀标记为故意未使用
  userId: number,
  db: DB
): Promise<ClassifiedWordExplanation[]> {
  const classified: ClassifiedWordExplanation[] = [];

  // 1. 收集所有需要查询的单词（使用 lemma 原型）
  const lemmasToQuery = new Set<string>();
  for (const exp of explanations) {
    const lemma = exp.lemma.toLowerCase();
    lemmasToQuery.add(lemma);
  }

  // 2. 批量查询所有单词的历史记录
  // 目的：判断哪些单词有学习记录，用于区分 new 和 extend
  const historyRecordsMap = new Map<
    string,
    Array<{
      id: number;
      meaningText: string;
      pos?: string;
    }>
  >();

  if (lemmasToQuery.size > 0) {
    const historyRecords = await db
      .select({
        id: userLearnedMeanings.id,
        word: userLearnedMeanings.word,
        meaningText: userLearnedMeanings.meaningText,
        pos: userLearnedMeanings.pos,
      })
      .from(userLearnedMeanings)
      .where(
        and(
          eq(userLearnedMeanings.userId, userId),
          inArray(userLearnedMeanings.word, Array.from(lemmasToQuery))
        )
      );

    // 按单词（lemma）分组，收集每个单词的所有学习记录
    for (const record of historyRecords) {
      const lemma = record.word.toLowerCase();
      if (!historyRecordsMap.has(lemma)) {
        historyRecordsMap.set(lemma, []);
      }
      historyRecordsMap.get(lemma)!.push({
        id: record.id,
        meaningText: record.meaningText,
        pos: record.pos || undefined,
      });
    }
  }

  // 3. 对每个解释进行分类
  for (const explanation of explanations) {
    const lemma = explanation.lemma.toLowerCase();
    const wordInText = explanation.wordInText; // AI 返回的单词在文中的形式
    const historyRecords = historyRecordsMap.get(lemma) || [];

    let type: "new" | "extend" | "existing";
    let learnedMeanings:
      | Array<{
          id: number;
          meaningText: string;
          pos?: string;
        }>
      | undefined;

    // 分类逻辑（根据 PRD）
    if (explanation.isExisting) {
      // 情况 C：已学含义
      // AI 判断该含义已掌握，适用于当前上下文
      type = "existing";
    } else {
      // isExisting = false，需要进一步判断是 new 还是 extend
      if (historyRecords.length > 0) {
        // 情况 B：同词新义
        // 该词有其他学习记录，但当前含义是新的
        type = "extend";
        learnedMeanings = historyRecords; // 附加已学过的其他含义
      } else {
        // 情况 A：全新单词
        // 该词没有任何学习记录
        type = "new";
      }
    }

    // 构建分类后的解释对象
    classified.push({
      word: wordInText, // 单词在文章中的形式（前端展示用）
      lemma: lemma, // 单词原型（数据库保存用）
      pos: explanation.pos,
      meaningText: explanation.meaningText, // 中文含义
      exampleSentence: explanation.exampleSentence, // 例句
      type, // 分类类型
      isExisting: explanation.isExisting, // AI 判断结果
      learnedMeanings, // extend 类型：已学过的其他含义
    });
  }

  return classified;
}

/**
 * 保存单词含义到数据库
 *
 * 重要原则：
 * - 只保存 isExisting=false 的单词（type 为 new 或 extend）
 * - isExisting=true 的单词不保存（已掌握，无需重复学习）
 * - 双重验证：前端过滤 + 后端过滤，确保数据安全
 *
 * 保存内容：
 * - 单词原型（lemma，小写）
 * - 中文含义
 * - 例句
 * - 词性
 * - Anki 算法初始值（用于后续复习）
 *
 * @param meanings - 分类后的单词解释列表（用户选中的）
 * @param userId - 用户 ID
 * @param articleId - 来源文章 ID（可选）
 * @param db - 数据库实例
 * @returns 保存结果统计
 */
export async function saveWordMeanings(
  meanings: ClassifiedWordExplanation[],
  userId: number,
  articleId: number | null,
  db: DB
): Promise<{
  savedCount: number;
}> {
  let savedCount = 0;

  // 过滤掉 isExisting=true 的记录（双重保护）
  // 虽然前端已经过滤，但后端也需要验证，确保不保存已掌握的含义
  const meaningsToSave = meanings.filter((m) => !m.isExisting);

  if (meaningsToSave.length === 0) {
    return { savedCount: 0 };
  }

  // 准备批量插入的数据
  const valuesToInsert = meaningsToSave.map((meaning) => ({
    userId,
    word: meaning.lemma.toLowerCase(), // 使用 lemma（原型）保存到数据库
    wordInText: meaning.word, // 保存单词在文中的实际形态
    pos: meaning.pos || null,
    meaningText: meaning.meaningText,
    exampleSentence: meaning.exampleSentence || null,
    sourceTextId: articleId,
    // Anki 间隔重复算法的初始值
    easeFactor: 2.5, // 初始难度系数
    intervalDays: 1, // 初始间隔天数
    repetitions: 0, // 重复次数
    nextReviewDate: new Date(), // 立即可复习
    lastSeenAt: new Date(),
    totalReviews: 0,
  }));

  try {
    // 尝试批量插入（性能更好）
    await db.insert(userLearnedMeanings).values(valuesToInsert);
    savedCount = valuesToInsert.length;
  } catch (error) {
    console.error("批量保存失败，尝试逐个保存:", error);

    // 批量插入失败（可能是唯一约束冲突），尝试逐个插入
    for (const value of valuesToInsert) {
      try {
        await db.insert(userLearnedMeanings).values(value);
        savedCount++;
      } catch (singleError) {
        console.warn(`单词 ${value.word} 保存失败:`, singleError);
        // 继续处理下一个，不中断整个流程
      }
    }
  }

  return { savedCount };
}
