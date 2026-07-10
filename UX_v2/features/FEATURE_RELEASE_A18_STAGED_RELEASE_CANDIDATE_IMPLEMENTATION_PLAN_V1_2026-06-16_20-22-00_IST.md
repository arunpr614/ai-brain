# Feature Release A18 Staged Release Candidate Implementation Plan V1

Created: 2026-06-16 20:22:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V2_2026-06-16_20-21-00_IST.md`

## Execution Principles

- Stage only exact file paths derived from A17 accepted blocks plus A18 governance supplement.
- Use temporary pathspec files outside the repo for staging input and comparison.
- Keep heavy evidence, ignored APK outputs, root `RUNNING_LOG.md`, historical docs, and broad directories out of the staged index.
- Run validation after staging, including APK build because Android/public paths are included.
- Treat staging as an integration gate, not as publication, deployment, commit, push, or full goal completion.

## Planned Files

### A18 Governance Supplement

```text
UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-05-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V1_2026-06-16_20-19-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-20-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_PRD_V2_2026-06-16_20-21-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V1_2026-06-16_20-22-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-23-00_IST.md
UX_v2/features/FEATURE_RELEASE_A18_STAGED_RELEASE_CANDIDATE_IMPLEMENTATION_PLAN_V2_2026-06-16_20-24-00_IST.md
UX_v2/execution/UX_V2_A18_STAGED_RELEASE_CANDIDATE_QA_2026-06-16_20-31-00_IST.md
UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-31-00_IST.md
```

Tracker files already present in A17 accepted governance docs may receive A18 updates before final staging:

```text
UX_v2/trackers/milestone_tracker.md
UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md
UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md
```

## Step Plan

1. Extract accepted source/config and governance-doc blocks from A17 manifest into `/tmp/a18-a17-accepted-paths.txt`.
2. Create `/tmp/a18-governance-supplement-paths.txt` with the supplement paths above.
3. Merge and sort unique paths into `/tmp/a18-final-pathspec.txt`.
4. Inspect the merged pathspec for:
   - blank lines,
   - absolute paths,
   - parent traversal,
   - wildcard or glob characters,
   - directory-only paths,
   - heavy evidence/source snapshot folders,
   - ignored APK outputs,
   - root `RUNNING_LOG.md`.
5. Confirm every path exists before staging, unless a path is an explicitly intended deletion.
6. Run `git add --dry-run --pathspec-from-file=/tmp/a18-final-pathspec.txt`.
7. Stage with `git add --pathspec-from-file=/tmp/a18-final-pathspec.txt`.
8. Verify `git diff --cached --name-only` equals `/tmp/a18-final-pathspec.txt`.
9. Run validation:
   - `git diff --cached --check`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run check:env`
   - `npm run check:build-artifacts`
   - `npm run build:apk`
10. Create A18 QA report and PM tracker update.
11. Update milestone tracker, release readiness packet, and delivery gate tracker.
12. Append root `RUNNING_LOG.md` with A18 milestone entry but do not stage it.
13. Rerun final staged-index comparison and staged exclusion scans.

## Validation And Scans

- `git diff --cached --check`
- Markdown trailing-whitespace scan for A18 docs.
- Secret-pattern scan for A18 docs.
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
- Final staged index differs from the approved final pathspec.
- Any heavy evidence, ignored output, or root `RUNNING_LOG.md` appears in the staged index.
- Validation fails without a documented blocker and next action.
- APK build is skipped without a concrete blocker.
- Any A18 artifact claims production deployment, APK publication, or full user-goal completion.

## Expected Outcome

A18 should leave an exact staged release candidate and an A18 QA/tracker evidence set, with root `RUNNING_LOG.md` appended but unstaged. The full release remains gated by commit/PR/push/deployment decisions, Android publication authorization, TalkBack spoken-order decision, URL-share decision, and heavy evidence retention.
