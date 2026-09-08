# Whole-branch review: final fix report

**Date:** 2026-09-08
**Status:** FIXED

## Fixes

1. **SSR deep links:** the session middleware now preserves `uri` when redirecting `/pay` to `/`. The landing page stashes that query value on mount and immediately before Continue; a successful Continue still navigates to `/pay`, which consumes the pending URI.
2. **Weak URI warnings:** `missing_chain` and `bad_value` now render through a separate muted warning slot. Parse, ENS, amount, balance, and send failures remain in the red error slot.
3. **EIP-55:** mixed-case hex targets are strictly checksum-validated and return `{ ok: false, error: 'checksum' }` when invalid. Lowercase and uppercase non-checksummed addresses remain accepted and normalized.
4. **Explicit send after prefill:** scan, paste, and deep-link application mark the form as externally prefilled. Enter is then suppressed, while clicking Send remains functional; no path auto-sends.
5. **iOS camera fallback:** when `BarcodeDetector` is unavailable, live scanning uses ZXing `decodeFromVideoDevice`. Scanner controls use the same generation check as native media streams, and stale controls are stopped.

## Commands and results

- `pnpm vitest run tests/eip681.test.ts`
  - RED confirmed: the invalid mixed-case checksum was normalized instead of rejected (1 failed, 11 passed).
- `pnpm vitest run tests/eip681.test.ts tests/media-stream.test.ts`
  - Second RED confirmed after adding scanner cleanup coverage: missing `keepCurrentScannerControls` (1 failed, 14 passed).
- `pnpm vitest run tests/eip681.test.ts tests/media-stream.test.ts && pnpm typecheck`
  - Passed after implementation: focused tests and Nuxt typecheck exited 0.
- `curl -sS -D - -o /dev/null 'http://127.0.0.1:3210/pay?uri=ethereum%3A0x000000000000000000000000000000000000dEaD%4010143'`
  - Passed: `HTTP/1.1 302 Found`
  - Passed: `location: /?uri=ethereum:0x000000000000000000000000000000000000dEaD@10143`
- `pnpm test && pnpm typecheck`
  - Passed: 4 test files, 18 tests; Nuxt typecheck exited 0.
- `git diff --check`
  - Passed with no whitespace errors.

## Notes

- No transaction auto-send behavior was added.
- Swap and gas behavior were not changed.
- The unrelated ESLint duplicate-plugin configuration was not changed.
