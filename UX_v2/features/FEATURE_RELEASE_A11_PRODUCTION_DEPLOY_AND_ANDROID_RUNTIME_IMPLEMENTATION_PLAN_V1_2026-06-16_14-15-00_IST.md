# Feature Release A11 Production Deploy And Android Runtime Implementation Plan V1

Created: 2026-06-16 14:15:00 IST

## Steps

1. Create a production SQLite backup and record integrity, item count, and file size.
2. Build a fresh APK candidate by bumping Android version metadata and running the APK build with scoped Java 21 and Android SDK paths.
3. Deploy web candidate with the repository deploy script.
4. Run postdeploy service, route, provider, and live Ask smoke checks.
5. Install and launch the fresh APK on the available Android emulator.
6. Capture locked-screen Android evidence after clearing app data.
7. Update A7/A10 release packet, milestone tracker, and PM tracker with final status.

## Commands

- `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`
- `npm run build:apk` with scoped `JAVA_HOME`, `ANDROID_HOME`, and Android SDK path.
- `adb install -r data/artifacts/brain-debug-v1.0.3-code4.apk`
- `adb shell am start -n com.arunprakash.brain/.MainActivity`

## No-Go Conditions

- Backup integrity is not `ok`.
- Deploy script fails.
- Remote provider check fails.
- Live Ask returns an error frame or no done frame.
- APK build/install fails.
- Locked Android screen leaks private counts.
- Any docs persist raw secrets or raw Ask answer text.
