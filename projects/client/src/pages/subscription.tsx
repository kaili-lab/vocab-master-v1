import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Crown,
  Calendar,
  CreditCard,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, useSession } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionData {
  tier: "free" | "premium";
  status: "active" | "cancelled" | "expired" | "trial";
  startedAt: string | null;
  expiresAt: string | null;
  paymentProvider: string | null;
  amount: string | null;
  currency: string | null;
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: session } = useSession();

  // 获取订阅信息
  const {
    data: subscription,
    isLoading,
    refetch,
  } = useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/users/me/subscription`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }

      const data = await response.json();
      return data.data;
    },
    enabled: !!session,
  });

  // 如果未登录，跳转到登录页
  if (!session) {
    navigate("/login?redirect=/subscription");
    return null;
  }

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setIsCancelling(true);

    try {
      // 调用后端 API 取消订阅
      const response = await fetch(
        `${API_BASE_URL}/api/payment/cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            subscriptionId: subscription.paymentProvider, // 假设这里存储了 Stripe subscription ID
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      toast.success("订阅已取消", {
        description: "您的订阅将在当前周期结束时到期",
      });

      // 刷新订阅信息
      refetch();
      setShowCancelDialog(false);
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error(
        error instanceof Error ? error.message : "取消订阅失败，请稍后重试"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: {
        label: "活跃",
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      },
      cancelled: {
        label: "已取消",
        className:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      },
      expired: {
        label: "已过期",
        className:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
      trial: {
        label: "试用中",
        className:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      },
    };

    const badge = badges[status] || badges.active;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isPremium = subscription?.tier === "premium";
  const isActive = subscription?.status === "active";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">订阅管理</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Current Plan Card */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown
                    className={`w-6 h-6 ${
                      isPremium ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span>{isPremium ? "Vocab Master 专业版" : "免费版"}</span>
                </div>
                {subscription && getStatusBadge(subscription.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subscription Details */}
              {isPremium && subscription ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">开始日期</span>
                    </div>
                    <p className="text-foreground font-medium">
                      {formatDate(subscription.startedAt)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">到期日期</span>
                    </div>
                    <p className="text-foreground font-medium">
                      {formatDate(subscription.expiresAt)}
                    </p>
                  </div>

                  {subscription.amount && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-sm">订阅金额</span>
                      </div>
                      <p className="text-foreground font-medium">
                        ${subscription.amount} {subscription.currency}
                      </p>
                    </div>
                  )}

                  {subscription.paymentProvider && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">支付方式</span>
                      </div>
                      <p className="text-foreground font-medium capitalize">
                        {subscription.paymentProvider}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">
                    您当前使用的是免费版
                  </p>
                  <Button onClick={() => navigate("/checkout")} size="lg">
                    <Crown className="w-4 h-4 mr-2" />
                    升级到专业版
                  </Button>
                </div>
              )}

              {/* Features */}
              <div className="pt-6 border-t border-border/50">
                <h3 className="font-semibold text-foreground mb-4">
                  当前权益：
                </h3>
                <ul className="space-y-2">
                  {isPremium ? (
                    <>
                      <li className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        每日 50 篇文章分析
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        每篇最多 5,000 词
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        高级 AI 上下文解释
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        个性化词汇库和学习统计
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        每日 2 篇文章分析
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        每篇最多 1,000 词
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        简单的 AI 解释
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Actions */}
              {isPremium && isActive && (
                <div className="pt-6 border-t border-border/50">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full sm:w-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    取消订阅
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">需要帮助？</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 订阅将在到期日期自动续费</p>
              <p>• 取消订阅后，可继续使用至当前周期结束</p>
              <p>• 支持 7 天无理由退款</p>
              <p>
                • 如有问题，请联系客服：
                <a
                  href="mailto:support@vocabmaster.com"
                  className="text-primary hover:underline ml-1"
                >
                  support@vocabmaster.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              确认取消订阅？
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>取消订阅后：</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>您可以继续使用专业版功能至当前周期结束</li>
                <li>
                  到期后将自动降级为免费版（每日 2 篇文章，每篇最多 1,000 词）
                </li>
                <li>不会产生额外费用</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
            >
              保留订阅
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认取消"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
