/**
 * 路由层工具函数
 *
 * 提供路由处理中常用的辅助函数：
 * - 用户 ID 转换
 * - 错误响应格式化
 * - 认证检查
 */

import type { Context } from "hono";

/**
 * Session 类型（简化定义）
 * 实际类型由 Better Auth 提供
 */
interface Session {
  user: {
    id: string | number;
    // 对于不确定类型的值，使用 unknown 而非 any
    [key: string]: unknown;
  };
}

/**
 * 从 session 中提取用户 ID 并转换为 number
 *
 * 背景：Better Auth 的 user.id 可能是 string 或 number
 * 我们的数据库使用 number 类型，所以需要统一转换
 *
 * @param session - 用户会话对象
 * @returns 用户 ID（number 类型）
 *
 * @example
 * const session = c.get("session")!;
 * const userId = getUserId(session);  // number
 */
export function getUserId(session: Session): number {
  return typeof session.user.id === "string"
    ? parseInt(session.user.id, 10)
    : session.user.id;
}

/**
 * 格式化成功响应
 *
 * 统一的成功响应格式：{ success: true, data: {...} }
 *
 * @param data - 响应数据
 * @returns 格式化的响应对象
 */
export function successResponse<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

/**
 * 格式化错误响应
 *
 * 统一的错误响应格式：{ success: false, error: "..." }
 *
 * @param message - 错误消息
 * @returns 格式化的错误对象
 */
export function errorResponse(message: string) {
  return {
    success: false as const,
    error: message,
  };
}

/**
 * 处理服务层错误
 *
 * 根据错误类型返回适当的 HTTP 状态码和错误消息
 *
 * @param c - Hono Context
 * @param error - 错误对象
 * @param defaultMessage - 默认错误消息
 * @returns HTTP 响应
 */
export function handleServiceError(
  c: Context,
  error: unknown,
  defaultMessage: string = "操作失败，请稍后重试"
) {
  console.error("Service error:", error);

  if (error instanceof Error) {
    // 特定错误类型的处理
    if (error.message.includes("Google NLP API")) {
      return c.json(errorResponse("调用 Google NLP 服务失败，请稍后重试"), 503);
    }
    if (error.message.includes("AI") || error.message.includes("OpenAI")) {
      return c.json(errorResponse("AI 服务暂时不可用，请稍后重试"), 503);
    }

    // 返回具体错误消息
    return c.json(errorResponse(error.message), 500);
  }

  // 未知错误，返回默认消息
  return c.json(errorResponse(defaultMessage), 500);
}
