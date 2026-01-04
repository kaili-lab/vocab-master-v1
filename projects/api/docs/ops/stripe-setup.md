# Stripe 配置操作指南

> **受众**: 开发者  
> **用途**: 首次配置 Stripe 的步骤清单

---

## 前置准备

- [ ] 注册 Stripe 账号: https://dashboard.stripe.com/

## 配置步骤

### 1. 获取 API 密钥

1. 切换到 **测试模式**
2. 进入 **开发者 → API keys**
3. 复制密钥:
   - `pk_test_...` (可发布密钥) → 前端 `.env`
   - `sk_test_...` (秘密密钥) → 后端 `.dev.vars`

### 2. 创建产品和价格

1. 进入 **产品 → 添加产品**
2. 产品名称: `Vocab Master Pro`
3. 添加价格:
   - 月付: $7.00/月 → 复制 `price_xxx` → `STRIPE_PRICE_MONTHLY`
   - 年付: $67.00/年 → 复制 `price_yyy` → `STRIPE_PRICE_YEARLY`

### 3. 配置 Webhook

1. 进入 **开发者 → Webhooks → 添加端点**
2. URL: `http://localhost:3000/api/payment/webhook` (开发环境)
3. 选择事件:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.paid`
   - `invoice.payment_failed`
4. 复制 `whsec_...` → `STRIPE_WEBHOOK_SECRET`

### 4. 配置环境变量

**后端** (`projects/api/.dev.vars`):
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
FRONTEND_URL=http://localhost:5173
```

**前端** (`projects/client/.env`):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 本地测试

### 安装 Stripe CLI

**Windows**:
```bash
scoop install stripe
```

**macOS**:
```bash
brew install stripe/stripe-cli/stripe
```

### 启动 Webhook 转发

```bash
stripe login
stripe listen --forward-to localhost:3000/api/payment/webhook
```

> 复制输出的 `whsec_...` 到 `.dev.vars`

### 测试支付

1. 启动后端和前端
2. 访问 `/checkout`
3. 使用测试卡: `4242 4242 4242 4242`
4. 过期日期: `12/34`, CVC: `123`

## 生产环境

1. 切换到 **实时模式**
2. 重复上述步骤，使用 `sk_live_` 和 `pk_live_` 密钥
3. Webhook URL 改为生产域名: `https://api.yourdomain.com/api/payment/webhook`
4. 在 Cloudflare Dashboard 配置环境变量

## 故障排查

- Webhook 未触发: 检查 Stripe CLI 是否运行
- 签名验证失败: 检查 `STRIPE_WEBHOOK_SECRET` 是否正确
- 支付后未创建订阅: 查看后端日志，检查数据库连接

## 参考链接

- Stripe 文档: https://stripe.com/docs
- 测试卡号: https://stripe.com/docs/testing

