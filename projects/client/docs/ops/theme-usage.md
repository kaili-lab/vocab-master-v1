# 主题使用指南

## 快速开始

项目使用双维度主题系统：**风格（Style）× 模式（Mode）**

- **风格**：`modern`（极简现代）、`fresh`（清新活力）
- **模式**：`light`（亮色）、`dark`（暗色）
- **组合**：4种主题（modern-light, modern-dark, fresh-light, fresh-dark）

---

## 基础使用

### 1. 使用主题Hook

```typescript
import { useTheme } from "@/hooks/use-theme";

function MyComponent() {
  const { theme, mode, style, setTheme, setMode, setStyle, toggleMode } = useTheme();

  return (
    <div>
      <p>当前主题: {theme}</p>
      <p>当前模式: {mode}</p>
      <p>当前风格: {style}</p>
      
      {/* 切换完整主题 */}
      <button onClick={() => setTheme("fresh-dark")}>
        切换到清新暗色
      </button>
      
      {/* 只切换模式（保持风格） */}
      <button onClick={toggleMode}>
        切换亮/暗模式
      </button>
      
      {/* 只切换风格（保持模式） */}
      <button onClick={() => setStyle("fresh")}>
        切换到清新风格
      </button>
    </div>
  );
}
```

---

## 使用主题颜色

### 在组件中使用

```tsx
// 使用语义化的Tailwind类名
<div className="bg-primary text-primary-foreground">
  主色调背景
</div>

<div className="bg-secondary text-secondary-foreground">
  次要色调背景
</div>

<div className="bg-background text-foreground">
  页面背景色
</div>

<Card className="bg-card text-card-foreground border-border">
  卡片组件
</Card>
```

### 可用的颜色变量

| 变量名 | 说明 | 使用示例 |
|--------|------|----------|
| `background` | 页面背景色 | `bg-background` |
| `foreground` | 主要文字颜色 | `text-foreground` |
| `primary` | 主色调 | `bg-primary` |
| `primary-foreground` | 主色调文字 | `text-primary-foreground` |
| `secondary` | 次要色调 | `bg-secondary` |
| `secondary-foreground` | 次要色调文字 | `text-secondary-foreground` |
| `muted` | 柔和色调 | `bg-muted` |
| `muted-foreground` | 柔和文字 | `text-muted-foreground` |
| `accent` | 强调色 | `bg-accent` |
| `accent-foreground` | 强调色文字 | `text-accent-foreground` |
| `destructive` | 危险色 | `bg-destructive` |
| `destructive-foreground` | 危险色文字 | `text-destructive-foreground` |
| `border` | 边框颜色 | `border-border` |
| `input` | 输入框背景 | `bg-input` |
| `ring` | 焦点环颜色 | `ring-ring` |
| `card` | 卡片背景 | `bg-card` |
| `card-foreground` | 卡片文字 | `text-card-foreground` |
| `popover` | 弹出层背景 | `bg-popover` |
| `popover-foreground` | 弹出层文字 | `text-popover-foreground` |

---

## 添加新主题

### 步骤1：在CSS中定义主题颜色

编辑 `src/index.css`：

```css
[data-theme="my-theme-light"] {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.5 0.2 250); /* 蓝紫色 */
  --primary-foreground: oklch(1 0 0);
  /* ...其他颜色变量 */
}

[data-theme="my-theme-dark"] {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.6 0.18 250);
  --primary-foreground: oklch(0.145 0 0);
  /* ...其他颜色变量 */
}
```

### 步骤2：更新类型定义

编辑 `src/hooks/use-theme.ts`：

```typescript
export type ThemeStyle = "modern" | "fresh" | "my-theme"; // 添加新风格
export type ThemeMode = "light" | "dark";

export type Theme =
  | "modern-light"
  | "modern-dark"
  | "fresh-light"
  | "fresh-dark"
  | "my-theme-light"  // 添加新主题
  | "my-theme-dark";  // 添加新主题
```

### 步骤3：使用新主题

```typescript
const { setTheme } = useTheme();

setTheme("my-theme-light");
```

---

## 主题切换动画

默认已启用平滑过渡动画（在 `src/index.css` 中）：

```css
@layer base {
  * {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  }
}
```

如需禁用动画：

```css
@layer base {
  * {
    transition: none; /* 禁用所有过渡 */
  }
}
```

---

## 持久化存储

主题选择自动保存到 `localStorage`，刷新页面后保持：

```typescript
// 内部实现（无需手动调用）
localStorage.setItem("theme", theme);
```

查看当前保存的主题：

```javascript
// 浏览器Console
localStorage.getItem("theme");
```

---

## 常见问题

### Q1：如何获取当前主题信息？

```typescript
const { theme, mode, style } = useTheme();

console.log("完整主题:", theme);     // "modern-light"
console.log("模式:", mode);           // "light"
console.log("风格:", style);          // "modern"
```

### Q2：如何监听主题变化？

主题变化会自动触发组件重新渲染（通过useState）：

```typescript
function MyComponent() {
  const { theme } = useTheme();

  // 主题变化时，组件自动重新渲染
  useEffect(() => {
    console.log("主题已变更为:", theme);
  }, [theme]);

  return <div>当前主题: {theme}</div>;
}
```

### Q3：如何在主题切换时执行逻辑？

```typescript
const { theme } = useTheme();

useEffect(() => {
  // 主题切换后执行
  if (theme.includes("dark")) {
    console.log("切换到暗色模式");
  } else {
    console.log("切换到亮色模式");
  }
}, [theme]);
```

### Q4：如何根据系统主题自动切换？

```typescript
// 在use-theme.ts中添加（未来功能）
useEffect(() => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  
  const handleChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      setMode("dark");
    } else {
      setMode("light");
    }
  };

  mediaQuery.addEventListener("change", handleChange);
  
  return () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
}, []);
```

---

## 调试技巧

### 查看当前CSS变量值

```javascript
// 浏览器Console
const root = document.documentElement;
const styles = getComputedStyle(root);

console.log("主色调:", styles.getPropertyValue("--primary"));
console.log("背景色:", styles.getPropertyValue("--background"));
```

### 动态修改主题颜色（临时调试）

```javascript
// 浏览器Console
document.documentElement.style.setProperty(
  "--primary",
  "oklch(0.7 0.25 120)" // 绿色
);
```

---

## 最佳实践

1. **优先使用语义化类名**：使用 `bg-primary` 而不是 `bg-violet-600`
2. **保持一致性**：所有组件使用统一的颜色变量
3. **测试所有主题**：确保UI在4种主题下都正常显示
4. **避免硬编码颜色**：不要使用 `className="bg-[#7c3aed]"`

---

**相关文档**：
- [主题系统技术文档](../tech/theme-system.md)
- [前端文档导航](../README.md)

---

**最后更新**：2026-01-05

