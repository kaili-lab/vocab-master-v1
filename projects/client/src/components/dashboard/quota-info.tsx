import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, FileText, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { QuotaInfo } from "@/hooks/use-quota";

interface QuotaInfoProps {
  quota: QuotaInfo;
}

export function QuotaInfoCard({ quota }: QuotaInfoProps) {
  const navigate = useNavigate();
  const isFree = quota.tier === "free";
  const isLowQuota = quota.remainingToday <= 0;

  const tierName = isFree ? "免费版" : "专业版";
  const tierColor = isFree ? "secondary" : "default";

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          {/* 左侧：订阅信息 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isFree ? (
                <Zap className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Crown className="w-5 h-5 text-primary" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{tierName}</span>
                  <Badge variant={tierColor} className="text-xs">
                    {tierName}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  单篇最多 {quota.maxArticleWords.toLocaleString()} 词
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-border" />

            {/* 今日配额 */}
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-semibold">
                  {isLowQuota ? (
                    <span className="text-destructive">今日已用完</span>
                  ) : (
                    <span>
                      剩余 {quota.remainingToday} / {quota.dailyLimit} 次
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  今日文章分析
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：升级按钮 */}
          {isFree && (
            <Button
              onClick={() => navigate("/#pricing")}
              variant={isLowQuota ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <Crown className="w-4 h-4" />
              升级到专业版
            </Button>
          )}
        </div>

        {/* 进度条 */}
        <div className="mt-4">
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isLowQuota ? "bg-destructive" : "bg-primary"
              }`}
              style={{
                width: `${(quota.usedToday / quota.dailyLimit) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
