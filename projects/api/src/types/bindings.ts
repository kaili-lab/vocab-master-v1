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

  // Resend 邮件服务
  RESEND_API_KEY: string;

  // Stripe 支付配置
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string; // 月付 Price ID
  STRIPE_PRICE_YEARLY: string; // 年付 Price ID

  // 前端地址（用于支付回调）
  FRONTEND_URL?: string;

  // 服务器配置（可选）
  PORT?: string;
  NODE_ENV?: string;
};
