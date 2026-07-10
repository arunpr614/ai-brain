# PRD-16 APK Build Pipeline Review

Created: 2026-06-14 13:03 IST
Reviewer: Codex lead integrator
Scope: `npm run build:apk` release-gate behavior only
Verdict: APPROVE for local validation behavior; shared artifact publication remains blocked until version/approval decision

## Reviewed Files

- `scripts/build-apk.sh`
- `UX_v2/execution/UX_V2_FINAL_QA_RELEASE_GATE_2026-06-14.md`
- `UX_v2/execution/ANDROID_APK_STATIC_CHECK_2026-06-14.md`

## Review Frame

This review checked whether the normal APK build command can provide useful PRD-16 release-gate evidence without overwriting an existing shared APK artifact or bumping Android version metadata. It intentionally did not approve a same-version artifact overwrite, version bump, production deploy, package-ID change, or signing identity change.

## Findings

### P0

No P0 findings.

### P1

No P1 findings.

### P2

No P2 findings.

### P3

1. Fixed: duplicate-artifact guard ran before Capacitor sync and Gradle.

   Risk: `npm run build:apk` could only report that the shared artifact already existed; it could not prove generated Android assets, Gradle configuration, or the current debug APK output still built through the normal pipeline.

   Resolution: The duplicate-artifact guard now runs at the publication step, after typecheck, Next build, `npx cap sync android`, and Gradle `assembleDebug`.

2. Fixed: `npm run build:apk` did not select the installed Java 21 JDK.

   Risk: The normal build command failed on machines where the default JDK is Java 17 even though OpenJDK 21 is installed.

   Resolution: The script now validates `JAVA_HOME` if present, then searches macOS/Homebrew Java 21 locations and exports a verified Java 21 home before Gradle.

## Data-Safety Review

- No application data schema or runtime storage behavior changed.
- No production data was read or modified.
- `npm run build:apk` still refuses to overwrite `data/artifacts/brain-debug-v1.0.2-code3.apk` unless a version bump or explicit local same-version rebuild flag is used.
- The command refreshed generated Android assets under ignored build/asset paths and refreshed the debug keystore backup as existing script behavior.
- Production DB backup remains mandatory before release.

## Verification

- `bash -n scripts/build-apk.sh` passed.
- `npm run build:apk` ran:
  - Java 21 selected: `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.
  - TypeScript check inside the script passed.
  - `npm run build` passed with the known `unpdf` warning.
  - `npx cap sync android` passed.
  - Gradle `assembleDebug` passed.
  - Publication stopped at the intended duplicate shared-artifact guard.
- Current Gradle output APK: `android/app/build/outputs/apk/debug/brain-debug-v1.0.2-code3.apk`.
- Current Gradle output SHA-256: `4d37853615c3b4aee26ab6827dc884a2a0eef77e2e1a30a4737c945b0b678245`.
- Current Gradle output size: `7,862,055 bytes`.
- Shared artifact was not overwritten:
  - `data/artifacts/brain-debug-v1.0.2-code3.apk`
  - SHA-256: `6ac0bad378c3b214c1b3d32517be685ed1e079054c41fff371fe65fbc6e1753f`
  - Size: `4,258,136 bytes`
- `apksigner verify --verbose --print-certs` passed for the current Gradle output.
- `aapt dump badging` confirms package `com.arunprakash.brain`, version `1.0.2` / code `3`, label `AI Memory`, min SDK `24`, target SDK `36`.
- APK packaged config contains `server.errorPath: "offline.html"`.

## Non-Findings / Deferred Gates

- A new shared APK artifact still requires either a versionName/versionCode bump or explicit same-version rebuild approval.
- Current Gradle output has not been reinstalled on the emulator after this script change; previous emulator runtime evidence remains release-blocked by live web asset staleness and pairing/token access.
- Production/live deploy has not been requested or performed.

## Approval Rationale

The normal APK build command now provides stronger release-gate evidence while preserving the no-overwrite versioning rule. It validates the generated Android assets and Gradle output, then fails at the correct boundary: publishing a same-version shared APK over an existing artifact.
