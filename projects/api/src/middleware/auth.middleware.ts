import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth/auth";
import { type Bindings } from "../types/bindings";
import type { AuthVariables } from "../types/variables";

/**
 * Better Auth 中间件 - 依赖注入模式
 *
 * 📌 设计目的：
 * 统一管理 Better Auth 实例，避免在每个路由中重复创建，提高性能和代码复用性。
 *
 * 🔧 工作原理：
 * 1. 从 Cloudflare Workers 环境变量读取配置
 * 2. 创建 Better Auth 实例（包含会话管理、认证逻辑）
 * 3. 将实例注入到 Hono Context 中
 * 4. 路由通过 c.get('auth') 获取实例
 *
 * ✨ 优势：
 * - 性能优化：每个请求只创建一次实例
 * - 代码复用：避免重复的创建逻辑
 * - 类型安全：TypeScript 完整支持
 * - 统一接口：所有路由使用相同方式获取 auth
 *
 * 💡 环境兼容：
 * c.env 在 Cloudflare Workers 中自动注入，在 Node.js 中可通过适配器提供。
 * 这使得代码可以在两种环境中运行。
 */
export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  c.set("auth", createAuth(c.env));
  await next();
});

/*
1. "每个请求创建一次"的含义和 Cloudflare Workers 的最佳实践

这确实是 **Cloudflare Workers 环境中的标准做法**，原因如下：

Cloudflare Workers 的特性：
- **无状态架构**：每个请求可能运行在不同的 V8 isolate 中，无法像传统 Node.js 服务器那样在启动时创建单例并全局复用
- **环境变量按请求注入**：`c.env`（包含数据库连接、密钥等）是在**请求时**才注入的，不是全局可用的
- **隔离性**：不同请求之间不共享状态，这是 Workers 高性能和安全性的基础

为什么每个请求创建一次？

```typescript
❌ 在 Cloudflare Workers 中无法这样做（没有全局的 env）
const globalAuth = createAuth(env); // env 不存在于全局作用域

✅ 正确做法：在中间件中为每个请求创建
export const authMiddleware = createMiddleware(async (c, next) => {
  c.set("auth", createAuth(c.env)); // c.env 来自当前请求
  await next();
});
```

性能考虑：
虽然每次都创建，但实际开销很小：
- `createAuth` 主要是配置对象的组装，不涉及重连接
- 数据库连接池在底层管理，不会每次都重新建立 TCP 连接
- Better Auth 实例的创建是轻量级的

2. `authMiddleware` 的设计意图

这是一个经典的 **依赖注入（Dependency Injection）** 模式，设计意图包括：

核心目标：
**集中管理** Better Auth 实例的创建和配置

具体优势：

1️⃣ 避免重复代码
```typescript
❌ 没有中间件：每个路由都要重复创建
app.post('/api/signup', async (c) => {
  const auth = createAuth(c.env); // 重复
  return auth.handler(c.req.raw);
});

app.post('/api/signin', async (c) => {
  const auth = createAuth(c.env); // 重复
  return auth.handler(c.req.raw);
});

✅ 有中间件：统一创建，路由直接使用
app.use('*', authMiddleware);
app.post('/api/signup', async (c) => {
  const auth = c.get('auth'); // 直接获取
  return auth.handler(c.req.raw);
});
```

2️⃣ 统一配置入口
所有认证相关配置集中在 `createAuth` 中，修改配置时只需改一处

3️⃣ 类型安全
```typescript
TypeScript 可以推断 auth 的完整类型
const auth = c.get('auth'); // 类型：ReturnType<typeof createAuth>
```

4️⃣ 测试友好
在测试中可以轻松 mock `auth` 实例：
```typescript
c.set('auth', mockAuth); // 替换为测试用的 mock
```

---

### 总结

1. **"每个请求创建一次"是必要且合理的**，因为 Cloudflare Workers 的无状态特性和环境变量注入机制
2. **`authMiddleware` 是最佳实践**，通过依赖注入模式实现了代码复用和统一管理
3. **性能影响可忽略**，创建 Auth 实例的开销远小于数据库查询或业务逻辑处理

这种设计在 Cloudflare Workers、Deno Deploy 等边缘计算环境中非常常见，是这类平台的推荐模式。

*/
