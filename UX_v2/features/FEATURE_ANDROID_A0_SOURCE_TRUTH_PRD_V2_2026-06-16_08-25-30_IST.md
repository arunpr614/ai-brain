# Feature PRD v2: Android A0 Source Freeze, Truth Matrix, And Decision Authorization

Created: 2026-06-16 08:25:30 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Feature owner: Main Codex
Parent PRD: `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
Parent implementation plan: `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
Supersedes: `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_V1_2026-06-16_08-20-35_IST.md`
Adversarial review: `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_ADVERSARIAL_REVIEW_2026-06-16_08-23-00_IST.md`
Status: Revised product source for A0 execution.

## Revision Summary

This v2 closes the PRD adversarial review findings:

- A0 now requires durable local source snapshots for every active Magic Patterns mobile file.
- Connector-only evidence is not enough to mark A0 complete.
- The truth matrix must work at element/control/state grain, not one row per page.
- The current-state route inventory has required columns and route coverage.
- A0 has explicit completion labels: complete, partial, or blocked.

## Problem

The Android revamp cannot safely code broader mobile screens until the active Magic Patterns mobile artifact is frozen into local evidence and translated into production truth. The risk is not only stale files; it is copying prototype-only behavior into a private production app: QR pairing, active offline item reads/sync, fake account data, telemetry, E2EE, fake versioning, package migration, biometric unlock, embedded media, and untested mutations.

## Current Evidence

| Evidence | Current state |
| --- | --- |
| Magic Patterns mobile URL | `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r` |
| Magic Patterns editor ID | `d5w3fb6rzxdeht7urnye5r` |
| Active artifact rechecked | `d7eeaec6-0272-40fa-a7ca-4de7871182e7` |
| Generation status rechecked | `isGenerating=false` |
| Available mobile files | 31 files returned by Magic Patterns `get_design_status` |
| Existing local source manifest | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_PHASE2_SOURCE_MANIFEST_2026-06-15_22-35-00_IST.md` |
| Existing Magic Patterns snapshot README | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_MAGIC_PATTERNS_SOURCE_SNAPSHOT_2026-06-15_21-48-07_IST/README.md` |
| Existing targeted Android truth matrix | `UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_2026-06-16_00-31-20_IST.md` |

## Goal

Create a durable Android A0 package that later Android slices must use before coding. The package must prove exactly which Magic Patterns mobile files were read, freeze source authority, classify each screen and risky element into production actions, record D-001 through D-014 authorization, and define the evidence labels required for Android completion claims.

## Non-Goals

- No application source code changes.
- No production deploy.
- No APK publication.
- No new product behavior.
- No claim that Android UI parity is complete.
- No substitute for later feature-specific PRD/review/plan/review cycles.

## Required Outputs

| Output | Required file |
| --- | --- |
| Android A0 source manifest | `UX_v2/execution/ANDROID_A0_SOURCE_MANIFEST_<timestamp>.md` |
| Magic Patterns mobile source snapshot README | `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_<timestamp>/README.md` |
| Full Magic Patterns mobile source files | `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_<timestamp>/source/<file path>` |
| Source snapshot manifest | `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_<timestamp>/SOURCE_FILE_MANIFEST.md` |
| Android design truth matrix | `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_<timestamp>.md` |
| Android decision authorization table | Included in truth matrix or separate `ANDROID_A0_DECISION_AUTHORIZATION_<timestamp>.md` |
| Android evidence strategy and current route inventory | `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_<timestamp>.md` |
| Tracker update | `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<timestamp>.md` |
| Running log entry | Append-only entries in `RUNNING_LOG.md` and `UX_v2/RUNNING_LOG.md` |

## Completion Labels

| Label | Meaning | Allowed next step |
| --- | --- | --- |
| Complete | Every active Magic Patterns mobile file was captured locally, all required A0 docs exist, all D-decisions are classified, route inventory has evidence labels, and validation passes. | Later Android feature slices may begin. |
| Partial | Some useful A0 docs exist, but at least one source file, D-decision, route inventory row, or validation gate is missing. | Do not start broader Android coding. Continue A0. |
| Blocked | Magic Patterns source cannot be read/captured or source authority is contradictory. | Stop Android execution and record blocker. |

## Functional Requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| A0-R1 | P0 | Recheck Magic Patterns mobile status immediately before execution and record editor ID, active artifact ID, generation status, file list, and timestamp. |
| A0-R2 | P0 | Capture full local source contents for every active Magic Patterns mobile file returned by `get_design_status`. Connector-only narrative evidence cannot satisfy this requirement. |
| A0-R3 | P0 | Create a source snapshot manifest with file path, byte count, capture status, and truncation status for every active mobile file. |
| A0-R4 | P0 | If any active mobile file cannot be captured in full, A0 must be marked `Partial` or `Blocked`; it cannot be marked `Complete`. |
| A0-R5 | P0 | Freeze source authority order across user goal, parent Android PRD, parent Android plan, source manifest, Magic Patterns artifact, existing production code, and targeted share-result matrix. |
| A0-R6 | P0 | Create a design truth matrix for every Magic Patterns mobile screen, page-level state, visible action, control group, fake-data field, unsupported claim, mutation affordance, and D-decision-linked element. |
| A0-R7 | P0 | Classify each row as `implement`, `adapt copy`, `hide`, `disable`, `defer`, `out of scope`, or `needs decision`. |
| A0-R8 | P0 | Record production truth for QR pairing, offline sync/read, fake account data, fake sync state, telemetry, crash reporting, E2EE, delete-all-data, biometric unlock, package migration, embedded media, and untested mutations. |
| A0-R9 | P0 | Create D-001 through D-014 decision authorization rows using the revised Android PRD as product source. |
| A0-R10 | P0 | Preserve the completed Android share-result slice as a targeted truth matrix and mark native entry-path validation pending. |
| A0-R11 | P0 | Define Android evidence labels and completion claim rules for browser-mobile, APK unauthenticated, APK authenticated, and native entry path validation. |
| A0-R12 | P0 | Create a current-state route inventory with required columns listed below. |
| A0-R13 | P1 | Include privacy/redaction rules for screenshots, logs, tokens, private item titles, source URLs, PDF names, and session/pairing details. |
| A0-R14 | P1 | Include release blockers for production deploy, APK publication, stale-cache recovery, backup/rollback, observability, and live smoke. |

## Source Files That Must Be Captured

The source snapshot is complete only when all active files returned by Magic Patterns are captured locally:

- `index.tsx`
- `App.tsx`
- `package.json`
- `index.css`
- `tailwind.config.js`
- `canvas.manifest.js`
- `useScreenInit.js`
- `components/ui/Select.tsx`
- `components/ui/Drawer.tsx`
- `components/ui/Card.tsx`
- `components/ui/Input.tsx`
- `components/ui/Tabs.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Checkbox.tsx`
- `components/ui/Button.tsx`
- `components/ui/Separator.tsx`
- `data/sources.ts`
- `components/MobileFrame.tsx`
- `components/MobileBottomNav.tsx`
- `pages/MobileLibrary.tsx`
- `pages/MobileShareCapture.tsx`
- `pages/MobileRepair.tsx`
- `pages/MobileItemDetail.tsx`
- `pages/MobileOffline.tsx`
- `pages/MobileAsk.tsx`
- `pages/MobileCapture.tsx`
- `pages/MobileMore.tsx`
- `pages/MobileLogin.tsx`
- `data/conversations.ts`
- `pages/MobileNeedsUpgrade.tsx`
- `pages/MobileTopic.tsx`
- `pages/MobileCollection.tsx`

## Design Truth Matrix Grain

The matrix must include at least:

- one page-level row for every mobile page;
- one row for every visible primary action;
- one row for every icon-only action or navigation action;
- one row for every filter/sheet/tab/control group;
- one row for every status badge/result state/empty state/error state;
- one row for every fake data field, fake identity, fake version, fake sync state, or fake device state;
- one row for every offline, QR, telemetry, privacy, E2EE, biometric, package, media, or mutation claim;
- one row for every D-decision-linked visible element.

## Required Route Inventory Columns

`ANDROID_A0_EVIDENCE_STRATEGY_<timestamp>.md` must include a route inventory with these columns:

| Column | Meaning |
| --- | --- |
| Mobile source screen | Magic Patterns source file |
| Production route or native entry | Existing web route, API/native intent, or `none` |
| Auth state | Public, session, bearer, APK token, or native-only |
| Current production source files | Relevant app/component/API files |
| Current tests | Existing tests or `missing` |
| Existing evidence | Browser/Android evidence already available |
| Required Android evidence level | Browser mobile only, unauthenticated APK, authenticated APK, native entry path |
| Mutation/data risk | None, read-only, local mutation, production mutation |
| Release blocker | Yes/no and reason |

## D-Decision Authorization

The A0 decision authorization table must include every decision from D-001 through D-014. It must preserve the revised Android PRD's product status and add:

- visible Magic Patterns elements affected;
- production UI rule;
- implementation action;
- validation required;
- whether the row can count toward Android revamp completion.

## Acceptance Criteria

1. A0 produces all required output files.
2. Magic Patterns mobile status is freshly rechecked and recorded.
3. All active mobile files are captured locally in full, with a manifest row for each file.
4. Any missing/truncated file prevents `Complete` status.
5. Every mobile page, visible action/control group/status state, fake-data field, unsupported claim, mutation affordance, and D-decision-linked element has a truth-matrix row.
6. Every D-001 through D-014 decision row has status, production UI rule, implementation action, validation, and completion eligibility.
7. Route inventory enumerates production route/native entry, auth, current source, current tests, existing evidence, required Android evidence level, mutation risk, and release blocker.
8. The Android share-result slice is referenced as locally complete with native entry-path validation pending.
9. No application source code changes are made by A0.
10. Tracker and running logs identify A0 as `Complete`, `Partial`, or `Blocked` using the definitions above.
11. Later Android slices can point to A0 as their source-truth gate only when A0 is `Complete`.

## Validation Plan

| Validation | Expected result |
| --- | --- |
| Magic Patterns `get_design_status` | `isGenerating=false`; active artifact and 31-file list recorded |
| Source snapshot manifest check | Every active Magic Patterns file has `captured_full` status and nonzero byte count |
| Matrix coverage check | All mobile source screens, D-001 through D-014, and required forbidden-claim categories appear in the truth matrix |
| Route inventory check | Every mobile source screen maps to a route/native entry or `none`, with required evidence label |
| Forbidden authorization scan | A0 docs do not authorize QR, offline sync/read, telemetry, E2EE, fake account, fake version, biometric unlock, package migration, embedded player, or untested mutation behavior |
| `git diff --check` | Pass |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Magic Patterns source capture fails or truncates | P0 | Mark A0 partial/blocked and do not start broader Android coding. |
| Matrix still becomes generic | P0 | Enforce row grain at visible action/control/state and D-decision-linked element level. |
| Source snapshot becomes stale before release | P1 | Recheck Magic Patterns status before release and document any artifact drift. |
| A0 docs accidentally authorize deferred behavior | P0 | Use forbidden authorization scan and D-decision completion eligibility columns. |
| Future Android claims overstate browser evidence | P0 | Evidence strategy must bind every route to an exact Android evidence level. |

## Open Questions

1. Can Magic Patterns preview screenshots be captured in this environment, and should they be added to the A0 snapshot folder?
2. Which later Android slice starts after A0 is complete: A1 shell/library/more/offline, or A3 capture/repair/needs-upgrade?
