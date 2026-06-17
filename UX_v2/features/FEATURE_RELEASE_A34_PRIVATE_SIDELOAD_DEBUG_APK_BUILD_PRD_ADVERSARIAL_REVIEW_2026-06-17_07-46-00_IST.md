# Feature Release A34 Private Sideload Debug APK Build PRD - Adversarial Review

**Created:** 2026-06-17 07:46:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_PRD_V1_2026-06-17_07-45-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A34_PRIVATE_SIDELOAD_DEBUG_APK_BUILD_PRD_ADVERSARIAL_REVIEW_2026-06-17_07-46-00_IST.md`

## Executive Verdict

Conditional go after revision. The PRD captures the owner's private-sideload intent, but it under-specifies install validation and could accidentally imply that private sideload equals production release completion.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/android/app/build.gradle`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/scripts/build-apk.sh`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A31_APK_PUBLICATION_AUTHORIZATION_PACKET_2026-06-17_01-15-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A33_COMPLETION_AUDIT_AND_OWNER_HANDOFF_2026-06-17_01-55-00_IST.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. The PRD does not require fresh-install validation when Android tooling is available.

**Evidence:** Owner selected fresh install, but PRD v1 only requires install notes.
**Why it matters:** A broken APK can still build successfully but fail to install.
**Failure mode:** Arun receives notes for an artifact that fails at install time.
**Recommendation:** PRD v2 should require a best-effort emulator fresh-install validation if Android tooling and an emulator are available, or a clearly documented skip reason if not.

#### 2. Private sideload can be mistaken for final production completion.

**Evidence:** A33 says full active goal is owner-gated; A34 approval is only for building a debug APK with no distribution strategy.
**Why it matters:** A debug APK built for private sideload is not a public/store production release.
**Failure mode:** Trackers mark the overall goal complete even though no distribution channel, release signing, or public deployment occurred.
**Recommendation:** PRD v2 must state that A34 closes private-sideload build only and does not create a public/signed release.

### P2 - Medium Risk

#### 1. Repository push should not include ignored APK binaries.

**Evidence:** `data/artifacts/` is ignored and build output is a binary artifact.
**Why it matters:** Accidentally forcing binaries into git increases repo bloat and can leak build artifacts.
**Failure mode:** `git add -f data/artifacts/...apk` pushes a binary the owner only asked to create locally.
**Recommendation:** PRD v2 should require pushing source/docs only and reporting the local APK path/checksum.

### P3 - Low Risk Or Polish

#### 1. Install notes should include exact fresh-install commands.

**Evidence:** Owner said they will use fresh install.
**Why it matters:** Fresh install requires uninstall/re-pair and is easy to confuse with upgrade install.
**Failure mode:** Arun tries `adb install -r` over an incompatible signer or old state.
**Recommendation:** Notes should include `adb uninstall com.arunprakash.brain` followed by `adb install <apk>`.

## What The Original Plan Or Work Gets Wrong

It treats build creation as sufficient, but private sideloading needs at least artifact identity, install posture, and a clear warning that the APK is debug-signed.

## Missing Validation

- Best-effort fresh-install validation or skip reason.
- Explicit "not a public release" tracker wording.
- Staged-path scan to prevent APK binary commits.

## Revised Recommendations

Revise the PRD to add fresh-install validation, debug-only release boundaries, and source/docs-only push scope.

## Go / No-Go Recommendation

Conditional go after PRD v2. Do not execute from v1.

## Plan Revision Inputs

### Required Deletions

- Remove any implication that private sideload equals public production release.

### Required Additions

- Best-effort fresh-install validation.
- Source/docs-only push scope.
- Explicit debug signing warning.

### Required Acceptance Criteria Changes

- Add install validation or skip evidence.

### Required Validation Changes

- Add staged path exclusion check for APKs and `data/artifacts/`.

### Required No-Go Gates

- No commit or push if APK binary, keystore, or secrets are staged.

## Residual Risks

Private sideload remains debug-signed and AX-equivalent-only for accessibility. Public/store release still requires a separate owner-authorized release-signing/publication path.
