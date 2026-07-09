# UX v2 Feature Inventory

Created: 2026-06-15 21:46:45 IST
Project root: `/private/tmp/ai-brain-ux-v2-main-ready`
Prepared by: PM sidecar
Write scope: New markdown under `UX_v2/project_management/` only

## Purpose

This inventory keeps the project tracker readable. It lists the UX v2 feature areas implied by the current revised PRDs, implementation plans, release reports, and adversarial reviews. It separates shipped Magic Patterns UX v2 work from the newer Android and web revamp work that remains planning-gated.

## Status Legend

| Status | Meaning |
| --- | --- |
| Shipped | Implemented, deployed, and smoked according to the evidence docs. |
| Planned | Product and implementation docs exist, but implementation has not started for this revamp. |
| Gate required | Work cannot begin or cannot release until named artifacts/reviews pass. |
| Blocked | A known missing decision, artifact, validation route, or environment prevents forward progress. |
| Deferred or excluded | Explicitly not part of the revamp completion claim. |

## Released Baseline Already Done

| Feature area | Current evidence | Status | Notes |
| --- | --- | --- | --- |
| Magic Patterns UX v2 web/responsive shell | `RUNNING_LOG.md` Entry #116 and `UX_V2_MAGIC_PATTERNS_PRODUCTION_RELEASE_2026-06-15.md` | Shipped | Live at `https://brain.arunp.in` from release commit `3bead0cc4dbad3ba870bd55517057b6b8d7955e9`. |
| Android WebView existing APK loads deployed assets | `RUNNING_LOG.md` Entry #116 | Shipped with caveats | Existing APK `1.0.2` / code `3` was validated for shell, pairing, share, offline fallback, and relaunch. Protected authenticated routes were not fully navigated inside APK. |
| Topics schema and topic UI from Magic Patterns pass | `RUNNING_LOG.md` Entries #115-116 | Shipped | Existing release added additive topic schema and routes. New web/Android revamps may still restyle or validate these routes. |
| AI Memory branding, public logo, manifest, offline route smoke | `RUNNING_LOG.md` Entries #114 and #116 | Shipped | Must be preserved and re-smoked by web revamp. |

## Cross-Cutting Feature Gates

| Feature or gate | Source docs | Status | Required next artifact or action | Owner |
| --- | --- | --- | --- | --- |
| Execution-source versioning | Web PRD W-021, web revised plan Phase 0, handover | Gate required | Baseline/source manifest must list current branch, commit, dirty state, and all untracked execution docs before coding. | Future worker |
| Magic Patterns source capture | Web revised plan Phase 0, Android revised plan Phase -1 | Gate required | Snapshot MP2 desktop and mobile sources/screenshots or document access blocker. URL plus artifact ID is not enough. | Future worker |
| Adversarial review gates | `adversarial-review` skill, existing review reports | Gate required | Review every PRD/plan before relying on it; revise P0/P1 findings; re-review revised plans when risk remains. | PM sidecar plus future reviewer |
| Deterministic fixtures | Web revised plan Phase 1 | Gate required | `WEB_EXPERIENCE_REVAMP_FIXTURE_PLAN_<timestamp>.md` with local seed states and cleanup. Android needs equivalent fixture coverage through design truth and visual matrices. | Future worker |
| Authenticated QA session | Web revised plan Phase 1, Android revised PRD evidence levels | Gate required | `WEB_EXPERIENCE_REVAMP_AUTH_QA_STRATEGY_<timestamp>.md`; Android authenticated route strategy must not expose PIN/token/cookie. | Future worker |
| Browser QA harness | Web revised plan Phase 1 | Gate required | `WEB_EXPERIENCE_REVAMP_BROWSER_QA_HARNESS_<timestamp>.md` with routes, viewports, screenshots, console/network capture. | Future worker |
| Backup and rollback runbook | Web revised plan Phase 1 and Phase 12 | Gate required | Exact host commands, backup path, integrity check, item count, restore command, service restart, rollback smoke. | Future worker |
| Staging or deploy-preview feasibility | Web revised plan Phase 1 | Gate required | `WEB_EXPERIENCE_REVAMP_STAGING_FEASIBILITY_<timestamp>.md`; document compensation if unavailable. | Future worker |
| Observability checks | Web revised plan Phase 1 and Phase 13; Android revised plan observability | Gate required | Browser console/network, server logs, service status/restart count, provider/export/pairing errors, Android logs when applicable. | Future worker |

## Button Contrast And UI Token Repair

| Feature | Source docs | Scope | Status | Required evidence |
| --- | --- | --- | --- | --- |
| Primary action token split | `BUTTON_CONTRAST_IMPLEMENTATION_PLAN_2026-06-15_16-10-33_IST.md` | Add semantic action tokens and move filled primary buttons off `--accent-9` plus `--on-accent`. | Planned, gate required | Contrast checks, broad scans, light/dark screenshots. |
| Selected-control token split | Button contrast plan | Add selected-control tokens and remove bright dark-mode `border-[var(--accent-9)]` selected state. | Planned, gate required | Active Library filters and similar selected controls readable in dark mode. |
| Contrast regression guard | Button contrast plan; Web and Android PRDs | Add focused contrast tests or checks. | Planned | Previous white-on-white pair must fail if reintroduced. |
| Android WebView contrast validation | Button contrast plan; Android revised PRD | Existing APK must load deployed corrected CSS after web deploy. | Planned | Fresh launch/data-clear or documented cache behavior. |

## Android Experience Revamp Features

| Feature | Product source | Execution source | Status | Key dependencies |
| --- | --- | --- | --- | --- |
| Source freeze and design truth matrix | Android revised PRD | Android revised plan Phase -1 | Planned, gate required | Magic Patterns mobile snapshot, source PRD snapshot, D-decision authorization. |
| D-001 through D-014 decision handling | Android revised PRD Product Decision Authorization | Android revised plan Decision Authorization | Planned | Deferred rows excluded from completion; approved rows only may ship. |
| More/Capture route policy D-006 | Android revised PRD D-006 | Android revised plan Phase 0 and Phase 2 | Planned | Update code/docs/screenshots together; resolves earlier doc/code contradiction. |
| Android shell, safe areas, bottom nav | Android revised PRD P0 | Android revised plan Phase 2 | Planned | Contrast gate first; no fake MobileFrame phone chrome. |
| Mobile Library, filters, select mode, Ask selected | Android revised PRD P0 | Android revised plan Phase 3 | Planned | Fixture states, authenticated APK evidence, no unsupported offline claims. |
| Mobile item detail tabs | Android revised PRD D-005 approved implementation | Android revised plan Phase 4 | Planned | Existing data only; no unsupported mutations or embedded player. |
| Mobile Ask composer | Android revised PRD P1 | Android revised plan Phase 5 | Planned | Hide unsupported attachments, high-quality-only toggle, and new persistence semantics. |
| Android share result surface | Android revised PRD share contract | Android revised plan Phase 6 | Planned, high risk | Typed state contract, safe sessionStorage, no sensitive query strings, Android share matrix. |
| Capture, Repair, Needs Upgrade | Android revised PRD P0 | Android revised plan Phase 7 | Planned | D-004 mark-good-enough remains deferred/excluded. |
| More, Settings, Privacy, Offline, Provider Health | Android revised PRD P0 | Android revised plan Phase 8 | Planned | No fake account data, offline sync, telemetry, E2EE, or QR claims. |
| Login, unlock, pairing, session, setup | Android revised PRD P0 | Android revised plan Phase 9 | Planned | Code-entry pairing only; token redaction; no biometric/QR/sync overclaim. |
| Topic and Collection mobile views | Android revised PRD P1 | Android revised plan Phase 10 | Planned | Hide/disable mutations unless real semantics and tests exist. |
| Client state and cache freshness | Android revised PRD P1 | Android revised plan Phase 11 | Planned, high risk | Capacitor Preferences token, session cookies, service worker cache, stale asset recovery. |
| Accessibility, keyboard, gesture, safe area | Android revised PRD P1 | Android revised plan Phase 12 | Planned | TalkBack, 44px touch targets, 4.5:1 text contrast, Android keyboard evidence. |
| Android runtime validation | Android revised PRD evidence levels | Android revised plan Phase 13 | Planned, high risk | Authenticated protected routes inside APK; native entry paths; adb/server/client logs. |
| Android release/APK channel | Android revised PRD APK decision | Android revised plan Phase 14 | Planned | Default web-only asset release; no same-version APK overwrite. |

## Web Experience Revamp Features

| Feature | Product source | Execution source | Status | Key dependencies |
| --- | --- | --- | --- | --- |
| Web source freeze and baseline | Web revised PRD W-021 | Web revised plan Phase 0 | Planned, gate required | Source manifest, MP2 snapshot, current git state, baseline checks. |
| Web execution artifacts | Web revised PRD gates | Web revised plan Phase 1 | Planned, gate required | Fixture plan, auth strategy, browser harness, route-state matrix, capability audit, backup runbook, staging feasibility, Android pairing runbook, observability checklist. |
| Design tokens and primitives | Web revised PRD W-020 | Web revised plan Phase 2 | Planned | Button contrast fix and shared primitives. |
| Desktop shell and navigation | Web revised PRD W-002 | Web revised plan Phase 3 | Planned | Expanded/collapsed nav, active states, responsive layout, no overlap. |
| Library, Search, Topic, Collection | Web revised PRD W-003, W-010 through W-012 | Web revised plan Phase 4 | Planned | Route-state matrix, capability audit for mutations, fixture data. |
| Source detail, Needs Upgrade, Ask | Web revised PRD W-007, W-008 | Web revised plan Phase 5 | Planned | Real citations and source quality; unsupported attachments/toggles excluded. |
| Capture flow and result states | Web revised PRD W-009 | Web revised plan Phase 6 | Planned | Real capture APIs, duplicate/update/failure evidence, local mutation QA. |
| Settings, providers, export, storage, Pair Device | Web revised PRD W-014 through W-018 | Web revised plan Phase 7 | Planned, high risk | Settings inventory, manual export validation, provider health validation, pairing contract. |
| Storage, API, schema, data risk review | Web revised PRD storage rules | Web revised plan Phase 8 | Planned | Unknown data risk blocks deploy. |
| Static, unit, build, and asset gates | Web revised PRD release gate | Web revised plan Phase 9 | Planned | Typecheck, lint, tests, build, smoke, public assets, offline route. |
| Browser visual, interaction, accessibility QA | Web revised PRD visual/accessibility gates | Web revised plan Phase 10 | Planned, high risk | Reproducible screenshots, console/network logs, keyboard/focus, 200 percent zoom, reduced motion. |
| Code review and fix pass | Web revised PRD release gate; adversarial-review skill | Web revised plan Phase 11 | Planned | No unresolved P0/P1. |
| Predeploy backup, rollback, release gate | Web revised PRD release gate | Web revised plan Phase 12 | Planned, high risk | Verified backup, rollback command, staging result, authenticated smoke. |
| Deploy and postdeploy smoke | Web revised PRD release gate | Web revised plan Phase 13 | Planned | Live smoke, observability, Android deployed-asset and pairing checks if claimed. |
| Closure and release record | Web revised PRD Definition of Done | Web revised plan Phase 14 | Planned | Final release packet, QA report, tracker/log update, deferred register. |

## Explicitly Deferred Or Excluded Capabilities

These must not be counted as completion unless a later product decision reopens them.

| Capability | Source | Status |
| --- | --- | --- |
| QR pairing and Android QR scanning | Android D-008, Web W-014 | Deferred/excluded |
| Offline sync, offline library/cache controls, offline Ask, offline capture | Android D-007, Web W-016C | Deferred/excluded |
| Product analytics, telemetry, crash reporting controls | Android D-011, Web W-017 | Deferred/excluded |
| E2EE and delete-all-data | Web W-018 | Deferred/excluded |
| Bulk delete, item delete, mark-good-enough | Web W-005/W-006, Android D-004 | Deferred/excluded unless separately approved |
| Package ID migration or same-version APK overwrite | Android D-013 | Deferred/excluded |
| Embedded YouTube player/media | Android D-014, Web W-019 | Embedded player deferred; metadata/thumbnail/trust treatment only if backed by real data. |
| New Ask attachment persistence, high-quality-only control, scope-history schema changes | Android D-001 through D-003, Web W-008 | Deferred/excluded |
