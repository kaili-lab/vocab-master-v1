import { useState, useEffect } from "react";
import { Volume2, Eye } from "lucide-react";
import { toast } from "sonner";

interface CardData {
  word: string;
  pronunciation?: string;
  pos?: string; // 词性
  meaning: string;
  sentence?: string;
  highlightedWord: string;
  type: "new" | "extend";
  learnedMeanings?: string[];
}

interface FlipCardProps {
  cardData: CardData;
  onFlip?: () => void;
}

export default function FlipCard({ cardData, onFlip }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // 当卡片数据变化时，重置翻转状态
  useEffect(() => {
    setIsFlipped(false);
  }, [cardData]);

  const handleFlip = () => {
    setIsFlipped(true);
    onFlip?.();
  };

  // TODO: 实现音频播放
  const handlePlayAudio = () => {
    toast.warning("播放音频功能暂未实现");
    // 后续实现: 调用 TTS API 或播放预录音频
  };

  // 高亮句子中的单词
  const renderHighlightedSentence = () => {
    const { sentence, highlightedWord } = cardData;

    // 如果没有例句，显示单词本身
    if (!sentence) {
      return (
        <p className="text-2xl md:text-3xl leading-relaxed font-light">
          <span className="bg-linear-to-r from-primary to-primary/80 text-primary-foreground px-2 py-1 rounded-md font-semibold">
            {cardData.word}
          </span>
        </p>
      );
    }

    const regex = new RegExp(`\\b${highlightedWord}\\b`, "gi");
    const parts = sentence.split(regex);
    const matches = sentence.match(regex) || [];

    return (
      <p className="text-2xl md:text-3xl leading-relaxed font-light">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {matches[i] && (
              <span className="bg-linear-to-r from-primary to-primary/80 text-primary-foreground px-2 py-1 rounded-md font-semibold">
                {matches[i]}
              </span>
            )}
          </span>
        ))}
      </p>
    );
  };

  return (
    <>
      {/* 3D翻转效果样式 */}
      <style>{`
        .card-3d {
          perspective: 1200px;
        }

        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }

        .card-inner.flipped {
          transform: rotateY(180deg);
        }

        .card-front,
        .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 1.5rem;
          background-color: var(--card);
          border: 1px solid var(--border);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .card-back {
          transform: rotateY(180deg);
        }
      `}</style>

      <div className="card-3d" style={{ height: "480px" }}>
        <div className={`card-inner ${isFlipped ? "flipped" : ""}`}>
          {/* 正面 */}
          <div
            className="card-front p-10 flex flex-col justify-between cursor-pointer"
            onClick={handleFlip}
          >
            <div className="self-start">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  cardData.type === "new"
                    ? "bg-chart-2 text-white"
                    : "bg-chart-4 text-white"
                }`}
              >
                {cardData.type === "new" ? "新单词" : "扩展含义"}
              </span>
            </div>

            <div className="text-center">{renderHighlightedSentence()}</div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted">
                <Eye className="w-5 h-5 text-primary" />
                <span className="font-medium">点击查看释义</span>
              </div>
            </div>
          </div>

          {/* 背面 */}
          <div className="card-back p-10 overflow-y-auto">
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-4xl font-bold mb-2">{cardData.word}</h2>
                  <div className="flex items-center gap-3">
                    {cardData.pronunciation && (
                      <>
                        <span className="text-lg text-muted-foreground">
                          {cardData.pronunciation}
                        </span>
                        <button
                          onClick={handlePlayAudio}
                          className="p-2 rounded-lg hover:scale-110 transition-transform bg-muted"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {cardData.pos && (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      cardData.type === "new"
                        ? "bg-chart-2 text-white"
                        : "bg-chart-4 text-white"
                    }`}
                  >
                    {cardData.pos}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* 释义 */}
              <div className="p-4 rounded-xl bg-muted">
                <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                  释义
                </div>
                <p className="text-lg font-medium">{cardData.meaning}</p>
              </div>

              {/* 例句 */}
              {cardData.sentence && (
                <div className="p-4 rounded-xl bg-muted">
                  <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                    例句
                  </div>
                  <p className="text-base leading-relaxed">
                    {cardData.sentence}
                  </p>
                </div>
              )}

              {/* 其他已学含义 */}
              {cardData.learnedMeanings &&
                cardData.learnedMeanings.length > 0 && (
                  <div className="p-4 rounded-xl border-2 border-dashed border-border">
                    <div className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                      💡 其他已学含义
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cardData.learnedMeanings.map((meaning, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-lg text-sm bg-muted"
                        >
                          {meaning}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
