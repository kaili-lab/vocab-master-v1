// Cloudflare Workers 入口文件
// 使用 Web 标准 API，便于将来切换到其他环境

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { userRoute } from "./route/user.route";
import { authRoute } from "./route/auth.route";
import { type Bindings } from "./types/bindings";
import { authMiddleware } from "./middleware/auth.middleware";
import { dbMiddleware } from "./middleware/db.middleware";
import { requireAuth } from "./middleware/require-auth.middleware";
import type { AppVariables } from "./types/variables";
import { textRoute } from "./route/text.route";
import { reviewRoute } from "./route/review.route";
import { userKnownWordsRoute } from "./route/user-known-words.route";
import { userLearningWordsRoute } from "./route/user-learned-meanings.route";
import { paymentRoute } from "./route/payment.route";

// 创建 Hono 应用实例
const app = new Hono<{
  Bindings: Bindings;
  Variables: AppVariables;
}>();

// ==================== 全局中间件 ====================
app.use("*", logger());
const getFrontendUrl = (env: Bindings) => {
  if (!env.FRONTEND_URL) {
    throw new Error("Missing FRONTEND_URL in projects/api/.dev.vars");
  }
  return env.FRONTEND_URL;
};

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const frontendUrl = getFrontendUrl(c.env);
      if (!origin) return frontendUrl;
      return origin === frontendUrl ? origin : undefined;
    },
    credentials: true, // 支持 cookies
  }),
);

// 应用数据库中间件（设置 DATABASE_URL）
app.use("*", dbMiddleware);

// 应用 Better Auth 中间件（注入 auth 实例到 Context）
app.use("*", authMiddleware);

// 应用认证中间件（智能白名单 + Session 注入）
app.use("/api/*", requireAuth);

// ==================== 业务路由 ====================
// 定义 API 路由
// apiRoutes 仅用于类型导出，供前端 Hono RPC 使用
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const apiRoutes = app
  .basePath("/api")
  .route("/users", userRoute)
  .route("/auth", authRoute)
  .route("/text", textRoute)
  .route("/review", reviewRoute)
  .route("/known-words", userKnownWordsRoute)
  .route("/learning-words", userLearningWordsRoute)
  .route("/payment", paymentRoute);

// 🎯 导出完整的 API 类型 - 供前端 Hono RPC 使用
export type ApiRoutes = typeof apiRoutes;

// ==================== Cloudflare Workers 导出，两种方案 ====================
// 方案1：显式包装 - 创建新对象，将 fetch 作为属性
export default {
  fetch: app.fetch,
};
// 方案2：直接导出app，因为Honojs的实例中也有fetch属性；
// export default app;
