---
target: 落地页 / app/pages/index.vue
total_score: 25
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
timestamp: 2026-09-10T08-35-55Z
slug: app-pages-index-vue
---
# Critique: app/pages/index.vue (landing) — round 2

Method: dual-agent (A: design · B: detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | opening + alert; little pre-ceremony status |
| 2 | Match System / Real World | 3 | Face ID fluent; residual custodial/MON/testnet phrasing |
| 3 | User Control and Freedom | 2 | Forward-only; cancel is OS WebAuthn |
| 4 | Consistency and Standards | 3 | Quiet mock + wider fold; EN still bolted |
| 5 | Error Prevention | 2 | Hint helps story; PRF limit still post-click |
| 6 | Recognition Rather Than Recall | 3 | Hint + path clear; judge cues still off-surface |
| 7 | Flexibility and Efficiency | n/a | Persuade landing |
| 8 | Aesthetic and Minimalist Design | 4 | Prior dual-black P0 resolved; one primary ink CTA |
| 9 | Error Recovery | 3 | Retry copy; weak alternate recovery on page |
| 10 | Help and Documentation | n/a | Persuade landing |
| **Total** | | **25/32** | **Good** |

Prior run: 23/32. Delta: +2 (aesthetic, real-world).

## Design Specificity Verdict

**LLM:** Pass on story, soft-fail on mechanism. First viewport sells Passkey/Face ID + three refusals; cropped slip no longer cosplays Operate. Visual world remains interchangeable clinical fintech if brand strings are stripped.

**Deterministic scan:** `detect.mjs` → `[]` (exit 0). Browser overlay skipped (no automation).

## Overall Impression

The quieter/clarify/layout/polish pass worked: attention belongs to Continue again. Biggest remaining opportunity is dual-audience balance — newcomers are safer; judges still get almost no Mera/Stateless signal in five seconds — plus a mobile hero with no product visual.

## What's Working

1. Dual-primary P0 fixed; mock has no Send/keypad.
2. Hint under CTA at the decision moment.
3. Honest slip (neutral address, labeled non-live) and humanized dossier.

## Priority Issues

### [P1] Judge 5-second signal missing
- **What:** No Mera / One-prompt / Stateless cue in hero or early fold.
- **Why:** PRODUCT weights judges equal to newcomers; surface reads pure Web2 Face ID.
- **Fix:** One verifiable secondary line (not a second CTA) or path microcopy judges recognize.
- **Suggested command:** `$impeccable clarify` (careful not to re-jargon newcomers)

### [P1] Mobile first viewport has no product visual
- **What:** Mock is `lg:block` only.
- **Why:** Phone is primary; memorable moment collapses to type.
- **Fix:** Compact slip below CTA on narrow, or other light visual anchor.
- **Suggested command:** `$impeccable adapt` or `$impeccable layout`

### [P2] Ghost amount feels unfinished
- **What:** Gray `— MON` can read broken rather than ready.
- **Why:** Two-pane pays complexity without a credible pay moment.
- **Fix:** Soft sample amount clearly labeled, or emptier desk without dash-as-value.
- **Suggested command:** `$impeccable quieter` / small mock edit

### [P2] Swap path undercuts demo
- **What:** “即将接入 / comes next” in the three-step path.
- **Why:** Judges hear unfinished third beat.
- **Fix:** Soften to capability without fake readiness, or demote Swap in path.
- **Suggested command:** `$impeccable clarify`

### [P3] Lang toggle bolted
- Absolute chip with no dossier relationship.
- **Suggested command:** `$impeccable polish`

## Resolved since last run

- P0 dual black Continue vs mock Send
- P1 dEaD / rigid 0.001
- P1 PRF/Signing Session jargon wall (mostly)
- P2 unused hint
- P2 wide→narrow cliff (mostly)

## Persona Red Flags

**Newcomer:** Much improved; “托管后端” still abstract; mobile no preview of post-Continue UI; PRF failure after courage click.

**Judge:** 5s = Face ID app, not Mera/Stateless demo; quiet mock proves honesty not payment capability; Swap admits unfinished wiring.

## Minor Observations

- Closing CTA mirrors hero without new reason.
- EN mock caption weaker than 界面示意.
- Tagline long; settle motion tasteful.

## Questions to Consider

1. What single non-Face-ID word must a non-scrolling judge see in 5s?
2. Is gray em dash bravest quiet — or empty form wearing a caption?
3. Does desktop two-pane still earn complexity if the right pane refuses a credible pay moment?
