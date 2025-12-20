# 更新用户信息后刷新 Session

## 🎯 核心问题

当通过 API 更新用户信息后，Better Auth 的 session **不会自动更新**，导致前端显示的用户数据还是旧的。

## ✅ 解决方案

使用 Better Auth 的 `useSession` 提供的 **`refetch()`** 方法手动刷新 session。

## 📝 使用步骤

### 1. 在 `use-auth.ts` 中导出 `refetch`

```typescript
export function useAuth() {
  const { data: session, isPending, error, refetch } = useSession();

  return {
    user: session?.user,
    session,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
    refetch, // ✅ 导出 refetch 方法
  };
}
```

### 2. 在组件中使用

```typescript
import { useAuth } from "@/hooks/use-auth";

export default function MyComponent() {
  const { user, refetch } = useAuth();
  const updateUser = useUpdateUser();

  const handleUpdate = async () => {
    // 1. 更新用户信息
    await updateUser.mutateAsync({
      vocabularyLevel: "cet4",
      name: "新名字",
    });

    // 2. ✅ 刷新 session
    refetch();

    // 3. 现在 user 会自动更新为最新数据
  };
}
```

## 🔄 工作原理

```
更新数据库
    ↓
调用 refetch()
    ↓
Better Auth 重新请求 /session API
    ↓
从服务器获取最新 session
    ↓
所有使用 useAuth() 的组件自动更新 ✅
```

## 💡 关键点

- **`refetch()` 是 React Query 提供的方法**（Better Auth 基于 React Query）
- **无需刷新页面**，保持 SPA 体验
- **所有组件自动同步**，一次 refetch，全局更新
- **官方推荐方法**，可靠且优雅

## 📊 方案对比

| 方案                              | 刷新页面 | Session 更新 | 用户体验 | 推荐度     |
| --------------------------------- | -------- | ------------ | -------- | ---------- |
| `refetch()`                       | ❌ 否    | ✅ 是        | ✅ 流畅  | ⭐⭐⭐⭐⭐ |
| `window.location.href`            | ✅ 是    | ✅ 是        | ❌ 闪烁  | ⭐⭐       |
| `queryClient.invalidateQueries()` | ❌ 否    | ⚠️ 不可靠    | ✅ 流畅  | ❌ 不推荐  |

## 🎯 完整示例

```typescript
// vocab-level.tsx
const handleConfirm = async () => {
  try {
    // 1. 更新用户词汇等级
    await updateUser.mutateAsync({
      vocabularyLevel: selectedLevel,
    });

    // 2. ✅ 等待 session 刷新完成
    await refetch();

    // 3. 显示成功提示
    toast.success("设置成功！");

    // 4. ✅ 组件会自动重新渲染，检测到有 vocabularyLevel 后会自动跳转
    // 无需手动调用 navigate()
  } catch (error) {
    toast.error("设置失败");
  }
};

// 在 render 中：
if (extendedUser?.vocabularyLevel) {
  return <Navigate to="/dashboard" replace />;
}
```

## ⚠️ 注意事项

1. **建议使用 `await refetch()`**：

   - 虽然 React Query 会自动处理异步更新
   - 但使用 `await` 可以确保 session 完全更新后再继续
   - 避免时序问题，特别是在需要立即使用新数据时

2. **自动重新渲染**：

   - `refetch()` 完成后，所有使用 `useAuth()` 的组件会自动重新渲染
   - 配合声明式的 `<Navigate>` 组件，无需手动跳转

3. **自动重试机制**：
   - React Query 默认有重试机制，失败会自动重试
4. **缓存管理**：
   - React Query 自动管理缓存，无需手动清理

## 🔗 相关资源

- [Better Auth 文档](https://www.better-auth.com/docs)
- [React Query 文档](https://tanstack.com/query/latest)
