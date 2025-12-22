import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Moon, Sun, LogOut } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import type { ThemeStyle } from "@/hooks/use-theme";
import { signOut } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type { ExtendedUser } from "@/lib/api-client";
import { getVocabularyDisplay } from "@/utils/vocabulary";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "新建", href: "/dashboard" },
  { label: "词汇本", href: "/vocabulary" },
  { label: "复习", href: "/review" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, style, setStyle, toggleMode } = useTheme();
  const { user, isAuthenticated } = useAuth();

  // 判断链接是否激活
  const isLinkActive = (href: string) => {
    return location.pathname === href;
  };

  // 类型断言
  const extendedUser = user as ExtendedUser | undefined;

  // 获取词汇等级显示信息（仅在已登录时）
  const vocabDisplay = isAuthenticated
    ? getVocabularyDisplay(extendedUser?.vocabularyLevel)
    : null;
  const badgeText = vocabDisplay
    ? `${vocabDisplay.label} · ${vocabDisplay.wordCount}词`
    : "";

  const handleSignOut = () => {
    signOut();
  };

  return (
    <nav className="bg-background/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 bg-linear-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground text-lg font-bold">
                V
              </span>
            </div>
            <span className="text-xl font-semibold text-foreground hidden sm:inline">
              VocabMaster
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated && extendedUser?.vocabularyLevel &&
              navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    isLinkActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {/* 词汇等级 Badge - Desktop */}
            {isAuthenticated && extendedUser?.vocabularyLevel && (
              <Badge
                variant="secondary"
                className="hidden lg:flex bg-primary/10 text-primary hover:bg-primary/20"
              >
                {badgeText}
              </Badge>
            )}

            {/* 主题切换 - Desktop */}
            <div className="hidden md:flex items-center space-x-2">
              <Select
                value={style}
                onValueChange={(value) => setStyle(value as ThemeStyle)}
              >
                <SelectTrigger className="w-28 h-9">
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

            {/* 未登录时的按钮组 - Desktop */}
            {!isAuthenticated && (
              <>
                <Button
                  variant="ghost"
                  className="h-9 hidden md:flex"
                  onClick={() => navigate("/login")}
                >
                  登录
                </Button>
                <Button
                  className="h-9 shadow-md hidden md:flex"
                  onClick={() => navigate("/dashboard")}
                >
                  开始使用
                </Button>
              </>
            )}

            {/* 已登录时的用户头像菜单 */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="w-9 h-9 bg-linear-to-br from-primary to-primary/80 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <span className="text-primary-foreground text-sm font-semibold">
                      KE
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-9 w-9"
              aria-label="打开菜单"
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
          <div className="md:hidden py-4 border-t border-border space-y-3">
            {/* Navigation Links - 仅在已登录且已设置词汇等级时显示 */}
            {isAuthenticated && extendedUser?.vocabularyLevel && (
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      isLinkActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Divider - 仅在已登录且已设置词汇等级时显示 */}
            {isAuthenticated && extendedUser?.vocabularyLevel && <div className="border-t border-border my-3" />}

            {/* 词汇等级 - 仅在已登录且已设置词汇等级时显示 */}
            {isAuthenticated && extendedUser?.vocabularyLevel && (
              <Badge
                variant="secondary"
                className="w-fit bg-primary/10 text-primary"
              >
                {badgeText}
              </Badge>
            )}

            {/* Theme Controls - 始终显示 */}
            <div className="flex items-center space-x-2">
              <Select
                value={style}
                onValueChange={(value) => setStyle(value as ThemeStyle)}
              >
                <SelectTrigger className="flex-1">
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
              >
                {mode === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* 未登录时的按钮 */}
            {!isAuthenticated && (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate("/login")}
                >
                  登录
                </Button>
                <Button
                  className="w-full shadow-md"
                  onClick={() => navigate("/dashboard")}
                >
                  开始使用
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

