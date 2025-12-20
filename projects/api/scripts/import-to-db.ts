// import { neon } from "@neondatabase/serverless";
// import { drizzle } from "drizzle-orm/neon-http";
// import { vocabulary } from "../src/db/schema";
// import { allVocabularyBatches, vocabularyStats } from "./vocabulary-data";

// /**
//  * 直接导入词汇到 Neon Serverless 数据库
//  *
//  * 特点：
//  * - 使用 Neon HTTP API（更适合 Serverless）
//  * - 批量插入（每批 1000 条）
//  * - 自动跳过重复（ON CONFLICT DO NOTHING）
//  * - 进度显示
//  */
// async function importToDatabase() {
//   // 从环境变量读取数据库连接
//   const databaseUrl =;

//   if (!databaseUrl) {
//     console.error("❌ DATABASE_URL environment variable is not set");
//     console.log("\n💡 Set it in .env file:");
//     console.log("   DATABASE_URL=postgresql://user:password@host/database");
//     process.exit(1);
//   }

//   console.log("🚀 Starting vocabulary import to Neon database...\n");
//   console.log(`📊 Total words: ${vocabularyStats.total}`);
//   console.log(`📦 Total batches: ${vocabularyStats.batches}`);
//   console.log(`📏 Batch size: ${vocabularyStats.batchSize}\n`);

//   // 创建数据库连接
//   const sql = neon(databaseUrl);
//   const db = drizzle(sql);

//   let totalInserted = 0;
//   let totalSkipped = 0;
//   const startTime = Date.now();

//   // 逐批插入
//   for (let i = 0; i < allVocabularyBatches.length; i++) {
//     const batch = allVocabularyBatches[i];
//     const batchNumber = i + 1;

//     try {
//       console.log(
//         `📤 Processing batch ${batchNumber}/${allVocabularyBatches.length} (${batch.length} words)...`
//       );

//       // 使用 Drizzle 批量插入
//       // ON CONFLICT DO NOTHING 会自动处理重复
//       const result = await db
//         .insert(vocabulary)
//         .values(batch as any)
//         .onConflictDoNothing()
//         .returning({ word: vocabulary.word });

//       const inserted = result.length;
//       const skipped = batch.length - inserted;

//       totalInserted += inserted;
//       totalSkipped += skipped;

//       console.log(`  ✅ Inserted: ${inserted}, Skipped: ${skipped}`);

//       // 短暂延迟，避免过载（Neon Serverless 友好）
//       if (batchNumber < allVocabularyBatches.length) {
//         await new Promise((resolve) => setTimeout(resolve, 100));
//       }
//     } catch (error) {
//       console.error(`❌ Error in batch ${batchNumber}:`, error);
//       throw error;
//     }
//   }

//   const endTime = Date.now();
//   const duration = ((endTime - startTime) / 1000).toFixed(2);

//   console.log("\n🎉 Import completed!\n");
//   console.log("📊 Summary:");
//   console.log(`  Total words processed: ${vocabularyStats.total}`);
//   console.log(`  Successfully inserted: ${totalInserted}`);
//   console.log(`  Skipped (duplicates): ${totalSkipped}`);
//   console.log(`  Time taken: ${duration}s`);
//   console.log(
//     `  Average speed: ${(vocabularyStats.total / parseFloat(duration)).toFixed(
//       0
//     )} words/s`
//   );

//   // 验证导入结果
//   console.log("\n🔍 Verifying import...");

//   try {
//     const countResult = await sql`
//       SELECT
//         level,
//         COUNT(*) as count
//       FROM vocabulary
//       GROUP BY level
//       ORDER BY
//         CASE level
//           WHEN 'primary_school' THEN 1
//           WHEN 'middle_school' THEN 2
//           WHEN 'high_school' THEN 3
//           WHEN 'cet4' THEN 4
//           WHEN 'cet6' THEN 5
//           WHEN 'ielts_toefl' THEN 6
//           WHEN 'gre' THEN 7
//         END;
//     `;

//     console.log("\n📈 Words by level:");
//     for (const row of countResult) {
//       console.log(`  ${String(row.level).padEnd(20)}: ${row.count}`);
//     }

//     const pronunciationResult = await sql`
//       SELECT
//         COUNT(*) FILTER (WHERE pronunciation IS NOT NULL) as with_pronunciation,
//         COUNT(*) FILTER (WHERE pronunciation IS NULL) as without_pronunciation,
//         COUNT(*) as total
//       FROM vocabulary;
//     `;

//     const stats = pronunciationResult[0];
//     const coverage = (
//       (Number(stats.with_pronunciation) / Number(stats.total)) *
//       100
//     ).toFixed(1);

//     console.log("\n🎯 Pronunciation coverage:");
//     console.log(`  With pronunciation: ${stats.with_pronunciation}`);
//     console.log(`  Without pronunciation: ${stats.without_pronunciation}`);
//     console.log(`  Coverage: ${coverage}%`);
//   } catch (error) {
//     console.error("⚠️  Could not verify import:", error);
//   }

//   console.log("\n✅ All done!");
// }

// // 运行导入
// importToDatabase().catch((error) => {
//   console.error("❌ Import failed:", error);
//   process.exit(1);
// });
