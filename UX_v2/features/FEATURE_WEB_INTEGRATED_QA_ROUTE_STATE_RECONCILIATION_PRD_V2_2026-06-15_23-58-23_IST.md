# Feature PRD v2 - Web Integrated QA and Route-State Reconciliation

**Created:** 2026-06-15 23:58:23 IST
**Supersedes:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_PRD_V1_2026-06-15_23-56-56_IST.md`
**Review resolved:** `FEATURE_WEB_INTEGRATED_QA_ROUTE_STATE_RECONCILIATION_PRD_ADVERSARIAL_REVIEW_2026-06-15_23-57-53_IST.md`
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Approved product source for integrated web QA planning. Not a production release approval.

## Overview

The web UX v2 implementation is locally complete across the feature slices for contrast, shell/navigation, library/search/topics/collections, item detail/Ask/Needs Upgrade, and capture/settings/pairing/export/provider health. This integrated QA feature reconciles the original route-state matrix against actual evidence, fills integration gaps, and produces a local web release-readiness input.

This PRD does not authorize production deployment, Android completion, live AI answer quality claims, or unsupported prototype functionality.

## Goals

| Goal | Description |
| --- | --- |
| G1 - Reconcile every route-state row | Every row in `WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_2026-06-15_21-48-07_IST.md` must receive a strict status, evidence link, and release impact. |
| G2 - Prove integrated web flows | Validate cross-route flows across public/auth, shell, library/search, item/repair, Ask, capture, settings, topics, and collections. |
| G3 - Prevent evidence overclaiming | Reused slice evidence must exactly match route, state, viewport/theme where relevant, and point to a specific screenshot/report row. |
| G4 - Capture remaining blockers honestly | Live provider, Android, unsupported fake controls, destructive flows, and unreachable states must be marked blocked/deferred rather than pass. |
| G5 - Create release-input docs | Produce integrated QA report, reconciled matrix, accessibility smoke notes, tracker update, and running-log entry. |

## Non-Goals

- No production deploy, staging deploy, push, PR, or release packet completion.
- No Android native execution or APK validation.
- No live public website extraction dependency.
- No live AI answer/citation quality claim unless a provider is available and separately evidenced.
- No destructive delete, bulk delete, mark-good-enough, QR pairing, offline sync, telemetry, E2EE, fake backup/storage charts, or connected-device management.
- No new schema migration unless a separate reviewed bug fix requires it.

## Strict Route-State Status Taxonomy

| Status | Meaning | Counts as locally complete? | Release impact |
| --- | --- | --- | --- |
| `Pass` | This integrated pass directly validated the row with new evidence. | Yes | Can enter release packet as locally validated. |
| `Covered by slice QA` | A prior slice validated the exact route/state. The reconciled matrix links to the exact QA report and screenshot/report row. | Yes | Can enter release packet as locally validated if evidence remains current. |
| `Needs follow-up` | State is expected in scope, but no exact evidence exists yet. | No | Blocks web-local completion until validated or reclassified. |
| `Blocked` | State is in scope but cannot be validated locally due a concrete blocker, such as provider unavailable or Android native dependency. | No | Blocks production/release claim unless accepted as a release blocker. |
| `Deferred` | State or control is intentionally excluded by revised PRD/capability audit. | No for implementation; yes for scope hygiene | Must appear in release blockers/deferrals, not completion. |
| `Not applicable` | Source matrix row does not apply to the implemented production route after truth mapping. | No, but not a blocker | Requires rationale. |

Only `Pass` and `Covered by slice QA` may count toward local web route-state completion.

## Evidence Reuse Rules

Each reused evidence row must include:

1. Source QA report path.
2. Exact screenshot filename or exact browser-report field.
3. Route and state represented.
4. Viewport/theme when visual evidence matters.
5. Any caveat, such as provider-down instead of live-provider answer.

If any of those are missing, the row must be `Needs follow-up`, `Blocked`, `Deferred`, or `Not applicable`.

## Integrated Fixture and Auth Plan

| Fixture/auth area | Requirement |
| --- | --- |
| Integrated QA database | Use a fresh temp DB, not production data. Seed with the existing deterministic web seed scripts for library/search/topics/collections, item/Ask/Needs Upgrade, and capture/settings/pairing/export/provider health. |
| Empty-state coverage | Use a second temp empty DB when required for public/auth/empty route states, or mark rows as `Needs follow-up` with reason. |
| Auth setup | Use the app setup/unlock UI with a throwaway PIN in the temp DB. Do not store the PIN in reports beyond saying it was throwaway. |
| Unauthenticated checks | Use a fresh browser tab/context or direct HTTP checks to verify protected redirects and public route accessibility without corrupting the authenticated QA tab. |
| Mutation cleanup | Any local repair/tag/collection mutation must stay in temp DB only. Production mutation smoke is out of scope. |
| Generated artifacts | Remove QA-only generated backup files or temp artifacts from the project tree unless they are intentional evidence. |

## Route Coverage Requirements

| Route group | Required local coverage |
| --- | --- |
| Public/auth | `/unlock`, `/setup`, `/setup-apk`, `/offline.html`, protected redirect behavior. |
| Public assets | `/manifest.webmanifest`, `/favicon-32x32.png`, `/favicon-16x16.png`, `/apple-touch-icon.png`, `/web-app-icon-192.png`, `/web-app-icon-512.png`; expect 200 and appropriate image/manifest content-type where served. |
| Shell/navigation | `/library`, sidebar route-active states, mobile bottom nav, `/more`. |
| Library/search | Populated library, empty/no-results search, result search, filters, selected Ask where already implemented. |
| Item/repair/Needs Upgrade | Full item, weak item, repair form, repair validation/success if using temp mutation, Needs Upgrade populated and empty or blocker status. |
| Ask | Library, item, selected, tag, topic, collection, missing-scope recovery, provider-down state; live citation quality only if provider is available. |
| Capture | URL, PDF, note tabs; result banners for full-text, metadata-only, preview-only, duplicate, post-save issue; failed-without-saved documented by API/form behavior. |
| Settings | Settings overview, tags, collections, device pairing collapsed, advanced token masked, Android code local-only, export and provider API checks. |
| Topics/collections | Populated topic and collection routes; empty/not-found states validated or classified with rationale. |

## Accessibility Smoke Matrix

| Check | Minimum scope | Pass/fail rule |
| --- | --- | --- |
| Keyboard focus | `/library`, `/ask`, `/capture`, `/settings/device-pairing` | Tabbing reaches primary interactive controls and visible focus is present. |
| Protected/public forms | `/unlock`, `/setup` | Inputs and submit buttons are reachable by keyboard; error text is visible when triggered or existing tests cover it. |
| Touch target sampling | Mobile `/capture`, `/library`, `/settings/device-pairing` | Primary buttons/nav targets are at least roughly 44px high/wide or are documented as needing follow-up. |
| Horizontal overflow | Mobile and desktop route set in browser report | No unhandled page-level horizontal overflow. Intentional scrollable code/token regions are allowed. |
| 200 percent zoom | `/library`, `/items/[id]`, `/settings`, `/ask` | Page remains readable with no primary controls clipped or inaccessible; failures become release blockers. |
| Reduced motion | Any route with visible animation/loading indicators | No essential information depends on animation; if no animation exists, record `not applicable`. |

## Browser Report Schema

The integrated browser report JSON must include:

| Field | Requirement |
| --- | --- |
| `generatedAt`, `baseUrl`, `dbPaths` | Identify local run and temp DBs. |
| `routesVisited` | Array with route, state label, viewport, theme, screenshot path or `noScreenshotReason`. |
| `reusedEvidence` | Array with source QA report, screenshot/report row, and route-state row. |
| `apiChecks` | Export, provider-status, public assets, auth redirect checks. |
| `accessibilityChecks` | Results for the smoke matrix. |
| `tokenSafety` | Boolean raw-token/Bearer visibility checks. No raw token values. |
| `console` | Relevant warning/error count and bounded entries. |
| `layout` | Horizontal overflow and sampled touch-target results. |
| `blockers` | Rows that remain blocked/deferred/needs-follow-up. |

The report must not include raw bearer tokens, session cookies, PIN values, or active pairing codes.

## Acceptance Criteria

1. Reconciled route-state matrix covers every source matrix row with an allowed status.
2. All `Pass` and `Covered by slice QA` rows have exact evidence links.
3. No `Needs follow-up` row remains for web-local P0 scope unless it is called out as a blocker in the integrated QA report.
4. Public/auth routes and public assets are checked locally.
5. Integrated browser report has 0 relevant console warnings/errors on checked local routes.
6. Integrated browser report has 0 unhandled horizontal overflow issues on checked local routes.
7. Token, pairing code, PIN, and session values are not transcribed into markdown or JSON.
8. Accessibility smoke matrix is completed with pass/fail/blocker entries.
9. Static gates pass or are recorded as blockers.
10. Release blockers table includes at least: Android implementation/evidence, live provider/citation quality if unavailable, manual keyboard/accessibility release sweep, code review, backup/rollback, production deploy, and live smoke.

## Required Outputs

| Output | Path pattern |
| --- | --- |
| Reconciled matrix | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_RECONCILED_<timestamp>.md` |
| Integrated QA report | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_INTEGRATED_WEB_QA_<timestamp>.md` |
| Browser report JSON | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/integrated-web-qa/integrated-web-qa-browser-report.json` |
| Accessibility notes | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_ACCESSIBILITY_SMOKE_<timestamp>.md` |
| Tracker update | `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md` |
| Running-log entry | `RUNNING_LOG.md` and `UX_v2/RUNNING_LOG.md` append-only updates |

## Risks and Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Matrix overclaims reused evidence | High | Exact evidence reuse rules; otherwise `Needs follow-up`. |
| Auth checks mutate session state | Medium | Separate unauth tab/direct HTTP checks and temp DB only. |
| Live provider unavailable | Medium | Provider-down pass locally; live answer quality remains release blocker. |
| Pairing screenshot exposes temporary code | Medium | Local-only screenshot; no transcription. |
| Accessibility smoke too shallow | High | Minimum matrix plus release blocker table. |
| Dirty worktree obscures release readiness | High | Local-only status and explicit release blockers. |
