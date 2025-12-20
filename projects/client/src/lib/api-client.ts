/**
 * API Client 配置
 * 包含 Hono RPC Client 和 Better Auth Client
 */

import { hc } from "hono/client";
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";
import type { ApiRoutes } from "shared";

// 本地省略配置文件，如果部署到vercel或者cloudflare上，需要在Settings中添加 VITE_API_URL，并re-deploy
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ==================== Hono RPC 客户端 ====================
// 用于类型安全的业务 API 调用
export const apiClient = hc<ApiRoutes>(BASE_URL, {
  init: {
    credentials: "include", // 自动发送 cookies（用于 Better Auth 会话）
  },
});

// ==================== Better Auth 客户端 ====================
// 用于用户认证（注册、登录、登出等）
export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    phoneNumberClient(), // 🆕 添加手机号插件
  ],
});

// 导出常用的 hooks 和方法
export const { useSession, signIn, signUp, signOut } = authClient;

// 扩展 User 类型，为了在dashboard中获取 vocabularyLevel 值去判断是否可以访问dashboard
export type ExtendedUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  status?: string;
  locale?: "zh-CN" | "en-US";
  vocabularyLevel?:
    | "primary_school"
    | "middle_school"
    | "high_school"
    | "cet4"
    | "cet6"
    | "ielts_toefl"
    | "gre"
    | null;
  onboardingCompleted?: boolean;
  lastLoginAt?: Date | null;
};

/**
 * Better Auth 使用示例：
 *
 * 1. 注册：
 *    const { data, error } = await signUp.email({
 *      email: "user@example.com",
 *      password: "password123",
 *      name: "User Name"
 *    })
 *
 * 2. 登录：
 *    const { data, error } = await signIn.email({
 *      email: "user@example.com",
 *      password: "password123"
 *    })
 *
 * 3. 登出：
 *    await signOut()
 *
 * 4. 获取会话（在组件中使用）：
 *    const { data: session, isPending } = useSession()
 */
