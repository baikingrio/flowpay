# Design: Checkout daily ledger (今日流水)

**Date:** 2026-09-11  
**Status:** approved for planning  
**Product framing:** SMB offline USDC checkout — same-day reconciliation on this device

## Goal

On `/checkout`, show today’s cashier receipts for the signed-in merchant: **count**, **USDC total**, and a **per-tx list**, so a stall can reconcile the day without a backend.

## Scope

- Today = **local calendar day** in the runtime timezone
- Only **this machine’s successful checkout arrivals** (matched on `/checkout`)
- Persist in **localStorage** keyed by merchant address; clear on 清除本机数据 / `signOut`

## Non-goals

- Full on-chain indexer of all inbound USDC
- Cross-day date picker / history browser
- Export/share, edit/delete rows, multi-staff
- Sound / arrival animation polish (separate track)

## Decisions

| Topic | Choice |
|-------|--------|
| Approach | Append on checkout match success (path A) |
| Storage key | `flowpay.checkoutLedger.{address.toLowerCase()}` |
| Entry | `{ hash, amountBase, receivedAt, to? }` |
| Dedup | Same `hash` not recorded twice |
| Cap | Keep newest ~500 entries per address |
| UI | Idle (and optionally under success): 今日卡片 on `/checkout` |
| Clear | `signOut` clears ledger for current address (or all checkout ledger keys) |

## Write path

1. Checkout poll matches inbound USDC transfer  
2. Enter success UI  
3. `recordCheckoutReceipt({ hash, amountBase, receivedAt: Date.now(), to: merchant })`  
4. Refresh today’s summary on the page  

## Read path

- `readCheckoutLedger(address)` → entries  
- `summarizeToday(entries, now)` → `{ count, totalBase, items }` via `isSameLocalDay`  
- Format amounts with existing `formatUsdcFromBase`

## Copy (honest)

Footnote: only receipts confirmed by this device’s cashier; not a full chain ledger; clearing local data removes it.

## Acceptance

1. Dual-device pay success → today’s count +1, total increases, row appears  
2. Same hash does not duplicate  
3. Clear local data → today empty  
4. Unit tests: same-day filter, total, dedup, storage with injected `Storage`  
5. `pnpm test` / `pnpm typecheck` green  

## Related

- Checkout spec: `docs/superpowers/specs/2026-09-11-offline-stablecoin-checkout-design.md`  
- MVP P1 item: 每日流水汇总  
