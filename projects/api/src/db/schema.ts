// schema.ts - 完整版
import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  index,
  integer,
  uniqueIndex,
  doublePrecision,
  text,
  pgEnum,
} from "drizzle-orm/pg-core";

// ==================== 枚举定义 ====================

// 🔄 修改：使用 pgEnum 替代 TypeScript 常量（数据库层面强制约束）
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
]);

export const localeEnum = pgEnum("locale", ["zh-CN", "en-US"]);

// 🆕 修改：词汇等级改为 6 个等级，使用 pgEnum
export const vocabularyLevelEnum = pgEnum("vocabulary_level", [
  "primary_school", // 小学
  "middle_school", // 初中
  "high_school", // 高中
  "cet4", // 大学英语四级
  "cet6", // 大学英语六级
  "ielts_toefl", // 雅思/托福
  "gre", // GRE 研究生入学考试
]);

// 订阅等级枚举
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "basic",
  "premium",
]);

// 订阅状态枚举
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "expired",
  "trial",
]);

// 🔄 修改：支付提供商改为 pgEnum
export const paymentProviderEnum = pgEnum("payment_provider", [
  "alipay",
  "wechat",
  "stripe",
]);

// 🔄 修改：货币改为 pgEnum
export const currencyEnum = pgEnum("currency", ["CNY", "USD"]);

// 文章状态枚举
export const articleStatusEnum = pgEnum("article_status", [
  "pending", // 已保存但未分析陌生词汇
  "analyzed", // 已分析过陌生词汇
  "archived", // 用户主动归档（不再需要学习）
]);

// ==================== 用户表 ====================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }), // 昵称/显示名称，非真实姓名
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: boolean("email_verified"), // null 表示未填写邮箱
  avatarUrl: varchar("avatar_url", { length: 500 }), // 需要在betterAuth中配置 avatarUrl 映射到 image字段上
  role: varchar("role", { length: 50 }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // 扩展字段：认证相关
  // 🔄 修改字段名，与 Better Auth 期望一致
  phoneNumber: varchar("phone_number", { length: 20 }).unique(),
  phoneNumberVerified: boolean("phone_number_verified").default(false),

  // 扩展字段：账户状态
  status: userStatusEnum("status").notNull().default("active"),
  locale: localeEnum("locale").notNull().default("zh-CN"),

  // 扩展字段：业务相关
  vocabularyLevel: vocabularyLevelEnum("vocabulary_level"),

  // 扩展字段：活跃度追踪
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

// TypeScript 类型推导
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ==================== Better Auth 相关表 ====================

// 🔐 会话表：用于管理用户登录会话
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 最长 45 字符
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    tokenIdx: uniqueIndex("sessions_token_idx").on(table.token),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  })
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// 🔗 账户关联表：用于第三方登录（OAuth）和密码认证
// 符合 Better Auth 标准字段结构
export const accounts = pgTable(
  "accounts",
  {
    // 主键：保持自增整数（配合 auth.ts 中的 useNumberId: true）
    id: serial("id").primaryKey(),

    // 用户 ID：外键关联到 users 表
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // accountId：Better Auth 用于标识账户的 ID（SSO 返回的 ID 或等于 userId）
    accountId: varchar("account_id", { length: 255 }).notNull(),

    // providerId：认证提供商 ID（如 "google", "github", "credential" 等）
    providerId: varchar("provider_id", { length: 50 }).notNull(),

    // 访问令牌：OAuth 提供商返回
    accessToken: text("access_token"),

    // 刷新令牌：OAuth 提供商返回
    refreshToken: text("refresh_token"),

    // 访问令牌过期时间
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),

    // 刷新令牌过期时间
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),

    // 权限范围：OAuth 提供商返回
    scope: text("scope"),

    // ID 令牌：OAuth 提供商返回
    idToken: text("id_token"),

    // 密码：用于邮箱/手机号密码认证（已加密）
    password: text("password"),

    // 创建时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // 更新时间
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 索引：用户 ID，用于快速查询某用户的所有账户
    userIdIdx: index("accounts_user_id_idx").on(table.userId),

    // 唯一索引：providerId + accountId 组合唯一
    providerAccountIdx: uniqueIndex("accounts_provider_account_idx").on(
      table.providerId,
      table.accountId
    ),
  })
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// ✉️ 验证表：用于邮箱验证、手机验证、密码重置等
export const verifications = pgTable(
  "verifications",
  {
    id: serial("id").primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(), // 邮箱或手机号
    value: varchar("value", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // 🆕 Better Auth 建议添加 updatedAt
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("verifications_token_idx").on(table.value),
    expiresAtIdx: index("verifications_expires_at_idx").on(table.expiresAt),
  })
);

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

// ==================== 付费订阅表 ====================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // 订阅信息
    tier: subscriptionTierEnum("tier").notNull(),
    status: subscriptionStatusEnum("status").notNull(),

    // 时间信息（withTimezone: true：数据库自动转换为 UTC 存储，查询时再转换回客户端时区）
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // null = 永久（如 lifetime 购买）
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    // 支付信息 null = 手动开通
    paymentProvider: paymentProviderEnum("payment_provider"),
    paymentId: varchar("payment_id", { length: 255 }), // 支付平台返回的订单ID
    amount: varchar("amount", { length: 20 }), // 金额，使用 string 避免浮点数问题，格式如 "99.00"
    currency: currencyEnum("currency").default("CNY"),

    // 元信息
    metadata: varchar("metadata", { length: 1000 }), // JSON string，存储额外信息（促销码、来源等）

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 索引定义（内联语法）
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
    expiresAtIdx: index("subscriptions_expires_at_idx").on(table.expiresAt),
  })
);

// TypeScript 类型推导
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

// ==================== 词库表 ====================
export const vocabulary = pgTable(
  "vocabulary",
  {
    id: serial("id").primaryKey(),

    // 单词信息
    word: varchar("word", { length: 200 }).notNull(), // 🔄 修改：长度增加到 200，支持短语如 "in the long run"

    definition: text("definition"), // 🔄 修改：varchar 改为 text，支持更长的定义

    pronunciation: varchar("pronunciation", { length: 100 }), // IPA 国际音标

    // 等级信息
    // 🔄 修改：从 integer 改为 vocabularyLevelEnum，与 users.vocabularyLevel 类型一致
    level: vocabularyLevelEnum("level").notNull(),

    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 索引定义
    // 唯一约束：确保单词不重复
    wordUniqueIdx: uniqueIndex("vocabulary_word_unique_idx").on(table.word),
    wordIdx: index("vocabulary_word_idx").on(table.word),
    levelIdx: index("vocabulary_level_idx").on(table.level),
  })
);

// TypeScript 类型推导
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewVocabulary = typeof vocabulary.$inferInsert;

export const userLearnedMeanings = pgTable(
  "user_learned_meanings",
  {
    // ===== 基础信息 =====
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 所属用户ID

    word: varchar("word", { length: 100 }).notNull(),
    // 单词原形（小写）

    wordInText: varchar("word_in_text", { length: 100 }),
    // 单词在文章中的实际形态（如 "running", "showcasing"）
    // 用于复习时准确高亮显示

    pos: varchar("pos", { length: 20 }),
    // 词性（n. / v. / adj. / adv. 等）

    meaningText: text("meaning_text").notNull(),
    // 含义解释文本（AI返回的具体含义）

    exampleSentence: text("example_sentence"),
    // 例句（基于原文生成）

    sourceTextId: integer("source_text_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    // 来源文章ID（关联到用户上传的文本）

    // ===== Anki复习算法字段 =====
    easeFactor: doublePrecision("ease_factor").default(2.5).notNull(),
    // 难度系数（Anki算法核心参数，默认2.5，范围通常1.3-2.5）

    intervalDays: integer("interval_days").default(1).notNull(),
    // 当前复习间隔天数（默认1天，表示新卡片第二天复习）

    repetitions: integer("repetitions").default(0).notNull(),
    // 连续正确复习次数（0=新卡片，1-3=学习阶段，>3=复习阶段）

    nextReviewDate: timestamp("next_review_date", { withTimezone: true }),
    // 下次复习的日期时间（用于查询待复习卡片）

    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    // 最后一次在复习页面复习的时间（用户主动复习操作）

    totalReviews: integer("total_reviews").default(0).notNull(),
    // 累计复习次数（包括错误的复习）

    // ===== 追踪字段 =====
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 首次学习（创建记录）的时间

    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    // 最后一次在阅读文章时遇到该单词的时间（区别于主动复习时间）
  },
  (table) => ({
    // 索引：用于快速查询某用户的某个单词的所有含义
    userWordIdx: index("idx_user_word").on(table.userId, table.word),

    // 索引：用于查询待复习的卡片（按用户和复习日期）
    nextReviewIdx: index("idx_next_review").on(
      table.userId,
      table.nextReviewDate
    ),
  })
);
// 为上面的表添加类型推导
export type UserLearnedMeaning = typeof userLearnedMeanings.$inferSelect;
export type NewUserLearnedMeaning = typeof userLearnedMeanings.$inferInsert;

// ==================== 用户学习统计表 🆕 ====================
export const userLearningStats = pgTable(
  "user_learning_stats",
  {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // 统计日期（存储为当天零点的时间戳）
    // 示例：2025-01-15 00:00:00+00
    date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),

    // ========== 词汇学习统计 ==========

    // 新增单词数：当天加入 userVocabulary 表的单词数量
    newWordsCount: integer("new_words_count").notNull().default(0),

    // 复习单词数：当天复习的单词总数（包括答对和答错）
    reviewedCount: integer("reviewed_count").notNull().default(0),

    // 答对单词数：当天复习中答对的单词数量
    correctCount: integer("correct_count").notNull().default(0),

    // ========== 阅读统计 ==========

    // 阅读文章数：当天阅读的文章数量
    articlesRead: integer("articles_read").notNull().default(0),

    // 阅读单词数：当天阅读文章的总单词数（累加 articles.wordCount）
    wordsRead: integer("words_read").notNull().default(0),

    // ========== 时间统计 ==========

    // 学习时长（分钟）：当天累计学习时间
    // 前端通过心跳机制每分钟上报一次，后端累加到此字段
    timeSpentMinutes: integer("time_spent_minutes").notNull().default(0),

    // ========== 配额使用统计 ==========

    // 文章分析次数：当天调用 API 分析文章的次数（用于配额限制）
    // 注意：只统计消耗 AI API 成本的分析操作，不包括复习操作
    articlesAnalyzedCount: integer("articles_analyzed_count")
      .notNull()
      .default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 唯一索引：一个用户一天只有一条记录
    userDateUniqueIdx: uniqueIndex("user_learning_stats_user_date_idx").on(
      table.userId,
      table.date
    ),
    // 普通索引：用于查询某用户的时间范围统计（如查询最近 30 天数据）
    userIdIdx: index("user_learning_stats_user_idx").on(table.userId),
    dateIdx: index("user_learning_stats_date_idx").on(table.date),
  })
);

// TypeScript 类型推导
export type UserLearningStats = typeof userLearningStats.$inferSelect;
export type NewUserLearningStats = typeof userLearningStats.$inferInsert;

// ==================== 配额配置表 🆕 ====================

/**
 * 配额配置表：存储不同订阅等级的使用限制规则
 *
 * 用途：
 * 1. 控制不同订阅等级用户的每日 API 调用次数（成本控制）
 * 2. 限制单篇文章的最大词数（防止滥用）
 * 3. 便于管理员通过 Admin 界面动态调整配额
 *
 * 设计要点：
 * - 每个订阅等级（free/basic/premium）对应一行记录
 * - -1 表示无限制（如 premium 用户）
 * - 配置修改后立即生效（结合 Redis 缓存需要失效缓存）
 */
export const quotaConfigs = pgTable("quota_configs", {
  id: serial("id").primaryKey(),

  // 订阅等级：关联到 subscriptionTierEnum
  tier: subscriptionTierEnum("tier").notNull().unique(),

  // 每日文章分析次数限制
  // -1 = 无限制，0 = 禁止使用，>0 = 具体次数
  // 示例：free = 2, basic = 20, premium = -1
  dailyArticlesLimit: integer("daily_articles_limit").notNull(),

  // 单篇文章最大词数限制
  // -1 = 无限制，>0 = 具体词数
  // 示例：free = 3000, basic = 10000, premium = -1
  maxArticleWords: integer("max_article_words").notNull(),

  // 预留字段：新用户首日奖励次数（可选，暂未使用）
  // 示例：free 用户注册首日可获得额外 3 次分析机会
  newUserBonusLimit: integer("new_user_bonus_limit").default(0),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// TypeScript 类型推导
export type QuotaConfig = typeof quotaConfigs.$inferSelect;
export type NewQuotaConfig = typeof quotaConfigs.$inferInsert;

// ==================== 文章表 ====================

/**
 * 文章表：存储用户上传的英文文章，用于分析陌生词汇和后续复习
 *
 * 🔄 主要修改：
 * 1. 新增 source 字段，记录文章来源（非 URL，而是自由文本描述）
 */
export const articles = pgTable(
  "articles",
  {
    // 主键ID
    id: serial("id").primaryKey(),

    // 用户ID：外键关联 users.id，用户删除时级联删除该用户的所有文章
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // 文章标题：用户输入或从文章内容自动提取的标题
    title: varchar("title", { length: 500 }),

    // 文章内容：存储完整的文章原文，用于后续阅读和词汇复习
    content: text("content").notNull(),

    // 🆕 新增：文章来源描述（可选）
    // 示例值："纽约时报" | "自己写的" | "朋友分享" | "经济学人"
    // 注意：不是 URL，而是用户自定义的文本描述
    source: varchar("source", { length: 200 }),

    // 单词数量：文章的总单词数，用于统计和展示
    wordCount: integer("word_count").notNull().default(0),

    // 陌生词汇数量：该文章中识别出的陌生词汇数量，分析完成后更新此字段
    unfamiliarWordCount: integer("unfamiliar_word_count").notNull().default(0),

    // 分析时间：记录文章被分析（提取陌生词汇）的时间，初始为 NULL，分析后更新
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),

    // 最后阅读时间：记录用户最近一次打开该文章的时间，用于统计和排序
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),

    // 创建时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // 更新时间
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 索引定义
    // 单独索引：用户ID，优化查询某用户的所有文章
    userIdx: index("articles_user_idx").on(table.userId),

    // 复合索引：用户ID + 状态，优化查询某用户特定状态的文章（如"待分析"列表）
    userStatusIdx: index("articles_user_status_idx").on(table.userId),

    // 复合索引：用户ID + 分组ID，优化查询某用户某分组下的所有文章
    userFolderIdx: index("articles_user_folder_idx").on(table.userId),
  })
);

// TypeScript 类型推导
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

/**
 * ============================================
 * 用户已认知词汇表 (User Known Words)
 * ============================================
 *
 * 功能：存储用户手动标记为"已认识"的词汇
 *
 * 使用场景：
 * 1. 用户在文章分析时，标记某个词为"已认识"
 * 2. 用户手动添加自己领域的专业词汇
 * 3. 批量导入用户的已知词汇列表
 *
 * 与其他表的关系：
 * - vocabulary: 系统标准词汇库（所有用户共享）
 * - user_learned_meanings: 用户正在学习的词（有详细学习记录）
 * - user_known_words: 用户已认识但未学习的词（轻量级）
 *
 * 过滤优先级：
 * 1. vocabulary（基于用户等级）
 * 2. user_known_words（用户已认识）
 * 3. user_learned_meanings（正在学习，激进模式时启用）
 */
export const userKnownWords = pgTable(
  "user_known_words",
  {
    id: serial("id").primaryKey(),

    // 关联用户
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // 单词信息
    word: varchar("word", { length: 200 }).notNull(), // 用户添加的原始形式
    lemma: varchar("lemma", { length: 200 }).notNull(), // 标准化后的词根（小写）

    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 索引定义
    // 用户ID索引：查询某用户的所有已认知词汇
    userIdIdx: index("user_known_words_user_id_idx").on(table.userId),

    // Lemma索引：查询特定词根
    lemmaIdx: index("user_known_words_lemma_idx").on(table.lemma),

    // 唯一约束：同一用户不能重复添加同一个词根
    userLemmaUnique: uniqueIndex("user_known_words_user_lemma_unique").on(
      table.userId,
      table.lemma
    ),
  })
);

// TypeScript 类型推导
export type UserKnownWord = typeof userKnownWords.$inferSelect;
export type NewUserKnownWord = typeof userKnownWords.$inferInsert;
