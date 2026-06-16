# Feature Release A17 Bucket Acceptance Manifest Implementation Plan - Adversarial Review

**Created:** 2026-06-16 20:04:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_IMPLEMENTATION_PLAN_V1_2026-06-16_20-03-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-04-00_IST.md`

## Executive Verdict

Conditional go after revision. The plan has the right no-staging shape, but v1 omits the root running-log append despite the PRD requiring it, and it does not make the path-list sections strict enough for later safe staging.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_IMPLEMENTATION_PLAN_V1_2026-06-16_20-03-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_V2_2026-06-16_20-02-00_IST.md`
- PM sidecar memo from agent `019ed0d5-7295-70d0-b71d-e9b7abc79126`
- Current `git status --short` and A14/A16 evidence read during discovery.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Root running-log append is missing from the step plan

**Evidence:** PRD v2 A17-R11 requires a root running log entry after manifest validation. Implementation plan v1 steps create the manifest, PM update, and tracker updates, but never append `RUNNING_LOG.md`.
**Why it matters:** The user explicitly requested running-log updates at milestones; A17 is a milestone.
**Failure mode:** A17 completes with trackers updated but no append-only handoff, making the next agent rely on stale A16 state.
**Recommendation:** Add an explicit append-only root `RUNNING_LOG.md` step after tracker/report validation, and verify the latest heading.

#### 2. Accepted path-list sections are not constrained to files only

**Evidence:** Plan v1 requires accepted source/config and governance-doc path lists, but does not forbid directory patterns in the accepted blocks.
**Why it matters:** The whole point of A17 is to avoid broad directory staging.
**Failure mode:** The manifest includes `UX_v2/execution/**` or `src/**` as an accepted path list and later staging pulls in unreviewed files.
**Recommendation:** Require accepted path-list blocks to contain concrete file paths only. Directory/glob patterns belong only in deferred/review-required evidence sections.

### P2 - Medium Risk

#### 1. Post-index proof should run after every A17 write, including running log

**Evidence:** Plan v1 captures post-A17 index state as step 7 before a running-log step that is currently absent.
**Why it matters:** Index mutation proof must cover the whole A17 operation.
**Failure mode:** A later tool/action stages files after the proof and A17 still claims the index was unchanged.
**Recommendation:** Move final index proof to the end after all file writes and validation edits.

#### 2. Current PM inconsistencies should be recorded as A17 findings, not silently rewritten

**Evidence:** PM sidecar identified stale delivery tracker and milestone tracker rows. Plan v1 says to correct/add notes, but does not require preserving historical context.
**Why it matters:** Old rows are historical evidence of earlier state; silently rewriting them can confuse audit trails.
**Failure mode:** A future agent cannot tell whether a row was stale at the time or later corrected.
**Recommendation:** Add dated A17 reconciliation notes rather than broad historical rewrites, except for plainly stale forward-looking text such as "will receive A16."

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The plan treats tracker updates as sufficient continuity, but the project's explicit operating cadence uses the root running log as the handoff journal. It also under-specifies the path-list format, which risks reintroducing broad staging through the back door.

## Missing Validation

- Latest running-log heading verification.
- Accepted path-list file-only check.
- Final index proof after all writes.

## Revised Recommendations

1. Add root running-log append and verification.
2. Require accepted path lists to use concrete file paths only.
3. Keep directory/glob patterns out of accepted path lists.
4. Run final cached-diff proof at the end.
5. Add dated tracker reconciliation notes instead of broad historical rewrites.

## Go / No-Go Recommendation

Conditional go. Proceed after plan v2 adds the missing running-log step, file-only accepted path-list rule, and final index proof ordering.

## Plan Revision Inputs

### Required Deletions

- No required deletions.

### Required Additions

- Root running-log append and latest-heading verification.
- File-only rule for accepted path-list blocks.
- Dated A17 tracker reconciliation notes.
- Final post-A17 index proof after all file writes.

### Required Acceptance Criteria Changes

- A17 is incomplete unless root `RUNNING_LOG.md` receives an append-only entry.
- A17 manifest is invalid if accepted path-list blocks contain directories or glob patterns.

### Required Validation Changes

- Add running-log latest-heading check.
- Add accepted path-list inspection against broad directory/glob entries.

### Required No-Go Gates

- If accepted path lists include broad directory/glob patterns, revise the manifest before closing.
- If the final index state differs from the initial index state, stop and report a blocker.

## Residual Risks

A17 can reduce staging ambiguity, but it still cannot close release-owner staging, validation after staging, APK publication authorization, TalkBack spoken-order, URL-share proof, or full goal completion.
