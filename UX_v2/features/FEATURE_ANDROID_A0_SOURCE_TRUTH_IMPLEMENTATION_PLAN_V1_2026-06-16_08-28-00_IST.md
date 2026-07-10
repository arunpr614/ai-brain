# Feature Implementation Plan v1: Android A0 Source Freeze, Truth Matrix, And Decision Authorization

Created: 2026-06-16 08:28:00 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Product source: `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_V2_2026-06-16_08-25-30_IST.md`
Status: Draft for adversarial review. Documentation-only execution; no app source edits.

## Objective

Execute Android A0 by creating a complete local source-truth package for the active Magic Patterns mobile artifact. The package must be strong enough that later Android feature slices can cite it before coding.

## Execution Phases

### Phase 1 - Source Status And Folder Setup

1. Re-run Magic Patterns `get_design_status` for editor `d5w3fb6rzxdeht7urnye5r`.
2. Confirm `isGenerating=false`.
3. Record active artifact ID and file list.
4. Create:
   - `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-28-00_IST/`
   - `source/` subfolder mirroring artifact paths.

### Phase 2 - Full Source Snapshot

1. Read every active Magic Patterns mobile file with `read_artifact_files`.
2. Write each file to the local `source/` folder using the same relative path.
3. Create `SOURCE_FILE_MANIFEST.md` with:
   - file path;
   - byte count;
   - line count;
   - capture status;
   - truncation status;
   - notes.
4. If any file cannot be captured in full, mark A0 `Partial` or `Blocked`; do not mark A0 `Complete`.

### Phase 3 - A0 Source Manifest

Create `UX_v2/execution/ANDROID_A0_SOURCE_MANIFEST_2026-06-16_08-28-00_IST.md` with:

- user goal project folder;
- parent PRD and plan;
- active Magic Patterns mobile artifact;
- source snapshot folder;
- existing web source manifest;
- completed Android share-result truth matrix;
- current branch and dirty-state summary;
- source authority order.

### Phase 4 - Design Truth Matrix

Create `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-28-00_IST.md`.

Required sections:

1. Source coverage summary.
2. D-001 through D-014 decision authorization.
3. Screen truth matrix for:
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
4. Forbidden prototype behavior table.
5. Completed share-result slice reference.

Matrix grain must include page state, visible action/control group/status state, fake-data field, unsupported claim, mutation affordance, and D-decision-linked element.

### Phase 5 - Evidence Strategy And Route Inventory

Create `UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-28-00_IST.md`.

Required content:

- Android evidence labels and claim rules;
- route/native entry inventory with all required PRD v2 columns;
- route-to-source mapping for current production files;
- current tests/evidence inventory;
- required Android evidence level per later slice;
- privacy/redaction rules;
- release blockers and deploy/APK constraints.

### Phase 6 - Validation

Run and record:

1. Magic Patterns status recheck result.
2. Source manifest check: all active files present with nonzero byte count.
3. Matrix coverage check for all required mobile screens and D-001 through D-014.
4. Forbidden authorization scan across A0 outputs.
5. `git diff --check`.

### Phase 7 - Tracker And Running Logs

Create:

- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_08-28-00_IST.md`

Update:

- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_2026-06-15_21-46-45_IST.md`
- `RUNNING_LOG.md`
- `UX_v2/RUNNING_LOG.md`

## No-Go Gates

| Gate | Blocks |
| --- | --- |
| Magic Patterns `isGenerating=true` | A0 execution |
| Any active Magic Patterns source file missing/truncated | A0 `Complete` status |
| Any D-001 through D-014 row missing | Later Android coding |
| Any forbidden prototype behavior not classified | Later Android coding |
| Route inventory missing evidence labels | Later Android coding |
| Any app source edit in A0 | A0 completion |

## Validation Commands

Planned commands:

```bash
git diff --check
find UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-28-00_IST/source -type f | wc -l
rg -n "D-00[1-9]|D-01[0-4]" UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-28-00_IST.md
rg -n "QR|offline sync|offline read|telemetry|E2EE|fake account|biometric|package migration|embedded player" UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-28-00_IST.md UX_v2/execution/ANDROID_A0_EVIDENCE_STRATEGY_2026-06-16_08-28-00_IST.md
```

## Expected Outcome

A0 should finish as `Complete` only if every active Magic Patterns mobile source file is captured and every required decision, screen, route, and evidence label is documented. Otherwise the output must honestly say `Partial` or `Blocked` and stop broader Android coding.
