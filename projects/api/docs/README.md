# Vocab Master API 文档导航

> 📚 **文档使用指南**：请先阅读 [全局文档体系使用指南](/DOCUMENTATION_GUIDE.md) 了解文档架构

> 本目录包含项目的所有文档，按受众和用途分层组织

---

## 📖 文档结构

### 第一层：业务准则 (For Humans)

**核心文档**：`PRD-完整版.md`

- **受众**：产品经理、开发者、项目负责人
- **内容**：产品愿景、功能模块、业务规则、数据模型
- **特点**：高层次脉络，避免实现细节

### 第二层：技术规范 (For AI)

**目录**：`tech/`

- **受众**：AI (Cursor/Claude)
- **内容**：API 契约、数据流、状态机、边界情况处理
- **特点**：结构化、精确、便于 AI 快速查找

**文件列表**：
- `tech/architecture.md` - 系统架构技术规范（整体架构 + 依赖注入 + 数据库 + 双客户端模式）
- `tech/auth-system.md` - 认证系统技术规范（注册 + 登录 + Session 管理）
- `tech/email-system.md` - 邮件系统技术规范（Resend 集成 + 邮件模板）
- `tech/database-guide.md` - 数据库技术规范（HTTP Driver + 无事务最佳实践）
- `tech/bindings-types.md` - 环境变量类型定义
- `tech/quota-system.md` - 配额系统技术规范
- `tech/stripe-integration.md` - Stripe 支付集成技术规范

### 第三层：操作手册 (For Operations)

**目录**：`ops/`

- **受众**：执行配置/测试任务的开发者
- **内容**：环境配置步骤、测试命令、故障排查
- **特点**：Checklist 风格，快速参考

**文件列表**：
- `ops/deployment.md` - 部署操作指南（Cloudflare Workers + Node.js）
- `ops/config-guide.md` - 配置说明指南（wrangler + ESLint + TypeScript）
- `ops/quota-testing.md` - 配额系统测试指南
- `ops/stripe-setup.md` - Stripe 配置操作指南

### 归档策略

问题解决类和概念解释类文档不再单独保留，相关知识已融入技术规范中

---

## 🚀 快速导航

### 我想了解业务逻辑
→ 阅读 `PRD-完整版.md`

### 我想让 AI 理解某个模块
→ 在对话中 `@tech/xxx.md`

### 我想配置 Stripe
→ 参考 `ops/stripe-setup.md`

### 我想部署项目
→ 参考 `ops/deployment.md`

### 我想配置项目
→ 参考 `ops/config-guide.md`

### 我想测试配额功能
→ 参考 `ops/quota-testing.md`

---

## 📝 文档维护原则

1. **PRD 只记录"是什么"**：业务规则、功能定义、数据模型
2. **tech/ 记录"怎么实现"**：API 契约、数据流、状态机
3. **ops/ 记录"如何操作"**：配置步骤、测试命令、故障排查
4. **避免重复**：同一信息只在一个地方维护
5. **保持精简**：删除过时内容，归档历史文档

---

## 🔗 外部文档

- [Better Auth 文档](https://www.better-auth.com/docs)
- [Hono 文档](https://hono.dev/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Stripe 文档](https://stripe.com/docs)
