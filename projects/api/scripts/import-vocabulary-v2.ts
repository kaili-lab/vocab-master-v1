// import type fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { dirname } from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// type VocabularyLevel =
//   | "primary_school"
//   | "middle_school"
//   | "high_school"
//   | "cet4"
//   | "cet6"
//   | "ielts_toefl"
//   | "gre";

// interface WordEntry {
//   word: string;
//   pronunciation: string | null;
//   level: VocabularyLevel;
// }

// interface FileConfig {
//   file: string;
//   level: VocabularyLevel;
//   priority: number;
//   description: string;
// }

// // 文件配置（按优先级排序，越小越优先）
// const FILE_CONFIG: FileConfig[] = [
//   {
//     file: "scripts/word-list/小学英语大纲词汇.txt",
//     level: "primary_school",
//     priority: 1,
//     description: "小学基础词汇",
//   },
//   {
//     file: "scripts/word-list/中考英语词汇表.txt",
//     level: "middle_school",
//     priority: 2,
//     description: "初中词汇（含小学，需去重）",
//   },
//   {
//     file: "scripts/word-list/Highschool_edited.txt",
//     level: "high_school",
//     priority: 3,
//     description: "高中词汇（含初中，需去重）",
//   },
//   {
//     file: "scripts/word-list/CET4_edited.txt",
//     level: "cet4",
//     priority: 4,
//     description: "四级词汇（含高中，需去重）",
//   },
//   {
//     file: "scripts/word-list/CET6_edited.txt",
//     level: "cet6",
//     priority: 5,
//     description: "六级独有词汇",
//   },
//   {
//     file: "scripts/word-list/TOEFL_delete_CET4+6.txt",
//     level: "ielts_toefl",
//     priority: 6,
//     description: "托福独有词汇（已删除四六级）",
//   },
//   {
//     file: "scripts/word-list/GRE_abridged.txt",
//     level: "gre",
//     priority: 7,
//     description: "GRE 独有词汇（已删除四六级+托福）",
//   },
// ];

// /**
//  * 从一行中提取单词和音标
//  * 支持格式：
//  * 1. word [pronunciation] ...
//  * 2. word
//  */
// function parseWordLine(
//   line: string
// ): { word: string; pronunciation: string | null } | null {
//   line = line.trim();

//   // 跳过空行
//   if (!line) return null;

//   // 提取单词（第一个空格或方括号之前的部分）
//   const wordMatch = line.match(/^([a-zA-Z'-]+)/);
//   if (!wordMatch) return null;

//   // 统一转小写（包括专有名词）
//   const word = wordMatch[1].toLowerCase();

//   // 提取音标（方括号内的内容）
//   const pronunciationMatch = line.match(/\[([^\]]+)\]/);
//   const pronunciation = pronunciationMatch
//     ? pronunciationMatch[1].trim()
//     : null;

//   return { word, pronunciation };
// }

// /**
//  * 读取词汇文件，提取单词和音标
//  */
// function readVocabularyFile(filePath: string): Map<string, string | null> {
//   const content = fs.readFileSync(filePath, "utf-8");
//   const lines = content.split("\n");

//   const wordMap = new Map<string, string | null>();

//   for (const line of lines) {
//     const parsed = parseWordLine(line);
//     if (parsed) {
//       // 如果同一文件中有重复单词，保留第一个（通常是主要形式）
//       if (!wordMap.has(parsed.word)) {
//         wordMap.set(parsed.word, parsed.pronunciation);
//       }
//     }
//   }

//   return wordMap;
// }

// /**
//  * 构建音标字典：从所有文件收集音标
//  */
// function buildPronunciationDictionary(
//   filesData: {
//     words: Map<string, string | null>;
//     level: VocabularyLevel;
//     priority: number;
//   }[]
// ): Map<string, string> {
//   console.log("\n📖 Building pronunciation dictionary...");

//   const pronunciationDict = new Map<string, string>();

//   // 按优先级从低到高处理（高优先级的音标覆盖低优先级）
//   const sortedData = [...filesData].sort((a, b) => a.priority - b.priority);

//   for (const { words, level } of sortedData) {
//     let count = 0;
//     for (const [word, pronunciation] of words.entries()) {
//       if (pronunciation) {
//         pronunciationDict.set(word, pronunciation);
//         count++;
//       }
//     }
//     if (count > 0) {
//       console.log(
//         `  ${level.padEnd(20)}: ${count.toString().padStart(5)} pronunciations`
//       );
//     }
//   }

//   console.log(`✅ Total unique pronunciations: ${pronunciationDict.size}`);
//   return pronunciationDict;
// }

// /**
//  * 增量式合并词汇：按优先级处理，后处理的文件排除前面已有的单词
//  * 这样每个单词只属于最低等级
//  */
// function mergeVocabularyIncremental(
//   filesData: {
//     words: Map<string, string | null>;
//     level: VocabularyLevel;
//     priority: number;
//   }[],
//   pronunciationDict: Map<string, string>
// ): Map<string, WordEntry> {
//   console.log("\n🔄 Merging vocabulary (incremental deduplication)...");

//   const seenWords = new Set<string>();
//   const wordMap = new Map<string, WordEntry>();

//   // 按优先级排序（从高到低优先级）
//   const sortedData = filesData.sort((a, b) => a.priority - b.priority);

//   for (const { words, level } of sortedData) {
//     let addedCount = 0;

//     for (const [word, pronunciation] of words.entries()) {
//       // 只添加未见过的单词（增量去重）
//       if (!seenWords.has(word)) {
//         seenWords.add(word);
//         // 优先使用音标字典中的音标
//         const finalPronunciation = pronunciationDict.get(word) || pronunciation;
//         wordMap.set(word, { word, pronunciation: finalPronunciation, level });
//         addedCount++;
//       }
//     }

//     console.log(
//       `  ${level.padEnd(20)}: ${addedCount
//         .toString()
//         .padStart(5)} new words (from ${words.size} total)`
//     );
//   }

//   console.log(`✅ Total unique words: ${wordMap.size}`);
//   return wordMap;
// }

// /**
//  * 生成统计信息
//  */
// function generateStats(wordMap: Map<string, WordEntry>): void {
//   const levelStats = new Map<VocabularyLevel, number>();
//   let withPronunciation = 0;

//   for (const entry of wordMap.values()) {
//     levelStats.set(entry.level, (levelStats.get(entry.level) || 0) + 1);
//     if (entry.pronunciation) withPronunciation++;
//   }

//   console.log("\n📊 Final Statistics:");
//   console.log(`  Total unique words: ${wordMap.size}`);
//   console.log(
//     `  Words with pronunciation: ${withPronunciation} (${(
//       (withPronunciation / wordMap.size) *
//       100
//     ).toFixed(1)}%)`
//   );
//   console.log("\n📈 Words by level:");

//   for (const config of FILE_CONFIG) {
//     const count = levelStats.get(config.level) || 0;
//     console.log(
//       `  ${config.level.padEnd(20)}: ${count.toString().padStart(5)} words`
//     );
//   }
// }

// /**
//  * 生成批量 INSERT SQL（针对 Neon Serverless 优化）
//  * - 每批 500 条记录
//  * - 使用事务包装
//  * - ON CONFLICT DO NOTHING（避免重复插入错误）
//  */
// function generateInsertSQL(wordMap: Map<string, WordEntry>): string {
//   const entries = Array.from(wordMap.values());
//   const batchSize = 500; // Neon Serverless 推荐的批量大小
//   const batches: string[] = [];

//   for (let i = 0; i < entries.length; i += batchSize) {
//     const batch = entries.slice(i, i + batchSize);
//     const values: string[] = [];

//     for (const entry of batch) {
//       const word = entry.word.replace(/'/g, "''"); // SQL 转义单引号
//       const pronunciation = entry.pronunciation
//         ? `'${entry.pronunciation.replace(/'/g, "''")}'`
//         : "NULL";

//       values.push(`  ('${word}', ${pronunciation}, '${entry.level}')`);
//     }

//     batches.push(
//       `-- Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
//         entries.length / batchSize
//       )}\nINSERT INTO vocabulary (word, pronunciation, level) VALUES\n${values.join(
//         ",\n"
//       )}\nON CONFLICT (word) DO NOTHING;`
//     );
//   }

//   const sql = `-- 词汇表初始化数据
// -- 总词汇数：${entries.length}
// -- 批次数量：${batches.length}（每批 ${batchSize} 条）
// -- 生成时间：${new Date().toISOString()}
// -- 数据库：Neon Serverless PostgreSQL
// --
// -- 使用方法：
// --   方法 1: psql -d your_database -f vocabulary-init.sql
// --   方法 2: 在 Neon Dashboard 的 SQL Editor 中执行
// --   方法 3: 使用 scripts/import-to-db.ts 直接导入

// BEGIN;

// ${batches.join("\n\n")}

// COMMIT;

// -- 验证导入结果
// SELECT
//   level,
//   COUNT(*) as word_count
// FROM vocabulary
// GROUP BY level
// ORDER BY
//   CASE level
//     WHEN 'primary_school' THEN 1
//     WHEN 'middle_school' THEN 2
//     WHEN 'high_school' THEN 3
//     WHEN 'cet4' THEN 4
//     WHEN 'cet6' THEN 5
//     WHEN 'ielts_toefl' THEN 6
//     WHEN 'gre' THEN 7
//   END;

// -- 查看音标覆盖率
// SELECT
//   COUNT(*) FILTER (WHERE pronunciation IS NOT NULL) as with_pronunciation,
//   COUNT(*) FILTER (WHERE pronunciation IS NULL) as without_pronunciation,
//   COUNT(*) as total,
//   ROUND(100.0 * COUNT(*) FILTER (WHERE pronunciation IS NOT NULL) / COUNT(*), 1) as coverage_percent
// FROM vocabulary;
// `;

//   return sql;
// }

// /**
//  * 生成 TypeScript 数据文件（供直接导入数据库使用）
//  */
// function generateTypeScriptData(wordMap: Map<string, WordEntry>): string {
//   const entries = Array.from(wordMap.values());

//   // 分批生成，避免单个数组过大
//   const batchSize = 1000;
//   const batches: string[] = [];

//   for (let i = 0; i < entries.length; i += batchSize) {
//     const batch = entries.slice(i, i + batchSize);
//     const items = batch.map((entry) => {
//       const pronunciation = entry.pronunciation
//         ? `'${entry.pronunciation.replace(/'/g, "\\'")}'`
//         : "null";
//       return `  { word: '${entry.word.replace(
//         /'/g,
//         "\\'"
//       )}', pronunciation: ${pronunciation}, level: '${entry.level}' }`;
//     });

//     batches.push(
//       `export const vocabularyBatch${
//         Math.floor(i / batchSize) + 1
//       } = [\n${items.join(",\n")}\n];`
//     );
//   }

//   const ts = `// 词汇表数据
// // 自动生成，请勿手动修改
// // 生成时间：${new Date().toISOString()}
// // 总词汇数：${entries.length}

// export type VocabularyLevel = 'primary_school' | 'middle_school' | 'high_school' | 'cet4' | 'cet6' | 'ielts_toefl' | 'gre';

// export interface VocabularyEntry {
//   word: string;
//   pronunciation: string | null;
//   level: VocabularyLevel;
// }

// ${batches.join("\n\n")}

// export const allVocabularyBatches = [
// ${batches.map((_, i) => `  vocabularyBatch${i + 1}`).join(",\n")}
// ];

// export const vocabularyStats = {
//   total: ${entries.length},
//   batches: ${batches.length},
//   batchSize: ${batchSize},
// };
// `;

//   return ts;
// }

// async function main() {
//   console.log(
//     "🚀 Starting vocabulary import process (v2 - Incremental Deduplication)...\n"
//   );

//   const baseDir = path.join(__dirname, "..");

//   // 1. 读取所有词汇文件
//   console.log("📚 Reading vocabulary files...");
//   const filesData: {
//     words: Map<string, string | null>;
//     level: VocabularyLevel;
//     priority: number;
//   }[] = [];

//   for (const config of FILE_CONFIG) {
//     const filePath = path.join(baseDir, config.file);

//     if (!fs.existsSync(filePath)) {
//       console.log(`⚠️  File not found: ${config.file} - skipping`);
//       continue;
//     }

//     const words = readVocabularyFile(filePath);
//     filesData.push({
//       words,
//       level: config.level,
//       priority: config.priority,
//     });
//     console.log(`  ✅ ${config.description.padEnd(40)}: ${words.size} words`);
//   }

//   if (filesData.length === 0) {
//     console.error("❌ No vocabulary files found!");
//     process.exit(1);
//   }

//   // 2. 构建音标字典（从所有文件收集）
//   const pronunciationDict = buildPronunciationDictionary(filesData);

//   // 3. 增量式合并词汇（去重，使用音标字典）
//   const wordMap = mergeVocabularyIncremental(filesData, pronunciationDict);

//   // 4. 生成统计信息
//   generateStats(wordMap);

//   // 5. 生成 SQL 文件
//   console.log("\n📝 Generating SQL file...");
//   const sql = generateInsertSQL(wordMap);
//   const sqlPath = path.join(baseDir, "vocabulary-init-v2.sql");
//   fs.writeFileSync(sqlPath, sql, "utf-8");
//   console.log(`  ✅ Generated: vocabulary-init-v2.sql`);

//   // 6. 生成 TypeScript 数据文件（供直接导入使用）
//   console.log("\n📝 Generating TypeScript data file...");
//   const tsData = generateTypeScriptData(wordMap);
//   const tsPath = path.join(baseDir, "scripts/vocabulary-data.ts");
//   fs.writeFileSync(tsPath, tsData, "utf-8");
//   console.log(`  ✅ Generated: scripts/vocabulary-data.ts`);

//   console.log("\n🎉 Done!\n");
//   console.log("📖 Next steps:");
//   console.log(
//     "  Option 1 (SQL): psql -d your_database -f vocabulary-init-v2.sql"
//   );
//   console.log("  Option 2 (SQL): Run in Neon Dashboard SQL Editor");
//   console.log(
//     "  Option 3 (Code): npm run import:vocabulary (see scripts/import-to-db.ts)"
//   );
// }

// main().catch(console.error);
