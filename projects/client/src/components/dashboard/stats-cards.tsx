import { BookOpen, RotateCw, CheckCircle2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const statsData = [
  {
    label: "今日学习",
    value: "12",
    icon: BookOpen,
    gradient: "from-violet-500 to-purple-500",
    bgGradient: "from-violet-100 to-purple-100",
    darkBgGradient: "dark:from-violet-950 dark:to-purple-950",
  },
  {
    label: "待复习",
    value: "8",
    icon: RotateCw,
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-100 to-red-100",
    darkBgGradient: "dark:from-orange-950 dark:to-red-950",
  },
  {
    label: "掌握词汇",
    value: "328",
    icon: CheckCircle2,
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-100 to-emerald-100",
    darkBgGradient: "dark:from-green-950 dark:to-emerald-950",
  },
  {
    label: "学习天数",
    value: "15",
    icon: Calendar,
    gradient: "from-blue-500 to-indigo-500",
    bgGradient: "from-blue-100 to-indigo-100",
    darkBgGradient: "dark:from-blue-950 dark:to-indigo-950",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
          >
            <CardContent className="p-5 lg:p-6">
              <div className="flex items-center justify-between">
                {/* Left: Label & Value */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl lg:text-4xl font-bold bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                </div>

                {/* Right: Icon */}
                <div
                  className={`w-12 h-12 lg:w-14 lg:h-14 bg-linear-to-br ${stat.bgGradient} ${stat.darkBgGradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <Icon
                    className={`w-6 h-6 lg:w-7 lg:h-7 text-transparent bg-linear-to-br ${stat.gradient} bg-clip-text`}
                    strokeWidth={2.5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
