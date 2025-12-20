# 双模式部署指南

本项目支持两种运行模式：**Cloudflare Workers** 和 **Node.js**。

## 🎯 两种模式对比

| 特性 | Cloudflare Workers 模式 | Node.js 模式 |
|------|------------------------|-------------|
| 启动命令 | `pnpm dev:cf` | `pnpm dev` |
| 环境变量文件 | `.dev.vars` | `.env` |
| 运行时 | Cloudflare Workers | Node.js |
| 适用场景 | 开发测试 CF 环境 | 本地开发 / 服务器部署 |
| 依赖 | wrangler | @hono/node-server |

## 📋 环境变量配置

### Cloudflare Workers 模式

使用 `.dev.vars` 文件（已存在）：

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

### Node.js 模式

创建 `.env` 文件：

```bash
# Node.js 开发环境变量
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

> **注意**：`.env` 文件已在 `.gitignore` 中，不会被提交。你需要从 `.dev.vars` 复制内容。

## 🚀 启动方式

### 1️⃣ Node.js 模式（推荐用于本地开发）

```bash
# 开发模式（热重载）
pnpm dev

# 生产模式
pnpm build
pnpm start
```

### 2️⃣ Cloudflare Workers 模式（推荐用于测试部署）

```bash
# 本地开发
pnpm dev:cf

# 部署到 Cloudflare
pnpm deploy
```

## 📦 依赖说明

### 生产依赖（dependencies）

- `@hono/node-server` - Node.js 服务器运行时（生产环境必需）
- `dotenv` - 加载 .env 文件（Node.js 模式必需）
- 其他业务依赖...

### 开发依赖（devDependencies）

- `wrangler` - Cloudflare Workers CLI
- `tsx` - TypeScript 执行器
- `drizzle-kit` - 数据库迁移工具

## 🔧 代码实现原理

### 1. 环境变量兼容

`src/auth/auth.ts` 中的 `getEnvConfig` 函数自动检测运行模式：

```typescript
const getEnvConfig = (env?: Bindings): Bindings => {
  if (env) {
    // Cloudflare Workers - 使用 c.env
    return env;
  }
  // Node.js - 使用 process.env
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  };
};
```

### 2. 服务器启动

`src/index.ts` 中自动检测运行环境：

```typescript
const isNode = typeof process !== "undefined" && process.versions?.node;

if (isNode) {
  // 启动 Node.js 服务器
  import("@hono/node-server").then(({ serve }) => {
    serve({ fetch: app.fetch, port });
  });
}

// 导出供 Cloudflare Workers 使用
export default {
  fetch: app.fetch,
};
```

## 🌐 部署到生产环境

### 部署到 Cloudflare Workers

```bash
pnpm deploy
```

需要在 Cloudflare Dashboard 配置环境变量：
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

### 部署到 Node.js 服务器

1. 构建项目：
```bash
pnpm build
```

2. 在服务器上配置 `.env` 文件

3. 安装生产依赖（确保 `@hono/node-server` 在 dependencies 中）：
```bash
pnpm install --prod
```

4. 启动服务：
```bash
pnpm start
# 或使用 PM2
pm2 start dist/index.js --name vocab-master-api
```

## ❓ 常见问题

### Q1: pnpm dev 启动后没有响应？

**A**: 确保 `src/index.ts` 中的 Node.js 启动代码没有被注释，且已创建 `.env` 文件。

### Q2: 前端显示 404？

**A**: 检查以下几点：
1. 服务器是否成功启动（应该看到 "🚀 Server is running on..."）
2. 前端请求的 URL 是否正确（http://localhost:3000）
3. CORS 配置是否正确

### Q3: 如何在两种模式之间切换？

**A**: 
- Node.js 模式：`pnpm dev`（读取 `.env`）
- Cloudflare 模式：`pnpm dev:cf`（读取 `.dev.vars`）

### Q4: 生产环境应该选择哪种模式？

**A**: 
- **Cloudflare Workers**：全球 CDN，自动扩展，适合面向全球用户
- **Node.js 服务器**：完全控制，适合企业内网或特定区域部署

## 🎉 优势

✅ **无缝切换**：同一套代码，两种部署方式  
✅ **开发灵活**：本地用 Node.js，测试用 Cloudflare  
✅ **类型安全**：TypeScript + Bindings 类型定义  
✅ **环境隔离**：`.env` 和 `.dev.vars` 分离管理

