# Feature Android A1 Shell Library More Offline PRD v2

Created: 2026-06-16 08:40:24 IST
Owner: Main Codex
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Revised product source for implementation planning. Implementation is still blocked until implementation plan v2 exists.
Supersedes: `FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_V1_2026-06-16_08-37-12_IST.md`
Adversarial review: `FEATURE_ANDROID_A1_SHELL_LIBRARY_MORE_OFFLINE_PRD_ADVERSARIAL_REVIEW_2026-06-16_08-39-00_IST.md`

## Revision Summary

| Review issue | V2 resolution |
| --- | --- |
| Fixed-layer overlap risk was vague | Adds a required fixed-layer collision matrix with viewport and state coverage |
| Library mutation safety was conditional | Mobile selected bar is limited to count, Ask selected, and clear. Tag/collection mutations are not part of mobile A1 |
| More/provider truth was under-specified | Adds exact More status rows and provider fallback copy |
| Offline origin validation was under-specified | Adds origin/retry branch validation requirements |
| `/setup-apk` route-state change risk | Defers `/setup-apk` mobile active-state changes to entry/session slice |
| Copy scan too broad/loose | Adds bounded scan targets and exact allowed disabled-copy exceptions |
| More tab badge undecided | Removes Needs Upgrade badge from the bottom More tab for A1 |
| Local completion could overstate Android readiness | Adds required tracker wording and Android-claim restriction |

## Purpose

Android A1 is the first broad Android foundation slice after A0. It covers:

- mobile shell and bottom navigation route policy;
- safe-area and fixed-layer clearance;
- Library mobile browse/filter/select behavior;
- More/status truth cleanup;
- public offline fallback truth and recovery.

A1 does not implement the deeper Android surfaces. Ask, Capture, Repair, Needs Upgrade internals, Item Detail tabs, Login/pairing, Topic, Collection, and native share invocation remain separate slices.

## Source Authority

| Source | Use in A1 |
| --- | --- |
| `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md` | Binding implementation and exclusion rules |
| `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-32-30_IST.md` | Evidence labels and route inventory |
| `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/` | Visual and interaction reference only |
| `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md` | Parent Android product rules |
| `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md` | Parent sequencing and safety gates |
| Current production code | Implementation substrate and truth for real capabilities |

## In Scope

| Area | A0 rows | A1 scope |
| --- | --- | --- |
| Mobile shell and safe areas | A0-COV-001, A0-COV-002, A0-COV-003, A0-COV-034 | Bottom nav, route target mapping, raised Capture policy, safe-area padding, no fake phone chrome, fixed-layer collision proof |
| Library | A0-COV-004, A0-COV-005, A0-COV-006, A0-COV-032, A0-COV-034 | Mobile search entry, filter sheet, source/quality filters, tag context, selected count, Ask selected, clear selection, Needs Upgrade entry |
| More/status | A0-COV-018, A0-COV-019, A0-COV-020, A0-COV-034 | Real AI Memory identity/version, Pair Device, Android setup link, appearance/settings routes, backup/export, provider health, privacy/offline trust copy |
| Offline fallback | A0-COV-021, A0-COV-022 | Server-required fallback copy, retry/recovery path, no offline item list/read/count, no sync claim |

## Out Of Scope

| Area | Product rule |
| --- | --- |
| Android share native invocation | Leave pending; do not claim native share completion in A1 |
| Capture URL/note/PDF form parity | Later Android Capture slice |
| Repair and Needs Upgrade internals | Later Capture/Repair/Needs Upgrade slice |
| Ask composer and citations | Later Ask slice |
| Item Detail tabs | Later Item Detail slice |
| Login, unlock, setup, pairing redesign | Later entry/session slice |
| `/setup-apk` active-tab route change | Deferred to entry/session slice. A1 may keep the More link but must not change setup route behavior or claim validation |
| Topic and Collection mobile layouts | Later scoped browsing slice |
| QR pairing, biometric unlock, package ID migration | Approved deferrals/exclusions |
| Offline library/read/sync/capture/Ask queue | Approved D-007 deferral/exclusion |
| Active telemetry, crash-report, E2EE, delete-all-data controls | Approved D-011 deferral/exclusion |

## Product Decisions Applied

| Decision | A1 rule |
| --- | --- |
| D-006 raised Capture route policy | Standard Capture tab on Ask and Capture routes. Raised Capture on Library, Search, Item, Topic, Collection, Needs Upgrade, and More only when fixed-layer validation passes |
| D-007 active offline controls | No offline item read/list/count/sync/capture/Ask queue. Offline UI may only present server-required fallback and recovery |
| D-011 telemetry/privacy controls | Controls may appear only as disabled roadmap explanations using the approved copy table, or be hidden |
| D-013 package migration | Keep current app identity and package truth. No package rename or migration claim |

## Requirements

### A1-R1 Mobile Shell And Bottom Nav

The mobile shell must provide stable Android/WebView navigation with four destinations: Library, Capture, Ask, and More.

Acceptance criteria:

- Library tab targets `/library`.
- Capture targets `/capture`.
- Ask targets `/ask`.
- More targets `/more`.
- `/`, `/library`, `/search`, `/items/*`, `/topics/*`, `/collections/*`, and `/needs-upgrade` highlight Library on mobile.
- `/ask` and `/items/*/ask` highlight Ask on mobile.
- `/capture` and `/capture/*` highlight Capture on mobile, including `/capture/share-result`.
- `/more`, `/settings`, and `/settings/*` highlight More on mobile.
- `/setup-apk` mobile active-state is not changed in A1.
- Capture is rendered as the standard tab on `/ask` and `/capture*`; it is raised on other in-scope mobile routes only if the fixed-layer matrix passes.
- The bottom More tab must not show the Needs Upgrade count badge in A1. Needs Upgrade remains visible inside Library and More surfaces.
- MobileFrame prototype chrome is never copied into production: no fake status bar, time, battery, signal, Wi-Fi, bezel, or gesture pill.

### A1-R2 Fixed-Layer Collision Matrix

A1 cannot be locally complete unless every row below passes at 390x844 and 430x932.

| State | Required proof |
| --- | --- |
| Library default | Bottom nav visible, raised Capture visible, final row/content not hidden, no horizontal overflow |
| Library filter sheet open | Sheet sits above bottom nav and safe area; close control visible; raised Capture does not cover sheet controls |
| Library selected mode | Mobile selected bar shows count, Ask, and clear; it does not overlap bottom nav, raised Capture, or item row controls |
| Library selected with more than 50 items if feasible by fixture | Ask selected is disabled or blocked with clear copy; bar still fits |
| Library flash/status if produced | Toast/status does not cover bottom nav or selected bar |
| More | Raised Capture does not cover More rows or bottom version/status copy |
| Search route | Raised Capture and bottom nav do not hide search results or empty state |
| Needs Upgrade route | Raised Capture and bottom nav do not hide repair entry or empty state |
| Item detail route smoke | Raised Capture and bottom nav do not hide primary item actions; full item redesign deferred |
| Topic/Collection route smoke | Raised Capture and bottom nav do not hide scoped Ask entry; full redesign deferred |
| Offline fallback `/offline.html` | No app bottom nav expected; buttons remain visible above safe area |

Required implementation evidence:

- Browser bounding-box assertions for bottom nav, raised Capture, filter sheet, selected bar, and primary action areas where possible.
- Screenshots for all required states at 390x844.
- At least default Library, selected Library, More, and offline fallback screenshots at 430x932.
- No horizontal overflow in all A1 browser states.

### A1-R3 Library Mobile Browse, Filter, Select

Library must feel like a focused mobile list while preserving the existing production data model.

Acceptance criteria:

- Header, count summary, search field, filter entry, active filter summary, and item list fit within mobile widths.
- Search continues to submit to the real `/search` route.
- Mobile filters include only production-backed filters: source and quality. No offline filter appears.
- Tag context can show current tag, clear tag, and Ask tag when there are matching items.
- Mobile selected mode includes only selected count, Ask selected, and clear/cancel.
- Mobile selected mode must not expose tag input or add-to-collection select in A1.
- Existing desktop/tablet bulk tag and add-to-collection controls may remain outside mobile A1 if existing tests continue to pass.
- Ask selected respects the current selected-source limit and shows disabled or blocked state when the limit is exceeded.
- Needs Upgrade entry routes to `/needs-upgrade` and must not offer mark-good-enough or dismissal.
- Item rows use real item data only. Prototype fixtures, private-looking names, fake authors, fake channels, `offlineAvailable`, and fake conversations must not be copied.

### A1-R4 More And Status Truth Cleanup

More must be a truthful status and settings hub.

Required rows/copy:

| More area | Required source/copy | Forbidden |
| --- | --- | --- |
| Top identity | `AI Memory`; "Private memory workspace" or equivalent real private workspace copy | Fake person name, fake email, `AI Brain`, fake sync state |
| Version | `pkg.version` or existing package metadata | Hardcoded prototype version |
| Needs Upgrade | Link to `/needs-upgrade` only when count is greater than 0 | Dismiss/mark-good-enough |
| Preferences | Links to existing Appearance, Tags, Collections routes | Fake settings |
| Devices | Link to existing Device pairing and Android setup surfaces | Connected-device list unless real and validated |
| Data and Privacy | Backup/export link; disabled Privacy Controls row; Offline Access row with server-required copy | Active telemetry, crash controls, E2EE toggle, delete-all-data, offline sync |
| Provider Health | Existing provider status helper/API only | Fake healthy state, raw provider errors, tokens, model secrets |

Provider status fallback copy:

| Status | Visible copy |
| --- | --- |
| `ok` | Available |
| `quota_or_billing` | Quota blocked |
| `unconfigured` | Not configured |
| `unreachable` or unknown | Unreachable |

Provider status must not expose raw errors, token details, API keys, signed URLs, cookies, or private content. If provider probing is unavailable or too slow, the route must degrade to the existing helper's safe fallback state instead of inventing health.

### A1-R5 Offline Fallback Truth

Offline fallback must help the user recover without overclaiming offline capability.

Acceptance criteria:

- Public offline fallback explains that AI Memory needs the server.
- Retry tests server reachability and sends the user back to the app when reachable.
- Link/retry behavior is validated for three origin contexts: normal web origin, `https://localhost`, and `http://localhost`.
- Branch behavior is validated for 200, 401, 403, timeout, and network failure.
- Pair Device and Library links resolve to the correct app origin in Android WebView and browser.
- The page must not show offline item list/read/count, offline sync, offline Ask, offline capture queue, or `your Brain` copy.
- Offline fallback remains self-contained and usable when the Next.js app is unavailable.

### A1-R6 Bounded Copy And Privacy Scan

Scan targets:

- `src/components/sidebar.tsx`
- `src/components/sidebar-routing.ts`
- `src/components/mobile-library-filters.tsx`
- `src/components/library-list.tsx`
- `src/app/library/page.tsx`
- `src/app/more/page.tsx`
- `src/lib/settings/trust-copy.ts`
- `public/offline.html`

Forbidden in visible A1 production UI:

- `AI Brain`
- fake account email or fake person name
- `available offline`
- `read offline`
- `offline item`
- `offline sync`
- `QR scan`
- `biometric`
- `fingerprint unlock`
- package migration or package rename copy
- active telemetry or active crash-report control
- active E2EE claim
- active delete-all-data action

Allowed disabled/server-required copy:

- "End-to-end encryption is not active yet."
- "Privacy controls are coming soon."
- "Ask, capture, export, and sync require the AI Memory server."
- "There is no offline queue in UX v2."
- "Server required."
- "Not active yet."

Screenshots and logs must not include tokens, cookies, private URLs, note bodies, PDF names, or raw user content. Browser evidence should use deterministic synthetic fixtures.

### A1-R7 Evidence And Claim Language

A1 can be called complete locally only after local static and browser evidence pass. Tracker and running-log entries must use this wording unless APK evidence exists:

`Android A1 shell/library/more/offline completed locally with browser evidence; APK evidence and production release still pending.`

Required local validation:

- `git diff --check`.
- Focused route tests for shell target mapping.
- Focused tests for any changed helper logic.
- Typecheck and lint if app source changes.
- Full test suite if shared shell, data, or action behavior changes.
- Browser mobile evidence for all fixed-layer matrix rows.
- Browser dark-mode evidence for Library and More if styling changes.
- Console scan for browser evidence: no relevant warnings/errors.
- Bounded copy scan over the target files above.

Required Android/release validation before release claim:

- Android authenticated route validated for changed protected surfaces: Library and More.
- Android unauthenticated route validated for offline fallback.
- Android native entry-path validation remains required for share and pairing claims outside A1.
- Production live smoke and observability remain required before deploy closure.

## Route And State Matrix

| Route/state | Expected mobile target | Capture presentation | Local A1 evidence | Android release claim label |
| --- | --- | --- | --- | --- |
| `/library` | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/library?source=pdf` | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/library?quality=needs_upgrade` | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/library` with filter sheet open | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/library` with selected bar | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/search?q=fixture` | Library | Raised | Browser mobile only | Android authenticated route validated if changed |
| `/items/<id>` smoke only | Library | Raised | Browser mobile only; no item parity claim | Android authenticated route validated in later item slice |
| `/needs-upgrade` smoke only | Library | Raised | Browser mobile only; no repair parity claim | Android authenticated route validated in later repair slice |
| `/capture` smoke only | Capture | Standard tab | Browser mobile only; no capture parity claim | Android authenticated route validated in later capture slice |
| `/capture/share-result` | Capture | Standard tab | Existing share-result browser evidence | Android native entry path validated later |
| `/ask` smoke only | Ask | Standard tab | Browser mobile only; no Ask parity claim | Android authenticated route validated in later Ask slice |
| `/more` | More | Raised | Browser mobile only | Android authenticated route validated |
| `/settings` and `/settings/*` | More | Raised | Browser mobile only if inspected | Android authenticated route validated if changed |
| `/setup-apk` | Deferred | No A1 route-state change | Not claimed in A1 | Android unauthenticated/native pairing validation later |
| `/offline.html` | None/app fallback | None | Browser public asset/offline evidence | Android unauthenticated route validated |

## Non-Goals And Guardrails

- Do not change retrieval, Ask ranking, capture extraction, repair semantics, auth, pairing token exchange, provider implementations, or database schema in A1.
- Do not add new mobile user data mutation actions in A1.
- Do not change `/setup-apk` route classification or pairing behavior in A1.
- Do not change APK package identity or publish an APK in A1.
- Do not deploy to production from A1 alone.
- Do not declare Android complete from browser-only evidence.
- Do not remove existing supported desktop/tablet functionality just to match the prototype if current production behavior is real and tested.

## Completion Definition

A1 is complete locally when:

- PRD v2 and implementation plan v2 exist after adversarial review.
- A1 app changes are implemented.
- Local validation passes.
- Browser evidence package exists with the fixed-layer and route/state matrix outcomes.
- Tracker and running logs are updated with local-only wording.
- Remaining Android APK/device and production release gates are explicitly left open.

The overall UX v2 goal remains active after A1 unless all later Android, release, deploy, smoke, and observability gates are also complete.
