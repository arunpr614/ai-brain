# Android APK Static Check

Created: 2026-06-14 11:49 IST
Updated: 2026-06-14 13:03 IST
Owner: Codex lead integrator
Scope: Local Android debug build/static APK metadata only

## Summary

The Android debug APK can be built locally when Gradle is run with the installed Java 21 JDK explicitly selected.

This static check is now supplemented by `ANDROID_RUNTIME_CHECK_2026-06-14.md`, created after installing an Android emulator package and Android 36 system image. The APK now also packages Capacitor `server.errorPath: "offline.html"` for the PRD-15 first-launch server-unreachable fallback. Runtime validation remains release-blocked by live web asset staleness and pairing/token access, not by missing emulator tooling.

## Environment Findings

- `android/local.properties` points to `/opt/homebrew/share/android-commandlinetools`.
- `adb` exists at `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`.
- `adb` is not on the default PATH, so plain `adb devices` fails, but the absolute path works.
- `/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices` originally returned no attached devices.
- Installed SDK packages:
  - `build-tools;35.0.0`
  - `build-tools;36.0.0`
  - `platform-tools`
  - `platforms;android-36`
- Later in the same goal pass, `emulator` and `system-images;android-36;google_apis;arm64-v8a` were installed and AVD `Brain_API_36` booted successfully.
- Java 17 is the default JDK.
- Homebrew Java 21 is installed at `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.

## Build Check

Initial direct Gradle attempt:

```sh
./gradlew assembleDebug
```

Result: failed because Gradle could not find a Java 21 toolchain.

Successful direct Gradle build:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug
```

Result: passed.

Output APK:

```text
android/app/build/outputs/apk/debug/brain-debug-v1.0.2-code3.apk
```

Initial SHA-256 before packaged offline-asset sync:

```text
bec5095b60bed064f33a9995757eb1b3a1193aa5c43b9f8655c3a5c84059f4eb
```

Initial size:

```text
4,699,736 bytes
```

After adding Capacitor `server.errorPath`, syncing generated Android assets through the normal `npm run build:apk` pipeline, rewriting local fallback links to return to the live server origin, and rebuilding, the current Gradle output APK is:

```text
SHA-256: 4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245
Size: 7,862,055 bytes
```

The shared artifact was intentionally not overwritten:

```text
Path: data/artifacts/brain-debug-v1.0.2-code3.apk
SHA-256: 6ac0bad378c3b214c1b3d32517be685ed1e079054c41fff371fe65fbc6e1753f
Size: 4,258,136 bytes
```

Packaged Capacitor config includes:

```json
"server": {
  "url": "https://brain.arunp.in",
  "androidScheme": "https",
  "errorPath": "offline.html"
}
```

## Static APK Metadata

`aapt dump badging` shows:

- Package: `com.arunprakash.brain`
- Version code: `3`
- Version name: `1.0.2`
- Compile SDK: `36`
- Min SDK: `24`
- Target SDK: `36`
- Application label: `AI Memory`
- Permissions include:
  - `android.permission.INTERNET`
  - `android.permission.CAMERA`

`output-metadata.json` confirms:

- Application ID: `com.arunprakash.brain`
- Variant: `debug`
- Output file: `brain-debug-v1.0.2-code3.apk`

## Signature Check

Command:

```sh
/opt/homebrew/share/android-commandlinetools/build-tools/36.0.0/apksigner verify --verbose --print-certs android/app/build/outputs/apk/debug/brain-debug-v1.0.2-code3.apk
```

Result:

- Verifies: yes.
- APK Signature Scheme v2: true.
- Signer: `CN=Android Debug, O=Android, C=US`.
- Signer certificate SHA-256: `7d4580091b1c222cc004b6e195b267dcb4ef4ec200e0c803125d2cbc38cda94a`.

## Remaining Android Release Blockers

- Runtime install/open/relaunch validation is partially complete on `emulator-5554`; see `ANDROID_RUNTIME_CHECK_2026-06-14.md`.
- Share intent delivery is validated, but full capture result flow is blocked by missing pairing token and stale live web assets.
- Pairing/token validation is blocked by missing authenticated code-generation path and direct `/setup-apk` Android start landing on live root unlock.
- Android clean first-launch offline fallback now shows the bundled PRD-15 branded fallback in emulator evidence; the post-online cached offline path still needs live/staging asset redeploy and cache-clear retest.
- Launcher label/icon static metadata passes; runtime launcher-grid screenshot remains uncaptured.
- `npm run build:apk` now validates typecheck, Next build, Capacitor sync, and Gradle successfully, then refuses to copy over `data/artifacts/brain-debug-v1.0.2-code3.apk` because that shared same-version artifact already exists.
