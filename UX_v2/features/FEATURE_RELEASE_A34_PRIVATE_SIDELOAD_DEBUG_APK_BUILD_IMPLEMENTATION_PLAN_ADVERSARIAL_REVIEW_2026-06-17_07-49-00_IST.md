# Feature Release A34 Private Sideload Debug APK Build Implementation Plan - Adversarial Review

**Created:** 2026-06-17 07:49:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_IMPLEMENTATION_PLAN_V1_2026-06-17_07-48-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_07-49-00_IST.md`

## Executive Verdict

Conditional go after revision. The plan is directionally correct, but it does not define how to handle build-generated tracked changes, and it leaves "full goal completion" ambiguous.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/scripts/build-apk.sh`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/.gitignore`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_IMPLEMENTATION_PLAN_V1_2026-06-17_07-48-00_IST.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Build-generated tracked file changes are not classified.

**Evidence:** `npm run build:apk` runs `npx cap sync android`, which can update tracked Android generated assets or config files.
**Why it matters:** Staging only planned paths may omit necessary generated metadata, while staging all changes may include unrelated files.
**Failure mode:** APK artifact is built from generated state that differs from committed source/docs.
**Recommendation:** Plan v2 must inspect post-build git status, classify every tracked build-generated change, and stage only relevant source/generated files needed to reproduce `1.0.6/code7`.

#### 2. Full-goal completion remains ambiguous.

**Evidence:** Plan v1 says not to claim full completion "unless private sideload build is treated as owner-approved final Android delivery".
**Why it matters:** The owner approved build/private sideload, not a public distribution strategy.
**Failure mode:** The active goal is marked complete without evidence of actual sideload on Arun's device.
**Recommendation:** Plan v2 should keep goal status as private-sideload artifact ready unless and until the owner confirms this is the final Android delivery.

### P2 - Medium Risk

#### 1. Push command lacks explicit branch/upstream behavior.

**Evidence:** Current branch has no upstream shown by `git branch -vv`.
**Why it matters:** A plain push may fail or push the wrong ref.
**Failure mode:** Work is committed locally but not available remotely.
**Recommendation:** Use `git push -u origin codex/ai-brain-ux-v2-execution` and report result.

### P3 - Low Risk Or Polish

#### 1. Notes should warn that fresh install loses local Android app state.

**Evidence:** Fresh install starts with uninstall.
**Why it matters:** User may need to re-pair after install.
**Failure mode:** User thinks existing pairing survives.
**Recommendation:** Add fresh-install state warning and re-pair step.

## What The Original Plan Or Work Gets Wrong

It treats the build as only a binary-output event, but the build pipeline also runs source validation and Capacitor sync, so post-build source state must be inspected before commit.

## Missing Validation

- Post-build tracked change classification.
- Explicit push command.
- Fresh-install local-state warning.

## Revised Recommendations

Revise plan v2 with tracked-change classification, explicit upstream push, and conservative active-goal status.

## Go / No-Go Recommendation

Conditional go after plan v2. Do not execute from v1.

## Plan Revision Inputs

### Required Deletions

- Remove ambiguous language that permits automatic full-goal completion.

### Required Additions

- Post-build tracked change classification.
- Exact push command.
- Fresh-install state loss warning.

### Required Acceptance Criteria Changes

- Add acceptance that all staged tracked changes are attributable to A34.

### Required Validation Changes

- Inspect `git status --short --untracked-files=no` after build before staging.

### Required No-Go Gates

- No commit if unclassified tracked generated files are present.

## Residual Risks

The APK is still debug-signed and private-use-only. Public or store distribution remains a separate release-signing/publication project.
