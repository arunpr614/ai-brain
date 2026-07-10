# Feature Release A14 Dirty Worktree Attribution PRD V2

Created: 2026-06-16 19:28:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Supersedes: `FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_PRD_V1_2026-06-16_19-24-01_IST.md`
Adversarial review: `FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_PRD_ADVERSARIAL_REVIEW_2026-06-16_19-26-00_IST.md`

## Problem Statement

A13 confirmed that UX v2 cannot reach final release closure while dirty-worktree ownership remains incomplete. The compact `git status --short` count is 306 entries, but the expanded untracked file inventory is 868 files, and the tracked diff spans 97 files with 5,494 insertions and 6,661 deletions in tracked paths.

The release owner needs an explicit attribution and owner-review map before any final commit, PR, APK publication, or goal-complete claim. A14 must reduce the blocker from "broad dirty worktree" to a concrete release-scope manifest with traceable path lists, owner-review buckets, validation gates, and no-go conditions.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A13_FINAL_OWNERSHIP_PUBLICATION_AUDIT_2026-06-16_19-18-07_IST.md` | A13 blocker source: dirty ownership incomplete and publication gated. |
| `git status --short` | Compact changed/untracked count and tracked/untracked split. |
| `git diff --name-only` | Tracked modified file list; currently 97 files. |
| `git ls-files --others --exclude-standard` | Expanded untracked file inventory; currently 868 files. |
| `git diff --stat` and `git diff --numstat` | Tracked diff scale and risk surface. |
| Ignored APK artifact scan | Confirms debug APK artifacts exist but are ignored and should not be blindly staged. |

## Goals

1. Produce a release-owner attribution report that classifies tracked, untracked, and ignored release artifacts.
2. Include exact tracked modified path inventory and reproducible commands for expanded untracked inventory.
3. Define owner-review buckets for candidate release code, tests, Android config/assets, current release docs/evidence, historical/reference packages, ignored artifacts, and blocked/unknown files.
4. Identify files or directories that need human release-owner acceptance before staging.
5. Preserve all existing changes; do not revert, stage, commit, or publish.
6. Update the project tracker and running log after the attribution milestone.

## Non-Goals

- Do not edit application behavior.
- Do not run broad refactors or cleanup.
- Do not stage, commit, push, publish, sign, or upload artifacts.
- Do not delete, move, archive, compact, or normalize untracked docs/evidence.
- Do not claim that ownership is fully closed unless the release owner accepts every release-bound bucket.
- Do not treat ignored APK hashes as publication authorization or artifact retention policy.
- Do not include raw secrets from logs or evidence.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A14-R1 | Dual-count inventory | P0 | Report records compact `git status --short` entry count and expanded untracked file count, so release risk is not understated. |
| A14-R2 | Exact tracked path inventory | P0 | Report includes all tracked modified paths or an exact tracked-path appendix generated from `git diff --name-only`. |
| A14-R3 | Expanded untracked classification | P0 | Report classifies expanded untracked files by top-level and key subdirectory buckets, and includes commands to regenerate full path lists. |
| A14-R4 | Candidate release code bucket | P0 | Report identifies app/source/test/schema/config files as candidate release bundles for owner review, not as auto-stage instructions. |
| A14-R5 | UX v2 sub-bucket split | P1 | Report separates `UX_v2/features`, `UX_v2/execution`, `UX_v2/project_management`, `UX_v2/trackers`, `UX_v2/UX_Final_Plan`, and source snapshot/evidence folders. |
| A14-R6 | Documentation/evidence bucket | P1 | Report identifies current PRD, QA, PM, handover, and evidence artifacts that support the release but should be reviewed separately from app code. |
| A14-R7 | Historical/reference bucket | P2 | Report distinguishes historical design/planning/reference packages from current release-critical implementation artifacts. |
| A14-R8 | Ignored artifact identity policy | P0 | Report records ignored APK artifacts and hashes as identity evidence only, not publication authorization or staging policy. |
| A14-R9 | Unknown-risk no-go | P0 | Report lists unknown-risk files or buckets that block final ownership completion until reviewed. |
| A14-R10 | Bucket validation matrix | P1 | Report maps each candidate owner-review bucket to required validation before any final release claim. |
| A14-R11 | Freshness caveat | P1 | Report states that counts and path lists are valid only for the command timestamp and must be rerun before staging. |
| A14-R12 | Tracker/log update | P1 | A14 project tracker and root running log are updated after the attribution report is created and validated. |

## Acceptance Checks

1. Current inventory commands are rerun during execution and their counts are recorded.
2. A14 report includes a tracked modified path appendix or exact list.
3. A14 report includes an owner-review recommendation table with at least: candidate owner-review bundle, review-before-include, reference-only, ignored-artifact identity, and blocked/unknown buckets.
4. A14 report includes a no-go statement that final release ownership remains incomplete unless the release owner accepts each release-bound bucket.
5. A14 report includes bucket-specific validation gates: typecheck, lint, targeted tests, full tests, Next build, APK build, Android runtime smoke, and secret/evidence scans where applicable.
6. `git diff --check` passes for tracked files touched by A14.
7. A14 Markdown docs have no trailing whitespace.
8. A14 docs do not include raw tokens, session cookies, bearer values, private pairing codes, or copied private item content.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Manifest is mistaken for release approval | P0 | Use owner-review language, no-go labels, and no staging/commit actions. |
| Compact status count hides large untracked evidence package | P0 | Include both compact and expanded counts. |
| Code and evidence are staged together blindly | P1 | Separate source/test/config from docs/evidence/reference packages. |
| `UX_v2` gets staged as one giant bucket | P1 | Split `UX_v2` into feature, execution, PM, tracker, final-plan, and snapshot/evidence buckets. |
| Ignored APK artifacts are lost or accidentally treated as publishable | P1 | Record hashes as identity evidence only; keep publication authorization blocked. |
| Attribution report becomes stale quickly | P2 | Include command timestamp and rerun-before-staging caveat. |

## Completion Definition

A14 is complete when the release-owner attribution report exists, has passed adversarial review-driven execution planning, classifies the current dirty worktree with traceable evidence, updates trackers/log, and explicitly preserves remaining no-go gates.

A14 completion does not mean final release ownership is closed. It means the release owner has a concrete map for closing it.
