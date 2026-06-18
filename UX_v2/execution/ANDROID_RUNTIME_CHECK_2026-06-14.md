# Android Runtime Check

Created: 2026-06-14 12:12 IST
Updated: 2026-06-14 13:07 IST
Owner: Codex lead integrator
Scope: Android emulator install/open/relaunch/share/offline/pairing evidence for UX v2 release gate

## Summary

Android runtime validation is partially executed on an emulator, the latest local Gradle APK output has been reinstalled and exercised, one PRD-15 offline-before-first-load defect has been fixed locally, and the release verdict remains **no-go**.

The debug APK installs and launches on `emulator-5554`, force-stop relaunch succeeds, and Android delivers `SEND text/plain` share intents to `com.arunprakash.brain/.MainActivity`. The package metadata and launcher label are `AI Memory`. After adding Capacitor `server.errorPath: "offline.html"` and syncing Android assets, clean app data + first launch with no network now shows the bundled branded `AI Memory needs the server` fallback instead of Android WebView's native DNS error page.

However, the Android shell is still a thin WebView pointed at `https://brain.arunp.in`, so online runtime UI and share-handler UI currently come from the live server. Because production/live has not been deployed with UX v2, the emulator still shows stale `AI Brain` / `Brain` copy in online/share flows. The post-online cached offline path also needs a live/staging redeploy and cache-clear retest.

## Runtime Environment

- SDK path: `/opt/homebrew/share/android-commandlinetools`.
- Installed during this pass:
  - `emulator`
  - `system-images;android-36;google_apis;arm64-v8a`
- AVD: `Brain_API_36`.
- Device: `emulator-5554`.
- Target: Google APIs Android 36, `arm64-v8a`.
- Emulator launch mode: headless, no snapshot, no audio, software GPU.
- Boot check: `sys.boot_completed=1`.
- Cleanup: emulator was stopped after validation; `/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices -l` returned no attached devices.

## APK Under Test

Path:

```text
android/app/build/outputs/apk/debug/brain-debug-v1.0.2-code3.apk
```

After adding `server.errorPath`, rewriting the static fallback links for Capacitor's local origin, and running `npx cap sync android`, direct Gradle rebuild passed with:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug
```

Latest runtime-tested APK SHA-256:

```text
4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245
```

Earlier runtime-tested APK SHA-256 before the build-script validation pass:

```text
d360f25735180bcac7ad51180788772438a01a7586a9144ce212878786f98e1e
```

Current size:

```text
7,862,055 bytes
```

Build-system update:

- `android/app/src/main/assets/public/` is ignored/generated Capacitor output.
- The canonical tracked source for the offline copy is `public/offline.html`.
- `npm run build:apk` now runs typecheck, Next build, `npx cap sync android`, and Gradle `assembleDebug` before refusing to overwrite the existing same-version shared artifact.
- Current Gradle output after script validation has SHA-256 `4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245` and size `7,862,055 bytes`.
- The current Gradle output was installed on the emulator after the build-script change and passed install/open/relaunch, text-share intent delivery, and clean first-launch offline fallback checks. Release remains blocked until live/staging and pairing checks are rerun.

Static metadata after rebuild:

- Package: `com.arunprakash.brain`.
- Version: `1.0.2` / code `3`.
- Label: `AI Memory`.
- Min SDK: `24`.
- Target SDK: `36`.
- Permissions: `INTERNET`, `CAMERA`.
- Signature: debug cert verifies with APK Signature Scheme v2.

The APK itself contains the corrected UX v2 offline asset:

- `AI Memory needs the server`
- `Pair device`
- `Cannot reach AI Memory`
- Capacitor config includes `server.errorPath: "offline.html"`.

## Install / Open / Relaunch

Status: **mechanics pass, release blocked by live UI staleness**.

- `adb install -r` succeeded.
- `pm list packages` includes `com.arunprakash.brain`.
- `cmd package resolve-activity` resolves `com.arunprakash.brain/.MainActivity`.
- Cold launch succeeds.
- Relaunch after force-stop succeeds.
- Latest checked APK SHA-256: `4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245`.

Evidence:

- `UX_v2/execution/evidence/android/android-latest-apk-online-launch-2026-06-14.png`
- `UX_v2/execution/evidence/android/android-latest-apk-online-relaunch-2026-06-14.png`
- `UX_v2/execution/evidence/android/android-launch-2026-06-14.png`
- `UX_v2/execution/evidence/android/android-online-after-clean-2026-06-14.png`

Release finding:

- Runtime launch shows live production copy: `Unlock AI Brain`.
- Local source uses UX v2 `AI Memory` copy, so the mismatch is caused by the Android WebView loading current live web assets from `https://brain.arunp.in`.

## Share Intent

Status: **Android intent delivery passes; capture flow blocked by pairing/live staleness**.

Text share command:

```sh
adb shell am start -W -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT https://example.com/ux-v2-online-share -n com.arunprakash.brain/.MainActivity
```

Latest current-APK share command:

```sh
adb shell am start -W -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT https://example.com/ux-v2-latest-apk-share -n com.arunprakash.brain/.MainActivity
```

Result:

- Android starts `com.arunprakash.brain/.MainActivity` successfully.
- Launch state: cold.
- The WebView share handler runs enough to show a not-paired dialog.
- The dialog still says `Brain is not paired yet`, proving this path is also executing stale live web code.

Evidence:

- `UX_v2/execution/evidence/android/android-latest-apk-share-text-2026-06-14.png`
- `UX_v2/execution/evidence/android/android-share-text-online-2026-06-14.png`
- `UX_v2/execution/evidence/android/android-share-text-2026-06-14.png`
- `UX_v2/execution/evidence/android/android-errorpath-share-online-2026-06-14.png`

Remaining blocker:

- Full capture result validation requires a paired device token.
- Pairing requires an authenticated web session/code generation path that was not available in this emulator pass.
- UX v2 share copy/result validation requires deploying updated web assets before retesting.

## Offline

Status: **clean first-launch offline fixed locally; release still blocked by live/cached asset retest**.

Offline network state was validated with no active default network and DNS failure for `brain.arunp.in`.

Findings:

1. Clean app data + first launch while offline now shows the bundled Capacitor `server.errorPath` fallback:
   - `AI Memory needs the server`
   - `There is no offline capture queue in this version`
   - `Cannot reach AI Memory`
   - `Pair device`
   - Latest current-APK evidence: `UX_v2/execution/evidence/android/android-latest-apk-offline-first-launch-2026-06-14.png`
   - Evidence: `UX_v2/execution/evidence/android/android-errorpath-offline-first-launch-2026-06-14.png`
2. In the local Capacitor fallback, `Retry`, `Library`, and `Pair device` resolve back to `https://brain.arunp.in` instead of staying trapped on `https://localhost`.
3. Before the PRD-15 fix, clean first launch while offline showed Android WebView's native error page:
   - `Webpage not available`
   - `net::ERR_NAME_NOT_RESOLVED`
   - Evidence: `UX_v2/execution/evidence/android/android-offline-clean-install-2026-06-14.png`
4. Before live deployment, after one online visit and then offline relaunch, the WebView showed the live app's cached old offline fallback:
   - `Brain is not reachable`
   - `Re-scan QR`
   - Evidence: `UX_v2/execution/evidence/android/android-offline-after-online-visit-2026-06-14.png`
5. The rebuilt APK package contains the corrected UX v2 `offline.html`, but runtime fallback after an online visit must still be retested after updated live/staging web assets are deployed and the cache is cleared.

Release implications:

- Android clean first-launch offline fallback now passes locally for the debug APK.
- Android offline UX v2 still cannot fully pass until updated web/offline assets are deployed to a staging/live target and the emulator is retested after cache clear, online visit, and offline relaunch.

## Pairing / Token

Status: **blocked**.

- `/setup-apk` is a public web path in source.
- Direct Android start with `VIEW https://brain.arunp.in/setup-apk` is accepted by Android but still lands on the live root unlock screen in this package.
- Actual pairing exchange requires a short-lived Android code generated from authenticated web Settings, which was not available during this emulator pass.

Evidence:

- `UX_v2/execution/evidence/android/android-setup-apk-direct-2026-06-14.png`

Remaining blocker:

- Need an authenticated web session/code-generation path, or a staging Android configuration that can exercise `/setup-apk`, then run token save, relaunch, share, and capture checks.

## Launcher Label / Icon

Status: **static pass; runtime launcher grid not captured**.

- `aapt dump badging` reports application label `AI Memory`.
- Launcher activity resolves to `com.arunprakash.brain/.MainActivity`.
- Icon resource resolves to `res/mipmap-anydpi-v26/ic_launcher.xml`.

## Release Verdict

No-go for production/live release.

Open Android release blockers:

- Live Android runtime UI still uses old `AI Brain` / `Brain` copy.
- Post-online offline runtime needs retest after updated live/staging assets are deployed; previous evidence showed old live cached fallback after online visit.
- Pairing/token validation is blocked by missing authenticated code-generation path.
- Full share capture/result validation is blocked by missing pairing token and stale live web assets.
- Scripted shared artifact publication remains blocked by the duplicate `data/artifacts/brain-debug-v1.0.2-code3.apk` guard unless version is bumped or same-version artifact overwrite is explicitly approved. The normal pipeline now validates generated assets and Gradle before stopping at that publication guard.

Production/live remains untouched. Explicit user approval is still required before any production deploy.
