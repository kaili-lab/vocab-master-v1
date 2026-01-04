# 系统架构技术规范

> **受众**: AI (Cursor/Claude)  
> **用途**: 架构记忆库，包含整体设计、认证架构、数据库架构

---

## 核心架构

### 技术栈

| 层级 | 技术 | 原因 |
|------|------|------|
| **框架** | Hono.js | Web 标准 API，跨平台兼容 |
| **认证** | Better Auth | 类型安全，支持多种认证方式 |
| **ORM** | Drizzle ORM | 类型安全，Serverless 友好 |
| **数据库** | PostgreSQL (Neon) | HTTP 连接，适配 Cloudflare Workers |
| **密码** | Web Crypto API | 跨平台兼容（PBKDF2-SHA256） |
| **部署** | Cloudflare Workers | 边缘计算，全球低延迟 |

### 架构图

```
┌─────────────────────────────────────────────────────┐
│                 Cloudflare Workers                  │
│              (当前部署环境 - 边缘计算)               │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                   Hono.js 应用                       │
│              (Web 标准 API 实现)                     │
├─────────────────────────────────────────────────────┤
│  中间件层 (依赖注入)                                 │
│  ├── dbMiddleware   → 注入 db 实例                  │
│  ├── authMiddleware → 注入 auth 实例                │
│  └── requireAuth    → 会话验证 (注入 session)       │
├─────────────────────────────────────────────────────┤
│  路由层                                              │
│  ├── /api/auth/*    → Better Auth 认证路由          │
│  ├── /api/users/*   → 用户管理                      │
│  ├── /api/text/*    → 文章分析                      │
│  ├── /api/review/*  → 单词复习                      │
│  └── /api/payment/* → Stripe 支付                   │
├─────────────────────────────────────────────────────┤
│  业务层                                              │
│  ├── Service        → 业务逻辑（纯函数）            │
│  ├── Auth           → Better Auth 配置              │
│  └── Utils          → 工具函数                      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              外部服务                                │
│  ├── Neon Database  → PostgreSQL (HTTP 连接)       │
│  ├── OpenAI API     → GPT-4o-mini (文章分析)       │
│  ├── Google NLP     → 自然语言处理 (分词)          │
│  ├── Stripe API     → 支付处理                      │
│  └── Resend         → 邮件发送                      │
└─────────────────────────────────────────────────────┘
```

---

## 依赖注入模式

### 设计原则

**所有依赖通过 Context 注入，不使用全局变量**

```typescript
// 1. 定义 Variables 类型
export type DbVariables = {
  db: DbInstance;
};

// 2. 中间件注入
export const dbMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: DbVariables;
}>(async (c, next) => {
  c.set("db", createDb(c.env.DATABASE_URL));
  await next();
});

// 3. 路由使用
export const userRoute = new Hono<{
  Variables: DbVariables;
}>()
  .get("/", async (c) => {
    const db = c.get("db");  // 类型安全
    return c.json(await db.select().from(users));
  });
```

### 优势

| 对比项 | 全局导入 | 依赖注入 |
|--------|---------|---------|
| **类型安全** | 中 | ✅ 高 |
| **易于测试** | 难（需要 mock 模块） | ✅ 易（mock Context） |
| **依赖明确** | 隐式 | ✅ 显式 |
| **环境切换** | 困难 | ✅ 容易 |

---

## 数据库架构 (Drizzle ORM)

### 核心设计

```typescript
// db/db.ts - 工厂函数
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);  // Neon Serverless Driver (HTTP)
  return drizzle(sql, { schema });
}

export type DB = ReturnType<typeof createDb>;
```

### 数据流

```
请求到达
  ↓
dbMiddleware 执行
  c.set("db", createDb(c.env.DATABASE_URL))
  ↓
路由层获取 db
  const db = c.get("db")
  ↓
传递给 Service 层
  await findUser(db, phone)
  ↓
Service 执行查询
  await db.select().from(users).where(eq(users.phone, phone))
  ↓
返回结果
```

### 关键决策

1. **Neon Serverless Driver (HTTP)**：Cloudflare Workers 不支持 TCP 连接
2. **每请求创建实例**：HTTP 连接成本极低（~1ms），Serverless 最佳实践
3. **无连接池**：HTTP 无状态，不需要连接池
4. **依赖注入**：易测试、解耦

---

## 认证架构 (Better Auth)

### 双客户端模式

```typescript
// 前端 api-client.ts

// Better Auth Client - 认证操作
export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [phoneNumberClient()],
});
export const { useSession, signIn, signUp, signOut } = authClient;

// Hono RPC Client - 业务 API
export const apiClient = hc<ApiRoutes>(BASE_URL, {
  init: { credentials: "include" },  // 自动携带 Cookie
});
```

### 职责分工

| 客户端 | 用途 | 示例 |
|--------|------|------|
| Better Auth Client | 认证操作 | `signIn`, `signUp`, `signOut`, `useSession` |
| Hono RPC Client | 业务 API | `api.users.me.$get()`, `api.text.analyze.$post()` |

### 认证流程

```
Better Auth Client
  ↓ useSession() → /api/auth/get-session
后端 auth.route.ts
  ↓ .all("*") 代理给 auth.handler
Better Auth 验证 Cookie
  ↓ 返回 session
前端拿到 session
```

### 业务 API 流程

```
Hono RPC Client
  ↓ api.users.me.$get() → /api/users/me
中间件 require-auth.middleware.ts
  ↓ auth.api.getSession() 验证 Cookie
  ↓ c.set("session", session) 注入会话
路由 user.route.ts
  ↓ const session = c.get("session")
  ↓ 返回业务数据
```

### Cookie 自动传递

- Better Auth 使用 HttpOnly Cookie 存储会话
- 两个客户端都设置 `credentials: "include"`
- Cookie 自动在所有请求中携带
- 无需手动处理 token

---

## 环境变量 (Bindings)

### 类型定义

```typescript
// src/types/bindings.ts
export type Bindings = {
  // Better Auth
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  
  // AI 服务
  OPENAI_API_KEY: string;
  GOOGLE_NLP_API_KEY: string;
  AIHUBMIX_API_KEY: string;
  
  // Stripe 支付
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_YEARLY: string;
  FRONTEND_URL?: string;
  
  // 邮件
  RESEND_API_KEY: string;
  
  // 可选
  PORT?: string;
  NODE_ENV?: string;
};
```

### 使用方式

```typescript
// Hono 应用
const app = new Hono<{ Bindings: Bindings }>();

// 中间件
export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
}>(async (c, next) => {
  const auth = createAuth(c.env);  // c.env 类型安全
  c.set("auth", auth);
  await next();
});
```

---

## 跨平台兼容性

### Web 标准 API

| API | Cloudflare | Node.js | 浏览器 |
|-----|-----------|---------|--------|
| `crypto.subtle` | ✅ | ✅ (18+) | ✅ |
| `fetch` | ✅ | ✅ (18+) | ✅ |
| `URL` / `URLSearchParams` | ✅ | ✅ | ✅ |
| `TextEncoder` / `TextDecoder` | ✅ | ✅ | ✅ |

### 避免使用

| API | 问题 |
|-----|------|
| `process.*` | Node.js 专用 |
| `fs`, `path`, `os` | Node.js 专用 |
| `bcrypt` | Node.js 原生模块 |
| TCP 连接 | Cloudflare Workers 不支持 |

---

## 目录结构

```
src/
├── auth/
│   └── auth.ts              # Better Auth 配置
├── db/
│   ├── db.ts                # 数据库工厂函数
│   └── schema.ts            # Drizzle 表结构
├── middleware/
│   ├── auth.middleware.ts   # 注入 auth 实例
│   ├── db.middleware.ts     # 注入 db 实例
│   ├── require-auth.middleware.ts # 会话验证
│   └── quota-check.middleware.ts  # 配额检查
├── service/                 # 业务逻辑（纯函数）
│   ├── article.service.ts
│   ├── auth.service.ts
│   ├── stripe.service.ts
│   └── text.service.ts
├── route/                   # 路由层
│   ├── auth.route.ts
│   ├── user.route.ts
│   ├── text.route.ts
│   ├── payment.route.ts
│   └── review.route.ts
├── types/
│   ├── bindings.ts          # 环境变量类型
│   └── variables.ts         # Context 变量类型
├── utils/
│   ├── env.ts               # 环境变量抽象
│   ├── password.ts          # 密码哈希（Web Crypto）
│   └── anki-algorithm.ts    # Anki SM-2 算法
└── index.ts                 # Cloudflare Workers 入口
```

---

## 切换到 Node.js 的步骤

**预计时间：1-2 小时**

### 1. 创建 Node.js 入口

```typescript
// src/index.node.ts
import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app";  // 提取主应用逻辑

serve({ fetch: app.fetch, port: 3000 });
```

### 2. 修改环境变量工具

```typescript
// src/utils/env.ts
export const getEnv = (env?: Bindings): Bindings => {
  if (env) return env;  // Cloudflare Workers
  
  // Node.js 模式
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    // ...
  };
};
```

### 3. 添加启动脚本

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "dev:node": "tsx watch src/index.node.ts",
    "start": "node dist/index.node.js"
  }
}
```

---

## 性能指标

| 操作 | 时间 |
|------|------|
| Neon 连接创建 | ~1ms |
| 简单数据库查询 | ~10-50ms |
| AI 调用 (10 词) | ~3s |
| 边缘计算延迟 | < 50ms (全球) |

---

## 关键设计原则

1. **Serverless 优先**：使用 HTTP 连接、无状态设计
2. **依赖注入**：提高可测试性和解耦
3. **类型安全**：全栈 TypeScript + Zod 验证
4. **Web 标准**：保证跨平台兼容性
5. **简洁清晰**：避免过度设计

---

**85%+ 的代码是跨平台的！** 🎉

