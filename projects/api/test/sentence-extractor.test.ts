/**
 * 句子提取工具测试
 */

import {
  extractSentenceFromArticle,
  batchExtractSentences,
} from "../src/utils/sentence-extractor";

describe("extractSentenceFromArticle", () => {
  const sampleArticle = `
    We're excited about the arrival of AI. 
    AI now helps developers write code, design interfaces, analyze data, create documentation, and even review code.
    Every tool seems to be labeled "AI-powered" these days.
    Finding dependable tools that fit seamlessly into your workflow can feel daunting.
  `;

  test("应该提取包含指定单词的句子", () => {
    const result = extractSentenceFromArticle(sampleArticle, "excited");
    expect(result).toContain("excited");
    expect(result).toContain("We're excited about the arrival of AI.");
  });

  test("应该不区分大小写", () => {
    const result1 = extractSentenceFromArticle(sampleArticle, "AI");
    const result2 = extractSentenceFromArticle(sampleArticle, "ai");
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
  });

  test("应该处理词形变化（复数形式）", () => {
    const result = extractSentenceFromArticle(sampleArticle, "developers");
    expect(result).toContain("developers");
  });

  test("应该处理复合词", () => {
    const result = extractSentenceFromArticle(sampleArticle, "AI-powered");
    expect(result).toContain("AI-powered");
  });

  test("当找不到单词时应该返回第一句话", () => {
    const result = extractSentenceFromArticle(sampleArticle, "nonexistent");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test("应该处理空输入", () => {
    expect(extractSentenceFromArticle("", "word")).toBe("");
    expect(extractSentenceFromArticle(sampleArticle, "")).toBe("");
  });
});

describe("batchExtractSentences", () => {
  const sampleArticle = `
    We're excited about the arrival of AI. 
    AI helps developers write code.
    Every tool seems to be labeled "AI-powered".
  `;

  test("应该为多个单词提取句子", () => {
    const words = ["excited", "developers", "AI-powered"];
    const result = batchExtractSentences(sampleArticle, words);

    expect(result.size).toBe(3);
    expect(result.get("excited")).toContain("excited");
    expect(result.get("developers")).toContain("developers");
    expect(result.get("AI-powered")).toContain("AI-powered");
  });

  test("应该处理空单词列表", () => {
    const result = batchExtractSentences(sampleArticle, []);
    expect(result.size).toBe(0);
  });

  test("应该处理不存在的单词", () => {
    const words = ["nonexistent1", "nonexistent2"];
    const result = batchExtractSentences(sampleArticle, words);

    expect(result.size).toBe(2);
    expect(result.get("nonexistent1")).toBeTruthy();
    expect(result.get("nonexistent2")).toBeTruthy();
  });

  test("应该处理混合存在和不存在的单词", () => {
    const words = ["excited", "nonexistent", "developers"];
    const result = batchExtractSentences(sampleArticle, words);

    expect(result.size).toBe(3);
    expect(result.get("excited")).toContain("excited");
    expect(result.get("developers")).toContain("developers");
    expect(result.get("nonexistent")).toBeTruthy();
  });
});

describe("extractSentenceFromArticle - 扩展边界测试", () => {
  test("应该处理多个句子都包含目标词的情况（返回第一个）", () => {
    const article = `
      The AI system is powerful. 
      AI technology is advancing. 
      Many AI applications exist.
    `;

    const result = extractSentenceFromArticle(article, "AI");

    // 应该返回第一个包含 AI 的句子
    expect(result).toContain("The AI system is powerful.");
  });

  test("应该处理引号内的句子", () => {
    const article = `
      He said, "This is amazing!" and then left.
      The system works perfectly.
    `;

    const result = extractSentenceFromArticle(article, "amazing");

    expect(result).toContain("amazing");
    expect(result).toContain("This is amazing!");
  });

  test("应该处理缩写（Dr. Mr. U.S.A.）", () => {
    const article = `
      Dr. Smith works at the hospital.
      The U.S.A. is a large country.
      Mr. Johnson is here.
    `;

    // 注意：当前实现会将缩写后的点号识别为句子结束符
    // 所以 "Dr. Smith" 会被分割成 "Dr" 和 "Smith works..."
    const result1 = extractSentenceFromArticle(article, "Smith");
    expect(result1).toContain("Smith works at the hospital.");
    expect(result1).not.toContain("Dr."); // Dr. 被识别为独立句子

    const result2 = extractSentenceFromArticle(article, "country");
    // U.S.A. 同样会被分割，但 "country" 在最后部分
    expect(result2).toContain("is a large country.");
  });

  test("应该处理省略号", () => {
    const article = `
      This is interesting... let's see more.
      Another sentence here.
    `;

    const result = extractSentenceFromArticle(article, "interesting");

    expect(result).toContain("interesting");
  });

  test("应该处理感叹号和问号", () => {
    const article = `
      What is happening? Something is wrong!
      Everything is fine.
    `;

    const result1 = extractSentenceFromArticle(article, "happening");
    expect(result1).toContain("What is happening?");

    const result2 = extractSentenceFromArticle(article, "wrong");
    expect(result2).toContain("Something is wrong!");
  });

  test("应该处理单词在句子开头", () => {
    const article = `
      Technology is advancing rapidly.
      AI helps everyone.
    `;

    const result = extractSentenceFromArticle(article, "Technology");

    expect(result).toContain("Technology is advancing rapidly.");
  });

  test("应该处理单词在句子结尾", () => {
    const article = `
      This is the result.
      We need more time.
    `;

    const result = extractSentenceFromArticle(article, "result");

    expect(result).toContain("This is the result.");
  });

  test("应该处理单个单词的句子", () => {
    const article = `
      Amazing! This is great.
      Perfect.
    `;

    const result1 = extractSentenceFromArticle(article, "Amazing");
    expect(result1).toContain("Amazing!");

    const result2 = extractSentenceFromArticle(article, "Perfect");
    expect(result2).toContain("Perfect.");
  });

  test("应该处理包含数字的句子", () => {
    const article = `
      In 2024, technology advanced significantly.
      The year 2025 will be interesting.
    `;

    const result = extractSentenceFromArticle(article, "technology");

    expect(result).toContain("2024");
    expect(result).toContain("technology");
  });

  test("应该处理包含特殊字符的单词", () => {
    const article = `
      The @mention feature is useful.
      Email me at test@example.com for details.
    `;

    const result = extractSentenceFromArticle(article, "mention");

    expect(result).toContain("@mention");
  });

  test("应该处理连续的标点符号", () => {
    const article = `
      What?! This is incredible...
      Yes, indeed!!
    `;

    const result = extractSentenceFromArticle(article, "incredible");

    expect(result).toContain("incredible");
  });

  test("应该处理不同的引号类型", () => {
    const article = `
      He said 'hello' and left.
      She replied "goodbye" quickly.
    `;

    const result1 = extractSentenceFromArticle(article, "hello");
    expect(result1).toContain("hello");

    const result2 = extractSentenceFromArticle(article, "goodbye");
    expect(result2).toContain("goodbye");
  });

  test("应该处理换行符和空白字符", () => {
    const article = `
      First   sentence   with   spaces.
      Second\nsentence\nwith\nnewlines.
    `;

    const result = extractSentenceFromArticle(article, "sentence");

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test("应该处理极长的句子", () => {
    const longSentence =
      "This is a very long sentence that " +
      "contains many words ".repeat(50) +
      "and ends here.";
    const article = `
      Short sentence.
      ${longSentence}
      Another short one.
    `;

    const result = extractSentenceFromArticle(article, "contains");

    expect(result).toContain("contains");
    expect(result.length).toBeGreaterThan(100);
  });

  test("应该处理只有一个句子的文章", () => {
    const article = "This is the only sentence.";

    const result1 = extractSentenceFromArticle(article, "only");
    expect(result1).toBe("This is the only sentence.");

    const result2 = extractSentenceFromArticle(article, "nonexistent");
    expect(result2).toBe("This is the only sentence.");
  });

  test("应该处理文章只有标点符号的情况", () => {
    const article = "...!!!???";

    const result = extractSentenceFromArticle(article, "anything");
    expect(result).toBe("");
  });

  test("应该正确转义正则表达式特殊字符", () => {
    const article = `
      The $price is $100.
      Use (parentheses) carefully.
      What about [brackets]?
    `;

    const result1 = extractSentenceFromArticle(article, "$price");
    expect(result1).toContain("$price");

    const result2 = extractSentenceFromArticle(article, "(parentheses)");
    expect(result2).toContain("(parentheses)");

    const result3 = extractSentenceFromArticle(article, "[brackets]");
    expect(result3).toContain("[brackets]");
  });

  test("应该处理复杂的复合词", () => {
    const article = `
      The state-of-the-art technology is impressive.
      A well-known fact is that...
      This is a real-time update.
    `;

    const result1 = extractSentenceFromArticle(article, "state-of-the-art");
    expect(result1).toContain("state-of-the-art");

    const result2 = extractSentenceFromArticle(article, "well-known");
    expect(result2).toContain("well-known");

    const result3 = extractSentenceFromArticle(article, "real-time");
    expect(result3).toContain("real-time");
  });

  test("应该处理首字母大写的单词匹配", () => {
    const article = `
      Technology is important.
      The system works.
    `;

    // 搜索小写，应该匹配大写开头的单词
    const result = extractSentenceFromArticle(article, "technology");
    expect(result).toContain("Technology");
  });

  test("应该处理URL中的点号", () => {
    const article = `
      Visit https://example.com for more info.
      The website is useful.
    `;

    const result = extractSentenceFromArticle(article, "website");
    expect(result).toContain("The website is useful.");
  });

  test("应该处理分号和冒号", () => {
    const article = `
      Note: this is important; remember it well.
      Another sentence here.
    `;

    const result = extractSentenceFromArticle(article, "important");
    expect(result).toContain("important");
  });
});
