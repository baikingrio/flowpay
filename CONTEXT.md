# Flowpay

Passkey-native on-chain payments: one authenticator ceremony yields a self-custodied Account, then payments and swaps can proceed inside a Signing Session.

## Language

**Account**:
The user's self-custodied on-chain identity. Its signing key is the Passkey's PRF output, and its public face is an EOA address.
_Avoid_: wallet, HD wallet, BIP-44 account, custodial account

**Passkey**:
The authenticator-held credential that can reproduce the same PRF output. It is the recovery root.
_Avoid_: password, seed phrase, social login, wallet extension

**PRF output**:
The 32-byte secret produced by WebAuthn PRF from the Passkey. It is the Account's secp256k1 private key.
_Avoid_: mnemonic, seed, BIP-44 master key, wrapped vault secret

**Signing Session**:
A period after a Passkey ceremony during which the Account can sign without another ceremony. It exists only in page memory. It ends after 10 minutes, when the page is left or reloaded, or when the user locks. Ending it destroys the in-memory key; the Account itself is unchanged.
_Avoid_: login session, JWT, cookie, OAuth session, persisted keystore

**One-prompt**:
A single Passkey ceremony that creates or recovers the Account and starts a Signing Session. No other identity step is required.
_Avoid_: sign-up funnel, social onboarding, email/OTP

**Continue**:
Reconstructing an existing Account from an existing Passkey and starting a Signing Session.
_Avoid_: login, sign-in, reconnect wallet

**Create**:
Registering a new Passkey that yields a new Account. Used only when Continue cannot find a Passkey.
_Avoid_: sign-up, register-with-email

**Stateless recovery**:
Reconstructing the same Account from the Passkey alone, with no stored key material.
_Avoid_: backup file, cloud custody, local keystore as source of truth

**Payment**:
A native-token transfer from the Account to an address the user specifies.
_Avoid_: checkout, invoice, remittance

**First Payment**:
The first on-chain Payment after One-prompt. It lives on the Pay screen as a prefilled action; the user must confirm. It is never sent without that confirmation.
_Avoid_: airdrop, auto-transfer, background mint

**Faucet**:
An external testnet MON source. The Account uses it when it cannot pay gas. Flowpay does not operate a Faucet and does not send MON to users.
_Avoid_: paymaster, treasury, airdrop from us

**Swap**:
An on-chain exchange of a single, fixed token pair from the Account through a public AMM, signed with the same Signing Session rules as a Payment.
_Avoid_: trading, aggregator, limit order, simulated quote

**Ledger**:
The public Monad chain. It is the source of truth for balances, Payments, and Swaps. Flowpay does not keep an Account ledger of its own.
_Avoid_: our database, indexer-as-truth, custodial balance
