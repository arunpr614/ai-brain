# AI Brain Android Private Sideload Notes

Created: 2026-06-17 08:05:00 IST
Scope: private sideload only

## APK

| Field | Value |
| --- | --- |
| APK path | `data/artifacts/brain-debug-v1.0.6-code7.apk` |
| Package | `com.arunprakash.brain` |
| Version | `1.0.6` |
| Version code | `7` |
| Size | `7856713` bytes, approximately 7.5 MiB |
| SHA-256 | `17030972de432b5448a8898a19b1cc06645c24a943e931daa2e7c355f5fb2c37` |
| Signing | Existing debug keystore |
| Distribution | Local/private sideload only |

## Fresh Install

Fresh install removes the existing Android app state. You will need to pair the device again after installing.

```bash
adb uninstall com.arunprakash.brain
adb install data/artifacts/brain-debug-v1.0.6-code7.apk
```

Then open the app and pair it again from the web app's device-pairing screen.

## Verification Done

- Build passed with the normal `npm run build:apk` pipeline.
- APK checksum was computed.
- Gradle output and shared local artifact checksums match.
- Fresh install passed on emulator `Brain_API_36`.
- Installed metadata reported `versionName=1.0.6` and `versionCode=7`.

## Accessibility Decision

A30's Android accessibility evidence is accepted for this private sideload only:

- `platform_ax_equivalent_passed_with_residual_risk`
- not `talkback_spoken_passed`

For public, store, or wider distribution later, run or request a true human-heard/audio-video TalkBack audit unless you explicitly accept the same residual risk for that named channel.

## Important Limits

- This is a debug-signed APK, not a public release APK.
- It was not uploaded or distributed anywhere by Codex.
- It was not submitted to Google Play.
- If Android reports an install/signature mismatch on your device, keep the fresh-install posture: uninstall the old app first, then install this APK and re-pair.
