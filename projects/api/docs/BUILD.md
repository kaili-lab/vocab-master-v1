# API 项目构建说明

## 项目概述

这是一个基于 **Hono + Cloudflare Workers** 的后端 API 服务，使用 TypeScript 开发，通过 wrangler 部署到 Cloudflare Workers。

## 为什么不需要构建？

**答案：不需要传统的构建步骤。**

### Cloudflare Workers 的特殊性

Cloudflare Workers 是一个**无服务器（Serverless）** 平台，具有以下特点：

1. **原生支持 TypeScript**：

   - wrangler 内置了 esbuild，自动处理 TypeScript 编译
   - 部署时自动将 `.ts` 转换为 Workers 运行时可执行的代码

2. **边缘计算平台**：

   - 代码运行在全球数百个边缘节点
   - 不需要生成静态文件，而是直接执行代码

3. **自动优化**：
   - wrangler 自动进行代码打包、压缩、Tree-shaking
   - 不需要手动配置 webpack 或 rollup

### 本地开发：wrangler dev

```bash
pnpm dev
```

**执行内容：**

```json
"dev": "wrangler dev"
```

**工作原理：**

1. wrangler 启动本地开发服务器
2. 使用 **esbuild** 快速编译 TypeScript（< 100ms）
3. 模拟 Cloudflare Workers 运行环境
4. 提供热重载（修改代码自动重启）
5. 默认端口：`http://localhost:3000`

**关键点：不需要预先运行 `build` 命令！**

### 部署：wrangler deploy

```bash
pnpm deploy
```

**执行内容：**

```json
"deploy": "wrangler deploy --minify"
```

**工作原理：**

1. wrangler 读取 `src/index.ts` 源文件
2. 使用 esbuild 编译 TypeScript
3. 打包所有依赖（node_modules）
4. 压缩代码（`--minify` 参数）
5. 上传到 Cloudflare Workers
6. 自动部署到全球边缘节点

**关键点：直接从源代码部署，不需要 `dist/` 目录！**

---

## "构建"命令的真实用途

虽然项目中有 `build` 命令，但它**不是用于生成部署文件**：

```bash
pnpm build
```

**执行内容：**

```json
"build": "tsc --noEmit"
```

**实际作用：**

- **只做类型检查**（Type Checking）
- `--noEmit` 表示不生成任何 `.js` 文件
- 用于 CI/CD 流程中的代码质量检查
- 捕获类型错误，但不影响部署

**类比：**

- Client 的 `build` = 生成 HTML/CSS/JS 文件（必须）
- API 的 `build` = 类型检查（可选，用于质量保证）

---

## 开发工作流

### 1. 启动本地开发

```bash
cd projects/api
pnpm dev
```

访问：`http://localhost:3000`

### 2. 测试 API

```bash
# 测试公开接口
curl http://localhost:3000/api/health

# 测试需要认证的接口（需要先在 client 登录获取 cookie）
curl http://localhost:3000/api/users/me \
  -H "Cookie: <your-session-cookie>"
```

### 3. 运行类型检查（可选）

```bash
pnpm build
# 或
pnpm typecheck  # 如果配置了这个别名
```

### 4. 运行单元测试

```bash
pnpm test       # 监听模式
pnpm test:run   # 单次运行
```

---

## 部署到 Cloudflare Workers

### 方式 1：手动部署

```bash
# 1. 登录 Cloudflare（首次需要）
wrangler login

# 2. 部署到生产环境
pnpm deploy

# 3. 部署到特定环境
wrangler deploy --env production
wrangler deploy --env staging
```

部署后会显示：

```
✨ Published vocab-master-api (1.23 sec)
   https://vocab-master-api.your-subdomain.workers.dev
```

### 方式 2：CI/CD 自动部署

在 GitHub Actions 中配置：

```yaml
name: Deploy API to Cloudflare Workers

on:
  push:
    branches: [main]
    paths:
      - "projects/api/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: cd projects/api && pnpm build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: projects/api
          command: deploy --minify
```

---

## 环境配置

### wrangler.jsonc 配置

```jsonc
{
  "name": "vocab-master-api",
  "main": "src/index.ts", // ⭐ 入口文件（TypeScript 源码）
  "compatibility_date": "2024-11-27",
  "node_compat": true,

  "vars": {
    // 环境变量（非敏感信息）
    "ENVIRONMENT": "production"
  }
}
```

**关键配置说明：**

- `main`: 指向 **TypeScript 源文件**，不是编译后的 `.js` 文件
- `node_compat`: 启用 Node.js 兼容层（支持部分 Node API）

### Secrets（敏感信息）

通过 wrangler 命令配置：

```bash
# 设置数据库连接字符串
wrangler secret put DATABASE_URL

# 设置 OpenAI API Key
wrangler secret put OPENAI_API_KEY

# 设置 Better Auth Secret
wrangler secret put BETTER_AUTH_SECRET
```

Secrets 会加密存储在 Cloudflare，不会出现在代码中。

### Bindings（资源绑定）

在 `wrangler.jsonc` 中配置外部资源：

```jsonc
{
  "kv_namespaces": [{ "binding": "KV", "id": "your-kv-namespace-id" }],
  "d1_databases": [{ "binding": "DB", "database_id": "your-d1-database-id" }]
}
```

---

## 项目结构

```
projects/api/
├── src/                        # 源代码
│   ├── index.ts                # 应用入口（wrangler 的 main）⭐
│   ├── route/                  # 路由定义
│   │   ├── auth.route.ts
│   │   ├── user.route.ts
│   │   └── text.route.ts
│   ├── service/                # 业务逻辑
│   ├── middleware/             # 中间件
│   ├── db/                     # 数据库 Schema
│   ├── auth/                   # Better Auth 配置
│   └── utils/                  # 工具函数
├── test/                       # 单元测试
├── scripts/                    # 脚本工具（如数据导入）
├── drizzle/                    # 数据库迁移文件
├── dist/                       # TypeScript 类型声明（.gitignore）⭐
├── wrangler.jsonc              # Cloudflare Workers 配置
├── drizzle.config.ts           # Drizzle ORM 配置
├── tsconfig.json               # TypeScript 配置
├── vitest.config.ts            # 测试配置
└── package.json                # 依赖和脚本
```

**关键目录说明：**

- `dist/`：只包含 `.d.ts` 类型声明文件（用于 shared 包的类型引用）

  - 由 TypeScript 编译器生成
  - 不包含 `.js` 文件
  - 已在 `.gitignore` 中
  - **不用于部署**

- `src/index.ts`：wrangler 的入口文件
  - 导出 `default` 对象，包含 `fetch` 方法
  - 直接被 wrangler 读取和编译

---

## TypeScript 配置详解

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx" // Hono 的 JSX（用于 HTML 模板）
  }
}
```

**为什么不设置 `outDir`？**

- wrangler 不使用 TypeScript 编译器（tsc）生成的文件
- wrangler 使用 esbuild 直接从源码编译
- `outDir` 只在运行 `tsc --noEmit` 时被忽略

---

## 如果迁移到 Node.js 服务器：

1. 修改 tsconfig.json：

- 移除或设置 emitDeclarationOnly: false
- 添加 outDir: "dist"（已有）
- 可能需要调整 module 和 target

2. 修改 package.json 脚本：

- "build": "tsc" // 改为真正编译
- "start": "node dist/index.js"
- dist 目录：会生成编译后的 .js 文件，已在 .gitignore 中忽略

---

## 与 Client 项目的对比

| 特性           | Client (React + Vite)       | API (Hono + Workers)       |
| -------------- | --------------------------- | -------------------------- |
| **需要构建？** | ✅ 是（生成静态文件）       | ❌ 否（wrangler 自动处理） |
| **构建工具**   | Vite (rollup)               | wrangler (esbuild)         |
| **部署产物**   | `dist/` 目录（HTML/CSS/JS） | 源代码（`.ts` 文件）       |
| **部署平台**   | Cloudflare Pages            | Cloudflare Workers         |
| **运行环境**   | 浏览器                      | V8 Isolate（边缘计算）     |
| **类型检查**   | `tsc --noEmit`              | `tsc --noEmit`             |
| **本地开发**   | `vite` (HMR)                | `wrangler dev` (热重载)    |

---

## 常见问题

### Q: 为什么有些教程说 Workers 需要构建？

**A**: 取决于构建工具：

- **使用 wrangler**：不需要预先构建（推荐）✅
- **使用 webpack**：需要手动配置构建流程（老方式）❌

我们的项目使用 wrangler，无需手动构建。

### Q: dist/ 目录是什么？

**A**:

- 只包含 `.d.ts` 类型声明文件
- 用于 `shared` 包的 TypeScript Project References
- 通过 `tsc` 生成，不是 wrangler 的产物
- **不用于部署**
