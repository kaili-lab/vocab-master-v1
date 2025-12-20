import type { ExtendedUser } from "@/lib/api-client";

export type VocabularyLevel = NonNullable<ExtendedUser["vocabularyLevel"]>;

export interface VocabularyLevelInfo {
  id: VocabularyLevel;
  emoji: string;
  title: string;
  scene: string;
  reference: string;
  wordCount: string;
  label: string;
  cumulativeWords: number; // 累积词汇量
  newWords: number; // 该等级新增词汇
}

export const vocabularyLevels: VocabularyLevelInfo[] = [
  {
    id: "primary_school",
    emoji: "📚",
    title: "小学词汇",
    scene: "适合：零基础、儿童学习",
    reference: "新增 441 词 | 累积 441 词",
    wordCount: "441",
    label: "小学",
    cumulativeWords: 441,
    newWords: 441,
  },
  {
    id: "middle_school",
    emoji: "📖",
    title: "初中词汇",
    scene: "适合：日常对话、简单阅读",
    reference: "新增 1,466 词 | 累积 1,907 词",
    wordCount: "1907",
    label: "初中",
    cumulativeWords: 1907,
    newWords: 1466,
  },
  {
    id: "high_school",
    emoji: "📝",
    title: "高中词汇",
    scene: "适合：新闻阅读、影视字幕",
    reference: "新增 1,751 词 | 累积 3,658 词",
    wordCount: "3658",
    label: "高中",
    cumulativeWords: 3658,
    newWords: 1751,
  },
  {
    id: "cet4",
    emoji: "🎓",
    title: "大学四级",
    scene: "适合：学术文章、工作邮件",
    reference: "新增 1,519 词 | 累积 5,177 词",
    wordCount: "5177",
    label: "四级",
    cumulativeWords: 5177,
    newWords: 1519,
  },
  {
    id: "cet6",
    emoji: "🎯",
    title: "大学六级",
    scene: "适合：专业论文、外刊阅读",
    reference: "新增 1,034 词 | 累积 6,211 词",
    wordCount: "6211",
    label: "六级",
    cumulativeWords: 6211,
    newWords: 1034,
  },
  {
    id: "ielts_toefl",
    emoji: "🎖️",
    title: "雅思托福",
    scene: "适合：留学考试、学术研究",
    reference: "新增 1,445 词 | 累积 7,656 词",
    wordCount: "7656",
    label: "托福",
    cumulativeWords: 7656,
    newWords: 1445,
  },
  {
    id: "gre",
    emoji: "🏆",
    title: "GRE 研究生",
    scene: "适合：研究生入学、高级学术",
    reference: "新增 4,295 词 | 累积 11,951 词",
    wordCount: "11951",
    label: "GRE",
    cumulativeWords: 11951,
    newWords: 4295,
  },
];

// 通过 ID 获取词汇等级信息
export function getVocabularyLevelById(id: VocabularyLevel | null | undefined) {
  if (!id) return null;
  return vocabularyLevels.find((level) => level.id === id);
}

// 获取词汇等级显示信息（用于 Badge）
export function getVocabularyDisplay(
  level: VocabularyLevel | null | undefined
) {
  const levelInfo = getVocabularyLevelById(level);

  if (!levelInfo) {
    return {
      label: "未设置",
      wordCount: "0",
      emoji: "❓",
    };
  }

  return {
    label: levelInfo.label,
    wordCount: levelInfo.wordCount,
    emoji: levelInfo.emoji,
  };
}
