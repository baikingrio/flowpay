---
target: 落地页 / app/pages/index.vue
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 2
timestamp: 2026-09-08T09-06-38Z
slug: app-pages-index-vue
---
# Critique: app/pages/index.vue (landing)

Method: dual-agent (A: design · B: detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | opening / alert present; little pre-ceremony status |
| 2 | Match System / Real World | 2 | Face ID good; PRF / Signing Session in fold |
| 3 | User Control and Freedom | 2 | Forward-only gate; cancel is OS WebAuthn |
| 4 | Consistency and Standards | 3 | Mock matches Pay desk; lg hero vs narrow fold jump |
| 5 | Error Prevention | 2 | PRF device limit only after failure |
| 6 | Recognition Rather Than Recall | 3 | Mock helps; path titles are jargon |
| 7 | Flexibility and Efficiency | n/a | Persuade landing |
| 8 | Aesthetic and Minimalist Design | 3 | Discipline high; dual black CTAs + keypad noise |
| 9 | Error Recovery | 3 | Retry copy exists; weak recovery path on page |
| 10 | Help and Documentation | n/a | Persuade landing |
| **Total** | | **23/32** | **Fair–Good** |

## Design Specificity Verdict

**LLM:** Half-pass. Structure is Flowpay (brand hero, one Continue, labeled synthetic Pay, clinical paper). Visual mechanism is still interchangeable minimal crypto-pay (black pill + keypad card). First viewport sells “pay UI,” not “Passkey is the account.”

**Deterministic scan:** `detect.mjs` on `index.vue` + `PayKeyDeskMock.vue` → `[]` (exit 0). No antipattern hits. No browser overlay (no browser automation in session).

## Overall Impression

First viewport executes the ADR 0009 two-pane brief cleanly, but the synthetic **发送** competes with the real Face ID CTA, and the fold leans on infra jargon. Biggest opportunity: make the illustration subordinate and make the Passkey-account promise the memory, not the keypad.

## What's Working

1. Brief/ADR fidelity: single primary CTA, silent deep-link, “界面示意” label, no store on mock.
2. Clinical world consistency: canvas, hairline, 18px radii, Geist display — not purple-AI slop.
3. Full persuade path below fold: promises → steps → closing CTA with restrained motion.

## Priority Issues

### [P0] Dual primary buttons on first viewport
- **What:** Mock “发送” matches the real Continue button (ink fill, similar height).
- **Why:** Splits attention; newcomers may think they are already in-app.
- **Fix:** Demote mock send (ghost/outline/disabled look), crop keypad, or show amount+to only.
- **Suggested command:** `$impeccable quieter app/pages/index.vue` or `$impeccable layout`

### [P1] Trust pollution in mock data
- **What:** `0x0000…dEaD` + rigid `0.001 MON` reads as joke/demo ledger.
- **Why:** Undermines self-custody seriousness for judges and newcomers.
- **Fix:** Neutral placeholder address/amount or emptier desk; keep “示意” label.
- **Suggested command:** `$impeccable clarify` + small mock edit

### [P1] Jargon wall in dossier
- **What:** PRF / Signing Session appear before Continue.
- **Why:** Breaks “like a normal app” emotional arc.
- **Fix:** Human promises first; jargon secondary or deferred.
- **Suggested command:** `$impeccable clarify`

### [P2] Missing first-viewport claim strip
- **What:** i18n `hint` (no seed · no extension · no custody) unused on page.
- **Why:** Weakens vs wallet-extension narrative at the decision moment.
- **Fix:** Soft line under CTA (not a second button).
- **Suggested command:** `$impeccable polish`

### [P2] Wide-to-narrow scroll cliff
- **What:** lg hero `max-w-6xl` then fold snaps to phone-width dossier.
- **Why:** Feels like two sites stacked.
- **Fix:** Wider reading measure on fold or intentional “into the dossier” transition.
- **Suggested command:** `$impeccable layout`

## Persona Red Flags

**Crypto newcomer:** Hex + keypad implies address labor; fake Send looks clickable; PRF/Signing Session after scroll creates fear.

**Hackathon judge:** No Mera / One-prompt / Stateless signal in 5s; dEaD mock hurts seriousness; Swap “coming next” undercuts demo narrative.

## Minor Observations

- Settle animation only on left pane.
- EN toggle feels bolted on.
- Closing CTA width ≠ hero CTA at lg.
- English “Illustration” weaker than 界面示意.

## Questions to Consider

1. If the keypad vanished and only “到 + 金额” remained, would the memory be Face ID or Pay UI?
2. In five seconds, must a judge believe “can pay” or “Passkey is the account / Stateless”?
3. Is `dEaD` worth the trust cost on a self-custody first screen?
