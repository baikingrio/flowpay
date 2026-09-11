# Offline Stablecoin Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship merchant USDC checkout QR + customer Passkey USDC pay-through on Monad testnet, with client-side arrival matching and no backend.

**Architecture:** Extend `eip681` to encode/parse ERC-20 `/transfer` URIs; add pure `checkout-match` + `pending-checkout` helpers; add `sendUsdcTransfer` beside existing native `sendPayment`; new `/checkout` page polls for inbound USDC; `/pay` prefills and sends USDC without auto-broadcast. Keys stay in `useSigningSession` (ADR 0006/0007). Browser-only (ADR 0002).

**Tech Stack:** Nuxt 4, Vue 3, Pinia, viem, `@category-labs/mera`, existing `qrcode` / vitest / `@nuxtjs/i18n`.

**Spec:** `docs/superpowers/specs/2026-09-11-offline-stablecoin-checkout-design.md`

## Global Constraints

- Browser-only; no Nitro product routes / payment backend (ADR-0002)
- Outbound URIs always use chainId `10143` (Monad testnet)
- Pricing asset: USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3` (6 decimals) — same as Swap
- Gas: native MON; never claim sponsorship works (ADR 0010)
- Never auto-broadcast; user must confirm Send
- Session private key never in Pinia or storage (ADR-0007)
- UI bilingual keys in `i18n/i18n.config.ts`; default `zh-CN`
- Visual system: existing `DESIGN.md` (canvas `#f5f5f5`, paper cards, pills)
- Stateless recovery unchanged; `清除本机数据` must clear any new localStorage acceleration keys
- Prefer EIP-681 ERC-20 `/transfer`; only if unblockable browser/QR issues arise, document a `pay?uri=` fallback — do not invent a parallel standard silently

## File map

| File | Responsibility |
|------|----------------|
| `app/lib/eip681.ts` | Extend build/parse for ERC-20 `transfer` (token, recipient, amount) |
| `app/lib/tokens.ts` | Shared USDC address + decimals constants |
| `app/lib/checkout-match.ts` | Pure arrival matching for pending USDC amount |
| `app/lib/pending-checkout.ts` | `sessionStorage` pending checkout intent |
| `app/lib/usdc.ts` | `readUsdcBalance`, `sendUsdcTransfer` |
| `app/lib/usdc-amount.ts` | parse/format human USDC amounts |
| `app/composables/useSigningSession.ts` | `sendUsdc(to, amountBase)` |
| `app/pages/pay.vue` | Prefill + send USDC path; gas/USDC shortage copy |
| `app/pages/checkout.vue` | Merchant keypad → QR pending → success |
| `app/pages/home.vue` | Entry to 收银台 |
| `i18n/i18n.config.ts` | Checkout / USDC pay copy |
| `tests/eip681.test.ts` | ERC-20 vectors (extend) |
| `tests/checkout-match.test.ts` | Matching pure tests |
| `tests/pending-checkout.test.ts` | Storage helper tests |
| `tests/usdc-amount.test.ts` | parse/format USDC helpers |

---

### Task 1: Shared USDC token constants + amount helpers

**Files:**
- Create: `app/lib/tokens.ts`
- Create: `app/lib/usdc-amount.ts`
- Create: `tests/usdc-amount.test.ts`

**Interfaces:**
- Produces:
  - `USDC_ADDRESS: \`0x${string}\`` = `0x534b2f3A21130d7a60830c2Df862319e593943A3`
  - `USDC_DECIMALS = 6`
  - `parseUsdcToBase(input: string): bigint`
  - `formatUsdcFromBase(amount: bigint): string`

- [ ] **Step 1: Write failing tests**

`tests/usdc-amount.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatUsdcFromBase, parseUsdcToBase } from '../app/lib/usdc-amount'

describe('parseUsdcToBase', () => {
  it('parses whole and fractional', () => {
    expect(parseUsdcToBase('12.5')).toBe(12_500_000n)
    expect(parseUsdcToBase('0.000001')).toBe(1n)
  })

  it('rejects too many decimals', () => {
    expect(() => parseUsdcToBase('1.1234567')).toThrow()
  })

  it('rejects empty/negative', () => {
    expect(() => parseUsdcToBase('')).toThrow()
    expect(() => parseUsdcToBase('-1')).toThrow()
  })
})

describe('formatUsdcFromBase', () => {
  it('formats', () => {
    expect(formatUsdcFromBase(12_500_000n)).toBe('12.5')
    expect(formatUsdcFromBase(1n)).toBe('0.000001')
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
pnpm test -- tests/usdc-amount.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`app/lib/tokens.ts`:

```ts
export const USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3' as const
export const USDC_DECIMALS = 6
```

`app/lib/usdc-amount.ts`:

```ts
import { USDC_DECIMALS } from './tokens'

export function parseUsdcToBase(input: string): bigint {
  const raw = input.trim()
  if (!raw || raw.startsWith('-'))
    throw new Error('invalid_usdc_amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > USDC_DECIMALS)
    throw new Error('invalid_usdc_amount')
  if (!/^\d+$/.test(whole) || (frac.length > 0 && !/^\d+$/.test(frac)))
    throw new Error('invalid_usdc_amount')
  const padded = frac.padEnd(USDC_DECIMALS, '0')
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(padded || '0')
}

export function formatUsdcFromBase(amount: bigint): string {
  if (amount < 0n)
    throw new Error('invalid_usdc_amount')
  const base = 10n ** BigInt(USDC_DECIMALS)
  const whole = amount / base
  const frac = (amount % base).toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '')
  return frac.length === 0 ? whole.toString() : `${whole}.${frac}`
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test -- tests/usdc-amount.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/tokens.ts app/lib/usdc-amount.ts tests/usdc-amount.test.ts
git commit -m "feat: USDC amount helpers and token constants for checkout"
```

---

### Task 2: Extend EIP-681 for ERC-20 `/transfer`

**Files:**
- Modify: `app/lib/eip681.ts`
- Modify: `tests/eip681.test.ts`

**Interfaces:**
- Produces:
  - Success may include `tokenAddress?: \`0x${string}\`` and `tokenAmount?: bigint`
  - `buildErc20TransferUri(opts: { token: \`0x${string}\`; to: \`0x${string}\`; amount: bigint; chainId?: number }): string`
  - `parsePaymentUri` accepts `/transfer` with `address` + `uint256`; rejects other function names
  - Native `buildPaymentUri` / native parse unchanged

Canonical URI:

```text
ethereum:<token>@10143/transfer?address=<recipient>&uint256=<amountBase>
```

- [ ] **Step 1: Add failing tests to `tests/eip681.test.ts`**

```ts
import { USDC_ADDRESS } from '../app/lib/tokens'
import { buildErc20TransferUri, parsePaymentUri } from '../app/lib/eip681'

const RECV = '0x000000000000000000000000000000000000dEaD' as const

describe('ERC-20 transfer URI', () => {
  it('builds transfer uri', () => {
    const uri = buildErc20TransferUri({
      token: USDC_ADDRESS,
      to: RECV,
      amount: 12_500_000n,
      chainId: 10143,
    })
    expect(uri.startsWith(`ethereum:${USDC_ADDRESS}@10143/transfer?`)).toBe(true)
    expect(uri).toContain('uint256=12500000')
  })

  it('parses transfer uri', () => {
    const uri = buildErc20TransferUri({
      token: USDC_ADDRESS,
      to: RECV,
      amount: 12_500_000n,
      chainId: 10143,
    })
    const r = parsePaymentUri(uri, 10143)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.tokenAddress?.toLowerCase()).toBe(USDC_ADDRESS.toLowerCase())
      expect(r.address?.toLowerCase()).toBe(RECV.toLowerCase())
      expect(r.tokenAmount).toBe(12_500_000n)
      expect(r.valueWei).toBeUndefined()
    }
  })

  it('still rejects unknown functions', () => {
    const r = parsePaymentUri(`ethereum:${USDC_ADDRESS}@10143/approve?address=${RECV}&uint256=1`, 10143)
    expect(r).toEqual({ ok: false, error: 'unsupported_function' })
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test -- tests/eip681.test.ts
```

- [ ] **Step 3: Implement minimal extension in `app/lib/eip681.ts`**

Update `ParsePaymentUriSuccess` with `tokenAddress?` and `tokenAmount?`.

Add `buildErc20TransferUri`. In `parsePaymentUri`, replace hard reject of any `/` with: only `transfer` allowed; set `tokenAddress` from path token, `address` + `tokenAmount` from query.

- [ ] **Step 4: Run tests — expect pass** (including old native cases)

```bash
pnpm test -- tests/eip681.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/eip681.ts tests/eip681.test.ts
git commit -m "feat: EIP-681 ERC-20 transfer encode/parse for USDC checkout"
```

---

### Task 3: Pending checkout intent + arrival match

**Files:**
- Create: `app/lib/pending-checkout.ts`
- Create: `app/lib/checkout-match.ts`
- Create: `tests/pending-checkout.test.ts`
- Create: `tests/checkout-match.test.ts`

**Interfaces:**
- `CheckoutIntent = { expectedTo: \`0x${string}\`; amountBase: bigint; startedAt: number; token: \`0x${string}\` }`
- `stashCheckoutIntent` / `readCheckoutIntent` / `clearCheckoutIntent` (optional `Storage`)
- `TransferCandidate = { hash: \`0x${string}\`; to: \`0x${string}\`; value: bigint; timestampMs: number }`
- `matchCheckoutTransfer(intent, transfers, nowMs, windowMs = 300000): TransferCandidate | undefined`

Match: same `to`, exact `value`, `timestampMs >= startedAt`, within window, first hit wins.

- [ ] **Step 1: Write failing tests** (injected Storage; match cases for wrong amount / too early / timeout)

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test -- tests/pending-checkout.test.ts tests/checkout-match.test.ts
```

- [ ] **Step 3: Implement** (`flowpay.checkoutIntent` in sessionStorage; bigint as decimal string)

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add app/lib/pending-checkout.ts app/lib/checkout-match.ts tests/pending-checkout.test.ts tests/checkout-match.test.ts
git commit -m "feat: checkout pending intent and USDC arrival matching"
```

---

### Task 4: USDC read/send + session API

**Files:**
- Create: `app/lib/usdc.ts`
- Modify: `app/composables/useSigningSession.ts`
- Optionally touch `app/lib/activity.ts` if adding `asset: 'USDC'` is low-risk; do not break MON history

**Interfaces:**
- `readUsdcBalance(address): Promise<bigint>`
- `sendUsdcTransfer(session, to, amountBase): Promise<\`0x${string}\`>`
- `useSigningSession().sendUsdc(to, amountBase): Promise<void>` — check USDC balance; do not reuse MON `balanceWei > value` gate

- [ ] **Step 1: Implement `app/lib/usdc.ts`** (ERC-20 `balanceOf` + `transfer`, same client pattern as `ledger.ts` / `swap.ts`)

- [ ] **Step 2: Wire `sendUsdc` in `useSigningSession.ts`**

- [ ] **Step 3: `pnpm typecheck`** — expect clean

- [ ] **Step 4: Commit**

```bash
git add app/lib/usdc.ts app/composables/useSigningSession.ts app/lib/activity.ts
git commit -m "feat: USDC transfer send path on signing session"
```

---

### Task 5: Customer `/pay` USDC prefill + send

**Files:**
- Modify: `app/pages/pay.vue`
- Modify: `i18n/i18n.config.ts`

**Behavior:**
- If parse has USDC `tokenAddress` + `tokenAmount` → USDC mode prefill; Send calls `sendUsdc`
- Insufficient USDC → `insufficientUsdc` + hint to `/swap`
- No MON for gas → faucet CTA; no sponsorship claims
- Never auto-send; keep `pending-pay-uri` across Continue

- [ ] **Step 1: Extend pay state** with `asset: 'mon' | 'usdc'`

- [ ] **Step 2: Add i18n keys**

- [ ] **Step 3: `pnpm test && pnpm typecheck`**

- [ ] **Step 4: Commit**

```bash
git add app/pages/pay.vue i18n/i18n.config.ts
git commit -m "feat: pay page USDC EIP-681 prefill and send"
```

---

### Task 6: Merchant `/checkout` page

**Files:**
- Create: `app/pages/checkout.vue`
- Modify: `i18n/i18n.config.ts`
- Modify: `app/pages/home.vue`
- Modify: `app/middleware/session.global.ts` only if needed to session-gate `/checkout` like `/pay`

**UI:** idle keypad → pending (QR + cancel + poll) → success / timeout

**Polling:** ~2s; USDC `Transfer` logs to merchant → `matchCheckoutTransfer`; window 5 minutes

- [ ] **Step 1: Create `checkout.vue`** matching existing phone-shell visuals

- [ ] **Step 2: Home CTA** 「收银台」 → `/checkout`

- [ ] **Step 3: i18n** zh-CN + en

- [ ] **Step 4: `pnpm typecheck`**

- [ ] **Step 5: Commit**

```bash
git add app/pages/checkout.vue app/pages/home.vue i18n/i18n.config.ts app/middleware/session.global.ts
git commit -m "feat: merchant USDC checkout page with QR and arrival poll"
```

---

### Task 7: Acceptance hardening + docs touch

**Files:**
- Modify: `docs/04-MVP-Scope-and-Roadmap.md` — note checkout as active product vertical (do not check Gas sponsorship)
- Modify: `PRODUCT.md` — short honest repositioning to offline USDC checkout
- Optional: `docs/checkout.md`
- Ensure clear-local clears any new localStorage keys

- [ ] **Step 1: `pnpm test && pnpm typecheck`** — all green

- [ ] **Step 2: Dual-device manual checklist** in PR body (A checkout QR → B pay → A success; cancel; timeout)

- [ ] **Step 3: Commit docs**

```bash
git add docs/04-MVP-Scope-and-Roadmap.md PRODUCT.md docs/checkout.md
git commit -m "docs: align product narrative with offline USDC checkout"
```

- [ ] **Step 4: Open PR** with spec link + test plan

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| Merchant USDC keypad + QR | Task 6 |
| Customer scan/link Passkey USDC pay | Tasks 2, 4, 5 |
| EIP-681 ERC-20 + `pay?uri=` | Tasks 2, 5, 6 |
| sessionStorage pending intent | Task 3 |
| Arrival match exact amount + 5m window | Tasks 3, 6 |
| Honest MON gas / faucet | Tasks 5–6 |
| No backend / no sponsorship theater | Global + Tasks 4–6 |
| Home entry; keep address-only receive | Task 6 |
| Unit tests encode/decode + match | Tasks 1–3 |
| Deferred: sound, daily ledger, session policy | Not in plan |

## Placeholder scan

No TBD steps. EIP-681 `/transfer` is the default; a query-only fallback is only an escape hatch if QR scanners cannot handle `/transfer`, and must be documented if used.
