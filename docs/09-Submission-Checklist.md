# 黑客松提交 & 真机演示 Checklist

**截止日期**：约 2026-10-13（以平台通知为准）  
**演示 URL**：https://flowpay-tau-sand.vercel.app  
**仓库**：https://github.com/baikingrio/flowpay

---

## A. 平台提交字段（对着填）

- [ ] 项目名称：Flowpay
- [ ] 一句话：一次 Passkey 开户 + 双设备 USDC 当面收款（Mera 账户层，无种子短语）
- [ ] 主赛道：Trust, Identity & AI Infrastructure
- [ ] 副赛道：Consumer Products & Payments
- [ ] Sponsor Bounty：Mera（Category Labs）
- [ ] Demo URL：https://flowpay-tau-sand.vercel.app
- [ ] GitHub：https://github.com/baikingrio/flowpay（按平台要求开放评委访问）
- [ ] 文档：`docs/07-Hackathon-Submission.md`、`docs/05-Demo-Script.md`、`docs/08-Real-Product-v0.md`
- [ ] Demo 视频（2–4 分钟）已上传

---

## B. 真机演示前准备

- [ ] 两台支持 **WebAuthn PRF** 的真机（推荐：iOS Safari + Face ID，或 macOS Safari / Chrome + 生物识别）
- [ ] 不要用模拟器 / 不支持 PRF 的浏览器当评委路径
- [ ] 顾客端：测试网 **MON（Gas）** 已领
- [ ] 顾客端：测试网 **USDC** 已备好
- [ ] 生产站可打开，无登录墙：https://flowpay-tau-sand.vercel.app
- [ ] 底部导航确认：**无 Swap**；主路径是首页 / 支付 / 收银台

---

## C. 现场/录屏必过路径

1. [ ] 落地页：主 CTA 只有 Passkey；「怎么用」讲当面收款，不讲兑换
2. [ ] 顾客：一次 Face ID / 指纹开户成功，看到地址
3. [ ] 商家：打开 `/checkout`，输入金额（如 1–5 USDC）→ 出 QR
4. [ ] 顾客：扫码或打开付款链接 → Passkey 确认 → 发出 USDC
5. [ ] 商家：到账成功动效/提示音 + 今日流水出现该笔
6. [ ] 商家：点「导出 CSV」，文件含时间、金额、状态、tx hash
7. [ ] Session：有效期内再付/再收一笔，少打断；过期后提示清晰
8. [ ] Stateless：设置 → 清除本机数据 → 同一 Passkey 找回同一地址

---

## D. 录视频建议（对齐 `docs/05-Demo-Script.md`）

- [ ] 总长 2–4 分钟
- [ ] 顺序：落地页 → Passkey 开户 → 双设备收款 → Session 或 Stateless → 收尾强调 Mera 是完整账户层
- [ ] 画外音不提种子短语/钱包扩展/托管后端
- [ ] **不要**把 Swap 当英雄演示
- [ ] Gas：诚实说测试网水龙头，**不要**声称已有 Gas 赞助

---

## E. 明确不要演示 / 不要写进提交文案

- Swap / 兑换作为核心卖点
- 声称主网可用或 Gas 赞助已上线
- Mock GitHub 登录路径（已非主流程）

---

## F. 提交后自检

- [ ] 陌生人按文档能在约 2 分钟内理解怎么收款
- [ ] 顾客扫码到成功通常可在约 30 秒内完成（含确认）
- [ ] CSV 与链上该笔可对上
