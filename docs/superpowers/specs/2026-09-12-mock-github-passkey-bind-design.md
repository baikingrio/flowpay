# Design: Mock GitHub login + forced Passkey bind

**Date:** 2026-09-12  
**Status:** approved for planning  
**Product framing:** Web2-style app gate (mock GitHub) then self-custodied Passkey funds (path C)

## Goal

Let users “continue with GitHub” (simulated), then **immediately** bind a Passkey/Mera account before using the app. Separate **app login** from **signing session** so browsing after bind does not require re-doing GitHub; signing still uses ephemeral Passkey session (ADR 0006/0007).

## Scope (this slice)

- Mock GitHub auth only (no real OAuth / client secret / Nitro auth)
- Forced `/bind` Passkey after mock login
- Persist mock session + bound address in localStorage
- Hide session countdown from TopBar by default
- Settings: 退出 GitHub（模拟）

## Non-goals

- Real GitHub OAuth
- Social recovery / embedded wallets (Privy etc.)
- Persisting PRF / signing keys
- Gas sponsorship theater

## Decisions

| Topic | Choice |
|-------|--------|
| Path | C: GitHub gate → Passkey custody |
| Auth v1 | Mock local session |
| Bind timing | Immediate after login |
| Storage | `flowpay.appAuth`, `flowpay.boundAddress` |
| Session UI | No TopBar countdown by default |
| Keys | Unchanged: memory-only Signing Session |

## Flow

1. Landing: CTA「用 GitHub 继续」+ mock disclaimer  
2. Write `flowpay.appAuth` → redirect `/bind` if no `boundAddress`  
3. `/bind`: Passkey `open()` → write `boundAddress` → `/home`  
4. Refresh with auth+bound: enter app routes; pay/swap/checkout signing still needs live session → Continue when needed (not full GitHub again)  
5. 退出 GitHub: clear `appAuth` (and end live session); do not delete authenticator Passkey  
6. 清除本机数据: clear auth, boundAddress, credential hint, ledgers, etc.

## Middleware

- No `appAuth` → `/`  
- `appAuth` without `boundAddress` → only `/bind`  
- Both present → business routes (`/home`, `/pay`, `/checkout`, …)

## Acceptance

1. Mock GitHub → bind Passkey → Home  
2. Refresh keeps auth+bound; browse without GitHub; unsigned actions prompt Continue  
3. 退出 GitHub → landing; Passkey remains in OS; mock login + Continue can recover same address  
4. Clear local data wipes mock + bind hints  
5. Unit tests for auth/bind storage helpers; `pnpm test` / `typecheck` green  

## Related

- ADR 0006 / 0007 (session key rules unchanged)  
- ADR 0002: no product OAuth backend in this slice  
