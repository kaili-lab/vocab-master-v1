# 客户端认证系统技术文档

## 系统概述

前端认证系统支持两种session管理方式，统一通过工具函数和API客户端处理。

### 双Session架构

```
┌─────────────────────────────────────────┐
│  Better Auth Session (Cookie-based)     │
│  - 有邮箱用户                             │
│  - Cookie自动管理                         │
│  - Better Auth SDK处理                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  手动 Session (Token-based)              │
│  - 无邮箱用户（手机号注册）                │
│  - localStorage存储token                 │
│  - 手动管理Authorization header           │
└─────────────────────────────────────────┘
```

---

## 核心模块

### 1. Session工具函数

**位置**：`src/lib/session-utils.ts`

```typescript
const STORAGE_KEY = "sessionToken";

// 保存token
export function saveSessionToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

// 获取token
export function getSessionToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

// 清除token
export function clearSessionToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 检查是否有token
export function hasSessionToken(): boolean {
  return !!getSessionToken();
}

// 处理登录响应（自动保存token）
export function handleLoginResponse(response: any): void {
  const token = response?.data?.session?.token;
  if (token) {
    saveSessionToken(token);
  }
}

// 处理登出
export function handleLogout(): void {
  clearSessionToken();
}
```

**特点**：
- 统一的token管理接口
- localStorage作为存储层
- 自动处理响应数据结构

---

### 2. API客户端

**位置**：`src/lib/api-client.ts`

#### 2.1 基础客户端（无认证）

```typescript
import { hc } from "hono/client";
import type { AppType } from "@api/src";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export const apiClient = hc<AppType>(API_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: "include", // 自动携带Cookie（Better Auth需要）
    });
  },
});
```

**使用场景**：
- 登录、注册接口
- 发送验证码
- 其他不需要认证的公开接口

---

#### 2.2 认证客户端（自动携带token）

```typescript
export const apiClientAuth = hc<AppType>(API_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getSessionToken();
    
    return fetch(input, {
      ...init,
      credentials: "include", // Cookie（Better Auth）
      headers: {
        ...init?.headers,
        // 手动Session的token
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },
});
```

**特点**：
- 自动从localStorage读取token
- 自动添加Authorization header
- 同时支持Cookie（Better Auth）和Token（手动Session）
- 类型安全（基于Hono RPC）

---

### 3. Better Auth客户端

**位置**：`src/lib/api-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: API_URL,
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

**功能**：
- `useSession`：获取Better Auth session
- `signIn`：登录
- `signOut`：登出
- `signUp`：注册

---

### 4. 认证Hook

**位置**：`src/hooks/use-auth.ts`

```typescript
import { useSession } from "@/lib/api-client";
import type { ExtendedUser } from "@/lib/api-client";

export function useAuth() {
  const { data: session, isPending, error, refetch } = useSession();

  return {
    user: session?.user as ExtendedUser | undefined,
    session,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
    refetch, // 刷新session（更新用户信息后调用）
  };
}
```

**返回值**：
- `user`：当前用户信息（包含扩展字段）
- `session`：完整session对象
- `isLoading`：加载状态
- `isAuthenticated`：是否已登录
- `error`：错误信息
- `refetch`：手动刷新session

---

## 类型定义

### ExtendedUser类型

```typescript
export type ExtendedUser = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // 扩展字段
  vocabularyLevel?: 
    | "primary_school"
    | "middle_school"
    | "high_school"
    | "cet4"
    | "cet6"
    | "ielts_toefl"
    | null;
  dailyGoal?: number | null;
  streak?: number | null;
};
```

---

## 认证流程

### 手机号登录流程

```typescript
// 1. 发送验证码
await apiClient.api.auth["send-code"].$post({
  json: { phone: "13800138000" }
});

// 2. 验证码登录
const res = await apiClient.api.auth["phone-login-sms"].$post({
  json: {
    phone: "13800138000",
    smsCode: "123456"
  }
});

const result = await res.json();

// 3. 自动保存session（如果有token）
handleLoginResponse(result);

// 4. 后续请求自动携带认证信息
const userRes = await apiClientAuth.api.users.me.$get();
```

---

### 邮箱登录流程（Better Auth）

```typescript
// 1. 登录
await signIn.email({
  email: "user@example.com",
  password: "password123"
});

// 2. Better Auth自动管理Cookie
// 3. 后续请求自动携带Cookie
const userRes = await apiClientAuth.api.users.me.$get();
```

---

## 受保护路由

**位置**：`src/components/protected-route.tsx`

```typescript
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

**使用**：

```typescript
// App.tsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
</Route>
```

---

## Session刷新机制

### 问题

更新用户信息后，Better Auth的session不会自动更新，导致前端显示的用户数据是旧的。

### 解决方案

使用`useSession`的`refetch()`方法手动刷新：

```typescript
const { user, refetch } = useAuth();
const updateUser = useUpdateUser();

const handleUpdate = async () => {
  // 1. 更新数据库
  await updateUser.mutateAsync({
    vocabularyLevel: "cet4"
  });

  // 2. 刷新session（等待完成）
  await refetch();

  // 3. 现在user会自动更新为最新数据
};
```

---

## 安全考虑

### localStorage vs Cookie

| 特性 | 手动Session (localStorage) | Better Auth (Cookie) |
|------|---------------------------|---------------------|
| **XSS防护** | ❌ 易受攻击 | ✅ HttpOnly Cookie |
| **CSRF防护** | ✅ 无风险 | ⚠️ 需要CSRF token |
| **跨域支持** | ✅ 简单 | ⚠️ 需要CORS配置 |
| **实现复杂度** | 低 | 中 |

### 最佳实践

1. **Token过期时间**：建议7天
2. **XSS防护**：
   - 避免在HTML中直接输出用户输入
   - 使用Content Security Policy (CSP)
3. **HTTPS**：生产环境必须使用HTTPS
4. **Token刷新**：实现refresh token机制（未来优化）

---

## 错误处理

### 401 未授权

```typescript
// 在API客户端中统一处理
fetch: async (input, init) => {
  const res = await fetch(input, init);
  
  if (res.status === 401) {
    // 清除本地token
    clearSessionToken();
    // 跳转到登录页
    window.location.href = "/login";
  }
  
  return res;
}
```

### 网络错误

```typescript
try {
  const res = await apiClientAuth.api.users.me.$get();
  const data = await res.json();
} catch (error) {
  console.error("网络错误:", error);
  toast.error("网络连接失败，请检查网络设置");
}
```

---

## API契约

### 后端认证响应格式

**手动Session登录响应**：

```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "name": "张三",
      "phone": "13800138000",
      // ...其他字段
    },
    "session": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2024-12-31T23:59:59.999Z"
    }
  }
}
```

**Better Auth登录响应**：

```typescript
// Better Auth自动设置Cookie，响应体为空或包含用户信息
{
  "user": {
    "id": "user123",
    "email": "user@example.com",
    // ...其他字段
  }
}
```

---

## 相关文档

- [Session使用指南](../ops/session-guide.md)
- [后端认证系统](../../api/docs/tech/auth-system.md)

---

**最后更新**：2026-01-05

