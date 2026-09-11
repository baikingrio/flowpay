# Live signing key stays in a module closure, never in Pinia or storage

The Mera Signing Session object (and the private key it holds) lives in a composable/module closure such as `useSigningSession`. Pinia stores only the public projection: address, whether a session is live, expiry, balances. localStorage may keep `credentialId` and UI preferences to hint Continue; it is not required for Stateless recovery and must never hold PRF output or keys. Pinia persist plugins are not used on account state.

**Status**: accepted
