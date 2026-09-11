# Flowpay

像登录普通 App 一样进入 Monad 世界。

**Google / GitHub 一键注册 → 转账与交易用 Face ID 确认 → 无种子短语、自托管。**

> Flowpay — 像流水一样顺畅的链上支付与账户体验。

---

## 开发

需要 Node.js 22+（推荐偶数主版本 22 / 24）和 pnpm。

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### Gas 赞助配置（可选）

为了让新用户无需外部水龙头即可完成首次支付，Flowpay 支持通过第三方 paymaster（Pimlico）赞助 gas。

1. 注册 Pimlico 账号：[dashboard.pimlico.io](https://dashboard.pimlico.io)
2. 创建 API Key（测试网免费）
3. 复制 `.env.example` 为 `.env`
4. 填入 API Key：
   ```bash
   NUXT_PUBLIC_PIMLICO_API_KEY=your_api_key_here
   ```

不配置此 Key 时，应用仍可正常运行，用户需通过水龙头获取 MON 后才能发送交易。

其它命令：`pnpm typecheck`、`pnpm lint`、`pnpm build`。

---

## 文档

所有详细文档位于 [`docs/`](./docs/) 目录：

| 文件 | 内容 |
|------|------|
| [01-PRD.md](./docs/01-PRD.md) | 产品需求文档 |
| [02-User-Flows.md](./docs/02-User-Flows.md) | 用户流程图 |
| [03-Technical-Architecture.md](./docs/03-Technical-Architecture.md) | 技术架构 |
| [04-MVP-Scope-and-Roadmap.md](./docs/04-MVP-Scope-and-Roadmap.md) | MVP 范围与 6 周计划 |
| [05-Demo-Script.md](./docs/05-Demo-Script.md) | 评委演示脚本 |
| [06-Project-Overview.md](./docs/06-Project-Overview.md) | 项目总览 |

---

## 快速理解

- **核心**：Passkey 原生账户系统（社交登录 + 生物识别确认）
- **演示场景**：小支付 App + 简单交易界面
- **目标**：Monad Metropolis 黑客松
- **赛道**：Trust, Identity & AI Infrastructure / Consumer Products & Payments

---

## 状态

Nuxt 4 应用已初始化，可进入账户层（Mera）与页面开发。
