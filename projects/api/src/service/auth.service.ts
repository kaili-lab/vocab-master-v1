import type { AuthVariables } from "../types/variables";
import type { DB } from "../db/db";
import { users, subscriptions } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * 完成用户注册的数据类型
 */
export type CompleteRegistrationData = {
  name: string;
  email?: string;
  password?: string;
};

/**
 * 完成注册的返回类型
 */
export type CompleteRegistrationResult = {
  success: true;
  message: string;
};

/**
 * 验证手机号验证前的用户检查错误类型
 */
export class PhoneVerificationError extends Error {
  constructor(
    message: string,
    public code: "USER_NOT_FOUND" | "INCOMPLETE_USER",
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "PhoneVerificationError";
  }
}

/**
 * 为新用户创建免费订阅
 * 在用户注册时自动创建 free 订阅记录，确保所有用户都有订阅等级
 *
 * @param db - 数据库实例
 * @param userId - 用户ID
 */
export async function createFreeSubscription(
  db: DB,
  userId: number
): Promise<void> {
  try {
    // 先检查用户是否已有订阅
    const [existing] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    // 已有订阅则跳过
    if (existing) {
      return;
    }

    // 创建免费订阅
    await db.insert(subscriptions).values({
      userId,
      tier: "free",
      status: "active",
      startedAt: new Date(),
      expiresAt: null,
    });

    console.log(
      `✅ [createFreeSubscription] Created free subscription for user ${userId}`
    );
  } catch (error) {
    // 记录错误但不抛出，避免阻断注册流程
    console.error(
      `❌ [createFreeSubscription] Failed for user ${userId}:`,
      error
    );
  }
}

/**
 * 验证手机号验证前的用户检查（仅用于登录场景）
 * 检查用户是否已注册
 *
 * 工作原理：
 * - 前端登录页面调用 phoneNumber.verify 时，不传 name 字段
 * - 后端根据是否有 name 字段判断场景：
 *   - 无 name → 登录场景，调用此函数检查用户是否存在
 *   - 有 name → 注册场景，跳过此检查，让 signUpOnVerification 自动创建用户
 *
 * 逻辑：
 * - 如果用户不存在 → 拒绝，提示去注册
 * - 如果用户存在 → 通过验证，允许登录
 *
 * @param db - 数据库实例
 * @param phoneNumber - 手机号
 * @throws {PhoneVerificationError} 当用户不存在时抛出错误
 */
export async function validatePhoneVerification(
  db: DB,
  phoneNumber: string
): Promise<void> {
  // 查询用户是否存在
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneNumber, phoneNumber))
    .limit(1);

  // 登录场景下，用户不存在则拒绝
  if (!existingUser) {
    throw new PhoneVerificationError(
      "该手机号未注册，请先注册",
      "USER_NOT_FOUND",
      400
    );
  }
}

/**
 * 完成用户注册（仅用于手机号注册）
 * 更新用户名和邮箱
 *
 * @param auth - Better Auth 实例
 * @param db - 数据库实例
 * @param headers - 请求头
 * @param data - 更新数据
 * @throws {Error} 未登录时抛出错误
 */
export async function completeRegistration(
  auth: AuthVariables["auth"],
  _db: DB, // 参数保留以保持 API 一致性，使用下划线前缀标记为故意未使用
  headers: Headers,
  data: CompleteRegistrationData
): Promise<CompleteRegistrationResult> {
  // 获取当前登录的用户
  const session = await auth.api.getSession({
    headers,
  });
  console.log("completeRegistration 被调用了");

  if (!session?.user) {
    throw new Error("未登录");
  }

  // better auth的设计：accounts 表：存储认证凭据，users 表：存储用户基本信息
  // 所以手机号登录之后，需要分别更新这两个表
  // 这部分功能，better auth没提供事务，只能先更新accounts 表，再更新 users 表

  // 为用户设置密码（使用 Better Auth API）只更新 accounts 表
  // 只有在提供了密码时才设置密码（手机号注册时可能不需要密码）
  // 这里注释掉，因为手机号注册时，不需要设置密码，如果后期需要设置密码，再打开
  // if (data.password) {
  //   await auth.api.setPassword({
  //     headers,
  //     body: {
  //       newPassword: data.password,
  //     },
  //   });
  // }

  // 更新用户名和邮箱（使用 Better Auth API） 只更新 users 表
  await auth.api.updateUser({
    headers,
    body: {
      name: data.name, // 更新用户名
      ...(data.email && { email: data.email }), // 可选：更新邮箱
    },
  });

  return {
    success: true,
    message: "注册完成",
  };
}
