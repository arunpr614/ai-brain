# Feature PRD v1: Android A0 Source Freeze, Truth Matrix, And Decision Authorization

Created: 2026-06-16 08:20:35 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Feature owner: Main Codex
Parent PRD: `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
Parent implementation plan: `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
Status: Draft for adversarial review. No application source changes authorized by this v1.

## Problem

The Android revamp has a broad Magic Patterns mobile design reference, a revised Android PRD, and a revised implementation plan. The implementation plan explicitly blocks direct coding until the mobile prototype is translated into production truth. Without a durable A0 package, later Android slices can accidentally copy fake prototype behavior, claim unsupported offline or QR features, miss Android-only validation requirements, or rely on stale Magic Patterns assumptions.

## Current Evidence

| Evidence | Current state |
| --- | --- |
| Magic Patterns mobile URL | `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r` |
| Magic Patterns editor ID | `d5w3fb6rzxdeht7urnye5r` |
| Active artifact rechecked | `d7eeaec6-0272-40fa-a7ca-4de7871182e7` |
| Generation status rechecked | `isGenerating=false` |
| Available mobile files | 31 files including `components/MobileFrame.tsx`, `components/MobileBottomNav.tsx`, `pages/MobileLibrary.tsx`, `pages/MobileShareCapture.tsx`, `pages/MobileRepair.tsx`, `pages/MobileItemDetail.tsx`, `pages/MobileOffline.tsx`, `pages/MobileAsk.tsx`, `pages/MobileCapture.tsx`, `pages/MobileMore.tsx`, `pages/MobileLogin.tsx`, `pages/MobileNeedsUpgrade.tsx`, `pages/MobileTopic.tsx`, `pages/MobileCollection.tsx` |
| Existing local source manifest | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_PHASE2_SOURCE_MANIFEST_2026-06-15_22-35-00_IST.md` |
| Existing Magic Patterns snapshot README | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_MAGIC_PATTERNS_SOURCE_SNAPSHOT_2026-06-15_21-48-07_IST/README.md` |
| Existing targeted Android truth matrix | `UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_2026-06-16_00-31-20_IST.md` |

## Goal

Create the Android A0 source-freeze and truth package that every later Android slice must reference before coding. The package must turn Magic Patterns mobile source into a production-truth matrix, freeze the source authority list, classify decision-gated behavior, and define the evidence labels required for Android completion claims.

## Non-Goals

- No application source code changes.
- No production deploy.
- No APK publication.
- No implementation of QR pairing, active offline sync/read, telemetry, E2EE, biometric unlock, package migration, embedded media, or unsupported mutations.
- No claim that Android UI parity is complete.
- No replacement for per-feature PRD/review/plan/review cycles after A0.

## Users And Stakeholders

| Stakeholder | Need |
| --- | --- |
| Arun | Confidence that future Android execution will not ship fake or unsupported prototype behavior. |
| Main Codex | A concrete, reviewable source-truth package to use before coding later Android slices. |
| PM sidecar / future agents | Stable tracking rows, source files, decision status, evidence labels, and no-go gates. |
| Reviewer | A bounded artifact to review for missed source, decision, privacy, deployment, and validation risks. |

## Required Outputs

| Output | Required file |
| --- | --- |
| Android A0 source manifest | `UX_v2/execution/ANDROID_A0_SOURCE_MANIFEST_<timestamp>.md` |
| Magic Patterns mobile source snapshot README | `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_<timestamp>/README.md` |
| Magic Patterns mobile source files or per-file inspected excerpts | `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_<timestamp>/source/` or explicit connector evidence in README |
| Android design truth matrix | `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_<timestamp>.md` |
| Android decision authorization table | Included in truth matrix or separate `ANDROID_A0_DECISION_AUTHORIZATION_<timestamp>.md` |
| Android evidence strategy | `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_<timestamp>.md` |
| Current-state route/evidence inventory | Included in evidence strategy or separate `ANDROID_A0_CURRENT_STATE_ROUTE_INVENTORY_<timestamp>.md` |
| Tracker update | `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md` |
| Running log entry | Append-only entries in `RUNNING_LOG.md` and `UX_v2/RUNNING_LOG.md` |

## Functional Requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| A0-R1 | P0 | Recheck Magic Patterns mobile status immediately before execution and record editor ID, active artifact ID, generation status, file list, and timestamp. |
| A0-R2 | P0 | Read or snapshot all mobile-relevant Magic Patterns files before classifying their production action. At minimum: mobile frame, bottom nav, all mobile pages, shared UI primitives, `data/sources.ts`, and `data/conversations.ts`. |
| A0-R3 | P0 | Freeze source authority order across user goal, parent Android PRD, parent Android implementation plan, source manifest, Magic Patterns mobile artifact, existing web/local implementation, and targeted share-result matrix. |
| A0-R4 | P0 | Create a design truth matrix for every Magic Patterns mobile screen and every risky prototype element. |
| A0-R5 | P0 | Classify each visible element/state as `implement`, `adapt copy`, `hide`, `disable`, `defer`, `out of scope`, or `needs decision`. |
| A0-R6 | P0 | Record production truth for fake or unsupported items: QR pairing, active offline sync/read, fake account data, fake sync state, telemetry, crash reporting, E2EE, delete-all-data, biometric unlock, package migration, embedded media, and untested mutations. |
| A0-R7 | P0 | Create or update D-001 through D-014 decision authorization rows using the revised Android PRD as product source. |
| A0-R8 | P0 | Preserve the completed Android share-result slice as a valid targeted truth matrix, but do not let it substitute for full A0 coverage. |
| A0-R9 | P0 | Define Android evidence labels and completion claim rules for browser-mobile, APK unauthenticated, APK authenticated, and native entry path validation. |
| A0-R10 | P0 | Identify exact next Android slices and their required evidence level before they can be marked complete. |
| A0-R11 | P1 | Create a current-state route/evidence inventory for app routes that correspond to the mobile screens. |
| A0-R12 | P1 | Include privacy/redaction rules for screenshots, logs, tokens, private item titles, source URLs, PDF names, and session/pairing details. |
| A0-R13 | P1 | Include release blockers for production deploy, APK publication, stale-cache recovery, backup/rollback, observability, and live smoke. |

## Design Truth Matrix Minimum Coverage

| Mobile source | Minimum truth coverage |
| --- | --- |
| `components/MobileFrame.tsx` | Frame-only visual context; fake status/device chrome excluded from production. |
| `components/MobileBottomNav.tsx` | D-006 route policy, safe areas, raised Capture policy, overlap risk. |
| `pages/MobileLibrary.tsx` | Search, filters, rows, quality badges, selected state, Ask selected, empty state, hidden offline claims. |
| `pages/MobileShareCapture.tsx` | Preserve completed share-result state contract and native validation pending label. |
| `pages/MobileCapture.tsx` | URL/note/PDF capture states, duplicate/update/limited/full/error states. |
| `pages/MobileRepair.tsx` | Weak-source repair, validation, success; no mark-good-enough. |
| `pages/MobileNeedsUpgrade.tsx` | Queue, empty state, repair links; no unsupported dismissal. |
| `pages/MobileAsk.tsx` | Mobile composer, scope, citations, keyboard safety; no unsupported attachment or high-quality-only claim. |
| `pages/MobileItemDetail.tsx` | WebView tabs decision, focus mode, related items, metadata; no embedded player or untested mutation. |
| `pages/MobileMore.tsx` | Real app/device/server status; no fake account, offline sync, telemetry, E2EE, delete-all-data, fake version. |
| `pages/MobileOffline.tsx` | Server-required/offline fallback only; no offline item list/read/sync. |
| `pages/MobileLogin.tsx` | AI Memory branding, unlock/setup/session/pairing states; code-entry only; no QR/biometric/sync/package migration claims. |
| `pages/MobileTopic.tsx` | Read/scoped Ask route truth; no untested create-tag mutation. |
| `pages/MobileCollection.tsx` | Read/scoped Ask route truth; no untested add-items mutation. |
| Shared UI/data files | Prototype-only data, names, URLs, status colors, badges, labels, and fixture assumptions must be adapted to production truth. |

## Acceptance Criteria

1. A0 produces all required output files.
2. Magic Patterns mobile status is freshly rechecked and recorded.
3. Available mobile file list matches the active artifact status, or differences are explained as blockers.
4. Every mobile page listed in the revised Android PRD has at least one truth-matrix row.
5. Every D-001 through D-014 decision row has a status and production UI rule.
6. Every known forbidden/unsupported prototype behavior is classified as hide, disable, defer, or out of scope.
7. The Android share-result slice is referenced as locally complete but native-entry validation pending.
8. No source code changes are made by A0.
9. The tracker and running logs identify A0 as complete locally or blocked with exact missing evidence.
10. Later Android slices can point to A0 as their source-truth gate.

## Validation Plan

| Validation | Expected result |
| --- | --- |
| Magic Patterns `get_design_status` | `isGenerating=false` and active artifact recorded |
| File existence checks | All A0 output files exist |
| Matrix coverage scan | All required mobile source files and D-001 through D-014 appear in A0 outputs |
| Forbidden-claim scan in A0 outputs | QR/offline/telemetry/E2EE/fake-account/package-migration claims are not accidentally authorized |
| `git diff --check` | Pass |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Magic Patterns connector can list files but source reads may be large/truncated | P0 | Snapshot file contents where possible; otherwise record connector limitation and block full A0 completion. |
| Truth matrix becomes too generic to guide implementation | P0 | Require screen-specific rows and production actions per source file. |
| Share-result slice completion hides broader A0 gap | P1 | Explicitly treat share result as one completed targeted matrix, not full A0. |
| A0 docs accidentally authorize deferred behavior | P0 | Use D-decision table and forbidden-claim scan. |
| Future Android claims overstate browser-only evidence | P0 | Evidence strategy must define exact label rules and completion claim gates. |

## Open Questions

1. Can the Magic Patterns connector return full source contents for all mobile files without truncation?
2. Should A0 include local screenshots of Magic Patterns preview, or is source snapshot plus downstream app screenshots enough for this phase?
3. Which later Android slice should be first after A0: shell/library/more/offline, or capture/repair/needs-upgrade?
