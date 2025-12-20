/**
 * 环境变量类型定义
 * 支持 Cloudflare Workers 和 Node.js 两种环境
 */
export type Bindings = {
  // Better Auth 配置
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;

  // Google NLP API
  GOOGLE_NLP_API_KEY: string;

  AIHUBMIX_API_KEY: string;

  // 服务器配置（可选）
  PORT?: string;
  NODE_ENV?: string;
};
