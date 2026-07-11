# Recall manual sync acceptance evidence matrix

Source of truth: `prd-v2.md`, `ux-ui-v2.md`, and `technical-plan-v2.md`
Status: implementation in progress
Rule: a criterion is **Passed** only when the independent QA/reviewer records concrete automated or manual evidence. Code presence alone is not a pass.

| AC | Requirement | Primary evidence | Status |
| --- | --- | --- | --- |
| 1 | Owner placement, auth-first `401`, exact-origin POST | Route tests; Settings screenshot | Pending |
| 2 | Last-success advances only after final validated success; no-new-items qualifies | Lifecycle/wrapper fault tests; DB assertions | Pending |
| 3 | Never-synced and unavailable/stale/past schedule behavior | Repository/route/UI state tests | Pending |
| 4 | UTC wire values and identical IST copy across zones/boundaries | Multi-time-zone unit and browser tests | Pending |
| 5 | Dialog trap, safe dismissal paths, no overlay dismissal, focus return, no accidental request | Keyboard/focus interaction tests and manual evidence | Pending |
| 6 | Requesting state and same-key ambiguous-response recovery | Controller/route integration tests | Pending |
| 7 | Both accepted POST forms return `202` after durable persistence | Route and persistence-failure tests | Pending |
| 8 | Healthy claim within 10 seconds; lost wake recovery within 75 seconds | Worker/path/fallback process tests | Pending |
| 9 | Concurrent tabs, POSTs, and workers produce one active request and at most one apply | Multi-connection/process race tests | Pending |
| 10 | Server-authoritative cooldown, expiry, and countdown remain truthful with terminal results | Repository/route/controller tests; screenshots | Pending |
| 11 | Guarded wrapper and both locks are reused; automatic/manual work cannot interleave or skip | Wrapper process traces; timer-invariance fixture | Pending |
| 12 | Refresh, navigation, restart, reconnect, and multi-tab restore; offline/auth are overlays | Controller/component integration tests; manual browser evidence | Pending |
| 13 | Heartbeat separates healthy long work from killed stale work without duplicate run | Lifecycle/reconciler process tests | Pending |
| 14 | Late-card failure persists exact prior writes without checkpoint/last-success advance | Fault-injection runner/lifecycle tests | Pending |
| 15 | Zero, partial, and unknown-write copy follows persisted proof | Aggregate formatter and component state tests | Pending |
| 16 | Every durable/overlay state renders with persistent metadata and bounded counts | State matrix tests; responsive screenshots | Pending |
| 17 | Polling cadence, visibility/online refresh, abort, ordering, stop rules, and transition-only announcements | Fake-timer/controller tests; live-region manual evidence | Pending |
| 18 | 1440/1024/390/320, themes, keyboard, screen reader, zoom, bottom nav, 44px, AA, reduced motion | Browser screenshots, measurements, axe/manual evidence | Pending |
| 19 | DTO, log, and event output is allowlisted and private | Privacy schema/tests and public-doc scans | Pending |
| 20 | Feature and new units default off; rollback preserves daily automation, history, and active work | Static config/unit tests; rollback review | Pending |
| 21 | Type, lint, unit, route, worker, process, wrapper, privacy, regression, full test, and production build gates | Final command ledger | Pending |

## Required independent-review outputs

- Criterion-by-criterion disposition with test/file/evidence references.
- Severity-ranked implementation findings with no unresolved critical or high item.
- A production-enablement boundary statement: host credential/identity/permission proof remains unperformed and unauthorized.
- A timer invariant statement based on fixtures/static unit evidence only; no live timer mutation.
- A release-risk and rollback review.

## Evidence index

| Evidence | Location | Status |
| --- | --- | --- |
| Supplied-design renders | `visual-evidence/desktop-*`, `mobile-*`, `states-*` | Complete; discovery only |
| Revised-prototype renders | `visual-evidence/revised-states-*` | Complete; composition and overflow only |
| Implementation screenshots | `visual-evidence/implementation-*` | Pending |
| Automated command ledger | Final QA report | Pending |
| Independent code/adversarial review | Final QA and implementation-review reports | Pending |
| Wiki publication proof | Wiki publication report and fresh-clone comparison | Pending |
