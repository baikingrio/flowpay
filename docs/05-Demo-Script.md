# Demo Script（评委演示脚本）— Mera-first

**总时长建议**：3–4 分钟

### 开场（30 秒）
“当前链上最大的门槛是账户体验——种子短语、钱包扩展、复杂概念。  
Flowpay 用 Mera 作为整个账户层：用户只需一次 Face ID，就能拥有自托管账户，支付像流水一样顺畅，全程无种子短语、无扩展、无托管后端。”

### 演示流程（2–2.5 分钟）

1. **打开落地页**  
   “主按钮只有一个：用 Face ID / 指纹开始。没有 Google 登录，没有邮箱，没有助记词。”

2. **一次 Passkey 仪式完成注册**  
   “用户点击 → 系统生物识别 → 完成。账户已通过 Mera 派生，直接显示地址和余额。这就是 One-prompt onboarding。”

3. **完成第一笔支付（冲 Time-to-first-transaction）**  
   “输入金额和收款地址，确认。因为已有 Signing Session，可以 prompt-free 签名。  
   Monad 300ms 出块，几乎实时确认。从打开页面到交易上链，目标控制在几十秒内。”

4. **展示 Session 体验**  
   “在会话有效期内，我可以连续再做一笔 Swap，无需重复刷脸。  
   会话过期后，系统会清晰提示并要求重新验证——这就是我们设计的 Session 边界。”

5. **现场做 Stateless Test（关键加分）**  
   “现在我清除 localStorage，或者用无痕/另一台设备打开。  
   再次点击『用 Face ID 继续』→ 同一 Passkey → 账户完整恢复。  
   身份和访问能力完全从 Passkey 重建，不依赖本地敏感存储。”

6. **收尾强调**  
   “Mera 是整个账户层。用户几乎感觉不到区块链的存在，但资产完全自托管。”

### 收尾（20–30 秒）
“Flowpay 同时服务主赛道和 Mera Bounty：  
把无种子短语、高速最终性、合理的 Session 设计，以及严格的 Stateless 恢复结合在一起。  
谢谢。”

### 备用问答要点

- **为什么不用社交登录作为主入口？**  
  为了严格满足 Mera 的 One-prompt 和「Mera is the entire account layer」要求，同时通过 Stateless Test。

- **私钥存在哪里？**  
  通过 WebAuthn PRF 在用户认证器中派生，签名时仅在内存短暂出现，无项目方托管。

- **Session 多久过期？**  
  当前设计为 X 分钟（演示时可说明具体数值），高风险操作可强制重新验证。

- **换设备怎么办？**  
  同一 Passkey（iCloud Keychain / Google Password Manager 等）即可在新设备完整恢复，我们刚演示过。
