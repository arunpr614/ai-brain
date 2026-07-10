# Feature Release A19 Final Staged Candidate Review PRD V1

Created: 2026-06-16 20:35:00 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Depends on: `UX_v2/execution/UX_V2_A18_STAGED_RELEASE_CANDIDATE_QA_2026-06-16_20-28-00_IST.md`

## Problem Statement

A18 staged and validated a 258-file release candidate, but a staged candidate is not yet a reviewed release candidate. The next risk is approving a huge staged diff on validation alone without a final ownership/code review that asks whether the staged behavior, security/privacy posture, Android/public package surfaces, and governance scope are coherent.

A19 exists to review the staged candidate, not the entire dirty worktree. The review target is `git diff --cached` only. A19 must produce a line-backed review report and either clear the staged candidate for commit consideration or identify blockers that must be fixed and revalidated before commit.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A18_STAGED_RELEASE_CANDIDATE_QA_2026-06-16_20-28-00_IST.md` | Establishes staged path count, validation results, APK hash, and remaining gates. |
| `git diff --cached --name-only` | Defines the 258-file review scope. |
| `git diff --cached` | Defines the actual code/doc changes under review. |
| `/tmp/a18-final-pathspec.txt` if present | Defines expected staged pathspec from A18. |
| `RUNNING_LOG.md` latest A18 entry | Confirms root running log is intentionally unstaged and the overall goal remains active. |

## Goals

1. Complete the A19 PRD/review/PRD v2 and implementation-plan/review/plan v2 cycle.
2. Review only the staged 258-file candidate.
3. Split review into focused lanes:
   - product/source behavior,
   - auth/security/privacy,
   - Android/public/offline packaging,
   - test/quality/governance/staging hygiene.
4. Use independent read-only subagents for review lanes where useful, because the user explicitly authorized agent delegation for this project.
5. Verify every candidate finding against the staged diff or current source before recording it.
6. Produce `UX_v2/execution/UX_V2_A19_FINAL_STAGED_CANDIDATE_REVIEW_2026-06-16_20-45-00_IST.md`.
7. Produce a PM tracker update and update milestone/release trackers.
8. If blockers are confirmed, fix them in a follow-on governed slice and rerun affected validation before commit.
9. If no blockers are confirmed, mark the staged candidate ready for final owner commit/PR decision while preserving publication gates.

## Non-Goals

- Do not review or stage unstaged deferred files, heavy evidence, ignored APK artifacts, root `RUNNING_LOG.md`, or historical/reference docs as part of A19.
- Do not commit, push, open a PR, deploy, publish, sign, upload, or distribute the APK.
- Do not claim the full user goal is complete.
- Do not use `git diff HEAD` as the review target because it includes unstaged material.
- Do not accept unverified subagent findings as final.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A19-R1 | Review scope integrity | P0 | Review report states staged path count and confirms `git diff --cached` is the only review target. |
| A19-R2 | Lane coverage | P0 | Report covers product behavior, auth/security/privacy, Android/public/offline packaging, and test/quality/governance/staging hygiene. |
| A19-R3 | Finding verification | P0 | Every finding cites staged file and line evidence or is dismissed as unverified. |
| A19-R4 | Blocker handling | P0 | Any confirmed P0/P1 blocker leads to a no-go recommendation and a required fix/revalidation plan. |
| A19-R5 | No false release claim | P0 | Report preserves commit/push/deploy/publication/full-goal no-go gates. |
| A19-R6 | Tracker/log continuity | P1 | A19 PM update, trackers, and running log are updated after report completion. |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Review accidentally includes unstaged deferred files | P0 | Use `git diff --cached` only and record staged count. |
| Huge staged diff hides a production bug | P0 | Split review lanes and verify findings against staged diff/source. |
| Subagents hallucinate findings | P1 | Main agent verifies or dismisses every finding before report finalization. |
| Findings are ignored to preserve momentum | P0 | Confirmed P0/P1 findings block commit consideration. |
| Review becomes a paperwork pass | P1 | Require concrete line/file evidence and final verdict. |

## Completion Definition

A19 is complete when the governed cycle exists, the staged 258-file candidate has a final line-backed review report, confirmed findings are classified, trackers/log are updated, and the next action is clear: fix/revalidate blockers or proceed to final owner commit/PR decision.

A19 completion does not publish, deploy, commit, push, or complete the full user goal.
