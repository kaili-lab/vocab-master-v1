# Monorepo 构建与部署总结

## 项目架构概览

```
vocab-master/
├── projects/
│   ├── client/         # React 前端（需要构建）
│   ├── api/            # Hono 后端（不需要构建）
│   └── shared/         # 类型共享包
└── pnpm-workspace.yaml # Monorepo 配置
```

---

## 核心问题解答

### 1. Client 项目为什么需要构建？

**答案：必须构建。**

**原因：**

React 应用需要转换为浏览器可执行的静态文件：

- **TypeScript → JavaScript**：浏览器不支持 TS
- **JSX → JavaScript**：React 的 JSX 需要转换
- **模块打包**：数百个文件打包成几个优化文件
- **代码压缩**：减小体积，提升加载速度

**构建命令：**

```bash
cd projects/client
pnpm build
```

**输出：**

```
dist/
├── index.html
├── assets/
│   ├── index-xxx.css
│   └── index-xxx.js
```

**部署目标：** Cloudflare Pages（静态网站托管）

---

### 2. Client 为什么要将 build 和 typecheck 分开？

**原因：避免 TypeScript 配置冲突。**

#### 问题背景

在之前的配置中，构建命令是：

```json
"build": "tsc -b && vite build"
```

这导致了严重问题：

1. **递归类型检查**：

   - Client 导入了 `import type { ApiRoutes } from "shared"`
   - TypeScript 编译器（`tsc -b`）会递归检查 api 的所有源代码
   - 包括 api 的 services、middlewares、utils 等数百个文件

2. **配置冲突**：

   ```
   Client tsconfig:           API tsconfig:
   - jsx: "react-jsx"         - jsx: "react-jsx"
   - lib: ["DOM"]             - lib: ["ESNext"]
   - jsxImportSource: (默认)  - jsxImportSource: "hono/jsx"
   - erasableSyntaxOnly: true - (无此配置)
   ```

3. **错误示例**：

   ```
   ../api/src/utils/ai-error-handler.ts(19,13):
   error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.

   19 export enum AIErrorType {
                ~~~~~~~~~~~
   ```

#### 解决方案

**拆分构建和类型检查：**

```json
{
  "scripts": {
    "build": "vite build", // 生产构建
    "typecheck": "tsc --noEmit --project tsconfig.app.json" // 独立类型检查
  }
}
```

**优势对比：**

| 特性             | `tsc -b && vite build` | `vite build` + `typecheck` |
| ---------------- | ---------------------- | -------------------------- |
| **构建速度**     | 慢（检查所有文件）     | 快（只转换必要文件）       |
| **类型检查范围** | 递归检查 api 代码      | 只检查 client 代码         |
| **配置冲突**     | ❌ 有冲突              | ✅ 无冲突                  |
| **生产可用**     | ❌ 构建失败            | ✅ 构建成功                |
| **开发体验**     | ❌ IDE 报错            | ✅ 正常使用                |

**实际使用：**

- **日常开发**：只运行 `pnpm build`（快速构建）
- **CI/CD**：可选运行 `pnpm typecheck`（质量检查）
- **IDE**：实时类型检查（通过 Language Server）

---

### 3. API 项目为什么不需要构建？

**答案：wrangler 自动处理 TypeScript 编译。**

#### 本地开发：wrangler dev

```bash
cd projects/api
pnpm dev  # 实际执行: wrangler dev
```

**工作流程：**

```
1. wrangler 读取 src/index.ts
   ↓
2. 使用 esbuild 编译 TypeScript（< 100ms）
   ↓
3. 启动本地 Workers 运行时
   ↓
4. 监听文件变化，自动重新编译
```

**关键点：**

- ✅ 不需要预先运行 `pnpm build`
- ✅ 支持热重载（修改代码自动生效）
- ✅ esbuild 速度极快（比 tsc 快 100 倍）

#### 部署：wrangler deploy

```bash
cd projects/api
pnpm deploy  # 实际执行: wrangler deploy --minify
```

**工作流程：**

```
1. wrangler 读取 src/index.ts（源代码）
   ↓
2. 使用 esbuild 编译 TypeScript
   ↓
3. 打包所有依赖（node_modules）
   ↓
4. 代码压缩（--minify）
   ↓
5. 上传到 Cloudflare Workers
   ↓
6. 部署到全球边缘节点
```

**关键点：**

- ✅ 直接从源码部署，不需要 `dist/` 目录
- ✅ Cloudflare Workers 原生支持 TypeScript
- ✅ wrangler 自动优化（Tree-shaking、压缩）

#### API 的 "build" 命令是什么？

```json
"build": "tsc --noEmit"
```

**实际作用：**

- **只做类型检查**（Type Checking Only）
- `--noEmit` = 不生成任何 `.js` 文件
- 用于 CI/CD 的代码质量检查
- **不影响部署**

**类比：**

```
Client 的 build = 生成静态文件（必须）
API 的 build = 类型检查（可选）
```

---

## 构建流程对比表

| 维度               | Client (React + Vite) | API (Hono + Workers)         |
| ------------------ | --------------------- | ---------------------------- |
| **是否需要构建？** | ✅ 必须               | ❌ 不必须                    |
| **构建命令**       | `vite build`          | `tsc --noEmit`（仅类型检查） |
| **构建工具**       | Vite（基于 Rollup）   | wrangler（基于 esbuild）     |
| **构建产物**       | `dist/` 静态文件      | 无（源码直接部署）           |
| **部署内容**       | HTML/CSS/JS 文件      | TypeScript 源代码            |
| **部署平台**       | Cloudflare Pages      | Cloudflare Workers           |
| **本地开发**       | `vite` (HMR)          | `wrangler dev` (热重载)      |
| **类型检查**       | `tsc --noEmit`        | `tsc --noEmit`               |
| **配置文件**       | `vite.config.ts`      | `wrangler.jsonc`             |

---

## 完整开发与部署流程

### 开发阶段

#### 启动本地环境

```bash
# 终端 1：启动 API
cd projects/api
pnpm dev
# → http://localhost:3000

# 终端 2：启动 Client
cd projects/client
pnpm dev
# → http://localhost:5173
```

#### 类型检查（可选）

```bash
# Client 类型检查
cd projects/client
pnpm typecheck

# API 类型检查
cd projects/api
pnpm build
```

### 部署阶段

#### 1. 部署 API 到 Cloudflare Workers

```bash
cd projects/api

# 首次部署需要登录
wrangler login

# 部署到生产环境
pnpm deploy

# 输出示例：
# ✨ Published vocab-master-api
#    https://vocab-master-api.your-subdomain.workers.dev
```

#### 2. 部署 Client 到 Cloudflare Pages

**方式 A：通过 Dashboard（推荐）**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pages → Create a project → 连接 GitHub
3. 配置：
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Root directory: `projects/client`
   - Environment variable: `VITE_API_URL=https://your-api.workers.dev`

**方式 B：通过 CLI**

```bash
cd projects/client

# 1. 构建
pnpm build

# 2. 部署
wrangler pages deploy dist --project-name=vocab-master-client
```

---

## Shared 包的作用

### 问题

Client 需要导入 API 的路由类型：

```typescript
// Client 需要这个类型来获得类型安全的 API 调用
import type { ApiRoutes } from "???";
```

### 解决方案

创建 `shared` 包作为类型中间层：

```
Client
  ↓ import type from "shared"
Shared (中间层)
  ↓ export type from api
API
```

### 技术实现：TypeScript Project References

**API 配置（`api/tsconfig.json`）：**

```json
{
  "compilerOptions": {
    "composite": true, // 允许被引用
    "declaration": true, // 生成 .d.ts 文件
    "emitDeclarationOnly": true, // 只生成类型文件
    "outDir": "dist"
  }
}
```

**Shared 配置（`shared/tsconfig.json`）：**

```json
{
  "compilerOptions": {
    "composite": true,
    "noEmit": true
  },
  "references": [
    { "path": "../api" } // 声明对 api 的依赖
  ]
}
```

**类型流转：**

```
1. API 导出类型
   api/src/index.ts: export type ApiRoutes = typeof app;

2. TypeScript 生成声明文件
   api/dist/index.d.ts: export type ApiRoutes = ...;

3. Shared 重导出
   shared/src/index.ts: export type { ApiRoutes } from "../../api/src/index";

4. Client 使用
   client/src/lib/api-client.ts: import type { ApiRoutes } from "shared";
```

---

## 常见陷阱与解决方案

### 陷阱 1：Client 直接导入 API 源码

❌ **错误做法：**

```typescript
import type { ApiRoutes } from "../../../api/src/index";
```

**问题：**

- TypeScript 会递归检查 api 的所有源代码
- 配置冲突导致构建失败

✅ **正确做法：**

```typescript
import type { ApiRoutes } from "shared";
```

### 陷阱 2：在 API 项目中运行 "npm run build" 期望生成 dist/

❌ **错误理解：**

"API 项目也需要先 build，生成 dist/ 目录，然后 wrangler 从 dist/ 部署"

✅ **正确理解：**

- wrangler 直接从 `src/index.ts` 读取源代码
- `dist/` 只包含 `.d.ts` 类型文件（给 shared 用）
- 部署时不需要 dist/

### 陷阱 3：修改 API 后 Client 类型不更新

**原因：** TypeScript 缓存问题

✅ **解决：**

```bash
# 删除缓存
rm -rf projects/api/dist
rm -rf projects/api/*.tsbuildinfo

# 重启 TypeScript Server（在 IDE 中）
Ctrl+Shift+P → TypeScript: Restart TS Server
```

---

## 项目文档索引

- [Client 构建说明](projects/client/BUILD.md)
- [API 构建说明](projects/api/BUILD.md)
- [Shared 包说明](projects/shared/README.md)

---

## 总结

### Client 项目（前端）

- ✅ **需要构建**：生成静态文件
- 🔧 **构建工具**：Vite
- 📦 **部署产物**：`dist/` 目录
- 🚀 **部署平台**：Cloudflare Pages
- ⚙️ **关键命令**：`pnpm build`

### API 项目（后端）

- ❌ **不需要构建**：wrangler 自动处理
- 🔧 **构建工具**：wrangler (esbuild)
- 📦 **部署产物**：TypeScript 源代码
- 🚀 **部署平台**：Cloudflare Workers
- ⚙️ **关键命令**：`pnpm deploy`

### Shared 包（类型共享）

- 🎯 **用途**：类型中间层
- 🔗 **技术**：TypeScript Project References
- 📄 **内容**：只有类型定义
- 💡 **优势**：配置隔离，类型安全

---

**最后总结一句话：**

> Client 构建生成静态文件部署到 Pages，API 源码直接部署到 Workers，Shared 通过 Project References 实现类型共享而不引入配置冲突。
