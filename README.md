# Flowpay

像登录普通 App 一样进入 Monad 世界。

**用 Face ID / 指纹一键开始 → USDC 收银台与支付 → 无种子短语、自托管。**

> Flowpay — 像流水一样顺畅的链上支付与账户体验。基于 Mera (Passkey 账户层) + Monad 测试网。

---

## 开发

需要 Node.js 22+（推荐偶数主版本 22 / 24）和 pnpm。

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

其它命令：`pnpm typecheck`、`pnpm lint`、`pnpm build`。

---

## 演示场景

**商家 USDC 收银台 + 顾客双设备支付**：
1. 商家在 `/checkout` 输入 USDC 金额 → 生成收款二维码
2. 顾客扫码 → 一次 Passkey (Face ID / Touch ID) → USDC 转账确认
3. 商家端显示到账 + 今日流水汇总

全程无种子短语、无钱包扩展、无托管后端。Mera 是整个账户层。

---

## 文档

所有详细文档位于 [`docs/`](./docs/) 目录：

| 文件 | 内容 |
|------|------|
| [01-PRD.md](./docs/01-PRD.md) | 产品需求文档 |
| [02-User-Flows.md](./docs/02-User-Flows.md) | 用户流程图 |
| [03-Technical-Architecture.md](./docs/03-Technical-Architecture.md) | 技术架构 |
| [04-MVP-Scope-and-Roadmap.md](./docs/04-MVP-Scope-and-Roadmap.md) | MVP 范围与开发计划 |
| [05-Demo-Script.md](./docs/05-Demo-Script.md) | 评委演示脚本 |
| [06-Project-Overview.md](./docs/06-Project-Overview.md) | 项目总览 |

---

## 快速理解

- **核心**：Mera Passkey 原生账户系统 (One-prompt onboarding)
- **演示场景**：商家 USDC 收银台 + 顾客支付 (双设备)
- **目标**：Monad Metropolis 黑客松 + Mera Bounty
- **赛道**：Trust, Identity & AI Infrastructure / Consumer Products & Payments

---

## 状态

生产级 Nuxt 4 应用,已集成 Mera 账户层、USDC 收银台、Swap、Stateless 恢复。可进行完整评委演示。
