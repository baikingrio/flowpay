# Stateless Recovery

Flowpay implements **stateless recovery**: the same Passkey produces the same Account (EOA address), with no local secret store, no seed phrase, and no backend custody.

## What is stored locally

### localStorage (optional acceleration)

- `flowpay.credentialId` — hint to speed up Passkey picker
- `flowpay.activity.{address}` — local activity cache (payments sent from this device)

**These are NOT required for recovery.** Clearing site data does not destroy your Account.

### Memory only (ephemeral)

- Signing Session (PRF output / private key)
- Session expiry timer
- Active balance (re-fetched from RPC on Continue)

The signing session ends after 10 minutes, page reload, or Lock. The PRF output is never written to storage.

## What recovers

### From the Passkey alone

✅ **Same Passkey → same Account/address**  
The Passkey's PRF output is the secp256k1 private key. Same Passkey + same PRF salt = same key = same EOA.

✅ **Balance from chain**  
Balance is read from Monad RPC after Continue. Local cache is not the source of truth.

### Lost after clearing localStorage

❌ **Local activity cache**  
Only payments sent from this device. Not a full chain index.

❌ **Acceleration hint**  
Continue will show the platform Passkey picker. Slightly slower, but recovers the same Account.

## Sign Out vs Lock

### Lock
Ends the signing session and clears in-memory state. Does **not** clear localStorage (credentialId, activity). Use Lock to pause briefly and Continue without re-selecting your Passkey.

### Sign Out
Clears localStorage (credentialId + activity) **and** ends the session. Does **not** delete your Passkey. Use Sign Out to clear this device's records while keeping your Account.

## Recovery scenarios

### After signing out

1. User clicks "Sign Out" → localStorage cleared, Passkey kept
2. User clicks "Continue" → no stored credentialId → platform Passkey picker
3. User selects their Passkey → same PRF → **same Account/address**
4. Activity cache is empty, but balance comes from RPC

### After clearing site data

Same as signing out: localStorage gone, Passkey kept (stored in authenticator), same recovery flow.

### On a new device

User on a new device with the same Passkey (synced via iCloud Keychain, Windows Hello, etc.):

1. No localStorage on new device
2. User clicks "Continue" → platform Passkey picker
3. User selects synced Passkey → same PRF → **same Account/address**
4. Balance from RPC, no local activity

## Manual verification

1. **Record your address**: note the address on the Home screen
2. **Sign out**: click "Sign Out" on the Home screen
3. **Continue**: click "Continue with Face ID / Touch ID" on the landing page
4. **Verify**: the address matches, balance is fetched from RPC

## Technical details

- PRF output is the secp256k1 key (ADR 0001)
- `continueThenCreate` always tries Continue first (ADR 0005)
- Signing Session is ephemeral, never in storage (ADR 0006, 0007)
- Browser-only: no Flowpay backend holds keys or indexes accounts (ADR 0002)

See also: `docs/adr/`
