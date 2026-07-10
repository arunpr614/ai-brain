# AI Memory UX v2 Final Feature Classification And Gap Analysis

Created: 2026-06-14 10:15 IST
Status: Final planning inventory for next app agent

## Classification Legend

- Existing: behavior is present in source evidence, but still needs fresh QA evidence before release.
- Partial: behavior exists but UX v2 states, parity, data handling, or verification remain incomplete.
- Missing: no working implementation found in inspected source evidence.
- UX redesign only: behavior exists; remaining work is visual/copy/layout/design-system alignment.
- Inferred from design: appears in design/prototype but production scope is not confirmed.
- Needs user decision: do not implement until Arun/Product confirms product behavior.
- No-go until verification: planning exists, but a verification gate blocks execution.

## Codebase Verification Summary

Web codebase found under `../../src`: Next.js app with API routes, server actions, SQLite, retrieval, capture, Ask, item detail, settings, service worker, and shared components.

Android codebase found under `../../android`: Capacitor Android shell loading the hosted web app, with Android resources, manifest, share intents, pairing/offline surfaces, and launcher assets. This is not a separate native Android UI stack.

See `05_REPRODUCIBILITY_SNAPSHOT.md` for branch, commit, dirty count, file inventory, and line-level source citations.

## Feature Inventory

| ID | Feature | Web status | Android status | Classification | Final planning artifact | Current gate |
| --- | --- | --- | --- | --- | --- | --- |
| BRAND-01 | AI Memory product name | Present in many surfaces | Launcher label present | UX redesign only | COPY-01 root spec, PRD-16 QA | Brand copy search before release |
| BRAND-02 | Logo and app icons | Present | Launcher assets present | UX redesign only | DS-01 root spec, PRD-16 QA | Screenshot/APK evidence |
| DS-01 | Prism Memory design system | Present | Shared web tokens | UX redesign only | Design traceability, DS-01 root spec | Magic freshness gate |
| WEB-01 | Desktop shell/navigation | Present | N/A | Existing | PRD-16 QA | Fresh QA evidence |
| MOB-01 | Mobile bottom nav Library/Capture/Ask/More | Coded | Coded via WebView | No-go until verification | PRD-11-SHELL, PRD-11-FU | G-001 |
| MOB-02 | Route-aware raised Capture | Coded | Coded via WebView | Partial | PRD-11-FU | More route decision |
| AUTH-01 | Setup/unlock/login | Existing older flow | Existing older flow | Partial | PRD-15 | Device/emulator evidence for Android claims |
| AUTH-02 | Device pairing success/failure | Existing route | Required | Partial | PRD-15 | D-008/D-013 |
| AUTH-03 | Session expired state | Not clearly found | Not clearly found | Missing | PRD-15 | PRD-15 state matrix |
| OFFLINE-01 | Static offline fallback | Present | Present via Capacitor fallback | Partial | PRD-14/PRD-15 | No active queue/download claims |
| LIB-01 | Library browse/search/filter | Present | Responsive web | Existing | PRD-16 QA | Fresh screenshots |
| LIB-02 | Multi-select/Ask selected | Present | Selection controls, long press unverified | Partial | PRD-11-FU | G-001 and D-005 |
| CAP-01 | URL/PDF/note capture | Present | Shared web/share APIs | Existing | PRD-06-FU | Fresh QA evidence |
| CAP-02 | Paste text/paste-link capture | Partial | Partial | Partial | PRD-06-FU/PRD-10/PRD-12 | Attachment decision if used in Ask |
| CAP-03 | Full/metadata/preview/duplicate/update/error result states | Basic partial | Share result missing | Partial | PRD-06-FU/PRD-13 | G-001 before implementation |
| SHARE-01 | Android share intent capture | N/A | Existing partial | Partial | PRD-13 | G-005 device gate |
| SHARE-02 | Android share result/repair surface | N/A | Missing | Missing | PRD-13 | PRD-06 dependency and G-005 |
| NEEDS-01 | Needs Upgrade queue | Present | Reachable via More | Existing queue, repair missing | PRD-10 | Repair flow missing |
| REPAIR-01 | Add text/transcript repair | Backend partial | Shared responsive path needed | Partial | PRD-10 | PRD-06 dependency |
| REPAIR-02 | Mark good enough/merge duplicate | Ambiguous | Ambiguous | Needs user decision | PRD-10 | D-004 |
| REPAIR-03 | Derived-state reset after repair | Not proven | Not proven | Missing | PRD-10 | Mandatory data safety gate |
| ITEM-01 | Web item detail/right rail/focus | Present | Responsive web | Existing web, partial Android | PRD-11-FU/YT-01 | Fresh QA evidence |
| ITEM-02 | Android tabbed item detail | N/A | Missing | Needs user decision | PRD-11-FU or new PRD | D-005 |
| ITEM-03 | YouTube item detail/media metadata | Generic detail present | Generic responsive detail | Partial | YT-01 root lightweight spec | D-014 |
| TAX-01 | Tags/topics/collections | Present | Responsive web | Existing | PRD-16 QA | Fresh QA evidence |
| ASK-01 | Library/item/selected/tag/topic/collection scope | Present/partial | Responsive web | Partial | PRD-09-FU | D-001/D-003 |
| ASK-02 | Scope banner, weak warnings, citations | Present | Mobile layout partial | Partial | PRD-09-FU/PRD-12 | D-001/D-002 |
| ASK-03 | Attached context override | Missing | Missing | Missing | PRD-09-FU/PRD-12 | D-001 |
| ASK-04 | High-quality-only scope | Token/design only | Missing | Missing | PRD-09-FU | D-002 |
| ASK-05 | Android Ask composer/history sheets | N/A | Missing | Missing | PRD-12 | PRD-09 dependency |
| SETTINGS-01 | Settings/More/trust surfaces | Partial | Partial | Partial | PRD-14 | D-007 for active offline |
| PRIV-01 | Disabled privacy controls/no E2EE claim | Partial | Partial | Partial | PRD-14/PRD-16 | Copy audit |
| OPS-01 | Transcript operator visibility | Missing | N/A | Needs user decision | OPS-01 root lightweight spec | D-009 |
| OPS-02 | Transcript fallback strategy | Missing | N/A | Needs user decision | OPS-02 root research spec | D-010 |
| QA-01 | Evidence checklist/release gates | Missing | Missing | Missing | PRD-16 | Must run after implementation |
| ANALYTICS-01 | UX analytics/events | Not found | Not found | Needs user decision | ANALYTICS-01 root spec | D-011 |
| EXT-01 | Browser extension parity | Existing URL-focused extension | N/A | Partial | EXT-01 root spec | Capture contract compatibility |

## Priority Gaps

P0 planning continuity:

- PRD-11-SHELL verification remains open and blocks new feature implementation.

P1 product/trust gaps:

- PRD-06-FU capture result contract.
- PRD-09-FU Ask attachment/scope/history decisions.
- PRD-10 derived-state repair safety.
- PRD-12 Android Ask composer after PRD-09.
- PRD-13 Android share result flow after PRD-06 and device gate.

P2 polish/trust gaps:

- PRD-11-FU mobile select mode and Android item-tab decision.
- PRD-14 settings/privacy/offline trust copy.
- PRD-15 entry/pairing/session/offline states.
- YouTube item detail/media treatment decision.

P3 follow-ups:

- Ops transcript visibility/fallback decisions.
- Analytics/events decision.
- Extension parity after capture result contract.

## Required User Decisions

See `trackers/open_questions_decisions.md`. Until those decisions are closed, affected feature packages remain draft or no-go.
