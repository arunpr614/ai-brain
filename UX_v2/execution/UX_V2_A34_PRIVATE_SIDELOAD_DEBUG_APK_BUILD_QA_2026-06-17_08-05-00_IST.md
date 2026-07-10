# UX v2 A34 Private Sideload Debug APK Build QA

Created: 2026-06-17 08:05:00 IST
Owner: Codex
Status: `private_sideload_debug_apk_ready`
Scope: private debug APK build only. No public distribution, upload, release signing, Play submission, PR, or production web deploy.

## Owner Decision Implemented

| Decision | A34 implementation |
| --- | --- |
| APK publication approval | Approved for building a new debug APK artifact only. |
| Distribution target | No hosted/external distribution; local private sideload by Arun. |
| Signing mode | Debug APK. |
| Signing authority | Existing project debug keystore at `android/app/debug.keystore`. |
| Accessibility decision | A30 AX-equivalent residual risk accepted for private sideload only. This is not `talkback_spoken_passed` and not public/store approval. |
| Artifact/version | Bumped from `1.0.5/code6` to `1.0.6/code7`. |
| Install/rollback posture | Fresh install. |
| Repository action | Commit and push source/docs branch; do not commit/push APK binary. |

## Version Change

| File | Before | After |
| --- | --- | --- |
| `android/app/build.gradle` | `versionName "1.0.5"`, `versionCode 6` | `versionName "1.0.6"`, `versionCode 7` |

## Build Validation

| Check | Result |
| --- | --- |
| Command | `npm run build:apk` |
| Result | Passed |
| Java | `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home` |
| TypeScript preflight | Passed through build script |
| Next production build | Passed |
| Known Next warning | `unpdf` import-meta warning remained non-blocking |
| Share-target privacy patch | Passed; already patched |
| Capacitor sync | Passed |
| Gradle assembleDebug | Passed |
| Gradle warnings | Existing `flatDir` and Gradle 9 deprecation warnings; build exited 0 |

## Artifact Identity

| Check | Result |
| --- | --- |
| Shared local artifact | `data/artifacts/brain-debug-v1.0.6-code7.apk` |
| Gradle output | `android/app/build/outputs/apk/debug/brain-debug-v1.0.6-code7.apk` |
| Package | `com.arunprakash.brain` |
| versionName | `1.0.6` |
| versionCode | `7` |
| Size | `7856713` bytes, approximately 7.5 MiB |
| SHA-256 | `17030972de432b5448a8898a19b1cc06645c24a943e931daa2e7c355f5fb2c37` |
| Gradle/shared checksum match | Passed; both APK paths have the same SHA-256 |
| Git tracking | APK is ignored under `data/artifacts/` and is not staged for commit |

## Fresh Install Validation

| Check | Result |
| --- | --- |
| Emulator | `Brain_API_36` |
| Device | `emulator-5554`, `sdk_gphone64_arm64` |
| Boot | Passed; `sys.boot_completed=1` |
| Fresh uninstall | Passed; `adb uninstall com.arunprakash.brain` returned `Success` |
| Fresh install | Passed; `adb install data/artifacts/brain-debug-v1.0.6-code7.apk` returned `Success` |
| Installed version | `versionCode=7`, `versionName=1.0.6` |
| Install timestamps | `firstInstallTime=2026-06-17 07:51:30`, `lastUpdateTime=2026-06-17 07:51:30` |
| Launch smoke | Inconclusive; Android `monkey` did not focus the app and launcher stayed focused. This does not block A34 because install/version validation is the required private-sideload gate. |
| Emulator cleanup | `adb emu kill` returned OK |

## Post-Build Git Ownership

Post-build tracked changes were inspected. Aside from the intentionally unstaged root running log and unrelated Telegram plan files, the only build/source change before documentation updates was `android/app/build.gradle`. No tracked Capacitor-generated Android config/assets changed after sync.

## Private-Only Accessibility Decision

A34 accepts A30's `platform_ax_equivalent_passed_with_residual_risk` evidence for this private sideload artifact only. This decision does not claim true spoken TalkBack success, does not authorize public distribution, and does not replace a future human-heard/audio-video TalkBack audit if a public/store-style channel is later selected.

## Non-Actions

A34 did not:

- create a signed release APK;
- create an AAB;
- upload the APK anywhere;
- publish to Google Play, GitHub Releases, private storage, or any external channel;
- deploy web production;
- mutate Magic Patterns;
- create a PR;
- stage the APK binary, keystore, DB, `.env`, raw logs, or root `RUNNING_LOG.md`.

## Verdict

The A34 private-sideload debug APK is ready locally:

`data/artifacts/brain-debug-v1.0.6-code7.apk`

Use the companion install notes:

`UX_v2/execution/UX_V2_A34_PRIVATE_SIDELOAD_APK_INSTALL_NOTES_2026-06-17_08-05-00_IST.md`
