import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // 显示成功提示
    toast.success("支付成功！", {
      description: "您已成功升级到专业版，开始享受完整功能吧！",
      duration: 5000,
    });

    // 5 秒后自动跳转到 Dashboard
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-primary/20 shadow-2xl">
        <CardContent className="p-8 sm:p-12 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative bg-primary/10 p-6 rounded-full">
                <CheckCircle2 className="w-16 h-16 text-primary" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              支付成功！
            </h1>
            <p className="text-lg text-muted-foreground">
              恭喜您升级到 Vocab Master 专业版
            </p>
          </div>

          {/* Features Unlocked */}
          <Card className="bg-muted/50 border-border/50">
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">
                已解锁专业功能：
              </h2>
              <ul className="space-y-3 text-left">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    每日 50 篇文章分析（提升 25 倍）
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    每篇最多 5,000 词（提升 5 倍）
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">高级 AI 上下文解释</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    个性化词汇库和学习统计
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Transaction Info */}
          {sessionId && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p>交易 ID: {sessionId}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => navigate("/dashboard")}
              size="lg"
              className="flex-1 shadow-md hover:shadow-lg transition-shadow"
            >
              前往 Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() => navigate("/subscription")}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              查看订阅详情
            </Button>
          </div>

          {/* Auto Redirect Notice */}
          <p className="text-sm text-muted-foreground">
            页面将在 5 秒后自动跳转到 Dashboard
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
