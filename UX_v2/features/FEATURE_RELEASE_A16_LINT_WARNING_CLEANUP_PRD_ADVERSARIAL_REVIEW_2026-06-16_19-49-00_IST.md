# Feature Release A16 Lint Warning Cleanup PRD - Adversarial Review

**Created:** 2026-06-16 19:49:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A16_LINT_WARNING_CLEANUP_PRD_V1_2026-06-16_19-48-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A16_LINT_WARNING_CLEANUP_PRD_ADVERSARIAL_REVIEW_2026-06-16_19-49-00_IST.md`

## Executive Verdict

Conditional go after tightening. The PRD is correctly narrow, but v1 leaves too much room to skip cheap proof and does not require a fresh pre-edit baseline that the warning still exists.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A16_LINT_WARNING_CLEANUP_PRD_V1_2026-06-16_19-48-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_2026-06-16_19-41-10_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/lib/queue/enrichment-batch-cron.ts:49`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/RUNNING_LOG.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

No P1 findings found.

### P2 - Medium Risk

#### 1. Typecheck is optional even though the file contains a global TypeScript declaration

**Evidence:** PRD v1 A16-R3 allows the report to explain why lint-only validation is sufficient. The target file declares `globalThis.__brainBatchCron` in `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/lib/queue/enrichment-batch-cron.ts:48`.
**Why it matters:** The edit should be comment-only, but the release evidence is stronger and cheaper if typecheck stays green after the touched TypeScript file is validated.
**Failure mode:** A later reviewer sees a TypeScript global declaration touched during release polish and has to rediscover whether type safety was actually checked.
**Recommendation:** Make `npm run typecheck` mandatory for A16.

#### 2. The PRD does not require a fresh pre-edit proof that the warning still exists

**Evidence:** PRD v1 cites A15 output, but the worktree is active and broad. It requires post-edit lint but not a current baseline immediately before editing.
**Why it matters:** A16 could remove a line based on stale evidence or silently duplicate somebody else's fix.
**Failure mode:** The report overclaims that A16 fixed a warning when the warning was already gone before A16 execution.
**Recommendation:** Require a pre-edit source-line snapshot and either fresh lint baseline or explicit source-line proof that the unused suppression is still present.

### P3 - Low Risk Or Polish

#### 1. Diff proof should be explicit, not implied

**Evidence:** PRD v1 acceptance check 2 says the source diff should show only the suppression removal, but it does not require capturing the exact diff summary in the A16 execution report.
**Why it matters:** The dirty worktree is large; a reviewer needs quick proof that A16 did not expand the release surface.
**Failure mode:** A broad local diff hides a one-line source edit among unrelated changes.
**Recommendation:** Require the A16 report to include a scoped `git diff -- src/lib/queue/enrichment-batch-cron.ts` summary.

## What The Original Plan Or Work Gets Wrong

The PRD is right to keep A16 small, but it underestimates governance risk from a tiny change inside a very dirty worktree. The issue is not implementation complexity; it is proof quality.

## Missing Validation

- Mandatory `npm run typecheck`.
- Fresh pre-edit proof of the lint warning or stale suppression line.
- Scoped diff evidence for `src/lib/queue/enrichment-batch-cron.ts`.

## Revised Recommendations

1. Require a fresh pre-edit source-line snapshot.
2. Require lint and typecheck after the edit.
3. Require scoped diff evidence in the execution report.
4. Preserve all release no-go labels.

## Go / No-Go Recommendation

Conditional go. Proceed only after PRD v2 adds mandatory typecheck, fresh baseline proof, and scoped diff reporting.

## Plan Revision Inputs

### Required Deletions

- Delete the option to skip typecheck with explanation.

### Required Additions

- Add pre-edit baseline proof.
- Add scoped diff reporting for the touched TypeScript file.

### Required Acceptance Criteria Changes

- `npm run typecheck` must pass.
- A16 report must include before/after evidence.

### Required Validation Changes

- Add `git diff -- src/lib/queue/enrichment-batch-cron.ts`.

### Required No-Go Gates

- If lint is not warning-free after edit, A16 is not complete.
- If typecheck fails after edit, A16 is not complete.

## Residual Risks

The broad dirty worktree remains a release-governance risk after A16. A warning-free lint pass does not resolve release-owner staging, Android publication authorization, TalkBack spoken-order, or URL-share proof.
