# UX v2 A31 APK Publication Authorization Packet

Created: 2026-06-17 01:15:00 IST
Owner: Codex
Status: `apk_publication_authorization_packet_ready`
Publication authorization: `not_authorized`
Recommended release action: do not publish, sign, upload, distribute, or rebuild an APK until Arun responds.

## Executive Summary

The web UX v2 experience is production deployed and smoke-tested. Android debug APK `1.0.5/code6` is the latest validated candidate, with authenticated Android runtime coverage, native URL-share success, Android capture-source attribution, log hygiene, offline/recovery, keyboard smoke, and A30 platform accessibility-order evidence.

A31 does not publish the APK. It makes the remaining owner decisions explicit. APK publication remains blocked until Arun authorizes a distribution target, signing mode, install/rollback posture, and either accepts A30's AX-equivalent accessibility residual risk for a named channel or asks for a true human-heard/audio-video TalkBack audit.

## Fresh Artifact Verification

| Check | Result |
| --- | --- |
| Artifact path | `data/artifacts/brain-debug-v1.0.5-code6.apk` |
| Artifact exists | Yes |
| Size | `7856717` bytes, approximately 7.5 MiB |
| SHA-256 | `e7539f1afb8b730b0c5f5808724d960df20a6db9fadc943b90c73ac9979298b7` |
| Android metadata source | `android/app/build.gradle` |
| `versionName` | `1.0.5` |
| `versionCode` | `6` |
| Package | `com.arunprakash.brain` |
| Current signing class | Debug signing through `android/app/debug.keystore` |
| Release signing config | Not configured or exercised by A31 |
| Verification verdict | `verified_debug_candidate_not_published` |

## Validation Coverage Already Captured

| Area | Current evidence | Status |
| --- | --- | --- |
| Web production | A11/A24/A25/A29 deploy and smoke evidence | Passed |
| Dependency security | A24 local and production audits | Passed |
| Auth/private session hardening | A20/A22 fixes and A23 final review | Passed |
| Android pairing/authenticated routes | A12 Android runtime QA | Passed |
| Native note share | A12 Android runtime QA with cleanup | Passed |
| Offline/recovery | A12 Android runtime QA | Passed |
| Keyboard smoke | A12 Android runtime QA | Passed |
| URL failure honesty | A25 deployed source and Android proof | Passed |
| Share-target log hygiene | A26 native plugin patch and redacted log scan | Passed |
| Server/API URL capture | A27 deterministic production fixture, cleaned | Passed |
| Native Android URL share | A29 cold native share proof with `capture_source=android`, cleaned | Passed for emulator debug APK |
| Android accessibility order | A30 10-screen WebView AX-tree audit | `platform_ax_equivalent_passed_with_residual_risk` |
| True spoken TalkBack | No human-heard/audio-video transcript captured | Not passed |
| APK publication | No explicit owner authorization | Blocked |

## Owner Decision Form

All decision fields below intentionally default to deny or defer.

| Decision | Default | Owner response needed |
| --- | --- | --- |
| APK publication approval | `not_authorized` | Approve, reject, or defer APK distribution. |
| Distribution target | `not_selected` | Choose no distribution, private sideload, private storage, GitHub Release, Google Play internal testing, public distribution, or another named channel. |
| Signing mode | `not_selected` | Choose current debug APK, new signed release APK, AAB/Play signing, or defer. |
| Signing authority | `not_selected` | Choose existing debug keystore, owner-provided release keystore, Play app signing, or defer. |
| Accessibility residual-risk decision | `not_accepted` | Accept A30 AX-equivalent risk for a named channel, require true spoken TalkBack audit, or block publication. |
| Artifact/version decision | `not_selected` | Use `1.0.5/code6`, bump Android version before sharing, or defer. |
| Install/rollback posture | `not_selected` | Approve same-signer upgrade, require fresh install, require rollback artifact, or defer. |
| Repository action | `not_selected` | Push branch, create PR, both, or keep local. This is not APK publication. |

## Channel Risk Matrix

| Channel | Default status | Current recommendation |
| --- | --- | --- |
| No APK distribution | `not_selected` | Safest default until Arun responds. |
| Private sideload of current debug APK | `not_authorized` | Possible only if Arun accepts debug signing, same-signer caveats, and A30 residual AX risk for private use. |
| Private storage link | `not_authorized` | Requires named location, access policy, checksum, and explicit debug-distribution risk acceptance. |
| GitHub Release or durable external release | `blocked_until_owner_response` | Prefer a signed release artifact over debug APK; do not use current debug APK unless explicitly approved. |
| Google Play internal testing | `blocked_until_owner_response` | Requires release signing/AAB or Play signing path; current debug APK alone is not enough. |
| Public/external distribution | `blocked_until_owner_response` | No-go until signing, channel, rollback, accessibility decision, and owner approval are all explicit. |

## Accessibility Decision

A30's verdict is `platform_ax_equivalent_passed_with_residual_risk`.

This means the Android WebView accessibility tree, ordering, labels, and locked-state privacy checks passed for the 10 scoped screens, but no human-heard or audio/video TalkBack spoken transcript was captured. A31 therefore cannot close `talkback_spoken_passed`.

Owner must choose one:

1. Accept A30's AX-equivalent residual risk for a named channel.
2. Require a true human-heard/audio-video TalkBack audit before any APK distribution.
3. Block APK publication.

## Install, Reinstall, And Rollback Notes

- The current APK is debug-signed through the project-local debug keystore flow documented in `README.md` and `scripts/build-apk.sh`.
- Android in-place upgrade requires the new APK to be signed by the same identity as the installed APK.
- If the debug keystore changes or a release keystore is introduced, `adb install -r` may fail with a signer mismatch.
- The fallback for signer mismatch is uninstalling `com.arunprakash.brain`, reinstalling the selected APK, and re-pairing the device.
- A public or durable distribution channel should prefer a deliberate release-signing path and a documented rollback artifact.

## PM Sidecar Integration

Read-only PM sidecar confirmed A31 is the right next management artifact. It also flagged:

- Root `RUNNING_LOG.md` should stay unstaged.
- Existing dirty `ROADMAP_TRACKER.md` is stale and still names an older APK; A31 records this as a follow-up rather than mixing it into the A31 commit.
- Older tracker rows mentioning native URL-share pending are historical; A29/A30 supersede those for emulator debug APK evidence.
- Final blockers remain publication/signing/distribution authorization and accessibility residual-risk decision.

## A31 Verdict

| Gate | Verdict |
| --- | --- |
| Decision packet | `apk_publication_authorization_packet_ready` |
| APK artifact identity | `verified_debug_candidate_not_published` |
| APK publication authorization | `apk_publication_authorization_missing` |
| Accessibility | `platform_ax_equivalent_passed_with_residual_risk` |
| Web production | deployed |
| Android signed/public release | blocked |
| Full active goal completion | not complete |

## No-Go Conditions

- Do not publish, sign, upload, distribute, or rebuild an APK from A31.
- Do not treat `brain-debug-v1.0.5-code6.apk` as a public release artifact unless Arun explicitly approves debug distribution risk for a named channel.
- Do not mark A30 as `talkback_spoken_passed`.
- Do not close APK publication until publication approval, distribution target, signing mode, accessibility decision, and install/rollback posture are all explicit.
- Do not stage root `RUNNING_LOG.md`, APKs, AABs, keystores, DBs, `.env`, raw logs, raw screenshots/XML, `assets/`, or `data/artifacts/`.

## Owner Reply Template

```text
APK publication approval: approve / reject / defer
Distribution target:
Signing mode:
Signing authority:
Accessibility decision:
Artifact/version:
Install/rollback posture:
Repository action:
Notes:
```

## Recommended Next Action

Ask Arun to complete the owner reply template. Until then, keep the release status as `web_production_deployed_a31_android_1_0_5_publication_decision_packet_ready_publication_gated` and do not call the full project complete.
