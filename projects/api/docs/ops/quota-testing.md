# 配额系统测试指南

> **受众**: 开发者  
> **用途**: 测试配额功能的快速参考

---

## 初始化配额配置

```bash
cd projects/api
npx tsx scripts/init-quota-config.ts
```

验证输出显示 `free` 和 `premium` 两条记录。

## 快速测试

### 1. 生成测试文本

浏览器控制台:
```javascript
// 1000 词 (边界值)
console.log("word ".repeat(1000).trim());

// 1001 词 (超限)
console.log("word ".repeat(1001).trim());
```

### 2. 前端测试

1. 登录并进入 Dashboard
2. 查看配额卡片: 显示 "剩余 2 / 2 次"
3. 粘贴 1000 词文本 → 分析成功
4. 粘贴 1001 词文本 → 按钮禁用，提示超限
5. 再分析一篇 → 配额变为 "剩余 0 / 2 次"
6. 尝试第 3 次分析 → 弹出升级弹窗

### 3. API 测试

查询配额:
```bash
curl http://localhost:3000/api/users/me/quota \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
```

字数超限测试:
```bash
curl -X POST http://localhost:3000/api/text/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{"content": "'"$(node -e "console.log('word '.repeat(1001))")"'"}'
```

## 测试 Premium 用户

临时升级用户:
```sql
INSERT INTO subscriptions (user_id, tier, status, started_at, expires_at)
VALUES (YOUR_USER_ID, 'premium', 'active', NOW(), NOW() + INTERVAL '30 days');
```

验证:
- 配额卡片显示 "剩余 50 / 50 次"
- 可提交 5000 词文章
- 5001 词被拒绝

## 常见问题

**配额不刷新**: 检查 `refetchQuota()` 是否被调用  
**字数统计不准**: 前后端使用相同的 `split(/\s+/)` 逻辑  
**跨天未重置**: 检查服务器时区设置（应为 UTC）

