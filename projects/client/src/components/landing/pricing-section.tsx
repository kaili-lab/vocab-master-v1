import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "免费版",
    price: "$0",
    period: "永久免费",
    description: "适合尝试和轻度使用",
    features: [
      "每日 2 篇文章分析",
      "每篇最多 1,000 词",
      "简单的 AI 上下文解释",
      "Anki 间隔复习",
    ],
    cta: "开始使用",
    ctaVariant: "outline" as const,
    isPopular: false,
  },
  {
    name: "专业版",
    price: "$7",
    period: "每月",
    yearlyPrice: "$67",
    yearlyNote: "年付享 20% 折扣",
    description: "适合认真学习的用户",
    features: [
      "每日 50 篇文章分析",
      "每篇最多 5,000 词",
      "高级 AI 上下文解释",
      "Anki 间隔复习",
      "个性化词汇库",
      "学习进度统计",
    ],
    cta: "立即升级",
    ctaVariant: "default" as const,
    isPopular: true,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-muted/50" id="pricing">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            选择适合你的方案
          </h2>
          <p className="text-lg text-muted-foreground">
            从免费开始，随时升级到专业版
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 ${
                plan.isPopular
                  ? "border-2 border-primary shadow-lg ring-4 ring-primary/10"
                  : "border border-border/50"
              }`}
            >
              {/* Most Popular Badge */}
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>最受欢迎</span>
                </div>
              )}

              <CardContent className="p-8">
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.yearlyPrice && plan.yearlyNote && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        {plan.yearlyNote}：
                        <span className="font-semibold text-foreground ml-1">
                          {plan.yearlyPrice}/年
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() =>
                    navigate(plan.isPopular ? "/checkout" : "/register")
                  }
                  variant={plan.ctaVariant}
                  size="lg"
                  className="w-full shadow-md hover:shadow-lg transition-shadow"
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>所有方案均支持 7 天无理由退款 · 随时可以取消订阅</p>
        </div>
      </div>
    </section>
  );
}
