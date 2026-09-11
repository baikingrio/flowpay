# Signing key lives in `useSigningSession`; Pinia is a public projection

Account ceremony and the live Mera session sit in `app/lib/account.ts` and `app/composables/useSigningSession.ts`. `app/stores/account.ts` holds only address, expiry, balance, and UI status. `app/lib/chain.ts` is the viem public/wallet client for Monad testnet.

**Status**: accepted
