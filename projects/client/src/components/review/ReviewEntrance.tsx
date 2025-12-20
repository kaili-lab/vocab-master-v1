import { ReviewStats } from "./ReviewStats";

interface ReviewEntranceProps {
  stats: {
    todayDue: number;
    newCards: number;
    learning: number;
    reviewing: number;
    totalVocab: number;
    completedToday: number;
  };
  onStartReview: () => void;
}

export default function ReviewEntrance({
  stats,
  onStartReview,
}: ReviewEntranceProps) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* 头部 */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span
            className="bg-linear-to-r from-primary to-primary/80"
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            单词复习
          </span>
        </h1>
        <p className="text-lg text-muted-foreground">
          使用科学的间隔重复算法，让记忆更持久
        </p>
      </div>

      {/* 核心统计 */}
      <div className="flex justify-center mb-12">
        <div className="bg-card border border-border p-8 rounded-3xl relative overflow-hidden max-w-md w-full shadow-xl hover:shadow-2xl transition-shadow">
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div>
                <div className="text-sm mb-2 text-muted-foreground">
                  今日待复习
                </div>
                <div className="text-5xl font-bold text-primary">
                  {stats.todayDue}
                </div>
              </div>
            </div>

            <button
              onClick={onStartReview}
              className="w-full py-4 rounded-2xl text-lg font-semibold transition-all bg-linear-to-r from-primary to-primary/90 text-primary-foreground hover:translate-y-[-2px] hover:shadow-lg"
            >
              开始复习
            </button>
          </div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ReviewStats
          label="新卡片"
          value={stats.newCards}
          badge={{ text: "新卡片", type: "new" }}
        />
        <ReviewStats
          label="学习中"
          value={stats.learning}
          badge={{ text: "学习中", type: "extend" }}
        />
        <ReviewStats label="复习中" value={stats.reviewing} />
        <ReviewStats label="总词汇" value={stats.totalVocab} />
      </div>

      {/* 今日成就 */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">今日已完成</h3>
          <span className="text-2xl font-bold text-primary">
            {stats.completedToday}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < 5
                  ? i === 2
                    ? "bg-chart-3"
                    : i === 3
                    ? "bg-chart-4"
                    : "bg-chart-2"
                  : "bg-muted"
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
