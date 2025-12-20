# Better Auth 与 Hono RPC 混合架构

> **📘 文档类型**：架构设计 - 认证层专项  
> **🎯 适合读者**：前后端开发者  
> **⏱️ 预计阅读**：15 分钟  
> **📅 最后更新**：2025-01-15  
> **🔗 相关文档**：[ARCHITECTURE.md](./ARCHITECTURE.md) · [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)

---

## 🎯 核心问题

**为什么前端同时使用 Better Auth Client 和 Hono RPC Client？它们如何协同工作？**

当前架构是混合方案，结合了 Better Auth 和 Hono RPC。总结如下：

---

## 当前架构分析

### 1. 前端同时使用了两种方式

查看 `api-client.ts`，前端实际上同时使用了：

```7:31:projects/client/src/lib/api-client.ts
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";
// ...
// ==================== Better Auth 客户端 ====================
// 用于用户认证（注册、登录、登出等）
export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    phoneNumberClient(), // 🆕 添加手机号插件
  ],
});

// 导出常用的 hooks 和方法
export const { useSession, signIn, signUp, signOut } = authClient;
```

所以 `use-auth.ts` 中的 `useSession` 实际来自 Better Auth：

```6:14:projects/client/src/hooks/use-auth.ts
  const { data: session, isPending, error } = useSession();

  return {
    user: session?.user,
    session,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
  };
```

### 2. 两种客户端的职责分工

| 客户端                            | 用途          | 示例                                           |
| --------------------------------- | ------------- | ---------------------------------------------- |
| Better Auth Client (`authClient`) | 认证相关操作  | `signIn`, `signUp`, `signOut`, `useSession`    |
| Hono RPC Client (`apiClient`)     | 业务 API 调用 | `api.users.me.$get()`, `api.users.me.$patch()` |

### 3. 工作原理

Better Auth Client 的工作流程：

1. 调用 `useSession()` → 请求 `/api/auth/get-session`
2. 后端路由（`auth.route.ts`）的通配符路由 `.all("*")` 将请求代理给 `auth.handler`
3. Better Auth 通过 Cookie 自动管理会话

业务 API 的工作流程：

1. 调用 `apiClient.api.users.me.$get()` → 请求 `/api/users/me`
2. 中间件 `require-auth.middleware.ts` 拦截 `/api/*`，调用 `auth.api.getSession()` 验证 Cookie，并通过 `c.set("session", session)` 注入会话
3. 路由处理函数（如 `user.route.ts`）直接使用 `c.get("session")` 获取会话信息并返回业务数据

### 4. 为什么要这样设计？

这个架构的好处：

1. 认证交给 Better Auth，减少手动管理会话的复杂度
2. 业务 API 通过 Hono RPC 获得类型安全和统一的调用方式
3. 会话通过 HttpOnly Cookie 自动传递，无需手动处理 token

### 混合方案小结

- Better Auth Client 负责认证和 session；Hono RPC Client 负责业务调用。
- 自动携带的 Cookie 把两者串联起来，互相独立又能共享会话。
- 这是社区常用的组合方式，没有隐藏耦合。

---

### 1. 认证操作 → Better Auth Client

```7:31:projects/client/src/lib/api-client.ts
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";
// ...
// ==================== Better Auth 客户端 ====================
// 用于用户认证（注册、登录、登出等）
export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    phoneNumberClient(), // 🆕 添加手机号插件
  ],
});

// 导出常用的 hooks 和方法
export const { useSession, signIn, signUp, signOut } = authClient;
```

- `authClient` 是 Better Auth 提供的独立客户端
- `useSession` 直接来自 Better Auth，自动发请求到 `/api/auth/get-session`
- 认证数据完全由 Better Auth 管理

### 2. 业务 API → Hono RPC Client

```13:19:projects/client/src/lib/api-client.ts
// ==================== Hono RPC 客户端 ====================
// 用于类型安全的业务 API 调用
export const apiClient = hc<ApiRoutes>(BASE_URL, {
  init: {
    credentials: "include", // 自动发送 cookies（用于 Better Auth 会话）
  },
});
```

- `apiClient` 通过 Hono 的 `hc` 创建，提供类型安全的 RPC 调用
- 用于调用业务接口如 `apiClient.api.users.me.$get()`
- `credentials: "include"` 确保自动携带 Better Auth 的 Cookie

---

### 2025-11 鉴权更新说明

- 新增 `require-auth.middleware.ts`：集中处理 `/api/*` 的会话校验和 `session` 注入，`PUBLIC_PATHS` 中的路由（如 `/api/examples/public-template`）可匿名访问。
- `user.route.ts` 等业务路由统一读取 `c.get("session")`；代码里保留 `if (!session)` 作为防御式校验，既满足 TypeScript 可选类型，又防止有人将路由挂在 `/api/*` 之外或单独调用 handler 时缺 Session 直接崩溃（因为 session 是 undefined，所以 session.user 是 undefined，会导致意外错误，原本应该是 401 的，最后变成 500）
- 增加 `example.route.ts` 作为模板，演示公共接口、受保护接口，以及使用 `requireRole(["admin"])` 的管理员鉴权写法，便于在新业务中复用。
