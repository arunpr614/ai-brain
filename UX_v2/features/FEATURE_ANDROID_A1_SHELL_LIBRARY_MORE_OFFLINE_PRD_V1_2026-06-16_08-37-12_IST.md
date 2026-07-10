# Feature Android A1 Shell Library More Offline PRD v1

Created: 2026-06-16 08:37:12 IST
Owner: Main Codex
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Draft for adversarial review. Not approved for implementation until PRD v2 and implementation plan v2 exist.

## Purpose

Android A1 turns the Android source-truth package into the first broad UI foundation slice. It covers the mobile shell, safe-area clearance, bottom navigation route policy, Library mobile browse/filter/select behavior, More/status truth cleanup, and the server-required offline fallback.

This slice intentionally does not implement Ask, Capture, Repair, Needs Upgrade internals, Item Detail tabs, Login/pairing, Topic, Collection, or native share invocation beyond preserving navigation to those surfaces.

## Source Authority

| Source | Use in A1 |
| --- | --- |
| `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md` | Binding implementation and exclusion rules |
| `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-32-30_IST.md` | Evidence labels and route inventory |
| `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/` | Visual and interaction reference |
| `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md` | Parent Android product rules |
| `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md` | Parent sequencing and safety gates |
| Current production code | The implementation substrate and truth for real capabilities |

## User Problem

On Android, the app has many of the right surfaces, but the foundation still has rough spots:

- bottom navigation can become misleading if route policy and safe-area clearance are not consistent;
- Library needs a mobile-native browse/filter/select workflow that does not expose unsupported offline availability;
- More must show real app/server/provider status and clearly disabled roadmap privacy/offline controls without fake account data;
- offline fallback must not imply offline item reading, sync, capture, or Ask.

The user should be able to trust every visible control in these foundation surfaces before the deeper Android slices build on top of them.

## A1 Scope

### In Scope

| Area | A0 rows | A1 scope |
| --- | --- | --- |
| Mobile shell and safe areas | A0-COV-001, A0-COV-002, A0-COV-003, A0-COV-034 | Bottom nav, route target mapping, raised Capture policy, safe-area padding, no fake phone chrome, no overlap with fixed/floating UI |
| Library | A0-COV-004, A0-COV-005, A0-COV-006, A0-COV-032, A0-COV-034 | Mobile search entry, filter sheet, source/quality filters, tag context, selected count, clear/cancel, Ask selected, existing tested tag/collection bulk actions if safe, Needs Upgrade entry |
| More/status | A0-COV-018, A0-COV-019, A0-COV-020, A0-COV-034 | Real AI Memory identity/version, Pair Device, Android setup, appearance/settings routes, backup/export, provider health, privacy/offline trust copy |
| Offline fallback | A0-COV-021, A0-COV-022 | Server-required fallback copy, retry/recovery path, no offline item list/read/count, no sync claim |

### Out Of Scope

| Area | Reason |
| --- | --- |
| Android share native invocation | Share-result web surface is complete locally; native entry evidence remains a later gate |
| Capture URL/note/PDF form parity | A later Android Capture slice |
| Repair and Needs Upgrade internals | A later Capture/Repair/Needs Upgrade slice |
| Ask composer and citations | A later Ask slice |
| Item Detail tabs | A later Item Detail slice |
| Login, unlock, setup, pairing state redesign | A later entry/session slice |
| Topic and Collection mobile layouts | A later scoped browsing slice |
| QR pairing, biometric unlock, package ID migration | Approved deferrals/exclusions |
| Offline library/read/sync/capture/Ask queue | Approved deferral/exclusion under D-007 |
| Active telemetry, crash-report, E2EE, delete-all-data controls | Approved deferral/exclusion under D-011 |

## Product Decisions Applied

| Decision | A1 rule |
| --- | --- |
| D-006 raised Capture route policy | Standard Capture tab only on Ask and Capture routes. Raised Capture is allowed on Library, More, item, topic, collection, search, and Needs Upgrade if overlap validation passes. |
| D-007 active offline controls | No offline item read/list/count/sync/capture/Ask queue. Offline UI may only present server-required fallback and recovery. |
| D-011 telemetry/privacy controls | Controls may appear only as visibly disabled roadmap copy, or be hidden. They must not be active. |
| D-013 package migration | Keep current app identity and package truth. No package rename or migration claim. |

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
- `/more`, `/settings`, `/settings/*`, and `/setup-apk` highlight More on mobile.
- Capture is rendered as the standard tab on `/ask` and `/capture*`; it is raised on other in-scope mobile routes only if it clears content, filter sheets, selection bars, and page actions.
- Bottom nav and fixed/floating bars use safe-area-aware spacing so no text, button, filter sheet, or selected action is hidden behind the Android gesture area.
- MobileFrame prototype chrome is never copied into production: no fake status bar, time, battery, signal, Wi-Fi, bezel, or gesture pill.

### A1-R2 Library Mobile Browse, Filter, Select

Library must feel like a focused mobile list while preserving the existing production data model.

Acceptance criteria:

- The header, count summary, search field, filter entry, active filter summary, and item list fit within 390px and 430px mobile widths with no horizontal overflow.
- Search continues to submit to the real `/search` route.
- Mobile filters include only production-backed filters: source and quality. No offline filter appears.
- A tag context can show current tag, clear tag, and Ask tag when there are matching items.
- The selected-item experience supports selecting rows, showing selected count, clearing selection, and asking up to the existing selected-source limit.
- Existing bulk tag and add-to-collection controls may remain only if current server actions and tests validate them; A1 must not add new mutation semantics.
- Needs Upgrade entry must route to `/needs-upgrade` and must not offer mark-good-enough or dismissal.
- Item rows must use real item data only. Prototype fixtures, private-looking names, fake authors, fake channels, `offlineAvailable`, and fake conversations must not be copied.

### A1-R3 More And Status Truth Cleanup

More must be a truthful status and settings hub, not a prototype account/settings page.

Acceptance criteria:

- The top identity block uses AI Memory and real app/workspace status, not fake account name, fake email, fake user, or `AI Brain`.
- The app version is read from package metadata or an existing real version source.
- Pair Device, Android setup, Appearance, Tags, Collections, Backup/export, Needs Upgrade, and Provider Health entries route to real existing surfaces or real APIs.
- Provider health can show only real status from the existing provider status path. It must not show fake healthy states.
- Offline access copy must say the server is required and there is no offline queue in UX v2.
- Privacy controls must be hidden or clearly disabled as roadmap/nonactive. If shown, copy must state that E2EE, telemetry/crash controls, and destructive delete are not active.
- No active connected-device, offline-sync, telemetry, crash-report, E2EE, or delete-all-data controls may be shipped by A1.

### A1-R4 Offline Fallback Truth

Offline fallback must help the user recover without overclaiming offline capability.

Acceptance criteria:

- Public offline fallback explains that AI Memory needs the server.
- Retry tests server reachability and sends the user back to the app when reachable.
- Pair Device and Library links resolve to the correct app origin in Android WebView and browser.
- The page must not show offline item list/read/count, offline sync, offline Ask, offline capture queue, or `your Brain` copy.
- Offline fallback must remain self-contained and usable when the Next.js app is unavailable.

### A1-R5 Copy And Privacy Safety

A1 must pass a targeted forbidden-copy and behavior scan.

Acceptance criteria:

- No visible A1 production UI contains `AI Brain`, fake account email, fake account name, "synced", "offline sync", "available offline", "read offline", "QR scan", "biometric", "fingerprint unlock", active telemetry, active crash reports, active E2EE, active delete-all-data, or package migration copy unless it is explicitly in a disabled roadmap explanation.
- Logs and screenshots must not include tokens, cookies, private URLs, note bodies, PDF names, or raw user content.
- Browser evidence may use deterministic synthetic fixtures.
- Production smoke, if later performed, must use redacted evidence and avoid private mutation unless cleanup is documented.

### A1-R6 Evidence And Validation

A1 can be called complete locally only after local static and browser evidence pass. Android-complete claims require APK/device evidence and remain release blockers until performed.

Required local validation:

- `git diff --check`.
- Focused route tests for shell target mapping.
- Focused tests for any changed helper logic.
- Typecheck and lint if app source changes.
- Full test suite if shared shell, data, or action behavior changes.
- Browser mobile screenshots for Library default, Library filtered, Library selected, More, offline fallback, and at least one route with raised Capture.
- Browser dark-mode evidence for Library and More if styling changes.
- Console scan for browser evidence: no relevant warnings/errors.
- Copy scan for A1 forbidden claims.

Required Android/release validation before release claim:

- Android authenticated route validated for changed protected surfaces: Library and More.
- Android unauthenticated route validated for offline fallback.
- Android native entry-path validation remains required for share and pairing claims outside A1.
- Production live smoke and observability remain required before deploy closure.

## Route And State Matrix

| Route/state | Expected mobile target | Capture presentation | Evidence label required for local A1 | Android release claim label |
| --- | --- | --- | --- | --- |
| `/library` | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/library?source=pdf` | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/library?quality=needs_upgrade` | Library | Raised | Browser mobile only | Android authenticated route validated |
| `/search?q=fixture` | Library | Raised | Browser mobile only | Android authenticated route validated if changed |
| `/items/<id>` | Library | Raised | Browser mobile only if inspected | Android authenticated route validated in later item slice |
| `/needs-upgrade` | Library | Raised | Browser mobile only if inspected | Android authenticated route validated in later repair slice |
| `/capture` | Capture | Standard tab | Browser mobile only if inspected | Android authenticated route validated in later capture slice |
| `/capture/share-result` | Capture | Standard tab | Existing share-result browser evidence | Android native entry path validated later |
| `/ask` | Ask | Standard tab | Browser mobile only if inspected | Android authenticated route validated in later Ask slice |
| `/more` | More | Raised | Browser mobile only | Android authenticated route validated |
| `/settings` and `/settings/*` | More | Raised | Browser mobile only if inspected | Android authenticated route validated if changed |
| `/setup-apk` | More | Raised | Browser mobile only if inspected | Android unauthenticated/native pairing validation later |
| `/offline.html` | None/app fallback | None | Browser public asset/offline evidence | Android unauthenticated route validated |

## Non-Goals And Guardrails

- Do not change retrieval, Ask ranking, capture extraction, repair semantics, auth, pairing token exchange, provider implementations, or database schema in A1.
- Do not add new user data mutation actions in A1.
- Do not change APK package identity or publish an APK in A1.
- Do not deploy to production from A1 alone.
- Do not declare Android complete from browser-only evidence.
- Do not remove existing supported functionality just to match the prototype if current production behavior is real and tested.

## Completion Definition

A1 is complete locally when:

- PRD v2 and implementation plan v2 exist after adversarial review.
- A1 app changes are implemented.
- Local validation passes.
- Browser evidence package exists with the route/state matrix outcomes.
- Tracker and running logs are updated.
- Remaining Android APK/device and production release gates are explicitly left open.

The overall UX v2 goal remains active after A1 unless all later Android, release, deploy, smoke, and observability gates are also complete.
