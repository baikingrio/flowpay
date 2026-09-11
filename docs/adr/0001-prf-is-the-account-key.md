# Account key is the Passkey PRF output

Product docs described BIP-44 HD derivation (and optional mnemonic export) from the PRF bytes. We instead treat Mera's 32-byte PRF output as the secp256k1 private key, open a Mera Signing Session from it, and derive the EOA with `getEvmAddress`. Mera is the entire account layer; adding our own HD path would make addresses, recovery, and "export" a Flowpay protocol instead of Mera's.

**Status**: accepted

**Considered Options**
- PRF bytes as secp256k1 key (chosen)
- PRF as BIP-44 master seed (rejected: not what Mera does; splits the account layer)
- PRF as wrap-key for a separately stored secret (rejected: breaks Stateless recovery / no-custody)

**Consequences**
- Same Passkey + same PRF salt ⇒ same Account, with no local secret store
- P0 has no mnemonic/MetaMask export; that would be a later, separate decision
- Product "session TTL / spend limits" are Flowpay policy around Mera's in-memory session, not a Mera built-in
