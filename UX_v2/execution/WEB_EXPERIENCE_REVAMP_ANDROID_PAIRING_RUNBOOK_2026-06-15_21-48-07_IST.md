# Web Experience Revamp Android Pairing Runbook

**Created:** 2026-06-15 21:48:07 IST
**Status:** Phase 1 gate artifact.

## APK Baseline

| Field | Value |
|---|---|
| Package ID | `com.arunprakash.brain` |
| versionName | `1.0.2` |
| versionCode | `3` |
| Existing APK | `data/artifacts/brain-debug-v1.0.2-code3.apk` |
| Publish rule | Do not overwrite same-version APK. Rebuild/publish only with explicit version strategy. |

## Validation Steps

1. Identify emulator or physical device target:
   ```bash
   adb devices
   ```
2. Install APK if needed:
   ```bash
   adb install -r data/artifacts/brain-debug-v1.0.2-code3.apk
   ```
3. Launch app:
   ```bash
   adb shell monkey -p com.arunprakash.brain 1
   ```
4. Confirm the WebView loads the intended local/deployed web assets.
5. In authenticated web browser, open `/settings/device-pairing`.
6. Generate short-lived Android pairing code.
7. Enter code in Android app.
8. Assert successful exchange:
   - Android shows connected/synced state.
   - API token is persisted but never printed raw.
   - Relaunch app and confirm paired state persists.
9. Test invalid code:
   - Android shows invalid/retry state.
   - API response maps to expected 401.
10. Test expired code:
   - Use an expired seeded code or wait documented expiry.
   - API response maps to expected 410.
11. Capture redacted logs:
   ```bash
   adb logcat -d | grep -i "brain\\|capacitor\\|pair" > UX_v2/execution/evidence/android/web-revamp-pairing-logcat-redacted.txt
   ```
12. Cleanup:
   - Delete temporary pairing codes if created locally.
   - Remove smoke-created items if any.
   - Clear app data only when testing fresh install/offline behavior:
     ```bash
     adb shell pm clear com.arunprakash.brain
     ```

## Evidence Required

- Device/emulator identifier.
- APK path and version.
- Screenshots or window XML with secrets redacted.
- Redacted logcat.
- Pairing code generated state.
- Successful exchange state.
- Relaunch persistence state.
- Invalid code result.
- Expired code result.
- Cleanup proof.

## Claim Rule

Do not claim Android pairing, deployed Android UX, or paired capture success unless this runbook passes on emulator or physical device. If device tooling is unavailable, mark Android validation blocked and avoid Android release claims.
