import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { type Bindings } from "../types/bindings";
import type { AppVariables } from "../types/variables";
import {
  completeRegistration,
  validatePhoneVerification,
  PhoneVerificationError,
} from "../service/auth.service";

/**
 * 扩展认证路由
 * 提供带手机号验证码的注册功能
 */

const updateProfileSchema = z.object({
  name: z.string().min(2).max(20),
  email: z.string().email().optional(),
  password: z.string().min(6).max(20).optional(),
});

export const authRoute = new Hono<{
  Bindings: Bindings;
  Variables: AppVariables;
}>()
  // 因为使用了phoneNumber插件，所以需要添加这个路由
  // 而这个url路径，是需要和phoneNumber插件的配置一致
  .post("/phone-number/send-otp", async (c) => {
    const auth = c.get("auth");

    // Better Auth 会自动处理（使用代理模式，将请求转发给 Better Auth）
    return auth.handler(c.req.raw);
  })
  // 这个路径也需要和phoneNumber插件的配置一致
  .post("/phone-number/verify", async (c) => {
    const auth = c.get("auth");
    const db = c.get("db");

    try {
      // 克隆请求以读取 body，而不消费原始请求
      const clonedRequest = c.req.raw.clone();
      const body = (await clonedRequest.json()) as {
        phoneNumber?: string;
        name?: string; // 🆕 添加 name 字段（注册场景下前端会传入）
      };
      const phoneNumber = body.phoneNumber;
      const name = body.name;

      // 🆕 根据 name 字段判断是注册还是登录
      // - 如果有 name → 注册场景，允许通过（让 signUpOnVerification 自动创建用户）
      // - 如果没有 name → 登录场景，检查用户是否存在
      if (phoneNumber && !name) {
        // 登录场景：验证用户是否存在
        try {
          await validatePhoneVerification(db, phoneNumber);
        } catch (error) {
          // 如果是我们自定义的验证错误，返回相应的错误响应
          if (error instanceof PhoneVerificationError) {
            return c.json(
              {
                message: error.message,
              },
              error.statusCode as 400 | 404 | 500
            );
          }
          // 其他错误继续抛出
          throw error;
        }
      }

      // 验证通过，继续调用 Better Auth handler
      return auth.handler(c.req.raw);
      // 因为该 catch 块不需要使用 error 变量，只是统一转发给 Better Auth handler，所以需要禁用 eslint 规则
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // 如果读取 body 失败，直接调用 Better Auth handler（让 Better Auth 自己处理）
      // 这可能是 Better Auth 的特殊请求格式
      return auth.handler(c.req.raw);
    }
  })
  // 完成注册：更新用户名和密码
  .patch(
    "/complete-registration",
    zValidator("json", updateProfileSchema),
    async (c) => {
      const auth = c.get("auth");
      const db = c.get("db"); // 🆕 获取数据库实例
      const body = c.req.valid("json");

      try {
        const result = await completeRegistration(
          auth,
          db, // 🆕 传递数据库实例
          c.req.raw.headers,
          body
        );
        return c.json(result);
      } catch (error) {
        // 根据错误类型返回不同的状态码
        if (error instanceof Error && error.message === "未登录") {
          return c.json({ error: error.message }, 401);
        }

        return c.json({ error: "更新失败" }, 500);
      }
    }
  ) // 🆕 添加通配符路由：处理所有其他 Better Auth 请求
  // 在client中调用useSession 时，它会自动请求 /api/auth/get-session
  // 需要添加一个通配符路由，将所有 Better Auth 的请求都代理给 auth.handler：
  // 比如/sign-out
  .all("*", async (c) => {
    const auth = c.get("auth");
    return auth.handler(c.req.raw);
  });

// 导出类型
export type AuthRouteType = typeof authRoute;
