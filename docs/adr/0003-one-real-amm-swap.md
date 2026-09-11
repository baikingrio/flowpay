# P0 Swap is one real AMM pair, not our own pool

P0 Swap is a single live path: native MON ↔ one Monad testnet ERC-20, submitted to an already-deployed AMM router (prefer Uniswap on that testnet). Same Signing Session rules as Payment. No aggregator, no token picker, no Flowpay-deployed pool. A fake swap would fail the bounty; deploying our own AMM would steal time from the account layer.

**Status**: accepted
