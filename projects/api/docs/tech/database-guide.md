# 数据库技术规范

> **受众**: AI (Cursor/Claude)  
> **用途**: 数据库记忆库，连接方式、事务处理、最佳实践

---

## 核心决策

### 连接方式：Neon HTTP Driver

| 特性 | Neon HTTP | Neon WebSocket | 传统 TCP |
|------|-----------|----------------|----------|
| **协议** | HTTP | WebSocket | TCP |
| **Cloudflare Workers** | ✅ | ✅ | ❌ |
| **事务支持** | ❌ | ✅ | ✅ |
| **连接开销** | 极低（~1ms） | 低 | 需要连接池 |
| **当前使用** | ✅ | - | - |

**选择原因**：
1. Cloudflare Workers 不支持 TCP
2. HTTP 连接成本极低，每请求创建无性能问题
3. 项目业务逻辑简单，不需要事务

---

## 为什么不支持事务

### HTTP 协议限制

```
HTTP Driver 工作流程：
每个 SQL = 一个独立的 HTTP POST 请求

await db.select()   → HTTP POST → Neon → PostgreSQL → 响应
await db.insert()   → HTTP POST → Neon → PostgreSQL → 响应

⚠️ 无法维持连接状态，无法执行 BEGIN...COMMIT
```

### 错误示例

```typescript
// ❌ 会抛出错误
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: "Alice" });
  await tx.insert(orders).values({ userId: 1 });
});

// Error: No transactions support in neon-http driver
```

---

## 如何启用事务支持

### 方案 1：切换到 WebSocket Driver

```typescript
// db/db.ts
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// Cloudflare Workers
neonConfig.webSocketConstructor = WebSocket;

// Node.js (需要 ws 包)
neonConfig.webSocketConstructor = ws;

export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

// ✅ 现在支持事务
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: "Alice" });
  await tx.insert(orders).values({ userId: 1 });
});
```

**代价**：
- WebSocket 连接开销更高（~10-50ms）
- 需要管理连接池

### 方案 2：迁移到 Node.js + TCP

```typescript
// Node.js 环境
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });
```

---

## 无事务环境下的最佳实践

### 1. 幂等操作

使用 `onConflictDoUpdate` 确保重复执行安全：

```typescript
await db.insert(users)
  .values({ id: 1, name: "Alice" })
  .onConflictDoUpdate({
    target: users.id,
    set: { name: "Alice" },
  });
```

### 2. 原子更新

使用 SQL 表达式避免读-改-写竞态：

```typescript
// ✅ 正确：原子递增
await db.update(userStats)
  .set({ 
    count: sql`${userStats.count} + 1`
  })
  .where(eq(userStats.userId, userId));

// ❌ 错误：读-改-写（竞态条件）
const stat = await db.select().from(userStats);
await db.update(userStats).set({ count: stat.count + 1 });
```

### 3. 乐观锁

使用版本号防止并发更新冲突：

```typescript
const [updated] = await db.update(documents)
  .set({ 
    content: newContent,
    version: sql`${documents.version} + 1`
  })
  .where(and(
    eq(documents.id, docId),
    eq(documents.version, currentVersion)  // 版本检查
  ))
  .returning();

if (!updated) {
  throw new Error("文档已被其他用户修改");
}
```

### 4. 错误处理

```typescript
try {
  await db.insert(users).values(userData);
} catch (error) {
  // 处理唯一约束冲突
  if (error.code === "23505") {  // unique_violation
    throw new Error("用户已存在");
  }
  throw error;
}
```

---

## 配置方式

### Cloudflare Workers (当前)

```typescript
// db/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
```

### Node.js + HTTP (可迁移)

```typescript
// 使用 fetch 包装
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl, {
    fetch: fetch,  // Node.js 18+ 自带 fetch
  });
  return drizzle(sql, { schema });
}
```

---

## Drizzle 配置

### drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".dev.vars" });  // Cloudflare 环境变量文件

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",  // Drizzle Kit 使用 PostgreSQL driver
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**注意**：Drizzle Kit 在 Node.js 环境运行，需要安装 `dotenv`

---

## 常见操作模式

### UPSERT 模式

```typescript
// 插入或更新
await db.insert(quotaConfigs)
  .values(config)
  .onConflictDoUpdate({
    target: quotaConfigs.tier,
    set: {
      dailyArticlesLimit: config.dailyArticlesLimit,
      updatedAt: new Date(),
    },
  });
```

### 批量插入

```typescript
// 一次性插入多条
await db.insert(userLearnedMeanings)
  .values([
    { userId: 1, word: "apple" },
    { userId: 1, word: "banana" },
  ]);
```

### 条件更新

```typescript
// 只更新满足条件的记录
const [updated] = await db.update(subscriptions)
  .set({ status: "cancelled" })
  .where(and(
    eq(subscriptions.userId, userId),
    eq(subscriptions.status, "active")
  ))
  .returning();
```

---

## 迁移工作流

### 1. 修改 Schema

```typescript
// db/schema.ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  // 新增字段
  phoneNumber: varchar("phone_number", { length: 20 }),
});
```

### 2. 生成迁移

```bash
cd projects/api
npx drizzle-kit generate:pg
```

### 3. 应用迁移

```bash
npx drizzle-kit push:pg
```

---

## 环境变量

```bash
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

---

## 关键文件

- `src/db/db.ts` - 数据库实例工厂
- `src/db/schema.ts` - 表结构定义
- `drizzle.config.ts` - Drizzle Kit 配置
- `src/middleware/db.middleware.ts` - 数据库中间件

---

## 决策树：何时需要事务

```
业务是否需要多步原子操作？
  │
  ├─ 否 → 使用 HTTP Driver ✅ (当前方案)
  │       - 简单 CRUD
  │       - 单条记录操作
  │       - 幂等操作
  │
  └─ 是 → 需要事务支持
          │
          ├─ Cloudflare Workers → WebSocket Driver
          │   - 添加 WebSocket 配置
          │   - 接受连接开销
          │
          └─ 可迁移到 Node.js → TCP Driver
              - 传统 PostgreSQL 连接
              - 完整事务支持
```

---

## 项目当前状态

✅ **使用 HTTP Driver**  
✅ **无事务需求**  
✅ **业务逻辑简单**  
✅ **性能优异**  

**结论**：当前方案适合项目需求，无需切换。

