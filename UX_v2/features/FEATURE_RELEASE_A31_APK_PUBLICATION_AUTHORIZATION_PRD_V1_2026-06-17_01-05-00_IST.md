# Feature Release A31 - APK Publication Authorization PRD v1

Created: 2026-06-17 01:05:00 IST
Owner: Codex
Status: Draft for adversarial review
Related gates: A7 release readiness, A12 Android publication gate, A29 native URL-share proof, A30 Android accessibility-order audit

## Objective

Create an owner-ready Android APK publication authorization packet for the current validated debug candidate `1.0.5/code6`, without signing, uploading, publishing, or distributing the APK. A31 exists to convert the remaining human release blockers into explicit decisions that Arun can approve or reject.

## Background

The web UX v2 revamp is deployed to production. Android debug APK `1.0.5/code6` has passed authenticated route, pairing, native note share, offline/recovery, keyboard, URL failure honesty, share-target log hygiene, native URL-share success with `capture_source=android`, and platform accessibility-order validation. The remaining release blocker is not another code change; it is publication authorization and a decision on whether A30's platform accessibility evidence is sufficient or whether true human-heard TalkBack evidence is still required.

## Source Evidence

| Evidence | A31 interpretation |
| --- | --- |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Current source of release status and gate table. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Current PM gate matrix and open blockers. |
| `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_SPOKEN_ORDER_QA_2026-06-17_00-50-00_IST.md` | Latest Android accessibility evidence; AX-equivalent only, not spoken TalkBack. |
| `UX_v2/execution/UX_V2_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_QA_2026-06-17_00-29-00_IST.md` | Latest native Android URL-share success proof. |
| `README.md` | Documents debug APK build/install and debug-keystore behavior. |
| `scripts/build-apk.sh` | Confirms the available build flow is debug APK generation and blocks same-version artifact overwrite unless explicitly local-only. |
| `android/app/build.gradle` | Current Android identity: `versionName "1.0.5"`, `versionCode 6`; release build type has no release signing config. |

## Requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| A31-R1 | Produce a publication authorization packet under `UX_v2/execution/`. | P0 | Packet lists artifact identity, SHA-256, validation coverage, blockers, required owner decisions, and no-go conditions. |
| A31-R2 | Keep A31 strictly non-mutating. | P0 | No signing, upload, publish, deploy, artifact rebuild, version bump, or production data mutation occurs. |
| A31-R3 | Separate validated debug candidate from publishable release artifact. | P0 | Packet states `brain-debug-v1.0.5-code6.apk` is debug-signed and not a public release artifact unless Arun explicitly approves that channel. |
| A31-R4 | Present exact owner decisions. | P0 | Packet includes decision fields for publication approval, distribution target, signing mode, accessibility residual-risk acceptance, artifact/version, and push/PR preference. |
| A31-R5 | Preserve Android evidence honesty. | P0 | Packet says A30 is `platform_ax_equivalent_passed_with_residual_risk`, not `talkback_spoken_passed`. |
| A31-R6 | Update trackers without closing unresolved gates. | P0 | Release packet, delivery tracker, milestone tracker, and PM update show A31 decision packet complete while APK publication authorization remains open. |
| A31-R7 | Append root running log entry. | P1 | Root `RUNNING_LOG.md` receives append-only A31 milestone entry but remains unstaged unless explicitly approved. |
| A31-R8 | Avoid sensitive artifact leakage. | P0 | Tracked A31 docs do not include raw tokens, pairing codes, private item data, raw APK binary, keystores, `.env`, DBs, screenshots, or raw logs. |

## Decision Fields

The packet must ask Arun to choose:

1. APK publication: approve or do not approve publication.
2. Distribution target: no distribution, private sideload, GitHub Release, Google Play internal testing, private storage, or another named channel.
3. Signing mode: current debug-signed APK, new signed release APK, AAB, or defer.
4. Keystore/source of signing authority: existing debug keystore, owner-provided release keystore, Play app signing, or defer.
5. Accessibility decision: accept A30 AX-equivalent residual risk, require true spoken TalkBack audit, or block publication.
6. Artifact/version decision: use `1.0.5/code6`, bump to a new Android version before any shared artifact, or defer.
7. Repository decision: push branch, create PR, both, or keep local.

## Acceptance Criteria

1. A31 PRD v1, adversarial review, PRD v2, implementation plan v1, plan adversarial review, and plan v2 exist before execution artifacts are written.
2. A31 execution creates an owner-readable publication authorization packet with clear approve/reject checkboxes or status fields.
3. A31 updates project trackers to show "decision packet ready" without marking APK publication complete.
4. A31 explicitly recommends no external/public APK publication until distribution target, signing mode, and accessibility residual-risk decision are approved.
5. A31 validation confirms no forbidden binary/heavy/secret artifacts are staged.

## Out Of Scope

- Building a new APK.
- Signing a release APK or AAB.
- Uploading to Google Play, GitHub Releases, private storage, or any external channel.
- Changing Android source code, versionName, versionCode, or signing config.
- Performing a new TalkBack spoken audit.
- Deploying web production.
- Pushing the branch or opening a PR.

## No-Go Conditions

- A31 claims APK publication is complete.
- A31 treats the debug APK as a signed production release without explicit owner approval.
- A31 closes the TalkBack spoken gate without human-heard/audio-video evidence.
- A31 stages root `RUNNING_LOG.md`, APKs, AABs, keystores, DBs, `.env`, raw logs, raw screenshots/XML, `assets/`, or `data/artifacts/`.
- A31 overwrites existing running-log entries instead of appending.
