# Vocab Master

**基于 AI 的英语词汇学习工具，从真实文章中学单词。**

粘贴任意英文文章 → AI 识别你不认识的单词并结合上下文解释 → 通过间隔重复复习直到彻底掌握。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

---

🔗 **在线体验：** _即将上线_ · [English](./README.md)

<!-- ![应用截图](./screenshot.png) -->

---

## ✨ 核心亮点

- **双 AI 管道** — Google Cloud NLP 对文章分词并提取词根；GPT-4o-mini 根据单词在**本篇文章**中的用法给出解释，而不是词典式的通用定义
- **三类单词分型** — `新词`（首次出现）、`扩展`（认识这个词，但这个语境下是新含义）、`已掌握`（AI 判断你已理解当前含义 — 自动跳过，不保存）
- **Anki SM-2 间隔重复** — 保存的单词进入闪卡复习队列；四档难度评级（再来一次 / 困难 / 正常 / 简单）动态计算下次复习时间

---

## 解决什么问题

阅读英文材料时，经常遇到一个"好像认识"的单词，但词典里的释义在当前语境下说不通。去问 AI 工具能解决问题，但会打断阅读节奏。

Vocab Master 的做法：根据你设置的词汇等级自动过滤已认识的单词，只对真正陌生的词调用 AI——而且 AI 是结合整篇文章来解释，不是给你背词典。

---

## 使用流程

1. **选择词汇等级** — 7 个等级可选（初中 → GRE）。系统根据等级预先过滤你已掌握的单词
2. **粘贴文章** — Google NLP 分词；GPT-4o-mini 结合文章上下文解释陌生词
3. **闪卡复习** — 保存的单词进入 Anki SM-2 复习队列，四档难度动态调整下次复习日期

---

## 功能列表

- **已认知词汇白名单** — 手动标记领域专业词（如技术术语），分析时永久过滤
- **账号体系** — 邮箱 + 手机号双模式注册登录，支持邮件验证，基于 Better Auth
- **订阅付费** — Stripe 驱动的免费增值模型，支持月付/年付，Webhook 自动处理订阅生命周期
- **用量配额** — 中间件层配额校验，实时显示用量和升级引导
- **学习统计** — 每日新增词汇、复习数量、正确率、连续学习天数

---

## 技术栈

| | |
|---|---|
| **后端** | Hono.js on Cloudflare Workers |
| **数据库** | PostgreSQL (Neon) HTTP 连接 + Drizzle ORM |
| **认证** | Better Auth（邮箱 + 手机号） |
| **AI / NLP** | OpenAI GPT-4o-mini + Google Cloud NLP |
| **支付** | Stripe（订阅 + Webhook） |
| **前端** | React 19、React Router v7、TanStack Query、Radix UI |
| **校验** | Zod（前后端共享 Schema） |
| **Monorepo** | pnpm workspaces（`api` / `client` / `shared`） |

---

## 订阅方案

| | 免费版 | 专业版 |
|--|:----:|:-------:|
| 每日分析篇数 | 2 篇 | 50 篇 |
| 单篇最大字数 | 1,000 词 | 5,000 词 |
| 闪卡复习 | ✓ | ✓ |
| 价格 | 免费 | $7 / 月 · $67 / 年 |

---

## License

MIT
