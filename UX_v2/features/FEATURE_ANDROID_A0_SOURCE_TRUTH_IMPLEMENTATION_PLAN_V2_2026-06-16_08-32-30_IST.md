# Feature Implementation Plan v2: Android A0 Source Freeze, Truth Matrix, And Decision Authorization

Created: 2026-06-16 08:32:30 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Product source: `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_V2_2026-06-16_08-25-30_IST.md`
Supersedes: `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_IMPLEMENTATION_PLAN_V1_2026-06-16_08-28-00_IST.md`
Adversarial review: `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_08-30-00_IST.md`
Status: Revised execution source. Documentation-only execution; no app source edits.

## Execution Timestamp

Use one run timestamp for all A0 execution outputs:

`2026-06-16_08-32-30_IST`

If A0 is rerun, create a new timestamped package instead of overwriting this run.

## Objective

Create a complete Android A0 source-truth package. Completion requires exact source path coverage, full local Magic Patterns mobile source capture, element/control/state-level truth mapping, D-decision authorization, route inventory, and evidence-level rules.

## Phase 1 - Source Status And Expected File List

1. Run Magic Patterns `get_design_status` for editor `d5w3fb6rzxdeht7urnye5r`.
2. Require `isGenerating=false`; otherwise stop and mark A0 `Blocked`.
3. Record active artifact ID and available file list.
4. Create:
   - `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/`
   - `source/`
   - `EXPECTED_SOURCE_FILES.txt`
   - `MAGIC_PATTERNS_READ_BATCH_LOG.md`
5. `EXPECTED_SOURCE_FILES.txt` must be generated from the Magic Patterns status response, not from a remembered list.

## Phase 2 - Full Source Snapshot

1. Read Magic Patterns source files in bounded batches.
2. For each batch, log:
   - requested files;
   - returned files;
   - missing files;
   - tool error, if any.
3. Write each returned file to the local `source/` folder using the same relative path.
4. Create `SOURCE_FILE_MANIFEST.md` with:
   - expected file path;
   - returned file path;
   - saved local path;
   - byte count;
   - line count;
   - capture status: `captured_full`, `missing`, `zero_byte`, `tool_error`, or `partial_or_failed`;
   - notes.
5. Mark a file `captured_full` only if:
   - it was requested;
   - it was returned for the exact expected path;
   - saved local byte count is greater than zero;
   - no tool error/truncation indication occurred for that file.
6. A0 cannot be `Complete` unless the expected path set exactly equals the local snapshot path set and every manifest row is `captured_full`.

## Phase 3 - Source-Derived Coverage Checklist

Create `ANDROID_A0_SOURCE_COVERAGE_CHECKLIST.md` in the snapshot folder.

For each mobile page or component, list rows to classify in the truth matrix:

- page-level states;
- visible primary actions;
- icon-only actions;
- nav actions;
- sheets/drawers/tabs/filter groups;
- status badges/result states/empty states/error states;
- fake identity/version/device/sync fields;
- offline/QR/telemetry/privacy/E2EE/biometric/package/media/mutation claims;
- D-decision-linked elements.

Completion requires every checklist row to have a truth-matrix row or an explicit `not present in source` note backed by source inspection.

## Phase 4 - A0 Source Manifest

Create `UX_v2/execution/ANDROID_A0_SOURCE_MANIFEST_2026-06-16_08-32-30_IST.md` with:

- user goal project folder;
- parent PRD and plan;
- active Magic Patterns mobile artifact;
- Magic Patterns status timestamp;
- expected source file count;
- captured source file count;
- source snapshot folder;
- existing web source manifest;
- completed Android share-result truth matrix;
- current branch and dirty-state summary;
- source authority order;
- A0 completion label.

## Phase 5 - Design Truth Matrix

Create `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`.

Required sections:

1. Source coverage summary.
2. D-001 through D-014 decision authorization.
3. Source-derived coverage checklist summary.
4. Screen truth matrix for:
   - MobileFrame;
   - MobileBottomNav;
   - Library;
   - Share Capture;
   - Capture;
   - Repair;
   - Needs Upgrade;
   - Ask;
   - Item Detail;
   - More;
   - Offline;
   - Login/Unlock/Pairing;
   - Topic;
   - Collection.
5. Forbidden prototype behavior table.
6. Completed share-result slice reference.

Required columns:

| Column | Meaning |
| --- | --- |
| Source file | Magic Patterns file |
| Source element/state | Visible control, row, copy, state, group, or data field |
| Prototype behavior/copy | What Magic Patterns presents |
| Production truth | What AI Memory can truthfully do |
| Decision ID | D-ID or `none` |
| Implementation action | `implement`, `adapt copy`, `hide`, `disable`, `defer`, `out of scope`, `needs decision` |
| Validation required | Screenshot, test, APK, source scan, copy scan, or release gate |
| Completion eligible | Yes/no |
| Notes | Any caveat |

## Phase 6 - Evidence Strategy And Route Inventory

Create `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-32-30_IST.md`.

Required content:

- Android evidence labels and claim rules;
- route/native entry inventory with all required PRD v2 columns;
- route-to-source mapping for current production files;
- current tests/evidence inventory;
- required Android evidence level per later slice;
- privacy/redaction rules;
- release blockers and deploy/APK constraints.

## Phase 7 - Validation

Run and record:

1. Magic Patterns status recheck result.
2. Exact expected-vs-actual path comparison:
   - every `EXPECTED_SOURCE_FILES.txt` path must exist under `source/`;
   - no unexpected source files unless explicitly explained;
   - every manifest row must be `captured_full`.
3. Source coverage checklist check:
   - every checklist row maps to a truth-matrix row or has a source-backed `not present` note.
4. D-decision coverage:
   - D-001 through D-014 all appear in the truth matrix.
5. Dangerous authorization audit:
   - no forbidden concept has `Implementation action=implement`;
   - QR, offline sync/read, telemetry, E2EE, fake account, fake version, biometric, package migration, embedded player, and untested mutation rows must be `hide`, `disable`, `defer`, or `out of scope`.
6. Route inventory check:
   - every mobile source screen maps to a route/native entry or `none`;
   - every row has a required Android evidence level.
7. `git diff --check`.

## Phase 8 - Tracker And Running Logs

Create:

- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_08-32-30_IST.md`

Update:

- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_2026-06-15_21-46-45_IST.md`
- `RUNNING_LOG.md`
- `UX_v2/RUNNING_LOG.md`

## No-Go Gates

| Gate | Blocks |
| --- | --- |
| Magic Patterns `isGenerating=true` | A0 execution |
| Expected source path set does not equal local source path set | A0 `Complete` status |
| Any source file status other than `captured_full` | A0 `Complete` status |
| Any coverage checklist row missing from truth matrix without source-backed `not present` note | A0 `Complete` status |
| Any D-001 through D-014 row missing | Later Android coding |
| Any forbidden concept marked `implement` | Later Android coding |
| Route inventory missing evidence labels | Later Android coding |
| Any app source edit in A0 | A0 completion |

## Validation Commands And Audits

Use commands plus manual table audit. The raw scans are evidence-gathering helpers, not standalone proof.

```bash
git diff --check
comm -3 <(sort EXPECTED_SOURCE_FILES.txt) <(find source -type f | sed 's#^source/##' | sort)
rg -n "D-00[1-9]|D-01[0-4]" UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md
rg -n "QR|offline sync|offline read|telemetry|E2EE|fake account|fake version|biometric|package migration|embedded player|delete-all-data" UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-32-30_IST.md
```

Manual audit must inspect the action/completion columns for the forbidden rows. Raw keyword matches are expected because the documents must mention forbidden concepts to classify them.

## Expected Outcome

A0 finishes as `Complete` only if exact source capture, checklist coverage, D-decision coverage, route inventory, dangerous authorization audit, and diff check pass. Otherwise it must be marked `Partial` or `Blocked` and broader Android coding must not proceed.
