# Feature Release A18 Staged Release Candidate PRD V2

Created: 2026-06-16 20:21:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Supersedes: `FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V1_2026-06-16_20-19-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-20-00_IST.md`

## Problem Statement

A17 created a file-only release bucket acceptance manifest and deliberately left the git index empty. The release candidate is still not staged, validated from the staged index, committed, pushed, or published. A18 must convert the A17 accepted lanes into an actual staged release candidate without broad staging, while preserving the remaining human publication gates.

The highest risk is false release confidence: staging too much, staging too little, silently including heavy evidence folders, or treating a staged source/config candidate as Android publication approval. A18 exists to perform the first controlled staging pass and prove exactly what entered the index.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A17_RELEASE_BUCKET_ACCEPTANCE_MANIFEST_2026-06-16_20-05-00_IST.md` | Defines accepted source/config paths, accepted governance-doc paths, excluded heavy evidence, and required validation after staging. |
| `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-05-00_IST.md` | A17 PM update created after the manifest path list and therefore must be added through A18 governance supplement if staged. |
| Root `RUNNING_LOG.md` latest A17 entry | Confirms A17 left staging, validation, APK publication, TalkBack, URL-share, and evidence retention open. |
| Current `git status --short` and `git diff --cached --name-only` | Establish current worktree and empty index before A18 staging. |
| `UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_2026-06-16_19-41-10_IST.md` | Establishes full dirty-tree validation passed before staging. |
| `UX_v2/execution/UX_V2_A16_LINT_WARNING_CLEANUP_QA_2026-06-16_19-54-00_IST.md` | Establishes the lint warning was removed before staging. |

## Goals

1. Complete the A18 PRD, adversarial review, PRD v2, implementation plan, adversarial review, and implementation plan v2 cycle before staging.
2. Extract the accepted source/config and governance-doc file paths from A17 into an exact pathspec file.
3. Add a narrow A18 governance supplement consisting only of:
   - A17 PM update omitted from the A17 manifest path list,
   - A18 PRD/review/PRD v2,
   - A18 implementation plan/review/plan v2,
   - A18 execution report,
   - A18 PM tracker update,
   - current tracker files modified by A18.
4. Verify the final pathspec contains concrete file paths only and that every path exists or is an explicitly documented deletion.
5. Dry-run `git add` with the pathspec before staging.
6. Stage only the approved pathspec.
7. Verify the staged path list exactly matches the intended pathspec.
8. Run the required validation matrix after staging, including APK build because Android/public runtime paths are in scope.
9. Create an A18 execution report and PM tracker update, then include them in the approved governance supplement before final staged-index verification.
10. Update milestone/release trackers and append root `RUNNING_LOG.md`.
11. Keep remaining no-go gates explicit: APK publication authorization, named distribution target, TalkBack spoken-order decision, URL-share success decision, heavy evidence retention, commit, push, PR, and production release.

## Non-Goals

- Do not use `git add .`, `git add -A`, broad repo-root staging, or broad directory staging.
- Do not stage heavy evidence/source-snapshot folders.
- Do not stage ignored APK artifacts or build outputs.
- Do not stage root `RUNNING_LOG.md` in A18; append it for continuity and leave it unstaged unless a later owner-approved append-only staging slice handles it.
- Do not publish, sign, upload, or distribute the APK.
- Do not deploy production changes from A18 alone.
- Do not claim the full user goal is complete from staged validation alone.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A18-R1 | Governed cycle | P0 | A18 PRD/review/PRD v2 and plan/review/plan v2 exist before staging. |
| A18-R2 | Pathspec extraction | P0 | A18 produces an exact pathspec from A17 accepted blocks plus the A18 governance supplement and records source counts. |
| A18-R3 | Path safety | P0 | Pathspec inspection finds no blank paths, directories, wildcard `*` or `?` pathspecs, absolute paths, parent traversal, ignored APK outputs, heavy evidence folders, or root `RUNNING_LOG.md`. Literal Next.js route segments such as `[id]` are allowed only when the path exists and staging uses literal pathspec handling. |
| A18-R4 | Existence/status proof | P0 | Every path exists before staging, except any deletion explicitly listed in the execution report; no silent missing paths are allowed. |
| A18-R5 | Dry-run staging | P0 | `git add --dry-run --pathspec-from-file=...` is run before actual staging and reviewed for unexpected paths. |
| A18-R6 | Exact staging | P0 | Actual staging uses only the approved pathspec file; no broad staging command is used. |
| A18-R7 | Index equality | P0 | `git diff --cached --name-only` matches the approved pathspec exactly after final A18 governance files are included. |
| A18-R8 | Staged validation | P0 | `git diff --cached --check`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:env`, `npm run check:build-artifacts`, and `npm run build:apk` pass after staging. |
| A18-R9 | Exclusion proof | P0 | Staged index contains no heavy evidence folders, ignored APK outputs, root `RUNNING_LOG.md`, historical deferred docs, or broad directory-only entries. |
| A18-R10 | Tracking/log continuity | P1 | A18 execution report, PM update, tracker updates, and running-log append are created and verified. |
| A18-R11 | No-go gate honesty | P0 | A18 report states that staging does not equal publication, deployment, commit, push, or full goal completion. |

## Acceptance Checks

1. A18 governed PRD/plan cycle exists before staging.
2. A18 pathspec file is generated outside the repo or in an explicitly disposable temp location.
3. Dry-run staging output contains only approved paths.
4. Actual staged index contains only approved paths.
5. Heavy evidence folders, historical deferred docs, ignored APK artifacts, and root `RUNNING_LOG.md` are absent from the staged index.
6. Validation matrix including `npm run build:apk` passes, or any failure is captured as a blocker with exact command output summary.
7. A18 execution report records intended path count, staged path count, validation commands, no-go gates, and unstaged residuals.
8. A18 tracker/log updates do not claim final release completion.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A18 stages broad evidence or historical docs | P0 | Use pathspec file from accepted blocks plus explicit governance supplement only and compare staged index exactly. |
| A18 omits needed source files | P0 | Compare intended pathspec with current status before and after staging. |
| Staged validation differs from dirty-tree validation | P0 | Run validation after staging and capture results. |
| A18 evidence becomes stale relative to staged index | P1 | Create A18 execution/tracker docs before final staging verification and include them in the governance supplement. |
| Android/public changes enter index without APK rebuild | P1 | Require `npm run build:apk`; publication remains blocked even if it passes. |
| Staging is mistaken for deployment or publication | P0 | Preserve all no-go gates in report, trackers, and log. |

## Completion Definition

A18 is complete when the governed cycle is done, approved paths are staged exactly, staged validation including APK build is run and documented, trackers/log are updated, and remaining release/publication gates are still explicit.

A18 completion does not mean the full user goal is complete.
