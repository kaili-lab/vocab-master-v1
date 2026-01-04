# 配额系统技术规范

> **受众**: AI (Cursor/Claude)  
> **用途**: 技术记忆库，用于理解配额系统的完整实现细节

---

## 核心规则

| 等级    | 每日次数 | 单篇字数 | 价格       |
| ------- | -------- | -------- | ---------- |
| free    | 2        | 1000     | $0（永久） |
| premium | 50       | 5000     | $7/月      |

## 数据流

```
用户请求 POST /api/text/analyze
  ↓
quotaCheck 中间件拦截
  ↓
查询用户订阅等级（subscriptions 表）
  ↓
查询配额配置（quotaConfigs 表）
  ↓
查询今日使用量（userLearningStats 表）
  ↓
判断 remainingToday > 0
  ├─ 是：扣费（articlesAnalyzedCount + 1），注入 quotaInfo 到上下文
  └─ 否：返回 429 错误
  ↓
text.route 字数验证
  ↓
计算 wordCount = content.split(/\s+/).filter(w => w.trim()).length
  ↓
判断 wordCount <= quotaInfo.maxArticleWords
  ├─ 是：继续处理
  └─ 否：返回 400 错误，包含 wordCount 和 tier 信息
```

## 数据模型

```typescript
// quotaConfigs 表
{
  tier: "free" | "premium",
  dailyArticlesLimit: number,
  maxArticleWords: number,
}

// subscriptions 表
{
  userId: number,
  tier: "free" | "premium",
  status: "active" | "cancelled" | "expired",
  expiresAt: Date,
}

// userLearningStats 表
{
  userId: number,
  date: Date, // 零点时间戳，UTC
  articlesAnalyzedCount: number,
}
```

## API 契约

### GET /api/users/me/quota

**响应**:
```json
{
  "success": true,
  "data": {
    "tier": "free",
    "dailyLimit": 2,
    "usedToday": 1,
    "remainingToday": 1,
    "maxArticleWords": 1000
  }
}
```

### POST /api/text/analyze

**错误响应 (429 - 次数超限)**:
```json
{
  "success": false,
  "error": "您已达到每日 2 次文章分析的限制，请升级订阅或明天再试",
  "quota": {
    "tier": "free",
    "dailyLimit": 2,
    "usedToday": 2,
    "remainingToday": 0
  }
}
```

**错误响应 (400 - 字数超限)**:
```json
{
  "success": false,
  "error": "您的文章有 1001 词，超过了免费版 1000 词的限制。升级到专业版可分析最多 5000 词的文章。",
  "wordCount": 1001,
  "maxWords": 1000,
  "tier": "free"
}
```

## 关键文件

- `src/middleware/quota-check.middleware.ts` - 配额检查和扣费逻辑
- `src/route/text.route.ts` - 字数验证逻辑
- `src/route/user.route.ts` - 配额查询 API
- `src/service/article.service.ts` - `calculateWordCount()` 函数
- `scripts/init-quota-config.ts` - 初始化配额配置

## 前端集成

- `hooks/use-quota.ts` - React Query Hook
- `components/dashboard/quota-info.tsx` - 配额卡片
- `components/dashboard/upgrade-modal.tsx` - 升级引导弹窗
- `components/dashboard/article-analysis.tsx` - 实时字数统计 + 前端验证

## 边界情况

1. **跨天重置**: 配额按 UTC 日期重置，查询时使用 `date = startOfDay(now, 'UTC')`
2. **并发请求**: `articlesAnalyzedCount` 使用 `sql` 原子递增，防止竞态
3. **订阅过期**: 过期后自动降级为 `free`，由 Stripe Webhook 处理
4. **配置缺失**: 如果 `quotaConfigs` 表缺少对应 tier，返回 500 错误

