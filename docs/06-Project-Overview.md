# Project Overview

## 项目名称
**Flowpay**

## 一句话描述
Flowpay — 像流水一样顺畅的链上支付与账户体验。  
一次 Face ID 完成注册，**Mera 作为整个账户层**，支付在会话内可无感签名，无种子短语、无扩展、无托管后端。

**产品主线（2026-09-23）**：商家↔顾客线下 USDC 收款，Monad 测试网。详见 `docs/08-Real-Product-v0.md`。

## 解决的问题
链上账户体验过于复杂（种子短语、连接钱包、Gas 概念），严重阻碍新用户进入。

## 解决方案
- **Mera 作为完整账户层**（@category-labs/mera）
- 一次 Passkey 仪式完成注册与恢复（One-prompt + Stateless）
- Mera Signing Session 实现合理范围内的 prompt-free 签名
- 利用 Monad 高速最终性，优化 Time-to-first-transaction
- 用「小支付 App + 简单交易界面」证明真实可用

## 目标赛道
- 主：Trust, Identity & AI Infrastructure
- 辅：Consumer Products & Payments
- **重点 Sponsor Bounty**：Mera（Category Labs）

## 核心差异点
1. Mera 是整个账户层，而非附加功能
2. 严格满足 One-prompt、Session 设计、Stateless Test
3. 用户几乎感觉不到区块链，同时保持完全自托管
4. 支付与交易场景让账户能力可被直接感知

## 文档列表
- 01-PRD.md                  → 产品需求文档（Mera-first）
- 02-User-Flows.md           → 用户流程图（含 Session 与 Stateless）
- 03-Technical-Architecture.md → 技术架构（Mera 为核心）
- 04-MVP-Scope-and-Roadmap.md → MVP 范围与 6 周计划
- 05-Demo-Script.md          → 评委演示脚本（含现场 Stateless Test）
- 06-Project-Overview.md     → 本文件

## 状态

**生产级 Nuxt 4 应用，已完成核心功能与黑客松演示路径。**

### 已完成
- ✅ Mera 账户层集成（One-prompt + Signing Session + Stateless 恢复）
- ✅ 商家 USDC 收银台（`/checkout`）+ 顾客扫码支付（`/pay`）双设备路径
- ✅ 到账匹配与每日流水汇总
- ✅ MON/USDC 支付与当面收银台（测试网；Swap 已暂停）
- ✅ 响应式设计 + 会话状态可视化
- ✅ 完整演示脚本（`docs/05-Demo-Script.md`）

### 已知限制
- ⚠️ 无 Gas 赞助（需外部水龙头获取 MON）
- ⚠️ 测试网依赖（Monad Testnet）
- ⚠️ 本地演示为主（部署待 Nuxt on Vercel / Netlify）

详见 [黑客松提交包](./07-Hackathon-Submission.md)。
