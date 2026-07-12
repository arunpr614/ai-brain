# Kanban Card Processing — design QA

**Date:** 2026-07-12
**Selected target:** Direction B Inbox, desktop 1440×1024 and mobile 390×844/320×844
**Final result:** blocked

final result: blocked

## Evidence compared

- Source desktop: `Kanban-designs/prototypes/screenshots/direction-b-inbox-desktop-1440x1024.png`
- Implementation desktop: `/tmp/processing-desktop-dark-final-1440x1024.png`
- Source mobile: `Kanban-designs/prototypes/screenshots/direction-b-inbox-mobile-390x844.png`
- Implementation mobile: `/tmp/processing-mobile-dark-390x844.png` and `/tmp/processing-mobile-dark-320x844.png`
- Combined comparisons: `docs/feature-council/kanban-card-processing/qa/visual-comparison-desktop-1440x1024.png` and `visual-comparison-mobile-390x844.png`

## Current assessment

The production mapping preserves Direction B's dark information hierarchy, serif title, neutral metrics, four work views, bounded filters, split queue/detail model, current application navigation, and mobile bottom navigation. Prototype-only banners and review controls were correctly omitted. The compact desktop Group & sort disclosure now matches the approved two-row 322px handoff rather than rendering an unbounded menu.

### Findings

1. **Resolved P1 — 320px view navigation clipping:** the initial 320×844 capture omitted Archived. The control now uses a four-column grid with narrow-screen spacing and a hidden mobile Inbox badge. Browser recapture proves all four tabs visible, enabled, selected in turn, and 44px high with `clientWidth === scrollWidth` at both 320 and 390. Evidence: `implementation-mobile-tabs-archived-320x844.png` and `implementation-mobile-tabs-archived-390x844.png` in the feature QA directory.
2. **P2 — mobile metric density:** implementation metrics are taller than the reference, but primary actions remain above them and the hierarchy is clear. Re-evaluate on the recapture; compact only if it materially delays the first Inbox row at 390px.
3. **P3 — fixture differences:** implementation screenshots contain three synthetic Inbox sources rather than the five reference sources. This is acceptable if spacing and empty/detail behavior remain faithful.

## Blocking reason

Application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` is deployed at the browser-accessible production URL with read, write, and navigation stages enabled. Server-side authenticated workflow, privacy, readiness, integrity, audit-timer, and observation-window evidence is green. Both the selected in-app browser and the available Chrome profile currently reach the production PIN unlock screen without an authenticated session. Per the selected Product Design workflow, server/API evidence and prior local screenshots do not substitute for a fresh authenticated same-viewport browser verification. The gate remains blocked only on the owner unlocking the handed-off Chrome tab.

## Required unblock checks

- 1440×1024 and 390×844 dark/light captures from deployed `ea7b159`.
- Reconfirm the already-passing 320×844 four-view proof on the final browser-accessible candidate SHA.
- Process next, select/open separation, Move+Undo, Archive/Restore/Reprocess, Group & sort, filters, enrollment, load-more/group paging, error/offline, keyboard focus return, and console-error checks.
- Update this document to `Final result: passed` only after all P0/P1/P2 findings are resolved or explicitly downgraded with evidence.
