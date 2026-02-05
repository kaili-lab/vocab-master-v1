import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins"; // 🆕 导入手机号插件
import { createDb } from "../db/db";
import * as schema from "../db/schema";
import { type Bindings } from "../types/bindings";
import { getEnv } from "../utils/env";
import { createFreeSubscription } from "../service/auth.service"; // 🆕 导入订阅初始化函数
import { EmailService } from "../service/email.service"; // 🆕 导入邮件服务

/**
 * 创建 Better Auth 实例
 *
 * 使用 Cloudflare Workers 环境变量
 * 在 authMiddleware 中为每个请求创建一次
 *
 * @param env - Cloudflare Workers 环境变量对象
 * @returns Better Auth 实例
 */
export const createAuth = (env: Bindings) => {
  const config = getEnv(env);

  // 为 Better Auth 创建专用的 db 实例
  const db = createDb(config.DATABASE_URL);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      // 因为better auth的表名称，和我们定义的表名不一致，所以需要进行映射
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
      usePlural: false,
    }),

    // 目的是使用自增id，但是它对插件不起作用，所以暂时注释掉
    // generateId: () => undefined as any,
    // 这种方式配置，可以确保自增id对所有表生效
    advanced: {
      database: {
        useNumberId: true, // 🎯 关键配置：使用数字自增 ID
      },
    },

    // 基础配置
    appName: "Vocab Master",
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,

    // 🆕 信任的前端源（允许跨域请求和邮件验证回调）
    trustedOrigins: config.FRONTEND_URL ? [config.FRONTEND_URL] : [],

    // 🔑 字段映射：将数据库字段映射到 better-auth 的标准字段
    user: {
      fields: {
        // better-auth 默认使用 image 字段，映射到我们的 avatarUrl
        image: "avatarUrl",
      },
      // 用于声明 Better Auth 默认 user 表之外的自定义业务字段
      // 让框架知道数据库中有这些额外字段，在读写用户数据时能正确处理
      // 配置后，TypeScript 会知道 user.status、user.locale 等字段的类型
      // 自动处理默认值
      additionalFields: {
        phoneNumber: {
          type: "string",
          required: false, // false表示创建时是可选的，true表示必填
        },
        phoneNumberVerified: {
          type: "boolean",
          required: false,
          defaultValue: false,
        },
        status: {
          type: "string",
          required: true,
          defaultValue: "active",
        },
        locale: {
          type: "string",
          required: true,
          defaultValue: "zh-CN",
        },
        vocabularyLevel: {
          type: "string",
          required: false, // 🔧 修正：词汇等级是可选字段，用户注册时可以为空
        },
        lastLoginAt: {
          type: "date",
          required: false,
        },
      },
    },

    // 🔐 认证方式配置
    // 启用后自动提供的 API：
    // POST /api/auth/signup - 注册（邮箱+密码）
    // POST /api/auth/signin/email - 登录
    // POST /api/auth/forget-password - 忘记密码（触发发送邮件）
    // POST /api/auth/reset-password - 重置密码
    emailAndPassword: {
      enabled: true, // 启用邮箱密码登录
      requireEmailVerification: true, // 要求邮箱验证（注册后需验证才能登录）
      minPasswordLength: 6,
      maxPasswordLength: 20,

      // 发送重置密码邮件的钩子
      sendResetPassword: async ({ user, url }) => {
        console.log(`🔐 [sendResetPassword] to ${user.email}: ${url}`);

        // 🆕 发送重置密码邮件
        const emailService = new EmailService(config.RESEND_API_KEY);
        const result = await emailService.sendPasswordResetEmail(
          user.email,
          user.name,
          url
        );
        if (result.success) {
          console.log(`✅ [sendResetPassword] 邮件发送成功`);
        } else {
          console.error(`❌ [sendResetPassword] 邮件发送失败: ${result.error}`);
          // 注意：不抛出错误，避免阻断重置密码流程
        }
      },
    },

    // 📧 邮箱验证配置（独立配置块），
    // requireEmailVerification: true 开启之后，在这里实现向用户发送验证链接
    emailVerification: {
      // 发送邮箱验证邮件钩子（邮箱注册时触发）
      sendVerificationEmail: async ({ user, url, token }) => {
        console.log(`📧 [sendVerificationEmail] 被调用！`);
        console.log(`   用户: ${user.email} (${user.name})`);
        console.log(`   验证链接: ${url}`);
        console.log(`   Token: ${token.substring(0, 20)}...`);

        // 为邮箱注册用户创建免费订阅（会自动检查是否已存在）
        try {
          await createFreeSubscription(db, Number(user.id));
        } catch (error) {
          console.error(
            `❌ [sendVerificationEmail] Failed to create subscription for user ${user.id}:`,
            error
          );
        }

        // 🆕 发送验证邮件
        const emailService = new EmailService(config.RESEND_API_KEY);
        const result = await emailService.sendVerificationEmail(
          user.email,
          user.name,
          url
        );
        if (result.success) {
          console.log(`✅ [sendVerificationEmail] 邮件发送成功`);
        } else {
          console.error(
            `❌ [sendVerificationEmail] 邮件发送失败: ${result.error}`
          );
          // 注意：不抛出错误，避免阻断注册流程
          // 即使邮件发送失败，用户仍然可以注册成功
        }
      },
      sendOnSignUp: true, // 🔑 关键配置：注册时自动发送验证邮件
      autoSignInAfterVerification: false, // 验证后需要手动登录
      expiresIn: 86400, // 验证链接有效期：24 小时（86400 秒）
    },

    // ⏱️ 会话配置
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 天
      updateAge: 60 * 60 * 24, // 每天更新一次
    },

    // 🆕 插件配置
    plugins: [
      phoneNumber({
        // 发送 OTP 验证码的函数
        sendOTP: async ({ phoneNumber, code }) => {
          // TODO: 实现发送短信验证码的逻辑
          // 可以使用阿里云短信、腾讯云短信等服务
          console.log(`📱 Send OTP to ${phoneNumber}: ${code}`);

          // 示例：调用短信服务 API
          // await sendSMS({
          //   phone: phoneNumber,
          //   template: 'verification_code',
          //   params: { code }
          // });
        },

        // OTP 验证码配置
        otpLength: 6, // 验证码长度,默认 6 位
        expiresIn: 300, // 验证码过期时间(秒),默认 5 分钟
        allowedAttempts: 3, // 允许尝试次数,默认 3 次

        // 🔄 正确的配置：signUpOnVerification
        // 允许手机号注册时自动创建用户（仅在注册场景下触发）
        signUpOnVerification: {
          // 🆕 返回 null：允许用户没有 email（数据库支持 email 为 null）
          // 注意：better-auth 类型定义要求返回 string，但实际运行时支持 null
          getTempEmail: () => {
            return null as unknown as string;
          },
          // 🆕 返回 null：用户名将在 complete-registration 时由用户填写
          // 注意：better-auth 类型定义要求返回 string，但实际运行时支持 null
          getTempName: () => {
            return null as unknown as string;
          },
        },

        // 手机号验证成功回调（手机号注册/登录时触发）
        callbackOnVerification: async ({ phoneNumber, user }) => {
          console.log(
            `✅ Phone number verified: ${phoneNumber} for user ${user.id}`
          );

          // 为手机号注册用户创建免费订阅（会自动检查是否已存在）
          try {
            await createFreeSubscription(db, Number(user.id));
          } catch (error) {
            console.error(
              `❌ [callbackOnVerification] Failed to create subscription for user ${user.id}:`,
              error
            );
          }
        },

        // 可选：自定义手机号验证规则
        phoneNumberValidator: (phoneNumber) => {
          // 简单的中国手机号验证
          const phoneRegex = /^\+86\d{11}$|^1[3-9]\d{9}$/;
          return phoneRegex.test(phoneNumber);
        },

        // 可选：要求手机号必须验证后才能登录
        requireVerification: true,
      }),
    ],
  });
};
