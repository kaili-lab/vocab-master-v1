type DifficultyRating = "again" | "hard" | "good" | "easy";

interface AnswerButtonsProps {
  onAnswer: (rating: DifficultyRating) => void;
  intervals?: {
    again: string;
    hard: string;
    good: string;
    easy: string;
  };
}

export default function AnswerButtons({
  onAnswer,
  intervals = {
    again: "<1分钟",
    hard: "6分钟",
    good: "1天",
    easy: "4天",
  },
}: AnswerButtonsProps) {
  const buttons = [
    {
      rating: "again" as const,
      label: "再来一次",
      text: "Again",
      interval: intervals.again,
      gradient: "from-red-500 to-red-600",
      shadow: "shadow-red-500/30",
    },
    {
      rating: "hard" as const,
      label: "有点难",
      text: "Hard",
      interval: intervals.hard,
      gradient: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-500/30",
    },
    {
      rating: "good" as const,
      label: "还不错",
      text: "Good",
      interval: intervals.good,
      gradient: "from-green-500 to-green-600",
      shadow: "shadow-green-500/30",
    },
    {
      rating: "easy" as const,
      label: "很简单",
      text: "Easy",
      interval: intervals.easy,
      gradient: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/30",
    },
  ];

  return (
    <>
      <style>{`
        .answer-btn {
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .answer-btn:hover {
          transform: translateY(-4px);
        }

        .answer-btn:active {
          transform: translateY(-1px);
        }

        .answer-btn::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .answer-btn:active::before {
          width: 300px;
          height: 300px;
        }
      `}</style>

      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {buttons.map((btn) => (
            <button
              key={btn.rating}
              onClick={() => onAnswer(btn.rating)}
              className={`answer-btn py-6 rounded-2xl font-bold text-white relative shadow-lg bg-linear-to-br ${btn.gradient} ${btn.shadow} hover:shadow-xl`}
            >
              <div className="relative z-10">
                <div className="text-xs opacity-90 mb-1">{btn.label}</div>
                <div className="text-xl">{btn.text}</div>
                <div className="text-xs opacity-90 mt-1">{btn.interval}</div>
              </div>
            </button>
          ))}
        </div>

        {/* 键盘快捷键提示 */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          快捷键:
          <kbd className="px-2 py-1 rounded bg-muted mx-1">1</kbd>
          Again ·<kbd className="px-2 py-1 rounded bg-muted mx-1">2</kbd>
          Hard ·<kbd className="px-2 py-1 rounded bg-muted mx-1">3</kbd>
          Good ·<kbd className="px-2 py-1 rounded bg-muted mx-1">4</kbd>
          Easy
        </div>
      </div>
    </>
  );
}
