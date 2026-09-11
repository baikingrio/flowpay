# Gas sponsorship investigation (blocked)

**Status**: investigated, **not shipped** — architecture blocker documented below

## Context

P1 requested gas sponsorship for First Payment so new users with 0 MON don't need an external faucet. Monad testnet offers two theoretical paths:

1. **EIP-7702**: EOA delegation
   - Requires **10 MON minimum reserve balance**
   - Defeats the purpose for 0-balance or low-balance users
   
2. **ERC-4337**: Smart account + third-party paymaster
   - Can sponsor gas (not value)
   - BUT: creates an EOA ≠ smart account funding mismatch (blocker below)

## Decision

**Do not ship** the ERC-4337 sponsored send path in this iteration. Retain scaffolding code + tests as future reference, but remove integration into the live send flow.

**Reason**: Architecture blocker makes the feature misleading or broken for the intended use case.

## The Blocker: EOA ≠ Smart Account Purse

### Current architecture (ADR 0001 + 0002)
- **Passkey PRF** → **EOA** (user's self-custodied address)
- Faucet sends MON → EOA
- User receives payments → EOA
- **EOA holds the balance**

### ERC-4337 Smart Account Reality
- Kernel smart account is a **separate contract address** (deterministic from EOA + index, but distinct)
- When sending via `smartAccountClient.sendTransaction({ value })`, **the SA contract must hold `value`**
- Pimlico paymaster sponsors **gas only**, not the `value` being transferred
- **SA has 0 MON** (funds are on EOA)
- Transaction fails: "insufficient funds" at SA level

### Why "Transfer EOA → SA First" Doesn't Work
- Transferring `value` from EOA to SA costs gas
- If user has 0 MON or only has `value` without gas buffer → can't fund SA
- Defeats the entire purpose of gas sponsorship

### Coherent Paths That Would Work

**Option A** (requires UX redesign):
- When sponsorship is enabled, **receive address = SA** (not EOA)
- Display **SA balance** (not EOA balance)
- User receives funds directly to SA
- Sponsored send works because SA holds `value`
- **Trade-off**: Users see SA address (0xABCD...), not their Passkey-derived EOA. Confusing mental model; breaks "Passkey → EOA" story.

**Option B** (requires different sponsor model):
- Find an EOA-preserving gas sponsor mechanism that works on Monad testnet without 10 MON reserve
- EIP-7702 requires reserve (documented above)
- No known alternative on Monad testnet at time of investigation

**Option C** (narrow use case, not worth building for P1):
- Only enable sponsorship after user **already has funds on the SA** (received there manually)
- Doesn't help new users with 0 MON
- Adds cognitive load with two addresses
- Out of MVP scope

## What We Implemented (For Future Reference)

Module: `app/lib/sponsored.ts`
- Pimlico bundler + paymaster client setup
- Kernel v0.3.1 smart account creation (deterministic, index=0)
- `sendSponsoredPayment()` function
- Helper utilities

Tests: `tests/sponsored.test.ts`
- Unit tests for gas estimation, needsSponsorship logic

**Not integrated into live send flow** — integration was removed after code review identified the blocker.

## Consequences

### Positive
- Honest product: we don't claim "0 MON First Payment without faucet" when it doesn't actually work
- Stateless recovery story remains clean (Passkey → EOA, no SA confusion)
- Code preserved for future work if architecture changes

### Negative
- P1 Gas sponsorship requirement **not met** for MVP
- New users still need external faucet for First Payment
- Monad testnet has no better path available today

## Future Work

If the team wants to ship gas sponsorship:

1. **Redesign for SA-primary model** (Option A)
   - SA is the user-facing address
   - EOA is hidden (signing key owner)
   - Receive/QR shows SA address
   - Display SA balance
   - Requires new ADR, UX changes, and clear "your address" messaging

2. **Wait for better EOA sponsor primitives** (Option B)
   - EIP-7702 without reserve requirement
   - Or Monad-specific paymaster that can debit EOA while sponsoring SA gas

3. **Custodial relayer** (violates ADR 0002, not recommended)
   - Flowpay backend holds small MON buffer
   - Relays first N transactions per user
   - Breaks "no custody" promise

## Client-Exposed API Key Risk

The scaffolding uses `NUXT_PUBLIC_PIMLICO_API_KEY`, which is visible in client bundle.

**Risk**: Malicious users can extract the key and abuse testnet sponsorship quota.

**Mitigation** (if shipping in future):
- Move paymaster logic to Nitro server route (`/api/sponsor`)
- Keep key in `PIMLICO_API_KEY` (server-only)
- Rate-limit per session or EOA address
- Or use Pimlico's user-operation policies with allowlists

## References

- Monad docs: EIP-7702 reserve requirement (10 MON)
- Pimlico docs: Paymaster sponsors gas, not value
- Permissionless.js: ERC-4337 smart account clients

