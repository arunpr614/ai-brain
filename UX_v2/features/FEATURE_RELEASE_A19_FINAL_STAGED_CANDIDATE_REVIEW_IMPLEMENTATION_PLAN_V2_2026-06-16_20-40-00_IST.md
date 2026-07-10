# Feature Release A19 Final Staged Candidate Review Implementation Plan V2

Created: 2026-06-16 20:40:00 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A19_FINAL_STAGED_CANDIDATE_REVIEW_PRD_V2_2026-06-16_20-37-00_IST.md`
Supersedes: `FEATURE_RELEASE_A19_FINAL_STAGED_CANDIDATE_REVIEW_IMPLEMENTATION_PLAN_V1_2026-06-16_20-38-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A19_FINAL_STAGED_CANDIDATE_REVIEW_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-39-00_IST.md`

## Execution Principles

- Review `git diff --cached` only.
- Keep A19 review-only by default. Do not edit source/config/runtime files during A19.
- Keep A19 governance docs unstaged for now so the A18 staged candidate remains exactly 258 files during review. A later docs-only supplement may stage A19 artifacts after the review result is accepted.
- Use subagents for independent read-only review lanes, then verify every finding locally.
- Treat confirmed P0/P1 findings as no-go for commit consideration.
- Keep APK publication, TalkBack spoken-order, URL-share, and heavy evidence retention gates open.

## Review Lanes

### Lane 1 - Product/Source Behavior

Inspect staged diff subsets for:

- `src/app/**`
- `src/components/**`
- `src/db/**`
- `src/lib/ask/**`
- `src/lib/library/**`
- `src/lib/android-share/**`
- `src/lib/retrieve/**`

Questions:

- Do user-facing routes return truthful states and avoid broken navigation?
- Are selected-item, topic, collection, Ask, repair, and share-result contracts internally consistent?
- Do database/topic changes have matching tests and call sites?

### Lane 2 - Auth/Security/Privacy

Inspect staged diff subsets for:

- `src/proxy.ts`
- `src/proxy.test.ts`
- `src/app/api/**`
- `src/app/settings/device-pairing/**`
- `src/lib/device-pairing/**`
- `src/lib/auth/**`
- `capacitor.config.ts`
- public route and token-related tests

Questions:

- Are public routes intentionally public and tested?
- Can private counts, tokens, bearer credentials, pairing codes, or session state leak?
- Do API routes preserve auth/origin/rate-limit behavior?

### Lane 3 - Android/Public/Offline Packaging

Inspect staged diff subsets for:

- `android/app/build.gradle`
- `android/app/src/main/res/**`
- `android/app/src/main/res/values/strings.xml`
- `capacitor.config.ts`
- `public/manifest.webmanifest`
- `public/offline.html`
- `public/sw.js`
- public icon assets
- `src/components/theme-bootstrap.tsx`

Questions:

- Are app identity/version/icon/manifest changes coherent?
- Does service worker/offline behavior avoid stale-private-state or broken shell issues?
- Are APK/package validation results consistent with staged config?

### Lane 4 - Test/Quality/Governance/Staging Hygiene

Main agent handles this lane locally:

- staged file list and pathspec equality,
- validation matrix from A18,
- tests added for changed behavior,
- governance report accuracy,
- no-go gate honesty,
- unstaged source/config intersection after review.

## Step Plan

1. Capture staged baseline:
   - `git diff --cached --name-only | wc -l`
   - `git diff --cached --stat`
   - `git diff --cached --check`
   - staged exclusion scan
2. Save staged diff snapshots under `/tmp` for subagent reference.
3. Spawn three read-only subagents:
   - product/source behavior reviewer,
   - auth/security/privacy reviewer,
   - Android/public/offline packaging reviewer.
4. Locally review Lane 4 while subagents work.
5. Collect subagent findings.
6. Build a candidate-finding verification table:
   - finding summary,
   - source lane,
   - cited file/line,
   - verification decision: confirmed, dismissed, downgraded, or follow-up,
   - reason.
7. Create timestamped A19 review report under `UX_v2/execution/`.
8. Create A19 PM tracker update and update current trackers, unstaged for now.
9. Append root `RUNNING_LOG.md`, unstaged.
10. Confirm:
    - staged path count remains 258,
    - staged index still passes `git diff --cached --check`,
    - no excluded paths entered the staged index,
    - no source/config/runtime file has unstaged changes caused by A19.

## Report Required Sections

- Scope and staged baseline.
- Lane evidence lists.
- Subagent summary.
- Candidate-finding verification table.
- Confirmed findings by severity.
- Dismissed/downgraded findings.
- Validation/staged-index preservation.
- Verdict: ready for owner commit decision, comment/follow-up, or request changes.
- Remaining no-go gates.

## No-Go Conditions

- Review target includes unstaged files.
- Any source/config/runtime file changes during A19.
- Any confirmed P0/P1 finding remains unresolved.
- Staged index changes from 258 paths during review.
- Report claims commit, push, deploy, publication, or full goal completion.

## Expected Outcome

A19 produces the final staged-candidate review and clear release-owner recommendation without changing product behavior or mutating the A18 staged candidate.
