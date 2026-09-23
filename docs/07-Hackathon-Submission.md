# Flowpay — Hackathon Submission

**黑客松评委快速浏览包**  
**预计阅读时间**：2 分钟

🌐 **在线演示**：https://flowpay-tau-sand.vercel.app

---

## 一句话简介

Flowpay — 像流水一样顺畅的链上支付与账户体验。  
**一次 Face ID / 指纹完成注册，Mera 作为整个账户层，USDC 收银台双设备支付，全程无种子短语、自托管。**

> **产品一致性（2026-09-23）**：本黑客松提交展示 Flowpay 真实产品主线（商家↔顾客线下 USDC 收款），非独立 demo 构建。产品聚焦支付循环；Swap 功能已暂停。详见 `docs/08-Real-Product-v0.md`。

---

## 参赛信息

- **主赛道**：Trust, Identity & AI Infrastructure
- **副赛道**：Consumer Products & Payments
- **重点 Bounty**：**Mera (Category Labs)**

---

## 问题与解决方案

### 问题
链上账户体验严重阻碍大众采用：
- 用户必须备份 12/24 个单词，丢失即永久失去资产
- "连接钱包"弹窗、助记词、Gas 等概念对新用户极不友好
- 跨设备使用困难，安全与便利难以兼顾

### 解决方案
- **Mera 作为完整账户层**（`@category-labs/mera`）
- 一次 Passkey 仪式完成注册与恢复（One-prompt + Stateless）
- Mera Signing Session 实现合理范围内的 prompt-free 签名
- 利用 Monad 高速最终性，优化 Time-to-first-transaction
- 用**真实商家 USDC 收银台 + 顾客双设备支付**证明实际可用

### 为什么选择 Monad + Mera？
- **Monad**：300ms 出块 + 600ms 最终性 → Time-to-first-transaction 极快
- **Mera**：WebAuthn PRF → 标准 EOA → Signing Session → 完全自托管 → Stateless 恢复

---

## 已完成功能（可现场演示）

### ✅ Mera 核心集成
- [x] **One-prompt Onboarding**：仅一次 Passkey 仪式（`createPasskeyWithPrfOutput`），无种子短语、无钱包扩展、无托管后端
- [x] **Signing Session**：会话内 prompt-free 签名，过期后清晰提示并要求重新验证
- [x] **Stateless 恢复**：清除 localStorage 或换设备后，仅靠 Passkey 即可完整重建账户（设置页「清除本机数据」按钮可立即测试）
- [x] WebAuthn PRF → BIP-44 EOA 派生（标准 secp256k1 账户）

### ✅ 商家 USDC 收银台（核心演示场景）
- [x] **商家端**（`/checkout`）：USDC 金额键盘 → 生成 EIP-681 ERC-20 收款二维码
- [x] **顾客端**（扫码 → `/pay`）：预填金额与收款地址 → 一次 Passkey → USDC 转账确认
- [x] **到账匹配**：商家端轮询 USDC `Transfer` 事件（5 分钟窗口）→ 显示到账 + 声音提示
- [x] **每日流水汇总**：商家端查看今日 USDC 收款总额与列表（localStorage）

### ✅ 基础支付与交易
- [x] MON 转账（`/pay`）
- [x] 简单 Swap（`/swap`，测试网 PuddleSwap，MON ↔ USDC）
- [x] 余额展示与交易历史

### ✅ 完整体验
- [x] 响应式设计（手机壳布局，适配移动端与桌面端）
- [x] 会话状态可视化（TopBar + Settings 显示剩余时间）
- [x] 设置页（锁定、清除本机数据、语言、网络切换）
- [x] 到账声音广播（商家收银台）

---

## 诚实说明的限制

### ⚠️ 当前已知限制
1. **无 Gas 赞助**：  
   新用户需外部水龙头获取 MON（ERC-4337 SA 路径与 EOA 余额模型不兼容；EIP-7702 要求 10 MON 储备；详见 `docs/adr/0010-gas-sponsorship.md`）。  
   UI 诚实展示水龙头链接。

2. **测试网依赖**：  
   运行在 Monad Testnet（需水龙头 MON 和 USDC）。

3. **Mock GitHub 路径已移除**：  
   早期 PR 曾包含 Mock GitHub 登录作为实验路径，已从主流程移除以严格遵守 Mera One-prompt 要求。评委路径仅为 **Passkey-first**。

### 🚀 部署状态
- **生产部署**：https://flowpay-tau-sand.vercel.app
- **Vercel 项目**：`baikingrios-projects/flowpay`（已链接 GitHub 仓库，自动部署）
- **本地开发**：`pnpm install && pnpm dev`

**⚠️ 重要**：Flowpay 需要真实设备/浏览器支持 **WebAuthn PRF 扩展**。推荐：
- **桌面**：Chrome/Edge + Windows Hello，或 Safari + macOS Touch ID
- **移动**：iOS Safari + Face ID/Touch ID，或 Android Chrome + 生物识别
- 不支持虚拟机、模拟器、或不支持 PRF 的浏览器

---

## 如何本地运行

### 环境要求
- **Node.js 22+**（推荐 22 或 24 偶数主版本）
- **pnpm**

### 启动命令
```bash
git clone https://github.com/baikingrio/flowpay.git
cd flowpay
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 其它命令
- `pnpm typecheck` — TypeScript 类型检查
- `pnpm lint` — ESLint 代码检查
- `pnpm build` — 生产构建

### 部署（可选）

Flowpay 是标准 Nuxt 4 应用，可部署到任何支持 Node.js 的平台。

#### Vercel 部署
1. 导入 GitHub 仓库到 Vercel
2. 构建设置：
   - **Framework Preset**：Nuxt.js
   - **Build Command**：`pnpm build`
   - **Output Directory**：`.output/public`
   - **Install Command**：`pnpm install`
   - **Node Version**：22.x
3. 部署

#### Netlify 部署
1. 导入 GitHub 仓库到 Netlify
2. 构建设置：
   - **Build Command**：`pnpm build`
   - **Publish Directory**：`.output/public`
   - **Node Version**：22
3. 部署

**⚠️ 设备要求**：Flowpay 需要真实设备/浏览器支持 **WebAuthn PRF 扩展**（不支持虚拟机/模拟器）。推荐配置：
- **桌面**：Chrome/Edge + Windows Hello，或 Safari + macOS Touch ID
- **移动**：iOS Safari + Face ID/Touch ID，或 Android Chrome + 生物识别

---

## 评委演示建议（3–4 分钟）

完整演示脚本详见 [`docs/05-Demo-Script.md`](./05-Demo-Script.md)。以下为快速大纲：

### 建议流程

1. **打开落地页**（30 秒）  
   "主按钮只有一个：用 Face ID / 指纹开始。没有 Google 登录，没有邮箱，没有助记词。"

2. **一次 Passkey 仪式完成注册**（30 秒）  
   "用户点击 → 系统生物识别 → 完成。账户已通过 Mera 派生，直接显示地址和余额。这就是 One-prompt onboarding。"

3. **双设备收银台演示**（1 分钟）  
   - 商家在 `/checkout` 输入 USDC 金额（如 5 USDC）→ 生成收款二维码
   - 顾客用另一台设备扫码 → 跳转 `/pay` → Passkey 确认 → USDC 转账
   - 商家端显示到账 + 播放提示音 + 今日流水汇总更新

4. **展示 Session 体验**（30 秒）  
   "在会话有效期内，我可以连续再做一笔 Swap，无需重复刷脸。会话过期后，系统会清晰提示并要求重新验证。"

5. **现场 Stateless Test**（1 分钟，**关键加分**）  
   "现在我打开设置 → 点击『清除本机数据』→ 返回首页 → 再次点击『用 Face ID 继续』→ 同一 Passkey → 账户完整恢复。身份和访问能力完全从 Passkey 重建，不依赖本地敏感存储。"

6. **收尾强调**（20 秒）  
   "Mera 是整个账户层。用户几乎感觉不到区块链的存在，但资产完全自托管。"

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | **Nuxt 4** + TypeScript + Vue 3 |
| UI | Tailwind CSS + shadcn-vue |
| **账户层** | **@category-labs/mera**（核心） |
| 链交互 | viem + Monad Testnet RPC |
| 状态管理 | Pinia |
| 认证标准 | WebAuthn Level 2 + PRF Extension |

---

## 文档导航

完整文档位于 [`docs/`](../docs/) 目录：

| 文件 | 内容 |
|------|------|
| [01-PRD.md](./01-PRD.md) | 产品需求文档（Mera-first） |
| [02-User-Flows.md](./02-User-Flows.md) | 用户流程图（含 Session 与 Stateless） |
| [03-Technical-Architecture.md](./03-Technical-Architecture.md) | 技术架构（Mera 为核心） |
| [04-MVP-Scope-and-Roadmap.md](./04-MVP-Scope-and-Roadmap.md) | MVP 范围与开发计划 |
| [05-Demo-Script.md](./05-Demo-Script.md) | 评委演示脚本（含 Stateless Test） |
| [06-Project-Overview.md](./06-Project-Overview.md) | 项目总览 |
| **[07-Hackathon-Submission.md](./07-Hackathon-Submission.md)** | **本文件（评委快速浏览包）** |

---

## Mera Bounty 核心要求达成情况

| Mera 要求 | Flowpay 实现 | 验证方式 |
|-----------|--------------|----------|
| Mera is the entire account layer | 账户创建、恢复、签名全部走 Mera | 代码审查 + 现场演示 |
| No seed phrase | 用户界面永不展示助记词 | UI 截图 + 演示 |
| No wallet extension | 纯网页 + Passkey | 浏览器演示（无扩展） |
| No custody backend | 无服务器持有用户密钥 | 架构图 + 代码审查 |
| **One-prompt onboarding** | 仅一次 Passkey 仪式 | 现场注册演示 |
| **Prompt-free signing** | Mera Signing Sessions | 现场连续交易演示 |
| **Stateless test** | 清存储后仅靠 Passkey 恢复 | **设置页「清除本机数据」按钮 + 现场恢复** |
| Time-to-first-transaction | 利用 Monad 300ms 出块 | 计时演示 |

---

## 联系方式

- **GitHub Repo**：[https://github.com/baikingrio/flowpay](https://github.com/baikingrio/flowpay)
- **包含的 PR**：
  - [#10 Passkey-first onboarding](https://github.com/baikingrio/flowpay/pull/10)
  - [#11 Checkout arrival polish + demo script](https://github.com/baikingrio/flowpay/pull/11)

---

## 下一步（黑客松后）

- [ ] Gas 赞助（待 Monad Paymaster 方案成熟）
- [ ] 完整链上索引（交易历史与流水导出）
- [ ] 更精细的 Session policy（金额上限、白名单）
- [ ] 社交恢复与多设备管理
- [ ] 主网部署（Monad 主网上线后）

---

**感谢评委阅读！期待现场演示。**
