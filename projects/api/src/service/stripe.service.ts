/**
 * Stripe 支付服务
 *
 * 功能：
 * 1. 创建 Checkout Session（支持月付和年付）
 * 2. 验证 Webhook 签名
 * 3. 处理支付成功事件（创建订阅）
 */

import Stripe from "stripe";
import type { DB } from "../db/db";
import { subscriptions } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * 初始化 Stripe 客户端
 */
export function initStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover",
  });
}

/**
 * 创建 Checkout Session
 *
 * @param stripe - Stripe 客户端实例
 * @param userId - 用户 ID
 * @param userEmail - 用户邮箱
 * @param priceId - Stripe Price ID（月付或年付）
 * @param billingPeriod - 计费周期（monthly/yearly）
 * @param successUrl - 支付成功后的回调 URL
 * @param cancelUrl - 取消支付后的回调 URL
 * @returns Checkout Session URL
 */
export async function createCheckoutSession(
  stripe: Stripe,
  userId: number,
  userEmail: string,
  priceId: string,
  billingPeriod: "monthly" | "yearly",
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; sessionId: string }> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          billingPeriod,
        },
      },
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return {
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("❌ [Stripe] Create checkout session failed:", error);
    throw error;
  }
}

/**
 * 验证 Webhook 签名
 *
 * @param payload - Webhook 请求体（原始字符串）
 * @param signature - Stripe-Signature header
 * @param webhookSecret - Webhook 密钥
 * @param stripe - Stripe 客户端实例
 * @returns Stripe Event 对象
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string,
  stripe: Stripe
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("❌ [Stripe] Webhook signature verification failed:", error);
    throw new Error("Invalid webhook signature");
  }
}

/**
 * 处理 checkout.session.completed 事件
 * 创建或更新用户的 premium 订阅
 *
 * @param db - 数据库实例
 * @param session - Checkout Session 对象
 */
export async function handleCheckoutCompleted(
  db: DB,
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    const userId = session.metadata?.userId || session.client_reference_id;
    const billingPeriod = session.metadata?.billingPeriod || "monthly";

    if (!userId) {
      throw new Error("Missing userId in session metadata");
    }

    const userIdNum = parseInt(userId, 10);

    // 获取订阅信息
    const subscriptionId = session.subscription as string;
    const amountTotal = session.amount_total
      ? (session.amount_total / 100).toFixed(2)
      : "0";

    // 计算过期时间（月付30天，年付365天）
    const expiresAt = new Date();
    if (billingPeriod === "yearly") {
      expiresAt.setDate(expiresAt.getDate() + 365);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    // 检查用户是否已有订阅
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userIdNum))
      .limit(1);

    if (existingSubscription.length > 0) {
      // 更新现有订阅
      await db
        .update(subscriptions)
        .set({
          tier: "premium",
          status: "active",
          startedAt: new Date(),
          expiresAt,
          paymentProvider: "stripe",
          paymentId: subscriptionId,
          amount: amountTotal,
          currency: "USD",
          metadata: JSON.stringify({
            billingPeriod,
            sessionId: session.id,
          }),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userIdNum));

      console.log(
        `✅ [Stripe] Updated subscription for user ${userId} to premium`
      );
    } else {
      // 创建新订阅
      await db.insert(subscriptions).values({
        userId: userIdNum,
        tier: "premium",
        status: "active",
        startedAt: new Date(),
        expiresAt,
        paymentProvider: "stripe",
        paymentId: subscriptionId,
        amount: amountTotal,
        currency: "USD",
        metadata: JSON.stringify({
          billingPeriod,
          sessionId: session.id,
        }),
      });

      console.log(
        `✅ [Stripe] Created premium subscription for user ${userId}`
      );
    }
  } catch (error) {
    console.error("❌ [Stripe] Handle checkout completed failed:", error);
    throw error;
  }
}

/**
 * 处理 customer.subscription.created 事件
 * 订阅创建时同步到数据库
 *
 * @param db - 数据库实例
 * @param subscription - Stripe Subscription 对象
 */
export async function handleSubscriptionCreated(
  db: DB,
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    const userId = subscription.metadata?.userId;
    const billingPeriod = subscription.metadata?.billingPeriod || "monthly";

    if (!userId) {
      console.warn("⚠️ [Stripe] Missing userId in subscription metadata");
      return;
    }

    const userIdNum = parseInt(userId, 10);

    // 计算过期时间
    const currentPeriodEnd = (subscription as any).current_period_end;
    const expiresAt = currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 默认30天

    // 获取订阅金额
    const amount = subscription.items.data[0]?.price.unit_amount
      ? (subscription.items.data[0].price.unit_amount / 100).toFixed(2)
      : "0";

    // 检查用户是否已有订阅
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userIdNum))
      .limit(1);

    if (existingSubscription.length > 0) {
      // 更新现有订阅
      await db
        .update(subscriptions)
        .set({
          tier: "premium",
          status: subscription.status === "active" ? "active" : "trial",
          startedAt: new Date(
            (subscription as any).current_period_start * 1000
          ),
          expiresAt,
          paymentProvider: "stripe",
          paymentId: subscription.id,
          amount,
          currency: "USD",
          metadata: JSON.stringify({
            billingPeriod,
            subscriptionId: subscription.id,
          }),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userIdNum));

      console.log(`✅ [Stripe] Updated subscription for user ${userId}`);
    } else {
      // 创建新订阅
      await db.insert(subscriptions).values({
        userId: userIdNum,
        tier: "premium",
        status: subscription.status === "active" ? "active" : "trial",
        startedAt: new Date((subscription as any).current_period_start * 1000),
        expiresAt,
        paymentProvider: "stripe",
        paymentId: subscription.id,
        amount,
        currency: "USD",
        metadata: JSON.stringify({
          billingPeriod,
          subscriptionId: subscription.id,
        }),
      });

      console.log(`✅ [Stripe] Created subscription for user ${userId}`);
    }
  } catch (error) {
    console.error("❌ [Stripe] Handle subscription created failed:", error);
    throw error;
  }
}

/**
 * 处理 customer.subscription.updated 事件
 * 订阅状态变更时同步到数据库
 *
 * @param db - 数据库实例
 * @param subscription - Stripe Subscription 对象
 */
export async function handleSubscriptionUpdated(
  db: DB,
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.warn("⚠️ [Stripe] Missing userId in subscription metadata");
      return;
    }

    const userIdNum = parseInt(userId, 10);

    // 计算新的过期时间
    const currentPeriodEnd = (subscription as any).current_period_end;
    const expiresAt = currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 默认30天

    // 更新订阅状态
    await db
      .update(subscriptions)
      .set({
        status: subscription.status === "active" ? "active" : "cancelled",
        expiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userIdNum),
          eq(subscriptions.paymentId, subscription.id)
        )
      );

    console.log(
      `✅ [Stripe] Updated subscription status for user ${userId}: ${subscription.status}`
    );
  } catch (error) {
    console.error("❌ [Stripe] Handle subscription updated failed:", error);
    throw error;
  }
}

/**
 * 处理 customer.subscription.deleted 事件
 * 取消用户订阅
 *
 * @param db - 数据库实例
 * @param subscription - Stripe Subscription 对象
 */
export async function handleSubscriptionDeleted(
  db: DB,
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.warn("⚠️ [Stripe] Missing userId in subscription metadata");
      return;
    }

    const userIdNum = parseInt(userId, 10);

    // 更新订阅状态为 cancelled
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userIdNum),
          eq(subscriptions.paymentId, subscription.id)
        )
      );

    console.log(`✅ [Stripe] Cancelled subscription for user ${userId}`);
  } catch (error) {
    console.error("❌ [Stripe] Handle subscription deleted failed:", error);
    throw error;
  }
}

/**
 * 处理 invoice.paid 事件
 * 记录成功的支付
 *
 * @param db - 数据库实例
 * @param invoice - Stripe Invoice 对象
 */
export async function handleInvoicePaid(
  db: DB,
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    const subscriptionId = (invoice as any).subscription as string;

    if (!subscriptionId) {
      console.warn("⚠️ [Stripe] Invoice has no subscription ID");
      return;
    }

    // 更新订阅的最后支付时间
    await db
      .update(subscriptions)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.paymentId, subscriptionId));

    console.log(`✅ [Stripe] Invoice paid for subscription ${subscriptionId}`);
  } catch (error) {
    console.error("❌ [Stripe] Handle invoice paid failed:", error);
    throw error;
  }
}

/**
 * 处理 invoice.payment_failed 事件
 * 处理支付失败的情况
 *
 * @param db - 数据库实例
 * @param invoice - Stripe Invoice 对象
 */
export async function handleInvoicePaymentFailed(
  _db: DB,
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    const subscriptionId = (invoice as any).subscription as string;

    if (!subscriptionId) {
      console.warn("⚠️ [Stripe] Invoice has no subscription ID");
      return;
    }

    // 记录支付失败（可选：发送通知给用户）
    console.error(
      `❌ [Stripe] Payment failed for subscription ${subscriptionId}`
    );

    // TODO: 可以在这里添加逻辑：
    // 1. 发送邮件通知用户支付失败
    // 2. 更新数据库标记支付失败状态
    // 3. 如果多次失败，考虑暂停订阅
  } catch (error) {
    console.error("❌ [Stripe] Handle invoice payment failed:", error);
    throw error;
  }
}

/**
 * 取消订阅（用户主动取消）
 *
 * @param stripe - Stripe 客户端实例
 * @param subscriptionId - Stripe Subscription ID
 * @returns 是否成功
 */
export async function cancelSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<boolean> {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    console.log(`✅ [Stripe] Cancelled subscription ${subscriptionId}`);
    return true;
  } catch (error) {
    console.error("❌ [Stripe] Cancel subscription failed:", error);
    return false;
  }
}
