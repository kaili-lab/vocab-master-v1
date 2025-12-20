# ESLint 配置说明

## 为什么需要 ESLint？

API 项目包含 38+ 个 TypeScript 文件，ESLint 提供：

- ✅ 代码质量检查（未使用的变量、类型错误等）
- ✅ 代码风格统一（配合 Prettier）
- ✅ TypeScript 最佳实践（type imports、类型安全等）

## 配置文件：eslint.config.js

### 配置格式：ESLint 9 扁平化配置

项目使用 **ESLint 9 的原生扁平化配置格式**（Flat Config），直接导出配置数组：

```javascript
export default [
  { ignores: [...] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { /* 自定义配置 */ }
]
```

**为什么不使用 `tseslint.config()` 包装器？**

- ❌ `tseslint.config()` 的某些签名已被标记为弃用
- ❌ TypeScript ESLint v8.46+ 开始弃用旧的展开式配置方式
- ✅ ESLint 9 原生数组格式是官方推荐的标准格式
- ✅ 避免未来版本兼容性问题

## Monorepo 特殊配置

### 问题：多个 tsconfig.json 导致的歧义

由于项目是 pnpm Monorepo 结构，有多个 tsconfig.json 文件：

- `projects/api/tsconfig.json`
- `projects/client/tsconfig.json`
- `projects/shared/tsconfig.json`

TypeScript ESLint 解析器在扫描时会发现多个候选根目录，无法确定应该使用哪个。

### 解决方案：设置 tsconfigRootDir

必须显式设置 `tsconfigRootDir` 告诉解析器当前项目的根目录：

```javascript
{
  files: ["**/*.ts"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: "./tsconfig.json",
      tsconfigRootDir: import.meta.dirname,  // ⭐ 关键配置
    },
  },
}
```

**配置说明：**

- `project: "./tsconfig.json"` - 相对路径，指向项目的 TypeScript 配置
- `tsconfigRootDir: import.meta.dirname` - 当前配置文件所在目录的绝对路径
- `import.meta.dirname` - ES 模块中获取当前文件目录的标准方式

**如果不设置会发生什么？**

```
❌ 报错：No tsconfigRootDir was set, and multiple candidate TSConfigRootDirs are present:
   - D:\web\my-projects\vocab-master\projects\api
   - D:\web\my-projects\vocab-master\projects\client
```

- ❌ ESLint 无法确定使用哪个 tsconfig.json
- ❌ 类型检查规则无法正常工作
- ❌ IDE 会显示持续的错误警告

## 忽略文件配置

```javascript
{
  ignores: ["dist", "node_modules", "docs/**/*.js"];
}
```

**为什么要忽略这些文件？**

- `dist/` - TypeScript 生成的类型声明文件（不需要 lint）
- `node_modules/` - 第三方依赖（不需要 lint）
- `docs/**/*.js` - 临时测试脚本（不需要 lint）

**为什么不是 `"*.js"`？**

- ❌ `"*.js"` 会忽略**所有** JS 文件，包括 `eslint.config.js` 配置文件本身
- ❌ 导致配置文件产生警告：`File ignored because of a matching ignore pattern`
- ✅ 使用具体路径模式（如 `"docs/**/*.js"`），只忽略特定目录
- ✅ 配置文件不会被忽略

## 主要规则说明

### 1. `@typescript-eslint/consistent-type-imports`

```javascript
"@typescript-eslint/consistent-type-imports": [
  "warn",
  {
    prefer: "type-imports",
    fixStyle: "inline-type-imports",
  },
]
```

**作用：**

- 强制使用 `import type` 导入类型
- 优化构建体积（类型在编译时被移除，不会打包到生产代码）

**示例：**

```typescript
// ❌ 错误
import { User } from "./types";

// ✅ 正确
import type { User } from "./types";

// ✅ 内联类型导入（推荐）
import { getUser, type User } from "./api";
```

### 2. `@typescript-eslint/no-unused-vars`

```javascript
"@typescript-eslint/no-unused-vars": [
  "warn",
  {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_",
  },
]
```

**作用：**

- 警告未使用的变量和参数
- 允许以 `_` 开头的变量（约定俗成的"有意忽略"标记）

**示例：**

```typescript
// ❌ 警告：'unused' is defined but never used
function example(unused: string) {}

// ✅ 正确：使用 _ 前缀表示有意忽略
function example(_unused: string) {}
```

### 3. `@typescript-eslint/no-explicit-any`

```javascript
"@typescript-eslint/no-explicit-any": "warn"
```

**作用：**

- 警告（而非错误）使用 `any` 类型
- Hono 框架某些场景需要 `any`，所以设为警告级别

## 配置结构说明

```javascript
export default [
  // 1. 忽略文件（全局）
  {
    ignores: ["dist", "node_modules", "docs/**/*.js"],
  },

  // 2. JavaScript 基础规则
  js.configs.recommended,

  // 3. TypeScript 推荐规则
  ...tseslint.configs.recommended,

  // 4. TypeScript 文件的详细配置
  {
    files: ["**/*.ts"],
    languageOptions: {
      /* 解析器配置 */
    },
    rules: {
      /* 自定义规则 */
    },
  },

  // 5. Prettier（放在最后，覆盖格式规则）
  prettier,
];
```

**配置顺序很重要：**

1. 忽略规则放在最前面
2. 基础配置在中间
3. 自定义规则覆盖基础配置
4. Prettier 放在最后，避免与格式相关规则冲突

## 运行 ESLint

```bash
# 检查代码
pnpm lint

# 自动修复
pnpm lint:fix
```

**注意：** 需要在 `package.json` 中添加这些脚本：

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## 与 Node.js 部署的兼容性

如果将来需要迁移到 Node.js 服务器：

- ✅ ESLint 配置**无需修改**
- ✅ 始终只 lint 源代码（`src/**/*.ts`）
- ✅ 编译输出（`dist/`）已被忽略
- ✅ 无论编译生成多少 `.js` 文件，都不会被 lint

## 常见问题

### Q1: 为什么 IDE 显示 "No tsconfigRootDir" 错误？

**A:** 确保在 `parserOptions` 中设置了 `tsconfigRootDir: import.meta.dirname`。

### Q2: 为什么配置文件本身显示警告？

**A:** 检查 `ignores` 配置，不要使用 `"*.js"` 这样的全局模式。

### Q3: 可以禁用某些规则吗？

**A:** 可以，在 `rules` 对象中设置规则为 `"off"`：

```javascript
rules: {
  "@typescript-eslint/no-explicit-any": "off",  // 完全禁用
}
```

### Q4: 如何在特定文件中禁用规则？

**A:** 使用注释：

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
const data: any = fetchData();
/* eslint-enable @typescript-eslint/no-explicit-any */
```

## 参考资料

- [ESLint 9 扁平化配置文档](https://eslint.org/docs/latest/use/configure/configuration-files)
- [TypeScript ESLint 文档](https://typescript-eslint.io/)
- [Monorepo 配置指南](https://typescript-eslint.io/packages/parser/#tsconfigrootdir)

---

**最后更新：** 2025-12-13 - 迁移到 ESLint 9 原生格式，解决 `tseslint.config()` 弃用警告
