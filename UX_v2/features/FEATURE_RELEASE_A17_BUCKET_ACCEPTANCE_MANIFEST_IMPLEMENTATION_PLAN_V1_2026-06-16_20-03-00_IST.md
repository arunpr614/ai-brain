# Feature Release A17 Bucket Acceptance Manifest Implementation Plan V1

Created: 2026-06-16 20:03:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_V2_2026-06-16_20-02-00_IST.md`

## Execution Principles

- Create release-governance artifacts only; do not stage files or edit product source.
- Treat current worktree and index state as authoritative. A14 counts are historical.
- Separate source/config staging candidates from docs/evidence retention candidates.
- Preserve APK publication, TalkBack spoken-order, URL-share, and explicit distribution-target gates.
- Integrate PM sidecar inconsistencies into tracker updates without rewriting historical rows beyond necessary clarifying addenda.
- Do not paste raw secret values, private session values, or pairing codes.

## Step Plan

1. Capture current inventory and index state:
   - `git status --short`
   - `git status --short | wc -l`
   - tracked modified count from `git diff --name-only | wc -l`
   - compact untracked count from `git status --short`
   - expanded untracked count from `git ls-files --others --exclude-standard | wc -l`
   - tracked diff scale from `git diff --stat`
   - pre-A17 index state from `git diff --cached --name-only`
2. Build candidate path lists:
   - tracked source/config/runtime paths from `git diff --name-only`
   - untracked runtime/test/schema source paths from `git ls-files --others --exclude-standard src`
   - current governance docs from A7-A17 and tracker paths
   - heavy evidence/source-snapshot paths requiring retention decision
   - historical/reference docs and root one-off docs requiring owner decision
3. Create manifest:
   - `UX_v2/execution/UX_V2_A17_RELEASE_BUCKET_ACCEPTANCE_MANIFEST_2026-06-16_20-05-00_IST.md`
4. Create PM tracker update:
   - `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_20-05-00_IST.md`
5. Update current trackers:
   - `UX_v2/trackers/milestone_tracker.md`
   - `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
   - `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
6. Incorporate PM sidecar findings:
   - Correct delivery tracker statement that running log "will receive A16".
   - Add an A17 note that old A12/A4 runtime-pending rows are historical and superseded by A12/A16 evidence where applicable.
   - Add milestone tracker clarification that older Android runtime-pending rows are superseded by A12 evidence for authenticated routes/native note share, while publication gates remain open.
7. Capture post-A17 index state with `git diff --cached --name-only` and verify it matches the pre-A17 state.

## Manifest Required Sections

1. Executive verdict: manifest only, no staging.
2. Inventory snapshot with current counts and diff scale.
3. Index proof before/after.
4. A14 bucket decision table.
5. Accepted source/config candidate path list in a fenced block.
6. Accepted current governance-doc candidate path list in a fenced block.
7. Review-required heavy evidence patterns.
8. Historical/reference deferred lane.
9. Excluded/blocked lane, including ignored APK artifacts and root one-off docs.
10. Running-log staging strategy.
11. Required validation matrix after staging.
12. Remaining no-go gates.

## Validation After Documentation

- `git diff --check` for A17-touched tracked files.
- Markdown trailing-whitespace scan over A17 docs.
- Secret-pattern scan over A17 docs.
- Unsafe-positive scan over A17 docs for false claims of staging, publication, deployment, or completion.
- Tracker presence scan for `A17|Bucket Acceptance`.
- Pre/post index-state comparison.

## No-Go Conditions

- If `git diff --cached --name-only` changes during A17, stop and report a blocker.
- If manifest cannot produce exact accepted source/config path list, A17 is incomplete.
- If manifest recommends broad `git add .`, `git add -A`, or broad root/directory staging, A17 is invalid.
- If manifest claims release completion, APK publication authorization, or deployed status changed, revise before closing.

## Expected Outcome

A17 should leave the worktree and index unstaged but produce a concrete staging input for the next release-owner step: exact accepted source/config and governance-doc paths, clear evidence deferrals, and validation commands to run after staging.
