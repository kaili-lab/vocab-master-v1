# Vocab Master - CLAUDE.md

## 项目概述

AI 驱动的英语词汇学习应用。用户粘贴英文文章，系统通过双 AI 流水线分析生词并生成 Anki 式间隔重复复习卡片。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Hono.js v4 on Cloudflare Workers |
| 前端 | React 19 + Vite + React Router v7 |
| 数据库 | Neon PostgreSQL (HTTP driver, Drizzle ORM) |
| 认证 | Better Auth |
| 支付 | Stripe (订阅制) |
| AI | Google Cloud NLP + GPT-4o-mini (via AIHubMix) |
| 邮件 | Resend |

## Monorepo 结构

```
vocab-master-v1/
├── projects/
│   ├── api/        # Cloudflare Workers 后端，端口 3001
│   ├── client/     # React 前端，端口 5173
│   └── shared/     # 共享类型（ApiRoutes）
├── CLAUDE.md
└── pnpm-workspace.yaml
```

## 开发命令

```bash
# 后端（在 projects/api/）
pnpm dev            # 启动 wrangler dev（端口 3001）

# 前端（在 projects/client/）
pnpm dev            # 启动 Vite dev server（端口 5173）
```

## 环境变量配置

### 后端：`projects/api/.dev.vars`（本地开发，git-ignored）

从 `.dev.vars.example` 复制后填写：

```bash
cp projects/api/.dev.vars.example projects/api/.dev.vars
```

必填变量：
- `DATABASE_URL` — Neon PostgreSQL HTTP URL
- `BETTER_AUTH_SECRET` — 随机字符串
- `BETTER_AUTH_URL` — 后端地址（本地：`http://localhost:3001`）
- `GOOGLE_NLP_API_KEY`
- `AIHUBMIX_API_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`
- `FRONTEND_URL` — 前端地址（本地：`http://localhost:5173`，**CORS 白名单，必填**）

### 前端：`projects/client/.env`

```
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## 关键架构

### CORS 机制
`FRONTEND_URL` 在 `projects/api/src/index.ts` 的 `getFrontendUrl()` 中读取，用于 CORS origin 校验。**缺少此变量会导致所有请求 500 报错。**

### 认证流程
Better Auth 集成 → `authMiddleware` 注入 auth 实例 → `requireAuth` 中间件保护 `/api/*` 路由（白名单除外）

### 类型共享
`projects/shared` 导出 `ApiRoutes` 类型，前端通过 Hono RPC client 实现端到端类型安全。

### 数据库
Drizzle ORM + Neon HTTP driver（无连接池，无事务，适配 Cloudflare Workers 无状态环境）

## 数据库初始化（迁移后必做）

执行 `drizzle-kit push` 之后，以下数据需要**手动初始化**，否则功能不可用：

| 数据 | 脚本 | 不初始化的后果 |
|------|------|--------------|
| **配额配置** | `projects/api/scripts/init-quota-config.sql` | 所有用户分析文章返回 500 |
| 词汇库 | 见 `projects/api/scripts/README.md` | 生词识别不可用 |

### 初始化配额配置

在 Neon Dashboard → SQL Editor 执行 `init-quota-config.sql`，或：

```bash
cd projects/api
npx tsx scripts/init-quota-config.ts
```

脚本幂等，可安全重复执行。

> 详细逻辑说明见 [`docs/project-logic.md`](./docs/project-logic.md)

## 常见问题

### `Missing FRONTEND_URL in projects/api/.dev.vars`
原因：`.dev.vars` 文件不存在或缺少 `FRONTEND_URL`。
解决：`cp projects/api/.dev.vars.example projects/api/.dev.vars` 并填写 `FRONTEND_URL=http://localhost:5173`

### 前端连不上后端
检查 `projects/client/.env` 中 `VITE_API_URL` 是否指向 `http://localhost:3001`

### 付费后仍显示 free 等级 / 分析接口返回 500

两个独立问题：

1. **`quota_configs` 表为空** → 执行初始化脚本（见上方"数据库初始化"章节）
2. **本地开发 Stripe webhook 无法回调** → Stripe 无法访问 `localhost`，需用 CLI 转发：
   ```bash
   stripe listen --forward-to http://localhost:3001/api/payment/webhook
   ```
   运行后重新走一次支付流程，订阅才会更新为 premium。

### WSL2 开发环境下出现 CORS 错误
**现象**：OPTIONS 预检返回 204，但浏览器仍报 CORS error，且 Network 中没有后续的实际请求。

**原因**：CORS 校验使用严格字符串比较（`index.ts:41`）。WSL2 是独立的 Linux 虚拟机，Windows 浏览器访问时可能将 `localhost` 解析为 `127.0.0.1`，导致浏览器发送的 `Origin: http://127.0.0.1:5173` 与 `FRONTEND_URL=http://localhost:5173` 不匹配。

**解决**：将 `.dev.vars` 中的 `FRONTEND_URL` 改为与浏览器实际使用的地址一致：
```
FRONTEND_URL=http://127.0.0.1:5173
```
同时确保浏览器地址栏访问 `http://127.0.0.1:5173`（而非 `localhost`）。

> 在 Windows 原生环境中 `localhost` 和 `127.0.0.1` 等价，改为 `127.0.0.1` 不影响 Windows 开发。

## 路由结构

```
/api/users          # 用户信息
/api/auth           # Better Auth（登录/注册/密码重置）
/api/text           # 文章分析（AI 流水线）
/api/review         # 复习卡片（SM-2 算法）
/api/known-words    # 已掌握单词
/api/learning-words # 学习中单词
/api/payment        # Stripe 支付
```

## 订阅方案

| 计划 | 文章/天 | 最大字数/篇 | 价格 |
|------|---------|------------|------|
| 免费 | 2 | 1,000 | $0 |
| 高级 | 50 | 5,000 | $7/月 或 $67/年 |
