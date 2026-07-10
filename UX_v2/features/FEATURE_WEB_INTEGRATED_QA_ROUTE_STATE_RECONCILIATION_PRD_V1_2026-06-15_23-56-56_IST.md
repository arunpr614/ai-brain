# Feature PRD v1 - Web Integrated QA and Route-State Reconciliation

**Created:** 2026-06-15 23:56:56 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch:** `codex/ai-brain-ux-v2-execution`
**Status:** Draft for adversarial review. Not approved for execution until reviewed and revised.

## Overview

The web UX v2 implementation has now been delivered locally through five feature slices:

1. Contrast and selected-control token safety.
2. Web shell/navigation and route frame.
3. Library/search/topics/collections.
4. Item detail/Ask/Needs Upgrade.
5. Capture/settings/pairing/export/provider health.

Each slice has its own PRD/review/plan/review/execution/QA evidence. The project still needs an integrated web QA gate that reconciles the original route-state matrix with the implemented app, proves cross-route flows, captures missing/blocked states honestly, and creates a release-readiness input for code review and eventual deployment.

This PRD defines that integrated gate. It does not claim production release. It produces a local evidence packet and updated route-state matrix only.

## Problem

The current `WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_2026-06-15_21-48-07_IST.md` still lists all routes as pending because it was created before implementation. The completed slice QA reports prove many individual states, but a release owner still cannot answer the integrated questions:

- Which route-state rows are fully validated, partially validated, blocked, deferred, or not applicable?
- Do the implemented slices work together across real navigation paths?
- Are auth/public routes still safe after shell and settings changes?
- Are visual, console, layout, token-safety, export/provider, and mutation claims consistent across the whole web app?
- What exact blockers remain before code review and production deployment?

Without this integrated pass, the project could accidentally ship with stale tracker rows, missing public-route evidence, or overclaimed state coverage.

## Goals

| Goal | Description |
| --- | --- |
| G1 - Reconcile route-state matrix | Update every web route-state row with a status, evidence link, blocker, or deferral reason. |
| G2 - Prove cross-route web flows | Validate the completed web slices together through navigation, scoped Ask links, repair links, settings links, capture links, and public/auth boundaries. |
| G3 - Capture missing states honestly | Do not invent screenshots for states that require unavailable live providers, unsupported fake controls, destructive flows, or Android-native evidence. Mark them blocked/deferred with reason. |
| G4 - Run local release-grade web QA | Capture browser evidence across desktop/mobile/light/dark for critical routes, with console and layout checks. |
| G5 - Produce release inputs | Create an integrated QA report and tracker update suitable for code review and release packet preparation. |

## Non-Goals

- No production deployment.
- No Android implementation or APK evidence.
- No live public website extraction dependency.
- No live AI answer/citation quality claim if providers are unavailable.
- No destructive delete, bulk delete, mark-good-enough, QR pairing, offline sync, telemetry, E2EE, fake backup/storage charts, or connected-device management.
- No schema migration unless an unexpected local bug requires one and gets its own review entry.

## Source Artifacts

| Artifact | Role |
| --- | --- |
| `WEB_EXPERIENCE_REVAMP_ROUTE_STATE_MATRIX_2026-06-15_21-48-07_IST.md` | Source matrix to reconcile. |
| `WEB_EXPERIENCE_REVAMP_CAPABILITY_AUDIT_2026-06-15_21-48-07_IST.md` | Capability truth-source for real, conditional, blocked, and deferred controls. |
| `WEB_EXPERIENCE_REVAMP_BROWSER_QA_HARNESS_2026-06-15_21-48-07_IST.md` | Evidence and viewport rules. |
| `WEB_EXPERIENCE_REVAMP_AUTH_QA_STRATEGY_2026-06-15_21-48-07_IST.md` | Auth/public route evidence rules. |
| Completed slice QA reports | Existing evidence to reuse instead of recapturing every already-proven state. |
| Current local app code | Implementation truth. |

## User Stories

| Priority | User story | Acceptance |
| --- | --- | --- |
| P0 | As Arun, I want one integrated web QA report so I can see whether the web revamp is locally complete. | Report lists completed, blocked, deferred, and pending web states with evidence links. |
| P0 | As Arun, I want the route-state matrix updated so stale `Pending` rows do not hide real progress or missing work. | Every matrix row has an updated status and evidence/blocker. |
| P0 | As Arun, I want public/auth routes verified so the app still protects private routes and serves public assets correctly. | `/unlock`, `/setup`, `/setup-apk`, `/offline.html`, manifest/icons, and protected redirect behavior are locally checked. |
| P0 | As Arun, I want cross-route flows verified so navigation between Library, Item, Ask, Repair, Capture, Settings, Topics, and Collections is coherent. | Browser pass covers representative flows and reports 0 relevant console warnings/errors. |
| P0 | As Arun, I want blocked states documented honestly so deployment is not based on fake evidence. | Missing live-provider, Android-native, unsupported destructive, or fake prototype states are marked blocked/deferred, not pass. |
| P1 | As Arun, I want an accessibility-focused smoke pass before release. | Integrated pass includes keyboard/focus/touch-target/overflow/zoom/reduced-motion spot checks or explicitly lists remaining accessibility blockers. |

## Route Coverage Requirements

| Route group | Required local coverage |
| --- | --- |
| Public/auth | `/unlock`, `/setup`, `/setup-apk`, `/offline.html`, manifest/icons, protected redirect to unlock/setup when unauthenticated. |
| Shell/navigation | `/library`, collapsed/expanded shell if supported, mobile bottom nav, `/more`. |
| Library/search | Populated library, search results/no-results, filters, selected Ask where already implemented. |
| Item/repair/Needs Upgrade | Full item, weak item, repair form, repair validation/success if using temp mutation, Needs Upgrade populated and empty/blocker status. |
| Ask | Library, item, selected, tag, topic, collection, missing-scope recovery, provider-down state; live citation quality only if provider is available. |
| Capture | URL, PDF, note tabs; result banners for full-text, metadata-only, preview-only, duplicate, post-save issue; failure-without-saved documented by API/form behavior. |
| Settings | Settings overview, tags, collections, device pairing collapsed, advanced token masked, Android code local-only, export and provider API checks. |
| Topics/collections | Populated topic and collection routes; empty/not-found documented where reachable or blocked. |

## Evidence Requirements

| Evidence | Requirement |
| --- | --- |
| Integrated route-state matrix | New markdown file that mirrors every source route-state row and assigns `Pass`, `Covered by slice QA`, `Blocked`, `Deferred`, `Not applicable`, or `Needs follow-up`. |
| Browser report | JSON report with routes visited, screenshots, viewport/theme, console count, layout overflow count, token-safety booleans, API checks, and blockers. |
| Screenshots | Enough new screenshots to prove integration gaps not already covered by slice QA. Reuse existing screenshot links for already-covered states. |
| Static checks | `git diff --check`, typecheck, lint, full tests, build. Existing known warnings must be named. |
| Accessibility notes | Markdown summary of keyboard/focus/touch target/overflow/zoom/reduced-motion spot checks and residual risk. |
| Tracker update | Project tracker update and running-log entry. |

## Acceptance Criteria

1. Every row in the original route-state matrix is reconciled.
2. No active fake prototype controls are newly introduced.
3. The integrated browser run has 0 relevant console errors/warnings on checked local routes.
4. The integrated browser run reports 0 unhandled horizontal overflow issues on checked routes.
5. Token, pairing code, and session values are not transcribed into markdown reports.
6. Export and provider status APIs are checked locally with no-store headers.
7. Public routes and protected redirects are checked locally.
8. Static gates pass or blockers are recorded.
9. Release status remains `not deployed` until backup/rollback, code review, Android gates, production deploy, and live smoke complete.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Matrix overclaims reused evidence | High | Each reused evidence link must point to a specific QA report/screenshot; otherwise mark `Needs follow-up`. |
| Public/auth route checks mutate auth state | Medium | Use a temporary QA database and separate local server. |
| Live provider unavailable | Medium | Validate provider-down behavior locally; mark live citation quality pending. |
| Screenshots expose temporary pairing code | Medium | Keep code screenshots local-only and do not transcribe the code. |
| Accessibility checks become too shallow | High | Record exactly which checks were performed and what remains pending before release. |
| Dirty worktree obscures release readiness | High | Integrated report must state local-only status and avoid deployment claims. |

## Open Questions

| Question | Proposed answer for v2 |
| --- | --- |
| Should live Ask answer quality be required before web local completion? | No for local web completion; yes before production release if Ask quality is claimed. |
| Should Android pairing be required for web integrated QA completion? | No; web code generation/token redaction can pass locally, Android code-entry remains Android gate. |
| Should every matrix row get a fresh screenshot? | No; reuse slice evidence where exact state was already captured, but every row must link to evidence or blocker. |
| Should unsupported prototype controls be implemented to close matrix rows? | No; mark deferred/blocked according to capability audit and revised PRD. |
