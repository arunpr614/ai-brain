# Feature Release A16 Lint Warning Cleanup PRD V1

Created: 2026-06-16 19:48:00 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Origin: A15 source/config validation preflight

## Problem Statement

A15 passed source/config validation, but `npm run lint` still reported one warning: an unused `eslint-disable` directive in `src/lib/queue/enrichment-batch-cron.ts`. The warning does not block execution today because lint exits 0, but keeping a known warning in the final release path creates avoidable noise for later staged validation and makes future lint regressions less obvious.

A16 exists to remove that known warning without changing runtime behavior, release ownership, APK artifacts, deployment state, or publication gates.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_2026-06-16_19-41-10_IST.md` | Records lint passing with 0 errors and 1 warning. |
| `src/lib/queue/enrichment-batch-cron.ts` | Contains the unused `eslint-disable-next-line no-var` directive above the `declare global` `var __brainBatchCron` declaration. |
| `UX_v2/execution/UX_V2_A14_DIRTY_WORKTREE_ATTRIBUTION_REPORT_2026-06-16_19-28-32_IST.md` | Preserves broad release-owner staging and attribution gates. |
| Root `RUNNING_LOG.md` latest A15 entry | Defines remaining release gates and the next milestone. |

## Goals

1. Remove the obsolete lint suppression that caused A15's only lint warning.
2. Preserve TypeScript behavior and global declaration semantics.
3. Re-run lint and record whether it is now warning-free.
4. Keep A13/A14/A15 release no-go gates unchanged unless separately resolved with evidence.
5. Update project trackers and root running log after validation.

## Non-Goals

- Do not refactor cron behavior, scheduling, queue logic, tests, or enrichment code.
- Do not alter lint configuration or suppress the warning globally.
- Do not stage, commit, push, deploy, publish, sign, upload, or rebuild APK artifacts.
- Do not claim release completion from warning cleanup alone.
- Do not edit unrelated dirty-worktree files.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A16-R1 | Scope control | P0 | The only product source edit is removal of the unused suppression in `src/lib/queue/enrichment-batch-cron.ts`. |
| A16-R2 | Lint warning cleanup | P0 | `npm run lint` exits 0 and reports 0 warnings after the edit. |
| A16-R3 | TypeScript safety | P1 | Either `npm run typecheck` is rerun and passes, or the report explains why lint-only validation is sufficient for a comment-only source change. |
| A16-R4 | Evidence report | P1 | A16 execution report records before/after warning state, commands, exit codes, and residual release blockers. |
| A16-R5 | Tracker/log continuity | P1 | Milestone tracker, release packet, delivery gate tracker, PM tracker update, and root running log reflect A16 status. |
| A16-R6 | Release gate honesty | P0 | A16 docs do not claim final staging, publication, deployment, or goal completion. |

## Acceptance Checks

1. A16 PRD v2 and implementation plan v2 exist after adversarial review.
2. The source diff shows only removal of the unused lint suppression line from `src/lib/queue/enrichment-batch-cron.ts`.
3. `npm run lint` passes with 0 errors and 0 warnings.
4. `git diff --check` passes for A16-touched tracked files.
5. A16 docs have no trailing whitespace.
6. A16 secret-pattern scan finds no raw credentials; literal safety terms in review templates are allowed only if explained.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A comment-only cleanup accidentally widens into runtime cron changes | P0 | Require source diff to be limited to the stale suppression line. |
| Warning-free lint is mistaken for release completion | P0 | Preserve all unrelated release no-go labels in A16 report and trackers. |
| Lint output changes due unrelated dirty worktree activity | P1 | Capture inventory counts and command timestamp. |
| TypeScript requires the suppression after all | P2 | Run lint and either typecheck or explain why no type surface changed. |

## Completion Definition

A16 is complete when the stale lint suppression is removed, lint is warning-free, the source diff remains tightly scoped, A16 evidence is documented, trackers/log are updated, and all unrelated release gates remain open.

A16 completion does not mean final staged release readiness, APK publication, deployment, or full project goal completion.
