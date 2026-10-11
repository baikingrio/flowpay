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

## Mock USDC（测试专用）

产品默认使用自部署的 **Mock USDC（mUSDC）**，避免 Circle 测试网 USDC 不足。合约见 `contracts/MockUSDC.sol`：任意地址可 `claim()` 领 100 mUSDC（30 分钟冷却），也可用 `mint` 给演示账户打币。

```bash
# 部署到 Monad testnet（需有一点 MON 的私钥）
forge create contracts/MockUSDC.sol:MockUSDC \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY
```

把部署地址写入 `app/lib/tokens.ts` 的 `USDC_ADDRESS`。

## 应用内 MON 水龙头（Gas）

新账户一个 MON 都没有，无法付 Gas 去领 mUSDC。应用内的「领取测试 MON」由服务端接口 `POST /api/faucet/mon` 从一个专用钱包转出一小笔 MON（不需要指纹）。首页新用户会看到「① 领取 MON（Gas）→ ② 领取 mUSDC」两步卡片。

- **水龙头地址**：`0x8726959f2332A562F850418F38c533A94FbB0D6B`（Monad testnet）
- **补充余额**：直接往上面的地址转测试网 MON 即可。余额低于「单次额度 + 0.01 MON Gas 预留」时接口返回 `faucet_empty`，界面会改为提示外部 [Monad 水龙头](https://faucet.monad.xyz/)。
- **查看状态**：`GET /api/faucet/status` → `{ configured, address, amount, funded }`（不含任何密钥信息）。
- **规则**：每次 0.05 MON；只有收款地址余额 < 0.02 MON 才发（链上检查，是主要限流手段）；同一 IP / 地址 10 分钟冷却（内存实现，仅单个函数实例内有效）。
- **错误码**：`invalid_address` 400 · `has_balance` 409 · `cooldown` 429 · `faucet_empty` / `faucet_unconfigured` 503 · `send_failed` 502。

环境变量（Vercel → Settings → Environment Variables，Production + Preview）：

| 变量 | 必填 | 说明 |
|------|------|------|
| `FAUCET_PRIVATE_KEY` | 是 | 水龙头钱包私钥，设为 Sensitive。只放在 Vercel，**不要提交到仓库或写进任何文档**。 |
| `FAUCET_MON_AMOUNT` | 否 | 单次发放数量（十进制 MON），默认 `0.05`，上限 `1`。 |

RPC 按顺序回退：drpc → testnet-rpc.monad.xyz → tenderly（见 `shared/faucet.ts`）。策略逻辑在 `shared/faucet.ts`，测试见 `tests/faucet.test.ts`。


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
| **[07-Hackathon-Submission.md](./docs/07-Hackathon-Submission.md)** | **黑客松提交包（评委 2 分钟快速浏览）** |

---

## 快速理解

- **核心**：Mera Passkey 原生账户系统 (One-prompt onboarding)
- **演示场景**：商家 USDC 收银台 + 顾客支付 (双设备)
- **目标**：Monad Metropolis 黑客松 + Mera Bounty
- **赛道**：Trust, Identity & AI Infrastructure / Consumer Products & Payments

---

## 状态

**生产级 Nuxt 4 应用，可进行完整评委演示。**

🌐 **在线演示**：https://flowpay-tau-sand.vercel.app

### ✅ 已完成
- Passkey-first 注册（One-prompt onboarding）
- Mera Signing Session（会话内 prompt-free 签名）
- Stateless 恢复（清存储后仅靠 Passkey 恢复）
- 商家 USDC 收银台 + 顾客扫码支付（双设备）
- 到账匹配 + 每日流水汇总
- 当面 USDC 收银台 + Passkey 支付（Monad Testnet；Swap 已暂停）

### ⚠️ 已知限制
- 无 Gas 赞助（需外部水龙头获取 MON）
- 测试网依赖（Monad Testnet）
- 需要真实设备/浏览器支持 WebAuthn PRF（推荐 iOS Safari / macOS Safari / Chrome+Windows Hello）

**→ 评委快速了解请阅读 [黑客松提交包](./docs/07-Hackathon-Submission.md)。**
