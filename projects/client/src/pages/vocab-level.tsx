import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpdateUser, useAuth } from "@/hooks/use-auth";
import { showToastError, showToastSuccess } from "@/utils/toast";
import type { ExtendedUser } from "@/lib/api-client";
import { vocabularyLevels, type VocabularyLevel } from "@/utils/vocabulary";

export default function VocabLevelSelection() {
  const [selectedLevel, setSelectedLevel] = useState<VocabularyLevel | null>(
    null
  );
  const updateUser = useUpdateUser();
  const { user, isLoading, refetch } = useAuth();

  // 类型断言
  const extendedUser = user as ExtendedUser | undefined;

  const handleConfirm = async () => {
    if (!selectedLevel) return;

    try {
      // 1. 更新用户信息
      await updateUser.mutateAsync({
        vocabularyLevel: selectedLevel,
      });

      // 2. 刷新 session（使用 Better Auth 官方推荐方法）
      refetch();

      // 3. 显示成功提示
      showToastSuccess("词汇等级设置成功！");

      // 4. 页面会自动重新渲染，检测到有 vocabularyLevel 后会自动跳转到 dashboard
    } catch (error) {
      console.error("更新词汇等级失败:", error);
      showToastError("设置失败，请重试");
    }
  };

  // 加载中显示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 如果已设置词汇等级，重定向到 dashboard
  if (extendedUser?.vocabularyLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* NavBar */}
      <Navbar />
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-4xl">
        <div className="bg-card rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              初始化设置
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              选择您的词汇水平
            </h2>

            {/* Description Box */}
            <div className="bg-muted/50 rounded-2xl p-4 sm:p-5 text-left max-w-2xl mx-auto mt-6">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3">
                选择您的词汇水平后，系统在分析文章时会自动跳过该等级以下的常见词汇，只为您标记出需要学习的生词。
              </p>
              <div className="bg-muted/50 rounded-xl p-3 sm:p-4 border border-border">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span className="flex-1 leading-relaxed">
                    <span className="font-semibold text-foreground">
                      举例：
                    </span>
                    选择"进阶词汇（高中水平）"，系统会认为您已掌握初中及以下词汇，只显示更高级的单词供您学习。
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert className="mb-6 border-border bg-muted/50 grid-cols-[auto_1fr]! ">
            <div className="shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                !
              </span>
            </div>
            <AlertDescription className="text-sm sm:text-base col-start-4!">
              <h3 className="font-bold text-foreground mb-1">
                请谨慎选择词汇等级
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                虽然后期可以在设置中修改，但更改等级可能会导致已添加的词汇丢失。建议根据实际水平准确选择。
              </p>
            </AlertDescription>
          </Alert>

          {/* Level Selection */}
          <RadioGroup
            value={selectedLevel || ""}
            onValueChange={(value) =>
              setSelectedLevel(value as VocabularyLevel)
            }
            className="space-y-3 mb-8"
          >
            {vocabularyLevels.map((level) => (
              <Label
                key={level.id}
                htmlFor={level.id}
                className={`flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 border-2 rounded-xl cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                  selectedLevel === level.id
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-border"
                }`}
              >
                <RadioGroupItem
                  value={level.id}
                  id={level.id}
                  className="mt-0.5 sm:mt-0 size-5 text-primary data-[state=checked]:border-primary [&>svg]:fill-primary [&>svg]:size-3.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm sm:text-base mb-1">
                    {level.title}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground space-y-0.5">
                    <div>{level.scene}</div>
                    <div className="text-xs opacity-75">{level.reference}</div>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl shrink-0 ml-2">
                  {level.emoji}
                </div>
              </Label>
            ))}
          </RadioGroup>

          {/* Submit Button */}
          <Button
            onClick={handleConfirm}
            disabled={!selectedLevel || updateUser.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-6 rounded-xl text-base sm:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateUser.isPending ? "保存中..." : "确认并开始使用"}
          </Button>

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4">
            完成后即可开始您的词汇学习之旅
          </p>
        </div>
      </div>
    </div>
  );
}
