# Stripe 支付集成技术规范

> **受众**: AI (Cursor/Claude)  
> **用途**: 技术记忆库，用于理解 Stripe 订阅系统的完整实现细节

---

## 核心规则

| 计费周期 | 价格  | Stripe Price ID 环境变量    |
| -------- | ----- | --------------------------- |
| 月付     | $7    | `STRIPE_PRICE_MONTHLY`      |
| 年付     | $67   | `STRIPE_PRICE_YEARLY`       |

## 订阅生命周期状态机

```
[首次购买]
  ↓
active (订阅激活)
  ↓
  ├─ [续费成功] → active (更新 expiresAt)
  ├─ [续费失败] → past_due → (重试) → cancelled
  ├─ [主动取消] → cancelled (但 expiresAt 前仍可用)
  └─ [自然过期] → expired
```

## Webhook 事件处理

| 事件                               | 触发时机         | 数据库操作                                    |
| ---------------------------------- | ---------------- | --------------------------------------------- |
| `checkout.session.completed`       | 支付会话完成     | INSERT 订阅记录 (tier=premium, status=active) |
| `customer.subscription.created`    | 订阅创建         | UPSERT 订阅记录                               |
| `customer.subscription.updated`    | 订阅状态变更     | UPDATE status, expiresAt                      |
| `customer.subscription.deleted`    | 订阅取消/到期    | UPDATE status=cancelled, cancelledAt=now      |
| `invoice.paid`                     | 支付成功         | UPDATE lastPaymentAt                          |
| `invoice.payment_failed`           | 支付失败         | 记录日志（未来：发邮件通知）                  |
| `customer.subscription.trial_will_end` | 试用即将结束 | 记录日志（未来：发邮件提醒）                  |

## 数据模型

```typescript
// subscriptions 表
{
  userId: number,
  tier: "free" | "premium",
  status: "active" | "cancelled" | "expired" | "trial",
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  stripePriceId: string,
  paymentProvider: "stripe",
  paymentId: string,
  amount: string, // "7.00" or "67.00"
  currency: "USD",
  startedAt: Date,
  expiresAt: Date,
  cancelledAt: Date | null,
  lastPaymentAt: Date | null,
}
```

## API 契约

### POST /api/payment/create-checkout-session

**请求**:
```json
{
  "billingPeriod": "monthly" | "yearly"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "sessionId": "cs_test_..."
  }
}
```

### GET /api/users/me/subscription

**响应 (有订阅)**:
```json
{
  "success": true,
  "data": {
    "tier": "premium",
    "status": "active",
    "amount": "7.00",
    "currency": "USD",
    "startedAt": "2025-01-01T00:00:00Z",
    "expiresAt": "2025-02-01T00:00:00Z"
  }
}
```

**响应 (无订阅)**:
```json
{
  "success": true,
  "data": null
}
```

### POST /api/payment/cancel-subscription

**请求**:
```json
{
  "subscriptionId": "sub_xxx"
}
```

### POST /api/payment/webhook

**验证**: 使用 `stripe.webhooks.constructEvent()` 验证签名  
**处理**: 根据 `event.type` 分发到对应 handler  
**响应**: `{ received: true }` (200 状态码)

## 支付回调 URL

- 成功: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`
- 取消: `${FRONTEND_URL}/payment-cancel`

**重要**: 使用 `FRONTEND_URL` 环境变量（默认 `http://localhost:5173`），不是 `BETTER_AUTH_URL`（后端地址）

## 环境变量

### 后端 (`.dev.vars`)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
FRONTEND_URL=http://localhost:5173
```

### 前端 (`.env`)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 关键文件

- `src/service/stripe.service.ts` - Stripe SDK 封装，Webhook handler
- `src/route/payment.route.ts` - 支付相关 API 路由
- `src/types/bindings.ts` - Stripe 环境变量类型定义

## 前端页面

- `/checkout` - 选择计费周期，创建 Checkout Session
- `/payment-success` - 支付成功页，5秒后自动跳转到 Dashboard
- `/payment-cancel` - 支付取消页
- `/subscription` - 订阅管理页，查看/取消订阅

## 安全要点

1. **Webhook 签名验证**: 所有 Webhook 请求必须验证 `stripe-signature` 头
2. **幂等性**: Webhook handler 必须支持重复调用（Stripe 可能重试）
3. **环境隔离**: 测试模式使用 `sk_test_` 和 `pk_test_`，生产使用 `sk_live_` 和 `pk_live_`
4. **前端隔离**: 永远不要将 `STRIPE_SECRET_KEY` 暴露给前端

## 事件触发顺序（首次购买）

```
1. checkout.session.completed
2. customer.subscription.created
3. invoice.paid
```

## 事件触发顺序（每月续费）

```
1. invoice.paid
2. customer.subscription.updated
```

## 测试卡号

- **成功**: `4242 4242 4242 4242`
- **失败**: `4000 0000 0000 0002`
- 过期日期: 任意未来日期
- CVC: 任意 3 位数字

