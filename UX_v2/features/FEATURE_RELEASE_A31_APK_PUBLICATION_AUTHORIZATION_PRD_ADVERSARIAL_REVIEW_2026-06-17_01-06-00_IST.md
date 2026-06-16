# Feature Release A31 APK Publication Authorization PRD - Adversarial Review

**Created:** 2026-06-17 01:06:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V1_2026-06-17_01-05-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_ADVERSARIAL_REVIEW_2026-06-17_01-06-00_IST.md`

## Executive Verdict

Conditional go after revision. The PRD correctly refuses to publish without explicit owner authorization, but it under-specifies the proof required to identify the exact APK artifact and does not force a clear distinction between "private sideload accepted" and "public/external distribution accepted." Without those fixes, the execution packet could still become a feel-good release note instead of a binding decision gate.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V1_2026-06-17_01-05-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/README.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/scripts/build-apk.sh`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/android/app/build.gradle`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The PRD does not require fresh artifact existence and checksum verification inside A31.

**Evidence:** A31-R1 requires a packet with artifact identity and SHA-256, but the PRD does not require checking the artifact actually exists at execution time or recomputing the hash.
**Why it matters:** A publication decision tied to a stale or missing APK path could authorize the wrong artifact.
**Failure mode:** The packet repeats A30's SHA from prior evidence while the local artifact is absent, rebuilt, or replaced.
**Recommendation:** Add a P0 requirement to verify `data/artifacts/brain-debug-v1.0.5-code6.apk` exists, recompute SHA-256, record size, and confirm `android/app/build.gradle` still reports `versionName "1.0.5"` and `versionCode 6`.

### P1 - High Risk

#### 1. Distribution choices are too broad without risk labels.

**Evidence:** The PRD lists private sideload, GitHub Release, Google Play internal testing, and private storage as choices, but does not classify which choices are safe for a debug-signed artifact.
**Why it matters:** "Publication approved" could be interpreted as approval for a public release of a debug-signed APK.
**Failure mode:** A debug artifact is put somewhere durable/public because the packet treats all distribution targets as equivalent.
**Recommendation:** Add a channel matrix: no distribution and private sideload are decision options; GitHub Release/public storage/Play require signed release APK or AAB unless Arun explicitly accepts debug distribution risk.

#### 2. The accessibility decision is binary enough to hide residual risk.

**Evidence:** The PRD asks whether to accept A30 AX-equivalent risk or require TalkBack, but does not require recording who accepts the risk and for which channel.
**Why it matters:** A private sideload may tolerate residual risk that a wider distribution should not.
**Failure mode:** Owner acceptance for private testing is later cited as acceptance for broader publication.
**Recommendation:** Require channel-scoped acceptance: risk accepted for no distribution, private sideload, internal testing, or broader release, with date and owner.

### P2 - Medium Risk

#### 1. Rollback/install recovery is not required in the decision packet.

**Evidence:** The PRD mentions debug keystore behavior but does not require a reinstall/rollback statement.
**Why it matters:** Debug signing identity controls whether `adb install -r` upgrades in place.
**Failure mode:** The owner approves a sideload but does not know that signer mismatch requires uninstall/re-pair.
**Recommendation:** Add an install/rollback section with current signer class, same-signer upgrade caveat, backup keystore note, and uninstall/re-pair fallback.

#### 2. The PRD does not require a "not authorized yet" default state.

**Evidence:** Decision fields exist, but there is no default value required.
**Why it matters:** Blank fields can be misread as pending-but-acceptable.
**Failure mode:** A future agent sees a packet and treats it as approval because it exists.
**Recommendation:** Require explicit default states: `not_authorized`, `not_selected`, `not_accepted`, and `blocked_until_owner_response`.

### P3 - Low Risk Or Polish

#### 1. Push/PR belongs in a separate optional decision lane.

**Evidence:** The PRD includes repository decision next to APK publication decisions.
**Why it matters:** It can blur source-control publication with APK distribution.
**Failure mode:** The owner approves a PR but not APK distribution, and the packet wording becomes ambiguous.
**Recommendation:** Keep push/PR in an optional repository lane clearly marked as not APK publication.

## What The Original Plan Or Work Gets Wrong

The draft is directionally correct but assumes that a decision packet's presence is enough. A release decision packet must be self-proving about the exact artifact, default-deny by design, and channel-scoped. Otherwise it becomes another status document instead of a gate.

## Missing Validation

- Fresh artifact existence, size, and SHA-256.
- Current Android version metadata check.
- Channel risk matrix for debug versus release signing.
- Default-deny status fields.
- Staged-file exclusion scan.

## Revised Recommendations

Revise the PRD to add artifact verification, channel-scoped risk, install/rollback caveats, explicit default-deny status values, and a separate optional repository lane.

## Go / No-Go Recommendation

Conditional go only after PRD v2 includes the required P0/P1/P2 revisions. Do not execute A31 from v1.

## Plan Revision Inputs

### Required Deletions

- Remove any implication that a debug APK can be externally published through a generic "publication approval."

### Required Additions

- Fresh artifact verification requirement.
- Channel matrix with debug/release signing risk.
- Channel-scoped accessibility risk acceptance.
- Install/reinstall/rollback caveat.
- Default-deny owner-decision fields.

### Required Acceptance Criteria Changes

- Add acceptance criterion that all owner decisions default to not authorized until explicitly marked.
- Add acceptance criterion that artifact checksum is recomputed during A31 execution.

### Required Validation Changes

- Add `shasum -a 256`/size check, current `build.gradle` version check, and staged-file forbidden-pattern scan.

### Required No-Go Gates

- No publication if the artifact is missing or checksum cannot be recomputed.
- No public/external distribution of debug APK unless Arun explicitly approves debug distribution risk.

## Residual Risks

Even after revision, A31 cannot complete the full project because it cannot provide owner authorization by itself. It can only make the decision safe, explicit, and ready.
