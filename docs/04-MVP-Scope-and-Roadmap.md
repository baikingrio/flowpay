# MVP Scope & 6-Week Roadmap（Mera-first）

## MVP 定义（必须在 10 月 13 日前可演示）

一条完整可运行的路径，且满足 Mera Bounty 核心要求：

1. 用户仅通过一次 Passkey 仪式完成注册（One-prompt）
2. 使用 Mera 作为整个账户层（无种子短语、无扩展、无托管后端）
3. 完成一笔真实转账（支付 App）
4. 完成一笔简单 Swap
5. 支持 Mera Signing Session（会话内可 prompt-free）
6. **通过 Stateless Test**（清存储或换设备后仅靠 Passkey 恢复）
7. 尽可能优化 Time-to-first-transaction

---

## 功能优先级

### P0（必须完成 — 含 Mera 强制项）
- [ ] 集成 `@category-labs/mera`，完成 createPasskeyWithPrfOutput → EOA 派生
- [ ] 一次 Passkey 仪式的注册 / 登录流程
- [ ] Mera Signing Session 的创建、使用、过期处理
- [ ] 支付页：转账 + Session 感知的签名
- [ ] 简单 Swap 页 + 同样的 Session 逻辑
- [ ] Stateless 恢复路径（清存储后仍可恢复）
- [ ] 基础交易历史与余额展示
- [ ] 错误处理与加载状态

### P1（强烈建议 / 加分）
- [ ] Gas 赞助（新用户首笔）
- [ ] 收款二维码
- [ ] 会话状态可视化（剩余时间）
- [ ] 响应式设计（手机可演示）
- [ ] 设置页（结束会话、高级导出等）

### P2（时间允许）
- [ ] 更精细的 Session policy（金额上限等）
- [ ] 智能账户组合
- [ ] 更丰富的资产看板

---

## 6 周开发计划（建议）

**Week 1（9/1–9/7）**
- 搭建 Nuxt 4 项目 + Tailwind + shadcn-vue
- 接入 `@category-labs/mera`，跑通 Passkey 创建 → 派生地址 → 用 viem 发一笔测试网交易
- 确认目标演示设备的 PRF / Passkey 兼容性

**Week 2（9/8–9/14）**
- 实现完整 One-prompt 注册 / 登录流程
- 实现 Signing Session 的创建与基础 prompt-free 签名
- 支付页 UI + 转账主路径

**Week 3（9/15–9/21）**
- 完善 Session 过期与重新验证体验
- 实现 Stateless 恢复路径并反复测试
- 完成支付历史与余额更新
- 开始 Swap 界面

**Week 4（9/22–9/28）**
- 打通 Swap 全流程
- 优化 Time-to-first-transaction（减少步骤与等待）
- 移动端适配与整体体验打磨

**Week 5（9/29–10/5）**
- 专门针对 Stateless Test 和 Session 设计做多轮演练
- Gas 赞助（如做）
- 准备演示脚本与备用设备

**Week 6（10/6–10/13）**
- 最终测试、录制 Demo、撰写提交材料
- 提交

---

## 成功标准（可演示 + 可被评委验证）

- 评委可亲自完成：注册 → 支付 → Swap
- 现场可执行 Stateless Test 并成功恢复
- Session 的 prompt-free 与过期边界清晰可感知
- 从落地页到第一笔确认交易的时间尽可能短
- 全程无种子短语、无钱包扩展提示
