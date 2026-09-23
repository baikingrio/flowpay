# Product Requirements Document (PRD)
## Flowpay

**Project Name**: Flowpay  
**Version**: 0.3（Mera-first 完整版）  
**Date**: 2026-09-03  
**Target**: Monad Metropolis Hackathon (1 Sep – 13 Oct 2026)  
**Primary Track**: Trust, Identity & AI Infrastructure / Consumer Products & Payments  
**Sponsor Bounty 重点**: **Mera（Category Labs）**

---

### 1. 一句话定位

Flowpay — 像流水一样顺畅的链上支付与账户体验。  
**一次 Face ID / 指纹完成注册，支付与交易在会话内可无感签名，全程无种子短语、无钱包扩展、无托管后端。**  
Mera 作为整个账户层。

**产品主线（2026-09-23）**：商家↔顾客 Monad 测试网 USDC 线下收款。详见 `docs/08-Real-Product-v0.md`。

---

### 2. 问题陈述

当前链上账户体验严重阻碍大众采用：
- 用户必须备份 12/24 个单词，丢失即永久失去资产
- “连接钱包”弹窗、助记词、Gas 等概念对新用户极不友好
- 跨设备使用困难，安全与便利难以兼顾

Monad 的高速最终性 + Mera（Passkey → 标准 EOA）可实现真正「用户几乎感觉不到区块链」的体验，同时满足严格的无状态恢复要求。

---

### 3. 目标用户

- 加密新手 / Web2 用户
- 需要流畅支付与交易体验的用户
- Mera Bounty 评委（需通过 Time-to-first-tx、Session 设计、Stateless Test 等）

---

### 4. 核心价值主张

| 对用户 | 对 Mera Bounty | 对生态 |
|--------|----------------|--------|
| 一次生物识别即拥有账户，支付如 Web2 般流畅 | Mera 作为完整账户层，通过所有评测标准 | 示范如何在 Monad 上做出真正无感的账户体验 |

---

### 5. 成功指标（黑客松 + Mera Bounty）

- **Time-to-first-transaction**：从落地页到第一笔 Monad 交易确认尽可能短（目标 < 20–30 秒）
- **One-prompt onboarding**：仅一次 Passkey 仪式，无种子短语、无扩展、无邮箱/OTP
- **Prompt-free signing**：通过 Mera Signing Session 实现合理范围内的免提示签名
- **Stateless Test 通过**：清空 localStorage 或换设备后，仅靠 Passkey 即可完整重建身份与访问
- 支付 App + 简单交易界面可完整演示真实资金流动
- 评委能明显感知「用户几乎感觉不到区块链」

---

### 6. 功能需求

#### 6.1 Must-have（MVP + Mera 强制要求）

**账户层（Mera 作为整个账户层）**
- 使用 `@category-labs/mera` 完成账户创建与恢复
- 一次 Passkey 仪式（`createPasskeyWithPrfOutput`）完成注册
- 从 PRF 输出派生标准 BIP-44 EOA
- 使用 Mera Signing Session 进行签名，支持 prompt-free 操作
- 会话有明确作用域与过期策略
- **必须通过 Stateless Test**
- 无种子短语、无钱包扩展、无托管后端

**应用层演示**
- 小支付 App：转账、收款码、简单历史
- ~~简单交易界面：基础 Swap~~ — **已暂停**：Swap 功能保留但从产品主流程隐藏
- 新用户首笔可考虑 Gas 赞助（加分）— **未实现**：展示水龙头

**体验要求**
- 登录页以「用 Face ID / 指纹开始」为绝对主按钮
- 会话有效期内支付/交易可免重复生物识别
- 交易确认感知接近 Web2（利用 Monad 速度）

#### 6.2 Should-have（加分 / Stack composability）

- Gas Sponsorship
- 会话状态可视化（剩余时间、权限）
- 主动结束会话 / 锁定
- 高级设置中可选导出助记词（兼容 MetaMask）
- 简单恢复说明

#### 6.3 Nice-to-have

- 智能账户模式（Mera EOA 作为 signer）
- 更复杂的 session policy（金额上限、白名单等）
- 移动端深度优化

---

### 7. 非功能需求

- 安全性：prfOutput / 私钥仅在内存短暂存在
- 性能：注册到可用 < 5–8 秒；会话内支付确认感知极快
- 兼容性：支持 WebAuthn PRF 的主流浏览器与设备
- 可验证性：评委可现场执行 Stateless Test

---

### 8. 范围外

- 强制社交登录作为主路径（与 Mera one-prompt 要求冲突）
- 复杂多签或企业权限
- 法币出入金
- 完整去中心化身份协议

---

### 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 部分设备不支持 PRF | 清晰提示 + 兼容性说明，演示设备提前确认 |
| Session 设计过宽或过严 | 提供可配置时长，演示时采用平衡值 |
| 开发时间 | 严格以 Mera 官方示例为起点，优先跑通主路径 |
| 评委对「无感」的主观判断 | 把 Time-to-first-tx 和 Stateless Test 做成可量化演示 |

---

### 10. 未来愿景

Flowpay 展示了以 Mera 为完整账户层的消费级体验。未来可在此基础上扩展可升级认证、社会恢复、AI Agent 支付身份等，同时保持「用户几乎感觉不到区块链」的核心原则。
