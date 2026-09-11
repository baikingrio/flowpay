# P0 is browser-only; Flowpay runs no backend

The app is a Nuxt UI that talks to the user's Passkey and a public Monad RPC. Flowpay does not operate an API that holds keys, relays transactions, indexes history, or sponsors gas in P0. That keeps "no custody backend" literally true for judges and Stateless recovery independent of our servers.

**Status**: accepted

**Considered Options**
- Browser-only against public RPC (chosen)
- Thin Nitro for quotes / history / paymaster forwarding (deferred; keys would still stay client-side)
- Flowpay-operated paymaster in P0 (rejected: out of MVP, muddies custody story)

**Consequences**
- Nuxt server routes are not part of the product; do not add them for P0
- Gas sponsorship remains P1 via a third-party paymaster, not a Flowpay custodian
- History and balances come from the chain (RPC), not a Flowpay database
