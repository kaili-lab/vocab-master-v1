import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
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
  });

// 🎯 导出类型 - 这是 Hono RPC 的关键！
export type UserRouteType = typeof userRoute;
