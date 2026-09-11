# One CTA: Continue first, Create only if needed

The primary control is a single Passkey action. It calls Mera `getPasskeyPrfOutput` first (Continue). If no discoverable Passkey is available, it calls `createPasskeyWithPrfOutput` (Create). We do not split the UI into register vs login, and we do not always Create — that would mint a new Account on every visit and break Stateless recovery.

**Status**: accepted
