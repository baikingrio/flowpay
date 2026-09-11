# Design: Offline stablecoin checkout (当面收款)

**Date:** 2026-09-11  
**Status:** approved for planning  
**Product framing:** real SMB + consumer checkout first; Passkey/Mera stay invisible infrastructure

## Goal

Make Flowpay useful for ordinary offline stalls and small shops: merchant prices in USDC, shows a payment QR for a specific amount, customer pays with Passkey (no seed, no wallet extension), merchant sees a clear on-screen success when USDC arrives.

One-liner: **Flowpay = offline SMB stablecoin checkout counter.**

## Audience

- **Merchant:** stall / storefront cashier on a phone or tablet
- **Customer:** anyone with a WebAuthn-PRF-capable phone browser

## Vertical slice (this spec)

Ship the closed loop only:

1. Merchant amount keyboard → USDC checkout QR  
2. Customer scan / open link → Passkey pay USDC  

Deferred after this slice (still product goals, not this PR):

- Big-text / optional sound arrival polish beyond a clear success state  
- Today’s ledger and simple daily settlement  
- Session spend policy, Swap depth, smart accounts, gas sponsorship theater  

## Non-goals (this slice)

- Fiat on/off ramp  
- Backend payment intents, merchant accounts, staff roles  
- On-chain payment-request contracts or memo-enforced matching  
- Auto gas sponsorship (ADR 0010 still blocked); faucet path stays honest  
- Voice broadcast (optional later)  
- Replacing Home’s fixed-address receive QR (keep as “address only” receive)

## Decisions

| Topic | Choice |
|-------|--------|
| Pricing asset | USDC on Monad testnet (same address as Swap docs) |
| Gas | Native MON; UI states shortage + faucet link honestly |
| Merchant surface | New `/checkout` page |
| Customer surface | Extend `/pay` for ERC-20 EIP-681 / transfer prefills |
| Wire format | EIP-681 ERC-20 transfer encoding + `https://<origin>/pay?uri=...` |
| Chain | `@10143` (Monad testnet) on outbound URIs |
| Arrival detection | Client-side: USDC transfers to merchant after pending start; exact amount + time window |
| Order store | No backend; pending intent in `sessionStorage` only |
| Account model | Unchanged: Passkey → EOA; Stateless recovery preserved |
| Modes | Same account; Home entry “收银台” vs existing pay/receive |

## Core flow

1. Merchant Continues (Passkey) → opens `/checkout`  
2. Enters amount in USDC → taps 收款  
3. Full-screen pending: QR + amount + cancel  
4. Customer scans QR or opens HTTPS pay link → `/pay` prefills `to`, USDC, amount  
5. If no Signing Session → Continue, then return to prefilled confirm (do not drop params)  
6. Customer confirms → ERC-20 `transfer` of USDC (Session signs)  
7. Merchant client detects matching inbound USDC transfer → success state → 再收一笔  

### Explicit out-of-scope behaviors

- Cancel does **not** invalidate an already-open customer link on-chain; face-to-face cancel is verbal + stop waiting  
- USDC→customer refunds, tips, partial pays: not in this slice  

## Information architecture

### `/checkout` (new)

- Amount keypad (USDC), primary CTA 收款  
- Pending: QR (EIP-681 + readable amount), cancel, waiting copy  
- Success: large confirmation of amount + optional tx hint → 再收一笔  

### `/pay` (extend)

- Parse native MON **and** USDC ERC-20 EIP-681  
- Prefill never auto-sends  
- Block confirm when USDC balance < amount; point to Swap or external source  
- Block / guide when MON < gas needs (faucet URL)

### Home

- Entry to 收银台 (`/checkout`)  
- Existing amount-less receive QR remains for “send me anything”

### Settings / Swap

- Unchanged for this slice; optional later: default receive asset = USDC  

## Data

| Kind | Where | Notes |
|------|--------|------|
| Pending checkout intent | `sessionStorage` | `amount`, `createdAt`, `expectedTo`; cleared on cancel/success/tab end |
| Recent success summaries | optional `localStorage` | acceleration only; cleared by 清除本机数据 |
| Balances / transfers | RPC | source of truth |
| Keys / PRF | memory session only | ADR 0006 / 0007 |

## Arrival matching

Pure helper (unit-tested):

- Inputs: merchant address, expected amount (USDC base units), pending `startedAt`, candidate transfers  
- Match: `to == merchant`, `value == expected`, `blockTime/tx time >= startedAt`, within window (default **5 minutes**), not already consumed by this pending session  
- On timeout: prompt cancel / restart; do not false-success  

Loose matching is acceptable for face-to-face; stronger intent IDs can come later.

## EIP-681

- Generate USDC transfer URIs suitable for QR and `pay?uri=`  
- Extend existing EIP-681 helpers that today focus on native MON (see `2026-09-08-eip681-pay-receive-design.md`)  
- Outbound always includes chain id `10143`  

## Errors & honesty

- No MON for gas → clear faucet CTA (`https://faucet.monad.xyz`)  
- No / low USDC → clear message before sign  
- PRF unsupported → existing device error path  
- Testnet badge / copy so merchants do not treat this as mainnet acquiring  
- 清除本机数据 does not affect on-chain USDC already received  

## Testing / acceptance

1. Merchant on device A: `/checkout` → amount → QR  
2. Customer on device B: scan/open → Passkey → USDC transfer succeeds  
3. Device A pending view reaches success with same amount within the window  
4. Customer without session: Continue, then prefill still present  
5. Unit tests: USDC EIP-681 encode/decode; arrival-match pure function  
6. `pnpm test` and `pnpm typecheck` green  

## Relationship to prior roadmap

- P0 account path stays; product **narrative** shifts from “seedless wallet demo” to “offline USDC checkout”  
- P2 Session policy and richer asset board remain backlog unless they serve checkout  
- Update `PRODUCT.md` / MVP notes in a follow-up docs commit after this spec is accepted for implementation  

## Open points (non-blocking)

- Exact EIP-681 ERC-20 string shape vs a Flowpay-only query fallback if a library gap appears (prefer standard; document any fallback)  
- Poll interval / whether to use `eth_getLogs` vs balance delta + receipt lookup (implementer chooses; matching rules above stay fixed)  
