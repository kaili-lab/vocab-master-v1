import { type Bindings } from "../types/bindings";

/**
 * 环境变量抽象层
 *
 * 📌 设计目的：
 * 提供统一的环境变量访问接口，隔离 Cloudflare Workers 和 Node.js 的差异。
 * 这样业务代码不需要关心运行环境，便于将来切换或支持双环境。
 *
 * 🔧 当前实现：Cloudflare Workers 专用
 * - 环境变量来自 c.env（Cloudflare Workers 自动注入）
 * - 开发环境：.dev.vars 文件配置
 * - 生产环境：Cloudflare Dashboard 配置
 *
 * 💡 将来扩展：Node.js 支持
 * 如需支持 Node.js，只需取消注释下方代码即可。
 * 这样可以在不修改业务代码的情况下支持双环境。
 *
 * @param env - Cloudflare Workers 环境变量对象
 * @returns 统一的环境变量配置
 *
 * @example
 * // 在业务代码中使用
 * const config = getEnv(c.env);
 * const db = createDb(config.DATABASE_URL);
 */
export const getEnv = (env: Bindings): Bindings => {
  return env;

  // 💡 将来支持 Node.js 时，取消注释以下代码：
  //
  // if (env) {
  //   // Cloudflare Workers 模式
  //   return env;
  // }
  //
  // // Node.js 模式（从 process.env 读取）
  // return {
  //   DATABASE_URL: process.env.DATABASE_URL!,
  //   BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  //   BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  //   PORT: process.env.PORT,
  //   NODE_ENV: process.env.NODE_ENV,
  // };
};
