# Feature Release A14 Dirty Worktree Attribution Implementation Plan V2

Created: 2026-06-16 19:33:00 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_PRD_V2_2026-06-16_19-28-00_IST.md`
Supersedes: `FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_IMPLEMENTATION_PLAN_V1_2026-06-16_19-30-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_19-31-00_IST.md`

## Execution Principles

- Do not edit product code, tests, generated app assets, APKs, or production data.
- Do not stage, commit, push, sign, upload, publish, delete, move, or archive files.
- Treat all bucket recommendations as owner-review inputs, not staging instructions.
- Preserve A13 no-go labels.
- Do not copy secrets or private item content into reports.

## Work Items

### 1. Capture Fresh Inventory

Run and record:

- `git status --short | wc -l`
- `git status --short | awk '{print substr($0,1,2)}' | sort | uniq -c | sort -nr`
- `git diff --name-only`
- `git diff --name-only | wc -l`
- `git ls-files --others --exclude-standard`
- `git ls-files --others --exclude-standard | wc -l`
- `git diff --numstat`
- top-level and subdirectory count summaries for tracked and untracked files
- ignored artifact scan for `data/artifacts` and `android/app/build/outputs/apk/debug`

### 2. Create A14 Attribution Report

Create `UX_v2/execution/UX_V2_A14_DIRTY_WORKTREE_ATTRIBUTION_REPORT_<actual_timestamp>_IST.md` with:

- Command timestamp and freshness caveat.
- Compact vs expanded inventory counts.
- Exact tracked modified path appendix listing all tracked paths.
- Expanded untracked top-level and key subdirectory summaries.
- Key untracked source/test/schema path list.
- Reproducible commands for full expanded untracked regeneration.
- Candidate owner-review buckets:
  - app source and tests
  - new source/test/schema files
  - Android config/resources and APK candidate config
  - public assets/service worker/offline assets
  - current release governance docs
  - QA/evidence artifacts
  - historical/reference packages
  - ignored APK identity artifacts
  - blocked/unknown review-needed files
- Bucket-specific validation matrix.
- No-go statement for final release ownership.

Do not paste all 868 expanded untracked paths into the human report unless they are high-risk source/test/schema paths. Use summaries and regeneration commands for evidence-heavy folders.

### 3. Update Project Tracking

Create `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_<actual_timestamp>_IST.md` for A14 with:

- A14 status.
- What blocker was reduced.
- What remains open.
- Next owner actions.

Update existing trackers only if needed:

- `UX_v2/trackers/milestone_tracker.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`

### 4. Validate

Run:

- `git diff --check` on tracked A14-updated files.
- trailing-whitespace scan on A14 Markdown docs.
- secret-pattern scan over A14 Markdown docs using at least: `brain_token`, `Bearer`, `SESSION_COOKIE`, `TOKEN=`, `SECRET=`, `PASSWORD=`, `PRIVATE_KEY=`, `api_key`, 64-hex strings, and private pairing-code-like snippets.
- unsafe-positive phrase scan for assertions that publication, staging, APK publishing, release ownership closure, or goal completion is approved.

Expected negative/no-go phrases such as "not authorized" and "do not stage" are allowed.

### 5. Running Log

Append a root `RUNNING_LOG.md` entry after A14 report and validation are complete. Preserve append-only log behavior.

## Acceptance Matrix

| PRD requirement | Plan coverage |
| --- | --- |
| A14-R1 dual-count inventory | Work item 1 and report |
| A14-R2 exact tracked path inventory | Work item 2 appendix |
| A14-R3 expanded untracked classification | Work item 1 summaries and report |
| A14-R4 candidate release code bucket | Work item 2 buckets |
| A14-R5 UX v2 sub-bucket split | Work item 2 buckets |
| A14-R6 documentation/evidence bucket | Work item 2 buckets |
| A14-R7 historical/reference bucket | Work item 2 buckets |
| A14-R8 ignored artifact identity policy | Work item 1 and report |
| A14-R9 unknown-risk no-go | Work item 2 |
| A14-R10 bucket validation matrix | Work item 2 |
| A14-R11 freshness caveat | Work item 2 |
| A14-R12 tracker/log update | Work items 3 and 5 |

## No-Go Conditions

- Do not stage or commit from A14.
- Do not claim final ownership is closed until release owner accepts every release-bound bucket.
- Do not publish an APK based on hash identity alone.
- Do not append running-log closure if secret scan finds unredacted secret-like content in A14 docs.
