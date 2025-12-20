import { Checkbox } from "@radix-ui/react-checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { highlightWordInSentence } from "@/utils/text-utils";

interface ExplanationItem {
  word: string; // 单词在文章中的形式（用于展示）
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
}

export default function Explanation({
  explanations,
  selectedWords,
  toggleWordSelection,
}: {
  explanations: ExplanationItem[];
  selectedWords: Set<string>;
  toggleWordSelection: (word: string) => void;
}) {
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "new":
        return (
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            ✨ 新
          </Badge>
        );
      case "extend":
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            🔄 扩展
          </Badge>
        );
      case "existing":
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            📖 已掌握
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-2 pr-2">
        {/* 
          重要：展示所有单词解释，包括 isExisting: true 的单词
          这些单词虽然不可保存，但需要在UI中展示，让用户了解：
          1. 系统识别出了这些单词
          2. AI判断这些单词的含义用户已掌握
          3. 提供完整的词汇分析视图
        */}
        {explanations.map((item) => {
        const isSelected = selectedWords.has(item.word);
        const isDisabled = item.isExisting; // existing 类型不可选择，但仍需正常展示

        return (
          <div
            key={item.word}
            className={`border-2 rounded-lg p-3 transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 cursor-pointer"
                : "border-border hover:border-primary/50 cursor-pointer"
            } ${isDisabled ? "cursor-not-allowed" : ""}`}
            onClick={() => !isDisabled && toggleWordSelection(item.word)}
          >
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={isSelected}
                disabled={isDisabled}
                onCheckedChange={() =>
                  !isDisabled && toggleWordSelection(item.word)
                }
                className="mt-0.5"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-base font-bold text-foreground">
                    {item.word}
                    {item.pos && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {item.pos}
                      </span>
                    )}
                  </h3>
                  {getTypeBadge(item.type)}
                </div>

                <div className="space-y-2">
                  {/* 含义解释部分 */}
                  <div className="text-sm text-foreground">
                    <span className="font-bold">含义：</span>
                    <span className="text-foreground">
                      {item.meaningText || (
                        <span className="text-muted-foreground italic">
                          AI 服务暂时不可用，无法获取解释
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 原文例句（必填） */}
                  {item.exampleSentence && (
                    <div className="text-sm text-foreground">
                      <span className="font-bold">原文例句：</span>
                      <span className="text-foreground">
                        "
                        {highlightWordInSentence(item.exampleSentence, item.word)}
                        "
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </ScrollArea>
  );
}
