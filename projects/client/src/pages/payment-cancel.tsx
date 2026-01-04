import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, Home, CreditCard } from "lucide-react";

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-2 border-border/50 shadow-xl">
        <CardContent className="p-8 sm:p-12 text-center space-y-6">
          {/* Cancel Icon */}
          <div className="flex justify-center">
            <div className="bg-orange-100 dark:bg-orange-900/20 p-6 rounded-full">
              <XCircle className="w-16 h-16 text-orange-600 dark:text-orange-500" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              支付已取消
            </h1>
            <p className="text-muted-foreground">
              您的支付流程已被取消，没有产生任何费用
            </p>
          </div>

          {/* Info */}
          <Card className="bg-muted/50 border-border/50">
            <CardContent className="p-4 text-left">
              <h3 className="font-semibold text-foreground mb-2">需要帮助？</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 如果遇到技术问题，请稍后重试</li>
                <li>• 您随时可以从首页重新升级</li>
                <li>• 免费版功能依然可用</li>
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
            <Button
              onClick={() => navigate("/checkout")}
              size="lg"
              className="flex-1 shadow-md hover:shadow-lg transition-shadow"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              重新尝试
            </Button>
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              支付过程安全可靠，由 Stripe 提供支持
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
