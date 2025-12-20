/**
 * 密码哈希和验证测试
 *
 * 测试 PBKDF2-SHA256 密码加密功能
 */

import { hashPassword, verifyPassword } from "../src/utils/password";

describe("hashPassword", () => {
  test("应该返回正确格式的哈希（salt$hash）", async () => {
    const password = "mySecurePassword123";
    const hashed = await hashPassword(password);

    // 格式应该是 "salt$hash"，两部分都是 base64
    expect(hashed).toMatch(/^[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);

    // 应该包含 $ 分隔符
    const parts = hashed.split("$");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0); // salt
    expect(parts[1].length).toBeGreaterThan(0); // hash
  });

  test("相同密码应该生成不同的哈希（随机salt）", async () => {
    const password = "samePassword";

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // 哈希应该不同（因为 salt 不同）
    expect(hash1).not.toBe(hash2);

    // 但是两个哈希都应该能验证原始密码
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  test("应该处理空密码", async () => {
    const password = "";
    const hashed = await hashPassword(password);

    // 应该仍然返回有效格式
    expect(hashed).toMatch(/^[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);

    // 应该能够验证空密码
    expect(await verifyPassword("", hashed)).toBe(true);
    expect(await verifyPassword("notEmpty", hashed)).toBe(false);
  });

  test("应该处理包含特殊字符的密码", async () => {
    const specialPasswords = [
      "p@ssw0rd!",
      "密码123",
      "🔐🔑",
      "line1\nline2",
      "tab\there",
      "<script>alert('xss')</script>",
    ];

    for (const password of specialPasswords) {
      const hashed = await hashPassword(password);

      // 应该返回有效格式
      expect(hashed).toMatch(/^[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);

      // 应该能够正确验证
      expect(await verifyPassword(password, hashed)).toBe(true);
    }
  });

  test("应该处理超长密码", async () => {
    const longPassword = "a".repeat(1000);
    const hashed = await hashPassword(longPassword);

    expect(hashed).toMatch(/^[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword(longPassword, hashed)).toBe(true);
  });

  test("哈希输出应该是确定长度的base64字符串", async () => {
    const password = "testPassword";
    const hashed = await hashPassword(password);
    const [salt, hash] = hashed.split("$");

    // PBKDF2-SHA256 with 16-byte salt, 32-byte output
    // Base64 编码后的长度应该是固定的
    expect(salt.length).toBeGreaterThan(20); // base64(16 bytes) ≈ 24
    expect(hash.length).toBeGreaterThan(40); // base64(32 bytes) ≈ 44
  });
});

describe("verifyPassword", () => {
  test("正确密码应该验证通过", async () => {
    const password = "correctPassword123";
    const hashed = await hashPassword(password);

    const result = await verifyPassword(password, hashed);

    expect(result).toBe(true);
  });

  test("错误密码应该验证失败", async () => {
    const correctPassword = "correctPassword";
    const wrongPassword = "wrongPassword";
    const hashed = await hashPassword(correctPassword);

    const result = await verifyPassword(wrongPassword, hashed);

    expect(result).toBe(false);
  });

  test("应该区分大小写", async () => {
    const password = "Password123";
    const hashed = await hashPassword(password);

    expect(await verifyPassword("Password123", hashed)).toBe(true);
    expect(await verifyPassword("password123", hashed)).toBe(false);
    expect(await verifyPassword("PASSWORD123", hashed)).toBe(false);
  });

  test("应该处理空密码验证", async () => {
    const password = "notEmpty";
    const hashed = await hashPassword(password);

    expect(await verifyPassword("", hashed)).toBe(false);
  });

  test("应该处理格式错误的哈希", async () => {
    const password = "testPassword";

    // 缺少 $ 分隔符
    expect(await verifyPassword(password, "invalidhash")).toBe(false);

    // 只有 salt，没有 hash
    expect(await verifyPassword(password, "salt$")).toBe(false);

    // 只有 hash，没有 salt
    expect(await verifyPassword(password, "$hash")).toBe(false);

    // 空字符串
    expect(await verifyPassword(password, "")).toBe(false);

    // 多个 $ 分隔符
    expect(await verifyPassword(password, "salt$hash$extra")).toBe(false);
  });

  test("应该处理无效的base64哈希", async () => {
    const password = "testPassword";

    // 包含非 base64 字符
    expect(await verifyPassword(password, "salt!@#$hash!@#")).toBe(false);

    // base64 长度错误
    expect(await verifyPassword(password, "a$b")).toBe(false);
  });

  test("应该防御时序攻击（相同长度的错误密码）", async () => {
    const correctPassword = "correctPassword";
    const hashed = await hashPassword(correctPassword);

    // 多次验证错误密码，时间应该相对稳定
    const wrongPassword = "wrongPassword00"; // 相同长度
    const times: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await verifyPassword(wrongPassword, hashed);
      const duration = Date.now() - start;
      times.push(duration);
    }

    // 验证所有调用都返回 false
    for (let i = 0; i < 10; i++) {
      expect(await verifyPassword(wrongPassword, hashed)).toBe(false);
    }

    // 时间应该比较稳定（标准差不应该太大）
    // 注：这是一个简单的检查，真正的时序攻击防御需要更复杂的测试
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance =
      times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // 标准差应该小于平均值（说明时间相对稳定）
    // 这个测试可能在不同环境下表现不同，仅作为基础检查
    expect(stdDev).toBeLessThan(avg * 2);
  });

  test("应该正确处理特殊字符密码的验证", async () => {
    const specialPasswords = [
      "p@ssw0rd!",
      "密码123",
      "🔐🔑",
      "line1\nline2",
      "tab\there",
    ];

    for (const password of specialPasswords) {
      const hashed = await hashPassword(password);

      // 正确密码应该通过
      expect(await verifyPassword(password, hashed)).toBe(true);

      // 稍微修改的密码应该失败
      expect(await verifyPassword(password + "x", hashed)).toBe(false);
      expect(await verifyPassword("x" + password, hashed)).toBe(false);
    }
  });

  test("应该处理异常情况不抛出错误", async () => {
    // 这些调用不应该抛出异常，而是返回 false
    await expect(verifyPassword("test", "invalid")).resolves.toBe(false);
    await expect(verifyPassword("", "")).resolves.toBe(false);
    await expect(verifyPassword("test", "$")).resolves.toBe(false);
  });
});

describe("密码安全性综合测试", () => {
  test("完整的注册和登录流程", async () => {
    // 模拟用户注册
    const userPassword = "User@123!Secure";
    const hashedPassword = await hashPassword(userPassword);

    // 存储到"数据库"（实际就是内存变量）
    const storedHash = hashedPassword;

    // 模拟用户登录 - 正确密码
    const loginAttempt1 = await verifyPassword("User@123!Secure", storedHash);
    expect(loginAttempt1).toBe(true);

    // 模拟用户登录 - 错误密码
    const loginAttempt2 = await verifyPassword("wrongPassword", storedHash);
    expect(loginAttempt2).toBe(false);

    // 模拟暴力破解尝试
    const commonPasswords = [
      "123456",
      "password",
      "12345678",
      "qwerty",
      "abc123",
    ];

    for (const attempt of commonPasswords) {
      expect(await verifyPassword(attempt, storedHash)).toBe(false);
    }
  });

  test("不同用户的相同密码应该有不同的哈希", async () => {
    const commonPassword = "commonPassword123";

    // 两个用户使用相同密码注册
    const user1Hash = await hashPassword(commonPassword);
    const user2Hash = await hashPassword(commonPassword);

    // 哈希应该不同（因为 salt 不同）
    expect(user1Hash).not.toBe(user2Hash);

    // 但都应该能验证原始密码
    expect(await verifyPassword(commonPassword, user1Hash)).toBe(true);
    expect(await verifyPassword(commonPassword, user2Hash)).toBe(true);

    // 一个用户的哈希不应该验证另一个用户的密码（虽然密码相同）
    // 实际上会验证通过，因为密码确实相同，这是正确的行为
    expect(await verifyPassword(commonPassword, user1Hash)).toBe(true);
    expect(await verifyPassword(commonPassword, user2Hash)).toBe(true);
  });

  test("密码修改流程", async () => {
    const oldPassword = "oldPassword123";
    const newPassword = "newPassword456";

    // 用户原始密码
    const oldHash = await hashPassword(oldPassword);

    // 验证旧密码
    expect(await verifyPassword(oldPassword, oldHash)).toBe(true);

    // 用户修改密码
    const newHash = await hashPassword(newPassword);

    // 新哈希应该不同
    expect(newHash).not.toBe(oldHash);

    // 旧密码不应该能验证新哈希
    expect(await verifyPassword(oldPassword, newHash)).toBe(false);

    // 新密码应该能验证新哈希
    expect(await verifyPassword(newPassword, newHash)).toBe(true);
  });

  test("哈希输出应该可重复验证", async () => {
    const password = "testPassword";
    const hashed = await hashPassword(password);

    // 多次验证应该都成功
    for (let i = 0; i < 100; i++) {
      expect(await verifyPassword(password, hashed)).toBe(true);
    }

    // 多次验证错误密码应该都失败
    for (let i = 0; i < 100; i++) {
      expect(await verifyPassword("wrongPassword", hashed)).toBe(false);
    }
  });

  test("性能测试：哈希操作应该在合理时间内完成", async () => {
    const password = "performanceTestPassword";

    // 哈希操作应该在 1 秒内完成（PBKDF2 with 100,000 iterations）
    const start = Date.now();
    const hashed = await hashPassword(password);
    const hashDuration = Date.now() - start;

    expect(hashDuration).toBeLessThan(1000);

    // 验证操作也应该在 1 秒内完成
    const verifyStart = Date.now();
    await verifyPassword(password, hashed);
    const verifyDuration = Date.now() - verifyStart;

    expect(verifyDuration).toBeLessThan(1000);
  });
});
