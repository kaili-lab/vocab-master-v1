# Drizzle ORM 实践指南

> **📘 文档类型**：架构设计 - 数据库层专项  
> **🎯 适合读者**：后端开发者  
> **⏱️ 预计阅读**：20 分钟  
> **📅 最后更新**：2025-01-15  
> **🔗 相关文档**：[ARCHITECTURE.md](./ARCHITECTURE.md)（整体架构） · [database-transactions-guide.md](./database-transactions-guide.md)（事务指南）

---

## 🎯 文档定位

**本文档是 [ARCHITECTURE.md](./ARCHITECTURE.md) 的数据库层专项深化**

- 📖 如需了解整体架构，请先阅读 [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🔍 本文档专注于 Drizzle ORM 在项目中的具体实现和最佳实践
- 💡 强调"为什么这样设计"而不是"Drizzle 是什么"

### 快速导航

- [为什么选择这个架构？](#为什么这样设计) ← 项目决策依据
- [如何实现？](#核心组件) ← 具体代码实现
- [如何测试？](#测试示例) ← 实践指导
- [常见问题](#为什么这样设计) ← 问题排查

---

## 📋 架构概览

```
环境变量 → 中间件 → Context → Service 层 → 数据库
         (创建实例)  (注入)   (使用)
```

---

## 🎯 设计目标

1. **Serverless 优化**：适配 Cloudflare Workers 无 TCP 环境
2. **类型安全**：全栈 TypeScript 类型推导
3. **易于测试**：依赖注入模式，可 mock
4. **简洁清晰**：避免过度设计

---

## 🔧 核心组件

### 1. 数据库实例 (`src/db/db.ts`)

```typescript
// 工厂函数：根据 URL 创建实例
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl); // ① Neon HTTP 连接
  return drizzle(sql, { schema }); // ② Drizzle ORM
}

// 统一类型定义
export type DbInstance = ReturnType<typeof createDb>;
export type DB = DbInstance; // Service 层使用
```

**关键决策**：

- ✅ 使用 Neon Serverless Driver（HTTP 连接，非 TCP）
- ✅ 每次请求创建新实例（Serverless 最佳实践）
- ✅ 导出类型供全项目使用

---

### 2. 数据库中间件 (`src/middleware/db.middleware.ts`)

```typescript
export const dbMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: DbVariables;
}>(async (c, next) => {
  // 从环境变量读取 URL，创建实例，注入 Context
  c.set("db", createDb(c.env.DATABASE_URL));
  await next();
});
```

**关键决策**：

- ✅ 使用依赖注入模式（不用全局变量）
- ✅ 每个请求独立实例（避免状态污染）
- ✅ 统一入口，便于管理和测试

---

### 3. Service 层使用 (`src/service/*.service.ts`)

```typescript
import type { DB } from "../db/db";

export async function findUser(db: DB, phone: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  return user || null;
}
```

**关键决策**：

- ✅ 接收 `db` 参数（依赖注入）
- ✅ 纯函数，无副作用
- ✅ 易于单元测试

---

### 4. 路由层调用 (`src/route/*.route.ts`)

```typescript
export const authRoute = new Hono<{
  Variables: DbVariables & AuthVariables;
}>().post("/register", async (c) => {
  const db = c.get("db"); // 从 Context 获取

  // 传递给 Service 层
  const user = await findUser(db, phone);

  return c.json({ user });
});
```

**关键决策**：

- ✅ 路由只负责：接收请求 → 调用 Service → 返回响应
- ✅ 不直接写数据库查询（解耦）
- ✅ 类型安全的 Context 访问

---

## ❓ 为什么这样设计

### Q1: 为什么用 Neon Serverless Driver？

**A**: Cloudflare Workers 不支持 TCP 连接，只能用 HTTP。

| 驱动                       | 协议     | Cloudflare Workers | Node.js |
| -------------------------- | -------- | ------------------ | ------- |
| `pg`                       | TCP      | ❌                 | ✅      |
| `postgres`                 | TCP      | ❌                 | ✅      |
| `@neondatabase/serverless` | **HTTP** | ✅                 | ✅      |

---

### Q2: 为什么每个请求创建新实例？

**A**: Serverless 环境的最佳实践。

```typescript
// ❌ 错误：全局单例（Serverless 环境有问题）
const db = createDb(process.env.DATABASE_URL);

// ✅ 正确：每请求创建（适合 Serverless）
c.set("db", createDb(c.env.DATABASE_URL));
```

**原因**：

1. Neon HTTP 连接创建成本**极低**（无连接池开销）
2. Serverless 函数可能同时处理多个请求（隔离更安全）
3. 环境变量可能不同（开发/生产环境）

---

### Q3: 为什么不用连接池？

**A**: HTTP 连接不需要连接池。

- TCP 连接：需要连接池（建立连接慢）
- HTTP 连接：无状态，每次请求独立（快速）

---

### Q4: 为什么用依赖注入？

**A**: 可测试性 + 解耦。

```typescript
// ✅ Service 层：纯函数，易测试
export async function findUser(db: DB, phone: string) {
  return await db.select()...
}

// 测试时可以 mock
const mockDb = { select: vi.fn() };
await findUser(mockDb as DB, "13800138000");
```

对比全局变量：

```typescript
// ❌ 难以测试
import { db } from "../db/db";  // 全局变量

export async function findUser(phone: string) {
  return await db.select()...  // 如何 mock？
}
```

---

### Q5: 为什么不用 Repository 模式？

**A**: Drizzle ORM 已经足够简洁，不需要额外封装层。

```typescript
// Drizzle 已经很简洁了
const user = await db
  .select()
  .from(users)
  .where(eq(users.phone, phone));

// Repository 反而增加复杂度
class UserRepository {
  findByPhone(phone: string) {
    return this.db.select()...  // 额外一层封装
  }
}
```

**适用场景**：

- ✅ 当前项目（30 路由）：直接用 Drizzle
- ⚠️ 大型项目（100+ 路由）：考虑 Repository

---

## 📂 文件结构

```
src/
├── db/
│   ├── db.ts              # 数据库实例工厂
│   └── schema.ts          # 数据表定义
├── middleware/
│   └── db.middleware.ts   # 数据库中间件（依赖注入）
├── service/               # 业务逻辑层
│   ├── auth.service.ts    # 认证相关（调用 db）
│   ├── session.service.ts # 会话管理
│   └── verification.service.ts # 验证码
├── route/                 # 路由层
│   └── auth.route.ts      # 接收请求 → 调用 Service
└── index.ts               # 应用中间件
```

---

## 🔄 数据流

```
1. 请求到达
   ↓
2. dbMiddleware 执行
   c.set("db", createDb(c.env.DATABASE_URL))
   ↓
3. 路由层获取 db
   const db = c.get("db")
   ↓
4. 传递给 Service 层
   await findUser(db, phone)
   ↓
5. Service 执行数据库查询
   await db.select().from(users)...
   ↓
6. 返回结果
```

---

## 🎨 设计模式

### 1. 工厂模式

```typescript
// 工厂函数创建实例
export function createDb(url: string) {
  return drizzle(neon(url), { schema });
}
```

### 2. 依赖注入

```typescript
// 中间件注入依赖
c.set("db", createDb(...));

// Service 层接收依赖
function findUser(db: DB, ...) { }
```

### 3. 分层架构

```
路由层（Route）→ 业务层（Service）→ 数据层（Drizzle ORM）
```

---

## 🧪 测试示例

### Service 层单元测试

```typescript
import { describe, it, expect, vi } from "vitest";
import { findUserByPhone } from "../service/auth.service";

describe("findUserByPhone", () => {
  it("应该返回用户", async () => {
    // Mock db
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, phone: "13800138000" }]),
          }),
        }),
      }),
    };

    const user = await findUserByPhone(mockDb as any, "13800138000");

    expect(user).toEqual({ id: 1, phone: "13800138000" });
  });
});
```

---

## ⚡ 性能考虑

### Neon HTTP 连接性能

| 操作     | 时间      |
| -------- | --------- |
| 创建连接 | ~1ms      |
| 简单查询 | ~10-50ms  |
| 复杂查询 | ~50-200ms |

**结论**：每请求创建实例的开销可忽略不计。

---

## 🚀 快速开始

### 1. 配置环境变量

```bash
# .dev.vars (本地开发)
DATABASE_URL=postgresql://user:pass@host/db
```

### 2. 使用 Service

```typescript
import { findUserByPhone } from "../service/auth.service";

export const myRoute = new Hono<{ Variables: DbVariables }>().get(
  "/user/:phone",
  async (c) => {
    const db = c.get("db");
    const phone = c.req.param("phone");

    const user = await findUserByPhone(db, phone);

    return c.json({ user });
  }
);
```

---

## 补充

1. 因为当前项目是 cloudflare 环境，安装 drizzle-kit，需要在开发环境安装 dotenv，因为 drizzle-kit 是 Nodejs 环境执行的

---

## 📚 相关文档

- [Drizzle ORM 官方文档](https://orm.drizzle.team)
- [Neon Serverless 文档](https://neon.tech/docs/serverless/serverless-driver)
- [Cloudflare Workers 数据库指南](https://developers.cloudflare.com/workers/databases/)

---

## 🎓 总结

| 设计原则            | 实现方式         | 原因                          |
| ------------------- | ---------------- | ----------------------------- |
| **Serverless 优化** | Neon HTTP Driver | Cloudflare Workers 不支持 TCP |
| **依赖注入**        | 中间件 + Context | 易测试、解耦                  |
| **类型安全**        | 统一 `DB` 类型   | TypeScript 支持               |
| **简洁清晰**        | 轻量级 Service   | 避免过度设计                  |
| **每请求创建**      | 工厂模式         | HTTP 连接成本低               |

**核心思想**：在 Serverless 环境中，使用 HTTP 连接 + 依赖注入模式，实现简洁、类型安全、易测试的数据库架构。
