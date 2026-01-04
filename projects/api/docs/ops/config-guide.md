# 配置说明指南

> **受众**: 开发者  
> **用途**: 项目配置文件说明

---

## wrangler 配置

### 基本配置

```jsonc
// wrangler.jsonc
{
  "name": "vocab-master-api",        // Workers 名称
  "main": "src/index.ts",            // 入口文件（TypeScript源码）
  "compatibility_date": "2024-11-27",// 兼容性日期
  "node_compat": true                // 启用 Node.js 兼容层
}
```

### 环境变量

**公开变量** (`vars`)：
```jsonc
{
  "vars": {
    "ENVIRONMENT": "production",
    "LOG_LEVEL": "info"
  }
}
```

**敏感变量** (Secrets)：
```bash
# 通过命令行设置
wrangler secret put DATABASE_URL
wrangler secret put STRIPE_SECRET_KEY
```

### 资源绑定

```jsonc
{
  // KV 存储
  "kv_namespaces": [
    { "binding": "KV", "id": "your-kv-id" }
  ],
  
  // D1 数据库
  "d1_databases": [
    { "binding": "DB", "database_id": "your-d1-id" }
  ]
}
```

---

## ESLint 配置

### eslint.config.js

```javascript
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",  // 允许 _db, _next
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
```

### 忽略文件

```bash
# .eslintignore
dist/
.wrangler/
drizzle/
node_modules/
```

---

## TypeScript 配置

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
    "jsxImportSource": "hono/jsx",
    
    // 类型声明输出（用于 shared 包）
    "declaration": true,
    "emitDeclarationOnly": true,
    "declarationDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".wrangler"]
}
```

**关键配置**：
- `emitDeclarationOnly`: 只生成 `.d.ts` 类型声明，不生成 `.js`
- `moduleResolution: "Bundler"`: 适配 wrangler 的 esbuild 打包

---

## Drizzle 配置

### drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".dev.vars" });  // Cloudflare 环境变量文件

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**注意**：Drizzle Kit 在 Node.js 环境运行，需要 `dotenv`

---

## Vitest 配置

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,  // 全局 describe, it, expect
    environment: "node",
  },
});
```

### 运行测试

```bash
pnpm test        # 监听模式
pnpm test:run    # 单次运行
pnpm test:ui     # UI 模式
```

---

## package.json 脚本

```json
{
  "scripts": {
    // 开发
    "dev": "tsx watch src/index.node.ts",     // Node.js 模式
    "dev:cf": "wrangler dev",                 // Cloudflare 模式
    
    // 构建
    "build": "tsc --noEmit",                  // 类型检查
    
    // 部署
    "deploy": "wrangler deploy --minify",
    
    // 测试
    "test": "vitest",
    "test:run": "vitest run",
    
    // 数据库
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 环境变量文件

### .dev.vars (Cloudflare Workers)

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
```

### .env (Node.js)

```bash
# 从 .dev.vars 复制，然后添加：
PORT=3000
NODE_ENV=development
```

### .dev.vars.example

提交到 git 的示例文件（不含实际值）：

```bash
DATABASE_URL=postgresql://user:pass@host/db
BETTER_AUTH_SECRET=your-secret-here
STRIPE_SECRET_KEY=sk_test_xxx
```

---

## .gitignore 配置

```bash
# 环境变量
.dev.vars
.env

# 构建产物
dist/
.wrangler/

# 依赖
node_modules/

# 日志
*.log

# 临时文件
.DS_Store
```

---

## Monorepo 配置

### pnpm-workspace.yaml

```yaml
packages:
  - "projects/api"
  - "projects/client"
  - "projects/shared"
```

### 根目录 package.json

```json
{
  "scripts": {
    "dev:api": "pnpm --filter @vocab-master/api dev",
    "dev:client": "pnpm --filter @vocab-master/client dev",
    "build": "pnpm -r build"
  }
}
```

---

## 关键文件清单

| 文件 | 用途 | 提交到 git |
|------|------|-----------|
| `wrangler.jsonc` | Cloudflare Workers 配置 | ✅ |
| `.dev.vars` | 本地环境变量 | ❌ |
| `.dev.vars.example` | 环境变量示例 | ✅ |
| `eslint.config.js` | ESLint 配置 | ✅ |
| `tsconfig.json` | TypeScript 配置 | ✅ |
| `drizzle.config.ts` | Drizzle ORM 配置 | ✅ |
| `vitest.config.ts` | 测试配置 | ✅ |
| `package.json` | 依赖和脚本 | ✅ |

---

## 配置优先级

### 环境变量

1. Cloudflare Dashboard Secrets (生产)
2. `wrangler secret` 命令 (本地覆盖)
3. `.dev.vars` (本地开发)
4. `wrangler.jsonc` 中的 `vars` (非敏感)

### TypeScript

1. `tsconfig.json`
2. IDE 设置
3. ESLint 规则

