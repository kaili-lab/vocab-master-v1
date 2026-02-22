# scripts 目录说明

包含两类初始化脚本，在数据库迁移（`drizzle-kit push`）完成后执行。

---

## 一、词汇库导入

将 11,951 个单词（小学 → GRE）导入 `vocabulary` 表。

### 文件说明

| 文件 | 作用 |
|------|------|
| `import-vocabulary-v2.ts` | 读取 `word-list/` 源文件，去重合并，生成 SQL 和 TS 数据 |
| `vocabulary-data.ts` | 自动生成的词汇数据（勿手动修改） |
| `import-to-db.ts` | 将 `vocabulary-data.ts` 的数据批量写入数据库 |

### 执行步骤

```bash
cd projects/api

# 步骤 1：从源文件生成数据（生成 vocabulary-init-v2.sql 和 vocabulary-data.ts）
pnpm vocab:generate

# 步骤 2：导入数据库（约 8-15 秒）
pnpm vocab:import
```

或者用 Neon Dashboard 手动执行生成的 SQL 文件：

```
1. 执行步骤 1 生成 vocabulary-init-v2.sql
2. 打开 Neon Dashboard → SQL Editor
3. 粘贴文件内容 → Run
```

> `import-to-db.ts` 自动加载 `projects/api/.dev.vars` 中的 `DATABASE_URL`，无需额外配置。

### 词汇分布

| 等级 | 新增词数 | 累积词数 |
|------|---------|---------|
| primary_school | 441 | 441 |
| middle_school | 1,466 | 1,907 |
| high_school | 1,751 | 3,658 |
| cet4 | 1,519 | 5,177 |
| cet6 | 1,034 | 6,211 |
| ielts_toefl | 1,445 | 7,656 |
| gre | 4,295 | 11,951 |

每个单词只归属最低等级（增量去重），音标覆盖率 97.3%。

---

## 二、配额配置初始化

初始化 `quota_configs` 表，设置各订阅等级的使用限制。

**此步骤必须执行，否则所有用户调用分析接口会返回 500。**

### 执行方法

在 Neon Dashboard → SQL Editor 中执行 `init-quota-config.sql`，或：

```bash
# 使用 psql（需本地安装）
psql "your_database_url" -f scripts/init-quota-config.sql
```

脚本使用 `ON CONFLICT DO UPDATE`，可安全重复执行。

### 初始化后的配置值

| 等级 | 每日文章数 | 单篇最大词数 |
|------|-----------|------------|
| free | 2 | 1,000 |
| premium | 50 | 5,000 |
