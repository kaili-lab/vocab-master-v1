import { useState } from "react";
import { Sparkles, Trash2, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Explanation from "./explanation";
import UsageGuide from "./usage-guide";
import { QuotaInfoCard } from "./quota-info";
import { UpgradeModal } from "./upgrade-modal";
import { useQuota } from "@/hooks/use-quota";
import { apiClient } from "@/lib/api-client"; // 确保已导入
import {
  showToastError,
  showToastWarning,
  showToastSuccess,
} from "@/utils/toast";

interface UnfamiliarWord {
  word: string; // 单词在文中的形式
  lemma: string; // 单词原形（小写）
}

interface Explanation {
  word: string; // 单词在文章中的形式（用于展示）
  lemma: string; // 单词原型（用于保存到数据库）
  pos?: string; // 词性（可选）
  meaningText: string; // 在上下文中的含义（中文）
  exampleSentence: string; // 单词在上下文中的句子（必填）
  type: "new" | "extend" | "existing"; // 分类类型
  isExisting: boolean; // 是否使用已有含义
  learnedMeanings?: Array<{
    // extend 类型：已学过的其他含义
    id: number;
    meaningText: string;
    pos?: string;
  }>;
}

export default function ArticleAnalysis() {
  const [articleContent, setArticleContent] = useState("");
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualWord, setManualWord] = useState("");
  const [unknownWords, setUnknownWords] = useState<UnfamiliarWord[]>([]);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [selectedWords, setSelectedWords] = useState(new Set<string>());
  const [isLoadingExplanations, setIsLoadingExplanations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 配额信息
  const {
    quota,
    isLoading: isLoadingQuota,
    refetch: refetchQuota,
  } = useQuota();

  // 升级模态框
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"quota" | "words">(
    "quota"
  );
  const [currentWordCount, setCurrentWordCount] = useState(0);

  // 计算文章字数
  const calculateWordCount = (text: string): number => {
    return text.split(/\s+/).filter((word) => word.trim().length > 0).length;
  };

  // 实时更新字数
  const wordCount = calculateWordCount(articleContent);
  const maxWords = quota?.maxArticleWords || 1000;
  const isWordLimitExceeded = wordCount > maxWords;

  // 分析文章
  const handleAnalyze = async () => {
    if (!articleContent.trim()) {
      showToastWarning("请先输入文章内容", 1000);
      return;
    }

    // 前端字数验证
    if (isWordLimitExceeded) {
      setCurrentWordCount(wordCount);
      setUpgradeReason("words");
      setUpgradeModalOpen(true);
      return;
    }

    setIsAnalyzing(true);

    try {
      // 调用后端 API
      const response = await apiClient.api.text.analyze.$post({
        json: { content: articleContent },
      });

      if (!response.ok) {
        // 🔧 修复：正确解构错误响应
        const errorData = await response.json();
        throw new Error((errorData as { error?: string }).error || "分析失败");
      }

      // 🔧 修复：正确解构成功响应
      const result = await response.json();

      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success
      ) {
        const data = result as {
          success: true;
          data: {
            unfamiliarWords: Array<{ word: string; lemma: string }>;
            totalWords: number;
          };
        };
        setUnknownWords(data.data.unfamiliarWords);
        setIsAnalyzed(true);

        // 刷新配额信息
        refetchQuota();
      } else {
        throw new Error("分析失败");
      }
    } catch (error) {
      console.error("分析失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "分析失败，请重试";

      // 检查是否是配额或字数限制错误
      if (errorMessage.includes("每日") || errorMessage.includes("限制")) {
        if (errorMessage.includes("超过") && errorMessage.includes("词")) {
          // 字数超限
          setCurrentWordCount(wordCount);
          setUpgradeReason("words");
          setUpgradeModalOpen(true);
        } else {
          // 次数超限
          setUpgradeReason("quota");
          setUpgradeModalOpen(true);
        }
      } else {
        showToastError(errorMessage, 1000);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 删除陌生词
  const handleRemoveWord = (word: string) => {
    setUnknownWords((prev) =>
      prev.filter((w) => w.word !== word && w.lemma !== word)
    );
    // 同时从解释列表和选中列表中移除
    setExplanations((prev) => prev.filter((e) => e.word !== word));
    setSelectedWords((prev) => {
      const newSet = new Set(prev);
      newSet.delete(word);
      return newSet;
    });
  };

  // 添加陌生词
  const handleAddWord = () => {
    const word = manualWord.trim();

    if (!word) {
      showToastWarning("请输入词汇", 1000);
      return;
    }

    // 检查是否已存在（检查 word 和 lemma）
    const exists = unknownWords.some(
      (w) =>
        w.word.toLowerCase() === word.toLowerCase() ||
        w.lemma.toLowerCase() === word.toLowerCase()
    );

    if (exists) {
      showToastWarning("该词汇已存在", 1000);
      return;
    }

    // 检查词汇是否存在于文章中（忽略大小写）
    const wordInArticle = articleContent
      .toLowerCase()
      .includes(word.toLowerCase());

    if (!wordInArticle) {
      showToastWarning(
        `词汇"${word}"不在文章中，请检查拼写或确认是否需要添加`,
        3000
      );
      return;
    }

    // 添加时，word 和 lemma 都使用用户输入的值（小写作为 lemma）
    setUnknownWords((prev) => [
      ...prev,
      { word: word, lemma: word.toLowerCase() },
    ]);
    setManualWord("");
  };

  // 标记为已认识的单词
  const handleMarkAsKnown = async (word: string) => {
    try {
      // 找到对应的词汇信息
      const wordInfo = unknownWords.find(
        (w) => w.word === word || w.lemma === word
      );

      if (!wordInfo) {
        showToastError("未找到该词汇信息");
        return;
      }

      // 调用后端 API 将单词标记为已认识
      const response = await apiClient.api["known-words"].add.$post({
        json: {
          word: wordInfo.word,
          lemma: wordInfo.lemma,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error((errorData as { error?: string }).error || "标记失败");
      }

      const result = await response.json();

      // 从陌生词列表中移除
      handleRemoveWord(word);

      // 显示成功提示
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success
      ) {
        const data = result as {
          success: true;
          data: { alreadyExists?: boolean; message?: string };
        };

        if (data.data.alreadyExists) {
          showToastSuccess(`"${word}" 已在已认知列表中`, 2000);
        } else {
          showToastSuccess(`"${word}" 已标记为认识`, 2000);
        }
      }
    } catch (error) {
      console.error("标记为已认识失败:", error);
      showToastError(
        error instanceof Error ? error.message : "标记失败，请重试",
        2000
      );
    }
  };

  // 获取AI解释
  const handleGetExplanations = async () => {
    if (unknownWords.length === 0) {
      showToastWarning("请至少保留一个词汇", 1000);
      return;
    }

    setIsLoadingExplanations(true);

    try {
      // 调用后端 AI API（新PRD流程）
      // 发送单词在文中的形式，同时包含原型
      const response = await apiClient.api.text.explain.$post({
        json: {
          unfamiliarWords: unknownWords.map((w) => ({
            word: w.word, // 单词在文中的形式
            lemma: w.lemma, // 单词原型
          })),
          articleContent: articleContent,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          (errorData as { error?: string }).error || "生成解释失败"
        );
      }

      const result = await response.json();
      console.log(result);

      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success
      ) {
        const data = result as {
          success: true;
          data: {
            results: Array<{
              word: string; // 单词在文章中的形式
              lemma: string; // 单词原型
              pos?: string;
              meaningText: string; // 在上下文中的含义（中文）
              exampleSentence: string; // 单词在上下文中的句子（必填）
              type: "new" | "extend" | "existing";
              isExisting: boolean;
              learnedMeanings?: Array<{
                id: number;
                meaningText: string;
                pos?: string;
              }>;
            }>;
            isFallback?: boolean; // 是否为降级数据
          };
        };

        // 检查是否为降级数据
        if (data.data.isFallback) {
          showToastWarning(
            "AI 服务暂时不可用，已返回基础单词列表。请稍后重试或联系管理员。",
            5000
          );
        }

        // 重要：设置所有解释（包括 isExisting: true 的单词）
        // 这些单词需要在UI中展示，让用户了解AI的判断结果
        setExplanations(data.data.results);

        // 默认选择：new 和 extend 类型默认选中，existing 类型不选中
        // 注意：existing 类型的单词仍然会在UI中显示，只是不可勾选
        const defaultSelected = new Set(
          data.data.results
            .filter((e) => !e.isExisting) // 只选择 isExisting=false 的
            .map((e) => e.word)
        );
        setSelectedWords(defaultSelected);
      } else {
        throw new Error("生成解释失败");
      }
    } catch (error) {
      console.error("获取解释失败:", error);
      showToastError(
        error instanceof Error ? error.message : "获取解释失败，请重试"
      );
    } finally {
      setIsLoadingExplanations(false);
    }
  };

  // 切换词汇选择（existing 类型不允许选择）
  const toggleWordSelection = (word: string) => {
    const explanation = explanations.find((e) => e.word === word);
    if (explanation?.isExisting) {
      // existing 类型不允许选择
      return;
    }

    setSelectedWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  };

  // 全选/取消全选（只选择可保存的单词，即 isExisting=false）
  const handleToggleAll = () => {
    const savableWords = explanations
      .filter((e) => !e.isExisting)
      .map((e) => e.word);
    const allSelected = savableWords.every((word) => selectedWords.has(word));

    if (allSelected) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(savableWords));
    }
  };

  // 加入词汇表
  const handleAddToVocabulary = async () => {
    if (selectedWords.size === 0) {
      showToastWarning("请至少选择一个词汇");
      return;
    }

    if (isSaving) {
      return; // 防止重复点击
    }

    setIsSaving(true);

    // 筛选选中的解释，并过滤掉 isExisting=true 的记录（双重保护）
    const selectedExplanations = explanations.filter(
      (e) => selectedWords.has(e.word) && !e.isExisting
    );

    if (selectedExplanations.length === 0) {
      showToastWarning("没有可保存的词汇（已掌握的词汇不能保存）");
      setIsSaving(false);
      return;
    }

    try {
      // 调用后端 API 保存词汇（新PRD格式）
      const response = await apiClient.api.text.save.$post({
        json: {
          words: selectedExplanations.map((e) => ({
            word: e.word, // 单词在文章中的形式（用于展示）
            lemma: e.lemma, // 单词原型（用于保存到数据库）
            pos: e.pos,
            meaningText: e.meaningText, // 中文含义
            exampleSentence: e.exampleSentence, // 上下文中的句子
            isExisting: false as const, // 必须是 false
            type: e.type,
          })),
          articleContent: articleContent,
          // articleTitle 可选，可以后续添加
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error((errorData as { error?: string }).error || "保存失败");
      }

      const result = await response.json();

      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success
      ) {
        const data = result as {
          success: true;
          data: {
            savedCount: number;
            totalCount: number;
            articleId: number | null;
          };
        };

        // 显示成功消息
        showToastSuccess(`成功保存 ${data.data.savedCount} 个新词汇！`, 3000);

        // 重置状态
        setArticleContent("");
        setIsAnalyzed(false);
        setUnknownWords([]);
        setExplanations([]);
        setSelectedWords(new Set());
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("保存词汇失败:", error);
      showToastError(
        error instanceof Error ? error.message : "保存词汇失败，请重试",
        2000
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 重新开始
  const handleReset = () => {
    setArticleContent("");
    setIsAnalyzed(false);
    setUnknownWords([]);
    setExplanations([]);
    setSelectedWords(new Set());
  };

  // 统一两列面板的高度上限，配合 grid 的 stretch 行为让高度随内容同步变化
  const synchronizedPanelMaxHeight = "lg:max-h-[calc(133.33vh-200px)]";

  return (
    <div>
      {/* 配额信息 */}
      {!isLoadingQuota && quota && <QuotaInfoCard quota={quota} />}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* 左侧：文章输入 + 词汇管理（统一 Card） */}
        <Card
          className={`flex flex-col overflow-hidden lg:h-full ${synchronizedPanelMaxHeight}`}
        >
          {/* 文章输入区域 */}
          <CardHeader className="shrink-0">
            <CardTitle className="text-xl lg:text-2xl">文章内容</CardTitle>
            <CardAction>
              <div className="space-x-4">
                <Button
                  onClick={handleReset}
                  disabled={
                    isAnalyzing ||
                    isLoadingExplanations ||
                    isSaving ||
                    !articleContent.trim()
                  }
                  size="sm"
                >
                  重新开始
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={
                    isAnalyzing ||
                    isAnalyzed ||
                    !articleContent.trim() ||
                    isWordLimitExceeded
                  }
                  size="sm"
                >
                  {isAnalyzing ? "分析中..." : "分析文章"}
                </Button>
              </div>
            </CardAction>
          </CardHeader>

          <ScrollArea className="flex-1 min-h-0">
            <CardContent className="shrink-0 flex flex-col gap-4">
              <div className="h-[350px]">
                <ScrollArea className="h-full w-full rounded-lg border">
                  <Textarea
                    value={articleContent}
                    onChange={(e) => setArticleContent(e.target.value)}
                    placeholder="粘贴您的英文文章..."
                    readOnly={isAnalyzed}
                    className={`w-full min-h-[350px] overflow-hidden resize-none text-base leading-relaxed border-0 focus-visible:ring-0 ${
                      isAnalyzed ? "cursor-default bg-muted/30 select-text" : ""
                    }`}
                  />
                </ScrollArea>
              </div>

              {/* 字数统计和提示 */}
              <div className="shrink-0 flex items-center justify-between text-sm">
                <div
                  className={`font-medium ${
                    isWordLimitExceeded
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  字数: {wordCount.toLocaleString()} / {maxWords.toLocaleString()}
                  {isWordLimitExceeded && (
                    <span className="ml-2 text-xs">
                      超出 {(wordCount - maxWords).toLocaleString()} 词
                    </span>
                  )}
                </div>
                {isAnalyzed && (
                  <p className="text-xs font-bold text-destructive">
                    文章已锁定，如需修改请重新开始
                  </p>
                )}
              </div>
            </CardContent>

            {/* 陌生词汇区域（条件渲染） */}
            {isAnalyzed && (
              <>
                <div className="border-t shrink-0" />

                <CardHeader className="shrink-0">
                  <CardTitle className="text-xl lg:text-2xl">陌生词汇</CardTitle>
                  <CardAction>
                    <Badge variant="secondary" className="text-xs">
                      {unknownWords.length} 个词汇
                    </Badge>
                  </CardAction>
                </CardHeader>

                <CardContent className="shrink-0 space-y-4">
                  {/* Badge 词汇列表 */}
                  <div className="w-full h-[160px]">
                    <ScrollArea className="h-full w-full rounded-lg border bg-muted">
                      <div className="flex flex-wrap gap-1.5 p-3 min-h-[60px]">
                        {unknownWords.map((item) => (
                          <Badge
                            key={`${item.word}-${item.lemma}`}
                            variant="default"
                            className="px-2.5 py-1 text-xs gap-1.5"
                          >
                            <span>{item.word}</span>
                            {/* 这里不使用Button组件， 因为它带有默认样式 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsKnown(item.word);
                              }}
                              className="hover:text-amber-500 hover:scale-110 transition-all duration-200"
                              title="标记为已认识"
                              aria-label={`标记${item.word}为已认识`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveWord(item.word);
                              }}
                              className="hover:text-destructive hover:scale-110 transition-all duration-200"
                              title="删除"
                              aria-label={`删除${item.word}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* 手动添加 */}
                  <div className="flex gap-2">
                    <Input
                      value={manualWord}
                      onChange={(e) => setManualWord(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                      placeholder="手动添加词汇..."
                      className="text-sm"
                    />
                    <Button onClick={handleAddWord} variant="secondary" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={handleGetExplanations}
                    disabled={
                      isLoadingExplanations ||
                      isSaving ||
                      unknownWords.length === 0
                    }
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isLoadingExplanations ? "生成中..." : "获取 AI 解释"}
                  </Button>
                </CardContent>
              </>
            )}
          </ScrollArea>
        </Card>

        {/* 右侧：AI 解释区域 */}
        <Card
          className={`flex flex-col overflow-hidden lg:h-full ${synchronizedPanelMaxHeight}`}
        >
          <CardHeader className="shrink-0">
            <CardTitle className="text-xl lg:text-2xl">AI 词汇解释</CardTitle>
            {explanations.length > 0 && (
              <CardAction>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    已选择 {selectedWords.size} 个
                  </span>
                  <div className="flex gap-1">
                    {explanations.filter((e) => e.type === "new").length >
                      0 && (
                      <Badge
                        variant="default"
                        className="text-[10px] px-1.5 py-0"
                      >
                        新词{" "}
                        {explanations.filter((e) => e.type === "new").length}
                      </Badge>
                    )}
                    {explanations.filter((e) => e.type === "extend").length >
                      0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        扩展{" "}
                        {explanations.filter((e) => e.type === "extend").length}
                      </Badge>
                    )}
                    {explanations.filter((e) => e.type === "existing").length >
                      0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        已掌握{" "}
                        {
                          explanations.filter((e) => e.type === "existing")
                            .length
                        }
                      </Badge>
                    )}
                  </div>
                </div>
              </CardAction>
            )}
          </CardHeader>

          <ScrollArea className="flex-1 min-h-0">
            <CardContent className="shrink-0">
              {/* 解释卡片容器 */}
              {explanations.length > 0 ? (
                <div className="pr-2">
                  <Explanation
                    explanations={explanations}
                    selectedWords={selectedWords}
                    toggleWordSelection={toggleWordSelection}
                  />
                </div>
              ) : (
                <UsageGuide />
              )}
            </CardContent>

            {explanations.length > 0 && (
              <CardFooter className="shrink-0 flex-col gap-2 pt-4 border-t">
                {/* 批量操作按钮 */}
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleAddToVocabulary}
                    disabled={selectedWords.size === 0 || isSaving}
                    className="flex-1"
                  >
                    {isSaving
                      ? "保存中..."
                      : `加入词汇表 (${selectedWords.size})`}
                  </Button>
                  <Button
                    onClick={handleToggleAll}
                    variant="outline"
                    disabled={isSaving || explanations.length === 0}
                  >
                    {selectedWords.size === explanations.length ? "取消" : "全选"}
                  </Button>
                </div>

                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={isAnalyzing || isLoadingExplanations || isSaving}
                >
                  重新开始
                </Button>
              </CardFooter>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* 升级引导模态框 */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason={upgradeReason}
        currentUsage={{
          wordCount: currentWordCount,
          maxWords,
        }}
      />
    </div>
  );
}
