# 邮件发送功能实现指南

> **📘 文档类型**：技术实现  
> **🎯 适合读者**：后端开发者  
> **⏱️ 预计阅读**：15 分钟  
> **📅 最后更新**：2025-12-22  
> **🔗 相关文档**：[邮箱注册流程.md](./邮箱注册流程.md) · [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)

---

## 📋 目录

- [功能概述](#功能概述)
- [技术架构](#技术架构)
- [环境配置](#环境配置)
- [代码实现](#代码实现)
- [Cloudflare Workers 兼容性](#cloudflare-workers-兼容性)
- [测试验证](#测试验证)
- [故障排查](#故障排查)
- [部署到生产环境](#部署到生产环境)

---

## 功能概述

### 实现的功能

1. **邮箱验证邮件**：用户注册后自动发送验证邮件
2. **密码重置邮件**：用户请求重置密码时发送重置链接

### 技术选型

- **邮件服务商**：[Resend](https://resend.com/)
- **发件域名**：`kaili.dev`（需要在 Resend 中验证）
- **发件地址**：`noreply@kaili.dev`
- **邮件格式**：纯文本（简洁清晰）
- **邮件语言**：中文

---

## 技术架构

### 架构图

```
用户注册请求
    ↓
Better Auth 创建用户（emailVerified = false）
    ↓
Better Auth 触发 sendVerificationEmail 钩子
    ↓
EmailService.sendVerificationEmail()
    ↓
Resend API（HTTP 请求）
    ↓
用户邮箱收到验证邮件
    ↓
用户点击验证链接
    ↓
Better Auth 验证 token 并更新 emailVerified = true
    ↓
重定向到登录页
```

### 模块划分

```
projects/api/
├── src/
│   ├── service/
│   │   └── email.service.ts      # 邮件服务封装（核心）
│   ├── auth/
│   │   └── auth.ts                # Better Auth 配置（钩子集成）
│   └── types/
│       └── bindings.ts            # 环境变量类型定义
├── .dev.vars                      # 本地环境变量（包含 RESEND_API_KEY）
└── wrangler.jsonc                 # Cloudflare Workers 配置
```

---

## 环境配置

### 1. 获取 Resend API Key

1. 注册 [Resend](https://resend.com/) 账号
2. 添加并验证您的域名（参考 [Resend 文档](https://resend.com/docs/dashboard/domains/introduction)）
3. 创建 API Key：Dashboard → API Keys → Create API Key
4. 复制 API Key（格式：`re_xxxxx...`）

### 2. 配置本地环境变量

在 `projects/api/.dev.vars` 文件中添加：

```bash
RESEND_API_KEY=re_your_api_key_here
```

### 3. 更新类型定义

已在 `projects/api/src/types/bindings.ts` 中添加：

```typescript
export type Bindings = {
  // ... 其他环境变量
  RESEND_API_KEY: string;
};
```

---

## 代码实现

### 1. 邮件服务模块 (`email.service.ts`)

```typescript
import { Resend } from "resend";

export class EmailService {
  private resend: Resend;
  private fromEmail = "noreply@kaili.dev";

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

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
        text: `您好 ${userName}，\n\n感谢您注册...`,
      });

      if (error) {
        console.error("❌ [EmailService] 发送验证邮件失败:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ [EmailService] 验证邮件发送成功:", data?.id);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error("❌ [EmailService] 发送邮件异常:", error);
      return { success: false, error: errorMessage };
    }
  }
}
```

**设计要点：**

- ✅ 返回结果对象而非抛出异常（避免阻断注册流程）
- ✅ 详细的日志记录（便于调试）
- ✅ 类型安全（TypeScript）

### 2. Better Auth 集成 (`auth.ts`)

```typescript
import { EmailService } from "../service/email.service";

export const createAuth = (env: Bindings) => {
  const config = getEnv(env);
  const db = createDb(config.DATABASE_URL);

  return betterAuth({
    // ... 其他配置

    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }) => {
        console.log(`📧 [sendVerificationEmail] 被调用！`);

        // 发送验证邮件
        const emailService = new EmailService(config.RESEND_API_KEY);
        const result = await emailService.sendVerificationEmail(
          user.email,
          user.name,
          url
        );

        if (result.success) {
          console.log(`✅ [sendVerificationEmail] 邮件发送成功`);
        } else {
          console.error(
            `❌ [sendVerificationEmail] 邮件发送失败: ${result.error}`
          );
          // 注意：不抛出错误，避免阻断注册流程
        }
      },
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 86400, // 24 小时
    },
  });
};
```

**关键点：**

- ✅ Better Auth 自动生成验证链接（包含 token）
- ✅ 邮件发送失败不会阻断注册（用户体验优先）
- ✅ 验证逻辑由 Better Auth 自动处理

---

## Cloudflare Workers 兼容性

### 🔑 关键问题：为什么需要 `nodejs_compat` 标志？

#### 背景说明

**Cloudflare Workers ≠ Node.js**

| 特性       | Cloudflare Workers       | Node.js             |
| ---------- | ------------------------ | ------------------- |
| 运行时引擎 | V8                       | V8 + libuv          |
| API 标准   | Web Standard API         | Node.js API         |
| 内置模块   | ❌ 无 fs、path、http 等  | ✅ 有完整的内置模块 |
| 环境类型   | 边缘计算（Edge Runtime） | 服务器运行时        |

#### 问题来源

Resend SDK 是为 **Node.js 环境** 设计的：

```json
// node_modules/resend/package.json
{
  "name": "resend",
  "description": "Node.js library for the Resend API",
  "engines": {
    "node": ">=20" // ⚠️ 明确要求 Node.js 环境
  }
}
```

它的内部依赖（如 `svix`）使用了 Node.js 特有的 API：

- `node:crypto` - 加密功能
- `node:buffer` - Buffer 数据类型
- `node:stream` - 流处理
- `node:util` - 工具函数

#### 解决方案

在 `wrangler.jsonc` 中启用 `nodejs_compat` 标志：

```jsonc
{
  "compatibility_flags": ["nodejs_compat"]
}
```

**效果：**

- Cloudflare Workers 提供 Node.js API 的兼容实现（polyfill）
- 允许 Resend SDK 正常运行
- **不会**让 Workers 变成 Node.js 环境

#### 类比理解

```
就像在 Windows 上运行 Linux 程序：
  - Windows ≠ Linux
  - WSL 提供了 Linux API 的兼容层
  - Linux 程序可以在 Windows 上运行

同理：
  - Workers ≠ Node.js
  - nodejs_compat 提供了 Node.js API 的兼容层
  - Resend SDK 可以在 Workers 上运行
```

#### 启用前后对比

**没有 `nodejs_compat`：**

```bash
❌ Error: Could not resolve "node:crypto"
❌ Error: Could not resolve "node:buffer"
💥 服务器启动失败
```

**有 `nodejs_compat`：**

```bash
✅ Resend SDK 正常加载
✅ EmailService 可以实例化
✅ 邮件可以正常发送
```

---

## 测试验证

### 本地开发测试

1. **启动开发服务器**

```bash
cd projects/api
pnpm dev
```

2. **检查环境变量加载**

查看控制台输出，确认 `RESEND_API_KEY` 已加载：

```
Your Worker has access to the following bindings:
...
env.RESEND_API_KEY ("(hidden)")    Environment Variable    local
```

3. **测试邮箱注册**

- 打开前端注册页面
- 选择"邮箱注册"
- 填写信息并提交

4. **检查日志输出**

服务器控制台应显示：

```
📧 [sendVerificationEmail] 被调用！
   用户: user@example.com (张三)
   验证链接: http://localhost:3000/api/auth/verify-email?token=...
✅ [EmailService] 验证邮件发送成功: abc123...
✅ [sendVerificationEmail] 邮件发送成功
```

5. **验证邮件接收**

- 检查注册邮箱的收件箱
- 应收到来自 `noreply@kaili.dev` 的验证邮件
- 点击验证链接测试完整流程

### 测试重置密码邮件

（如果前端已实现忘记密码功能）

1. 访问忘记密码页面
2. 输入邮箱并提交
3. 检查邮箱收到重置密码邮件
4. 点击链接测试重置流程

---

## 故障排查

### 问题 1：CORS 错误

**现象：**

```
Access to fetch at 'http://localhost:3000/api/auth/sign-up/email' has been blocked by CORS policy
```

**原因：**

- EmailService 内部出错导致请求失败
- 服务器崩溃或重启

**解决方案：**

1. 检查服务器控制台是否有错误日志
2. 确认 `nodejs_compat` 已启用
3. 确认 `RESEND_API_KEY` 已正确配置
4. 检查 Resend API Key 是否有效

### 问题 2：邮件未收到

**可能原因：**

1. **API Key 无效**

   - 检查 `.dev.vars` 中的 API Key 是否正确
   - 在 Resend Dashboard 验证 API Key 状态

2. **域名未验证**

   - 登录 Resend Dashboard
   - 检查域名验证状态（需要配置 DNS 记录）

3. **邮件在垃圾箱**

   - 检查垃圾邮件文件夹
   - 将 `noreply@kaili.dev` 添加到白名单

4. **发送限制**
   - Resend 免费版有发送限制
   - 检查 Dashboard 的 Usage 页面

### 问题 3：服务器不断重启

**现象：**

```
⎔ Reloading local server...
⎔ Reloading local server...
⎔ Reloading local server...
```

**原因：**

- Resend SDK 导入失败（未启用 `nodejs_compat`）
- 代码语法错误

**解决方案：**

1. 确认 `wrangler.jsonc` 中启用了 `nodejs_compat`
2. 运行 `pnpm build` 检查类型错误
3. 查看详细错误信息（如果有）

### 问题 4：验证链接无效

**现象：**
点击邮件中的验证链接后显示错误

**检查项：**

1. 链接是否过期（24 小时有效期）
2. `BETTER_AUTH_URL` 配置是否正确
3. 后端服务器是否正在运行
4. `trustedOrigins` 是否包含前端域名

---

## 部署到生产环境

### 1. 配置 Cloudflare 环境变量

在 Cloudflare Dashboard 中：

1. 进入 Workers & Pages
2. 选择您的 Worker
3. Settings → Variables → Environment Variables
4. 添加生产环境的 `RESEND_API_KEY`

### 2. 更新 `trustedOrigins`

在 `projects/api/src/auth/auth.ts` 中：

```typescript
trustedOrigins: [
  "http://localhost:5173",           // 本地开发
  "https://yourdomain.com",          // 👈 添加生产域名
  "https://vocab-master.pages.dev",  // 👈 Cloudflare Pages
],
```

### 3. 验证发件域名

确保在 Resend Dashboard 中：

- 域名已验证（DNS 记录配置完成）
- 域名状态为 Active

### 4. 测试生产环境

1. 部署到 Cloudflare Workers
2. 在生产环境测试注册流程
3. 验证邮件是否正常发送和接收

### 5. 监控邮件发送

在 Resend Dashboard 中：

- 查看 Logs 页面监控邮件发送状态
- 查看 Analytics 页面了解发送统计
- 设置 Webhooks 接收发送通知（可选）

---

## 扩展功能

### 使用 HTML 邮件模板

如果需要更美观的邮件，可以使用 HTML 格式：

```typescript
await this.resend.emails.send({
  from: this.fromEmail,
  to: to,
  subject: "验证您的 Vocab Master 账号",
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .button { 
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <h1>验证您的邮箱</h1>
        <p>您好 ${userName}，</p>
        <p>感谢您注册 Vocab Master！</p>
        <a href="${verificationUrl}" class="button">验证邮箱</a>
      </body>
    </html>
  `,
});
```

### 集成 React Email

Resend 支持使用 React 组件创建邮件模板：

```typescript
import { render } from "@react-email/render";
import { WelcomeEmail } from "./templates/WelcomeEmail";

const html = render(<WelcomeEmail userName={userName} verificationUrl={url} />);

await this.resend.emails.send({
  from: this.fromEmail,
  to: to,
  subject: "验证您的 Vocab Master 账号",
  html: html,
});
```

---

## 相关资源

### 官方文档

- [Resend 官方文档](https://resend.com/docs)
- [Cloudflare Workers - Node.js 兼容性](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Better Auth - Email Verification](https://www.better-auth.com/docs/authentication/email-password)

### 项目文档

- [邮箱注册流程.md](./邮箱注册流程.md) - 注册功能完整实现
- [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) - 认证系统架构
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 项目整体架构

---

## 总结

### ✅ 实现的功能

- [x] 邮箱验证邮件自动发送
- [x] 密码重置邮件发送
- [x] 错误处理和日志记录
- [x] Cloudflare Workers 兼容性配置
- [x] 类型安全的实现

### 🎯 核心设计原则

1. **用户体验优先**：邮件发送失败不阻断注册流程
2. **类型安全**：使用 TypeScript 确保代码质量
3. **可维护性**：模块化设计，职责分离
4. **可观察性**：详细的日志记录便于调试

### 📌 注意事项

- ⚠️ 必须启用 `nodejs_compat` 标志
- ⚠️ 发件域名需要在 Resend 中验证
- ⚠️ 生产环境需要配置 `trustedOrigins`
- ⚠️ 注意 Resend 免费版的发送限制

---

_文档生成时间：2025-12-22_
