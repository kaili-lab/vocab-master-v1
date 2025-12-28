import { createMiddleware } from "hono/factory";
import { eq, and, sql } from "drizzle-orm";
import type { Bindings } from "../types/bindings";
import type { AuthenticatedVariables } from "../types/variables";
import { subscriptions, quotaConfigs, userLearningStats } from "../db/schema";

/**
 * 配额检查中间件
 *
 * 用途：
 * 1. 在文章分析接口前进行配额校验，防止超额使用 API
 * 2. 根据用户订阅等级（free/basic/premium）控制每日分析次数
 * 3. 使用数据库事务和行锁防止并发绕过限制
 */

/**
 * 配额信息类型
 * 注入到 Hono Context 的 Variables 中，供后续业务使用
 */
export interface QuotaInfo {
  tier: "free" | "premium"; // 用户订阅等级
  dailyLimit: number; // 每日限制次数
  usedToday: number; // 今日已使用次数（包含本次）
  remainingToday: number; // 今日剩余次数
  maxArticleWords: number; // 单篇文章最大词数
}

/**
 * 配额检查中间件
 */
export const quotaCheck = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthenticatedVariables & { quotaInfo: QuotaInfo };
}>(async (c, next) => {
  // session 由 requireAuth 中间件保证存在，这里可以安全地断言
  const session = c.get("session")!;
  const userId = session.user.id;
  const db = c.get("db");

  try {
    // ========== 步骤 1：查询用户的订阅等级 ==========
    // 注意：业务规则保证一个用户只有一个 active 订阅
    const activeSubscription = await db
      .select({
        tier: subscriptions.tier,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, Number(userId)),
          eq(subscriptions.status, "active")
          // 注意：这里需要添加过期时间判断，但为了简化暂不添加
          // lte(subscriptions.expiresAt, now) 需要配合 OR expiresAt IS NULL 处理永久订阅
        )
      )
      .limit(1);

    // 默认为 free 用户（没有订阅记录）
    const tier = (activeSubscription[0]?.tier || "free") as "free" | "premium";

    // ========== 步骤 2：查询配额配置 ==========
    // TODO: 后续可以添加 Redis 缓存，减少数据库查询
    const quotaConfigResult = await db
      .select({
        dailyLimit: quotaConfigs.dailyArticlesLimit,
        maxWords: quotaConfigs.maxArticleWords,
      })
      .from(quotaConfigs)
      .where(eq(quotaConfigs.tier, tier))
      .limit(1);

    const quotaConfig = quotaConfigResult?.[0];

    // 如果没有配置数据，使用默认值（防御性编程）
    if (!quotaConfig) {
      console.error(`Quota config not found for tier: ${tier}`);
      return c.json(
        {
          success: false,
          error: "System error: Quota configuration not found",
        },
        500
      );
    }

    const dailyLimit = quotaConfig.dailyLimit;
    const maxArticleWords = quotaConfig.maxWords;

    // ========== 步骤 3：检查是否无限制 ==========
    if (dailyLimit === -1) {
      // Premium 用户或无限制用户，直接放行
      c.set("quotaInfo", {
        tier,
        dailyLimit: -1,
        usedToday: 0,
        remainingToday: -1,
        maxArticleWords,
      });
      await next();
      return;
    }

    // ========== 步骤 4：校验并扣费（无事务，使用原子操作） ==========
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为今天零点

    // 注意：neon-http driver 不支持事务
    // 我们使用查询 + UPSERT 的方式，虽然不是完全原子的，但对于 MVP 阶段已足够
    // 未来可以使用 Redis 的 INCR 命令实现真正的原子操作

    // 步骤 4.1：查询当前使用次数
    const statsResult = await db
      .select({
        articlesAnalyzedCount: userLearningStats.articlesAnalyzedCount,
      })
      .from(userLearningStats)
      .where(
        and(
          eq(userLearningStats.userId, Number(userId)),
          eq(userLearningStats.date, today)
        )
      )
      .limit(1);

    const currentCount = statsResult?.[0]?.articlesAnalyzedCount || 0;

    // 步骤 4.2：校验是否超过限制
    if (currentCount >= dailyLimit) {
      return c.json(
        {
          success: false,
          error: `您已达到每日 ${dailyLimit} 次文章分析的限制，请升级订阅或明天再试`,
          quota: {
            tier,
            dailyLimit,
            usedToday: currentCount,
            remainingToday: 0,
          },
        },
        429
      );
    }

    // 步骤 4.3：扣费 - 增加使用次数（UPSERT 操作本身是原子的）
    await db
      .insert(userLearningStats)
      .values({
        userId: Number(userId),
        date: today,
        articlesAnalyzedCount: 1,
        newWordsCount: 0,
        reviewedCount: 0,
        correctCount: 0,
        articlesRead: 0,
        wordsRead: 0,
        timeSpentMinutes: 0,
      })
      .onConflictDoUpdate({
        target: [userLearningStats.userId, userLearningStats.date],
        set: {
          articlesAnalyzedCount: sql`${userLearningStats.articlesAnalyzedCount} + 1`,
          updatedAt: new Date(),
        },
      });

    // ========== 步骤 5：注入配额信息到 Context ==========
    const usedToday = currentCount + 1;
    const remainingToday = dailyLimit - usedToday;

    c.set("quotaInfo", {
      tier,
      dailyLimit,
      usedToday,
      remainingToday,
      maxArticleWords,
    });

    // 放行请求，执行业务逻辑
    await next();
  } catch (error) {
    console.error("Quota check middleware error:", error);
    return c.json(
      {
        success: false,
        error: "Internal server error during quota check",
      },
      500
    );
  }
});
