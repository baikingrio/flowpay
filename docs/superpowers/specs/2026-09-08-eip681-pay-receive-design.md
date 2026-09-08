# Design: EIP-681 receive & pay (QR + deep link)

**Date:** 2026-09-08  
**Status:** approved for planning  
**Product framing:** real payment usability first (not judge-demo theatrics)

## Goal

Make Flowpay payments usable for real people: show a scannable receive code, fill the pay form by scan/paste/link, optionally include amount, and support EIP-681 as the wire format—including shareable HTTPS deep links and ENS when resolvable.

## Non-goals (deferred)

- Custom URL schemes (`flowpay://`)
- ERC-20 `/transfer` EIP-681 function calls (native MON only this round)
- Aggregators, Swap, or paymaster
- Flowpay backend / indexer (ADR-0002)

## Decisions

| Topic | Choice |
|-------|--------|
| Standard | [EIP-681](https://eips.ethereum.org/EIPS/eip-681) / ERC-681 |
| Chain | Always encode `@10143` (Monad testnet) on outbound URIs |
| Receive default | `ethereum:<address>@10143` |
| Receive + amount | `ethereum:<address>@10143?value=<wei scientific>` |
| App share link | `https://<origin>/pay?uri=<urlencode(eip681)>` |
| Pay apply | Prefill recipient (+ amount if `value`); never auto-send |
| ENS | Parse per EIP-681; resolve via RPC when possible; fail clearly if chain has no ENS |
| Camera | Best-effort; paste + image pick are first-class fallbacks |

## Information architecture

### Receive (Home)

- Action near the account address opens an inline panel (not a blocking modal-first flow).
- Panel: optional amount, QR of EIP-681 URI, copy bare address, copy URI, copy HTTPS pay link.
- QR encodes the URI; human copy of address stays bare `0x`.

### Pay (`/pay`)

- Recipient row: text field + scan control.
- Inputs share one parser: clipboard paste, live camera, image pick, and `?uri=` query.
- Recent recipients: derived from local successful payment activity (address only).
- Send remains explicit confirmation.

### Deep link

- Entry: `/pay?uri=…` only.
- If no account yet: stash raw URI in `sessionStorage`, run Continue, then hydrate `/pay` and clear stash on success.
- Lock clears signing session but **keeps** pending URI so the user can resume the request after Continue.

## Module boundaries

```
app/lib/eip681.ts     build + parse (pure)
app/lib/ens.ts        resolveEnsName (RPC; soft-fail)
app/lib/qr.ts         thin helpers / dynamic import seams
components            PayReceivePanel, PayScanControl
pages/home.vue        host receive panel
pages/pay.vue         host scan + hydrate from ?uri= / sessionStorage
middleware            unchanged auth gate; hydrate after session exists
```

- Session keys stay in `useSigningSession` module closure (ADR-0007).
- Pinia holds public projection only; do not persist full URI lists in Pinia.
- No Nitro routes for this feature.

### `eip681` behavior

- Build: address required; chainId `10143`; optional `value` in wei (scientific notation OK).
- Parse accepts: full URI, optional `pay-` prefix, bare `0x`+40 hex, surrounding whitespace.
- Reject: wrong chainId; `/function_name` paths (e.g. ERC-20 transfer); checksum failures (prefer hard reject).
- Missing chainId: accept address with a weak warning.
- Present `value` that fails to parse: keep address, warn that amount was not imported.

### ENS

- If target is ENS name, call `resolveEnsName`.
- Hex addresses never go through ENS.
- On Monad testnet without a resolver: user-visible error, no fake address.

## Data flow

1. Home receive → `buildPaymentUri` → QR / copies / HTTPS link.
2. Pay scan/paste/link → `parsePaymentUri` → optional ENS resolve → write `recipient` + optional amount.
3. Cold open `/pay?uri=` without session → `sessionStorage` → Continue → hydrate → clear.
4. Successful send → existing `send` + `recordPayment` (recent recipients).

## Errors & permissions

| Case | UX |
|------|-----|
| Camera denied / missing | Paste or pick image; pay still works |
| Unreadable QR | Retry; do not wipe amount unless new URI supplies `value` |
| Bad format | Do not write fields; explain `0x` or `ethereum:` |
| Wrong chain | Reject with network message |
| Unsupported function URI | “Native MON payment requests only” |
| ENS unresolved | Do not fill; explain possible lack of ENS on testnet |
| Invalid deep-link uri | Empty pay form + one-shot error |

Security: URIs contain only public intent; never auto-broadcast; no new server surface.

## Testing

- Unit: `eip681` vectors (with/without value, scientific notation, `pay-` prefix, wrong chain, function reject, bare address).
- Unit: ENS resolve success/fail with mocks.
- Manual: external wallet scans Flowpay receive QR; Flowpay scans own QR; `/pay?uri=` survives Continue.

## Success criteria

A user can show a scannable receive code (optionally with amount), and another path (scan, paste, or HTTPS link) can prefill pay and send only after explicit confirmation—with actionable errors instead of dead ends.

## Out of scope for later slices

- Swap AMM path
- Gas sponsorship
- Custom schemes / installable PWA payment handlers
