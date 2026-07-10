# Feature Release A17 Bucket Acceptance Manifest PRD V2

Created: 2026-06-16 20:02:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Supersedes: `FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_V1_2026-06-16_20-00-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-01-00_IST.md`

## Problem Statement

A14 converted the broad dirty worktree into owner-review buckets, but release ownership is still open because no current acceptance/exclusion manifest exists. A15 proved the dirty source/config snapshot passes validation, and A16 removed the only lint warning, but neither milestone answered the staging question: which files are allowed into a release candidate, which files are evidence-only, which files are deferred, and which files are blocked from broad staging.

A17 exists to create a current, no-staging bucket acceptance manifest that a release integrator can use as the next staging input without using `git add .`, broad directory adds, or stale A14 counts. A17 must also prove it did not mutate the git index.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A14_DIRTY_WORKTREE_ATTRIBUTION_REPORT_2026-06-16_19-28-32_IST.md` | Defines owner-review buckets, exact tracked path appendix, and validation matrix. |
| `UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_2026-06-16_19-41-10_IST.md` | Confirms source/config validation passed before A16, with one lint warning. |
| `UX_v2/execution/UX_V2_A16_LINT_WARNING_CLEANUP_QA_2026-06-16_19-54-00_IST.md` | Confirms the A15 lint warning was removed and typecheck still passes. |
| `UX_v2/execution/UX_V2_RELEASE_CANDIDATE_CHANGE_MANIFEST_2026-06-14.md` | Earlier release-candidate manifest format and historical warnings about mixed paths. |
| `UX_v2/execution/UX_V2_SELECTIVE_STAGING_REVIEW_2026-06-14.md` | Earlier staging guidance warning against full dirty-worktree staging. |
| Current `git status --short`, `git diff --name-only`, `git ls-files --others --exclude-standard`, `git diff --cached --name-only` | Authoritative current inventory and index state for A17. |

## Goals

1. Rerun current inventory after A16 and record compact/expanded counts.
2. Capture pre/post git index state and prove A17 did not stage files.
3. Produce a release bucket acceptance manifest under `UX_v2/execution/`.
4. Classify current dirty files into explicit lanes:
   - accepted source/config candidate lane,
   - accepted current governance-doc lane,
   - evidence-retention review lane,
   - historical/reference lane,
   - excluded or blocked lane.
5. Include copyable fenced path-list sections for accepted source/config and current governance docs.
6. Include exact staging guardrails and validation commands for the accepted lanes.
7. Give `RUNNING_LOG.md` a dedicated staging strategy: append-only reconstruction or explicit owner approval before whole-file staging.
8. Preserve no-go gates for APK publication authorization, TalkBack spoken-order, URL-share decision, and any human-only distribution decision.
9. Do not stage, commit, push, deploy, publish, sign, upload, or rebuild APK artifacts in A17.

## Non-Goals

- Do not stage files or mutate the git index.
- Do not commit, push, open a PR, publish an APK, or deploy.
- Do not rerun full source validation unless the plan v2 intentionally adds it.
- Do not edit product source as part of A17.
- Do not claim that a manifest alone proves production release readiness.
- Do not include ignored APK artifacts in normal source staging.
- Do not store raw secrets, private session values, or private pairing codes in the manifest.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A17-R1 | Current inventory | P0 | Manifest records fresh compact dirty count, tracked modified count, compact untracked count, expanded untracked count, and tracked diff scale. |
| A17-R2 | Index proof | P0 | Manifest records `git diff --cached --name-only` before and after A17 and shows the index did not change. |
| A17-R3 | Bucket decisions | P0 | Manifest gives each A14 bucket an A17 status: accepted for next staging candidate, accepted as docs-only, review-required, deferred, excluded, or blocked. |
| A17-R4 | Exact accepted-source scope | P0 | Manifest lists exact tracked/untracked app source/config paths that are candidates for next staged validation in a fenced path-list section. |
| A17-R5 | Exact governance-doc scope | P1 | Manifest lists current governance docs that may be staged as docs-only in a separate fenced path-list section. |
| A17-R6 | Evidence retention policy | P1 | Manifest names heavy evidence/source-snapshot path patterns that require a retention decision before staging. |
| A17-R7 | Running-log staging policy | P1 | Manifest requires append-only reconstruction or explicit owner approval before staging root `RUNNING_LOG.md` as a whole file. |
| A17-R8 | Staging guardrails | P0 | Manifest explicitly forbids `git add .`, `git add -A`, and broad root/directory staging without manifest-filtered path lists. |
| A17-R9 | Validation matrix | P0 | Manifest defines the validation commands required after staging accepted lanes. |
| A17-R10 | Release gate honesty | P0 | Manifest preserves APK publication authorization, TalkBack spoken-order, URL-share success, and final staged-validation gates. |
| A17-R11 | Tracker/log continuity | P1 | A17 tracker update and root running log entry are created after manifest validation. |

## Acceptance Checks

1. A17 PRD v2 and implementation plan v2 exist after adversarial review.
2. A17 manifest exists under `UX_v2/execution/`.
3. A17 manifest includes current inventory counts, pre/post index state, and decision lanes.
4. A17 manifest includes exact accepted-source candidate paths and current governance-doc candidate paths.
5. A17 manifest explicitly defers heavy evidence folders such as `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_*` and Magic Patterns source snapshots until a retention decision exists.
6. No files are staged by A17; pre/post cached diff state is unchanged.
7. `git diff --check` passes for A17-touched tracked files.
8. A17 Markdown docs have no trailing whitespace.
9. A17 secret-pattern scan finds no raw credentials.
10. A17 unsafe-positive scan finds no false claim of staging, publication, deployment, or goal completion.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A17 accidentally authorizes broad staging of hundreds of evidence files | P0 | Require explicit no-broad-add guardrails and separate heavy evidence-retention lane. |
| Manifest uses stale A14 counts | P0 | Rerun inventory inside A17 and record current counts. |
| Accepted source list misses untracked source files required by the build | P0 | Compare tracked diff and untracked `src/**` lists; include all candidate runtime/test/schema source paths or mark blocker. |
| Manifest is mistaken for APK publication authorization | P0 | Preserve publication no-go label and ignored APK policy. |
| `RUNNING_LOG.md` whole-file diff remains risky | P1 | Require append-only staging strategy or explicit owner approval before whole-file staging. |
| A17 silently mutates the git index | P1 | Capture pre/post cached diff and stop if changed. |

## Completion Definition

A17 is complete when the PRD/review/plan/review cycle is complete, a current no-staging bucket acceptance manifest exists, the manifest is validated for hygiene and honesty, the git index is unchanged, trackers/log are updated, and no staging or publication has occurred.

A17 completion does not mean the release is staged, committed, published, deployed, or fully complete.
