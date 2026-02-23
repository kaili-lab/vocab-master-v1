# Cloudflare + GitHub Actions 部署手册

> 适用仓库：`vocab-master-v1`
> **最后验证时间：2026-02**（Cloudflare Dashboard UI 随版本持续更新，步骤可能有变化）
>
> 目标：推送到 `main` 后自动部署
> - 后端 API → Cloudflare Workers
> - 前端 Client → Cloudflare Pages

---

## 整体流程一览

```
第 1 步  部署前检查          确认 pnpm-lock.yaml 已提交、URL 格式正确
第 2 步  Cloudflare 端准备   创建 Pages 项目 + 获取 Account ID + 创建 API Token
第 3 步  GitHub Secrets 配置  填入所有密钥和环境变量
第 4 步  首次部署            推送代码触发 Actions，拿到线上 URL
第 5 步  绑定自定义域名       解决 workers.dev/pages.dev 在国内的访问问题
第 6 步  回填真实 URL         用自定义域名更新 Secrets，重新部署对齐
第 7 步  部署后必做           数据库初始化 + Stripe 生产 Webhook 配置
```

---

## 1. 部署前检查

### 1.1 确认 pnpm-lock.yaml 已提交到 git

GitHub Actions 在 runner 上执行 `pnpm install --frozen-lockfile` 时，**必须能读到 `pnpm-lock.yaml`**。如果这个文件没有提交，CI 会报错：

```
Error: Dependencies lock file is not found
```

检查方法：

```bash
git ls-files pnpm-lock.yaml
```

如果没有任何输出，说明文件未被追踪。检查 `.gitignore` 是否误加了这一行：

```
pnpm-lock.yaml   ← 删除这行
```

然后提交：

```bash
git add pnpm-lock.yaml .gitignore
git commit -m "fix: track pnpm-lock.yaml for CI"
git push origin main
```

### 1.2 URL 格式要求（必读）

本项目所有涉及 URL 的 Secret，**必须包含协议前缀 `https://`，且不能有尾部斜杠**。

| 正确 | 错误 |
|------|------|
| `https://api.yourdomain.com` | `api.yourdomain.com`（缺协议） |
| `https://vocab.yourdomain.com` | `https://vocab.yourdomain.com/`（多斜杠） |

缺少 `https://` 会触发 `BetterAuthError: Invalid base URL`，CORS 尾部斜杠不匹配会触发 CORS 拦截，两者都导致登录失败。

---

## 2. 工作流文件说明

仓库里已经有两个自动部署文件，不需要你新建：

| 文件 | 触发条件 | 作用 |
|------|---------|------|
| `.github/workflows/deploy-api.yml` | `projects/api/**` 有变更 | 部署后端到 Cloudflare Workers |
| `.github/workflows/deploy-client.yml` | `projects/client/**` 或 `projects/shared/**` 有变更 | 构建前端并部署到 Cloudflare Pages |

两个 workflow 都支持手动触发：仓库 → **Actions** → 选择对应 workflow → **Run workflow**。

**关于 pnpm 版本**：workflow 里没有指定 `version: 10`，因为 `package.json` 的 `packageManager` 字段已经声明了精确版本（`pnpm@10.x.x`）。`pnpm/action-setup@v4` 会自动读取这个字段。如果两处同时指定版本会冲突，报错：

```
Error: Multiple versions of pnpm specified
```

遇到这个报错，删掉 workflow 里 `pnpm/action-setup` 下的 `version:` 字段即可。

---

## 3. Cloudflare 端准备

### 3.1 获取 Account ID

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击左侧 **Workers & Pages** → **Overview**
3. 右侧边栏找到 **Account ID**，复制保存

> 这个值之后填到 GitHub Secret，Name 填 `CLOUDFLARE_ACCOUNT_ID`

### 3.2 创建 Pages 项目（前端，必须提前创建）

**为什么要提前创建**：Cloudflare Pages 不会在首次部署时自动新建项目，必须先存在一个同名项目，GitHub Actions 才能向它上传文件。

**用 wrangler CLI 创建（推荐，避免 Dashboard UI 的坑）**：

```bash
# 在项目根目录执行
npx wrangler login                                     # 打开浏览器授权，只需一次
npx wrangler pages project create vocab-master-client  # 创建 Pages 项目
```

执行后会提示选择 production branch，输入 `main`。

> **为什么不用 Dashboard 创建**：2026-02 验证时，点击 **Create application** 进入的是 Worker 创建页，不是 Pages。虽然底部有 "Looking to deploy Pages? Get started" 链接可以进入 Pages 创建，但那里又会出现两个选项：
> - **Import Git repository**：让 Cloudflare 接管 CI/CD，会和 GitHub Actions 冲突，**且一旦选了无法切换**，只能删项目重建。
> - **Drag and drop**：Direct Upload 模式，方向对，但需要上传占位文件才能完成创建，比较多余。
>
> 所以直接用 CLI 是最干净的方式。

> **关键**：项目名 `vocab-master-client` 必须和 `.github/workflows/deploy-client.yml` 里的 `--project-name=vocab-master-client` 完全一致。

项目创建后，Cloudflare 会分配默认域名：`https://vocab-master-client.pages.dev`

### 3.3 Workers 名称（后端，无需手动创建）

API 的 Worker 名称在 `projects/api/wrangler.jsonc` 里定义为 `vocab-master-api`，**首次部署时 Cloudflare 会自动创建同名 Worker**，无需提前在 Dashboard 建。

部署成功后，API 会分配默认域名：`https://vocab-master-api.<账号子域名>.workers.dev`

> 账号子域名可在 Cloudflare Dashboard → Workers & Pages → Overview 右侧看到。

---

## 4. 创建 API Token

入口：Cloudflare Dashboard **右上角头像** → **My Profile** → **API Tokens**

需要创建 **2 个**独立 Token，分别授权 Workers 和 Pages 的部署权限。两个 Token 权限不同，不能合并为一个。

> **GitHub Secret 在哪里填**：仓库主页 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**（详见第 5 节）

### Token A：给 Workers（后端部署）

1. 点击 **Create Token**
2. 选择模板：**Edit Cloudflare Workers**（已预设好所有必要权限）
3. 直接 **Continue to summary** → **Create Token**
4. 复制 Token → 填到 GitHub Secret，Name：`CLOUDFLARE_API_TOKEN_WORKERS`

### Token B：给 Pages（前端部署）

模板里没有 Pages 专用选项，需要手动创建：

1. 点击 **Create Token**
2. 选择 **Create Custom Token**
3. Permissions 添加：`Account` → `Cloudflare Pages` → `Edit`
4. Account Resources：选择你的账号
5. **Continue to summary** → **Create Token**
6. 复制 Token → 填到 GitHub Secret，Name：`CLOUDFLARE_API_TOKEN_PAGES`

---

## 5. 在 GitHub 仓库配置 Secrets

入口：仓库主页 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 5.1 Cloudflare 基础（3 个）

| Secret 名称 | 说明 |
|------------|------|
| `CLOUDFLARE_ACCOUNT_ID` | 第 3.1 节获取的 Account ID |
| `CLOUDFLARE_API_TOKEN_WORKERS` | Token A |
| `CLOUDFLARE_API_TOKEN_PAGES` | Token B |

### 5.2 后端运行时 Secrets（11 个）

这些值会由 deploy-api workflow 自动同步到 Cloudflare Workers Secrets，**不需要在 Cloudflare Dashboard 手动维护**。

⚠️ 所有 URL 类型的值必须包含 `https://`，不能有尾部斜杠（见第 1.2 节）。

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `DATABASE_URL` | Neon PostgreSQL HTTP URL | `https://xxx.neon.tech/...` |
| `BETTER_AUTH_SECRET` | 随机字符串，用于 session 加密 | 32 位以上随机字符串 |
| `BETTER_AUTH_URL` | **API 的完整地址**（Better Auth 用来生成回调链接） | `https://api.yourdomain.com` |
| `GOOGLE_NLP_API_KEY` | Google Cloud NLP 密钥 | — |
| `AIHUBMIX_API_KEY` | AIHubMix API 密钥 | — |
| `RESEND_API_KEY` | Resend 邮件服务密钥 | — |
| `STRIPE_SECRET_KEY` | Stripe 后端密钥 | `sk_live_xxx` 或 `sk_test_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 签名密钥 | `whsec_xxx`（第 8.2 节获取） |
| `STRIPE_PRICE_MONTHLY` | Stripe 月付价格 ID | `price_xxx` |
| `STRIPE_PRICE_YEARLY` | Stripe 年付价格 ID | `price_xxx` |
| `FRONTEND_URL` | **前端的完整地址**，用于 API 的 CORS 校验 | `https://vocab.yourdomain.com` |

> **FRONTEND_URL 的重要性**：API 的 CORS 中间件对 origin 做严格字符串比较，`FRONTEND_URL` 必须和浏览器发出请求时的 origin 完全一致，包括协议和域名，任何差异都会导致 CORS 拦截，表现为登录/所有请求失败。

### 5.3 前端构建 Secrets（2 个）

这两个值在 GitHub Actions 构建前端时注入为环境变量，**会被打包进前端产物**（`VITE_` 前缀是 Vite 的约定）：

| Secret 名称 | 说明 |
|------------|------|
| `VITE_API_URL` | API 地址（与 `BETTER_AUTH_URL` 相同） |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe 前端公钥（`pk_live_xxx` 或 `pk_test_xxx`） |

---

## 6. 首次部署

### 6.1 解决 URL 循环依赖

第一次部署时存在一个顺序问题：
- `BETTER_AUTH_URL` / `VITE_API_URL` 需要 API 域名 → 但 API 还没部署，不知道确切域名
- `FRONTEND_URL` 需要前端域名 → 但前端还没部署

**解决方法**：先用**可预知的默认域名**填入，部署成功拿到真实地址后再更新。

- `FRONTEND_URL` 先填：`https://vocab-master-client.pages.dev`（Pages 域名在创建项目时就确定了）
- `BETTER_AUTH_URL` / `VITE_API_URL` 先填：`https://vocab-master-api.<账号子域名>.workers.dev`

如果不确定账号子域名，可以先填占位值，等第一次部署后在 Cloudflare Dashboard 查到真实域名再更新。

### 6.2 推送触发部署

所有 Secrets 配置完成后，推送到 `main` 即可触发两个 workflow：

```bash
git push origin main
```

或在 GitHub → **Actions** 页面手动点 **Run workflow**。

### 6.3 查看部署结果

仓库 → **Actions**，找到：
- `Deploy API to Cloudflare Workers`
- `Deploy Client to Cloudflare Pages`

任意一个失败，点进去展开红色报错步骤，查看具体原因。常见原因见第 9 节。

---

## 7. 绑定自定义域名（强烈推荐）

### 为什么要绑定

Cloudflare 分配的默认域名 `workers.dev` 和 `pages.dev`，在中国大陆均存在 DNS 污染或被屏蔽的问题：
- `workers.dev`：被稳定屏蔽，国内基本无法直接访问
- `pages.dev`：时好时坏，不稳定

**如果你有国内的访问需求（本人测试、国内招聘方查看 demo），必须绑定自己的域名**。绑定后走 Cloudflare 的标准 CDN，不受默认子域名屏蔽影响，同时也更专业。

> **前提**：你需要有一个已购买的域名，并将其添加到 Cloudflare 账户（Dashboard → Websites → Add a site）进行 DNS 管理。

### 7.1 为 API Worker 绑定自定义域名

1. Cloudflare Dashboard → **Workers & Pages** → **vocab-master-api**
2. 进入 **Settings** → **Domains & Routes**
3. 点击 **Add Custom Domain**
4. 填入：`api.yourdomain.com`（`api.` 前缀是惯例，可自定义）
5. Cloudflare 自动签发 SSL 证书，等待几分钟生效

> **注意**：不能填 `vocab-master-api.workers.dev` 这类 workers.dev 地址，那是 Cloudflare 的域名不是你的，系统会报错 "Only domains active on your Cloudflare account can be added"。

### 7.2 为 Client Pages 绑定自定义域名

1. Cloudflare Dashboard → **Workers & Pages** → **vocab-master-client**
2. 进入 **Custom Domains**
3. 点击 **Add Custom Domain**
4. 填入：`vocab.yourdomain.com`（或根域名 `yourdomain.com`）
5. Cloudflare 自动处理 DNS 和证书

### 7.3 更新 Secrets 并重新部署

绑定自定义域名后，之前填的 `.workers.dev` / `.pages.dev` 地址需要更新：

| Secret | 更新为 |
|--------|--------|
| `BETTER_AUTH_URL` | `https://api.yourdomain.com` |
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `FRONTEND_URL` | `https://vocab.yourdomain.com` |

更新 Secrets 后，**必须手动触发两个 workflow 重新部署**，新的环境变量才会生效（单纯改 Secrets 不会自动触发重新部署）。

> **FRONTEND_URL 常见遗漏**：添加自定义域名后，很容易忘记更新 `FRONTEND_URL`，导致 CORS 校验仍然对比旧的 pages.dev 地址，表现为前端能打开但登录失败，报 CORS 错误。

---

## 8. 部署后必做（首次上线）

### 8.1 数据库初始化

应用部署好后数据库是空的，需要在**本地**执行以下操作：

**Step 1：推送 Schema**

```bash
cd projects/api
npx drizzle-kit push
```

**Step 2：初始化配额配置**

`quota_configs` 表为空时，所有文章分析请求会直接返回 500。

方法一：Neon Dashboard → SQL Editor，粘贴 `projects/api/scripts/init-quota-config.sql` 执行

方法二：命令行

```bash
cd projects/api
npx tsx scripts/init-quota-config.ts
```

脚本幂等，可安全重复执行。

**Step 3：初始化词汇库**

不初始化则生词识别功能不可用，见 `projects/api/scripts/README.md`。

### 8.2 配置 Stripe 生产 Webhook

本地开发用 Stripe CLI 转发，但**线上环境需要在 Stripe Dashboard 单独配置**，否则付款后订阅等级不会更新：

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. 点击 **Add endpoint**
3. Endpoint URL 填写：`https://api.yourdomain.com/api/payment/webhook`
4. 选择监听的事件：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. 创建后点击该 Webhook → **Signing secret** → **Reveal**，复制 `whsec_xxx`
6. 更新 GitHub Secret：`STRIPE_WEBHOOK_SECRET` 改为这个新值
7. 手动触发 deploy-api workflow 重新部署，让新 Secret 生效

---

## 9. 常见问题排查

| 现象 | 原因 | 解决 |
|------|------|------|
| `Error: Multiple versions of pnpm specified` | workflow 里指定了 `version:` 且 package.json 也有 `packageManager` | 删除 workflow 里 `pnpm/action-setup` 下的 `version:` 字段 |
| `Error: Dependencies lock file is not found` | `pnpm-lock.yaml` 未提交到 git（在 .gitignore 里）| 从 .gitignore 删除，提交到 git（见第 1.1 节） |
| client 部署失败：`npm error Unsupported URL Type "workspace:*"` | wrangler-action 找不到 wrangler，用 npm 安装时遇到 monorepo workspace 协议 | deploy-client.yml 中 Deploy Pages 步骤前加 `pnpm add -g wrangler` |
| 前端部署失败：`project not found` | `--project-name` 和 Cloudflare Pages 项目名不一致 | 确认 Dashboard 里的项目名，同步修改 workflow |
| `BetterAuthError: Invalid base URL` | `BETTER_AUTH_URL` 缺少 `https://` 前缀 | 加上完整协议前缀 |
| 登录报 CORS 错误 | `FRONTEND_URL` 与浏览器实际访问的 origin 不一致 | 确认 `FRONTEND_URL` 值与浏览器地址栏完全一致，无尾部斜杠 |
| 分析文章返回 500 | `quota_configs` 表未初始化 | 执行第 8.1 节数据库初始化 |
| 付款后仍显示 free | Stripe Webhook 未配置或 Secret 错误 | 执行第 8.2 节 |
| 改了 Secrets 但线上无变化 | 改 Secrets 不触发重新部署 | 手动点 workflow_dispatch 重新部署 |
| 直接访问 workers.dev 报 SSL 错误 | workers.dev 在中国大陆被屏蔽，或代理软件干扰 TLS | 绑定自定义域名（见第 7 节） |

---

## 10. 本仓库关键文件位置

| 文件 | 说明 |
|------|------|
| `.github/workflows/deploy-api.yml` | 后端部署 workflow |
| `.github/workflows/deploy-client.yml` | 前端部署 workflow |
| `projects/api/wrangler.jsonc` | Workers 配置（名称、路由等） |
| `projects/api/src/index.ts` | CORS 配置（读取 `FRONTEND_URL`） |
| `projects/api/src/types/bindings.ts` | 后端环境变量类型定义 |
| `projects/client/src/lib/api-client.ts` | 前端 API 地址读取 |
| `projects/api/scripts/init-quota-config.sql` | 配额初始化脚本 |

---

## 11. CI/CD 基础概念

> 本节是背景知识，帮助理解 GitHub Actions 在本项目中的作用。

### CI/CD 是什么

- **CI（持续集成，Continuous Integration）**：每次提交代码，自动执行测试、类型检查、代码风格检查，确保新代码不破坏已有功能
- **CD（持续部署，Continuous Delivery/Deployment）**：CI 通过后，自动把代码构建并部署到服务器

**GitHub Actions 是实现 CI/CD 的工具**，流程用 `.github/workflows/` 里的 yml 文件描述。

### 典型的完整 CI/CD 流程

```
开发者 push 代码
      ↓
GitHub Actions 触发
      ↓
  [ CI 阶段 ]
  1. 安装依赖
  2. 代码风格检查（lint）
  3. 类型检查（tsc --noEmit）
  4. 运行单元/集成测试
      ↓ 全部通过
  [ CD 阶段 ]
  5. 构建产物
  6. 部署到生产环境
  7. 发送通知
```

### 本项目当前状态：只有 CD，没有 CI

当前的两个 workflow 只做构建和部署，没有测试和类型检查。对个人项目完全可以接受。

如果后续想加 CI，在 `Build` 步骤前插入即可：

```yaml
- name: Type check
  run: pnpm --filter client exec tsc --noEmit

- name: Lint
  run: pnpm --filter client lint
```

### 为什么 CI 中还要跑测试，本地不是已经跑了吗？

本地测试和 CI 测试解决的是不同问题：

| 场景 | 本地测试 | CI 测试 |
|------|---------|---------|
| 忘记跑测试就提交 | ❌ 无法防止 | ✅ 强制执行 |
| 多人协作代码合并冲突 | ❌ 看不到 | ✅ 在合并后跑 |
| 环境差异（"我本地是好的"）| ❌ 只有你的环境 | ✅ 标准干净环境 |
| 阻止有问题的代码上线 | ❌ 靠自觉 | ✅ 测试失败则不部署 |

### 触发规则说明

本项目 workflow 用了 `paths` 过滤，**不是每次 push 都触发**：

```yaml
on:
  push:
    branches: [main]
    paths:
      - "projects/api/**"   # 只有这些路径改动才触发 api 部署
```

只改文档或配置文件？不触发。只改前端？只跑 client workflow。这样避免了不必要的部署消耗。

---

## 12. 官方文档

- [Workers + GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Pages Direct Upload + CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [获取 Account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
- [wrangler-action](https://github.com/cloudflare/wrangler-action)
- [Stripe Webhook 文档](https://docs.stripe.com/webhooks)
