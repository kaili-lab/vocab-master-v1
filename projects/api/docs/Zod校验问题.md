# Zod 校验方案技术决策

> **📘 文档类型**：技术决策  
> **🎯 适合读者**：后端开发者  
> **⏱️ 预计阅读**：5 分钟  
> **📅 最后更新**：2025-01-15  
> **🔗 相关文档**：[Drizzle 架构设计.md](./Drizzle架构设计.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

> **✅ 实施状态更新（2025-01-15）**
>
> - ✅ 本文档建议已被**完全采纳**
> - ✅ 项目已迁移到 `@hono/zod-validator` + 手动 Schema 方案
> - ✅ 所有路由均使用 `zValidator` 进行验证（19+ 处使用）
> - ⚠️ 可选清理：移除未使用的 `drizzle-zod` 依赖

---

## 问题 1：版本兼容性

`drizzle-zod@0.8.3` 最高支持到 `drizzle-orm@0.38.x`，与 `0.44.7` 不兼容。目前有两个选择：

**选项 A：降级 drizzle-orm**

```bash
npm install drizzle-orm@0.38.0
```

**选项 B：暂时不使用 drizzle-zod**（推荐）

- 直接删除或注释掉所有 `createInsertSchema` 和 `createSelectSchema` 的使用
- 等待 `drizzle-zod` 发布兼容新版本的更新

## 问题 2：是否需要 Zod Schema 验证？

在你的架构（Hono API + Cloudflare Workers）中，**需要但不一定用 drizzle-zod**：

### ✅ 为什么需要验证

```typescript
// 前端发送的数据
POST /api/users
{
  "name": "hacker'; DROP TABLE users;--",  // SQL 注入？
  "email": "not-an-email",                 // 格式错误
  "vocabularyLevel": 999                   // 无效值
}
```

即使前端做了验证，**后端必须再次验证**，因为：

1. **安全性**：前端验证可被绕过（用 Postman/curl 直接调用 API）
2. **数据完整性**：确保存入数据库的数据符合业务规则
3. **类型安全**：TypeScript 类型在运行时不存在，需要运行时验证

### 📋 你的选择

**方案 1：使用 Hono 内置的 Zod 验证器（推荐）**

```bash
npm install zod @hono/zod-validator
```

```typescript
import { zod } from "@hono/zod-validator";
import { z } from "zod";

// 手动定义 Zod Schema（而不是用 drizzle-zod 自动生成）
const insertUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  vocabularyLevel: z
    .enum(["middle_school", "high_school", "cet4", "cet6"])
    .optional(),
});

// 在路由中使用
app.post("/users", zod("json", insertUserSchema), async (c) => {
  const data = c.req.valid("json"); // 已验证的数据
  const db = createDb(c.env.DATABASE_URL);
  const result = await db.insert(users).values(data);
  return c.json(result);
});
```

### 🎯 我的建议

1. **删除所有 drizzle-zod 相关代码**（因为版本不兼容）
2. **安装 Hono 的 Zod 验证器**
3. **手动编写 Zod Schema**（更灵活，可以添加业务规则）

```typescript
// schema.ts - 删除这些行
// export const insertUserSchema = createInsertSchema(users);
// export const selectUserSchema = createSelectSchema(users);

// 新建 validation.ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  // 只包含前端可以提交的字段，不包含自动生成的字段
});
```
