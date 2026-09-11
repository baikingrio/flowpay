# Gas sponsorship for First Payment via smart account

**Status**: accepted

## Context

New users with 0 MON balance cannot pay gas for First Payment and must leave to an external faucet (ADR 0002 forbids Flowpay operating a paymaster). Monad testnet supports two account abstraction paths:

1. **EIP-7702**: Temporary EOA delegation
   - Requires 10 MON minimum reserve balance
   - Defeats the purpose for 0-balance users
   
2. **ERC-4337**: Smart account + third-party paymaster
   - Works for 0-balance users
   - Changes user-facing address from EOA to smart account
   - Pimlico supports Monad testnet with Kernel v0.3 + EntryPoint v0.7

## Decision

Implement **optional smart account sponsorship** for First Payment (and potentially early transactions) when the user cannot afford gas:

- **EOA remains primary**: Users with balance continue using the Passkey-derived EOA directly (no change to existing flow).
- **Smart account as fallback**: When `balance < gasEstimate + value`, attempt sponsored transaction via a **Kernel smart account** owned by the EOA.
- **Deterministic derivation**: Smart account address is derived deterministically from the EOA address (salt=0 or derived from EOA), preserving **stateless recovery** (Passkey → EOA → Smart Account address is reproducible).
- **Third-party paymaster**: Pimlico (or similar) sponsors gas on Monad testnet via ERC-4337 bundler + paymaster RPC.
- **Honest UI**: Display the smart account address when sponsorship is used; never pretend it's the same as EOA or that Flowpay holds gas funds.

## Consequences

### Positive
- New users can complete First Payment without leaving for faucet
- Stateless recovery still works: same Passkey → same EOA → same smart account address
- No custody backend required (ADR 0002 maintained)
- Standard ERC-4337 path with ecosystem tooling

### Negative
- User sees two addresses: EOA for normal transactions, smart account for sponsored ones
- Slightly more complex UX explanation needed
- Additional dependency on Pimlico API (testnet free tier)
- Smart account deployment transaction (bundler handles this transparently on first use)

### Mitigation
- Clear UI indicating sponsorship mode and smart account address
- Graceful fallback to faucet link if sponsorship fails
- Feature-flag or environment check to disable if needed
- Document API key setup in `.env.example` and README

## Technical Implementation

- `pnpm add permissionless viem/account-abstraction`
- New module: `app/lib/sponsored.ts` with `sendSponsoredPayment(session, to, value)`
- Modify `send()` in `useSigningSession`: check balance → attempt sponsor if insufficient → fallback to faucet CTA
- Environment variable: `NUXT_PUBLIC_PIMLICO_API_KEY` (testnet)
- Display smart account address in UI when sponsorship path is used

## Alternatives Considered

- **Operate Flowpay paymaster**: Rejected per ADR 0002
- **EIP-7702 only**: Rejected because 10 MON reserve defeats 0-balance case
- **Always use smart account**: Rejected to keep EOA as primary (simpler, no address confusion for users with balance)
