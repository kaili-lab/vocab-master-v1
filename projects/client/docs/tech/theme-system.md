# 主题系统技术文档

> **受众**: AI (Cursor/Claude)  
> **用途**: 主题系统技术实现记忆库

---

## 系统概述

项目实现了双维度主题系统，基于CSS Variables和Tailwind CSS V4，支持运行时动态切换。

### 双维度架构

```
风格（Style）× 模式（Mode）= 主题（Theme）

ThemeStyle: "modern" | "fresh"
ThemeMode: "light" | "dark"

组合结果：
- modern-light (极简现代-亮色)
- modern-dark (极简现代-暗色)
- fresh-light (清新活力-亮色)
- fresh-dark (清新活力-暗色)
```

---

## 核心实现

### 1. 主题Hook

**文件位置**: `projects/client/src/hooks/use-theme.ts`

#### 类型定义

```typescript
export type Theme =
  | "modern-light"
  | "modern-dark"
  | "fresh-light"
  | "fresh-dark";

export type ThemeMode = "light" | "dark";
export type ThemeStyle = "modern" | "fresh";

interface UseThemeReturn {
  theme: Theme;
  mode: ThemeMode;
  style: ThemeStyle;
  setTheme: (theme: Theme) => void;
  setMode: (mode: ThemeMode) => void;
  setStyle: (style: ThemeStyle) => void;
  toggleMode: () => void;
}
```

#### 核心逻辑

```typescript
const STORAGE_KEY = "vocab-master-theme";

export function useTheme(): UseThemeReturn {
  // 1. 初始化：从localStorage读取，默认modern-light
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Theme) || "modern-light";
  });

  // 2. 解析主题：从"style-mode"格式解析出style和mode
  const [style, mode] = theme.split("-") as [ThemeStyle, ThemeMode];

  // 3. 设置完整主题
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // 4. 只设置模式（保持风格不变）
  const setMode = (newMode: ThemeMode) => {
    const newTheme = `${style}-${newMode}` as Theme;
    setTheme(newTheme);
  };

  // 5. 只设置风格（保持模式不变）
  const setStyle = (newStyle: ThemeStyle) => {
    const newTheme = `${newStyle}-${mode}` as Theme;
    setTheme(newTheme);
  };

  // 6. 切换亮/暗模式
  const toggleMode = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
  };

  // 7. 初始化和主题变化时设置DOM属性
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return { theme, mode, style, setTheme, setMode, setStyle, toggleMode };
}
```

**关键点**：
- localStorage key: `"vocab-master-theme"`
- 默认主题: `"modern-light"`
- 主题格式: `"<style>-<mode>"`（如 "fresh-dark"）
- DOM属性: `<html data-theme="modern-light">`
- 自动持久化到localStorage

---

### 2. CSS主题定义

**文件位置**: `projects/client/src/index.css`

#### Tailwind V4配置

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

**说明**：
- `@theme inline`是Tailwind V4的新特性
- 将CSS Variables映射为Tailwind工具类
- 例如：`--color-primary: var(--primary)` → `.bg-primary`, `.text-primary`, `.border-primary`

#### 默认主题（回退方案）

```css
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ...其他19个颜色变量 */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ...其他19个颜色变量 */
}
```

**说明**：
- `:root` 作为JS加载前的回退方案
- `.dark` 可选删除（项目使用`data-theme`方案）

---

### 3. 四个主题定义

#### 主题1: 极简现代风 - 亮色

```css
[data-theme="modern-light"] {
  --background: oklch(1 0 0);                    /* 纯白背景 */
  --foreground: oklch(0.145 0 0);                /* 深灰文字 */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  
  /* 紫色系主色 - violet-600 */
  --primary: oklch(0.552 0.203 293.756);         /* 主色调 */
  --primary-foreground: oklch(1 0 0);            /* 主色调文字 */
  
  --secondary: oklch(0.961 0.015 286.07);
  --secondary-foreground: oklch(0.145 0 0);
  --muted: oklch(0.961 0.015 286.07);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.961 0.015 286.07);
  --accent-foreground: oklch(0.145 0 0);
  --destructive: oklch(0.577 0.245 27.325);      /* 红色系 */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.552 0.203 293.756);            /* 焦点环 */
  
  /* 图表颜色 */
  --chart-1: oklch(0.552 0.203 293.756);
  --chart-2: oklch(0.478 0.166 275.705);
  --chart-3: oklch(0.696 0.17 162.48);
  --chart-4: oklch(0.646 0.222 41.116);
  --chart-5: oklch(0.769 0.188 70.08);
}
```

#### 主题2: 极简现代风 - 暗色

```css
[data-theme="modern-dark"] {
  --background: oklch(0.145 0 0);                /* 深色背景 */
  --foreground: oklch(0.985 0 0);                /* 浅色文字 */
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  
  /* 紫色系主色（亮度提升） */
  --primary: oklch(0.644 0.175 293.756);
  --primary-foreground: oklch(1 0 0);
  
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);                  /* 半透明边框 */
  --input: oklch(1 0 0 / 15%);                   /* 半透明输入框 */
  --ring: oklch(0.644 0.175 293.756);
  
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}
```

#### 主题3: 清新活力风 - 亮色

```css
[data-theme="fresh-light"] {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  
  /* 绿色系主色 - emerald-600 */
  --primary: oklch(0.597 0.165 166.088);
  --primary-foreground: oklch(1 0 0);
  
  --secondary: oklch(0.961 0.025 166.088);
  --secondary-foreground: oklch(0.145 0 0);
  --muted: oklch(0.961 0.025 166.088);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.961 0.025 166.088);
  --accent-foreground: oklch(0.145 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.597 0.165 166.088);
  
  --chart-1: oklch(0.597 0.165 166.088);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.478 0.166 275.705);
  --chart-4: oklch(0.646 0.222 41.116);
  --chart-5: oklch(0.769 0.188 70.08);
}
```

#### 主题4: 清新活力风 - 暗色

```css
[data-theme="fresh-dark"] {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  
  /* 绿色系主色（亮度提升） */
  --primary: oklch(0.697 0.145 166.088);
  --primary-foreground: oklch(1 0 0);
  
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.697 0.145 166.088);
  
  --chart-1: oklch(0.696 0.17 162.48);
  --chart-2: oklch(0.769 0.188 70.08);
  --chart-3: oklch(0.488 0.243 264.376);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}
```

---

### 4. 基础样式

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**说明**：
- 所有元素默认使用`--border`颜色
- 焦点轮廓使用`--ring`颜色（50%透明度）
- body使用`--background`和`--foreground`

---

## 工作原理

### 三层架构

```
┌─────────────────────────────────────────┐
│   React 组件层                           │
│   className="bg-primary text-foreground" │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Tailwind CSS 编译层                    │
│   .bg-primary { background: var(--color-primary) } │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   CSS Variables 层（动态切换）           │
│   [data-theme="modern-light"] {         │
│     --primary: oklch(0.552 0.203 ...);  │
│   }                                      │
└─────────────────────────────────────────┘
```

### 切换流程

```typescript
// 1. 用户操作
onClick={() => setTheme('fresh-dark')}

// 2. React Hook更新状态
setThemeState('fresh-dark')
localStorage.setItem('vocab-master-theme', 'fresh-dark')
document.documentElement.setAttribute('data-theme', 'fresh-dark')

// 3. CSS选择器匹配
[data-theme="fresh-dark"] {
  --primary: oklch(0.697 0.145 166.088);  /* 绿色 */
}

// 4. Tailwind类引用新值
.bg-primary { background: var(--color-primary); }
// 最终: background: oklch(0.697 0.145 166.088);

// 5. 所有使用bg-primary的组件立即更新 ✨
```

---

## 颜色变量

### 完整变量列表（19个）

| 变量名 | 说明 | Modern-Light | Modern-Dark | Fresh-Light | Fresh-Dark |
|--------|------|--------------|-------------|-------------|------------|
| `--background` | 页面背景 | `oklch(1 0 0)` | `oklch(0.145 0 0)` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | 主文字 | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | 主色调 | 紫色(293.756) | 紫色(293.756) | 绿色(166.088) | 绿色(166.088) |
| `--primary-foreground` | 主色文字 | `oklch(1 0 0)` | `oklch(1 0 0)` | `oklch(1 0 0)` | `oklch(1 0 0)` |
| `--secondary` | 次要色 | 浅紫(286.07) | `oklch(0.269 0 0)` | 浅绿(166.088) | `oklch(0.269 0 0)` |
| `--muted` | 柔和色 | 浅紫(286.07) | `oklch(0.269 0 0)` | 浅绿(166.088) | `oklch(0.269 0 0)` |
| `--accent` | 强调色 | 浅紫(286.07) | `oklch(0.269 0 0)` | 浅绿(166.088) | `oklch(0.269 0 0)` |
| `--destructive` | 危险色 | 红色(27.325) | 红色(22.216) | 红色(27.325) | 红色(22.216) |
| `--border` | 边框 | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--ring` | 焦点环 | 紫色(293.756) | 紫色(293.756) | 绿色(166.088) | 绿色(166.088) |

**其他变量**：`--card`, `--popover`, `--input`, `--chart-1~5`, `--sidebar-*`（共19个）

---

## 使用示例

### 在组件中使用

```tsx
import { useTheme } from "@/hooks/use-theme";

function ThemeToggle() {
  const { theme, mode, style, setTheme, setMode, toggleMode } = useTheme();

  return (
    <div>
      {/* 显示当前主题 */}
      <p>当前: {theme}</p>
      <p>风格: {style}, 模式: {mode}</p>

      {/* 切换完整主题 */}
      <button onClick={() => setTheme("fresh-dark")}>
        清新暗色
      </button>

      {/* 只切换模式（保持风格） */}
      <button onClick={toggleMode}>
        切换亮/暗
      </button>

      {/* 只切换风格（保持模式） */}
      <button onClick={() => setStyle("fresh")}>
        清新风格
      </button>
    </div>
  );
}
```

### 使用语义化类名

```tsx
// 自动适配所有主题
<div className="bg-primary text-primary-foreground">
  主色调背景
</div>

<Card className="bg-card text-card-foreground border-border">
  卡片组件
</Card>

<Button className="bg-destructive text-destructive-foreground">
  危险操作
</Button>
```

---

## 扩展方式

### 添加新主题

1. 在`index.css`中定义新的`[data-theme]`选择器
2. 在`use-theme.ts`中更新类型：

```typescript
export type Theme =
  | "modern-light"
  | "modern-dark"
  | "fresh-light"
  | "fresh-dark"
  | "ocean-light"   // 新增
  | "ocean-dark";   // 新增

export type ThemeStyle = "modern" | "fresh" | "ocean";
```

3. 组件无需修改，自动支持

### 添加新颜色变量

1. 在所有`[data-theme]`中添加新变量
2. 在`@theme inline`中添加映射：

```css
@theme inline {
  --color-new-color: var(--new-color);
}
```

3. 使用新类：`bg-new-color`, `text-new-color`

---

## 相关文档

- [主题使用指南](../ops/theme-usage.md)
- [前端文档导航](../README.md)

---

**最后更新**: 2026-01-05
**基于代码版本**: 实际项目代码
