/**
 * API 辅助函数
 *
 * 提供类型安全的 Hono RPC API 调用辅助工具
 *
 * 最佳实践：
 * 1. 后端导出响应类型（如 ReviewStatsResponse）
 * 2. 前端使用 extractApiData 自动提取 data 字段
 * 3. TypeScript 完全推断类型，无需手动断言
 */

/**
 * API 成功响应类型
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * API 错误响应类型
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
}

/**
 * API 响应联合类型
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 类型守卫：检查是否为成功响应
 *
 * @param result - API 响应结果
 * @returns 是否为成功响应
 */
export function isSuccessResponse<T>(
  result: unknown
): result is ApiSuccessResponse<T> {
  return (
    result !== null &&
    typeof result === "object" &&
    "success" in result &&
    result.success === true &&
    "data" in result
  );
}

/**
 * 类型安全地提取 API 响应数据
 *
 * 用法：
 * ```typescript
 * type MyResponse = { success: true; data: { id: number; name: string } };
 * const data = await extractApiData<MyResponse>(apiClient.api.xxx.$get());
 * // data 的类型是 { id: number; name: string }
 * ```
 *
 * @param responsePromise - Hono RPC 响应 Promise
 * @returns 提取的数据（data 字段）
 * @throws 请求失败或响应格式错误时抛出错误
 */
export async function extractApiData<
  T extends { success: true; data: unknown }
>(responsePromise: Promise<Response>): Promise<T["data"]> {
  const response = await responsePromise;

  // 检查 HTTP 状态码
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error((error as ApiErrorResponse).error || "请求失败");
  }

  // 解析 JSON
  const result = await response.json();

  // 检查响应格式
  if (isSuccessResponse(result)) {
    return result.data as T["data"];
  }

  // 响应格式错误
  throw new Error((result as ApiErrorResponse).error || "响应格式错误");
}

/**
 * 处理 API 错误的辅助函数
 *
 * @param error - 捕获的错误
 * @param defaultMessage - 默认错误消息
 * @returns 用户友好的错误消息
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = "操作失败，请重试"
): string {
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}
