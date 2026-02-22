/**
 * 支付路由模块
 *
 * 提供 Stripe 支付相关的 API：
 * 1. POST /create-checkout-session - 创建支付会话
 * 2. POST /webhook - 接收 Stripe webhook 事件
 * 3. POST /cancel-subscription - 取消订阅
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../types/bindings";
import type { AppVariables } from "../types/variables";
import { ensureAuthenticated } from "../utils/session";
import { getUserId, successResponse } from "../utils/route-helpers";
import {
  initStripe,
  createCheckoutSession,
  verifyWebhookSignature,
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  cancelSubscription,
} from "../service/stripe.service";

/**
 * 创建 Checkout Session 的请求 Schema
 */
const createCheckoutSchema = z.object({
  billingPeriod: z.enum(["monthly", "yearly"]),
});

/**
 * 取消订阅的请求 Schema
 */
const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
});

export const paymentRoute = new Hono<{
  Bindings: Bindings;
  Variables: AppVariables;
}>()
  /**
   * POST /create-checkout-session
   * 创建 Stripe Checkout Session
   */
  .post(
    "/create-checkout-session",
    zValidator("json", createCheckoutSchema),
    async (c) => {
      // 认证检查
      const authError = ensureAuthenticated(c);
      if (authError) return authError;

      const session = c.get("session")!;
      const userId = getUserId(session);
      const userEmail = session.user.email;

      try {
        const { billingPeriod } = c.req.valid("json");

        // 初始化 Stripe
        const stripe = initStripe(c.env.STRIPE_SECRET_KEY);

        // 根据计费周期选择 Price ID
        const priceId =
          billingPeriod === "yearly"
            ? c.env.STRIPE_PRICE_YEARLY
            : c.env.STRIPE_PRICE_MONTHLY;

        if (!priceId) {
          return c.json(
            {
              success: false,
              error: "Stripe price configuration not found",
            },
            500
          );
        }

        // 构建回调 URL（使用前端地址）
        // BETTER_AUTH_URL 是后端地址，这里需要前端地址
        const frontendUrl = c.env.FRONTEND_URL;
        if (!frontendUrl) {
          return c.json(
            {
              success: false,
              error: "Missing FRONTEND_URL configuration",
            },
            500
          );
        }
        const successUrl = `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${frontendUrl}/payment-cancel`;

        // 创建 Checkout Session
        const { url, sessionId } = await createCheckoutSession(
          stripe,
          userId,
          userEmail,
          priceId,
          billingPeriod,
          successUrl,
          cancelUrl
        );

        return c.json(
          successResponse({
            url,
            sessionId,
          })
        );
      } catch (error) {
        console.error("Create checkout session error:", error);
        return c.json(
          {
            success: false,
            error: "Failed to create checkout session",
          },
          500
        );
      }
    }
  )

  /**
   * POST /webhook
   * 接收并处理 Stripe Webhook 事件
   */
  .post("/webhook", async (c) => {
    try {
      // 获取原始请求体和签名
      const signature = c.req.header("stripe-signature");
      if (!signature) {
        return c.json({ error: "Missing stripe-signature header" }, 400);
      }

      const payload = await c.req.text();

      // 初始化 Stripe
      const stripe = initStripe(c.env.STRIPE_SECRET_KEY);

      // 验证 Webhook 签名
      const event = verifyWebhookSignature(
        payload,
        signature,
        c.env.STRIPE_WEBHOOK_SECRET,
        stripe
      );

      console.log(`📥 [Stripe Webhook] Received event: ${event.type}`);

      const db = c.get("db");

      // 处理不同类型的事件
      switch (event.type) {
        case "checkout.session.completed": {
          // 支付完成事件 - 确认支付成功
          const session = event.data.object;
          await handleCheckoutCompleted(db, session, stripe);
          break;
        }

        case "customer.subscription.created": {
          // 订阅创建事件 - 当新订阅被创建时触发
          const subscription = event.data.object;
          await handleSubscriptionCreated(db, subscription);
          break;
        }

        case "customer.subscription.updated": {
          // 订阅更新事件 - 订阅状态变更（如续费、状态改变）
          const subscription = event.data.object;
          await handleSubscriptionUpdated(db, subscription);
          break;
        }

        case "customer.subscription.deleted": {
          // 订阅删除事件 - 订阅被取消或到期
          const subscription = event.data.object;
          await handleSubscriptionDeleted(db, subscription);
          break;
        }

        case "customer.subscription.trial_will_end": {
          // 试用期即将结束事件 - 提前3天通知
          const subscription = event.data.object;
          console.log(
            `⏰ [Stripe] Trial will end for subscription: ${subscription.id}`
          );
          // TODO: 发送邮件提醒用户试用期即将结束
          break;
        }

        case "invoice.paid": {
          // 发票支付成功事件 - 每次成功扣款时触发
          const invoice = event.data.object;
          await handleInvoicePaid(db, invoice);
          break;
        }

        case "invoice.payment_failed": {
          // 发票支付失败事件 - 扣款失败时触发
          const invoice = event.data.object;
          await handleInvoicePaymentFailed(db, invoice);
          break;
        }

        default:
          console.log(`⚠️ [Stripe] Unhandled event type: ${event.type}`);
      }

      return c.json({ received: true });
    } catch (error) {
      console.error("❌ [Stripe Webhook] Error:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Webhook error",
        },
        400
      );
    }
  })

  /**
   * POST /cancel-subscription
   * 取消用户订阅
   */
  .post(
    "/cancel-subscription",
    zValidator("json", cancelSubscriptionSchema),
    async (c) => {
      // 认证检查
      const authError = ensureAuthenticated(c);
      if (authError) return authError;

      try {
        const { subscriptionId } = c.req.valid("json");

        // 初始化 Stripe
        const stripe = initStripe(c.env.STRIPE_SECRET_KEY);

        // 取消订阅
        const success = await cancelSubscription(stripe, subscriptionId);

        if (success) {
          return c.json(
            successResponse({
              message: "Subscription cancelled successfully",
            })
          );
        } else {
          return c.json(
            {
              success: false,
              error: "Failed to cancel subscription",
            },
            500
          );
        }
      } catch (error) {
        console.error("Cancel subscription error:", error);
        return c.json(
          {
            success: false,
            error: "Failed to cancel subscription",
          },
          500
        );
      }
    }
  );

// 导出类型供前端使用
export type PaymentRouteType = typeof paymentRoute;
