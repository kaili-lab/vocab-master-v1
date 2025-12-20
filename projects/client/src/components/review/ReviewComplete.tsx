interface ReviewCompleteProps {
  stats: {
    totalReviewed: number;
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  onBackToEntrance: () => void;
}

export default function ReviewComplete({
  stats,
  onBackToEntrance,
}: ReviewCompleteProps) {
  // 计算进度百分比（用于圆环显示）
  const progressPercent = 80; // 示例值，可根据实际情况计算
  const circumference = 2 * Math.PI * 80;
  const offset = circumference * (1 - progressPercent / 100);

  // TODO: 实现查看详细统计功能
  const handleViewDetails = () => {
    console.log("查看详细统计");
    // 后续实现: 跳转到统计页面或显示统计模态框
  };

  return (
    <div className="max-w-4xl mx-auto text-center">
      {/* 庆祝动画 */}
      <div className="mb-12">
        <div className="text-8xl mb-6 animate-in zoom-in duration-500">🎉</div>
        <h1 className="text-5xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          太棒了！
        </h1>
        <p className="text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          今天的复习任务全部完成
        </p>
      </div>

      {/* 统计圆环 */}
      <div className="flex justify-center mb-12 animate-in fade-in zoom-in duration-500 delay-300">
        <div className="bg-card border border-border p-8 rounded-3xl shadow-xl">
          <svg width="200" height="200" className="mx-auto mb-4">
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="16"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#10b981"
              strokeWidth="16"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="text-4xl font-bold mb-2">{stats.totalReviewed}</div>
          <div className="text-muted-foreground">张卡片已复习</div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[400ms]">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: "rgba(239, 68, 68, 0.2)" }}
          >
            <span className="text-2xl">😅</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.again}</div>
          <div className="text-sm text-muted-foreground">Again</div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[500ms]">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: "rgba(245, 158, 11, 0.2)" }}
          >
            <span className="text-2xl">🤔</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.hard}</div>
          <div className="text-sm text-muted-foreground">Hard</div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[600ms]">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: "rgba(16, 185, 129, 0.2)" }}
          >
            <span className="text-2xl">😊</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.good}</div>
          <div className="text-sm text-muted-foreground">Good</div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[700ms]">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: "rgba(59, 130, 246, 0.2)" }}
          >
            <span className="text-2xl">🎯</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.easy}</div>
          <div className="text-sm text-muted-foreground">Easy</div>
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex flex-col md:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[800ms]">
        <button
          onClick={onBackToEntrance}
          className="px-8 py-4 rounded-2xl text-lg font-semibold transition-all bg-linear-to-r from-primary to-primary/90 text-primary-foreground hover:translate-y-[-2px] hover:shadow-lg"
        >
          返回首页
        </button>
        <button
          onClick={handleViewDetails}
          className="px-8 py-4 rounded-2xl text-lg font-semibold transition-all hover:scale-105 bg-card border border-border"
        >
          查看详细统计
        </button>
      </div>
    </div>
  );
}
