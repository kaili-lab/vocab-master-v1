# 部署操作指南

> **受众**: 开发者  
> **用途**: 部署步骤和环境配置

---

## 运行模式

| 模式 | 启动命令 | 环境变量文件 | 用途 |
|------|---------|------------|------|
| **Cloudflare Workers** | `pnpm dev:cf` | `.dev.vars` | 生产环境 + 边缘计算 |
| **Node.js** | `pnpm dev` | `.env` | 本地开发 + 服务器部署 |

---

## 本地开发

### Cloudflare Workers 模式

```bash
cd projects/api

# 1. 配置环境变量（.dev.vars）
# 已存在，确认配置正确

# 2. 启动开发服务器
pnpm dev:cf

# 访问 http://localhost:3000
```

### Node.js 模式

```bash
cd projects/api

# 1. 创建 .env 文件（从 .dev.vars 复制）
cp .dev.vars .env

# 2. 添加 Node.js 特定变量
echo "PORT=3000" >> .env
echo "NODE_ENV=development" >> .env

# 3. 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

---

## 部署到 Cloudflare Workers

### 首次部署

```bash
# 1. 登录 Cloudflare
wrangler login

# 2. 配置生产环境密钥
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put GOOGLE_NLP_API_KEY
wrangler secret put AIHUBMIX_API_KEY

# 3. 部署
cd projects/api
pnpm deploy
```

### 后续更新

```bash
cd projects/api
pnpm deploy
```

部署后输出：
```
✨ Published vocab-master-api (1.23 sec)
   https://vocab-master-api.your-subdomain.workers.dev
```

---

## 部署到 Node.js 服务器

### 构建

```bash
cd projects/api

# 1. 类型检查
pnpm build

# 2. （可选）如果需要编译
# 修改 tsconfig.json，移除 emitDeclarationOnly
```

### 生产环境运行

```bash
# 使用 pm2 或其他进程管理器
pm2 start src/index.node.ts --name vocab-master-api

# 或直接运行
pnpm start
```

---

## 环境变量清单

### 必需

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://api.yourdomain.com

# AI
GOOGLE_NLP_API_KEY=xxx
AIHUBMIX_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_YEARLY=price_xxx
FRONTEND_URL=https://yourdomain.com

# Email
RESEND_API_KEY=re_xxx
```

### 可选

```bash
PORT=3000  # Node.js 模式
NODE_ENV=production
```

---

## wrangler 配置

### wrangler.jsonc

```jsonc
{
  "name": "vocab-master-api",
  "main": "src/index.ts",  // TypeScript 源码
  "compatibility_date": "2024-11-27",
  "node_compat": true,

  "vars": {
    // 非敏感变量（可选）
    "ENVIRONMENT": "production"
  }
}
```

### 多环境配置

```jsonc
{
  "env": {
    "staging": {
      "name": "vocab-master-api-staging",
      "vars": {
        "ENVIRONMENT": "staging"
      }
    },
    "production": {
      "name": "vocab-master-api",
      "vars": {
        "ENVIRONMENT": "production"
      }
    }
  }
}
```

部署到特定环境：
```bash
wrangler deploy --env staging
wrangler deploy --env production
```

---

## Cloudflare Dashboard 配置

### 1. 环境变量

**Workers → 项目 → Settings → Variables**

添加所有必需的环境变量（加密存储）

### 2. 自定义域名

**Workers → 项目 → Triggers → Custom Domains**

添加域名：`api.yourdomain.com`

### 3. 路由规则

**Workers → 项目 → Triggers → Routes**

配置路由：`api.yourdomain.com/*`

---

## CI/CD (GitHub Actions)

### .github/workflows/deploy-api.yml

```yaml
name: Deploy API to Cloudflare Workers

on:
  push:
    branches: [main]
    paths:
      - "projects/api/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Type check
        run: cd projects/api && pnpm build
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: projects/api
          command: deploy --minify
```

---

## 故障排查

### 问题 1：部署失败

```bash
# 检查 wrangler 版本
wrangler --version

# 重新登录
wrangler logout
wrangler login
```

### 问题 2：环境变量未生效

```bash
# 检查环境变量
wrangler secret list

# 重新设置
wrangler secret put DATABASE_URL
```

### 问题 3：构建错误

```bash
# 清理缓存
rm -rf node_modules .wrangler
pnpm install
```

---

## 回滚部署

```bash
# 查看部署历史
wrangler deployments list

# 回滚到指定版本
wrangler rollback <deployment-id>
```

---

## 监控和日志

### 实时日志

```bash
wrangler tail
```

### Cloudflare Dashboard

**Workers → 项目 → Metrics**

查看：
- 请求量
- 错误率
- CPU 使用时间
- 响应时间

---

## 关键文件

- `wrangler.jsonc` - Cloudflare Workers 配置
- `.dev.vars` - 本地环境变量（不提交）
- `.dev.vars.example` - 环境变量示例
- `src/index.ts` - Cloudflare Workers 入口
- `src/index.node.ts` - Node.js 入口（如果存在）

