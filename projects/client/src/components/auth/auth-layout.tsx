import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import type { ThemeStyle } from "@/hooks/use-theme";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { mode, style, setStyle, toggleMode } = useTheme();

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* 顶部导航 */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo & Back */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-9 h-9 bg-linear-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-primary-foreground text-lg font-bold">
                    V
                  </span>
                </div>
                <span className="text-xl font-semibold text-foreground hidden sm:inline">
                  VocabMaster
                </span>
              </Link>
            </div>

            {/* 主题切换 */}
            <div className="flex items-center space-x-2">
              <Select
                value={style}
                onValueChange={(value) => setStyle(value as ThemeStyle)}
              >
                <SelectTrigger className="w-28 h-9 hidden sm:flex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">极简现代</SelectItem>
                  <SelectItem value="fresh">清新活力</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleMode}
                aria-label="切换主题模式"
                className="h-9 w-9"
              >
                {mode === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 ">
          {/* 左侧：品牌介绍 */}
          <div className="hidden lg:block space-y-6 w-full">
            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              返回首页
            </Link>
            <div className="w-full flex flex-col items-center">
              <div>
                <h1 className="text-4xl xl:text-5xl font-bold text-foreground mb-4 leading-tight text-center">
                  智能学习
                  <br />
                  <span className="inline-block mt-4 bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    高效记忆
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  基于 AI 的个性化词汇学习系统， 让每个单词都记得更牢固
                </p>
              </div>

              {/* 特点列表 */}
              <div className="space-y-4 pt-8">
                {[
                  "🎯 智能识别你不认识的单词",
                  "🤖 AI 提供精准的上下文解释",
                  "📚 个性化词汇库自动管理",
                  "🔄 科学的间隔复习系统",
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 text-foreground"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：表单卡片 */}
          <div className="w-full">
            <Card className="border-border/50 shadow-2xl">
              <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-2xl lg:text-3xl">{title}</CardTitle>
                <CardDescription className="text-base">
                  {subtitle}
                </CardDescription>
              </CardHeader>
              <CardContent>{children}</CardContent>
            </Card>

            {/* 移动端返回链接 */}
            <Link
              to="/"
              className="lg:hidden inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition mt-6 group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
