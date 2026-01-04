# 前端文档导航中心

> 📚 **文档使用指南**：请先阅读 [全局文档体系使用指南](/DOCUMENTATION_GUIDE.md) 了解文档架构

---

## 📖 快速导航

### 🎯 核心技术文档（AI记忆）

技术实现细节文档位于 `tech/` 目录：

| 文档 | 说明 | 核心内容 |
|------|------|----------|
| [客户端认证系统](tech/auth-client.md) | 前端认证实现 | Session管理、API客户端、认证流程 |
| [主题系统](tech/theme-system.md) | 主题切换原理 | CSS Variables、双维度主题、Tailwind V4 |

### 📋 操作指南文档（程序员操作）

操作步骤文档位于 `ops/` 目录：

| 文档 | 说明 | 适用场景 |
|------|------|----------|
| [Session使用指南](ops/session-guide.md) | Session认证使用 | 登录、注册、受保护接口调用 |
| [主题使用指南](ops/theme-usage.md) | 主题功能使用 | 添加新主题、使用主题Hook |
| [开发环境配置](ops/dev-setup.md) | 开发环境设置 | VSCode配置、Monorepo设置 |
| [功能实现记录](ops/feature-logs.md) | 功能迭代日志 | 词汇等级功能、用户信息更新 |

---

## 🏗️ 前端架构概览

### 技术栈

- **框架**：React 18 + TypeScript
- **路由**：React Router v6
- **状态管理**：Zustand
- **数据请求**：React Query + Hono RPC
- **UI组件**：Shadcn/ui + Tailwind CSS V4
- **认证**：Better Auth Client
- **构建工具**：Vite

### 目录结构

```
projects/client/
├── src/
│   ├── components/        # UI组件
│   │   ├── landing/       # 落地页组件
│   │   ├── article/       # 文章相关组件
│   │   └── ui/            # Shadcn/ui组件
│   ├── pages/             # 页面组件
│   ├── hooks/             # 自定义Hooks
│   │   ├── use-theme.ts   # 主题管理
│   │   └── use-auth.ts    # 认证管理
│   ├── lib/               # 工具库
│   │   ├── api-client.ts  # API客户端（Hono RPC）
│   │   ├── session-utils.ts  # Session工具
│   │   └── utils.ts       # 通用工具
│   ├── store/             # Zustand状态管理
│   └── index.css          # 全局样式（主题CSS Variables）
└── docs/                  # 文档（本目录）
```

---

## 🔐 认证系统

### 核心概念

前端支持两种认证方式：

1. **Better Auth Session**（有邮箱用户）
   - 自动通过 Cookie 管理
   - 使用 `authClient` 和 `useSession`

2. **手动 Session**（无邮箱用户）
   - 手动创建，通过 token 管理
   - 使用 `apiClientAuth` 自动携带 token

### 快速开始

```tsx
import { useAuth } from "@/hooks/use-auth";
import { apiClientAuth } from "@/lib/api-client";

function MyComponent() {
  const { isAuthenticated, user } = useAuth();

  const fetchData = async () => {
    // 自动携带认证信息
    const res = await apiClientAuth.api.users.me.$get();
    const data = await res.json();
  };

  return <div>{user?.name}</div>;
}
```

### 详细文档

- **技术实现**：[客户端认证系统](tech/auth-client.md)
- **使用指南**：[Session使用指南](ops/session-guide.md)

---

## 🎨 主题系统

### 核心概念

双维度主题系统：**风格（Style）× 模式（Mode）**

- **风格**：`modern`（极简现代）、`fresh`（清新活力）
- **模式**：`light`（亮色）、`dark`（暗色）
- **组合**：4种主题（modern-light, modern-dark, fresh-light, fresh-dark）

### 快速开始

```tsx
import { useTheme } from "@/hooks/use-theme";

function ThemeSwitcher() {
  const { theme, mode, style, setMode, setStyle, toggleMode } = useTheme();

  return (
    <div>
      <p>当前主题: {theme}</p>
      {/* 切换模式（保持风格） */}
      <button onClick={toggleMode}>切换亮/暗</button>
      {/* 切换风格（保持模式） */}
      <button onClick={() => setStyle("fresh")}>清新风格</button>
    </div>
  );
}
```

### 详细文档

- **技术实现**：[主题系统原理](tech/theme-system.md)
- **使用指南**：[主题使用指南](ops/theme-usage.md)

---

## 🛠️ 开发指南

### 启动开发服务器

```bash
cd projects/client
npm run dev
```

### 环境变量

创建 `.env.local` 文件：

```env
# API地址
VITE_API_URL=http://localhost:8787

# Stripe公钥（可选，支付功能需要）
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

---

## 📦 核心依赖说明

### UI相关

- **Shadcn/ui**：基于Radix UI的React组件库
- **Tailwind CSS V4**：原子化CSS框架
- **Lucide React**：图标库

### 数据相关

- **Hono RPC**：类型安全的API客户端
- **React Query**：服务端状态管理
- **Zustand**：轻量级状态管理

### 认证相关

- **Better Auth**：认证系统客户端
- **自定义Session Utils**：手动Session管理

---

## 🔍 常见问题

### Q1：VSCode中TypeScript类型检查报错？

详见 [开发环境配置 - VSCode问题](ops/dev-setup.md#vscode配置)

### Q2：如何添加新主题颜色？

详见 [主题使用指南 - 添加新主题](ops/theme-usage.md#添加新主题)

### Q3：如何调用需要认证的API？

详见 [Session使用指南 - 受保护接口](ops/session-guide.md#访问受保护的接口)

### Q4：如何更新用户信息后刷新Session？

详见 [功能实现记录 - Session刷新](ops/feature-logs.md#更新用户信息刷新session)

---

## 📝 文档贡献

### 新增功能时

1. 更新本 README（添加功能概述）
2. 在 `tech/` 创建技术文档（详细实现）
3. 在 `ops/` 创建操作文档（使用指南）

### 文档编写规范

请参考 [全局文档体系使用指南](/DOCUMENTATION_GUIDE.md)

---

## 🔗 相关文档

- [后端文档导航](../../api/docs/README.md)
- [产品需求文档](../../api/docs/PRD-完整版.md)
- [全局文档使用指南](/DOCUMENTATION_GUIDE.md)

---

**最后更新**：2026-01-05
**维护者**：前端团队

