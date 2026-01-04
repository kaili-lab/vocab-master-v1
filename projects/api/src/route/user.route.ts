import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  users,
  subscriptions,
  quotaConfigs,
  userLearningStats,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { type Bindings } from "../types/bindings";
import type { AuthenticatedVariables } from "../types/variables";
import { ensureAuthenticated } from "../utils/session";

/**
 * User 路由
 * 注意：注册和登录由 Better Auth 自动提供在 /api/auth/** 路径下
 */

// 定义更新用户信息的验证 schema
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/)
    .optional()
    .or(z.literal("")),
  locale: z.enum(["zh-CN", "en-US"]).optional(),
  vocabularyLevel: z
    .enum([
      "primary_school",
      "middle_school",
      "high_school",
      "cet4",
      "cet6",
      "ielts_toefl",
      "gre",
    ])
    .optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const userRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthenticatedVariables;
}>()
  // 获取当前用户信息
  .get("/me", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    return c.json({
      success: true,
      data: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.image,
        createdAt: session.user.createdAt,
      },
    });
  })
  // 更新用户信息
  .patch("/me", zValidator("json", updateUserSchema), async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    try {
      const updateData = c.req.valid("json");

      // 构建更新对象
      const updatePayload: {
        name?: string;
        avatarUrl?: string | null;
        phone?: string | null;
        locale?: "zh-CN" | "en-US";
        vocabularyLevel?:
          | "primary_school"
          | "middle_school"
          | "high_school"
          | "cet4"
          | "cet6"
          | "ielts_toefl"
          | "gre";
        onboardingCompleted?: boolean;
        updatedAt?: Date;
      } = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) {
        updatePayload.name = updateData.name;
      }
      if (updateData.avatarUrl !== undefined) {
        updatePayload.avatarUrl = updateData.avatarUrl || null;
      }
      if (updateData.phone !== undefined) {
        updatePayload.phone = updateData.phone || null;
      }
      if (updateData.locale !== undefined) {
        updatePayload.locale = updateData.locale;
      }
      if (updateData.vocabularyLevel !== undefined) {
        updatePayload.vocabularyLevel = updateData.vocabularyLevel;
      }

      // 如果没有需要更新的字段（除了 updatedAt），返回错误
      const fieldsToUpdate = Object.keys(updatePayload).filter(
        (key) => key !== "updatedAt"
      );
      if (fieldsToUpdate.length === 0) {
        return c.json(
          {
            success: false,
            error: "No fields to update",
          },
          400
        );
      }

      // Better Auth 的 user.id 可能是 string，需要转换为 number
      const userId =
        typeof session.user.id === "string"
          ? parseInt(session.user.id, 10)
          : session.user.id;

      // 从 Context 获取 db 实例（由中间件注入）
      const db = c.get("db");

      // 更新数据库
      const [updatedUser] = await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return c.json(
          {
            success: false,
            error: "User not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatarUrl: updatedUser.avatarUrl,
          phoneNumber: updatedUser.phoneNumber,
          phoneNumberVerified: updatedUser.phoneNumberVerified,
          status: updatedUser.status,
          lastLoginAt: updatedUser.lastLoginAt,
          locale: updatedUser.locale,
          vocabularyLevel: updatedUser.vocabularyLevel,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        message: "User updated successfully",
      });
    } catch (error) {
      console.error("Update user error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to update user",
        },
        500
      );
    }
  })
  // 获取用户配额信息
  .get("/me/quota", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId =
      typeof session.user.id === "string"
        ? parseInt(session.user.id, 10)
        : session.user.id;

    try {
      const db = c.get("db");

      // 1. 查询用户的订阅等级
      const activeSubscription = await db
        .select({
          tier: subscriptions.tier,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);

      const tier = (activeSubscription[0]?.tier || "free") as
        | "free"
        | "premium";

      // 2. 查询配额配置
      const quotaConfigResult = await db
        .select({
          dailyLimit: quotaConfigs.dailyArticlesLimit,
          maxWords: quotaConfigs.maxArticleWords,
        })
        .from(quotaConfigs)
        .where(eq(quotaConfigs.tier, tier))
        .limit(1);

      const quotaConfig = quotaConfigResult?.[0];

      if (!quotaConfig) {
        return c.json(
          {
            success: false,
            error: "Quota configuration not found",
          },
          500
        );
      }

      // 3. 查询今日已使用次数
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statsResult = await db
        .select({
          articlesAnalyzedCount: userLearningStats.articlesAnalyzedCount,
        })
        .from(userLearningStats)
        .where(
          and(
            eq(userLearningStats.userId, userId),
            eq(userLearningStats.date, today)
          )
        )
        .limit(1);

      const usedToday = statsResult?.[0]?.articlesAnalyzedCount || 0;
      const remainingToday = quotaConfig.dailyLimit - usedToday;

      // 4. 返回配额信息
      return c.json({
        success: true,
        data: {
          tier,
          dailyLimit: quotaConfig.dailyLimit,
          usedToday,
          remainingToday: Math.max(0, remainingToday),
          maxArticleWords: quotaConfig.maxWords,
        },
      });
    } catch (error) {
      console.error("Get quota error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get quota information",
        },
        500
      );
    }
  })
  // 获取用户订阅信息
  .get("/me/subscription", async (c) => {
    const authError = ensureAuthenticated(c);
    if (authError) return authError;

    const session = c.get("session")!;
    const userId =
      typeof session.user.id === "string"
        ? parseInt(session.user.id, 10)
        : session.user.id;

    try {
      const db = c.get("db");

      // 查询用户的订阅信息（包括已取消和过期的）
      const subscriptionResult = await db
        .select({
          tier: subscriptions.tier,
          status: subscriptions.status,
          startedAt: subscriptions.startedAt,
          expiresAt: subscriptions.expiresAt,
          paymentProvider: subscriptions.paymentProvider,
          paymentId: subscriptions.paymentId,
          amount: subscriptions.amount,
          currency: subscriptions.currency,
        })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(subscriptions.createdAt)
        .limit(1);

      // 如果没有订阅记录，返回免费版
      if (subscriptionResult.length === 0) {
        return c.json({
          success: true,
          data: {
            tier: "free",
            status: "active",
            startedAt: null,
            expiresAt: null,
            paymentProvider: null,
            paymentId: null,
            amount: null,
            currency: null,
          },
        });
      }

      const subscription = subscriptionResult[0];

      return c.json({
        success: true,
        data: {
          tier: subscription.tier,
          status: subscription.status,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
          paymentProvider: subscription.paymentProvider,
          paymentId: subscription.paymentId,
          amount: subscription.amount,
          currency: subscription.currency,
        },
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to get subscription information",
        },
        500
      );
    }
  });

// 🎯 导出类型 - 这是 Hono RPC 的关键！
export type UserRouteType = typeof userRoute;
