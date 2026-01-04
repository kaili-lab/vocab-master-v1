# 环境变量类型定义

> **受众**: AI (Cursor/Claude)  
> **用途**: Bindings 类型规范和使用方式

---

## 什么是 Bindings

**Bindings** 是 Cloudflare Workers 的术语，表示环境变量和资源绑定的类型定义。

---

## 类型定义

```typescript
// src/types/bindings.ts
export type Bindings = {
  // Better Auth
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;

  // AI 服务
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

---

## 使用方式

### Hono 应用

```typescript
// index.ts
import type { Bindings } from "./types/bindings";

const app = new Hono<{ Bindings: Bindings }>();

// 现在 c.env 有完整的类型提示
app.get("/", (c) => {
  const dbUrl = c.env.DATABASE_URL;  // ✅ 类型安全
  return c.json({ dbUrl });
});
```

### 中间件

```typescript
// middleware/auth.middleware.ts
import type { Bindings } from "../types/bindings";

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
}>(async (c, next) => {
  const auth = createAuth(c.env);  // c.env 类型安全
  c.set("auth", auth);
  await next();
});
```

### 路由

```typescript
// route/user.route.ts
import type { Bindings } from "../types/bindings";

export const userRoute = new Hono<{
  Bindings: Bindings;
}>().get("/me", async (c) => {
  // c.env 可用，但通常通过中间件注入依赖
  const db = c.get("db");
  return c.json({ user: await findUser(db) });
});
```

---

## 好处

### 1. 类型安全

```typescript
// ❌ 没有 Bindings
const url = c.env.DATABSE_URL;  // 拼写错误，运行时才发现

// ✅ 有 Bindings
const url = c.env.DATABSE_URL;  // TypeScript 立即报错
```

### 2. IDE 自动补全

```typescript
c.env.  // 输入时自动提示所有环境变量
```

### 3. 文档作用

查看 `bindings.ts` 就知道项目需要哪些环境变量。

---

## 环境配置

### Cloudflare Workers

**开发环境**：`.dev.vars`
```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=xxx
STRIPE_SECRET_KEY=sk_test_...
```

**生产环境**：通过 wrangler 或 Dashboard 配置
```bash
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
```

### Node.js

```typescript
// utils/env.ts
export const getEnv = (env?: Bindings): Bindings => {
  if (env) return env;  // Cloudflare Workers
  
  // Node.js
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    // ...
  };
};
```

---

## 可选字段

`?` 表示字段可选：

```typescript
PORT?: string;  // 可能不存在

// 使用时
const port = c.env.PORT || "3000";  // 提供默认值
```

---

## 关键文件

- `src/types/bindings.ts` - 类型定义
- `.dev.vars` - 本地环境变量（不提交到 git）
- `.dev.vars.example` - 环境变量示例
- `wrangler.jsonc` - Cloudflare Workers 配置

---

## 注意事项

1. **`.dev.vars` 不要提交到 git**：包含敏感信息
2. **生产环境不使用 `.dev.vars`**：通过 Cloudflare Dashboard 或 wrangler 配置
3. **类型定义要保持更新**：添加新环境变量时同步更新 `Bindings`

