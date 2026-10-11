---
version: 1
slug: "app-pages-index-vue"
primary_target: "app/pages/index.vue"
related_targets: []
---

# /

- **Mode:** Persuade
- **Audience / job:** First visit — crypto newcomers and hackathon judges who need to understand Flowpay before Passkey, then continue into the app.
- **Action:** One primary Continue CTA → Signing Session → `/pay`. Deep-link `uri` stashed silently.
- **Direction:** Mobile-first Compact dossier with compact to+amount slip under CTA on narrow; `lg` two-pane. Hint + Passkey-as-account judge cue. Soft empty `0.00` amount labeled non-live. ADR 0009.
- **Memorable moment:** Brand + Face ID courage; slip supports on every viewport without competing Send.
- **Constraints:** No fabricated proof; no deep-link UI; no multi-CTA hero; no Operate desktop shell; mock never touches stores.
