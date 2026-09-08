# EIP-681 Pay/Receive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship EIP-681 receive QR (optional amount), pay-side scan/paste/deep-link prefill, ENS best-effort resolve, and recent recipients—without auto-sending.

**Architecture:** Pure `eip681` + `pending-pay-uri` libs; optional `ens` via public RPC; UI panels on `/home` and `/pay`; middleware stashes `?uri=` before auth redirect; session keys stay in `useSigningSession` closure.

**Tech Stack:** Nuxt 4, Vue 3, Pinia, viem, `@nuxtjs/i18n`, `qrcode` (encode), `vitest` (unit), BarcodeDetector with `@zxing/browser` fallback for decode.

**Spec:** `docs/superpowers/specs/2026-09-08-eip681-pay-receive-design.md`

## Global Constraints

- Browser-only; no Nitro product routes (ADR-0002)
- Outbound URIs always use chainId `10143` (Monad testnet)
- Native MON payment requests only — reject EIP-681 paths with `/function_name`
- Never auto-broadcast; user must tap Send
- Session private key never in Pinia or storage (ADR-0007)
- UI language: bilingual keys in `i18n/i18n.config.ts`; default `zh-CN`
- Visual system: existing `DESIGN.md` (canvas `#f5f5f5`, paper cards 24px, pills 18px, Geist)

## File map

| File | Responsibility |
|------|----------------|
| `app/lib/eip681.ts` | `buildPaymentUri`, `parsePaymentUri`, `toAppPayPath` |
| `app/lib/pending-pay-uri.ts` | `sessionStorage` stash/read/clear for deep links |
| `app/lib/ens.ts` | `resolveEnsName` against current chain RPC |
| `app/lib/qr-encode.ts` | data-URL QR from string (dynamic `qrcode`) |
| `app/components/PayReceivePanel.vue` | receive UI |
| `app/components/PayScanControl.vue` | camera / image / paste trigger |
| `app/pages/home.vue` | host receive panel |
| `app/pages/pay.vue` | apply parse results, recent recipients, hydrate |
| `app/pages/index.vue` | after `open()`, go `/pay` (hydrate reads stash) |
| `app/middleware/session.global.ts` | stash `uri` before redirect to `/` |
| `i18n/i18n.config.ts` | copy |
| `tests/eip681.test.ts` | pure parse/build vectors |
| `tests/pending-pay-uri.test.ts` | stash helpers with mock storage |
| `vitest.config.ts` + `package.json` | test runner |

---

### Task 1: Vitest + `eip681` pure module

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/eip681.test.ts`
- Create: `app/lib/eip681.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `buildPaymentUri(opts: { address: \`0x${string}\`; chainId?: number; valueWei?: bigint }): string`
  - `parsePaymentUri(input: string, expectedChainId?: number): ParsePaymentUriResult`
  - `toAppPayPath(uri: string): string` → `/pay?uri=...`
  - Types: `ParsePaymentUriResult = { ok: true; address?: \`0x${string}\`; ensName?: string; chainId?: number; valueWei?: bigint; warnings: string[] } | { ok: false; error: 'invalid' \| 'checksum' \| 'wrong_chain' \| 'unsupported_function' }`

- [ ] **Step 1: Add vitest**

```bash
pnpm add -D vitest
```

`package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Write failing tests**

`tests/eip681.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildPaymentUri, parsePaymentUri, toAppPayPath } from '../app/lib/eip681'

const ADDR = '0x000000000000000000000000000000000000dEaD' as const
// checksummed form of dEaD:
const DEAD = '0x000000000000000000000000000000000000dEaD'

describe('buildPaymentUri', () => {
  it('builds address@10143', () => {
    expect(buildPaymentUri({ address: DEAD, chainId: 10143 }))
      .toBe(`ethereum:${DEAD}@10143`)
  })

  it('appends scientific value', () => {
    const uri = buildPaymentUri({ address: DEAD, chainId: 10143, valueWei: 10n ** 15n })
    expect(uri).toBe(`ethereum:${DEAD}@10143?value=1e15`)
  })
})

describe('parsePaymentUri', () => {
  it('parses bare address', () => {
    const r = parsePaymentUri(DEAD, 10143)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.address?.toLowerCase()).toBe(DEAD.toLowerCase())
      expect(r.warnings).toContain('missing_chain')
    }
  })

  it('parses ethereum:addr@10143', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143`, 10143)
    expect(r.ok && r.address && r.chainId === 10143).toBeTruthy()
  })

  it('parses value scientific', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143?value=1e15`, 10143)
    expect(r.ok && r.valueWei === 10n ** 15n).toBeTruthy()
  })

  it('accepts pay- prefix', () => {
    const r = parsePaymentUri(`ethereum:pay-${DEAD}@10143`, 10143)
    expect(r.ok).toBe(true)
  })

  it('rejects wrong chain', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@1`, 10143)
    expect(r).toEqual({ ok: false, error: 'wrong_chain' })
  })

  it('rejects function path', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143/transfer?address=${DEAD}&uint256=1`, 10143)
    expect(r).toEqual({ ok: false, error: 'unsupported_function' })
  })

  it('keeps address when value is garbage', () => {
    const r = parsePaymentUri(`ethereum:${DEAD}@10143?value=nope`, 10143)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.valueWei).toBeUndefined()
      expect(r.warnings).toContain('bad_value')
    }
  })

  it('returns ensName for non-hex target', () => {
    const r = parsePaymentUri('ethereum:alice.eth@10143', 10143)
    expect(r.ok && r.ensName === 'alice.eth' && !r.address).toBeTruthy()
  })
})

describe('toAppPayPath', () => {
  it('builds query path', () => {
    const uri = `ethereum:${DEAD}@10143`
    expect(toAppPayPath(uri)).toBe(`/pay?uri=${encodeURIComponent(uri)}`)
  })
})
```

- [ ] **Step 3: Run tests — expect fail**

```bash
pnpm test
```

Expected: FAIL — cannot resolve `../app/lib/eip681`

- [ ] **Step 4: Implement `app/lib/eip681.ts`**

```ts
import { getAddress, isAddress } from 'viem'

export type ParsePaymentUriSuccess = {
  ok: true
  address?: `0x${string}`
  ensName?: string
  chainId?: number
  valueWei?: bigint
  warnings: string[]
}

export type ParsePaymentUriFailure = {
  ok: false
  error: 'invalid' | 'checksum' | 'wrong_chain' | 'unsupported_function'
}

export type ParsePaymentUriResult = ParsePaymentUriSuccess | ParsePaymentUriFailure

export function buildPaymentUri(opts: {
  address: `0x${string}`
  chainId?: number
  valueWei?: bigint
}): string {
  const chainId = opts.chainId ?? 10143
  const address = getAddress(opts.address)
  let uri = `ethereum:${address}@${chainId}`
  if (opts.valueWei !== undefined)
    uri += `?value=${formatScientificWei(opts.valueWei)}`
  return uri
}

export function toAppPayPath(uri: string): string {
  return `/pay?uri=${encodeURIComponent(uri)}`
}

export function parsePaymentUri(
  input: string,
  expectedChainId: number = 10143,
): ParsePaymentUriResult {
  const raw = input.trim()
  if (!raw)
    return { ok: false, error: 'invalid' }

  if (!raw.toLowerCase().startsWith('ethereum:')) {
    return parseHexTarget(raw, undefined, [], expectedChainId)
  }

  let rest = raw.slice('ethereum:'.length)
  if (rest.toLowerCase().startsWith('pay-'))
    rest = rest.slice(4)

  const qIndex = rest.indexOf('?')
  const pathPart = qIndex === -1 ? rest : rest.slice(0, qIndex)
  const query = qIndex === -1 ? '' : rest.slice(qIndex + 1)

  if (pathPart.includes('/'))
    return { ok: false, error: 'unsupported_function' }

  let target = pathPart
  let chainId: number | undefined
  const at = pathPart.lastIndexOf('@')
  if (at !== -1) {
    target = pathPart.slice(0, at)
    const id = Number(pathPart.slice(at + 1))
    if (!Number.isInteger(id) || id <= 0)
      return { ok: false, error: 'invalid' }
    chainId = id
    if (chainId !== expectedChainId)
      return { ok: false, error: 'wrong_chain' }
  }

  const warnings: string[] = []
  if (chainId === undefined)
    warnings.push('missing_chain')

  const base = parseHexTarget(target, chainId, warnings, expectedChainId)
  if (!base.ok)
    return base

  if (query) {
    const params = new URLSearchParams(query)
    const value = params.get('value')
    if (value) {
      try {
        base.valueWei = parseWeiNumber(value)
      }
      catch {
        base.warnings.push('bad_value')
      }
    }
  }

  return base
}

function parseHexTarget(
  target: string,
  chainId: number | undefined,
  warnings: string[],
  _expectedChainId: number,
): ParsePaymentUriResult {
  const t = target.trim()
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) {
    if (!isAddress(t, { strict: false }))
      return { ok: false, error: 'invalid' }
    try {
      return {
        ok: true,
        address: getAddress(t),
        chainId,
        warnings,
      }
    }
    catch {
      return { ok: false, error: 'checksum' }
    }
  }
  if (t.includes('.') || /^[a-z0-9-]+$/i.test(t)) {
    return { ok: true, ensName: t, chainId, warnings }
  }
  return { ok: false, error: 'invalid' }
}

function formatScientificWei(value: bigint): string {
  if (value === 0n)
    return '0'
  let n = value
  let exp = 0
  while (n % 10n === 0n) {
    n /= 10n
    exp++
  }
  return exp > 0 ? `${n}e${exp}` : `${value}`
}

function parseWeiNumber(raw: string): bigint {
  const m = /^([0-9]+)(?:\.([0-9]+))?(?:e([+-]?[0-9]+))?$/i.exec(raw.trim())
  if (!m)
    throw new Error('bad')
  const whole = m[1]
  const frac = m[2] ?? ''
  const exp = m[3] ? Number(m[3]) : 0
  const digits = `${whole}${frac}`
  const scale = exp - frac.length
  if (scale >= 0)
    return BigInt(digits) * 10n ** BigInt(scale)
  const cut = -scale
  if (cut >= digits.length)
    return 0n
  return BigInt(digits.slice(0, digits.length - cut))
}
```

Adjust implementation until tests match (especially `getAddress` checksum of `dEaD`).

- [ ] **Step 5: Run tests — expect pass**

```bash
pnpm test
```

Expected: all `eip681` tests PASS

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts app/lib/eip681.ts tests/eip681.test.ts
git commit -m "feat: add EIP-681 build/parse helpers with tests"
```

---

### Task 2: Pending pay URI storage

**Files:**
- Create: `app/lib/pending-pay-uri.ts`
- Create: `tests/pending-pay-uri.test.ts`

**Interfaces:**
- Produces:
  - `PENDING_PAY_URI_KEY = 'flowpay.pendingPayUri'`
  - `stashPendingPayUri(uri: string): void`
  - `readPendingPayUri(): string | undefined`
  - `clearPendingPayUri(): void`
- Consumes: none

- [ ] **Step 1: Failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.stubGlobal('window', {
  sessionStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  },
})

vi.stubGlobal('import', { meta: { client: true } })

// Note: if import.meta.client is compile-time, test the functions by
// injecting storage via optional param OR test with vitest + happy-dom.
// Prefer implementing helpers that accept Storage for testability:

import {
  clearPendingPayUri,
  readPendingPayUri,
  stashPendingPayUri,
} from '../app/lib/pending-pay-uri'

describe('pending pay uri', () => {
  beforeEach(() => store.clear())

  it('roundtrips', () => {
    stashPendingPayUri('ethereum:0xabc@10143', storeAsStorage())
    expect(readPendingPayUri(storeAsStorage())).toBe('ethereum:0xabc@10143')
    clearPendingPayUri(storeAsStorage())
    expect(readPendingPayUri(storeAsStorage())).toBeUndefined()
  })
})

function storeAsStorage(): Storage {
  return {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
    key: () => null,
  }
}
```

- [ ] **Step 2: Implement**

```ts
export const PENDING_PAY_URI_KEY = 'flowpay.pendingPayUri'

export function stashPendingPayUri(uri: string, storage?: Storage): void {
  const s = storage ?? defaultStorage()
  if (!s)
    return
  s.setItem(PENDING_PAY_URI_KEY, uri)
}

export function readPendingPayUri(storage?: Storage): string | undefined {
  const s = storage ?? defaultStorage()
  const v = s?.getItem(PENDING_PAY_URI_KEY)
  return v || undefined
}

export function clearPendingPayUri(storage?: Storage): void {
  storage ?? defaultStorage()?.removeItem(PENDING_PAY_URI_KEY)
}

function defaultStorage(): Storage | undefined {
  if (typeof window === 'undefined')
    return undefined
  return window.sessionStorage
}
```

Fix `clearPendingPayUri` to:

```ts
export function clearPendingPayUri(storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.removeItem(PENDING_PAY_URI_KEY)
}
```

- [ ] **Step 3: `pnpm test` — PASS**

- [ ] **Step 4: Commit**

```bash
git add app/lib/pending-pay-uri.ts tests/pending-pay-uri.test.ts
git commit -m "feat: sessionStorage helpers for pending pay URI"
```

---

### Task 3: Middleware stash + ENS helper

**Files:**
- Modify: `app/middleware/session.global.ts`
- Create: `app/lib/ens.ts`
- Create: `tests/ens.test.ts` (mock `getEnsAddress`)

**Interfaces:**
- Produces: `resolveEnsName(name: string): Promise<\`0x${string}\` | undefined>`
- Consumes: `stashPendingPayUri` from Task 2; `getPublicClient` from `~/lib/ledger`

- [ ] **Step 1: Update middleware**

```ts
import { stashPendingPayUri } from '~/lib/pending-pay-uri'

export default defineNuxtRouteMiddleware((to) => {
  const account = useAccountStore()
  const appRoutes = new Set(['/home', '/pay', '/swap'])

  if (to.path === '/' && account.hasSession)
    return navigateTo('/pay')

  if (appRoutes.has(to.path) && !account.address) {
    const uri = typeof to.query.uri === 'string' ? to.query.uri : undefined
    if (uri)
      stashPendingPayUri(uri)
    return navigateTo('/')
  }
})
```

- [ ] **Step 2: Implement ENS**

```ts
import { normalize } from 'viem/ens'
import { getPublicClient } from './ledger'

export async function resolveEnsName(name: string): Promise<`0x${string}` | undefined> {
  try {
    const client = getPublicClient()
    const address = await client.getEnsAddress({ name: normalize(name) })
    return address ?? undefined
  }
  catch {
    return undefined
  }
}
```

- [ ] **Step 3: Test ENS with mocked client**

Prefer exporting `resolveEnsNameWith(client, name)` for tests, keep `resolveEnsName` as wrapper. One test: mock returns address; one test: mock throws → undefined.

- [ ] **Step 4: `pnpm test && pnpm typecheck`**

- [ ] **Step 5: Commit**

```bash
git add app/middleware/session.global.ts app/lib/ens.ts tests/ens.test.ts
git commit -m "feat: stash pay URI on auth redirect; add ENS resolve helper"
```

---

### Task 4: QR encode helper + receive panel on Home

**Files:**
- Create: `app/lib/qr-encode.ts`
- Create: `app/components/PayReceivePanel.vue`
- Modify: `app/pages/home.vue`
- Modify: `i18n/i18n.config.ts`
- Dependency: `pnpm add qrcode` and `pnpm add -D @types/qrcode`

**Interfaces:**
- Consumes: `buildPaymentUri`, `toAppPayPath` from Task 1
- Produces: `<PayReceivePanel :address="account.address" />`

- [ ] **Step 1: Install qrcode**

```bash
pnpm add qrcode
pnpm add -D @types/qrcode
```

- [ ] **Step 2: `app/lib/qr-encode.ts`**

```ts
export async function encodeQrDataUrl(text: string): Promise<string> {
  const QR = await import('qrcode')
  return QR.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: { dark: '#0a0a0a', light: '#ffffff' },
  })
}
```

- [ ] **Step 3: `PayReceivePanel.vue`**

Inline panel (not modal): optional amount text → parse to wei with `parseEther`; live `buildPaymentUri`; `<img :src="qrUrl">`; buttons: copy address, copy URI, copy `origin + toAppPayPath(uri)`.

Use existing Button styles / DESIGN tokens. Amount empty → URI without value.

- [ ] **Step 4: Wire `home.vue`**

Toggle `showReceive` under address; render `<PayReceivePanel v-if="showReceive && account.address" :address="account.address" />`.

- [ ] **Step 5: i18n keys** (zh + en): `receive`, `receiveAmount`, `copyUri`, `copyPayLink`, `copiedUri`, `copiedLink`, …

- [ ] **Step 6: Manual smoke** — `pnpm dev`, open receive, scan QR with phone camera app; string should start with `ethereum:`.

- [ ] **Step 7: Commit**

```bash
git add app/lib/qr-encode.ts app/components/PayReceivePanel.vue app/pages/home.vue i18n/i18n.config.ts package.json pnpm-lock.yaml
git commit -m "feat: EIP-681 receive panel with QR on home"
```

---

### Task 5: Apply URI on Pay + scan control + recent recipients

**Files:**
- Create: `app/components/PayScanControl.vue`
- Modify: `app/pages/pay.vue`
- Modify: `i18n/i18n.config.ts`
- Dependency: `pnpm add @zxing/browser`

**Interfaces:**
- Consumes: `parsePaymentUri`, `resolveEnsName`, `readActivity` / `account.activity`, `formatMon`
- Produces: pay form prefilled; scan emits raw string

- [ ] **Step 1: Add apply helper inside `pay.vue` (or `app/lib/apply-pay-uri.ts`)**

```ts
async function applyPaymentInput(raw: string): Promise<void> {
  localError.value = undefined
  const parsed = parsePaymentUri(raw, 10143)
  if (!parsed.ok) {
    localError.value = mapParseError(parsed.error) // i18n keys
    return
  }
  let address = parsed.address
  if (!address && parsed.ensName) {
    address = await resolveEnsName(parsed.ensName)
    if (!address) {
      localError.value = 'ensUnresolved'
      return
    }
  }
  if (!address) {
    localError.value = 'invalidAddress'
    return
  }
  recipient.value = address
  if (parsed.valueWei !== undefined)
    amountText.value = formatMon(parsed.valueWei)
  for (const w of parsed.warnings) {
    if (w === 'missing_chain')
      localError.value = 'missingChain'
    if (w === 'bad_value')
      localError.value = 'amountNotImported'
  }
}
```

- [ ] **Step 2: `PayScanControl.vue`**

Props: none. Emits: `detected: [string]`.  
UI: button「扫码」opens small panel with:
- `video` + `BarcodeDetector` if available
- else file input → `@zxing/browser` `BrowserQRCodeReader.decodeFromImageUrl`
- always show「粘贴」using `navigator.clipboard.readText()` when permitted

Stop camera `tracks.forEach(t => t.stop())` on close / unmount.

- [ ] **Step 3: Pay page layout**

Recipient label row: input + `<PayScanControl @detected="applyPaymentInput" />`.  
On input blur/paste: if value looks like `ethereum:` or long hex, run `applyPaymentInput`.

Recent recipients: unique `to` from `account.activity` (max 5); chips set `recipient`.

- [ ] **Step 4: Hydrate on mount**

```ts
onMounted(async () => {
  const route = useRoute()
  const fromQuery = typeof route.query.uri === 'string' ? route.query.uri : undefined
  const pending = fromQuery ?? readPendingPayUri()
  if (pending) {
    await applyPaymentInput(pending)
    clearPendingPayUri()
    if (fromQuery)
      await navigateTo({ path: '/pay', query: {} }, { replace: true })
  }
})
```

- [ ] **Step 5: i18n** for scan/paste/errors: `wrongChain`, `unsupportedFunction`, `ensUnresolved`, `missingChain`, `amountNotImported`, `recentRecipients`, `scan`, `pickImage`, `pasteUri`

- [ ] **Step 6: `pnpm typecheck`**

- [ ] **Step 7: Commit**

```bash
git add app/components/PayScanControl.vue app/pages/pay.vue i18n/i18n.config.ts package.json pnpm-lock.yaml
git commit -m "feat: pay scan/paste/URI apply and recent recipients"
```

---

### Task 6: Landing Continue preserves pending URI path

**Files:**
- Modify: `app/pages/index.vue` (only if needed)
- Verify: middleware stash + pay hydrate (Task 3+5) already cover lock→continue

**Interfaces:**
- Consumes: `open()` then `navigateTo('/pay')` — pay `onMounted` reads stash

- [ ] **Step 1: Confirm `index.vue` still `navigateTo('/pay')` after successful `open()`** — no need to pass query; stash holds URI.

- [ ] **Step 2: Manual path**
  1. Lock / logged out
  2. Open `/pay?uri=ethereum:0x000000000000000000000000000000000000dEaD@10143?value=1e15`
  3. Expect redirect to `/` and stash set
  4. Passkey Continue → `/pay` with recipient dEaD and amount `0.001`

- [ ] **Step 3: Commit only if code changed; else skip**

```bash
git commit -m "fix: ensure Continue hydrates stashed EIP-681 pay URI"
```

---

### Task 7: Spec self-check + typecheck gate

**Files:** none new

- [ ] **Step 1: Map spec → tasks**

| Spec requirement | Task |
|------------------|------|
| Receive QR `@10143` | 4 |
| Optional amount in URI | 4 |
| Copy address / URI / HTTPS link | 4 |
| Scan / paste / image | 5 |
| Prefill amount from `value` | 5 |
| Reject wrong chain / function | 1+5 |
| ENS best-effort | 3+5 |
| Deep link + stash across auth | 2+3+5+6 |
| Recent recipients | 5 |
| No auto-send | 5 (apply only) |
| Unit tests eip681 | 1 |

- [ ] **Step 2: Run**

```bash
pnpm test && pnpm typecheck
```

Expected: all pass

- [ ] **Step 3: Final commit only if leftover fixes**

---

## Plan self-review

1. **Spec coverage:** All approved IA / modules / errors have tasks; Swap/gas/custom schemes remain out of scope.
2. **Placeholders:** None intentional; ENS test uses injectable client to avoid flaky RPC.
3. **Types:** `ParsePaymentUriResult`, `buildPaymentUri`, stash helpers shared consistently across tasks.
4. **Risk:** `import.meta.client` in unit tests — pending-uri helpers take optional `Storage` to avoid Nuxt compile coupling.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-08-eip681-pay-receive.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
