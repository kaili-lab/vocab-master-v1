/**
 * Anki SM-2 算法测试
 *
 * 测试间隔重复算法的核心逻辑
 */

import {
  calculateNextReview,
  getNextReviewDate,
  type AnkiState,
  type DifficultyRating,
} from "../src/utils/anki-algorithm";

describe("calculateNextReview", () => {
  // 标准初始状态
  const initialState: AnkiState = {
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 0,
  };

  describe("Again（完全忘记）", () => {
    test("应该重置间隔为1天", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 3,
      };

      const result = calculateNextReview(state, "again");

      expect(result.intervalDays).toBe(1);
    });

    test("应该降低难度系数", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 3,
      };

      const result = calculateNextReview(state, "again");

      expect(result.easeFactor).toBe(2.3); // 2.5 - 0.2
    });

    test("难度系数不应低于1.3", () => {
      const state: AnkiState = {
        easeFactor: 1.4, // 接近最小值
        intervalDays: 10,
        repetitions: 3,
      };

      const result = calculateNextReview(state, "again");

      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(result.easeFactor).toBe(1.3); // 1.4 - 0.2 = 1.2, 但会被限制为 1.3
    });

    test("应该重置连续正确次数为0", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 5,
      };

      const result = calculateNextReview(state, "again");

      expect(result.repetitions).toBe(0);
    });
  });

  describe("Hard（困难）", () => {
    test("应该降低难度系数", () => {
      const result = calculateNextReview(initialState, "hard");

      expect(result.easeFactor).toBe(2.35); // 2.5 - 0.15
    });

    test("难度系数不应低于1.3", () => {
      const state: AnkiState = {
        easeFactor: 1.4,
        intervalDays: 1,
        repetitions: 0,
      };

      const result = calculateNextReview(state, "hard");

      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(result.easeFactor).toBe(1.3); // 1.4 - 0.15 = 1.25, 限制为 1.3
    });

    test("第一次正确：间隔应为1天", () => {
      const result = calculateNextReview(initialState, "hard");

      expect(result.repetitions).toBe(1);
      // 第一次正确基础间隔是1天，hard 乘以 1.2
      expect(result.intervalDays).toBe(1); // Math.max(1, Math.round(1 * 1.2)) = 1
    });

    test("第二次正确：间隔应为6天的1.2倍", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
      };

      const result = calculateNextReview(state, "hard");

      expect(result.repetitions).toBe(2);
      // 第二次正确基础间隔是6天，hard 乘以 1.2
      expect(result.intervalDays).toBe(7); // Math.round(6 * 1.2) = 7
    });

    test("第三次及以后：应用难度系数后乘以1.2", () => {
      const state: AnkiState = {
        easeFactor: 2.0,
        intervalDays: 10,
        repetitions: 2,
      };

      const result = calculateNextReview(state, "hard");

      expect(result.repetitions).toBe(3);
      // 间隔 = Math.round(10 * (2.0 - 0.15)) * 1.2
      // = Math.round(10 * 1.85) * 1.2
      // = 19 * 1.2 = 22.8 → 23
      expect(result.intervalDays).toBe(23); // Math.max(1, Math.round(Math.round(10 * 1.85) * 1.2))
    });

    test("应该增加连续正确次数", () => {
      const result = calculateNextReview(initialState, "hard");

      expect(result.repetitions).toBe(1);
    });
  });

  describe("Good（正常）", () => {
    test("应该保持难度系数不变", () => {
      const result = calculateNextReview(initialState, "good");

      expect(result.easeFactor).toBe(2.5);
    });

    test("第一次正确：间隔应为1天", () => {
      const result = calculateNextReview(initialState, "good");

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
    });

    test("第二次正确：间隔应为6天", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
      };

      const result = calculateNextReview(state, "good");

      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    test("第三次及以后：应用难度系数", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2,
      };

      const result = calculateNextReview(state, "good");

      expect(result.repetitions).toBe(3);
      expect(result.intervalDays).toBe(15); // Math.round(6 * 2.5)
    });

    test("应该增加连续正确次数", () => {
      const result = calculateNextReview(initialState, "good");

      expect(result.repetitions).toBe(1);
    });
  });

  describe("Easy（简单）", () => {
    test("应该增加难度系数", () => {
      const result = calculateNextReview(initialState, "easy");

      expect(result.easeFactor).toBe(2.65); // 2.5 + 0.15
    });

    test("难度系数可以超过初始值", () => {
      const state: AnkiState = {
        easeFactor: 3.0,
        intervalDays: 20,
        repetitions: 5,
      };

      const result = calculateNextReview(state, "easy");

      expect(result.easeFactor).toBe(3.15); // 3.0 + 0.15
    });

    test("第一次正确：间隔应为1天的1.3倍", () => {
      const result = calculateNextReview(initialState, "easy");

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1); // Math.round(1 * 1.3) = 1
    });

    test("第二次正确：间隔应为6天的1.3倍", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
      };

      const result = calculateNextReview(state, "easy");

      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(8); // Math.round(6 * 1.3)
    });

    test("第三次及以后：应用难度系数后乘以1.3", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 2,
      };

      const result = calculateNextReview(state, "easy");

      expect(result.repetitions).toBe(3);
      // 间隔 = Math.round(Math.round(10 * 2.65) * 1.3)
      // = Math.round(27 * 1.3) = 35
      expect(result.intervalDays).toBe(35);
    });

    test("应该增加连续正确次数", () => {
      const result = calculateNextReview(initialState, "easy");

      expect(result.repetitions).toBe(1);
    });
  });

  describe("边界情况", () => {
    test("间隔天数应该始终为正整数", () => {
      const ratings: DifficultyRating[] = ["again", "hard", "good", "easy"];

      ratings.forEach((rating) => {
        const result = calculateNextReview(initialState, rating);

        expect(result.intervalDays).toBeGreaterThan(0);
        expect(Number.isInteger(result.intervalDays)).toBe(true);
      });
    });

    test("连续正确次数应该递增（除了again）", () => {
      const ratings: DifficultyRating[] = ["hard", "good", "easy"];

      ratings.forEach((rating) => {
        const result = calculateNextReview(initialState, rating);

        expect(result.repetitions).toBeGreaterThan(initialState.repetitions);
      });
    });

    test("应该处理极大的间隔天数", () => {
      const state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 365, // 一年
        repetitions: 10,
      };

      const result = calculateNextReview(state, "good");

      expect(result.intervalDays).toBeGreaterThan(365);
      expect(Number.isInteger(result.intervalDays)).toBe(true);
    });

    test("应该处理最小难度系数", () => {
      const state: AnkiState = {
        easeFactor: 1.3, // 最小值
        intervalDays: 10,
        repetitions: 3,
      };

      const resultAgain = calculateNextReview(state, "again");
      expect(resultAgain.easeFactor).toBe(1.3);

      const resultHard = calculateNextReview(state, "hard");
      expect(resultHard.easeFactor).toBe(1.3);
    });
  });

  describe("真实场景模拟", () => {
    test("完整的学习路径：从新卡片到熟练", () => {
      let state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
      };

      // 第1次：good
      state = calculateNextReview(state, "good");
      expect(state.intervalDays).toBe(1);
      expect(state.repetitions).toBe(1);

      // 第2次：good
      state = calculateNextReview(state, "good");
      expect(state.intervalDays).toBe(6);
      expect(state.repetitions).toBe(2);

      // 第3次：good
      state = calculateNextReview(state, "good");
      expect(state.intervalDays).toBe(15);
      expect(state.repetitions).toBe(3);

      // 第4次：easy（已经很熟练）
      state = calculateNextReview(state, "easy");
      expect(state.easeFactor).toBeGreaterThan(2.5);
      expect(state.intervalDays).toBeGreaterThan(15);
      expect(state.repetitions).toBe(4);
    });

    test("遗忘后重新学习：again 后重新开始", () => {
      let state: AnkiState = {
        easeFactor: 2.5,
        intervalDays: 15,
        repetitions: 3,
      };

      // 忘记了
      state = calculateNextReview(state, "again");
      expect(state.intervalDays).toBe(1);
      expect(state.repetitions).toBe(0);
      expect(state.easeFactor).toBe(2.3);

      // 重新学习
      state = calculateNextReview(state, "good");
      expect(state.intervalDays).toBe(1);
      expect(state.repetitions).toBe(1);
    });
  });
});

describe("getNextReviewDate", () => {
  test("应该正确计算未来日期", () => {
    const now = new Date();
    const result = getNextReviewDate(7);

    const expectedDate = new Date(now);
    expectedDate.setDate(now.getDate() + 7);

    expect(result.getDate()).toBe(expectedDate.getDate());
    expect(result.getMonth()).toBe(expectedDate.getMonth());
    expect(result.getFullYear()).toBe(expectedDate.getFullYear());
  });

  test("应该处理0天间隔", () => {
    const now = new Date();
    const result = getNextReviewDate(0);

    expect(result.getDate()).toBe(now.getDate());
  });

  test("应该处理1天间隔", () => {
    const now = new Date();
    const result = getNextReviewDate(1);

    const expectedDate = new Date(now);
    expectedDate.setDate(now.getDate() + 1);

    expect(result.getDate()).toBe(expectedDate.getDate());
  });

  test("应该处理跨月场景", () => {
    const now = new Date();
    const result = getNextReviewDate(45); // 45天后

    const expectedDate = new Date(now);
    expectedDate.setDate(now.getDate() + 45);

    expect(result.getDate()).toBe(expectedDate.getDate());
    expect(result.getMonth()).toBe(expectedDate.getMonth());
  });

  test("应该处理大间隔（跨年）", () => {
    const now = new Date();
    const result = getNextReviewDate(400); // 超过一年

    const expectedDate = new Date(now);
    expectedDate.setDate(now.getDate() + 400);

    expect(result.getFullYear()).toBe(expectedDate.getFullYear());
  });

  test("返回的日期应该是Date对象", () => {
    const result = getNextReviewDate(7);

    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThan(Date.now());
  });
});
