# Feature Release A17 Bucket Acceptance Manifest PRD - Adversarial Review

**Created:** 2026-06-16 20:01:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_V1_2026-06-16_20-00-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-01-00_IST.md`

## Executive Verdict

Conditional go after revision. The PRD correctly scopes A17 as a no-staging manifest, but v1 does not yet require enough proof that the git index remains untouched or that the accepted path list will be usable for later staged validation.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A17_BUCKET_ACCEPTANCE_MANIFEST_PRD_V1_2026-06-16_20-00-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A14_DIRTY_WORKTREE_ATTRIBUTION_REPORT_2026-06-16_19-28-32_IST.md`
- Current `git status --short`, `git diff --name-only`, and `git diff --stat` snapshots captured during A17 discovery.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_SELECTIVE_STAGING_REVIEW_2026-06-14.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. No explicit before/after index cleanliness proof

**Evidence:** PRD v1 says A17 must not stage files, but acceptance checks only say "No files are staged by A17" without requiring `git diff --cached --name-only` before and after.
**Why it matters:** A17's core promise is that it creates a manifest without mutating the index. In a broad worktree, that must be proven, not implied.
**Failure mode:** A later agent may inherit staged files and assume they are approved by A17.
**Recommendation:** Require pre/post `git diff --cached --name-only` and record whether the index is unchanged.

#### 2. Accepted-source paths need a copyable staging input, not only prose

**Evidence:** A17-R3 requires exact paths, but v1 does not require a companion path-list block or file that can be copied into later pathspec staging.
**Why it matters:** A prose manifest can still lead to manual selection errors.
**Failure mode:** A later staging pass accidentally omits an untracked source file or includes a heavy evidence folder.
**Recommendation:** Require the manifest to include fenced path-list sections for accepted source/config and current governance docs, with deferred lanes separated.

### P2 - Medium Risk

#### 1. `RUNNING_LOG.md` whole-file rewrite risk is listed as a risk but not an acceptance constraint

**Evidence:** PRD v1 risk table says `RUNNING_LOG.md` whole-file diff remains risky, but no requirement forces the manifest to classify it separately.
**Why it matters:** Root running-log updates are append-only in process, but the working-tree diff can still appear as a large rewrite against HEAD.
**Failure mode:** A staging agent stages the whole file and overwrites prior history in a release commit.
**Recommendation:** Add a requirement that `RUNNING_LOG.md` gets a dedicated staging strategy: append-only reconstruction or explicit owner approval.

#### 2. Current governance docs versus heavy evidence folders are not concrete enough

**Evidence:** V1 requires an evidence-retention policy, but does not require named examples such as `WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_*` or Magic Patterns source snapshots.
**Why it matters:** Those directories dominate the untracked count and are the easiest source of noisy commits.
**Failure mode:** A broad `git add UX_v2/execution` stages hundreds of screenshots/source snapshots.
**Recommendation:** Require explicit heavy evidence path patterns in the deferred lane.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The PRD assumes "no staging" can be verified by intent. In this project, index state is a release surface and must be captured before and after A17.

## Missing Validation

- Pre/post cached diff check.
- Copyable accepted path-list sections.
- Dedicated `RUNNING_LOG.md` staging strategy.
- Explicit heavy evidence path patterns.

## Revised Recommendations

1. Add `git diff --cached --name-only` before and after A17.
2. Require fenced accepted path-list sections.
3. Require a dedicated `RUNNING_LOG.md` staging policy.
4. Require explicit heavy evidence folder deferrals.

## Go / No-Go Recommendation

Conditional go. Proceed only after PRD v2 adds the index proof, copyable path-list sections, and dedicated running-log/evidence policies.

## Plan Revision Inputs

### Required Deletions

- No required deletions.

### Required Additions

- Pre/post index proof.
- Fenced accepted path-list sections.
- Dedicated `RUNNING_LOG.md` staging strategy.
- Explicit heavy evidence deferral patterns.

### Required Acceptance Criteria Changes

- A17 is not accepted unless the index is unchanged after execution.
- A17 manifest must be usable as a later staging input without broad directory adds.

### Required Validation Changes

- Add `git diff --cached --name-only` before and after A17.

### Required No-Go Gates

- If the git index changes during A17, stop and report a blocker.
- If the manifest cannot separate source/config from heavy evidence, it is not complete.

## Residual Risks

Even a good manifest does not prove staged validation, Android publication authorization, TalkBack spoken-order, URL-share success, or full release completion.
