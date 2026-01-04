import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Sparkles, Zap, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/api-client";

type BillingPeriod = "monthly" | "yearly";

const plans = {
  monthly: {
    price: "$7",
    period: "每月",
    pricePerMonth: "7 美元/月",
    features: [
      "每日 50 篇文章分析",
      "每篇最多 5,000 词",
      "高级 AI 上下文解释",
      "Anki 间隔复习",
      "个性化词汇库",
      "学习进度统计",
    ],
  },
  yearly: {
    price: "$67",
    period: "每年",
    pricePerMonth: "约 5.6 美元/月",
    savings: "节省 20%",
    features: [
      "每日 50 篇文章分析",
      "每篇最多 5,000 词",
      "高级 AI 上下文解释",
      "Anki 间隔复习",
      "个性化词汇库",
      "学习进度统计",
    ],
  },
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");
  const [isLoading, setIsLoading] = useState(false);

  const { data: session } = useSession();

  // 如果未登录，跳转到登录页
  if (!session) {
    navigate("/login?redirect=/checkout");
    return null;
  }

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      // 调用后端 API 创建 Checkout Session
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3000"
        }/api/payment/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ billingPeriod }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // 跳转到 Stripe Checkout 页面
      window.location.href = data.data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error instanceof Error ? error.message : "创建支付会话失败，请稍后重试"
      );
      setIsLoading(false);
    }
  };

  const selectedPlan = plans[billingPeriod];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">升级到专业版</h1>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              disabled={isLoading}
            >
              返回首页
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Plan Selection */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  选择计费周期
                </h2>
                <p className="text-sm text-muted-foreground">
                  选择最适合你的方案
                </p>
              </div>

              <RadioGroup
                value={billingPeriod}
                onValueChange={(value) =>
                  setBillingPeriod(value as BillingPeriod)
                }
                className="space-y-3"
              >
                {/* Monthly Option */}
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    billingPeriod === "monthly"
                      ? "border-2 border-primary ring-2 ring-primary/20"
                      : "border border-border/50"
                  }`}
                  onClick={() => setBillingPeriod("monthly")}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <RadioGroupItem
                      value="monthly"
                      id="monthly"
                      className="mt-1"
                    />
                    <Label
                      htmlFor="monthly"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          月付
                        </span>
                        <span className="text-2xl font-bold text-foreground">
                          $7
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        7 美元/月，按月计费
                      </p>
                    </Label>
                  </CardContent>
                </Card>

                {/* Yearly Option */}
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    billingPeriod === "yearly"
                      ? "border-2 border-primary ring-2 ring-primary/20"
                      : "border border-border/50"
                  }`}
                  onClick={() => setBillingPeriod("yearly")}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <RadioGroupItem
                      value="yearly"
                      id="yearly"
                      className="mt-1"
                    />
                    <Label
                      htmlFor="yearly"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            年付
                          </span>
                          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3" />
                            节省 20%
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-foreground">
                            $67
                          </div>
                          <div className="text-xs text-muted-foreground">
                            约 $5.6/月
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        67 美元/年，按年计费
                      </p>
                    </Label>
                  </CardContent>
                </Card>
              </RadioGroup>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={isLoading}
                size="lg"
                className="w-full shadow-md hover:shadow-lg transition-shadow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在跳转...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    前往支付
                  </>
                )}
              </Button>

              {/* Security Notice */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <p>
                  支付由 Stripe 安全处理，我们不会存储您的支付信息。支持 7
                  天无理由退款。
                </p>
              </div>
            </div>

            {/* Right: Plan Details */}
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <CardTitle>Vocab Master 专业版</CardTitle>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {selectedPlan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {selectedPlan.period}
                  </span>
                </div>
                {billingPeriod === "yearly" && (
                  <p className="text-sm text-primary font-medium mt-1">
                    约 5.6 美元/月，节省 20%
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {selectedPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-6 border-t border-border/50">
                  <h4 className="font-semibold text-foreground mb-3">
                    还包括：
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      随时可以取消订阅
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      7 天无理由退款
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      持续更新和优化
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
