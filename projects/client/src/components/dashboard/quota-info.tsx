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
    <Card className="mb-3 py-2.5 gap-2">
      <CardContent className="py-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* 左侧：订阅信息 */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              {isFree ? (
                <Zap className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Crown className="w-4 h-4 text-primary" />
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={tierColor} className="text-xs px-1.5 py-0">
                  {tierName}
                </Badge>
                <span className="text-muted-foreground">
                  单篇最多 {quota.maxArticleWords.toLocaleString()} 词
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* 今日配额 */}
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">今日文章分析</span>
                <Badge
                  variant={isLowQuota ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  剩余 {quota.remainingToday} / {quota.dailyLimit} 次
                </Badge>
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
      </CardContent>
    </Card>
  );
}
