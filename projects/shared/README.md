# Shared Package

## 用途

这是一个共享类型包，用于在 client 和 api 之间共享 API 路由类型定义。

## 为什么需要这个包？

在 Hono RPC 的 monorepo 架构中，client 需要导入 api 的类型定义来获得类型安全的 API 调用。但是，如果 client 直接导入 api 的源代码，会导致以下问题：

1. TypeScript 编译器会递归检查 api 的所有源代码
2. client 和 api 可能有不同的 TypeScript 配置（如 `erasableSyntaxOnly`、`jsx`、`lib` 等）
3. 构建时可能出现配置冲突，导致编译失败

## 架构设计

```
client (前端)
  ↓ 导入类型
shared (类型中间层)
  ↓ 通过 TypeScript Project References
  ↓ 读取 api/dist/*.d.ts 类型声明文件
api (后端)
```

## 技术实现

### TypeScript Project References

本项目使用 **TypeScript 项目引用（Project References）** 来实现跨项目的类型共享。

#### api 项目配置（`projects/api/tsconfig.json`）

```json
{
  "compilerOptions": {
    "composite": true, // 启用项目引用支持
    "declaration": true, // 生成类型声明文件
    "emitDeclarationOnly": true, // 只生成 .d.ts，不生成 .js
    "outDir": "dist" // 输出到 dist 目录
  }
}
```

**关键配置说明：**

- `composite: true` - 允许被其他项目引用
- `emitDeclarationOnly: true` - 只输出 `.d.ts` 类型声明文件，不输出 `.js` 文件
- `outDir: "dist"` - 声明文件输出到 `dist/` 目录（已在 `.gitignore` 中）

#### shared 项目配置（`projects/shared/tsconfig.json`）

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "noEmit": true
  },
  "references": [
    { "path": "../api" } // 声明对 api 项目的依赖
  ]
}
```

**关键配置说明：**

- `references` - 声明对 api 项目的引用，TypeScript 会读取 `api/dist/*.d.ts` 文件
- `noEmit: true` - shared 本身不需要生成文件

### 类型流转机制

1. **api 项目导出类型**（`projects/api/src/index.ts`）：

   ```typescript
   export type ApiRoutes = typeof apiRoutes;
   ```

2. **TypeScript 编译生成声明文件**：

   - 自动生成 `projects/api/dist/index.d.ts`
   - 包含 `ApiRoutes` 的类型定义

3. **shared 重导出类型**（`projects/shared/src/index.ts`）：

   ```typescript
   export type { ApiRoutes } from "../../api/src/index";
   ```

   - TypeScript 通过 Project References 解析这个导入
   - 实际读取 `api/dist/index.d.ts` 中的类型

4. **client 使用类型**（`projects/client/src/lib/api-client.ts`）：
   ```typescript
   import type { ApiRoutes } from "shared";
   ```

## 解决方案优势

通过 shared 包 + TypeScript Project References：

1. **配置隔离**：shared 和 client 不会被 api 的 TypeScript 配置（jsx、lib 等）影响
2. **类型安全**：通过 `.d.ts` 文件传递类型，保持端到端类型推导
3. **实时更新**：修改 api 类型后，TypeScript 自动重新生成声明文件
4. **独立部署**：api 和 client 可独立部署到 Cloudflare，不互相依赖源代码
5. **性能优化**：TypeScript 只读取声明文件，不检查 api 的完整源代码

## 使用方式

在 client 中导入 API 类型：

```typescript
import type { ApiRoutes } from "shared";
import { hc } from "hono/client";

// 创建类型安全的 API 客户端
const client = hc<ApiRoutes>("/api");
```

## 注意事项

### ✅ 优势

- 当 api 的路由类型发生变化时，TypeScript 会自动重新生成 `.d.ts` 文件
- shared 包使用 `workspace:*` 协议，确保始终使用最新版本
- 不需要手动构建或发布 npm 包

### ⚠️ 重要说明

1. **dist/ 目录已被 gitignore**：`.d.ts` 文件是编译生成的，不提交到 Git
2. **首次克隆项目后**：TypeScript 会自动生成 `.d.ts` 文件，无需手动操作
3. **wrangler 不受影响**：wrangler 仍然直接读取 `api/src/index.ts` 源文件进行部署

### 🛠️ 常见问题

#### Q: 出现 "Referenced project may not disable emit" 错误？

**A**: 这意味着被引用的项目（api）设置了 `noEmit: true`。解决方法：

- 确保 api 的 tsconfig 中使用 `emitDeclarationOnly: true` 而不是 `noEmit: true`

#### Q: 修改 api 类型后，client 没有更新？

**A**: 可能是 TypeScript 缓存问题，尝试：

```bash
# 删除 TypeScript 缓存
rm -rf projects/api/dist
rm -rf projects/api/*.tsbuildinfo

# 重启 TypeScript Server（在 VSCode/Cursor 中）
Ctrl+Shift+P -> TypeScript: Restart TS Server
```

#### Q: 为什么不直接使用 OpenAPI + Code Generate？

**A**:

- **Hono RPC** 适合 TypeScript monorepo，无需额外配置，类型实时同步
- **OpenAPI** 适合多语言客户端、需要 API 文档或团队对 OpenAPI 生态更熟悉的场景
- 两者各有优势，根据团队需求选择
