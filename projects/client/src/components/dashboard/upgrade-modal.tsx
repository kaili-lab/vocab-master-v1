import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason: "quota" | "words";
  currentUsage?: {
    wordCount?: number;
    maxWords?: number;
  };
}

export function UpgradeModal({
  open,
  onClose,
  reason,
  currentUsage,
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate("/#pricing");
  };

  const title =
    reason === "quota" ? "今日分析次数已用完" : "文章字数超出限制";

  const description =
    reason === "quota"
      ? "您已达到免费版每日 2 次文章分析的限制。升级到专业版，享受每日 50 次分析机会！"
      : `您的文章有 ${currentUsage?.wordCount || 0} 词，超过了免费版 ${
          currentUsage?.maxWords || 1000
        } 词的限制。升级到专业版，单篇最多 5,000 词！`;

  const freeFeatures = ["每日 2 篇文章", "每篇最多 1,000 词", "基础 AI 解释"];
  const premiumFeatures = [
    "每日 50 篇文章",
    "每篇最多 5,000 词",
    "高级 AI 解释",
    "学习进度统计",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="w-6 h-6 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* 免费版 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm">免费版</h3>
            <ul className="space-y-2">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 专业版 */}
          <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-1">
              <Crown className="w-4 h-4 text-primary" />
              专业版
            </h3>
            <ul className="space-y-2">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t">
              <div className="text-lg font-bold">$7/月</div>
              <div className="text-xs text-muted-foreground">
                年付 $67 享 20% 折扣
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            稍后再说
          </Button>
          <Button onClick={handleUpgrade} className="gap-2">
            <Crown className="w-4 h-4" />
            立即升级
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

