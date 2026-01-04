# Session 认证使用指南

## 📋 概述

项目支持两种 session 管理方式：

1. **Better Auth Session**（有邮箱用户）：通过 Cookie 自动管理
2. **手动 Session**（无邮箱用户）：手动创建，通过 token 管理

前端已统一处理，开发时无需区分。

---

## 🔧 核心工具

### 1. Session 工具函数 (`src/lib/session-utils.ts`)

```typescript
import {
  saveSessionToken,
  getSessionToken,
  clearSessionToken,
  hasSessionToken,
  handleLoginResponse,
  handleLogout,
} from "@/lib/session-utils";

// 保存 token
saveSessionToken("token_string");

// 获取 token
const token = getSessionToken();

// 检查是否登录
if (hasSessionToken()) {
  console.log("已登录");
}

// 登录响应处理（自动保存 token）
handleLoginResponse(response);

// 登出处理（清除 token）
handleLogout();
```

---

### 2. API 客户端

#### `apiClient` - 基础版（无需认证）

```typescript
import { apiClient } from "@/lib/api-client";

// 用于登录、注册等不需要认证的接口
const res = await apiClient.api.auth.register.$post({
  json: { ... }
});
```

#### `apiClientAuth` - 认证版（自动携带 token）

```typescript
import { apiClientAuth } from "@/lib/api-client";

// 用于需要认证的接口，自动添加 Authorization header
const res = await apiClientAuth.api.users.me.$get();
```

---

## 📝 使用场景

### 场景 1：登录/注册

```typescript
// login.tsx / register.tsx
import { handleLoginResponse } from "@/lib/session-utils";

const onSubmit = async (data) => {
  const res = await apiClient.api.auth["phone-login-sms"].$post({
    json: data,
  });

  const result = await res.json();

  // 自动处理 session（保存 token）
  handleLoginResponse(result);

  navigate("/");
};
```

**后端返回格式**：

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "session": {
      "token": "xxx",        // 手动 session 有这个字段
      "expiresAt": "..."
    }
  }
}
```

---

### 场景 2：访问受保护的接口

```typescript
import { apiClientAuth } from "@/lib/api-client";

// 方式 1：直接使用
const res = await apiClientAuth.api.users.me.$get();

// 方式 2：在组件中使用
function UserProfile() {
  const { user } = useAuth();

  const updateProfile = async () => {
    const res = await apiClientAuth.api.users.me.$patch({
      json: { name: "新名字" },
    });
  };

  return <div>{user?.name}</div>;
}
```

**自动行为**：

- ✅ 自动从 localStorage 读取 token
- ✅ 自动添加到 `Authorization: Bearer xxx` header
- ✅ Cookie 也会自动发送（支持 Better Auth）

---

### 场景 3：登出

```typescript
import { handleLogout } from "@/lib/session-utils";
import { signOut } from "@/lib/api-client";

async function logout() {
  // 1. 清除手动 session token
  handleLogout();

  // 2. 调用 Better Auth 登出（如果使用）
  await signOut();

  // 3. 跳转到登录页
  navigate("/login");
}
```

---

### 场景 4：检查登录状态

```typescript
import { useAuth } from "@/hooks/use-auth";
import { hasSessionToken } from "@/lib/session-utils";

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const hasToken = hasSessionToken();

  // 方式 1：使用 Better Auth 的 session（推荐）
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // 方式 2：检查手动 token
  if (!hasToken) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}
```

---

## 🔄 完整流程示例

### 手机号登录流程

```typescript
// 1. 发送验证码
const sendCode = async () => {
  await apiClient.api.auth["send-code"].$post({
    json: { phone: "13800138000" },
  });
};

// 2. 登录
const login = async () => {
  const res = await apiClient.api.auth["phone-login-sms"].$post({
    json: {
      phone: "13800138000",
      smsCode: "123456",
    },
  });

  const result = await res.json();

  // 3. 自动保存 session
  handleLoginResponse(result);
  // 内部逻辑：
  // if (result.data?.session?.token) {
  //   localStorage.setItem("sessionToken", token);
  // }
};

// 4. 访问受保护接口
const getUserInfo = async () => {
  const res = await apiClientAuth.api.users.me.$get();
  // 自动携带 token：
  // headers: { Authorization: "Bearer xxx" }
};
```

---

## 🚀 快速开始

### 步骤 1：配置路由

```typescript
// App.tsx
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 受保护的路由 */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
```

### 步骤 2：创建受保护路由组件

```typescript
// components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { hasSessionToken } from "@/lib/session-utils";

export function ProtectedRoute() {
  if (!hasSessionToken()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

### 步骤 3：使用认证接口

```typescript
// pages/ProfilePage.tsx
import { apiClientAuth } from "@/lib/api-client";

function ProfilePage() {
  const updateProfile = async () => {
    const res = await apiClientAuth.api.users.me.$patch({
      json: { name: "新名字" },
    });

    // token 自动携带，无需手动处理
  };

  return <button onClick={updateProfile}>更新</button>;
}
```

---

## 🔍 调试技巧

### 查看当前 token

```javascript
// 浏览器 Console
localStorage.getItem("sessionToken");
```

### 查看请求 headers

```typescript
// 在 Network 标签查看请求
// Headers → Authorization: Bearer xxx
```

### 清除 session

```javascript
// 浏览器 Console
localStorage.removeItem("sessionToken");
```

---

## 📚 总结

**核心思路**：

1. **登录/注册**：调用 API → 自动保存 token（`handleLoginResponse`）
2. **访问接口**：使用 `apiClientAuth` → 自动携带 token
3. **登出**：清除 token（`handleLogout`）

**统一处理**：

- ✅ 无需区分手动 session 和 Better Auth session
- ✅ 工具函数自动判断和处理
- ✅ 类型安全，TypeScript 支持
- ✅ 简洁易用，减少重复代码

---

**相关文档**：
- [客户端认证技术文档](../tech/auth-client.md)
- [前端文档导航](../README.md)

