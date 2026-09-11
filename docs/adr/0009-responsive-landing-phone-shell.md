# Landing may recompose at lg; App shell stays phone-column

Flowpay is mobile-first in CSS, but not uniformly fluid. The landing (`/`) may use a marketing two-pane layout from `lg` (1024px) upward, with a live HTML synthetic Pay mock labeled as illustration. After Continue, the App shell (Home / Pay / Swap) stays a centered phone-column: `min(100%, 430px)` plus horizontal safe-area, including landscape — no second nav topology. Viewport must use `viewport-fit=cover` so existing bottom safe-area padding works on iPhone. Full desktop Operate layouts and unsigned “real” balances in the mock are out of scope.

**Status**: accepted

**Considered Options**
- Full breakpoint Operate layouts (rejected: fights key-desk / tab-bar task model)
- Phone-column everywhere including landing (rejected: user wants marketing-width landing)
- Landing read-width only / light split without mock (rejected: user chose marketing recomposition + synthetic UI)
- Static mock image (rejected: drifts from Pay UI; live Vue/HTML preferred)

**Consequences**
- Do not “fix” App shell into a fluid desktop app without superseding this ADR
- Landing surface brief owns the wide composition; Operate pages keep phone-column chrome
- Synthetic mock must not call account/session stores or send transactions
