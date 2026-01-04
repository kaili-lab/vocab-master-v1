# 功能实现记录

本文档记录前端功能的实现细节和优化历程。

---

## 词汇等级选择功能

### 功能概述

用户首次登录后，如果尚未设置词汇等级，将被自动重定向到词汇等级选择页面`/level`，完成等级选择后才能访问Dashboard。

### 数据库字段

- 字段：`vocabularyLevel`（users表）
- 类型：枚举值
- 可选：是（默认null）
- 可选值：
  - `primary_school` - 小学词汇（约800词）
  - `middle_school` - 初中词汇（约1,600词）
  - `high_school` - 高中词汇（约3,500词）
  - `cet4` - 大学四级（约4,500词）
  - `cet6` - 大学六级（约6,000词）
  - `ielts_toefl` - 雅思托福（约8,000+词）

### 实现要点

1. **数据统一管理**：`src/utils/vocabulary.ts`统一管理所有词汇等级配置
2. **声明式重定向**：使用`<Navigate>`组件而非`navigate()`函数
3. **Session同步**：使用`await refetch()`确保更新完成后再跳转
4. **类型安全**：使用`ExtendedUser`类型确保TypeScript检查

### 用户流程

```
首次登录 → 访问/dashboard → 检测无vocabularyLevel 
  → 重定向到/level → 选择等级 → 保存并refetch()
  → 检测到vocabularyLevel → 重定向到/dashboard
```

### 相关文件

- `src/pages/dashboard.tsx` - Dashboard页面
- `src/pages/vocab-level.tsx` - 词汇等级选择页面
- `src/utils/vocabulary.ts` - 词汇等级数据管理
- `src/components/layout/dashboard-navbar.tsx` - NavBar显示等级

---

## 更新用户信息后刷新Session

### 核心问题

当通过API更新用户信息后，Better Auth的session不会自动更新，导致前端显示的用户数据还是旧的。

### 解决方案

使用Better Auth的`useSession`提供的`refetch()`方法手动刷新session。

### 实现步骤

#### 1. 在`use-auth.ts`中导出`refetch`

```typescript
export function useAuth() {
  const { data: session, isPending, error, refetch } = useSession();

  return {
    user: session?.user,
    session,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
    refetch, // ✅ 导出refetch方法
  };
}
```

#### 2. 在组件中使用

```typescript
import { useAuth } from "@/hooks/use-auth";

export default function MyComponent() {
  const { user, refetch } = useAuth();
  const updateUser = useUpdateUser();

  const handleUpdate = async () => {
    // 1. 更新用户信息
    await updateUser.mutateAsync({
      vocabularyLevel: "cet4",
    });

    // 2. ✅ 刷新session（等待完成）
    await refetch();

    // 3. 现在user会自动更新为最新数据
  };
}
```

### 工作原理

```
更新数据库 → 调用refetch()
  → Better Auth重新请求/session API
  → 从服务器获取最新session
  → 所有使用useAuth()的组件自动更新 ✅
```

### 关键点

- `refetch()`是React Query提供的方法（Better Auth基于React Query）
- 无需刷新页面，保持SPA体验
- 所有组件自动同步，一次refetch全局更新
- 建议使用`await refetch()`确保更新完成后再继续

---

## 词汇等级功能优化记录

### 优化时间

2025-11-03

### 优化目标

简化词汇等级选择和重定向逻辑，提升代码可维护性和用户体验。

### 优化成果

- **Dashboard页面**：105行 → 42行（减少60%）
- **Vocab-level页面**：197行 → 165行（减少17%）
- **总计减少**：97行代码

### Bug修复

- ✅ 修复了页面刷新后`location.state.fromLevelSelection`保留导致无法重定向的bug
- ✅ 修复了React.StrictMode下useEffect双重执行导致的问题
- ✅ 修复了setTimeout定时器可能被清理导致重定向失败的问题

### 主要改动

#### 1. Dashboard页面优化

**优化前问题**：
- ❌ 使用`useState`管理`shouldRedirect`（不必要）
- ❌ 使用`useEffect`监听并延迟跳转（复杂）
- ❌ 使用`setTimeout`延迟（可能被清理）
- ❌ 依赖`fromLevelSelection`导致刷新后无法跳转
- ❌ 三层重复检查逻辑

**优化后**：

```typescript
export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const extendedUser = user as ExtendedUser | undefined;

  if (isLoading) {
    return <div>加载中...</div>;
  }

  // ✅ 没有词汇等级，直接重定向
  if (!extendedUser?.vocabularyLevel) {
    return <Navigate to="/level" replace />;
  }

  return <Dashboard />;
}
```

**改进**：
- ✅ 使用声明式的`<Navigate>`组件
- ✅ 移除所有state和useEffect
- ✅ 移除setTimeout延迟
- ✅ 单一检查点，逻辑清晰

#### 2. Vocab-level页面优化

**优化前问题**：
- ❌ 使用useEffect + setTimeout延迟重定向
- ❌ `refetch()`没有await
- ❌ 手动调用`navigate()`跳转
- ❌ 传递`state: { fromLevelSelection: true }`

**优化后**：

```typescript
export default function VocabLevelSelection() {
  const { user, isLoading, refetch } = useAuth();

  const handleConfirm = async () => {
    // 1. 更新用户信息
    await updateUser.mutateAsync({ vocabularyLevel: selectedLevel });

    // 2. ✅ 等待session刷新完成
    await refetch();

    // 3. 显示成功提示
    toast.success("词汇等级设置成功！");

    // 4. ✅ 组件会自动重新渲染并跳转
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  // ✅ 如果已设置词汇等级，重定向到dashboard
  if (extendedUser?.vocabularyLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return <VocabLevelForm />;
}
```

**改进**：
- ✅ 使用`<Navigate>`替代useEffect + navigate
- ✅ 使用`await refetch()`确保session更新完成
- ✅ 移除手动`navigate()`调用
- ✅ 自动重新渲染并跳转

#### 3. 新增统一数据管理

创建了`src/utils/vocabulary.ts`统一管理词汇等级数据：

```typescript
export const vocabularyLevels: VocabularyLevelInfo[] = [
  {
    id: "primary_school",
    emoji: "📚",
    title: "小学词汇（约 800 词）",
    scene: "适合：基础入门、儿童学习",
    reference: "参考：小学毕业水平",
    wordCount: "800",
    label: "小学",
  },
  // ...其他等级
];

export function getVocabularyDisplay(level: VocabularyLevel | null | undefined) {
  // 返回格式化的显示信息
}
```

**优势**：
- ✅ 单一数据源，避免重复定义
- ✅ 在选择页面、NavBar等多处复用
- ✅ 易于维护和扩展

### 核心改进点

#### 1. 声明式重定向

**之前**：命令式`navigate()`

```typescript
navigate("/level", { replace: true });
```

**现在**：声明式`<Navigate>`

```typescript
if (!vocabularyLevel) {
  return <Navigate to="/level" replace />;
}
```

**优势**：更符合React理念，不会有时序问题，代码更易理解

#### 2. 移除状态管理

能用props和条件判断的不用state，能用计算值的不用派生state，保持组件状态最小化。

#### 3. await refetch()

**之前**：不等待refetch完成

```typescript
refetch(); // 异步但不等待
navigate("/dashboard"); // 立即跳转，可能session还没更新
```

**现在**：等待refetch完成

```typescript
await refetch(); // 等待session更新完成
// 组件自动重新渲染并跳转
```

#### 4. 移除location.state

不使用`state: { fromLevelSelection: true }`标记，通过`await refetch()`确保session更新后自动重定向。

### 经验总结

1. **优先使用声明式编程**：使用`<Navigate>`而不是`navigate()`
2. **避免不必要的状态**：能用props和条件判断的不用state
3. **理解异步操作**：使用`await refetch()`确保session更新
4. **简化重于技巧**：简单的条件判断优于复杂的状态管理

---

## 测试建议

### 词汇等级功能测试

1. **首次用户测试**：
   - 新注册用户，验证是否自动跳转到`/level`
   - 选择等级后，验证是否能正常进入Dashboard
   - 验证NavBar是否正确显示词汇等级

2. **老用户测试**：
   - 已有`vocabularyLevel`的用户，验证直接访问Dashboard
   - 验证刷新页面后NavBar显示是否正常

3. **边界情况**：
   - 未登录用户访问`/level`和`/dashboard`，验证`ProtectedRoute`是否生效
   - 删除用户的`vocabularyLevel`，刷新`/dashboard`验证是否正常跳转
   - 已有等级的用户访问`/level`，验证是否跳转回Dashboard

### Session刷新测试

1. 更新用户信息后，验证前端显示是否立即更新
2. 在Network标签验证是否发起了session请求
3. 验证多个组件是否同步更新

---

**最后更新**：2026-01-05

