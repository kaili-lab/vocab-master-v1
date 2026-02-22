# 项目逻辑文档

> 记录系统核心逻辑、设计决策、已知问题与待修复项。
> 作为 CLAUDE.md 的配套详细文档，供开发时参考。

---

## 一、订阅与配额系统

### 订阅等级

系统目前只有两个有效等级：

| 等级 | 来源 | 过期时间 |
|------|------|----------|
| `free` | 用户注册时自动创建 | 永不过期（`expiresAt = null`） |
| `premium` | Stripe 支付成功后由 webhook 更新 | 由 Stripe `current_period_end` 决定 |

数据库枚举中曾定义 `basic`，已清理（见已知问题）。

### quota_configs 表

**作用**：将配额数值从代码中解耦，存入数据库，支持动态调整而无需重新部署。

**表结构关键字段**：

```
tier                  — 订阅等级（free / premium），唯一
daily_articles_limit  — 每日最多分析文章数（-1 表示无限制）
max_article_words     — 单篇文章最大词数
```

**当前配置值**：

| 等级 | 每日文章数 | 单篇最大词数 |
|------|-----------|-------------|
| free | 2 | 1,000 |
| premium | 50 | 5,000 |

**重要：此表不会自动初始化，必须手动执行初始化脚本。**

### 配额检查流程

每次调用 `/api/text/analyze` 时，`quota-check.middleware.ts` 按以下顺序执行：

1. 查询用户在 `subscriptions` 表中状态为 `active` 的记录，取其 `tier`
2. 若无记录，默认视为 `free`
3. 用 `tier` 查询 `quota_configs` 表获取限额配置（若表为空则返回 500）
4. 若 `daily_articles_limit === -1`，直接放行
5. 查询 `user_learning_stats` 表中今日已使用次数
6. 超过限额返回 429，否则原子 UPSERT 计数 +1 后放行

### Stripe 支付与订阅同步

支付完成后，Stripe 通过 webhook 回调 `/api/payment/webhook`，系统处理以下事件：

| 事件 | 处理函数 | 作用 |
|------|---------|------|
| `checkout.session.completed` | `handleCheckoutCompleted` | 支付成功，升级订阅为 premium |
| `customer.subscription.created` | `handleSubscriptionCreated` | 订阅对象创建，同步到数据库 |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | 续费、状态变更同步 |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | 取消订阅 |

**本地开发注意**：Stripe 无法回调 `localhost`，webhook 事件不会到达本地服务器，导致数据库中订阅等级不会更新。需使用 Stripe CLI 转发（详见下方"Stripe CLI 本地开发指南"）。

---

## 二、Stripe CLI 本地开发指南

### 为什么需要 Stripe CLI

Stripe 的 webhook 是 Stripe 服务器主动 POST 到你的回调地址的。本地开发时 `localhost` 没有公网地址，Stripe 无法访问。Stripe CLI 的 `listen` 命令会在本地建立一条到 Stripe 服务器的长连接，将 webhook 事件转发到本地端口。

### 安装 Stripe CLI

Stripe CLI 是独立工具，与项目无关，安装一次即可全局使用。

**Ubuntu / WSL：**

```bash
# 方法 1：使用官方 apt 源（推荐）
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe

# 方法 2：直接下载二进制
# 前往 https://github.com/stripe/stripe-cli/releases 下载对应平台的包
```

**macOS：**

```bash
brew install stripe/stripe-cli/stripe
```

**验证安装：**

```bash
stripe --version
```

### 登录 Stripe CLI

```bash
stripe login
```

执行后会打开浏览器，用 Stripe 账号授权即可。授权信息会缓存在本地，之后不需要重复登录。

### 启动 webhook 转发

```bash
# 可在任意目录执行，与项目路径无关
stripe listen --forward-to http://localhost:3001/api/payment/webhook
```

启动后终端会输出一个临时的 webhook signing secret（`whsec_xxx`），**但本项目不需要替换**，因为 `.dev.vars` 中的 `STRIPE_WEBHOOK_SECRET` 已配置好，`stripe listen` 会自动使用账号关联的密钥验证。

### 重放已有的 webhook 事件

如果已经完成过一笔支付但 webhook 未到达（比如当时没有启动转发），可以重放：

**方法 1：Stripe Dashboard**

1. 打开 Stripe Dashboard → Developers → Webhooks
2. 找到对应的 `checkout.session.completed` 事件
3. 点击 **Resend**（需要先启动 `stripe listen`）

**方法 2：Stripe CLI**

```bash
# 列出最近的事件
stripe events list --limit 10

# 重放指定事件
stripe events resend <event_id>
```

### 完整本地测试流程

```
1. 启动后端          cd projects/api && pnpm dev
2. 启动前端          cd projects/client && pnpm dev
3. 启动 webhook 转发  stripe listen --forward-to http://localhost:3001/api/payment/webhook
4. 在浏览器中完成支付
5. 观察 stripe listen 终端，确认事件被转发并处理成功
```

---

## 三、用户角色系统

### 现状

`users.role` 字段为 `varchar(50)`，默认值 `"user"`，无枚举约束。

已实现 `require-role.middleware.ts`，支持基于角色的路由保护，但**目前没有任何路由使用此中间件**，admin 功能体系尚未建立。

---

## 四、数据库初始化清单

以下数据需要在数据库迁移（`drizzle-kit push`）完成后**手动初始化**，否则相关功能无法使用：

| 数据 | 脚本位置 | 不初始化的后果 |
|------|---------|--------------|
| 配额配置 | `projects/api/scripts/init-quota-config.sql` | 所有用户分析文章返回 500 |
| 词汇库 | `projects/api/scripts/`（见 scripts/README.md） | 生词识别功能不可用 |

### 初始化配额配置

**方法 1（推荐）**：Neon Dashboard → SQL Editor，粘贴 `init-quota-config.sql` 内容执行。

**方法 2**：命令行

```bash
cd projects/api
npx tsx scripts/init-quota-config.ts
```

脚本使用 `ON CONFLICT DO UPDATE`，可安全重复执行。

---

## 五、已知问题与待修复项

### [已修复] basic 等级残留
- **问题**：数据库枚举定义了 `basic`，但从未在业务中使用，`quota_configs` 也无对应记录，若数据库误存 `basic` 用户会导致配额查询失败。
- **修复**：已从枚举和货币枚举（`CNY`）一并清理，需执行数据库枚举迁移。

### [待修复] role 字段缺乏枚举约束
- **问题**：`users.role` 是 `varchar`，没有枚举限制，可以写入任意字符串，容易出现拼写错误导致权限判断失效。
- **建议**：改为 `pgEnum("user_role", ["user", "admin"])` 并创建对应 migration。

### [待实现] admin 功能体系
- `require-role.middleware.ts` 已实现但无路由使用
- 无 admin 专属接口（配额管理、用户管理等）

### [待优化] 配额检查无 expiresAt 校验
- 位置：`quota-check.middleware.ts:52`（注释中已标注）
- **问题**：查询 active 订阅时未判断 `expiresAt`，过期的 premium 订阅（status 未及时更新时）仍会被视为有效。
- **建议**：加上 `OR expiresAt IS NULL` + `expiresAt >= now()` 的过滤条件。

### [待优化] 配额计数不完全原子
- 位置：`quota-check.middleware.ts:108`（注释中已标注）
- **问题**：Neon HTTP driver 不支持事务，查询次数和 UPSERT 计数是两步操作，极端并发下可能绕过限制。
- **建议**：生产环境使用 Redis INCR 实现原子计数。
