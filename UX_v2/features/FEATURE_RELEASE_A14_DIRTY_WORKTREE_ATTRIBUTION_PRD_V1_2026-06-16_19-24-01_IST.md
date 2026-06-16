# Feature Release A14 Dirty Worktree Attribution PRD V1

Created: 2026-06-16 19:24:01 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`

## Problem Statement

A13 confirmed that UX v2 cannot reach final release closure while dirty-worktree ownership remains incomplete. The compact `git status --short` count is 306 entries, but the expanded untracked file inventory is 868 files, and the tracked diff spans 97 files with 5,494 insertions and 6,661 deletions in tracked paths.

The release owner needs an explicit staging and attribution map before any final commit, PR, APK publication, or goal-complete claim. A14 must reduce the blocker from "broad dirty worktree" to a concrete release-scope manifest with owned buckets, review gates, and no-go conditions.

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
2. Define staging buckets for release-critical code, tests, Android config/assets, release docs/evidence, historical planning artifacts, generated/ignored artifacts, and unknown-risk files.
3. Identify files or directories that need human release-owner review before staging.
4. Preserve all existing changes; do not revert, stage, commit, or publish.
5. Update the project tracker and running log after the attribution milestone.

## Non-Goals

- Do not edit application behavior.
- Do not run broad refactors or cleanup.
- Do not stage, commit, push, publish, sign, or upload artifacts.
- Do not delete, move, archive, compact, or normalize untracked docs/evidence.
- Do not claim that ownership is fully closed unless the manifest proves every release-bound file is attributed and accepted.
- Do not include raw secrets from logs or evidence.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A14-R1 | Dual-count inventory | P0 | Report records both compact `git status --short` entry count and expanded untracked file count, so release risk is not understated. |
| A14-R2 | Tracked diff classification | P0 | Report classifies all tracked modified paths by top-level category and release relevance. |
| A14-R3 | Expanded untracked classification | P0 | Report classifies expanded untracked files by top-level and key subdirectory buckets. |
| A14-R4 | Release-critical source bucket | P0 | Report identifies app/source/test/schema/config files that likely must be staged together for the UX v2 release to build and function. |
| A14-R5 | Documentation/evidence bucket | P1 | Report identifies UX v2 PRD, QA, PM, handover, and evidence artifacts that support the release but should be reviewed separately from app code. |
| A14-R6 | Historical/reference bucket | P2 | Report distinguishes historical design/planning/reference packages from current release-critical implementation artifacts. |
| A14-R7 | Ignored artifact policy | P0 | Report records ignored APK artifacts and hashes but says they should not be staged unless release owner intentionally changes artifact policy. |
| A14-R8 | Unknown-risk no-go | P0 | Report lists unknown-risk files or buckets that block final ownership completion until reviewed. |
| A14-R9 | Validation plan | P1 | Report maps staging buckets to required validation before any final release claim. |
| A14-R10 | Tracker/log update | P1 | A14 project tracker and root running log are updated after the attribution report is created and validated. |

## Acceptance Checks

1. Current inventory commands are rerun during execution and their counts are recorded.
2. A14 report includes a staged-release recommendation table with at least: include, review-before-include, archive/reference-only, ignored-artifact, and blocked/unknown buckets.
3. A14 report includes a no-go statement that final release ownership remains incomplete unless the release owner accepts each bucket.
4. `git diff --check` passes for tracked files touched by A14.
5. A14 Markdown docs have no trailing whitespace.
6. A14 docs do not include raw tokens, session cookies, bearer values, private pairing codes, or copied private item content.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Manifest is mistaken for release approval | P0 | Use explicit no-go labels and no staging/commit actions. |
| Compact status count hides large untracked evidence package | P0 | Include both compact and expanded counts. |
| Code and evidence are staged together blindly | P1 | Separate source/test/config from docs/evidence/reference packages. |
| Ignored APK artifacts are lost or accidentally committed | P1 | Record hashes and policy; do not stage ignored artifacts. |
| Attribution report becomes stale quickly | P2 | Include command timestamp and require rerun before staging. |

## Completion Definition

A14 is complete when the release-owner attribution report exists, has passed adversarial review-driven execution planning, classifies the current dirty worktree with evidence, updates trackers/log, and explicitly preserves remaining no-go gates.

A14 completion does not mean final release ownership is closed. It means the release owner has a concrete map for closing it.
