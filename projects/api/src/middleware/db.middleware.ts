import { createMiddleware } from "hono/factory";
import { createDb } from "../db/db";
import { type Bindings } from "../types/bindings";
import type { DbVariables } from "../types/variables";

/**
 * 数据库中间件 - 依赖注入模式
 *
 * 📌 设计目的：
 * 使用依赖注入模式统一管理数据库实例，避免全局变量和 hack 方法。
 *
 * 🔧 工作原理：
 * 1. 从 Cloudflare Workers 环境变量读取 DATABASE_URL
 * 2. 创建 Neon Serverless 数据库实例（HTTP 连接）
 * 3. 将实例注入到 Hono Context 中
 * 4. 路由通过 c.get('db') 获取实例
 *
 * ✨ 优势：
 * - 类型安全：TypeScript 完整支持
 * - 统一模式：与 authMiddleware 一致
 * - 易于测试：可以 mock Context
 * - 环境兼容：Cloudflare Workers 和 Node.js 都支持
 *
 * 💡 性能说明：
 * Neon Serverless Driver 使用 HTTP 连接而非 TCP，每次创建实例的成本很低。
 * 这种设计在 Serverless 环境中是最佳实践。
 *
 * @example
 * 在入口文件使用
 * app.use("*", dbMiddleware);
 *
 * 在路由中使用
 * export const userRoute = new Hono<{ Variables: DbVariables }>()
 *   .get("/", async (c) => {
 *     const db = c.get("db");
 *     return c.json(await db.select().from(users));
 *   });
 */
export const dbMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: DbVariables;
}>(async (c, next) => {
  c.set("db", createDb(c.env.DATABASE_URL));
  await next();
});
