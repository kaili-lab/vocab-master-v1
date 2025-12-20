# Client 项目构建说明

## 项目概述

这是一个基于 **React + Vite + TypeScript** 的前端应用，使用 Hono RPC Client 与后端通信。

## 为什么需要构建？

**答案：是的，必须构建。**

React 应用是基于 JavaScript 的单页应用（SPA），需要经过以下转换才能部署：

1. **TypeScript → JavaScript**：浏览器不直接支持 TypeScript
2. **JSX → JavaScript**：React 的 JSX 语法需要转换
3. **模块打包**：将数百个模块文件打包成几个优化的文件
4. **代码压缩**：减小文件体积，提升加载速度
5. **资源优化**：处理 CSS、图片等静态资源

构建后生成的 `dist/` 目录包含：

- `index.html` - 入口页面
- `assets/*.css` - 样式文件
- `assets/*.js` - JavaScript 代码

这些静态文件可以直接部署到 **Cloudflare Pages**。

---

## 构建命令

### 生产构建

```bash
pnpm build
```

**执行内容：**

```json
"build": "vite build"
```

**为什么只用 `vite build`，不用 `tsc -b`？**

原因是为了避免 TypeScript 配置冲突：

1. **问题根源**：

   - Client 通过 `import type { ApiRoutes } from "shared"` 导入 api 的类型
   - 如果使用 `tsc -b`，TypeScript 会递归检查 api 的所有源代码
   - Client 和 api 有不同的 TypeScript 配置：
     - Client：`"jsx": "react-jsx"`、`"lib": ["DOM"]`（浏览器环境）
     - API：`"jsx": "react-jsx"`、`"jsxImportSource": "hono/jsx"`（Node.js 环境）
   - 配置冲突导致构建失败

2. **解决方案**：

   - **构建阶段**：只用 `vite build`

     - Vite 使用 esbuild 进行快速转换
     - 自带基本的类型检查（足够用于生产构建）
     - 不会递归检查 api 的源代码

   - **类型检查阶段**：独立的 `typecheck` 命令
     - 用于开发时的严格类型检查
     - 可在 CI/CD 中独立运行

### 独立类型检查（可选）

```bash
pnpm typecheck
```

**执行内容：**

```json
"typecheck": "tsc --noEmit --project tsconfig.app.json"
```

**用途：**

- 开发时检查类型错误
- CI/CD 流程中的质量检查
- 不影响生产构建

---

## 开发命令

### 启动开发服务器

```bash
pnpm dev
```

**特点：**

- 热重载（HMR）
- 不需要预先构建
- 实时类型检查（通过 IDE）
- 默认端口：`http://localhost:5173`

### 预览生产构建

```bash
pnpm build
pnpm preview
```

在本地预览构建后的产物，验证生产环境表现。

---

## 部署到 Cloudflare Pages

### 方式 1：通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → **Create a project**
3. 连接到 GitHub 仓库
4. 配置构建设置：

   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Root directory**: `projects/client`
   - **Node version**: `20.x`（或更高）

5. 添加环境变量（可选）：

   - `VITE_API_URL` - API 服务器地址（生产环境）

6. 点击 **Save and Deploy**

### 方式 2：通过 wrangler CLI

```bash
# 安装 wrangler（如果尚未安装）
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建并部署
pnpm build
wrangler pages deploy dist --project-name=vocab-master-client
```

---

## 环境变量配置

### 开发环境

创建 `.env.local` 文件（已在 `.gitignore` 中）：

```env
VITE_API_URL=http://localhost:3000
```

### 生产环境

在 Cloudflare Pages 的 Settings → Environment Variables 中配置：

```
VITE_API_URL=https://your-api.workers.dev
```

**注意：** 环境变量必须以 `VITE_` 开头才能在客户端代码中访问。

---

## 项目结构

```
projects/client/
├── src/                    # 源代码
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── lib/                # 工具库
│   │   └── api-client.ts   # Hono RPC Client 配置 ⭐
│   ├── hooks/              # 自定义 Hooks
│   ├── utils/              # 工具函数
│   └── main.tsx            # 应用入口
├── public/                 # 静态资源（直接复制到 dist/）
├── dist/                   # 构建输出（.gitignore）
├── tsconfig.json           # TypeScript 配置（协调器）
├── tsconfig.app.json       # 应用代码配置
├── tsconfig.node.json      # 构建工具配置
├── vite.config.ts          # Vite 配置
└── package.json            # 依赖和脚本
```

---

## 构建优化

当前构建输出显示：

```
dist/assets/index-UEysjBov.js   656.56 kB │ gzip: 201.94 kB

(!) Some chunks are larger than 500 kB after minification.
```

### 优化建议

1. **代码分割（Code Splitting）**：

   ```typescript
   // 使用动态导入懒加载路由
   const Dashboard = lazy(() => import("./pages/dashboard"));
   ```

2. **手动分块（Manual Chunks）**：

   在 `vite.config.ts` 中配置：

   ```typescript
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             "react-vendor": ["react", "react-dom", "react-router-dom"],
             "ui-vendor": [
               "@radix-ui/react-dialog",
               "@radix-ui/react-dropdown-menu",
             ],
           },
         },
       },
     },
   });
   ```

3. **分析打包体积**：

   ```bash
   pnpm add -D rollup-plugin-visualizer
   ```

---

## 常见问题

### Q: 为什么开发环境正常，但构建失败？

**A**: 可能的原因：

1. **环境变量缺失**：检查 `VITE_` 前缀的环境变量
2. **类型错误**：运行 `pnpm typecheck` 检查
3. **依赖问题**：删除 `node_modules` 和 `pnpm-lock.yaml`，重新安装

### Q: 构建后 API 请求失败？

**A**: 检查 `VITE_API_URL` 环境变量是否正确配置为生产环境的 API 地址。

### Q: Cloudflare Pages 部署失败？

**A**: 常见原因：

1. **Build command 路径错误**：确保 Root directory 设置为 `projects/client`
2. **Node 版本过低**：使用 Node 20.x 或更高
3. **依赖安装失败**：检查 `package.json` 中的依赖版本

---

## 技术栈

- **框架**：React 19
- **构建工具**：Vite 7
- **语言**：TypeScript 5.9
- **UI 库**：Radix UI + Tailwind CSS
- **API 通信**：Hono RPC Client
- **状态管理**：Zustand + React Query
- **路由**：React Router v7
- **认证**：Better Auth Client

---

## 相关文档

- [Vite 官方文档](https://vitejs.dev/)
- [Cloudflare Pages 部署指南](https://developers.cloudflare.com/pages/)
- [Hono RPC 使用指南](https://hono.dev/docs/guides/rpc)
- [Shared 包说明](../shared/README.md)
