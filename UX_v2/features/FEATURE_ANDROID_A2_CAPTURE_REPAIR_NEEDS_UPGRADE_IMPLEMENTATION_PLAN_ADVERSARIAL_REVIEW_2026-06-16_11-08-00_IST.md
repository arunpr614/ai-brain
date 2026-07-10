# Feature Android A2 Capture Repair Needs Upgrade Implementation Plan - Adversarial Review

**Created:** 2026-06-16 11:08:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V1_2026-06-16_11-06-00_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_11-08-00_IST.md`

## Executive Verdict

No-go for direct execution from implementation plan v1. The plan is close, but it under-specifies the browser technique for file/dropzone error evidence, treats heavy gates as optional despite a local-complete claim, and does not yet pin the exact repair success data checks.

## Evidence Inspected

- `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_IMPLEMENTATION_PLAN_V1_2026-06-16_11-06-00_IST.md`
- `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_V2_2026-06-16_11-04-00_IST.md`
- `src/app/capture/pdf-dropzone.tsx`
- `src/app/items/[id]/repair/actions.ts`
- `src/app/items/[id]/repair/repair-form.tsx`
- `src/app/needs-upgrade/page.tsx`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Browser QA plan requires PDF error proof but no reliable file-input technique is defined

**Evidence:** Plan v1 requires "PDF non-PDF error" evidence. Current `PdfDropzone` hides the file input and also supports drag/drop; Browser MCP may not expose a native file chooser or drag a local file into a hidden input.
**Why it matters:** A2 can get stuck late in QA or skip an acceptance criterion.
**Failure mode:** The implementation is done, but evidence cannot produce the PDF error state without manual or brittle browser internals.
**Recommendation:** Plan v2 must allow an action-backed component/unit harness or a controlled browser-side DOM event only if supported; otherwise explicitly downgrade PDF non-PDF proof to focused component/script evidence and capture the rendered error state through a test-only route or fixture.

#### 2. Heavy gates cannot be optional if A2 is called locally complete

**Evidence:** Plan v1 says typecheck, lint, full tests, and build are "if time and local state allow." A1's QA doc recorded those heavy gates as completed, and A2 changes shared capture/repair pages.
**Why it matters:** Capture/repair touch trust-sensitive workflows. A local completion claim without at least typecheck/lint/focused tests/diff check is too weak.
**Failure mode:** Type errors, lint issues, or broken build ship into the dirty worktree and are only found later.
**Recommendation:** Plan v2 must require typecheck and lint for A2 local completion. Full test/build can be required unless blocked; if blocked, QA must state the blocker.

#### 3. Repair success data checks need exact SQL/API assertions

**Evidence:** Plan v1 says repair success removes weak item but does not define how to verify tag/collection preservation or quality change.
**Why it matters:** The PRD v2 explicitly requires data-state proof.
**Failure mode:** Browser sees redirect, but data semantics are not checked.
**Recommendation:** Plan v2 must define exact checks: query repaired item fields, Needs Upgrade count/absence, tag relation count, collection relation count, and item detail banner/body.

### P2 - Medium Risk

#### 1. Seed script must avoid importing app modules before `BRAIN_DB_PATH` is set

**Evidence:** A1 learned the app uses `BRAIN_DB_PATH`; importing DB modules too early binds the singleton to the wrong DB.
**Why it matters:** Seed scripts can silently write to `data/brain.sqlite`.
**Failure mode:** Local private DB is polluted and evidence DB remains empty.
**Recommendation:** Plan v2 must set `BRAIN_DB_PATH` before imports or require command-level env variables and document them in the script header.

#### 2. Plan does not require browser report false-positive hygiene

**Evidence:** A1 needed harness corrections for capitalization false positives.
**Why it matters:** A2 has similar title/copy transforms and route samples.
**Failure mode:** Final report says nonzero issues even when UI is correct, or false positives are silently deleted.
**Recommendation:** Require any harness correction to be stored in the report with raw sample and resolution.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It assumes browser automation can easily create all file-input states.
- It weakens verification at the exact point where capture/repair changes can break workflows.
- It does not encode the A1 DB-path lesson into the seed plan.

## Missing Validation

- Exact repair SQL/data checks.
- Required typecheck/lint gates.
- Reliable PDF error proof method.
- DB-path guard in seed script.
- Harness false-positive reporting policy.

## Revised Recommendations

Revise the plan before coding. Keep the same scope but make evidence mechanics executable and make typecheck/lint mandatory.

## Go / No-Go Recommendation

No-go from plan v1. Go after plan v2 resolves the P1/P2 findings.

## Plan Revision Inputs

### Required Deletions

- Delete "if time and local state allow" wording for typecheck and lint.

### Required Additions

- Add exact repair success SQL/data assertions.
- Add seed script DB-path guard.
- Add PDF error evidence fallback.
- Add harness false-positive recording rule.

### Required Acceptance Criteria Changes

- A2 local completion requires focused tests, copy scan, seed smoke, browser report, `git diff --check`, typecheck, and lint.

### Required Validation Changes

- Include repair tag/collection preservation checks.
- Include clear blocked reporting if full suite or build cannot be rerun.

### Required No-Go Gates

- No A2 completion without typecheck/lint unless explicitly documented as blocked.
- No A2 completion without repair data-state proof.

## Residual Risks

Browser mobile evidence still cannot prove Android file picker, native keyboard, WebView cookie/session behavior, or APK layout. Those remain final Android release gates.
