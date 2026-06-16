# Feature Release A21 Final Post-A20 Review PRD V2

Created: 2026-06-16 21:12:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Supersedes: `FEATURE_RELEASE_A21_FINAL_POST_A20_REVIEW_PRD_V1_2026-06-16_21-10-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A21_FINAL_POST_A20_REVIEW_PRD_ADVERSARIAL_REVIEW_2026-06-16_21-11-00_IST.md`

## Problem Statement

A20 fixed the two A19 P1 blockers and staged the post-fix release candidate. Before any commit, PR, publication, or release-completion claim, the staged candidate needs a final staged-only review that verifies the A20 fixes, checks release-critical surfaces, and separates commit readiness from publication readiness.

## Goals

1. Review only `git diff --cached` so intentionally unstaged running-log/deferred material is excluded.
2. Materialize staged review inputs under `/tmp` for source/security/public/governance inspection.
3. Re-check the A19 P1 areas after A20:
   - signed-session enforcement for first-pass private pages/APIs;
   - Ask history state remount on thread navigation.
4. Re-check high-risk release surfaces: public/offline assets, Android packaging config, private shell/privacy, and governance staging hygiene.
5. Verify staged-index hygiene before and after A21 docs/log work: path count, whitespace check, root running-log exclusion, heavy evidence exclusion, APK artifact exclusion, and no broad category staging.
6. Produce explicit recommendations for both commit consideration and publication/deployment readiness.

## Non-Goals

- Do not edit source in A21 unless a blocker is found and a follow-up A22 fix slice is created.
- Do not deploy, publish, sign, upload, push, or create a PR.
- Do not stage root `RUNNING_LOG.md`.
- Do not treat APK publication authorization as solved.

## Acceptance Criteria

| ID | Criterion | Priority |
| --- | --- | --- |
| A21-R1 | Staged-only review inputs are captured and reproducible. | P0 |
| A21-R2 | A19 P1 blockers are confirmed fixed or reopened with evidence. | P0 |
| A21-R3 | No new P0/P1 blocker is found in staged source/config/governance. | P0 |
| A21-R4 | Staged index passes whitespace and exclusion checks before and after A21 docs are staged. | P0 |
| A21-R5 | Recommendation clearly distinguishes commit readiness from publication/deployment readiness. | P0 |
| A21-R6 | Residual P2/P3 risks and release gates are explicitly listed. | P1 |
| A21-R7 | PM trackers and running log are updated after the review; root running log remains unstaged. | P1 |
