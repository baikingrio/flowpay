# Technical Architecture（Mera-first）

## 1. 总体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Nuxt 4)                     │
│  登录页 │ 首页 │ 支付页 │ 交易页 │ 设置页                  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Account Layer = Mera（核心）                 │
│  @category-labs/mera                                     │
│  - createPasskeyWithPrfOutput（一次 Passkey 仪式）        │
│  - PRF 输出 → BIP-44 EOA 派生                            │
│  - Mera Signing Sessions（prompt-free 签名）             │
│  - 无种子短语 / 无扩展 / 无托管后端                        │
│  - 可选：Gas Sponsorship、智能账户组合（加分）            │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Monad Network                         │
│  - 普通 EOA 交易（Mera 派生账户）                         │
│  - 300ms 出块 / 600ms Finality                           │
│  - 完整 EVM 兼容 + P256 预编译可用（扩展时）              │
└─────────────────────────────────────────────────────────┘
```

**核心原则**：Mera 是整个账户层。用户只通过一次 Passkey 仪式获得账户，之后身份与签名能力均可仅从 Passkey 重建。

---

## 2. 账户模型（最终选定）

### Mera 作为唯一账户层

- 使用 `@category-labs/mera` 的 WebAuthn PRF 扩展
- `createPasskeyWithPrfOutput` → 得到 32 字节 `prfOutput`
- 用该输出派生标准 BIP-44 secp256k1 EOA（可导出助记词兼容 MetaMask，但用户默认不接触）
- 账户是普通 EOA，无需部署合约、无需 bundler、无需 MPC 服务
- 签名通过 Mera 的 Signing Session 机制完成，支持在会话有效期内 prompt-free

### 为什么符合 Mera Bounty

| 要求 | 实现方式 |
|------|----------|
| Mera is the entire account layer | 账户创建、恢复、签名全部走 Mera |
| No seed phrase | 用户界面永不展示助记词（可后台支持导出作为高级功能） |
| No wallet extension | 纯网页 + Passkey |
| No custody backend | 无服务器持有用户密钥 |
| One-prompt onboarding | 仅一次 Passkey 仪式 |
| Prompt-free signing | Mera Signing Sessions |
| Stateless test | 身份与密钥材料可仅从 Passkey + 非敏感存储重建 |

### 可选加分组合（Stack composability）

- Gas Sponsorship（Paymaster）
- 智能账户模式（把 Mera EOA 作为 signer）
- 简单恢复流程说明
- 跨设备通过同一 Passkey 恢复

---

## 3. 关键技术组件

| 层级 | 技术 | 备注 |
|------|------|------|
| 前端框架 | **Nuxt 4** + TypeScript | |
| UI | Tailwind CSS + shadcn-vue | |
| 账户层 | **@category-labs/mera** | 核心，必须 |
| 链交互 | viem | 直接使用派生出的账户 |
| 状态管理 | Pinia | 管理 session 状态、地址、余额等 |
| Gas 赞助 | 可选（Pimlico / Biconomy / 自建） | 加分项 |
| 本地非敏感存储 | localStorage / indexedDB | 仅存 credentialId、rpId 等可公开信息，用于加速下次选择同一 Passkey |

---

## 4. Signing Session 设计

### 目标
在安全与流畅之间取得平衡：低风险操作可在一段时间内免重复生物识别，高风险操作始终需要确认。

### 建议策略

| 操作类型 | 是否需要重新生物识别 | 说明 |
|----------|----------------------|------|
| 查看余额、历史、收款码 | 否 | 只读 |
| 支付 / 转账 / Swap（会话有效期内） | 否（prompt-free） | 依赖 Mera Signing Session |
| 支付 / 转账 / Swap（会话已过期） | 是 | 重新创建 session |
| 导出密钥、修改高权限设置 | 是 | 始终确认 |
| 会话时长建议 | 5–15 分钟 或 单次浏览器会话 | 可配置，演示时可调短/调长 |

### 实现要点
- 创建 Signing Session 时明确 scope（允许的操作、金额上限、过期时间）
- 过期后 UI 清晰提示「会话已过期，请重新验证」
- 绝不在可被清除的存储中留下可单独使用的私钥

---

## 5. Stateless Test 如何通过

**评委操作**：清除 localStorage / 换设备 / 无痕模式打开，要求仍能恢复同一账户并继续操作。

**我们的应对**：
1. 用户再次点击「用 Face ID / 指纹继续」
2. 浏览器/系统弹出已有 Passkey（通过 credentialId 或用户选择）
3. Mera 通过 PRF 再次得到相同的 32 字节
4. 派生出相同的 EOA 地址
5. 用户恢复完整访问权限

**本地只允许存储**：
- credentialId（用于优先选择同一个 Passkey）
- 非敏感 UI 偏好
- 绝不存储 prfOutput 或私钥本身作为唯一恢复手段

只要 Passkey 还在用户的认证器里（iCloud Keychain、Google Password Manager、设备等），账户即可重建。

---

## 6. 安全要点

- 私钥材料仅在内存中短暂存在，签名后尽快清零
- 用户默认不接触种子短语
- 所有资金操作的签名路径都经过 Mera
- 清晰告知：账户由用户设备上的 Passkey 控制，无项目方托管

---

## 7. Monad 优势结合点

- 快速最终性让「第一笔交易确认」时间极短，直接服务 Time-to-first-transaction 指标
- 普通 EOA 即可，无需额外合约部署成本
- 后续如需升级到智能账户或 P256 原生验证，可平滑扩展
