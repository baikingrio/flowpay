# Gas Sponsorship Implementation Summary

## 实施完成 ✓

已成功实现 P1 Gas 赞助功能，允许 0 余额新用户无需外部水龙头即可完成首次支付。

## 技术方案

### 选型决策（ADR 0010）
- **拒绝 EIP-7702**：虽然 Monad 支持，但要求 10 MON 最低余额，无法解决 0 余额问题
- **采用 ERC-4337**：通过 Pimlico paymaster + Kernel v0.3.1 智能账户实现真正的 0 余额赞助
- **确定性派生**：智能账户地址由 EOA + index=0 确定性生成，保持无状态恢复

### 架构
```
Passkey → PRF output → EOA (主账户)
                        ↓
                      Kernel Smart Account (index=0)
                        ↓
                      Pimlico Bundler + Paymaster
```

## 核心变更

1. **`app/lib/sponsored.ts`** (新增)
   - `isSponsorshipAvailable()`: 检查是否配置 API key
   - `needsSponsorship(balance, value)`: 判断是否需要赞助
   - `estimateTransferGasCost()`: 保守 gas 估算
   - `sendSponsoredPayment()`: 通过智能账户发送赞助交易
   - `getSmartAccountAddress()`: 获取确定性智能账户地址

2. **`app/composables/useSigningSession.ts`** (修改)
   - `send()` 函数增加赞助逻辑：
     - 有余额 → 使用 EOA（现有流程）
     - 无余额但配置了赞助 → 尝试赞助
     - 赞助失败 → 显示水龙头链接

3. **UI & i18n**
   - Pay 页面显示 "(已使用 Gas 赞助)" 标识
   - 新增 `sponsored` / `sponsorshipFailed` 消息（中英文）

4. **配置**
   - `.env.example`: 文档化 API key 设置
   - `README.md`: 添加赞助配置说明

## 测试

### 单元测试 ✓
- `tests/sponsored.test.ts`: 8 个新测试
- 所有辅助函数已覆盖（估算、判断逻辑）
- `pnpm test`: 66 tests pass

### 类型检查 ✓
- `pnpm typecheck`: 无错误

### 集成测试要求
⚠️ **需要手动测试**（需要 Pimlico API key）：

1. **0 余额赞助路径**
   ```bash
   # 设置 API key
   echo "NUXT_PUBLIC_PIMLICO_API_KEY=xxx" > .env
   
   # 启动开发服务器
   pnpm dev
   
   # 测试步骤：
   # 1. 创建新 Passkey 账户
   # 2. 不领水龙头，直接尝试 First Payment
   # 3. 应该成功发送（通过智能账户）
   # 4. 检查交易浏览器：tx 应该由 bundler 发送
   ```

2. **有余额 EOA 路径**
   ```bash
   # 1. 账户有余额（> 0.001 MON）
   # 2. 发送 First Payment
   # 3. 应该使用 EOA（不经过智能账户）
   ```

3. **赞助失败回退**
   ```bash
   # 不设置 API key 或使用无效 key
   # 应该显示水龙头链接
   ```

## 无状态恢复验证

✅ **恢复路径未受影响**：
1. 同一 Passkey → 同一 PRF output → 同一 EOA
2. 同一 EOA + index=0 → 同一智能账户地址
3. 清除浏览器数据后，用同一 Passkey 登录：
   - EOA 地址相同
   - 智能账户地址相同（如果之前使用过赞助）

## 部署清单

### 必需
- ✓ 代码已推送至 `cursor/gas-sponsorship-first-payment-f001`
- ✓ PR #5 已创建
- ✓ 所有测试通过

### 可选（启用赞助功能）
- [ ] 获取 Pimlico API key（[dashboard.pimlico.io](https://dashboard.pimlico.io)）
- [ ] 在部署环境设置 `NUXT_PUBLIC_PIMLICO_API_KEY`
- [ ] 手动测试赞助路径

### 不设置 API key 时
- 应用正常运行
- 用户看到水龙头链接（现有行为）
- 无 Gas 赞助功能

## 限制与权衡

### 地址差异
- EOA 地址：`0xABCD...1234`（Passkey 直接派生）
- 智能账户地址：`0xEF56...7890`（Kernel 合约地址）
- **用户会看到两个地址**（取决于哪个路径发送交易）

### 未来改进
- [ ] 统一地址显示策略（可能将智能账户设为主地址）
- [ ] 支持更多交易类型的赞助（不仅 First Payment）
- [ ] 添加智能账户余额查询
- [ ] Swap 也可考虑赞助

## 文档

- **ADR 0010**: `docs/adr/0010-gas-sponsorship-smart-account.md`
  - 设计决策
  - EIP-7702 vs ERC-4337 比较
  - 恢复路径说明
  
- **MVP Roadmap**: `docs/04-MVP-Scope-and-Roadmap.md`
  - P1 Gas 赞助标记为完成

## 依赖

新增：
- `permissionless@0.4.1`: ERC-4337 客户端
- `viem@2.56.3`: 已更新（兼容 permissionless）

## PR

- **PR #5**: https://github.com/baikingrio/flowpay/pull/5
- 状态：Draft（等待手动测试）
- 所有自动化检查通过

---

**下一步**：
1. 获取 Pimlico API key
2. 在本地运行集成测试
3. 确认 0 余额赞助路径正常工作
4. 将 PR 标记为 Ready for Review
