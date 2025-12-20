# API 项目文档索引

> **📚 文档中心**：快速找到你需要的文档  
> **📅 最后更新**：2025-01-15  

---

## 🚀 快速开始

**新人必读**（30分钟快速上手）：
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - 整体架构设计（15分钟）
2. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 如何启动项目（5分钟）
3. [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) - 认证功能说明（10分钟）

---

## 📚 文档分类

### 🌐 架构文档

**核心架构**：
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 整体架构设计理念
  - ✨ 为什么选择 Cloudflare Workers？
  - ✨ 依赖注入模式详解
  - ✨ 环境兼容性策略

**专项深化**：
- **[Drizzle架构设计.md](./Drizzle架构设计.md)** - 数据库层深度指南
  - 工厂函数模式
  - Service 层设计
  - 查询最佳实践
  
- **[BetterAuth和HonoRPC.md](./BetterAuth和HonoRPC.md)** - 认证和 RPC 架构
  - 为什么混合使用？
  - 职责分工说明
  - 2025-11 鉴权更新

- **[database-transactions-guide.md](./database-transactions-guide.md)** - 数据库事务指南
  - 为什么不支持事务？
  - 如何启用事务支持？
  - 无事务环境最佳实践

---

### 🔧 配置文档

- **[BINDINGS_EXPLAINED.md](./BINDINGS_EXPLAINED.md)** - 环境变量类型定义
  - Cloudflare Workers Bindings 详解
  - 类型安全的环境变量配置

- **[wrangler配置文件解析.md](./wrangler配置文件解析.md)** - Wrangler 完整配置指南
  - 为什么改用 .jsonc？
  - 配置项详解

- **[eslint配置说明.md](./eslint配置说明.md)** - ESLint 配置说明
  - 为什么需要 ESLint？
  - 配置文件详解

---

### 🏗️ 构建与部署

- **[BUILD.md](./BUILD.md)** - 为什么 API 不需要构建？
  - Cloudflare Workers 的特殊性
  - wrangler 工作原理
  - 常见误解澄清

- **[MONOREPO_BUILD_SUMMARY.md](./MONOREPO_BUILD_SUMMARY.md)** - Monorepo 构建策略
  - Client vs API 的构建差异
  - 类型共享机制
  - 常见陷阱

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - 双模式部署指南
  - Node.js 模式 vs Cloudflare Workers 模式
  - 环境变量配置
  - 常见问题排查

---

### 💻 功能实现

- **[AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)** - 认证功能完整说明
  - 手机号 + 邮箱双模式注册
  - Better Auth 集成
  - 已知问题和后续优化

- **[邮箱注册流程.md](./邮箱注册流程.md)** - 邮箱注册详细流程
  - Tab 功能实现
  - 邮箱验证配置
  - 前后端代码示例

- **[单词学习与复习系统.md](./单词学习与复习系统.md)** - 核心业务逻辑
  - Anki 复习算法
  - 数据模型设计
  - API 接口说明

---

### 🛠️ 技术决策

- **[Zod校验问题.md](./Zod校验问题.md)** - 为什么不用 drizzle-zod？
  - 版本兼容性问题
  - 选择 Hono Zod 验证器的原因
  - ✅ 已完全采纳

- **[多种定义常量的区别.md](./多种定义常量的区别.md)** - 为什么统一用 pgEnum？
  - TypeScript 常量 vs pgEnum
  - 技术权衡说明
  - 迁移决策记录

---

## 🗺️ 不同角色的阅读路径

### 🆕 新加入的开发者
```
第一天：ARCHITECTURE → DEPLOYMENT_GUIDE → AUTH_IMPLEMENTATION
第二天：Drizzle架构设计 → 单词学习与复习系统
第三天：阅读相关业务文档，开始编码
```

### 👨‍💻 需要实现数据库功能
```
Drizzle架构设计 → database-transactions-guide → 查看实际代码
```

### 🚀 需要部署项目
```
BUILD → DEPLOYMENT_GUIDE → wrangler配置文件解析
```

### 🐛 遇到技术问题
```
1. 查找相关文档的"FAQ"或"常见问题"章节
2. 搜索文档内容（Ctrl+F）
3. 查看相关代码注释
```

---

## 📊 文档地图

```
整体理解 ──→ 具体实现 ──→ 问题排查
    ↓             ↓             ↓
ARCHITECTURE   专项文档      FAQ章节
    ↓             ↓             ↓
高层次决策    代码示例      解决方案
```

---

## ✅ 文档维护指南

### 添加新文档时：
1. ✏️ 在本 README 中添加索引链接
2. 📍 在开头明确文档定位（类型、读者、阅读时间）
3. 🔗 添加"相关文档"链接
4. 💡 包含项目特定的决策说明（"为什么"）

### 更新文档时：
1. 📅 更新文档末尾的"最后更新时间"
2. 🔄 如有架构变更，同步更新相关文档
3. ✅ 保持示例代码与实际代码一致
4. 📝 在变更日志中记录重要更新

### 文档质量标准：
- ✅ **项目特定**：强调"为什么这样设计"
- ✅ **可操作**：包含具体的代码示例和配置
- ✅ **可维护**：避免过度细节，链接到官方文档
- ✅ **易导航**：清晰的章节结构和相关文档链接

---

## 🎯 文档价值定位

```
官方文档 (通过 AI/MCP)  →  "What"（是什么）
         ↓
项目文档 (本仓库)       →  "Why"（为什么）+ "How"（怎么做）
         ↓
代码注释 (源代码)       →  "Detail"（实现细节）
```

**核心价值**：
- 📝 记录架构决策（ADR）
- 🔍 记录实际遇到的问题和解决方案
- 📋 记录项目特定的配置和约定
- 📚 记录技术栈演进历史
- 🤝 促进团队知识共享

---

## 📞 需要帮助？

- 📖 先搜索本文档索引
- 🔍 使用 Ctrl+F 在文档中搜索关键词
- 💬 查看代码注释和实际实现
- 🤔 思考"这个决策的目的是什么"

**记住**：文档是活的，发现问题请及时更新！

