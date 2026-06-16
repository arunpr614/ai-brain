# Feature Release A14 Dirty Worktree Attribution PRD - Adversarial Review

**Created:** 2026-06-16 19:26:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_PRD_V1_2026-06-16_19-24-01_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_PRD_ADVERSARIAL_REVIEW_2026-06-16_19-26-00_IST.md`

## Executive Verdict

Conditional no-go until PRD v2 adds reproducible path-level inventory requirements and a stronger "not a staging instruction" boundary. PRD v1 is pointed at the right blocker, but a category-only manifest can still leave release ownership ambiguous.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A14_DIRTY_WORKTREE_ATTRIBUTION_PRD_V1_2026-06-16_19-24-01_IST.md`
- Current command evidence:
  - `git diff --name-only`: 97 tracked modified files.
  - `git ls-files --others --exclude-standard`: 868 expanded untracked files.
  - `git diff --numstat`: 5,494 insertions and 6,661 deletions across tracked diffs.
  - Ignored APK scan shows `data/artifacts/` and `android/app/build/` are ignored.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Category-only classification can still hide unowned release files

**Evidence:** A14-R2 and A14-R3 require classification by top-level and key subdirectory buckets at lines 47-48, but do not require path-level appendices, representative paths, or exact commands to regenerate path lists.
**Why it matters:** The actual problem is not just "there are many files"; it is that release ownership must be traceable. Category summaries can hide a single unreviewed migration, route, service worker, or config file that changes runtime behavior.
**Failure mode:** The release owner stages a category like `src` or `UX_v2` without seeing the individual high-risk paths in that bucket.
**Recommendation:** PRD v2 must require path-level treatment for tracked source/config changes and at least path-list command reproducibility for expanded untracked files. It should identify high-risk individual paths, not only top-level counts.

#### 2. "Likely must be staged" wording is too close to a staging instruction

**Evidence:** A14-R4 says release-critical app/source/test/schema/config files "likely must be staged together" at line 49.
**Why it matters:** The agent is not authorized to stage, commit, or decide final release ownership. The report can recommend review groupings, but not imply that all grouped files should be staged.
**Failure mode:** A future agent treats the A14 report as permission to stage all source/config changes without owner acceptance.
**Recommendation:** PRD v2 must use "candidate release bundle for owner review" language and require owner acceptance before staging.

### P1 - High Risk

#### 1. The PRD does not require differentiating implementation files from evidence files inside `UX_v2`

**Evidence:** Expanded untracked files are heavily concentrated under `UX_v2`, including execution evidence, feature plans, PM files, trackers, and source snapshots. PRD v1 groups this as docs/evidence/reference at lines 50-51 but does not require sub-buckets.
**Why it matters:** Some `UX_v2` files are current release governance artifacts; others are source snapshots or historical planning packages. These should not all travel together.
**Failure mode:** The final release includes hundreds of source snapshot files that are useful for audit but not intended to be committed with product source.
**Recommendation:** Require sub-buckets for `UX_v2/features`, `UX_v2/execution`, `UX_v2/project_management`, `UX_v2/trackers`, `UX_v2/UX_Final_Plan`, and source snapshots/evidence folders.

#### 2. Ignored APK policy needs publication-safe language

**Evidence:** A14-R7 requires ignored APK artifacts and hashes but does not repeat the A13 publication gate.
**Why it matters:** APK artifacts are the exact object someone may want to publish. A14 must preserve that publication is unauthorized.
**Failure mode:** The hash list is used as a publication manifest.
**Recommendation:** PRD v2 must state that ignored APK hashes are identity evidence only, not publication authorization or artifact retention policy.

### P2 - Medium Risk

#### 1. Validation plan is under-specified for code buckets

**Evidence:** A14-R9 says map buckets to required validation but does not name expected validations.
**Why it matters:** A source bucket with app routes, DB migration, service worker, and Android config needs stronger checks than a docs-only bucket.
**Failure mode:** A report says "run tests" without saying which validation gates should protect which bucket.
**Recommendation:** Require bucket-specific checks: typecheck, lint, targeted tests, full tests, Next build, APK build, Android runtime smoke, and evidence secret scan as applicable.

#### 2. The report may become stale immediately

**Evidence:** PRD v1 notes staleness risk at line 74 but does not require a final "valid until next worktree change" caveat.
**Why it matters:** Any new file changes invalidate exact counts.
**Failure mode:** A later agent relies on A14 counts after new work has changed the tree.
**Recommendation:** Add a freshness caveat and rerun command list.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It correctly identifies the dirty-worktree blocker but still treats classification as enough. Release ownership needs path-level traceability, owner acceptance, and bucket-specific validation gates.

## Missing Validation

- Path-level tracked diff list or high-risk path appendix.
- `UX_v2` sub-bucket separation.
- Bucket-specific validation mapping.
- Explicit "identity evidence, not publication authorization" language for APK hashes.
- Freshness caveat.

## Revised Recommendations

1. Require exact tracked path inventory in the report.
2. Require expanded untracked counts and sub-buckets, with reproducible commands for full lists.
3. Use "candidate release bundle for owner review" wording.
4. Add bucket-specific validation gates.
5. Preserve A13 publication no-go labels.

## Go / No-Go Recommendation

No-go for execution on PRD v1. Proceed after PRD v2 incorporates the required inventory and safety boundaries.

## Plan Revision Inputs

### Required Deletions

- Remove or soften "likely must be staged" wording.

### Required Additions

- Path-level tracked inventory requirement.
- `UX_v2` sub-bucket requirement.
- APK identity-only policy.
- Freshness caveat.
- Owner-acceptance requirement before staging.

### Required Acceptance Criteria Changes

- A14 report must include exact tracked path list or a tightly scoped tracked-path appendix.
- A14 report must include commands needed to regenerate full untracked path lists.

### Required Validation Changes

- Add bucket-specific validation matrix.

### Required No-Go Gates

- No staging or release ownership completion without explicit release-owner acceptance of every candidate release bucket.

## Residual Risks

Even with PRD v2, A14 cannot close final release ownership by itself. It can only make the release-owner review tractable.
