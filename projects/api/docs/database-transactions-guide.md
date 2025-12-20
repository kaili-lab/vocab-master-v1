# Neon 数据库事务支持指南

> **📘 文档类型**：技术决策 + 实践指南  
> **🎯 适合读者**：后端开发者  
> **⏱️ 预计阅读**：15 分钟  
> **📅 最后更新**：2025-01-15  
> **🔗 相关文档**：[Drizzle架构设计.md](./Drizzle架构设计.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🎯 文档目的

解释为什么当前项目不能使用数据库事务，以及如何选择合适的数据库连接方式。

---

## 📋 目录

1. [当前项目的情况](#当前项目的情况)
2. [为什么不支持事务](#为什么不支持事务)
3. [Neon 数据库的连接方式对比](#neon-数据库的连接方式对比)
4. [如何启用事务支持](#如何启用事务支持)
5. [无事务环境下的最佳实践](#无事务环境下的最佳实践)
6. [决策树：选择合适的连接方式](#决策树选择合适的连接方式)

---

## 当前项目的情况

### 使用的技术栈

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",
    "drizzle-orm": "^0.44.7"
  }
}
```

### 数据库连接代码

```typescript
// projects/api/src/db/db.ts
import { drizzle } from "drizzle-orm/neon-http"; // ⚠️ 使用 HTTP 连接
import { neon } from "@neondatabase/serverless";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
```

### 部署环境

- **运行时**：Cloudflare Workers（Serverless 边缘计算环境）
- **限制**：不支持 TCP 长连接，只能使用 HTTP/WebSocket

---

## 为什么不支持事务

### 1. HTTP 协议的限制

#### Neon HTTP Driver 的工作原理

```
客户端 → HTTP POST 请求（带 SQL） → Neon HTTP 端点 → PostgreSQL
         ↓
    每个请求都是独立的（无状态）
```

- **HTTP 是无状态协议**：每个请求都是独立的，无法在请求之间保持连接状态
- **事务需要有状态连接**：事务需要在同一个连接上执行 `BEGIN` → `SQL1` → `SQL2` → `COMMIT`
- **HTTP Driver 无法维持连接**：每个 SQL 语句都是一个独立的 HTTP 请求

#### 错误示例

```typescript
// ❌ 这段代码会报错
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: "Alice" });
  await tx.insert(orders).values({ userId: 1 });
});

// 错误信息：
// Error: No transactions support in neon-http driver
```

### 2. Cloudflare Workers 的限制

Cloudflare Workers 运行在 V8 Isolate 中，有以下限制：

- ❌ **不支持 TCP 连接**：无法创建传统的 PostgreSQL 连接
- ❌ **不支持长连接**：无法维持持久的数据库连接池
- ✅ **支持 HTTP/HTTPS**：可以通过 HTTP 请求访问数据库
- ✅ **支持 WebSocket**：可以通过 WebSocket 进行双向通信

这就是为什么我们必须使用 `neon-http` driver。

---

## Neon 数据库的连接方式对比

### 方式 1：HTTP 连接（当前使用）

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });
```

| 特性                   | 支持情况                |
| ---------------------- | ----------------------- |
| **事务支持**           | ❌ 不支持               |
| **Cloudflare Workers** | ✅ 完全兼容             |
| **连接开销**           | ✅ 低（每次 HTTP 请求） |
| **冷启动速度**         | ✅ 快（无需建立连接）   |
| **适用场景**           | Serverless、边缘计算    |

#### 优点

- ✅ 兼容 Cloudflare Workers
- ✅ 无需管理连接池
- ✅ 冷启动快
- ✅ 自动扩展

#### 缺点

- ❌ 不支持事务
- ❌ 不支持 Prepared Statements
- ❌ 每个查询都有 HTTP 延迟

---

### 方式 2：WebSocket 连接（支持事务）

```typescript
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// 配置 WebSocket（Node.js 环境需要）
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
```

| 特性                   | 支持情况                      |
| ---------------------- | ----------------------------- |
| **事务支持**           | ✅ 完整支持                   |
| **Cloudflare Workers** | ✅ 兼容（WebSocket API）      |
| **连接开销**           | ⚠️ 中等（需要建立 WebSocket） |
| **冷启动速度**         | ⚠️ 较慢（需要握手）           |
| **适用场景**           | 需要事务的场景                |

#### 优点

- ✅ **完整支持事务**
- ✅ 支持 Prepared Statements
- ✅ 更接近传统 PostgreSQL 体验
- ✅ 兼容 Cloudflare Workers

#### 缺点

- ⚠️ 需要维护连接池
- ⚠️ 冷启动较慢
- ⚠️ 连接可能超时

---

### 方式 3：传统 TCP 连接（Node.js Only）

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
```

| 特性                   | 支持情况                |
| ---------------------- | ----------------------- |
| **事务支持**           | ✅ 完整支持             |
| **Cloudflare Workers** | ❌ 不兼容               |
| **连接开销**           | ✅ 低（连接池复用）     |
| **冷启动速度**         | ⚠️ 较慢（需要建立连接） |
| **适用场景**           | 传统 Node.js 服务器     |

#### 优点

- ✅ 最成熟的方案
- ✅ 性能最优
- ✅ 功能最完整

#### 缺点

- ❌ **不兼容 Cloudflare Workers**
- ⚠️ 需要管理连接池
- ⚠️ 不适合 Serverless

---

## 如何启用事务支持

如果您的项目**需要事务**，有以下几种方案：

### 方案 1：切换到 WebSocket 连接（推荐）

#### 步骤 1：修改数据库连接代码

```typescript
// projects/api/src/db/db.ts

// ❌ 移除 HTTP 连接
// import { drizzle } from "drizzle-orm/neon-http";
// import { neon } from "@neondatabase/serverless";

// ✅ 使用 WebSocket 连接
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; // Node.js 环境需要

// 配置 WebSocket（仅 Node.js 开发环境需要）
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}
```

#### 步骤 2：更新 package.json

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",
    "drizzle-orm": "^0.44.7"
  },
  "devDependencies": {
    "ws": "^8.18.0",
    "@types/ws": "^8.5.13"
  }
}
```

#### 步骤 3：使用事务

```typescript
// ✅ 现在可以使用事务了
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: "Alice" });
  await tx.insert(orders).values({ userId: 1 });
  // 如果任何操作失败，整个事务会回滚
});
```

#### 注意事项

- ✅ 仍然兼容 Cloudflare Workers（WebSocket 是标准 Web API）
- ⚠️ 冷启动时间会增加 50-100ms（建立 WebSocket 连接）
- ⚠️ 需要处理连接超时和重连逻辑

---

### 方案 2：使用 Redis 实现原子操作

如果不想切换连接方式，可以使用 Redis 实现原子操作：

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// 原子递增计数器
const currentCount = await redis.incr(`quota:${userId}:${today}`);

if (currentCount > limit) {
  await redis.decr(`quota:${userId}:${today}`); // 回滚
  throw new Error("Quota exceeded");
}

// 继续执行业务逻辑
```

#### 优点

- ✅ 完全原子操作
- ✅ 性能极高
- ✅ 适合高并发场景

#### 缺点

- ⚠️ 需要额外的 Redis 服务
- ⚠️ 增加架构复杂度

---

## 无事务环境下的最佳实践

如果继续使用 HTTP 连接（不支持事务），以下是最佳实践：

### 1. 使用数据库的原子操作

利用 SQL 的原子特性，而不是应用层的事务：

#### ✅ 好的做法：使用 SQL 表达式

```typescript
// 原子递增
await db
  .update(userStats)
  .set({
    count: sql`${userStats.count} + 1`,
  })
  .where(eq(userStats.userId, userId));
```

#### ❌ 不好的做法：先读后写

```typescript
// ❌ 有并发问题
const current = await db.select().from(userStats).where(...);
await db.update(userStats).set({
  count: current.count + 1, // 可能基于过期数据
});
```

---

### 2. 使用 UPSERT（INSERT ... ON CONFLICT）

```typescript
// 原子的插入或更新
await db
  .insert(userStats)
  .values({
    userId,
    count: 1,
  })
  .onConflictDoUpdate({
    target: [userStats.userId],
    set: {
      count: sql`${userStats.count} + 1`, // 基于数据库最新值
    },
  });
```

---

### 3. 使用乐观锁（Optimistic Locking）

```typescript
// 表结构添加 version 字段
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  amount: integer("amount"),
  version: integer("version").default(0), // 版本号
});

// 更新时检查版本号
const result = await db
  .update(orders)
  .set({
    amount: newAmount,
    version: sql`${orders.version} + 1`,
  })
  .where(
    and(
      eq(orders.id, orderId),
      eq(orders.version, expectedVersion) // 只有版本匹配才更新
    )
  )
  .returning();

if (result.length === 0) {
  throw new Error("Concurrent modification detected");
}
```

---

### 4. 幂等性设计

确保操作可以安全地重试：

```typescript
// ✅ 幂等的操作
await db
  .insert(payments)
  .values({
    id: uniquePaymentId, // 使用客户端生成的唯一 ID
    amount: 100,
  })
  .onConflictDoNothing(); // 如果已存在，不做任何操作
```

---

### 5. 接受最终一致性

对于非关键数据，可以接受短暂的不一致：

```typescript
// 示例：文章阅读量统计
// 即使并发时丢失几次计数，也不影响核心业务
await db
  .update(articles)
  .set({
    viewCount: sql`${articles.viewCount} + 1`,
  })
  .where(eq(articles.id, articleId));
```

---

## 决策树：选择合适的连接方式

```
需要部署到 Cloudflare Workers？
├─ 是 → 需要事务支持？
│   ├─ 是 → 使用 WebSocket 连接（drizzle-orm/neon-serverless）
│   └─ 否 → 使用 HTTP 连接（drizzle-orm/neon-http）✅ 当前方案
│
└─ 否（传统 Node.js 服务器）
    └─ 使用 TCP 连接（drizzle-orm/node-postgres）
```

---

## 实际案例：配额限制中间件

### 当前实现（无事务）

```typescript
// ✅ 当前方案：使用 UPSERT + SQL 表达式
const currentCount = await db
  .select()
  .from(userStats)
  .where(eq(userStats.userId, userId));

if (currentCount >= limit) {
  throw new Error("Quota exceeded");
}

// 原子递增
await db
  .insert(userStats)
  .values({ userId, count: 1 })
  .onConflictDoUpdate({
    target: [userStats.userId],
    set: {
      count: sql`${userStats.count} + 1`, // 基于数据库最新值
    },
  });
```

#### 并发安全性分析

- ⚠️ **查询和更新之间有时间窗口**：极端并发下可能多计数 1-2 次
- ✅ **UPSERT 操作本身是原子的**：不会出现数据损坏
- ✅ **对业务影响有限**：即使多计数，影响范围可控

---

### 如果使用事务（理想方案）

```typescript
// ✅ 使用 WebSocket 连接后可以这样写
await db.transaction(async (tx) => {
  const current = await tx
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .for("update"); // 行锁

  if (current.count >= limit) {
    throw new Error("Quota exceeded"); // 自动回滚
  }

  await tx
    .update(userStats)
    .set({ count: current.count + 1 })
    .where(eq(userStats.userId, userId));
});
```

#### 并发安全性分析

- ✅ **完全并发安全**：事务 + 行锁确保操作原子性
- ✅ **零超限风险**：不可能出现多计数
- ⚠️ **性能开销**：需要建立 WebSocket 连接

---

## 总结

### 当前项目的选择

我们使用 **HTTP 连接（neon-http）** 是因为：

1. ✅ 兼容 Cloudflare Workers
2. ✅ 冷启动快，适合 Serverless
3. ✅ 无需管理连接池
4. ⚠️ 不支持事务，但通过 UPSERT + SQL 表达式可以满足大部分需求

### 何时需要切换到 WebSocket 连接

如果出现以下情况，建议切换到 WebSocket 连接：

- ✅ 需要严格的并发控制
- ✅ 需要跨表的原子操作
- ✅ 需要回滚多个操作
- ✅ 业务逻辑复杂，难以用 UPSERT 实现

### 切换成本

- 代码修改：约 10 行代码
- 性能影响：冷启动增加 50-100ms
- 兼容性：仍然兼容 Cloudflare Workers

---

## 参考资源

- [Neon Serverless Driver 文档](https://neon.tech/docs/serverless/serverless-driver)
- [Drizzle ORM 事务文档](https://orm.drizzle.team/docs/transactions)
- [Cloudflare Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)

---

**文档版本**：v1.0  
**最后更新**：2025-11-08  
**适用项目**：Vocab Master API
