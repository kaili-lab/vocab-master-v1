# 架构设计文档

> Vocab Master API - Cloudflare Workers 优先，兼容 Node.js 的架构设计  
> 日期：2025-11-01  
> 版本：1.0

---

## 📋 目录

- [设计理念](#设计理念)
- [架构概览](#架构概览)
- [核心设计](#核心设计)
- [技术选型](#技术选型)
- [环境兼容性](#环境兼容性)
- [依赖注入模式](#依赖注入模式)
- [目录结构](#目录结构)
- [部署方式](#部署方式)
- [FAQ](#faq)

---

## 设计理念

### 🎯 核心原则

**Cloudflare Workers 优先，保留 Node.js 兼容性**

```
当前：Cloudflare Workers 单环境
    ↓
使用：Web 标准 API
    ↓
结果：天然兼容 Node.js
    ↓
将来：1-2 小时可切换到 Node.js
```

### 💡 为什么这样设计？

#### 1. 简单性优先

- ✅ 当前只需要 Cloudflare Workers
- ✅ 不维护两套入口文件
- ✅ 降低复杂度和维护成本

#### 2. 保留灵活性

- ✅ 使用 Web 标准 API（跨平台）
- ✅ 避免平台专用代码
- ✅ 将来可以低成本切换

#### 3. 最佳实践

- ✅ 使用 Hono.js 推荐的依赖注入模式
- ✅ 类型安全（TypeScript）
- ✅ 易于测试和维护

---

## 架构概览

### 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────┐
│                 Cloudflare Workers                  │
│                  (当前部署环境)                      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                   Hono.js 应用                       │
│              (Web 标准 API 实现)                     │
├─────────────────────────────────────────────────────┤
│  中间件层 (依赖注入)                                 │
│  ├── logger         → 日志                          │
│  ├── cors           → 跨域                          │
│  ├── dbMiddleware   → 注入 db 实例                  │
│  └── authMiddleware → 注入 auth 实例                │
├─────────────────────────────────────────────────────┤
│  路由层                                              │
│  ├── /api/auth/*    → Better Auth 认证路由          │
│  ├── /api/users/*   → 用户管理                      │
│  ├── /api/sms/*     → 短信验证码                    │
│  └── /api/register  → 手机号注册                    │
├─────────────────────────────────────────────────────┤
│  业务层                                              │
│  ├── auth.ts        → Better Auth 配置              │
│  ├── db.ts          → 数据库实例工厂                │
│  ├── schema.ts      → 数据库表结构                  │
│  └── utils/         → 工具函数                      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              外部服务                                │
│  ├── Neon Database  → PostgreSQL (HTTP 连接)       │
│  └── (未来) SMS     → 短信服务                      │
└─────────────────────────────────────────────────────┘
```

---

## 核心设计

### 1. 依赖注入模式

**统一的中间件注入模式，避免全局变量和 hack 方法。**

```typescript
// 中间件：注入依赖
app.use("*", dbMiddleware);   // 注入 db
app.use("*", authMiddleware); // 注入 auth

// 路由：使用依赖
app.get("/api/users", async (c) => {
  const db = c.get("db");     // 从 Context 获取
  const auth = c.get("auth"); // 从 Context 获取
  // ...
});
```

#### 为什么使用依赖注入？

| 对比项 | 全局导入 | 依赖注入 |
|--------|---------|---------|
| **代码** | `import { db }` | `c.get("db")` |
| **类型安全** | 中 | ✅ 高 |
| **易于测试** | 难（需要 mock 模块） | ✅ 易（mock Context） |
| **依赖明确** | 隐式 | ✅ 显式 |
| **环境切换** | 困难 | ✅ 容易 |

---

### 2. 环境变量抽象

**统一的环境变量访问接口，隔离环境差异。**

```typescript
// utils/env.ts
export const getEnv = (env: Bindings): Bindings => {
  return env; // 当前：直接返回 Cloudflare Workers 的 env
  
  // 将来支持 Node.js 时，取消注释：
  // if (env) return env;
  // return { DATABASE_URL: process.env.DATABASE_URL!, ... };
};
```

#### 优势

- ✅ **业务代码统一**：使用 `getEnv(c.env)` 而不是直接访问 `process.env`
- ✅ **易于切换**：取消注释即可支持 Node.js
- ✅ **类型安全**：返回类型为 `Bindings`

---

### 3. 数据库连接

**使用 HTTP 连接，兼容 Serverless 环境。**

```typescript
// db/db.ts
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);  // Neon Serverless Driver (HTTP)
  return drizzle(sql, { schema });
}
```

#### 为什么用 HTTP 而不是 TCP？

| 环境 | TCP 连接 | HTTP 连接 |
|------|---------|----------|
| **Cloudflare Workers** | ❌ 不支持 | ✅ 支持 |
| **Node.js** | ✅ 支持 | ✅ 支持 |
| **连接池** | 需要 | 不需要 |
| **成本** | 高（长连接） | 低（按请求） |

**结论：HTTP 连接是 Serverless 环境的最佳选择。**

---

### 4. 密码哈希

**使用 Web Crypto API，跨平台兼容。**

```typescript
// utils/password.ts
export async function hashPassword(password: string) {
  // 使用 PBKDF2-SHA256（Web 标准）
  const hashBuffer = await crypto.subtle.deriveBits({ ... });
  return `${saltBase64}$${hashBase64}`;
}
```

#### 为什么不用 bcrypt？

| 方案 | bcrypt | Web Crypto API |
|------|--------|----------------|
| **Cloudflare Workers** | ❌ 不支持 | ✅ 支持 |
| **Node.js** | ✅ 支持 | ✅ 支持（18+） |
| **浏览器** | ❌ 不支持 | ✅ 支持 |
| **性能** | 快 | 稍慢（可接受） |

**结论：Web Crypto API 是唯一能在所有环境运行的方案。**

---

## 技术选型

### 核心技术栈

| 技术 | 选择 | 原因 |
|------|------|------|
| **框架** | Hono.js | 轻量、快速、支持多环境 |
| **认证** | Better Auth | 现代、类型安全、灵活 |
| **ORM** | Drizzle ORM | 类型安全、支持 Serverless |
| **数据库** | PostgreSQL (Neon) | HTTP 连接、Serverless 友好 |
| **验证** | Zod | 类型安全的 schema 验证 |
| **密码哈希** | Web Crypto API | 跨平台兼容 |

### 为什么选择 Hono.js？

```typescript
// ✅ 支持多环境
export default {
  fetch: app.fetch,  // Cloudflare Workers
};

// 将来支持 Node.js：
serve({ fetch: app.fetch, port: 3000 });
```

**Hono.js 的优势：**
- ✅ 基于 Web 标准（Request/Response）
- ✅ 统一的 API，多环境运行
- ✅ 类型安全（TypeScript）
- ✅ 性能优秀

---

## 环境兼容性

### 🎯 兼容性策略

**所有共享代码只使用 Web 标准 API**

#### ✅ 推荐使用

| API | Cloudflare | Node.js | 浏览器 |
|-----|-----------|---------|--------|
| `crypto.subtle` | ✅ | ✅ (18+) | ✅ |
| `fetch` | ✅ | ✅ (18+) | ✅ |
| `URL` / `URLSearchParams` | ✅ | ✅ | ✅ |
| `TextEncoder` / `TextDecoder` | ✅ | ✅ | ✅ |

#### ❌ 避免使用

| API | 问题 |
|-----|------|
| `process.*` | Node.js 专用 |
| `fs`, `path`, `os` | Node.js 专用 |
| `bcrypt`, `@node-rs/bcrypt` | Node.js 原生模块 |
| TCP 连接 | Cloudflare Workers 不支持 |

---

### 🔄 切换到 Node.js 的步骤

如果将来需要部署到 Node.js，只需 **1-2 小时**：

#### 步骤 1：创建 Node.js 入口文件

```typescript
// src/index.node.ts
import "dotenv/config";  // 加载 .env
import { serve } from "@hono/node-server";

// 复用相同的应用代码
import { app } from "./app"; // 将主应用逻辑提取到 app.ts

const port = parseInt(process.env.PORT || "3000");
serve({ fetch: app.fetch, port });
```

#### 步骤 2：安装 Node.js 依赖

```bash
pnpm add @hono/node-server dotenv
```

#### 步骤 3：修改环境变量工具

```typescript
// src/utils/env.ts - 取消注释
export const getEnv = (env?: Bindings): Bindings => {
  if (env) return env;  // Cloudflare Workers
  
  // Node.js 模式
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  };
};
```

#### 步骤 4：添加启动脚本

```json
{
  "scripts": {
    "dev": "wrangler dev",           // Cloudflare
    "dev:node": "tsx watch src/index.node.ts",  // Node.js
    "start": "node dist/index.node.js"
  }
}
```

**总时间：1-2 小时** ✅

---

## 依赖注入模式

### 🎯 Hono.js 推荐模式

**所有依赖通过 Context 注入，而不是全局导入。**

#### 标准流程

```
1. 定义 Variables 类型
   ↓
2. 在中间件中注入：c.set('name', value)
   ↓
3. 在路由中使用：c.get('name')
```

### 示例：数据库注入

```typescript
// 1. 定义类型
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
    const db = c.get("db");  // ✅ 类型安全
    return c.json(await db.select().from(users));
  });
```

### 优势总结

| 优势 | 说明 |
|------|------|
| **类型安全** | TypeScript 完整支持，自动补全 |
| **易于测试** | 可以 mock Context 注入测试数据 |
| **依赖明确** | 路由类型声明了需要哪些依赖 |
| **统一模式** | auth 和 db 使用相同的模式 |
| **环境兼容** | 不依赖全局变量，易于切换环境 |

---

## 目录结构

```
projects/api/
├── src/
│   ├── auth/
│   │   └── auth.ts              # Better Auth 配置
│   ├── db/
│   │   ├── db.ts                # 数据库工厂函数
│   │   └── schema.ts            # Drizzle 表结构
│   ├── middleware/
│   │   ├── auth.middleware.ts   # 注入 auth 实例
│   │   └── db.middleware.ts     # 注入 db 实例
│   ├── route/
│   │   ├── user.route.ts        # 用户路由
│   │   ├── sms.route.ts         # 短信验证码路由
│   │   └── auth.route.ts        # 自定义认证路由（注册）
│   ├── utils/
│   │   ├── env.ts               # 环境变量抽象
│   │   └── password.ts          # 密码哈希（Web Crypto）
│   └── index.ts                 # Cloudflare Workers 入口
├── types/
│   └── bindings.ts              # 环境变量类型定义
├── .dev.vars                    # 开发环境变量（Cloudflare）
├── wrangler.jsonc               # Cloudflare Workers 配置
├── drizzle.config.ts            # Drizzle ORM 配置
├── package.json                 # 依赖管理
├── ARCHITECTURE.md              # 架构文档（本文档）
├── WRANGLER_CONFIG.md           # Wrangler 配置说明
└── README.md                    # 项目说明
```

### 核心文件说明

| 文件 | 作用 | 环境兼容 |
|------|------|----------|
| `index.ts` | 应用入口 | Cloudflare 专用 |
| `auth.middleware.ts` | 注入 auth | ✅ 跨平台 |
| `db.middleware.ts` | 注入 db | ✅ 跨平台 |
| `env.ts` | 环境变量抽象 | ✅ 跨平台 |
| `password.ts` | 密码哈希 | ✅ 跨平台 |
| `db.ts` | 数据库工厂 | ✅ 跨平台 |
| `auth.ts` | Better Auth 配置 | ✅ 跨平台 |
| 所有路由 | 业务逻辑 | ✅ 跨平台 |

**85%+ 的代码是跨平台的！** 🎉

---

## 部署方式

### 🚀 Cloudflare Workers（当前）

```bash
# 开发
pnpm dev

# 部署
pnpm deploy

# 访问
https://api.your-subdomain.workers.dev
```

#### 环境变量配置

**开发环境：** `.dev.vars`
```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3000
```

**生产环境：** Cloudflare Dashboard
- Settings → Environment Variables
- 添加相同的变量

---

### 🔄 Node.js（将来可选）

```bash
# 开发
pnpm dev:node

# 生产
pnpm start

# 访问
http://localhost:3000
```

#### 环境变量配置

**开发/生产：** `.env`
```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3000
PORT=3000
NODE_ENV=production
```

---

## FAQ

### Q1: 为什么选择 Cloudflare Workers 而不是 Node.js？

**A:** 
- ✅ **性能**：边缘计算，全球低延迟
- ✅ **成本**：按请求付费，小项目几乎免费
- ✅ **扩展性**：自动扩展，无需运维
- ✅ **简单**：无需管理服务器

---

### Q2: 切换到 Node.js 会损失什么功能吗？

**A:** 不会！所有功能都兼容。

| 功能 | Cloudflare | Node.js |
|------|-----------|---------|
| Hono.js 框架 | ✅ | ✅ |
| Better Auth | ✅ | ✅ |
| Drizzle ORM | ✅ | ✅ |
| Web Crypto 密码哈希 | ✅ | ✅ |
| Neon Database (HTTP) | ✅ | ✅ |

---

### Q3: 为什么不直接支持双环境？

**A:** **简单性优先。**

| 方案 | 复杂度 | 维护成本 | 当前需求 |
|------|--------|---------|---------|
| 只支持 Cloudflare | 低 | 低 | ✅ 满足 |
| 双环境支持 | 中 | 中 | ❌ 不需要 |

**如果将来需要，1-2 小时就能切换。**

---

### Q4: 使用 Web Crypto API 会影响性能吗？

**A:** 影响很小，可以接受。

| 指标 | bcrypt | Web Crypto (PBKDF2) |
|------|--------|---------------------|
| 哈希速度 | 快 | 稍慢（~10-20%） |
| 安全性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 兼容性 | Node.js only | 跨平台 |

**对于认证场景（低频操作），性能差异可忽略。**

---

### Q5: 为什么用 Neon 而不是传统 PostgreSQL？

**A:** **Serverless 友好。**

| 特性 | 传统 PostgreSQL | Neon |
|------|----------------|------|
| 连接方式 | TCP（长连接） | HTTP（短连接） |
| Cloudflare 兼容 | ❌ 需要连接池 | ✅ 原生支持 |
| 按需付费 | ❌ | ✅ |
| 自动扩展 | ❌ | ✅ |

---

### Q6: 中间件每次请求都创建实例，会有性能问题吗？

**A:** 不会，这是 Serverless 的标准做法。

**原因：**
- Neon 使用 HTTP 连接，创建成本极低
- Better Auth 实例是轻量级对象
- 每个请求都是独立的（无状态）

**对比：**
```
传统服务器：应用启动时创建，所有请求共享（有状态）
Serverless：每个请求创建，用完即销毁（无状态）
```

---

## 总结

### 🎯 核心设计理念

1. **Cloudflare Workers 优先** - 满足当前需求
2. **Web 标准 API** - 保证跨平台兼容性
3. **依赖注入模式** - 提高代码质量
4. **保留切换路径** - 1-2 小时可切换到 Node.js

### ✨ 架构优势

| 优势 | 说明 |
|------|------|
| **简单** | 单环境，易于理解和维护 |
| **灵活** | 使用 Web 标准，可切换环境 |
| **优雅** | 依赖注入，类型安全 |
| **性能** | 边缘计算，全球低延迟 |
| **成本** | 按需付费，小项目几乎免费 |

### 📚 相关文档

- **WRANGLER_CONFIG.md** - Wrangler 配置详解
- **DEPLOYMENT_GUIDE.md** - 部署指南
- **README.md** - 项目说明

---

**这就是为什么我们这样设计！** 🎉

简单、优雅、灵活 —— 这是现代 Serverless 架构的最佳实践。

