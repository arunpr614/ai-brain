# Feature Release A18 Staged Release Candidate PRD V1

Created: 2026-06-16 20:19:00 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Depends on: `FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_V2_2026-06-16_20-02-00_IST.md`

## Problem Statement

A17 created a file-only release bucket acceptance manifest and deliberately left the git index empty. The release candidate is still not staged, validated from the staged index, committed, pushed, or published. A18 must convert the A17 accepted lanes into an actual staged release candidate without broad staging, while preserving the remaining human publication gates.

The highest risk is false release confidence: staging too much, staging too little, silently including heavy evidence folders, or treating a staged source/config candidate as Android publication approval. A18 exists to perform the first controlled staging pass and prove exactly what entered the index.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A17_RELEASE_BUCKET_ACCEPTANCE_MANIFEST_2026-06-16_20-05-00_IST.md` | Defines accepted source/config paths, accepted governance-doc paths, excluded heavy evidence, and required validation after staging. |
| `RUNNING_LOG.md` latest A17 entry | Confirms A17 left staging, validation, APK publication, TalkBack, URL-share, and evidence retention open. |
| Current `git status --short` and `git diff --cached --name-only` | Establish current worktree and empty index before A18 staging. |
| `UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_2026-06-16_19-41-10_IST.md` | Establishes full dirty-tree validation passed before staging. |
| `UX_v2/execution/UX_V2_A16_LINT_WARNING_CLEANUP_QA_2026-06-16_19-54-00_IST.md` | Establishes the lint warning was removed before staging. |

## Goals

1. Complete the A18 PRD, adversarial review, PRD v2, implementation plan, adversarial review, and implementation plan v2 cycle.
2. Extract the accepted source/config and governance-doc file paths from A17 into an exact pathspec file.
3. Verify the pathspec contains concrete file paths only and that every path either exists in the worktree or is an intentional tracked modification/deletion.
4. Dry-run `git add` with the pathspec before staging.
5. Stage only accepted A17 source/config and governance-doc paths.
6. Verify the staged path list exactly matches the intended pathspec.
7. Run the A17 required validation matrix against the staged candidate.
8. Create an A18 execution report and PM tracker update.
9. Update milestone/release trackers and append root `RUNNING_LOG.md`.
10. Keep remaining no-go gates explicit: APK publication authorization, named distribution target, TalkBack spoken-order decision, URL-share success decision, heavy evidence retention, commit, push, PR, and production release.

## Non-Goals

- Do not use `git add .`, `git add -A`, broad repo-root staging, or broad directory staging.
- Do not stage heavy evidence/source-snapshot folders.
- Do not stage ignored APK artifacts or build outputs.
- Do not publish, sign, upload, or distribute the APK.
- Do not deploy production changes from A18 alone.
- Do not claim the full user goal is complete from staged validation alone.
- Do not stage root `RUNNING_LOG.md` unless append-only staging is separately proven or owner approval is explicit.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A18-R1 | Governed cycle | P0 | A18 PRD/review/PRD v2 and plan/review/plan v2 exist before staging. |
| A18-R2 | Pathspec extraction | P0 | A18 produces an exact pathspec from A17 accepted blocks and records source counts. |
| A18-R3 | Path safety | P0 | Pathspec inspection finds no blank paths, directories, globs, absolute paths, parent traversal, ignored APK outputs, or heavy evidence folders. |
| A18-R4 | Existence/status proof | P0 | Every path is confirmed as existing, tracked modified, or intentional untracked add before staging. |
| A18-R5 | Dry-run staging | P0 | `git add --dry-run --pathspec-from-file=...` is run before actual staging and reviewed for unexpected paths. |
| A18-R6 | Exact staging | P0 | Actual staging uses only the approved pathspec file; no broad staging command is used. |
| A18-R7 | Index equality | P0 | `git diff --cached --name-only` matches the approved pathspec exactly after staging. |
| A18-R8 | Staged validation | P0 | `git diff --cached --check`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:env`, and `npm run check:build-artifacts` pass after staging. |
| A18-R9 | Android rebuild decision | P1 | If Android/public runtime paths are staged, either run `npm run build:apk` or explicitly document why it remains deferred. |
| A18-R10 | Tracking/log continuity | P1 | A18 execution report, PM update, tracker updates, and running-log append are created after validation. |
| A18-R11 | No-go gate honesty | P0 | A18 report states that staging does not equal publication, deployment, commit, push, or full goal completion. |

## Acceptance Checks

1. A18 governed PRD/plan cycle exists before staging.
2. A18 pathspec file is generated outside the repo or in an explicitly disposable temp location.
3. Dry-run staging output contains only approved paths.
4. Actual staged index contains only approved paths.
5. Heavy evidence folders and ignored APK artifacts are absent from the staged index.
6. Root `RUNNING_LOG.md` is not staged unless separately approved and proven append-only.
7. Validation matrix passes or failures are captured with exact commands and next actions.
8. A18 tracker/log updates do not claim final release completion.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A18 stages broad evidence or historical docs | P0 | Use pathspec file from accepted blocks only and compare staged index exactly. |
| A18 omits needed source files | P0 | Compare intended pathspec with current status before and after staging. |
| Staged validation differs from dirty-tree validation | P0 | Run validation after staging and capture results. |
| A18 creates docs after staging but leaves staged governance stale | P1 | Decide whether A18 docs are staged as a governance supplement or explicitly left for a later docs commit. |
| Android/public changes enter index without APK rebuild | P1 | Run APK build or record deferral as a release gate. |
| Staging is mistaken for deployment or publication | P0 | Preserve all no-go gates in report, trackers, and log. |

## Completion Definition

A18 is complete when the governed cycle is done, approved paths are staged exactly, staged validation is run and documented, trackers/log are updated, and remaining release/publication gates are still explicit.

A18 completion does not mean the full user goal is complete.
