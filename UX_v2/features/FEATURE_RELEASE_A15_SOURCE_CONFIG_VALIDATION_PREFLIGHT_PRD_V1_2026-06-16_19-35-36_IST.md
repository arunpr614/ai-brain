# Feature Release A15 Source And Config Validation Preflight PRD V1

Created: 2026-06-16 19:35:36 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`

## Problem Statement

A14 created an owner-review map for the broad dirty worktree, but the source/config bucket still needs current validation evidence before a release owner can safely accept or stage it. Prior A11/A12 validation is useful, but the worktree has continued to change through release governance and remains broad.

A15 exists to run a no-staging validation preflight on the current candidate source/config bucket and convert any failures into explicit blockers.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A14_DIRTY_WORKTREE_ATTRIBUTION_REPORT_2026-06-16_19-28-32_IST.md` | Defines owner-review buckets and validation matrix. |
| `package.json` | Defines validation scripts: `typecheck`, `lint`, `test`, `build`, `check:env`, `check:build-artifacts`, `build:apk`. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Current release packet and remaining no-go gates. |
| Root `RUNNING_LOG.md` latest A14 entry | Current baseline and next milestone. |

## Goals

1. Validate the current candidate app source/test/config bucket without staging or committing.
2. Run the core source release checks: typecheck, lint, tests, Next build, env/build-artifact checks where appropriate.
3. Decide whether APK build should be rerun in A15 or kept separate due runtime/publication gate scope.
4. Produce a validation report with command results, failures, blockers, and next remediation steps.
5. Update project trackers and running log after validation.

## Non-Goals

- Do not stage, commit, push, publish, sign, upload, or deploy.
- Do not alter production data or remote production services.
- Do not run Android emulator/runtime flows unless explicitly scoped by plan v2.
- Do not claim final release readiness from source validation alone.
- Do not hide or soften failures.
- Do not print or persist raw secrets from environment checks.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A15-R1 | Current inventory snapshot | P1 | Report records compact dirty count and expanded untracked count before validation. |
| A15-R2 | TypeScript validation | P0 | `npm run typecheck` is run and pass/fail is recorded with key error summary if failed. |
| A15-R3 | Lint validation | P0 | `npm run lint` is run and pass/fail is recorded with warning/error summary. |
| A15-R4 | Unit/integration tests | P0 | `npm test` is run and pass/fail is recorded with test count/failure summary. |
| A15-R5 | Next build | P0 | `npm run build` is run and pass/fail is recorded with key warnings/errors. |
| A15-R6 | Environment/build-artifact checks | P1 | `npm run check:env` and `npm run check:build-artifacts` are run if safe in current environment; any skipped check records reason. |
| A15-R7 | APK build decision | P1 | Report either runs `npm run build:apk` or explicitly defers it to Android publication/runtime gate with rationale. |
| A15-R8 | Failure handling | P0 | Any validation failure becomes an explicit blocker with remediation recommendation; no green release claim is made while failures remain. |
| A15-R9 | Evidence hygiene | P0 | Reports include command summaries, not raw secret values, cookies, tokens, or private item content. |
| A15-R10 | Tracker/log update | P1 | A15 tracker update and root running log entry are created after validation. |

## Acceptance Checks

1. A15 validation report exists under `UX_v2/execution/`.
2. A15 report includes exact command list, pass/fail matrix, and residual blockers.
3. `git diff --check` passes for A15-touched files.
4. A15 Markdown docs have no trailing whitespace.
5. Secret-pattern scan over A15 docs finds no raw credentials; literal safety terms and public hashes are allowed only if explained.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Validation passes are mistaken for final release approval | P0 | Report must preserve A13/A14 no-go labels. |
| Long-running build/test commands fail due environment rather than code | P1 | Capture command, environment assumption, and failure summary without hiding it. |
| Env checks print secrets | P0 | Do not persist raw command output if it contains sensitive values; summarize safely. |
| APK build is expensive or duplicates A12 | P2 | Decide in plan v2 whether APK build belongs in A15 or the Android publication gate. |

## Completion Definition

A15 is complete when the validation governance cycle is complete, current source/config validation commands have been run or explicitly skipped with reason, results are documented, trackers/log are updated, and remaining release blockers are preserved.

A15 completion does not mean final release readiness, APK publication, or full goal completion.
