import { Target, Bot, BookOpen, RotateCw, BarChart3, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Target,
    title: "智能识别生词",
    description: "基于你的词汇量自动识别文章中的陌生单词，无需手动查询",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Bot,
    title: "AI 上下文解释",
    description: "不只是字典释义，AI 根据文章上下文精准解释单词含义",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: BookOpen,
    title: "个性化词汇库",
    description: "自动收集标记的生词，支持手动添加，打造专属词汇本",
    gradient: "from-emerald-500 to-green-500",
  },
  {
    icon: RotateCw,
    title: "科学复习系统",
    description: "采用 Anki 间隔重复算法，在最佳时机提醒复习",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: BarChart3,
    title: "学习进度可视化",
    description: "直观的统计图表，清楚看到你的成长轨迹和学习成果",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Zap,
    title: "即读即学",
    description: "点击即可查看解释，不打断阅读流程，保持沉浸式体验",
    gradient: "from-amber-500 to-yellow-500",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-muted/50 py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            为什么选择 VocabMaster
          </h2>
          <p className="text-lg text-muted-foreground">
            让英语学习变得更智能、更高效
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border/50"
              >
                <CardContent className="p-6 sm:p-8">
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 bg-linear-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
