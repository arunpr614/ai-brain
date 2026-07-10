# Feature Release A21 Final Post-A20 Review Implementation Plan V2

Created: 2026-06-16 21:15:00 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A21_FINAL_POST_A20_REVIEW_PRD_V2_2026-06-16_21-12-00_IST.md`
Supersedes: `FEATURE_RELEASE_A21_FINAL_POST_A20_REVIEW_IMPLEMENTATION_PLAN_V1_2026-06-16_21-13-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A21_FINAL_POST_A20_REVIEW_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_21-14-00_IST.md`

## Output Files

- Review report: `UX_v2/execution/UX_V2_A21_FINAL_POST_A20_STAGED_REVIEW_2026-06-16_21-20-00_IST.md`
- PM update: `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_21-20-00_IST.md`

## Step Plan

1. Capture staged path list, staged diff stat, and staged-only diff slices under `/tmp`.
2. Locally review A20 auth changes and Ask keyed remount changes.
3. Spawn read-only review agents with bounded questions:
   - Security/privacy: verify A20 fixed A19 signed-session issues and identify any new P0/P1 auth/privacy blockers in staged diff.
   - Product behavior: verify Ask history remount fix and identify any new P0/P1 user-data or wrong-thread behavior.
   - Public/packaging/governance: verify public/offline/Android packaging and staged governance hygiene for P0/P1 issues.
4. Inspect staged/unstaged overlap and distinguish intentional unstaged root log/deferred docs from release-candidate files.
5. Verify staged hygiene: `git diff --cached --check`, path count, root running-log exclusion, heavy evidence exclusion, APK artifact exclusion, and blocked-path scan.
6. Record A20 validation freshness: no source edits after A20 validation unless A21 discovers and fixes a blocker; if source edits happen, rerun validation.
7. Create A21 review report and PM update.
8. Stage A21 governance docs only, rerun final staged count/exclusion/whitespace checks, append running log, and verify root `RUNNING_LOG.md` remains unstaged.

## No-Go Conditions

- Any A19 P1 remains reproducible.
- Any new P0/P1 is found.
- Staged index contains root `RUNNING_LOG.md`, APK artifacts, heavy evidence, or broad forbidden paths.
- A21 edits source without rerunning validation.
