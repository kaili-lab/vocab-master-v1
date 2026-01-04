# 开发环境配置指南

## VSCode配置

### TypeScript路径别名问题

#### 问题现象

在Monorepo项目中，VSCode可能无法识别TypeScript路径别名（如`@/*`），提示错误：

```
Cannot find module '@/components/xxx' or its corresponding type declarations.ts(2307)
```

但Vite运行和Cursor编辑器都正常工作。

#### 根本原因

1. **TypeScript版本不匹配**：VSCode默认使用内置的TypeScript版本（如6.0.0），而项目使用5.9.3
2. **项目引用支持**：内置TypeScript可能无法正确处理项目引用（Project References）架构

#### 解决方案

**方案1：配置VSCode使用项目TypeScript（推荐）**

在项目根目录创建`.vscode/settings.json`：

```json
{
  "typescript.tsdk": "projects/client/node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

**效果**：
- ✅ VSCode使用项目的TypeScript版本
- ✅ 正确处理项目引用
- ✅ 路径别名正常工作

**方案2：手动切换TypeScript版本（临时）**

1. 打开任意`.tsx`文件
2. 点击右下角TypeScript版本号（如`TypeScript 6.0.0`）
3. 选择**"Use Workspace Version"**
4. 按`Ctrl+Shift+P` → 执行`TypeScript: Restart TS Server`

**方案3：单独打开子项目**

```bash
cd projects/client
code .
```

直接打开子项目目录，避免Monorepo复杂性。

---

## 项目结构说明

### Monorepo配置

```
vocab-master/                      # 根目录
├── .vscode/
│   └── settings.json              # VSCode配置（指定TS版本）
├── tsconfig.json                  # 根配置（项目引用）
├── projects/
│   ├── api/                       # 后端项目
│   └── client/                    # 前端项目
│       ├── tsconfig.json          # 协调器配置
│       ├── tsconfig.app.json      # 应用代码配置（包含paths）
│       ├── tsconfig.node.json     # Node环境配置
│       └── vite.config.ts         # Vite配置（包含别名）
```

### TypeScript项目引用

前端使用TypeScript项目引用架构，将配置拆分为多个文件：

- `tsconfig.json`：空的协调器，引用其他配置
- `tsconfig.app.json`：应用代码配置（DOM类型，路径别名）
- `tsconfig.node.json`：构建工具配置（Node类型）

**好处**：
- ✅ 环境隔离（浏览器 vs Node.js）
- ✅ 并行编译
- ✅ 清晰的依赖关系

**代价**：
- ⚠️ IDE需要正确理解引用关系
- ⚠️ 配置复杂度增加

---

## 路径别名配置

### TypeScript配置

`projects/client/tsconfig.app.json`：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Vite配置

`projects/client/vite.config.ts`：

```typescript
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### ESLint配置

`projects/client/.eslintrc.cjs`：

```javascript
module.exports = {
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.app.json",
      },
    },
  },
};
```

---

## 最佳实践

### 对于Monorepo项目

1. **配置`.vscode/settings.json`**：确保VSCode使用正确的TypeScript版本
2. **提交到Git**：让团队成员都能受益
3. **避免使用`baseUrl`**：TypeScript 5.0+已弃用，只使用`paths`
4. **定期更新依赖**：保持TypeScript版本与VSCode内置版本接近

### 对于简单项目

- 可以不使用项目引用，将配置合并到单个`tsconfig.json`
- 减少配置复杂度

---

## 常见问题

### Q1：为什么Cursor可以开箱即用，VSCode不行？

Cursor自动检测并使用项目的TypeScript版本，而VSCode默认使用内置版本。

### Q2：baseUrl弃用警告怎么处理？

TypeScript 5.0+开始弃用`baseUrl`，建议移除它，只保留`paths`：

```json
{
  "compilerOptions": {
    // 删除这行：
    // "baseUrl": ".",
    
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

路径相对于`tsconfig.json`所在目录。

### Q3：切换TypeScript版本后还是报错？

尝试重启TypeScript服务器：
- `Ctrl+Shift+P` → `TypeScript: Restart TS Server`

---

## 相关资源

- [TypeScript项目引用文档](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [VSCode TypeScript设置](https://code.visualstudio.com/docs/typescript/typescript-compiling)
- [Vite路径别名](https://vitejs.dev/config/shared-options.html#resolve-alias)

---

**最后更新**：2026-01-05

