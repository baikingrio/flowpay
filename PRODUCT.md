# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Nuxt 4 + TypeScript + Tailwind CSS + shadcn-vue + viem + `@category-labs/mera`（与 `docs/03-Technical-Architecture.md` / 路线图一致；仓库尚无应用脚手架，以本记录为准）。

## Users

- **加密新手 / Web2 用户**：希望像普通 App 一样进入链上支付与简单交易，不愿面对种子短语、钱包扩展或 Gas 概念。
- **黑客松 / Mera Bounty 评委**：需验证 One-prompt、Signing Session、Stateless Test、Time-to-first-transaction 等可演示路径。

两者在产品取舍上**同等优先**：日常可用性与评委可验证性都不可牺牲一方。

## Product Purpose

Flowpay 提供像流水一样顺畅的链上支付与账户体验：一次 Face ID / 指纹完成注册，支付与交易在会话内可无感签名，无种子短语、无钱包扩展、无托管后端。

成功意味着：用户几乎感觉不到区块链；评委可完成注册 → 支付 → Swap，并现场通过 Stateless Test；Time-to-first-transaction 尽可能短（目标约 20–30 秒量级）。

## Positioning

**Mera 是整个账户层**，而非附加能力：`createPasskeyWithPrfOutput` → BIP-44 EOA；Mera Signing Session 支持合理范围内的 prompt-free 签名；身份与访问可仅从 Passkey + 非敏感存储重建（Stateless）。竞品若只是「接了 Passkey」或仍依赖扩展 / 托管密钥，无法诚实复述这一主张。

## Operating Context

- **活动**：Monad Metropolis 黑客松（约 2026-09-01 – 2026-10-13）；重点 Sponsor Bounty：Mera（Category Labs）。
- **赛道**：Trust, Identity & AI Infrastructure；辅 Consumer Products & Payments。
- **演示路径**：落地页 → 一次 Passkey → 支付 App（转账）→ 简单 Swap；评委可清存储或换设备做 Stateless Test。
- **设备约束**：需支持 WebAuthn PRF 的主流浏览器与设备；演示机需提前确认兼容性。
- **演示网络**：P0 使用 Monad 测试网（公开 RPC + 水龙头）。主网可后换 chainId / RPC，不改账户模型。
- **产品文档**：`docs/01-PRD.md` … `docs/06-Project-Overview.md` 为事实来源；领域术语以这些文档为准，直至有 `CONTEXT.md`。

## Capabilities and Constraints

**Confirmed (MVP / P0)**

- Mera 完成账户创建与恢复；一次 Passkey 仪式；Signing Session 创建 / 使用 / 过期。
- 支付：转账、余额、基础历史；简单 Swap。
- Stateless 恢复；错误与加载状态。
- 无种子短语 UI（可导出助记词仅为高级可选）、无钱包扩展、无托管后端。

**Should-have / undecided as product scope**

- Gas 赞助、收款码、会话可视化、设置页等为 P1，时间允许再做。
- 智能账户组合、更细 Session policy 为 P2 / 可选加分。

**Out of scope**

- 社交登录作主路径、复杂多签、法币出入金、完整 DID 协议。

**Terminology**

- Flowpay、Mera、Passkey / PRF、Signing Session、Stateless Test、One-prompt、EOA。

**UI language**

- **双语**（中文 + 英文），`@nuxtjs/i18n`。
- 默认 `zh-CN`，用户可切 `en`；记在 UI 偏好里。P0 不按浏览器自动改语言，不调用在线翻译。

## Brand Commitments

- 产品名：**Flowpay**。
- 口号 / 定位句：像流水一样顺畅的链上支付与账户体验；「一次 Face ID / 指纹完成注册…」。
- 无独立 logo、域名或其它必须绑定的品牌资产（用户确认）。

## Evidence on Hand

- 产品与架构文档：`docs/`（PRD、用户流、技术架构、MVP、Demo 脚本、总览）。
- 尚无可运行应用、真实交易截图、用户证言或实测性能数据。**未来设计与文案不得捏造客户、评测分数或未发生的演示结果。**

## Product Principles

1. **账户层即 Mera** — 一切身份与签名路径以 Mera 为唯一真相来源。
2. **一次仪式，之后可无感** — One-prompt 注册；会话内减少重复生物识别。
3. **可现场验证的无状态** — Stateless Test 是产品要求，不是可选 polish。
4. **用户与评委双受众** — 体验像 Web2，同时路径对 bounty 标准可审计。
5. **不假装有证据** — 未发生的证明、客户与数据不得写入界面或营销声称。

## Accessibility & Inclusion

无产品级强制标准或特定用户无障碍需求（用户确认）。仍应满足 WebAuthn / 生物识别设备差异下的清晰失败提示（见 PRD 风险：部分设备不支持 PRF）。
