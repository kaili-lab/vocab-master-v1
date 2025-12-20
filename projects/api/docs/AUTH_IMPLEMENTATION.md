# 注册登录功能实现文档

## 📋 功能概览

已完成的功能：

- ✅ 用户注册（用户名 + 手机号 + 短信验证码 + 邮箱（可选）+ 密码）
- ✅ 手机号验证码登录
- ✅ 邮箱密码登录
- ✅ 短信验证码发送
- ✅ 认证状态管理
- ✅ 路由保护

## 🏗️ 架构说明

### 后端 (Hono + Better Auth)

#### 1. 短信验证码接口 (`projects/api/src/route/sms.route.ts`)

- `POST /api/sms/send-code` - 发送验证码
- `POST /api/sms/verify-code` - 验证验证码
- `POST /api/sms/login` - 手机号验证码登录

#### 2. 扩展注册接口 (`projects/api/src/route/auth.route.ts`)

- `POST /api/auth/register` - 注册（支持手机号验证）

#### 3. Better Auth 原生接口

- `POST /api/auth/sign-in/email` - 邮箱密码登录
- `POST /api/auth/sign-out` - 登出
- `GET /api/auth/get-session` - 获取会话

### 前端 (React + React Hook Form)

#### 1. 注册页面 (`projects/client/src/pages/register.tsx`)

- 用户名验证（2-20 字符，支持中文）
- 手机号验证（中国大陆手机号）
- 短信验证码验证
- 邮箱验证（可选）
- 密码强度验证（6-20 位）
- 密码确认
- 用户协议确认

#### 2. 登录页面 (`projects/client/src/pages/login.tsx`)

- 双标签页：手机号登录 / 邮箱登录
- 手机号验证码登录
- 邮箱密码登录
- 记住我功能

#### 3. 认证管理 (`projects/client/src/hooks/use-auth.ts`)

- `useAuth()` - 获取当前认证状态
- `useSignOut()` - 登出
- `useUpdateUser()` - 更新用户信息
- `useCurrentUser()` - 获取用户详细信息

#### 4. 路由保护 (`projects/client/src/components/auth/protected-route.tsx`)

- 自动重定向未登录用户到登录页
- 保存原始访问路径，登录后自动返回

## 🚀 使用说明

### 启动项目

#### 1. 启动后端

```bash
cd projects/api
npm install
npm run dev
```

后端将运行在 `http://localhost:3000`

#### 2. 启动前端

```bash
cd projects/client
npm install
npm run dev
```

前端将运行在 `http://localhost:5173`

### 测试流程

#### 注册流程

1. 访问 `http://localhost:5173/register`
2. 填写用户名（例如：张三）
3. 填写手机号（例如：13800138000）
4. 点击"获取验证码"
5. 在开发环境下，验证码会在浏览器控制台显示
6. 填写验证码
7. （可选）填写邮箱
8. 设置密码
9. 确认密码
10. 勾选用户协议
11. 点击"注册"

#### 手机号登录流程

1. 访问 `http://localhost:5173/login`
2. 选择"手机号登录"标签
3. 填写手机号
4. 点击"获取验证码"
5. 填写验证码
6. 点击"登录"

#### 邮箱登录流程

1. 访问 `http://localhost:5173/login`
2. 选择"邮箱登录"标签
3. 填写邮箱
4. 填写密码
5. （可选）勾选"记住我"
6. 点击"登录"

## 🔧 配置说明

### 环境变量

#### 后端 (`projects/api/.env`)

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development
```

#### 前端 (`projects/client/.env`)

```env
VITE_API_URL=http://localhost:3000
```

### 开发环境特性

在开发环境下（`NODE_ENV=development`）：

- 验证码会在控制台显示
- API 响应会返回验证码（生产环境不返回）
- 验证码有效期为 5 分钟

## 📱 短信服务集成（TODO）

当前版本使用模拟短信发送。生产环境需要集成真实短信服务商：

## 🧪 测试建议

### 单元测试

- 验证码生成逻辑
- 表单验证规则
- API 端点响应

## 🐛 已知问题

1. **Toast 提示**：当前使用浏览器原生 `alert()`，建议替换为 UI 组件
2. **短信服务**：需要集成真实短信服务商
3. **手机号登录会话创建**：需要完善手机号登录后的会话创建逻辑

## 🔄 后续优化

- [ ] 集成真实短信服务
- [ ] 添加邮箱验证功能
- [ ] 实现"忘记密码"功能
- [ ] 添加社交登录（微信、Google）
- [ ] 实现二次验证（2FA）
- [ ] 添加登录历史记录
- [ ] 实现账号安全设置
- [ ] 添加单元测试和 E2E 测试

## 💡 最佳实践

1. **验证码安全**：

   - 限制发送频率（60 秒倒计时）
   - 短有效期（5 分钟）
   - 一次性使用

2. **密码安全**：

   - 最小长度限制
   - 使用 Better Auth 的加密机制
   - 不在日志中显示密码

3. **用户体验**：

   - 实时表单验证
   - 清晰的错误提示
   - 加载状态指示
   - 登录后记住访问路径

4. **代码组织**：
   - 分离关注点（API/业务逻辑/UI）
   - 类型安全（TypeScript + Zod）
   - 可复用的 hooks 和组件
