# UX v2 A18 Staged Release Candidate QA

Created: 2026-06-16 20:28:00 IST
Branch: `codex/ai-brain-ux-v2-execution`
Status: `staged_release_candidate_validated_publication_gated`

## Executive Verdict

A18 converted the A17 file-only bucket acceptance manifest into a staged release candidate and validated the staged source/config set. The candidate is staged but not committed, pushed, deployed, published, signed, uploaded, or released.

APK packaging was validated for the existing `1.0.4/code5` debug candidate after rerunning with the script's local rebuild flag. Publication remains blocked without explicit authorization and a named distribution target.

## Governed Cycle

| Artifact | Status |
| --- | --- |
| `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V1_2026-06-16_20-19-00_IST.md` | Created |
| `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-20-00_IST.md` | Created using adversarial-review template |
| `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V2_2026-06-16_20-21-00_IST.md` | Created and revised for governance supplement/APK rebuild requirements |
| `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V1_2026-06-16_20-22-00_IST.md` | Created |
| `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-23-00_IST.md` | Created using adversarial-review template |
| `UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V2_2026-06-16_20-24-00_IST.md` | Created and revised for literal pathspec handling and real phase 2 timestamps |

## Pathspec Accounting

| Input | Count |
| --- | ---: |
| A17 accepted source/config paths | 135 |
| A17 accepted governance-doc paths | 114 |
| A18 phase 1 governance supplement paths | 7 |
| Combined phase 1 inputs | 256 |
| Duplicate removals | 0 |
| Final phase 1 unique pathspec | 256 |

Temporary pathspec files:

- `/tmp/a18-a17-source-paths.txt`
- `/tmp/a18-a17-governance-paths.txt`
- `/tmp/a18-phase1-governance-supplement.txt`
- `/tmp/a18-phase1-pathspec.txt`
- `/tmp/a18-phase1-staged.txt`

## Phase 1 Staging Proof

| Check | Result |
| --- | --- |
| Path safety scan | Passed: no blank paths, absolute paths, parent traversal, wildcard `*`/`?`, directory-only paths, heavy evidence folders, ignored APK outputs, or root `RUNNING_LOG.md`. |
| Missing path scan | Passed: zero missing paths. |
| Directory path scan | Passed: zero directory paths. |
| Literal Next.js route handling | Passed: `GIT_LITERAL_PATHSPECS=1` used for dry-run and staging so `[id]` and `[slug]` path segments are treated as literal paths. |
| Dry-run staging | Passed: dry-run listed only approved phase 1 paths. |
| Actual staging | Passed: `GIT_LITERAL_PATHSPECS=1 git add --pathspec-from-file=/tmp/a18-phase1-pathspec.txt`. |
| Staged index equality | Passed: sorted `git diff --cached --name-only` matched `/tmp/a18-phase1-pathspec.txt`. |
| Staged path count | 256 |

## Staged Diff Hygiene

Initial `git diff --cached --check` failed on historical governance-document trailing whitespace and blank-line-at-EOF issues in staged A7-A12/A17 docs plus `src/styles/tokens.contrast.test.ts`.

Remediation:

- Applied a mechanical whitespace cleanup only to staged text files in the approved phase 1 pathspec.
- Restaged the same phase 1 pathspec.
- Re-ran staged index equality check.
- Re-ran `git diff --cached --check`.

Final result: `git diff --cached --check` passed.

## Phase 1 Validation Matrix

| Command | Result | Notes |
| --- | --- | --- |
| `git diff --cached --check` | Passed | Passed after mechanical whitespace cleanup and restage. |
| `npm run typecheck` | Passed | `tsc --noEmit` exited 0. |
| `npm run lint` | Passed | Exited 0 with no warning output; A16 warning remains gone. |
| `npm test` | Passed | 551 tests, 78 suites, 0 failures. |
| `npm run build` | Passed | Known `unpdf` import-meta warning; 19 static pages generated; exit 0. |
| `npm run check:env` | Passed | `.env` gitignored and `.env.example` tracked. |
| `npm run check:build-artifacts` | Passed | No `.next/standalone/data` directory. |
| `npm run build:apk` | Recovered and passed | First run built successfully but stopped because the same `1.0.4/code5` artifact already existed. Rerun with `ALLOW_REBUILD_SAME_APK_VERSION=1` passed. |

## APK Validation

| Field | Value |
| --- | --- |
| APK versionName | `1.0.4` |
| APK versionCode | `5` |
| Artifact | `data/artifacts/brain-debug-v1.0.4-code5.apk` |
| Artifact size | 7.5 MB |
| SHA-256 | `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7` |
| Publication status | Blocked; no authorization or distribution target was provided. |

The APK artifact is ignored output and is not part of the staged release-source candidate.

## Source Freeze Check

After validation, no phase 1 path appeared in the unstaged tracked diff. This means validation did not leave source/config/runtime changes outside the staged index.

## Phase 2 Governance Supplement

Phase 2 docs and tracker updates are being created after source validation. Only governance docs and tracker docs may be staged in phase 2:

```text
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V2_2026-06-16_20-24-00_IST.md
UX_v2/execution/UX_V2_A18_STAGED_RELEASE_CANDIDATE_QA_2026-06-16_20-28-00_IST.md
UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-28-00_IST.md
UX_v2/trackers/milestone_tracker.md
UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md
UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md
```

Root `RUNNING_LOG.md` is appended separately and remains unstaged in A18.

## Final Phase 2 Validation

Phase 2 governance staging and final index checks passed.

| Check | Result |
| --- | --- |
| Phase 2 supplement count | 6 paths |
| Final staged path count | 258 paths |
| Phase 2 duplicate count | 4 paths already present in phase 1 |
| Final staged-index equality | Passed: sorted `git diff --cached --name-only` matches `/tmp/a18-final-pathspec.txt`. |
| `git diff --cached --check` | Passed. |
| A18 docs/tracker trailing whitespace | Passed: 0 matches. |
| A18 docs/tracker secret-pattern scan | Passed: 0 matches. |
| Staged exclusion scan | Passed: 0 matches for root `RUNNING_LOG.md`, heavy evidence/source snapshots, ignored APK outputs, `assets/`, or `data/artifacts/`. |
| Unsafe-positive scan | Passed with expected negative/factual matches only: no false claim of APK publication, commit, push, final release, or full user-goal completion. |

## Remaining No-Go Gates

1. No commit, push, PR, deployment, or production publication happened in A18.
2. APK publication authorization and named distribution target remain missing.
3. Full TalkBack spoken-order audit remains absent unless explicitly waived.
4. Deterministic URL-share success remains unresolved unless native note share is accepted as sufficient.
5. Heavy evidence/source snapshot retention remains undecided and was not staged.
6. Root `RUNNING_LOG.md` remains unstaged pending append-only staging strategy or owner approval.

## Next Action

Proceed to final release ownership review, commit/PR decision, and publication authorization gates.
