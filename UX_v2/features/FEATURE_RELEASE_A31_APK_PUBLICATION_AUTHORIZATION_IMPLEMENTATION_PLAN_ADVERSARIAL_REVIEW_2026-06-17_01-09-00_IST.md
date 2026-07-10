# Feature Release A31 APK Publication Authorization Implementation Plan - Adversarial Review

**Created:** 2026-06-17 01:09:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_V1_2026-06-17_01-08-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_01-09-00_IST.md`

## Executive Verdict

Conditional go after revision. The plan has the right non-mutating intent, but it does not specify exact tracker text changes, does not protect against accidentally staging previously dirty unrelated files, and does not define what happens if the APK artifact verification fails. Those gaps can turn a clean decision packet into a messy release-management commit.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_IMPLEMENTATION_PLAN_V1_2026-06-17_01-08-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V2_2026-06-17_01-07-00_IST.md`
- Current git status: branch `codex/ai-brain-ux-v2-execution`, with pre-existing modified root `RUNNING_LOG.md`, `ROADMAP_TRACKER.md`, and `docs/plans/*` files.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/scripts/build-apk.sh`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/android/app/build.gradle`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The plan does not explicitly isolate A31 staging from pre-existing dirty files.

**Evidence:** Step 11 says "Stage only safe A31 docs and tracker updates" but does not name the intended staged paths or require diff review against pre-existing modified files.
**Why it matters:** The worktree already contains unrelated modified files. A broad or careless stage could mix A31 with root docs or previous work.
**Failure mode:** `ROADMAP_TRACKER.md`, root `RUNNING_LOG.md`, or unrelated docs enter the A31 commit.
**Recommendation:** Add a fixed A31 path allowlist and require `git diff --cached --name-only` review before commit.

### P1 - High Risk

#### 1. Artifact verification failure path is undefined.

**Evidence:** Step 2 verifies the artifact, but the plan does not say whether execution stops or creates a blocked packet if the artifact is missing.
**Why it matters:** Rebuilding the APK is out of scope, but a missing artifact would make the packet weak if silently ignored.
**Failure mode:** The agent rebuilds or publishes stale claims to avoid a blocker.
**Recommendation:** Add a fail-closed branch: if artifact verification fails, do not rebuild; create a blocked packet documenting the missing evidence and keep publication blocked.

#### 2. Tracker updates are underspecified.

**Evidence:** Steps 5-8 say update trackers but do not name exact status labels.
**Why it matters:** The project has many historical tracker rows, and vague updates can revive stale "pending URL-share" or "no accessibility audit" language.
**Failure mode:** A31 creates more tracker ambiguity instead of reducing it.
**Recommendation:** Require labels: `apk_publication_authorization_packet_ready`, `apk_publication_authorization_missing`, and `platform_ax_equivalent_passed_with_residual_risk`.

### P2 - Medium Risk

#### 1. The running-log append is not governed by the skill's confirmation nuance.

**Evidence:** Step 9 says append root running log entry, but the skill says default behavior asks for confirmation unless direct writing is authorized. The active goal asked to use the running log at milestones, and prior work has directly appended milestone entries.
**Why it matters:** Future agents need to know why direct append was acceptable here.
**Failure mode:** Either the log is skipped despite the user's cadence requirement, or appended without documenting the authorization basis.
**Recommendation:** State that the active goal explicitly requests regular/milestone running-log use, so A31 appends directly as a milestone entry and keeps it unstaged.

#### 2. Redaction scan patterns are not listed.

**Evidence:** Validation mentions a redaction scan but not what it scans for.
**Why it matters:** Release docs often contain SHA-256 hashes, which can look like secrets; scans need both detection and classification.
**Failure mode:** Safe APK SHA is treated as a failure, or secret-like text slips through.
**Recommendation:** Add scan patterns and expected allowed exceptions for APK SHA-256 only.

### P3 - Low Risk Or Polish

#### 1. PM sidecar result integration is absent.

**Evidence:** A PM sidecar has been requested for the broader project, but the plan does not mention consuming its status if available.
**Why it matters:** The sidecar may catch stale tracker rows before commit.
**Failure mode:** The main agent commits A31 while ignoring a useful PM audit result.
**Recommendation:** Add a non-blocking step to integrate PM sidecar findings if returned before final validation.

## What The Original Plan Or Work Gets Wrong

The plan is safe at the release-action level, but not safe enough at the repository-hygiene level. In this worktree, staging discipline is itself a release gate.

## Missing Validation

- Explicit allowlisted staged paths.
- `git diff --cached --name-only` review.
- Fail-closed behavior if APK artifact verification fails.
- Tracker label consistency scan.
- Redaction scan pattern list.

## Revised Recommendations

Revise the plan to add a path allowlist, fail-closed artifact handling, exact tracker labels, running-log authorization rationale, PM sidecar integration, and explicit scan patterns.

## Go / No-Go Recommendation

Conditional go only after implementation plan v2 incorporates these changes. Do not execute from v1.

## Plan Revision Inputs

### Required Deletions

- Remove any vague staging language that could permit broad directory staging.

### Required Additions

- Fixed A31 path allowlist.
- Fail-closed missing-artifact branch.
- Exact tracker status labels.
- Redaction pattern list with allowed APK SHA classification.
- PM sidecar integration checkpoint.

### Required Acceptance Criteria Changes

- Add "cached path list matches A31 allowlist" before commit.

### Required Validation Changes

- Add `git diff --cached --name-only` forbidden-pattern scan.
- Add tracker label scan for stale TalkBack/publication wording.

### Required No-Go Gates

- No commit if cached paths include root `RUNNING_LOG.md`, unrelated dirty files, binary artifacts, or raw evidence.

## Residual Risks

A31 will still be blocked on owner response. That is acceptable as long as the packet makes the next human decision unambiguous and does not pretend authorization has been received.
