# Feature Release A12 Authenticated Android Publication Gate PRD - Adversarial Review

**Created:** 2026-06-16 15:48:59 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V1_2026-06-16_15-47-37_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_15-48-59_IST.md`

## Executive Verdict

Conditional no-go until the PRD is revised. The PRD correctly blocks APK publication on missing Android runtime proof, but it still leaves three high-risk gaps: production mutation cleanup is too vague, APK candidate freshness/hash verification is not a first-class gate, and CDP/session injection can be confused with real pairing-token proof.

## Evidence Inspected

- `UX_v2/features/FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V1_2026-06-16_15-47-37_IST.md`
- `Handover_docs/AI_MEMORY_UX_V2_PRODUCTION_ANDROID_HANDOVER_2026-06-16_15-04-24_IST.md`
- `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/features/FEATURE_ANDROID_A6_RUNTIME_CLIENT_STATE_PRD_V2_2026-06-16_13-00-00_IST.md`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Production share/capture tests can pollute the real library without a required cleanup contract

**Evidence:** PRD requires native URL/PDF/multi-PDF share validation at lines 68-70 and mentions cleanup only generically at line 110. It does not require temporary object naming, item ID capture in redacted form, post-test delete/archive, or verification that production item count/content returned to baseline.
**Why it matters:** Native share proof is likely to create or update real production items. Without a concrete isolation and cleanup rule, A12 can pass while leaving test captures in Arun's private library.
**Failure mode:** A URL or PDF smoke creates a duplicate/weak item, the screenshot looks correct, and the release packet says native share passed even though production data was polluted or a private item was changed.
**Recommendation:** Add a P0 or P1 requirement for mutation isolation: use clearly marked temporary share fixtures, record redacted item handles/hashes only, verify result classification, delete or repair test objects where safe, and record cleanup proof or explicit no-cleanup rationale.

#### 2. APK candidate freshness and hash matching are not explicit publication gates

**Evidence:** Current state says A11 built `brain-debug-v1.0.3-code4.apk` at line 17, while R1 only requires APK path/install/app focus at line 65. The PRD does not require A12 to re-hash the artifact, confirm Gradle output matches published artifact, confirm install uses the same hash, or rebuild after code/config changes.
**Why it matters:** The worktree is dirty and broad. A12 could validate an old APK, a copied artifact, or a candidate that no longer matches current source.
**Failure mode:** Publication-ready is claimed from an emulator that installed an APK with the right filename but not the latest source or final artifact hash.
**Recommendation:** Add a P0 APK identity/freshness gate: record versionName/versionCode, artifact path, Gradle path, SHA-256 for both, installed package version if available, source HEAD, and rebuild/reinstall requirement after any code/config change.

#### 3. Authenticated route proof can be mistaken for pairing/session proof

**Evidence:** R2 accepts "cookie/session injection or pairing/unlock path" at line 66, while R7 requires session/pairing persistence at line 71. The PRD does not explicitly state that CDP cookie/session injection cannot satisfy pairing-token persistence.
**Why it matters:** CDP injection is useful for protected route screenshots, but it does not prove the production pairing flow or Capacitor token storage.
**Failure mode:** A12 injects a web session, protected routes pass, force-stop/relaunch appears authenticated through cookie state, and the release packet accidentally claims pairing/token persistence even though no pairing exchange occurred.
**Recommendation:** Split auth evidence into two labels: `android_authenticated_route_via_session` and `android_pairing_token_runtime`. Require a real pairing exchange or existing redacted token-preservation proof for pairing persistence; otherwise mark pairing persistence blocked.

### P2 - Medium Risk

#### 1. TalkBack "or equivalent" is too vague

**Evidence:** Evidence label `android_accessibility_runtime` allows "TalkBack or equivalent" at line 58, and R11 repeats "TalkBack or equivalent Android accessibility" at line 75.
**Why it matters:** A vague equivalent can turn into a screenshot-only check that does not prove labels, order, or focus behavior.
**Failure mode:** A12 records visual keyboard screenshots and calls TalkBack equivalent passed, while screen-reader labels remain wrong.
**Recommendation:** Define acceptable alternatives: TalkBack transcript/video/manual checklist with route, element order, spoken label expectation, and pass/fail; otherwise mark TalkBack blocked.

#### 2. Offline/stale-cache acceptance lacks a stale-version proof

**Evidence:** R9 at line 73 requires offline fallback and recovery after network restore/reload, but does not require proving recovery from an intentionally stale service worker/cache version or old shell.
**Why it matters:** Offline fallback can pass while stale shell recovery remains untested.
**Failure mode:** Network-offline fallback works, but users with old service-worker cache keep seeing outdated UX or private count behavior.
**Recommendation:** Require evidence of current cache names/version, update/reload path, and post-restore shell version/visible marker.

### P3 - Low Risk Or Polish

#### 1. Final release ownership review needs an output path

**Evidence:** R12 requires ownership review at line 76, but the PRD does not name the expected report path pattern.
**Why it matters:** A12 can become hard to audit if ownership findings are buried only inside the QA report.
**Failure mode:** Future agents cannot quickly find the release ownership decision.
**Recommendation:** Name a release ownership report under `UX_v2/execution/`, then link it from A12 QA and A7 release packet.

## What The Original Plan Or Work Gets Wrong

The PRD is directionally strict, but it assumes "direct APK/WebView evidence" is self-enforcing. It is not. The evidence types must prevent three common false positives: using a stale APK, creating production test data without cleanup, and treating session injection as pairing proof.

## Missing Validation

- Production mutation cleanup verification for share-created items.
- APK source/artifact/installed-version hash chain.
- Separate route-auth versus pairing-token evidence labels.
- TalkBack alternative checklist definition.
- Stale service-worker/cache version proof, not only offline fallback proof.
- Dedicated release ownership review report path.

## Revised Recommendations

Revise the PRD before implementation planning. Add gates for mutation cleanup, APK identity/freshness, pairing-token evidence separation, TalkBack evidence format, stale-cache version proof, and ownership report output.

## Go / No-Go Recommendation

No-go for execution from PRD v1. Go for implementation planning only after PRD v2 closes the P1 findings.

## Plan Revision Inputs

### Required Deletions

- Remove any ambiguity that CDP/session injection can satisfy pairing-token persistence.

### Required Additions

- Add APK identity/freshness gate.
- Add production mutation isolation and cleanup gate.
- Add separate evidence labels for authenticated route proof and pairing-token proof.
- Add TalkBack acceptable-evidence definition.
- Add stale-cache version/update proof requirement.
- Add final release ownership report path.

### Required Acceptance Criteria Changes

- APK publication must remain blocked if APK hash/source/install chain is missing.
- Native share gates must include cleanup proof or an explicit blocked/no-cleanup verdict.
- Pairing persistence must be `passed` only with actual pairing/token evidence, not only session cookie evidence.

### Required Validation Changes

- Add redaction scan targets for A12 evidence plus screenshots/UI trees where practical.
- Add production item count or redacted temporary-object cleanup verification for mutation tests.
- Add installed APK package/version/hash verification where tooling allows it.

### Required No-Go Gates

- No APK publication-ready claim if mutation cleanup is missing.
- No APK publication-ready claim if APK candidate identity is unproven.
- No pairing/session persistence pass if only CDP session injection was used.

## Residual Risks

Even after revision, Android emulator evidence may not perfectly represent a physical phone. The release packet should preserve that limitation unless physical-device proof is added.
