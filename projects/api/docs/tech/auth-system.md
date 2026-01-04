# 认证系统技术规范

> **受众**: AI (Cursor/Claude)  
> **用途**: 认证记忆库，包含注册、登录、邮箱验证流程

---

## 核心功能

| 功能 | 实现方式 | 状态 |
|------|---------|------|
| **手机号注册** | 手机号 + 验证码 + 用户名 | ✅ |
| **邮箱注册** | 邮箱 + 密码 + 用户名 + 邮箱验证 | ✅ |
| **手机号登录** | 手机号 + 验证码 | ✅ |
| **邮箱登录** | 邮箱 + 密码 | ✅ |
| **密码重置** | 邮箱验证 + 新密码 | ✅ |
| **Session 管理** | HttpOnly Cookie (30天) | ✅ |

---

## 注册流程

### 手机号注册

```
前端
  ↓
1. 用户填写：用户名、手机号、邮箱（可选）
  ↓
2. 点击"获取验证码" → POST /api/auth/send-code
  ↓
3. 输入验证码
  ↓
4. 提交 → authClient.phoneNumber.verify({ phoneNumber, code })
  ↓
5. 验证成功 → PATCH /api/auth/complete-registration
   - 请求体：{ name, email? }
   - 密码：不需要（手机号注册无需密码）
  ↓
6. 创建 session → 跳转到 /dashboard
```

### 邮箱注册

```
前端
  ↓
1. 用户填写：用户名、邮箱、密码、确认密码
  ↓
2. 提交 → signUp.email({
     email, password, name,
     callbackURL: window.location.origin + "/login"
   })
  ↓
后端 (Better Auth)
  ↓
3. 创建用户 (emailVerified = false)
  ↓
4. 生成 verification token
  ↓
5. 触发 sendVerificationEmail 钩子
  ↓
6. 发送验证邮件 (Resend)
  ↓
用户
  ↓
7. 收到邮件，点击验证链接
   GET /api/auth/verify-email?token=xxx&callbackURL=/login
  ↓
8. Better Auth 验证 token
  ↓
9. 更新 emailVerified = true
  ↓
10. 重定向到 callbackURL (前端 /login)
```

---

## 登录流程

### 手机号验证码登录

```
1. 用户输入手机号
  ↓
2. 点击"获取验证码" → POST /api/auth/send-code
  ↓
3. 输入验证码
  ↓
4. 提交 → POST /api/auth/login-with-code
   - 请求体：{ phoneNumber, code }
  ↓
5. 验证成功 → 创建 session → 跳转到 /dashboard
```

### 邮箱密码登录

```
1. 用户输入邮箱、密码
  ↓
2. 提交 → signIn.email({ email, password })
  ↓
3. Better Auth 验证凭据
  ↓
4. 创建 session → 跳转到 /dashboard
```

---

## 数据模型

### users 表

```typescript
{
  id: number,
  name: string,
  email: string,
  emailVerified: boolean,
  phoneNumber: string | null,
  phoneNumberVerified: boolean,
  avatarUrl: string | null,
  role: "user" | "admin",
  status: "active" | "suspended" | "deleted",
  vocabularyLevel: VocabularyLevelEnum | null,
  createdAt: Date,
  updatedAt: Date,
}
```

### sessions 表

```typescript
{
  id: string,
  userId: number,
  token: string,
  expiresAt: Date,
  ipAddress: string,
  userAgent: string,
  createdAt: Date,
  updatedAt: Date,
}
```

### accounts 表 (Better Auth)

```typescript
{
  id: string,
  userId: number,
  accountId: string,
  providerId: "credential" | "google" | "github",
  password: string | null,  // 仅用于邮箱密码认证
  createdAt: Date,
  updatedAt: Date,
}
```

### verificationCodes 表（手机验证码）

```typescript
{
  id: number,
  phoneNumber: string,
  code: string,  // 6位数字
  expiresAt: Date,
  verified: boolean,
  createdAt: Date,
}
```

---

## API 契约

### 手机号注册

**POST /api/auth/send-code**
```json
// 请求
{ "phoneNumber": "13800138000" }

// 响应（开发环境返回验证码）
{ "success": true, "message": "验证码已发送", "code": "123456" }
```

**PATCH /api/auth/complete-registration**
```json
// 请求
{ "name": "张三", "email": "user@example.com" }

// 响应
{ "success": true, "message": "注册完成" }
```

### 邮箱注册

使用 Better Auth 客户端：
```typescript
await signUp.email({
  email: "user@example.com",
  password: "password123",
  name: "用户名",
  callbackURL: window.location.origin + "/login",
});
```

### 手机号登录

**POST /api/auth/login-with-code**
```json
// 请求
{ "phoneNumber": "13800138000", "code": "123456" }

// 响应
{ "success": true, "user": { ... }, "session": { ... } }
```

### 邮箱登录

使用 Better Auth 客户端：
```typescript
await signIn.email({
  email: "user@example.com",
  password: "password123",
});
```

---

## 密码安全

### 加密方式

**Web Crypto API (PBKDF2-SHA256)**

```typescript
// utils/password.ts
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  
  return `${Buffer.from(salt).toString("hex")}:${Buffer.from(derivedBits).toString("hex")}`;
}
```

**优势**：
- ✅ 跨平台兼容（Cloudflare Workers + Node.js）
- ✅ Web 标准 API
- ✅ 无需原生依赖

---

## Session 管理

### 配置

```typescript
// auth/auth.ts
session: {
  expiresIn: 60 * 60 * 24 * 30,  // 30天
  updateAge: 60 * 60 * 24,        // 每天更新一次
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,  // 5分钟缓存
  }
}
```

### Cookie 设置

- **名称**: `better-auth.session_token`
- **HttpOnly**: `true`（防止 XSS）
- **SameSite**: `lax`
- **Secure**: 生产环境为 `true`（HTTPS）

### 验证流程

```
请求到达
  ↓
require-auth.middleware.ts
  ↓
auth.api.getSession({ headers: c.req.raw.headers })
  ↓
Better Auth 验证 Cookie
  ↓
  ├─ 有效 → c.set("session", session) → 继续处理
  └─ 无效 → 返回 401
```

---

## 邮箱验证配置

### Better Auth 配置

```typescript
// auth/auth.ts
emailVerification: {
  sendVerificationEmail: async ({ user, url, token }) => {
    // 调用 EmailService 发送邮件
    const emailService = new EmailService(c.env.RESEND_API_KEY);
    await emailService.sendVerificationEmail(user.email, user.name, url);
  },
  sendOnSignUp: true,  // 注册时自动发送
  autoSignInAfterVerification: false,  // 验证后需要登录
  expiresIn: 86400,  // 24小时有效
}
```

### callbackURL 配置

**关键**：验证成功后重定向到前端页面

```typescript
// ❌ 错误：重定向到后端（404）
callbackURL: "/"

// ✅ 正确：重定向到前端登录页
callbackURL: window.location.origin + "/login"
```

**环境自适应**：
- 本地：`http://localhost:5173/login`
- 生产：`https://yourdomain.com/login`

---

## trustedOrigins 配置

**用途**：防止 CSRF 攻击，限制允许的前端域名

```typescript
// auth/auth.ts
trustedOrigins: [
  "http://localhost:5173",           // 本地开发
  "https://yourdomain.com",          // 生产域名
  "https://vocab-master.pages.dev",  // Cloudflare Pages
]
```

---

## 环境变量

```bash
# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Resend (邮件)
RESEND_API_KEY=re_xxx

# Database
DATABASE_URL=postgresql://...
```

---

## 关键文件

**后端**：
- `src/auth/auth.ts` - Better Auth 配置
- `src/route/auth.route.ts` - 认证路由
- `src/service/auth.service.ts` - 认证业务逻辑
- `src/service/email.service.ts` - 邮件发送
- `src/middleware/require-auth.middleware.ts` - Session 验证

**前端**：
- `src/pages/register.tsx` - 注册页面（双 Tab）
- `src/pages/login.tsx` - 登录页面（双 Tab）
- `src/lib/api-client.ts` - Better Auth Client
- `src/components/auth/protected-route.tsx` - 路由保护

---

## 注意事项

1. **手机号注册无需密码**：`complete-registration` 的 `password` 字段为可选
2. **验证码开发模式**：`NODE_ENV=development` 时验证码会在控制台打印
3. **邮箱验证**：`sendVerificationEmail` 必须在 `emailVerification` 块中配置
4. **生产环境**：必须添加前端域名到 `trustedOrigins`

