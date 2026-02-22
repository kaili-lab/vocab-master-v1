# Cloudflare + GitHub Actions 部署手册

> 适用仓库：`vocab-master-v1`
>
> 目标：推送到 `main` 后自动部署
> - 后端 API → Cloudflare Workers
> - 前端 Client → Cloudflare Pages

---

## 整体流程一览

```
第 1 步  Cloudflare 端准备   创建 Pages 项目 + 获取 Account ID + 创建 API Token
第 2 步  GitHub Secrets 配置  填入所有密钥和环境变量
第 3 步  推送代码触发部署     观察 Actions 执行结果，拿到真实线上 URL
第 4 步  回填真实 URL         用线上地址更新 Secrets，重新部署对齐
第 5 步  部署后必做           数据库初始化 + Stripe 生产 Webhook 配置
```

---

## 1. 工作流文件说明

仓库里已经有两个自动部署文件，不需要你新建：

| 文件 | 触发条件 | 作用 |
|------|---------|------|
| `.github/workflows/deploy-api.yml` | `projects/api/**` 有变更 | 部署后端到 Cloudflare Workers |
| `.github/workflows/deploy-client.yml` | `projects/client/**` 或 `projects/shared/**` 有变更 | 构建前端并部署到 Cloudflare Pages |

两个 workflow 都支持 `workflow_dispatch`（在 GitHub Actions 页面手动触发）。

---

## 2. Cloudflare 端准备

### 2.1 获取 Account ID

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击左侧 **Workers & Pages**，进入 **Overview**
3. 右侧边栏找到 **Account ID**，复制保存

> 这个值之后填到 GitHub Secret，Name 填 `CLOUDFLARE_ACCOUNT_ID`（路径见第 4 节）

### 2.2 创建 Pages 项目（前端，必须提前建好）

**为什么需要提前建**：Cloudflare Pages 不会自动创建新项目，必须先注册一次，后续 GitHub Actions 才能向它部署。

**推荐方式：用 wrangler CLI 创建（一条命令，无需在 Dashboard 点来点去）**

```bash
# 在项目根目录执行
npx wrangler login                                     # 打开浏览器授权，只需一次
npx wrangler pages project create vocab-master-client  # 创建 Pages 项目
```

执行 `project create` 后会提示选择 production branch，填 `main` 即可。

> **不要用 Dashboard 里的 "Import Git repository"**：那是让 Cloudflare 接管 CI/CD 的模式，会和你的 GitHub Actions 冲突，且**一旦选了无法切换**，只能删项目重建。

> **关键**：项目名 `vocab-master-client` 必须和 `.github/workflows/deploy-client.yml` 里的 `--project-name=vocab-master-client` 完全一致。如果改了名字，两处都要同步修改。

Pages 项目建好后，你的前端域名会是：`https://vocab-master-client.pages.dev`

### 2.3 Workers 名称（后端，无需手动创建）

API 的 Worker 名称在 `projects/api/wrangler.jsonc` 里定义为 `vocab-master-api`，第一次部署时会自动创建，不需要你提前在 Dashboard 里建。

部署成功后，API 域名会是：`https://vocab-master-api.<你的账号子域名>.workers.dev`

> 具体域名在 Workers & Pages → vocab-master-api → 详情页可以看到。

---

## 3. 创建 API Token

入口：Cloudflare Dashboard 右上角头像 → **My Profile** → **API Tokens**

需要创建 **2 个**独立 Token，分别给 Workers 和 Pages 使用。

> **GitHub Secret 在哪里填**：仓库主页 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**（第 4 节有详细说明）

### Token A：给 Workers（后端部署）

1. 点击 **Create Token**
2. 选择模板：**Edit Cloudflare Workers**
3. 直接 **Continue to summary** → **Create Token**
4. 复制 Token → 去 GitHub Secret，Name 填 `CLOUDFLARE_API_TOKEN_WORKERS`，Value 粘贴 Token

### Token B：给 Pages（前端部署）

1. 点击 **Create Token**
2. 选择 **Create Custom Token**（模板里没有 Pages 选项，需要自定义）
3. Permissions 添加：`Account` → `Cloudflare Pages` → `Edit`
4. Account Resources：选择你的目标账号
5. **Continue to summary** → **Create Token**
6. 复制 Token → 去 GitHub Secret，Name 填 `CLOUDFLARE_API_TOKEN_PAGES`，Value 粘贴 Token

---

## 4. 在 GitHub 仓库配置 Secrets

入口：仓库页面 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 4.1 Cloudflare 基础（3 个）

| Secret 名称 | 说明 |
|------------|------|
| `CLOUDFLARE_ACCOUNT_ID` | 第 2.1 节获取的 Account ID |
| `CLOUDFLARE_API_TOKEN_WORKERS` | Token A |
| `CLOUDFLARE_API_TOKEN_PAGES` | Token B |

### 4.2 后端运行时 Secrets（11 个）

这些值会在部署时自动同步到 Cloudflare Workers Secrets，不需要在 Cloudflare Dashboard 手动维护：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `DATABASE_URL` | Neon PostgreSQL HTTP URL | `https://xxx.neon.tech/...` |
| `BETTER_AUTH_SECRET` | 随机字符串，用于 session 加密 | 32 位以上随机字符串 |
| `BETTER_AUTH_URL` | **已部署的 API 地址** | `https://vocab-master-api.xxx.workers.dev` |
| `GOOGLE_NLP_API_KEY` | Google Cloud NLP 密钥 | — |
| `AIHUBMIX_API_KEY` | AIHubMix API 密钥 | — |
| `RESEND_API_KEY` | Resend 邮件服务密钥 | — |
| `STRIPE_SECRET_KEY` | Stripe 后端密钥 | `sk_live_xxx` 或 `sk_test_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 签名密钥 | `whsec_xxx`（第 5.2 节获取） |
| `STRIPE_PRICE_MONTHLY` | Stripe 月付价格 ID | `price_xxx` |
| `STRIPE_PRICE_YEARLY` | Stripe 年付价格 ID | `price_xxx` |
| `FRONTEND_URL` | **已部署的前端地址**，用于 CORS | `https://vocab-master-client.pages.dev` |

### 4.3 前端构建 Secrets（2 个）

这两个值在 GitHub Actions 构建前端时注入为环境变量（`VITE_` 前缀在构建时打包进产物）：

| Secret 名称 | 说明 |
|------------|------|
| `VITE_API_URL` | 已部署的 API 地址（同 `BETTER_AUTH_URL`） |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe 前端公钥（`pk_live_xxx` 或 `pk_test_xxx`） |

---

## 5. 首次部署流程

### 5.1 解决 URL 先有鸡还是先有蛋的问题

第一次部署时，API URL 和前端 URL 互相依赖：
- `BETTER_AUTH_URL` / `VITE_API_URL` 需要 API 域名（还没部署）
- `FRONTEND_URL` 需要前端域名（还没部署）

**解决方法**：先填入预期地址，再部署，拿到真实地址后回填：

- `FRONTEND_URL` 填：`https://vocab-master-client.pages.dev`（Pages 域名在创建时就确定了）
- `BETTER_AUTH_URL` 和 `VITE_API_URL` 填：`https://vocab-master-api.<你的账号子域名>.workers.dev`

> Workers 的子域名格式是 `<worker-name>.<account-subdomain>.workers.dev`，你的 `account-subdomain` 可以在 Cloudflare Dashboard → Workers & Pages → Overview 右侧找到，或者第一次部署失败的报错里也会显示。
>
> 如果实在不确定，可以先填一个占位值，等第一次部署成功后再改。

### 5.2 推送触发部署

所有 Secrets 配置完成后，推送任意改动到 `main` 即可触发：

```bash
git push origin main
```

或者在 GitHub → Actions 页面，手动点 **Run workflow** 触发。

### 5.3 查看部署结果

仓库 → **Actions**，找到：
- `Deploy API to Cloudflare Workers`
- `Deploy Client to Cloudflare Pages`

任意一个失败，点进去展开报错步骤查看原因，常见原因见第 7 节。

### 5.4 回填真实 URL

部署成功后：

1. 进入 Cloudflare → Workers & Pages → **vocab-master-api**，找到 Worker 的真实域名
2. 用真实 API 域名更新 GitHub Secrets：`BETTER_AUTH_URL`、`VITE_API_URL`
3. 确认 `FRONTEND_URL` 和 `CLOUDFLARE_ACCOUNT_ID` 无误
4. 在 Actions 页面手动 **Run workflow** 重新部署两个服务，让配置生效

---

## 6. 部署后必做（首次上线）

### 6.1 数据库初始化

应用部署好之后，数据库还是空的，需要执行以下操作（本地执行即可）：

**Step 1：推送 Schema（如果还没做）**

```bash
cd projects/api
npx drizzle-kit push
```

**Step 2：初始化配额配置**（`quota_configs` 表为空时，所有分析请求会返回 500）

方法一：在 Neon Dashboard → SQL Editor 里执行 `projects/api/scripts/init-quota-config.sql`

方法二：命令行

```bash
cd projects/api
npx tsx scripts/init-quota-config.ts
```

脚本使用 `ON CONFLICT DO UPDATE`，可安全重复执行。

**Step 3：初始化词汇库**（不初始化则生词识别功能不可用）

见 `projects/api/scripts/README.md`

### 6.2 配置 Stripe 生产 Webhook

本地开发用 Stripe CLI 转发，但**线上环境需要在 Stripe Dashboard 里单独配置**：

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. 点击 **Add endpoint**
3. Endpoint URL 填写：`https://vocab-master-api.<你的子域名>.workers.dev/api/payment/webhook`
4. 选择监听的事件：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. 创建后，点击该 Webhook → **Signing secret** → **Reveal**，复制 `whsec_xxx`
6. 把这个值更新到 GitHub Secret：`STRIPE_WEBHOOK_SECRET`
7. 重新触发一次 API 部署（`workflow_dispatch`），让新的 Webhook Secret 生效

> 如果用的是测试模式，确保 Stripe Secret Key（`STRIPE_SECRET_KEY`）和 Price ID 也是测试模式下的值（`sk_test_xxx` / `price_test_xxx`）。

---

## 7. 常见问题排查

| 现象 | 原因 | 解决 |
|------|------|------|
| 前端部署失败，报"project not found" | `--project-name` 和 Cloudflare Pages 项目名不一致 | 检查 Dashboard 里的项目名，同步修改 workflow 文件 |
| API 启动报错 / 所有请求 500 | `FRONTEND_URL` 或 `DATABASE_URL` 为空 | 检查 Secrets 是否填写并重新部署 |
| 前端能打开但请求全部失败 | `VITE_API_URL` 填错，或 CORS 不通 | 确认 API 域名正确，且 `FRONTEND_URL` 与浏览器地址一致 |
| 分析文章返回 500 | `quota_configs` 表为空 | 执行第 6.1 节数据库初始化 |
| 付款后仍显示 free 等级 | Stripe Webhook 未配置或未到达 | 检查第 6.2 节，确认 Webhook 端点和 Secret 正确 |
| Token 权限不够，wrangler 报权限错误 | Token 创建时权限选错 | 重新按第 3 节创建对应 Token |
| 改了 Secrets 但线上没变化 | 只改 Secrets 不会自动重新部署 | 手动触发 workflow_dispatch |

---

## 8. 本仓库关键文件位置

| 文件 | 说明 |
|------|------|
| `.github/workflows/deploy-api.yml` | 后端部署 workflow |
| `.github/workflows/deploy-client.yml` | 前端部署 workflow |
| `projects/api/wrangler.jsonc` | Workers 配置（名称、路由等） |
| `projects/api/src/types/bindings.ts` | 后端环境变量类型定义 |
| `projects/client/src/lib/api-client.ts` | 前端 API 地址读取 |
| `projects/api/scripts/init-quota-config.sql` | 配额初始化脚本 |

---

## 9. 官方文档

- [Workers + GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Pages Direct Upload + CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [获取 Account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
- [wrangler-action](https://github.com/cloudflare/wrangler-action)
- [Stripe Webhook 文档](https://docs.stripe.com/webhooks)
