import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import type { ExtendedUser } from "@/lib/api-client";

import { DashboardNavbar } from "@/components/layout/dashboard-navbar";
import ArticleAnalysis from "@/components/dashboard/article-analysis";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  // 类型断言：Better Auth 的类型扩展未生效，手动断言
  const extendedUser = user as ExtendedUser;

  // 加载中显示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 没有词汇等级，直接重定向到设置页面
  if (!extendedUser?.vocabularyLevel) {
    return <Navigate to="/level" replace />;
  }

  // 正常显示 Dashboard 内容
  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <ArticleAnalysis />
      </main>
    </div>
  );
}
