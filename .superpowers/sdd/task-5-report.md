# Task 5 Report: Apply URI on Pay + scan + recent recipients

**Status:** DONE_WITH_CONCERNS

**Commit:** `7563cf7` — feat: pay scan/paste/URI apply and recent recipients

**Verification:** `pnpm typecheck` passed; `pnpm test` passed (14/14); `git diff --check` passed.

**Report path:** `.superpowers/sdd/task-5-report.md`

## Files changed

- `app/components/PayScanControl.vue` — native `BarcodeDetector` camera scanning, ZXing image fallback, clipboard paste, and media-track cleanup.
- `app/pages/pay.vue` — chain-10143 URI/ENS application, query and pending-URI hydration, scan integration, and five unique recent recipients.
- `i18n/i18n.config.ts` — zh-CN and English scan, paste, URI warning, and error copy.
- `package.json`, `pnpm-lock.yaml` — `@zxing/browser`.

## Concerns

- Browser camera, permission-denial, clipboard, and image-upload flows were not smoke-tested on a physical browser/device.
- The repository ESLint command is blocked before file analysis by an existing duplicate `import` plugin configuration (`nuxt/import/rules` and `antfu/imports/rules`). IDE diagnostics show only two pre-existing Tailwind suggestions in `pay.vue`.

## Important findings follow-up

**Status:** FIXED

### What changed

- Added a camera generation token. Each camera request captures its generation and the returned stream locally; stale streams are stopped before they can reach shared state.
- `stopCamera` now invalidates pending requests, cancels scanning, and stops the active stream. Unmount still closes the panel and calls this cleanup.
- Added focused regression coverage for retaining current streams and stopping stale streams. Payment submission behavior was not changed; scans still only populate the form and never auto-send.
- Pinned `@zxing/browser` to `0.1.5` and its peer `@zxing/library` to `0.21.3`. The selected browser package has no Node engine restriction and the library requires only Node `>=10.4.0`, so the pair supports Node 22.

### Commands and output summary

- `pnpm test tests/media-stream.test.ts` — observed the missing-helper failure first, then passed (2/2) after implementation.
- `CI=true pnpm install --no-frozen-lockfile` — refreshed dependencies and lockfile successfully.
- `CI=true pnpm install --frozen-lockfile` — passed; lockfile is current.
- `pnpm typecheck` — passed.
- `pnpm test` — passed: 4 files, 16 tests.
- ZXing package metadata check — `@zxing/browser@0.1.5` has no engine constraint; `@zxing/library@0.21.3` requires Node `>=10.4.0`.
- `git diff --check` — passed.
