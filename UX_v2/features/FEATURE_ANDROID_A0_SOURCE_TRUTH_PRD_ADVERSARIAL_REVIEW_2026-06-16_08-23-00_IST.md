# Feature Android A0 Source Truth PRD - Adversarial Review

**Created:** 2026-06-16 08:23:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_V1_2026-06-16_08-20-35_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_ADVERSARIAL_REVIEW_2026-06-16_08-23-00_IST.md`

## Executive Verdict

No-go for execution as written. The PRD has the right intent, but its acceptance criteria are loose enough that A0 could "complete" without durable source files or meaningful element-level truth coverage. That would recreate the exact failure mode A0 is supposed to prevent.

## Evidence Inspected

- `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_V1_2026-06-16_08-20-35_IST.md`
- `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- `UX_v2/project_management/UX_V2_ANDROID_EXECUTION_PM_CHECKPOINT_2026-06-16_00-19-57_IST.md`
- Magic Patterns mobile `get_design_status`: active artifact `d7eeaec6-0272-40fa-a7ca-4de7871182e7`, `isGenerating=false`, 31 available files
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_MAGIC_PATTERNS_SOURCE_SNAPSHOT_2026-06-15_21-48-07_IST/README.md`
- `UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_2026-06-16_00-31-20_IST.md`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Source snapshot acceptance can pass without durable source contents

**Evidence:** PRD v1 allows "Magic Patterns mobile source files or per-file inspected excerpts" and even "explicit connector evidence in README" as an output (`FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_V1_2026-06-16_08-20-35_IST.md:55`). It also leaves full source retrieval as an open question (`:136`).
**Why it matters:** A0 exists to stop future Android slices from relying on stale, generic, or remembered prototype summaries. A README saying the connector was inspected does not let a future agent audit exact UI copy, fake data, unsupported controls, or route-specific behavior.
**Failure mode:** A later shell/library/Ask slice claims A0 is complete, but the agent cannot inspect the exact Magic Patterns source used to classify visible elements. Prototype-only buttons or fake copy can slip into production because the source evidence is not reproducible.
**Recommendation:** PRD v2 must require durable local source snapshots for every active mobile artifact file listed by Magic Patterns. If any file cannot be captured in full, A0 cannot be marked complete; it must be marked blocked/partial with the exact missing files.

#### 2. Matrix acceptance is too weak to prevent generic one-row-per-screen coverage

**Evidence:** The PRD says every mobile page must have "at least one truth-matrix row" (`:106`) even though the functional requirements call for every screen and risky prototype element (`:70`) and every visible element/state classification (`:71`).
**Why it matters:** One row per screen is not a truth matrix; it is a checklist. The Android PRD's risk is in specific visible controls and claims: QR, offline item lists, fake account data, telemetry, E2EE, mutation sheets, embedded media, package migration, and result states.
**Failure mode:** A0 passes with broad rows such as "MobileMore: adapt copy" while missing concrete fake-account, telemetry, version, connected-device, provider-health, and privacy-control decisions. Later implementation then has no binding rule for individual UI elements.
**Recommendation:** PRD v2 must require a minimum row model: one row for each page-level state plus one row for every visible action, control group, fake-data field, unsupported claim, mutation affordance, and D-decision-linked element.

### P1 - High Risk

#### 1. Current-state route inventory is under-specified

**Evidence:** The PRD lists a current-state route/evidence inventory as an output (`:59`) and a P1 requirement (`:77`) but does not define required columns or the production routes to inspect.
**Why it matters:** Future Android slices need to know whether a Magic Patterns screen maps to an existing route, a responsive route, an authenticated route, a native intent, or no production capability.
**Failure mode:** A0 can produce a vague "routes exist" note and later Android work still overclaims protected-route parity or misses APK-only validation.
**Recommendation:** Define required route inventory columns: production route, auth state, current component/source file, existing tests, browser evidence, required Android evidence level, mutation risk, and release blocker.

#### 2. Screenshot requirement remains unresolved

**Evidence:** The PRD asks whether A0 should include local screenshots as an open question (`:137`) but does not set a default.
**Why it matters:** A0 is source-truth work, but Magic Patterns is partly a visual design reference. Without at least source-backed visual evidence or a documented screenshot limitation, spacing, bottom-nav clearance, sheet behavior, and fake frame exclusion remain easy to misread.
**Failure mode:** Later work uses production screenshots only and loses the visual comparison baseline that justified the mobile redesign.
**Recommendation:** PRD v2 should require Magic Patterns preview screenshots when the connector/browser path can capture them, or explicitly mark screenshot capture unavailable and require downstream implementation screenshots to include source-file references.

### P2 - Medium Risk

#### 1. Validation scans are named but not mechanically defined

**Evidence:** The validation plan says "Matrix coverage scan" and "Forbidden-claim scan" (`:120-121`) but does not define command patterns, expected files, or required output.
**Why it matters:** The project has many docs and generated artifacts; vague scans are easy to skip or run against the wrong paths.
**Failure mode:** A future agent says scans passed without proving that D-001 through D-014 and all mobile files are represented.
**Recommendation:** PRD v2 should require exact checklists and bounded command outputs, even if the implementation uses manual verification plus `rg`.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The PRD correctly identifies the A0 gate but still leaves escape hatches. It treats "connector evidence" and "one row per page" as potentially sufficient, which means a future agent could complete A0 while preserving the same source ambiguity and prototype-overclaim risk the Android revised plan was designed to remove.

## Missing Validation

- No full-source capture proof requirement.
- No per-file source checksum, byte count, or truncation status.
- No required current-state inventory columns.
- No explicit D-decision coverage validator.
- No screenshot default or documented screenshot fallback.

## Revised Recommendations

- Require full local source snapshots for all 31 Magic Patterns mobile files.
- Add a per-file snapshot manifest with file size, capture status, and truncation status.
- Require truth-matrix rows at element/control/state grain, not page-only grain.
- Define current route inventory columns and route list.
- Define exact A0 completion labels: complete, partial, blocked.
- Treat screenshots as required when available; otherwise record unavailable tooling and require source-linked downstream app screenshots.

## Go / No-Go Recommendation

No-go until PRD v2 removes the source-evidence loophole and strengthens matrix coverage acceptance. A0 can still proceed after revision because Magic Patterns status is currently stable and the connector is available.

## Plan Revision Inputs

### Required Deletions

- Remove "or explicit connector evidence in README" as a substitute for durable source files.
- Remove "at least one truth-matrix row" as a sufficient page coverage criterion.

### Required Additions

- Full source snapshot requirement for every Magic Patterns mobile file.
- Per-file snapshot manifest with capture status and truncation/size information.
- Element/control/state-level truth matrix grain.
- Current-state route inventory schema.
- A0 completion label definitions.

### Required Acceptance Criteria Changes

- A0 is complete only when every active mobile file is captured or the result is explicitly marked blocked/partial.
- Every D-decision-linked element and every forbidden/unsupported visible claim must have its own truth row.
- Route inventory must enumerate actual production routes and required Android evidence levels.

### Required Validation Changes

- Add a source snapshot manifest check.
- Add matrix coverage check for all active mobile files and D-001 through D-014.
- Add forbidden authorization scan for QR, offline sync/read, telemetry, E2EE, fake account, fake version, biometric, package migration, and embedded player claims.

### Required No-Go Gates

- Missing full Magic Patterns source snapshot for any active mobile file.
- Any D-decision row absent from the truth package.
- Any unsupported prototype behavior not classified.
- Route inventory absent or missing evidence-level labels.

## Residual Risks

Even after revision, A0 will still be a planning/source-truth artifact. It will not prove Android runtime behavior; later slices still need authenticated APK and native entry-path evidence before any Android-complete release claim.
