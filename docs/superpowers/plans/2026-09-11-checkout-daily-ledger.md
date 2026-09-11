# Checkout Daily Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show today’s cashier USDC receipts on `/checkout` (count, total, list) from localStorage, written only on successful arrival match.

**Architecture:** Pure `checkout-ledger` helpers (storage + same-local-day summarize + hash dedup); record from `checkout.vue` on match success; clear in `signOut`; bilingual footnote. No RPC for the ledger itself.

**Tech Stack:** Nuxt 4, Vue 3, vitest, existing `usdc-amount` / i18n / DESIGN.md patterns.

**Spec:** `docs/superpowers/specs/2026-09-11-checkout-daily-ledger-design.md`

## Global Constraints

- Browser-only; no backend indexer (ADR-0002)
- Only this-machine checkout successes; honest copy
- localStorage key `flowpay.checkoutLedger.{address.toLowerCase()}`; cleared on clear-local / `signOut`
- Today = local calendar day; USDC 6 decimals via `formatUsdcFromBase`
- Session keys never in storage (ADR-0007)
- Bilingual `i18n/i18n.config.ts` (zh-CN + en)

## File map

| File | Responsibility |
|------|----------------|
| `app/lib/checkout-ledger.ts` | types, read/write/clear, summarizeToday, isSameLocalDay, record with dedup+cap |
| `tests/checkout-ledger.test.ts` | storage + summarize + dedup |
| `app/pages/checkout.vue` | record on success; Today card UI |
| `app/composables/useSigningSession.ts` | clear ledger in `signOut` |
| `i18n/i18n.config.ts` | copy keys |
| `docs/04-MVP-Scope-and-Roadmap.md` | check 每日流水 when done |

---

### Task 1: `checkout-ledger` pure module + tests

**Files:**
- Create: `app/lib/checkout-ledger.ts`
- Create: `tests/checkout-ledger.test.ts`

**Interfaces:**
- `CheckoutReceipt = { hash: \`0x${string}\`; amountBase: bigint; receivedAt: number; to?: \`0x${string}\` }`
- `isSameLocalDay(aMs: number, bMs?: number): boolean`
- `readCheckoutLedger(address, storage?: Storage): CheckoutReceipt[]`
- `clearCheckoutLedger(address, storage?: Storage): void`
- `recordCheckoutReceipt(address, receipt, storage?: Storage, cap?: number): CheckoutReceipt[]` — prepend, dedup by hash, default cap 500
- `summarizeToday(entries, nowMs?: number): { count: number; totalBase: bigint; items: CheckoutReceipt[] }`

Serialize `amountBase` as decimal string in JSON.

- [ ] **Step 1: Write failing tests** covering same-day boundary, total, dedup, clear, cap trim

- [ ] **Step 2: `pnpm test -- tests/checkout-ledger.test.ts`** — expect fail

- [ ] **Step 3: Implement module**

- [ ] **Step 4: tests pass**

- [ ] **Step 5: Commit** `feat: checkout daily ledger storage helpers`

---

### Task 2: Wire record + clear

**Files:**
- Modify: `app/pages/checkout.vue` — on match success, call `recordCheckoutReceipt` before/when setting success
- Modify: `app/composables/useSigningSession.ts` — in `signOut`, if address known, `clearCheckoutLedger(address)`

- [ ] **Step 1: Record on success** (use matched hash + intent.amountBase + Date.now())

- [ ] **Step 2: Clear on signOut**

- [ ] **Step 3: `pnpm typecheck`**

- [ ] **Step 4: Commit** `feat: record and clear checkout daily ledger`

---

### Task 3: Today card UI + i18n + docs

**Files:**
- Modify: `app/pages/checkout.vue` — idle section (and refresh after success / startOver) shows Today card
- Modify: `i18n/i18n.config.ts`
- Modify: `docs/04-MVP-Scope-and-Roadmap.md` — mark 每日流水汇总 done with honest note

**UI:**
- Title 今日流水
- Summary `{count} 笔 · 合计 {total} USDC`
- List: local time · amount · explorer link if hash
- Empty + footnote keys

- [ ] **Step 1: UI + reactive summary** from `readCheckoutLedger(account.address)`

- [ ] **Step 2: i18n zh-CN + en**

- [ ] **Step 3: MVP checklist**

- [ ] **Step 4: `pnpm test && pnpm typecheck`**

- [ ] **Step 5: Commit + open PR**

---

## Spec coverage

| Spec | Task |
|------|------|
| Storage / dedup / cap / today summarize | 1 |
| Write on match; clear on signOut | 2 |
| /checkout Today card + copy + MVP | 3 |

## Placeholder scan

No TBD steps.
