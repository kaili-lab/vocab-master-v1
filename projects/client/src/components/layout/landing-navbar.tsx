import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeStyle } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { mode, style, setStyle, toggleMode } = useTheme();
  const navigate = useNavigate();
  // 判断当前是否登录
  const { isAuthenticated } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <div className="w-9 h-9 bg-linear-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground text-lg font-bold">
                V
              </span>
            </div>
            <span className="text-xl font-semibold text-foreground hidden sm:inline">
              VocabMaster
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* 风格切换 */}
            <Select
              value={style}
              onValueChange={(value) => setStyle(value as ThemeStyle)}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">极简现代</SelectItem>
                <SelectItem value="fresh">清新活力</SelectItem>
              </SelectContent>
            </Select>

            {/* 亮/暗模式切换 */}
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

            {/* 登录按钮 */}
            {!isAuthenticated && (
              <Button
                variant="ghost"
                className="h-9"
                onClick={() => navigate("/login")}
              >
                登录
              </Button>
            )}

            {/* 注册按钮 */}
            <Button
              className="h-9 shadow-md"
              onClick={() => navigate("/dashboard")}
            >
              开始使用
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* 移动端主题切换 */}
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

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="打开菜单"
              className="h-9 w-9"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              {/* 风格选择 */}
              <Select
                value={style}
                onValueChange={(value) => setStyle(value as ThemeStyle)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">极简现代</SelectItem>
                  <SelectItem value="fresh">清新活力</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate("/login")}
              >
                登录
              </Button>
              <Button className="w-full shadow-md">开始使用</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
