# 邮件系统技术规范

> **受众**: AI (Cursor/Claude)  
> **用途**: 邮件系统记忆库，Resend 集成和模板管理

---

## 核心功能

| 功能 | 状态 |
|------|------|
| 邮箱验证邮件 | ✅ |
| 密码重置邮件 | ✅ |

---

## 技术架构

### 技术选型

- **邮件服务商**: Resend
- **发件域名**: `kaili.dev`（需在 Resend 验证）
- **发件地址**: `noreply@kaili.dev`
- **邮件格式**: 纯文本
- **邮件语言**: 中文

### 数据流

```
Better Auth 触发钩子
  ↓
EmailService.sendVerificationEmail()
  ↓
Resend API (HTTP 请求)
  ↓
用户邮箱
```

---

## EmailService 实现

### 类定义

```typescript
// service/email.service.ts
import { Resend } from "resend";

export class EmailService {
  private resend: Resend;
  private fromEmail = "noreply@kaili.dev";

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }
}
```

### 方法

#### sendVerificationEmail

```typescript
async sendVerificationEmail(
  to: string,
  userName: string,
  verificationUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: to,
      subject: "验证您的 Vocab Master 账号",
      text: `您好 ${userName},\n\n感谢您注册 Vocab Master...`,
    });

    if (error) {
      console.error("❌ [EmailService] 发送验证邮件失败:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [EmailService] 验证邮件发送成功:", data?.id);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, error: errorMessage };
  }
}
```

#### sendPasswordResetEmail

```typescript
async sendPasswordResetEmail(
  to: string,
  userName: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await this.resend.emails.send({
    from: this.fromEmail,
    to: to,
    subject: "重置您的 Vocab Master 密码",
    text: `您好 ${userName},\n\n我们收到了重置密码的请求...`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

---

## Better Auth 集成

### emailVerification 配置

```typescript
// auth/auth.ts
emailVerification: {
  sendVerificationEmail: async ({ user, url, token }) => {
    const emailService = new EmailService(c.env.RESEND_API_KEY);
    const result = await emailService.sendVerificationEmail(
      user.email,
      user.name,
      url  // Better Auth 已生成完整链接
    );

    if (!result.success) {
      console.error("❌ [Better Auth] 邮件发送失败:", result.error);
    }
  },
  sendOnSignUp: true,  // 注册时自动发送
  autoSignInAfterVerification: false,
  expiresIn: 86400,  // 24小时
}
```

### forgetPassword 配置

```typescript
// auth/auth.ts
forgetPassword: {
  sendResetPassword: async ({ user, url, token }) => {
    const emailService = new EmailService(c.env.RESEND_API_KEY);
    await emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      url
    );
  },
  expiresIn: 3600,  // 1小时
}
```

---

## 邮件模板

### 验证邮件

```
主题：验证您的 Vocab Master 账号

正文：
您好 ${userName},

感谢您注册 Vocab Master！请点击下面的链接来验证您的邮箱地址：

${verificationUrl}

此链接将在 24 小时内有效。如果您没有注册 Vocab Master，请忽略此邮件。

祝您学习愉快！
Vocab Master 团队
```

### 密码重置邮件

```
主题：重置您的 Vocab Master 密码

正文：
您好 ${userName},

我们收到了重置密码的请求。请点击下面的链接来设置新密码：

${resetUrl}

此链接将在 1 小时内有效。如果您没有请求重置密码，请忽略此邮件。

Vocab Master 团队
```

---

## 环境变量

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxx...
```

### 类型定义

```typescript
// types/bindings.ts
export type Bindings = {
  // ...
  RESEND_API_KEY: string;
};
```

---

## Cloudflare Workers 兼容性

### Resend SDK 兼容性

✅ **完全兼容** Cloudflare Workers

- 使用 `fetch` API（Web 标准）
- 无 Node.js 原生依赖
- 支持 Edge Runtime

### fetch 配置

Resend SDK 自动使用全局 `fetch`，无需额外配置。

---

## Resend 配置

### 1. 注册账号

访问 [resend.com](https://resend.com/)

### 2. 验证域名

**Dashboard → Domains → Add Domain**

添加 DNS 记录：
- SPF: `TXT @ v=spf1 include:resend.com ~all`
- DKIM: Resend 提供的 CNAME 记录

### 3. 创建 API Key

**Dashboard → API Keys → Create API Key**

权限：
- `emails:send` - 发送邮件

---

## 测试

### 本地测试

```bash
# 启动后端
cd projects/api
npm run dev

# 测试注册（会触发邮件发送）
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"测试用户"}'

# 查看终端日志
# ✅ 邮件发送成功会显示：
# ✅ [EmailService] 验证邮件发送成功: re_xxxxxx
```

### 验证邮件到达

1. 登录 Resend Dashboard
2. 进入 **Logs** 查看发送记录
3. 查看邮件状态（Sent / Delivered / Bounced）

---

## 故障排查

### 问题 1：邮件未发送

**检查清单**：
1. `RESEND_API_KEY` 是否配置
2. 域名是否已验证
3. 发件地址是否匹配验证的域名
4. 查看后端日志错误信息

### 问题 2：邮件进入垃圾箱

**解决方案**：
1. 确保域名 SPF 和 DKIM 记录正确
2. 使用已验证的域名发送
3. 避免触发垃圾邮件关键词

### 问题 3：Resend API 限流

**免费计划限制**：
- 100 封/天
- 3,000 封/月

**解决方案**：升级到付费计划或优化邮件触发逻辑。

---

## 生产环境配置

### Cloudflare Workers 环境变量

```bash
# 通过 wrangler 设置
wrangler secret put RESEND_API_KEY
```

或在 Cloudflare Dashboard 配置：
**Workers → 项目 → Settings → Variables**

### trustedOrigins 更新

```typescript
// auth/auth.ts
trustedOrigins: [
  "http://localhost:5173",
  "https://yourdomain.com",  // ← 添加生产域名
]
```

---

## 关键文件

- `src/service/email.service.ts` - 邮件服务
- `src/auth/auth.ts` - Better Auth 钩子
- `src/types/bindings.ts` - 环境变量类型

---

## 注意事项

1. **Better Auth 的 `url` 参数已包含完整链接**：直接使用，无需拼接
2. **异步发送**：邮件发送失败不应阻塞用户注册
3. **日志记录**：记录发送成功/失败日志，便于排查问题
4. **域名验证**：生产环境必须使用已验证的域名

