# Feature Release A18 Staged Release Candidate Implementation Plan V2

Created: 2026-06-16 20:24:00 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V2_2026-06-16_20-21-00_IST.md`
Supersedes: `FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V1_2026-06-16_20-22-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-23-00_IST.md`

## Execution Principles

- Stage only exact file paths derived from A17 accepted blocks plus explicit A18 governance supplement.
- Use temporary pathspec files outside the repo for staging input and comparison.
- Use literal pathspec handling for `git add` because valid Next.js route folders contain square brackets, for example `[id]`.
- Use two-phase staging:
  - Phase 1: existing release candidate source/config/governance docs and A18 PRD/plan governance docs.
  - Phase 2: docs-only A18 execution evidence and tracker updates after validation.
- After full validation begins, do not modify source/config/runtime files. Phase 2 may add only governance docs and tracker docs.
- Keep heavy evidence, ignored APK outputs, root `RUNNING_LOG.md`, historical docs, and broad directories out of the staged index.
- Run validation after phase 1 staging, including APK build because Android/public paths are included.
- Treat staging as an integration gate, not as publication, deployment, commit, push, or full goal completion.

## Phase 1 Governance Supplement

These existing A18/A17 governance files are allowed in phase 1:

```text
UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-05-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V1_2026-06-16_20-19-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-20-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V2_2026-06-16_20-21-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V1_2026-06-16_20-22-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-23-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V2_2026-06-16_20-24-00_IST.md
```

## Phase 2 Governance Supplement

These files are allowed only after they exist and after full phase 1 validation has completed:

```text
UX_v2/execution/UX_V2_A18_STAGED_RELEASE_CANDIDATE_QA_2026-06-16_20-28-00_IST.md
UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-28-00_IST.md
UX_v2/trackers/milestone_tracker.md
UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md
UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md
```

Root `RUNNING_LOG.md` is appended for continuity but is not staged in A18.

## Step Plan

1. Extract accepted source/config and governance-doc blocks from A17 manifest into `/tmp/a18-a17-accepted-paths.txt`.
2. Create `/tmp/a18-phase1-governance-supplement.txt` with phase 1 supplement paths.
3. Merge and sort unique paths into `/tmp/a18-phase1-pathspec.txt`.
4. Inspect the phase 1 pathspec for:
   - blank lines,
   - absolute paths,
   - parent traversal,
   - wildcard `*` or `?` pathspecs,
   - square brackets except literal existing Next.js route paths staged with literal pathspec handling,
   - directory-only paths,
   - heavy evidence/source snapshot folders,
   - ignored APK outputs,
   - root `RUNNING_LOG.md`.
5. Confirm every phase 1 path exists before staging. Missing paths are a no-go unless `git status --short` proves an intentional deletion and the deletion is documented in the QA report.
6. Record counts:
   - A17 accepted source/config count,
   - A17 accepted governance-doc count,
   - phase 1 supplement count,
   - duplicate removal count,
   - final phase 1 unique count.
7. Run `GIT_LITERAL_PATHSPECS=1 git add --dry-run --pathspec-from-file=/tmp/a18-phase1-pathspec.txt`.
8. Stage phase 1 with `GIT_LITERAL_PATHSPECS=1 git add --pathspec-from-file=/tmp/a18-phase1-pathspec.txt`.
9. Verify `git diff --cached --name-only` equals `/tmp/a18-phase1-pathspec.txt`.
10. Run phase 1 validation:
    - `git diff --cached --check`
    - `npm run typecheck`
    - `npm run lint`
    - `npm test`
    - `npm run build`
    - `npm run check:env`
    - `npm run check:build-artifacts`
    - `npm run build:apk`
11. Freeze source/config/runtime files after validation starts. If any source/config/runtime file changes after this point, stop and rerun phase 1 validation after restaging.
12. Create A18 QA report and PM tracker update.
13. Update milestone tracker, release readiness packet, and delivery gate tracker with A18 status.
14. Append root `RUNNING_LOG.md` with A18 milestone entry but do not stage it.
15. Create `/tmp/a18-phase2-governance-supplement.txt` with the phase 2 supplement paths after they exist.
16. Merge phase 1 pathspec and phase 2 supplement into `/tmp/a18-final-pathspec.txt`.
17. Inspect phase 2/final pathspec with the same safety rules as phase 1.
18. Dry-run and stage only phase 2 supplement paths with `GIT_LITERAL_PATHSPECS=1`.
19. Verify `git diff --cached --name-only` equals `/tmp/a18-final-pathspec.txt`.
20. Run final docs/index validation:
    - `git diff --cached --check`
    - Markdown trailing-whitespace scan over A18 docs and tracker/report updates
    - secret-pattern scan over A18 docs and tracker/report updates
    - unsafe-positive scan over A18 docs and tracker/report updates
    - staged exclusion scan for heavy evidence, ignored APK outputs, historical deferred docs, and root `RUNNING_LOG.md`
21. Record final index counts, unstaged residuals, validation results, and remaining no-go gates in the A18 QA report if it needs a final append. If the report is updated after staging, restage only that report and rerun final docs/index validation.

## Validation And Scans

Phase 1 validation:

```bash
git diff --cached --check
npm run typecheck
npm run lint
npm test
npm run build
npm run check:env
npm run check:build-artifacts
npm run build:apk
```

Final docs/index validation:

```bash
git diff --cached --check
```

Additional final scans:

- Markdown trailing-whitespace scan for A18 docs and tracker/report updates.
- Secret-pattern scan for A18 docs and tracker/report updates.
- Unsafe-positive scan for false claims of publication, deployment, commit, push, or goal completion.
- Staged exclusion scan for:
  - `RUNNING_LOG.md`
  - `UX_v2/execution/*VISUAL_EVIDENCE*`
  - `UX_v2/execution/*SOURCE_SNAPSHOT*`
  - `UX_v2/execution/evidence/`
  - `UX_UI_DESIGN_PACKAGE/`
  - `assets/`
  - `android/app/build/`
  - `data/artifacts/`

## No-Go Conditions

- Any broad staging command is used.
- Dry-run staging output includes paths outside the approved pathspec.
- Phase 1 staged index differs from `/tmp/a18-phase1-pathspec.txt`.
- Final staged index differs from `/tmp/a18-final-pathspec.txt`.
- Any heavy evidence, ignored output, historical deferred doc, or root `RUNNING_LOG.md` appears in the staged index.
- Full validation fails without a documented blocker and next action.
- APK build is skipped without a concrete blocker.
- Source/config/runtime files change after validation begins without rerunning validation.
- Any A18 artifact claims production deployment, APK publication, commit, push, or full user-goal completion.

## Expected Outcome

A18 should leave an exact staged release candidate and an A18 QA/tracker evidence set, with root `RUNNING_LOG.md` appended but unstaged. The full release remains gated by commit/PR/push/deployment decisions, Android publication authorization, TalkBack spoken-order decision, URL-share decision, and heavy evidence retention.
