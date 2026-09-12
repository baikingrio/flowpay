# Mock GitHub + Passkey Bind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship mock GitHub app login, forced Passkey bind page, middleware gates, hide TopBar session countdown, Settings logout-for-mock-GitHub — without real OAuth or persisting keys.

**Architecture:** `app-auth` + `bound-address` localStorage helpers; landing mock CTA; `/bind` uses existing `useSigningSession().open()`; global middleware enforces auth→bind→app; TopBar shows GitHub mock identity, not session seconds.

**Tech Stack:** Nuxt 4, Vue 3, existing Mera Passkey `open()`, vitest, i18n.

**Spec:** `docs/superpowers/specs/2026-09-12-mock-github-passkey-bind-design.md`

## Global Constraints

- Mock only — UI must say 模拟登录; no GitHub API
- Never store PRF / session keys (ADR 0006/0007)
- Browser-only for this slice (ADR 0002) — no Nitro OAuth
- Bilingual i18n; DESIGN.md visuals
- Clear-local / signOut must clear new keys

## File map

| File | Responsibility |
|------|----------------|
| `app/lib/app-auth.ts` | read/write/clear mock GitHub session |
| `app/lib/bound-address.ts` | read/write/clear bound EOA |
| `tests/app-auth.test.ts` | storage tests |
| `tests/bound-address.test.ts` | storage tests |
| `app/pages/index.vue` | mock GitHub CTA |
| `app/pages/bind.vue` | forced Passkey bind |
| `app/middleware/session.global.ts` | auth + bind gates (extend) |
| `app/components/AppTopBar.vue` | identity chip; remove countdown |
| `app/pages/settings.vue` | 退出 GitHub（模拟） |
| `app/composables/useSigningSession.ts` | ensure clear-local clears auth/bound |
| `i18n/i18n.config.ts` | copy |

---

### Task 1: Storage helpers + tests

**Interfaces:**
- `AppAuthSession = { provider: 'github'; login: string; name: string; avatarUrl?: string; mock: true; authAt: number }`
- `readAppAuth` / `writeAppAuth` / `clearAppAuth` (optional `Storage`)
- `readBoundAddress` / `writeBoundAddress` / `clearBoundAddress`
- Keys: `flowpay.appAuth`, `flowpay.boundAddress`

- [ ] Failing tests → implement → pass → commit `feat: mock app auth and bound address storage`

---

### Task 2: Middleware + bind page + landing CTA

- Landing primary: mock GitHub continue → `writeAppAuth` with fixed demo profile (e.g. login `demo-dev`) → navigate `/bind`
- `/bind`: show mock user; button calls `open()`; on success `writeBoundAddress(account.address)` → `/home`
- Middleware:
  - no auth → force `/` (except public assets)
  - auth && !bound → force `/bind`
  - auth && bound → allow app routes; `/` may redirect `/home` if session or bound
- Preserve `?uri=` stash behavior for pay deep links where possible

- [ ] Implement → typecheck → commit `feat: mock GitHub landing and forced Passkey bind`

---

### Task 3: TopBar / Settings / clear-local / i18n / docs note

- Remove default session countdown from TopBar; show mock GitHub name when authed
- Soft Continue entry when `sessionExpired` or action needs session (keep minimal, not a clock)
- Settings: 退出 GitHub（模拟）→ `clearAppAuth` + end live session → `/`
- `signOut` / clear-local: also `clearAppAuth` + `clearBoundAddress`
- i18n zh-CN + en including mock disclaimer
- Short note in PRODUCT.md or MVP: mock GitHub gate; real OAuth later

- [ ] `pnpm test && pnpm typecheck` → commit → open PR

---

## Spec coverage

| Spec | Task |
|------|------|
| appAuth / boundAddress storage | 1 |
| Landing → bind → home + middleware | 2 |
| TopBar / Settings / clear / copy | 3 |

## Placeholder scan

No TBD. Real OAuth explicitly deferred.
