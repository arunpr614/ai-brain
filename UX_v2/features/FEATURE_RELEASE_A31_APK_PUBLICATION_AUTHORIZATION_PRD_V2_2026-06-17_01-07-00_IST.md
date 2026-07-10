# Feature Release A31 - APK Publication Authorization PRD v2

Created: 2026-06-17 01:07:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review closure
Supersedes: `FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_V1_2026-06-17_01-05-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A31_APK_PUBLICATION_AUTHORIZATION_PRD_ADVERSARIAL_REVIEW_2026-06-17_01-06-00_IST.md`
Related gates: A7 release readiness, A12 Android publication gate, A29 native URL-share proof, A30 Android accessibility-order audit

## Objective

Create an owner-ready Android APK publication authorization packet for the current validated debug candidate `1.0.5/code6`, without signing, uploading, publishing, distributing, rebuilding, or deploying anything. A31 converts the remaining human release blockers into explicit default-deny decisions that Arun can approve, reject, or defer.

## Review Closure

| Review finding | V2 resolution |
| --- | --- |
| Artifact path and checksum could be stale | Adds fresh artifact existence, size, SHA-256, and Android version metadata checks as P0. |
| Distribution options lacked risk labels | Adds channel matrix separating no distribution/private sideload from public or store-style distribution. |
| Accessibility acceptance was not channel-scoped | Requires owner acceptance to name the channel/scope it applies to. |
| Rollback/reinstall caveat was missing | Adds install/rollback requirement covering debug signer continuity and uninstall/re-pair fallback. |
| Default state was not explicitly denied | Adds `not_authorized`, `not_selected`, `not_accepted`, and `blocked_until_owner_response` defaults. |
| Push/PR could blur with APK release | Separates repository decision as optional and not equivalent to APK publication. |

## Current Release Facts To Preserve

| Fact | Current state |
| --- | --- |
| Web production | Deployed and smoke-tested; latest production source includes A29 Android capture-source attribution. |
| Android package | `com.arunprakash.brain` |
| Android candidate | `data/artifacts/brain-debug-v1.0.5-code6.apk` |
| Android version metadata | `versionName "1.0.5"`, `versionCode 6` in `android/app/build.gradle` |
| Signing mode currently available | Debug signing through `android/app/debug.keystore`; release signing is not configured as an A31 action. |
| Latest native URL-share evidence | Passed on emulator debug APK after A29 with `capture_source=android`, fixture cleaned. |
| Latest accessibility evidence | A30 passed 10/10 platform AX-order screens with residual risk; true spoken TalkBack was not captured. |
| APK publication authorization | Not authorized. |

## Requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| A31-R1 | Produce a publication authorization packet under `UX_v2/execution/`. | P0 | Packet lists artifact identity, fresh SHA-256, size, validation coverage, blockers, owner decisions, and no-go conditions. |
| A31-R2 | Keep A31 strictly non-mutating. | P0 | No signing, upload, publish, deploy, artifact rebuild, version bump, production data mutation, or APK distribution occurs. |
| A31-R3 | Verify current artifact identity during A31 execution. | P0 | `data/artifacts/brain-debug-v1.0.5-code6.apk` exists; SHA-256 and size are recomputed; `build.gradle` still reports `versionName "1.0.5"` and `versionCode 6`. |
| A31-R4 | Separate validated debug candidate from publishable release artifact. | P0 | Packet states the current candidate is debug-signed and not a public release artifact unless Arun explicitly approves debug distribution risk for a named channel. |
| A31-R5 | Present exact default-deny owner decisions. | P0 | Packet defaults to `not_authorized`, `not_selected`, `not_accepted`, and `blocked_until_owner_response` until Arun responds. |
| A31-R6 | Include channel-risk matrix. | P0 | Packet differentiates no distribution, private sideload, private storage, GitHub Release, Google Play internal testing, and public distribution. |
| A31-R7 | Make accessibility risk acceptance channel-scoped. | P0 | Packet asks whether A30 residual AX-only risk is accepted, and for which channel/scope. |
| A31-R8 | Include install/reinstall/rollback caveats. | P1 | Packet explains same-signer upgrade behavior, debug keystore continuity, and uninstall/re-pair fallback if signing identity changes. |
| A31-R9 | Update trackers without closing unresolved gates. | P0 | Release packet, delivery tracker, milestone tracker, and PM update show A31 decision packet complete while APK publication authorization remains open. |
| A31-R10 | Append root running log entry. | P1 | Root `RUNNING_LOG.md` receives append-only A31 milestone entry but remains unstaged unless explicitly approved. |
| A31-R11 | Avoid sensitive artifact leakage. | P0 | Tracked A31 docs do not include raw tokens, pairing codes, private item data, raw APK binary, keystores, `.env`, DBs, screenshots, or raw logs. |
| A31-R12 | Keep repository push/PR as optional, separate from APK publication. | P2 | Packet includes a repository lane explicitly marked "not APK distribution." |

## Channel Matrix Required In Packet

| Channel | Default status | A31 recommendation |
| --- | --- | --- |
| No APK distribution | `not_selected` | Safest default until owner responds. |
| Private sideload of current debug APK | `not_authorized` | Possible only if Arun accepts debug signing and A30 residual AX risk for private use. |
| Private storage link | `not_authorized` | Requires named location, access policy, checksum, and owner acceptance of debug distribution risk. |
| GitHub Release or similar durable external release | `blocked_until_owner_response` | Requires explicit owner approval; signed release artifact is recommended over debug APK. |
| Google Play internal testing | `blocked_until_owner_response` | Requires release signing/AAB or Play signing path; not satisfied by current debug APK alone. |
| Public/external distribution | `blocked_until_owner_response` | No-go unless signed release artifact, channel, rollback, accessibility decision, and owner approval are all explicit. |

## Owner Decision Fields

The packet must ask Arun to choose:

1. APK publication approval: `not_authorized` by default.
2. Distribution target: `not_selected` by default.
3. Signing mode: current debug APK, signed release APK, AAB/Play signing, or defer.
4. Signing authority/keystore source: existing debug keystore, owner-provided release keystore, Play app signing, or defer.
5. Accessibility decision: accept A30 AX-equivalent residual risk for a named scope, require true spoken TalkBack audit, or block publication.
6. Artifact/version decision: use `1.0.5/code6`, bump Android version before any shared artifact, or defer.
7. Install/rollback decision: approve same-signer upgrade assumptions, require fresh install, require rollback artifact, or defer.
8. Repository decision: push branch, create PR, both, or keep local; this is not APK publication.

## Acceptance Criteria

1. A31 PRD v1, adversarial review, PRD v2, implementation plan v1, plan adversarial review, and plan v2 exist before execution artifacts are written.
2. A31 execution creates an owner-readable publication authorization packet with explicit default-deny status fields.
3. A31 recomputes artifact SHA-256 and size during execution or marks the packet blocked if the artifact is unavailable.
4. A31 updates project trackers to show "decision packet ready" without marking APK publication complete.
5. A31 explicitly recommends no external/public APK publication until distribution target, signing mode, accessibility residual-risk decision, and rollback/install path are approved.
6. A31 validation confirms no forbidden binary/heavy/secret artifacts are staged.

## Out Of Scope

- Building a new APK.
- Signing a release APK or AAB.
- Uploading to Google Play, GitHub Releases, private storage, or any external channel.
- Changing Android source code, versionName, versionCode, or signing config.
- Performing a new TalkBack spoken audit.
- Deploying web production.
- Pushing the branch or opening a PR.

## No-Go Conditions

- The APK artifact is missing or its checksum cannot be recomputed.
- A31 claims APK publication is complete.
- A31 treats the debug APK as a signed production release without explicit owner approval.
- A31 closes the TalkBack spoken gate without human-heard/audio-video evidence.
- A31 marks any default-deny owner decision as approved without Arun's explicit response.
- A31 stages root `RUNNING_LOG.md`, APKs, AABs, keystores, DBs, `.env`, raw logs, raw screenshots/XML, `assets/`, or `data/artifacts/`.
- A31 overwrites existing running-log entries instead of appending.
