# 📚 脚本使用指南

本目录包含以下脚本：

1. **词汇导入脚本** - 导入 11,951 个单词到词库（从小学到 GRE）
2. **配额配置初始化脚本** - 初始化订阅等级的配额限制

---

## 🎯 配额配置初始化

### 快速开始

```bash
# 确保 .dev.vars 中有 DATABASE_URL 配置
cd projects/api
npx tsx scripts/init-quota-config.ts
```

### 说明

此脚本用于初始化 `quota_configs` 表，为不同订阅等级设置配额限制：

| 订阅等级 | 每日文章分析次数 | 单篇文章最大词数 |
| -------- | ---------------- | ---------------- |
| free     | 2                | 3000             |
| basic    | 20               | 10000            |
| premium  | 无限制 (-1)      | 无限制 (-1)      |

**注意事项：**

- 使用 `ON CONFLICT DO NOTHING` 确保幂等性（可安全多次执行）
- 在数据库迁移后执行（确保 `quota_configs` 表已创建）
- 后续可通过 Admin 后台或数据库直接修改配额值

### 手动执行 SQL

如果不想使用 TypeScript 脚本，也可以直接在 Neon Dashboard 执行：

```bash
# 在 Neon Dashboard → SQL Editor 中执行
cat scripts/init-quota-config.sql
```

---

## 📚 词汇导入脚本

> 支持从小学到 GRE 共 7 个等级，总计 **11,951 个唯一单词**，音标覆盖率 **97.3%**

## 🚀 快速开始

### 方法 1：Neon Dashboard（推荐）

```bash
# 1. 生成 SQL 文件
cd projects/api
npm run vocab:generate

# 2. 打开 Neon Dashboard → SQL Editor
# 3. 粘贴 vocabulary-init-v2.sql 内容
# 4. 点击 Run
# ✅ 完成！
```

### 方法 2：命令行（自动化）

```bash
# 1. 确保 .env 中有 DATABASE_URL
npm run vocab:generate
npm run vocab:import

# ✅ 8-15 秒完成导入
```

---

## 📊 词汇统计

### 总体数据

- **总词汇量**: 11,951 个唯一单词
- **音标覆盖率**: 97.3% (11,624/11,951)
- **数据来源**: GitHub 优质词汇库（已清洗）

### 各等级详情

| 等级                     | 新增词汇 | 累积词汇 | 说明       |
| ------------------------ | -------- | -------- | ---------- |
| 📚 小学 (primary_school) | 441      | 441      | 基础词汇   |
| 📖 初中 (middle_school)  | 1,466    | 1,907    | 日常对话   |
| 📝 高中 (high_school)    | 1,751    | 3,658    | 新闻阅读   |
| 🎓 四级 (cet4)           | 1,519    | 5,177    | 学术文章   |
| 🎯 六级 (cet6)           | 1,034    | 6,211    | 专业论文   |
| 🎖️ 托福 (ielts_toefl)    | 1,445    | 7,656    | 留学考试   |
| 🏆 GRE (gre)             | 4,295    | 11,951   | 研究生入学 |

### 数据特点

✅ **增量去重**: 每个单词只标记为最低等级  
✅ **大小写标准化**: 所有单词统一小写存储（May → may）  
✅ **音标来源**: 从所有文件收集，优先使用高等级音标  
✅ **格式清洗**: 已去除空行、标题行、特殊字符

---

## 📖 详细使用方法

### 方法 1: 生成 SQL 文件

```bash
# 生成 SQL 文件
npm run vocab:generate

# 输出文件:
# - vocabulary-init-v2.sql (批量 INSERT，适合 Neon)
# - scripts/vocabulary-data.ts (TypeScript 数据)
```

**在 Neon Dashboard 执行 SQL：**

1. 打开 Neon Dashboard → 项目 → SQL Editor
2. 粘贴 `vocabulary-init-v2.sql` 内容
3. 点击 Run 执行

**SQL 特点：**

- 每批 500 条记录（Neon Serverless 优化）
- 使用事务包装（失败自动回滚）
- `ON CONFLICT DO NOTHING`（自动跳过重复）
- 内置验证查询（自动显示导入结果）

### 方法 2: 直接通过代码导入

```bash
# 1. 配置数据库连接
echo "DATABASE_URL=postgresql://..." > .env

# 2. 生成并导入
npm run vocab:generate
npm run vocab:import
```

**输出示例：**

```
🚀 Starting vocabulary import to Neon database...

📊 Total words: 11951
📦 Total batches: 12

📤 Processing batch 1/12 (1000 words)...
  ✅ Inserted: 1000, Skipped: 0

🎉 Import completed!
  Time taken: 8.45s
  Average speed: 1,415 words/s
```

### 方法 3: 使用 psql 命令行

```bash
npm run vocab:generate
psql -d your_database -f vocabulary-init-v2.sql
```

---

## 🔧 性能优化（Neon Serverless）

### 为什么使用 INSERT 而不是 COPY？

- ❌ Neon 不支持 `COPY ... FROM stdin`（需要文件系统访问）
- ✅ 支持标准的批量 INSERT
- ✅ HTTP API 响应快速

### 优化策略

1. **批量大小**: 每批 500 条（平衡性能与稳定性）
2. **事务控制**: 整个导入在一个事务中
3. **冲突处理**: `ON CONFLICT DO NOTHING`
4. **延迟控制**: 批次间延迟 100ms，避免过载
5. **连接方式**: 使用 Neon HTTP API

### 预期性能

| 数据量    | 方法                | 预计时间 | 速度        |
| --------- | ------------------- | -------- | ----------- |
| 11,951 词 | Neon Dashboard      | ~5-10s   | 手动执行    |
| 11,951 词 | 代码导入 (HTTP API) | ~8-15s   | ~1,400 词/s |
| 11,951 词 | psql (本地)         | ~2-5s    | ~4,000 词/s |

---

## 📁 文件说明

### 生成的文件

```
projects/api/
├── vocabulary-init-v2.sql          # SQL 导入脚本（推荐）
└── scripts/
    ├── import-vocabulary-v2.ts     # 生成脚本
    ├── import-to-db.ts             # 直接导入脚本
    ├── vocabulary-data.ts          # TypeScript 数据（自动生成）
    └── README.md                   # 本文档
```

### 源词汇文件

```
projects/api/scripts/word-list/
├── 小学英语大纲词汇.txt
├── 中考英语词汇表.txt
├── Highschool_edited.txt
├── CET4_edited.txt
├── CET6_edited.txt
├── TOEFL_delete_CET4+6.txt
└── GRE_abridged.txt
```

---

## 🐛 故障排除

### 问题 1: 导入报错 "duplicate key"

**原因**: 表中已有重复数据

**解决方案**:

```sql
-- 清空表重新导入
TRUNCATE TABLE vocabulary RESTART IDENTITY;

-- 或使用 ON CONFLICT（脚本已包含）
```

### 问题 2: DATABASE_URL 未设置

**解决方案**:

```bash
# 创建 .env 文件
echo "DATABASE_URL=postgresql://user:password@host/database" > .env

# 从 Neon Dashboard 获取连接字符串
```

### 问题 3: 数据库连接超时

**原因**: Neon Serverless 空闲时会休眠

**解决方案**: 重试导入命令

```bash
npm run vocab:import
```

### 问题 4: 部分单词没有音标

**说明**: 正常情况

- 音标覆盖率：97.3%
- 缺失音标通常是：极少数基础词（如 am, are）
- 不影响使用，AI 可以动态生成解释

### 问题 5: TypeScript 类型错误

**错误**: `Type 'gre' is not assignable to type VocabularyLevel`

**解决方案**:

```bash
# 1. 确保 schema.ts 已添加 'gre' 等级
# 2. 重新生成 Drizzle 类型
npx drizzle-kit generate
npx drizzle-kit push
```

---

## ✅ 验证导入结果

```sql
-- 1. 查看各等级词汇数量
SELECT level, COUNT(*) as word_count
FROM vocabulary
GROUP BY level
ORDER BY
  CASE level
    WHEN 'primary_school' THEN 1
    WHEN 'middle_school' THEN 2
    WHEN 'high_school' THEN 3
    WHEN 'cet4' THEN 4
    WHEN 'cet6' THEN 5
    WHEN 'ielts_toefl' THEN 6
    WHEN 'gre' THEN 7
  END;

-- 2. 查看音标覆盖率
SELECT
  COUNT(*) FILTER (WHERE pronunciation IS NOT NULL) as with_pronunciation,
  COUNT(*) FILTER (WHERE pronunciation IS NULL) as without_pronunciation,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE pronunciation IS NOT NULL) / COUNT(*), 1) as coverage_percent
FROM vocabulary;
```

**预期结果：**

```
 level           | word_count
-----------------+------------
 primary_school  |        441
 middle_school   |       1466
 high_school     |       1751
 cet4            |       1519
 cet6            |       1034
 ielts_toefl     |       1445
 gre             |       4295

 with_pronunciation | coverage_percent
--------------------+------------------
              11624 |             97.3
```

---

## 🔄 更新词汇数据

```bash
# 1. 修改源词汇文件
# 2. 重新生成
npm run vocab:generate

# 3. 清空表后重新导入
# SQL: TRUNCATE TABLE vocabulary RESTART IDENTITY;
npm run vocab:import
```

---

## 📚 数据来源

- **小学/初中/高中**: 国内教育大纲
- **四级/六级**: 全国大学英语四、六级考试大纲（2016 版）
- **托福**: 2003 年版金山词霸托福词汇
- **GRE**: 精选 GRE 高难词汇（已删除四六级+托福）

**特别感谢**: [mahavivo/english-wordlists](https://github.com/mahavivo/english-wordlists)

---

## 💡 最佳实践

1. **首次导入**: 使用 `npm run vocab:import`（自动化 + 验证）
2. **生产环境**: 在 Neon Dashboard 手动执行 SQL（可控）
3. **开发环境**: 使用代码导入（快速迭代）
4. **备份数据**: 导入前先导出现有数据

---

## 🎯 重要提醒

### Schema 已更新

- ✅ 添加了 `gre` 等级枚举值
- ⚠️ 需要运行数据库迁移

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### 前端已更新

- ✅ `projects/client/src/utils/vocabulary.ts` 已包含 GRE 等级
- ✅ 显示新增词汇 + 累积词汇

---

**版本**: v2.0 (增量去重 + Neon 优化 + 音标优化)  
**最后更新**: 2025-11-04  
**音标覆盖率**: 97.3%
