# Feature Release A28 - Native Android URL Share Success Proof Implementation Plan v1

Created: 2026-06-17 00:11:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_PROOF_PRD_V2_2026-06-17_00-10-00_IST.md`

## Objective

Execute the A28 proof safely and produce auditable evidence that a native Android URL share creates a full-text item in production through the current Android debug APK `1.0.5/code6`.

## Inputs

- Project: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
- ADB: `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`
- Emulator: `/opt/homebrew/share/android-commandlinetools/emulator/emulator`
- AVD: `Brain_API_36`
- APK: `data/artifacts/brain-debug-v1.0.5-code6.apk`
- Package: `com.arunprakash.brain`
- Production app: `https://brain.arunp.in`

## Execution Steps

1. Start or attach Android device.
   - Check `adb devices`.
   - If no device exists, launch `Brain_API_36`.
   - Wait for boot completion and package manager responsiveness.

2. Verify or install APK.
   - Query package identity.
   - If absent/stale, install `data/artifacts/brain-debug-v1.0.5-code6.apk`.
   - Recheck `versionCode=6` and `versionName=1.0.5`.

3. Prepare fixture.
   - Generate timestamped IANA fixture URL.
   - Query production DB for exact source URL count before share.
   - If count is not zero, generate a new fixture.

4. Clear and capture logcat.
   - Clear device logs before share.
   - Do not store raw logs in tracked docs.

5. Send native URL share intent.
   - Use `ACTION_SEND`, MIME `text/plain`, and exact fixture URL.
   - Target `com.arunprakash.brain/.MainActivity`.

6. Wait for result screen.
   - Poll UI until result screen contains saved/failure/missing-token copy.
   - If `missing_token`, run safe pairing flow and repeat with a new fixture.

7. Capture UI evidence.
   - Screenshot.
   - UIAutomator XML.
   - Inspect screenshot manually.
   - Record visible title, quality, and actions in QA Markdown.

8. Verify production item.
   - From host `brain`, query exact fixture row and related rows.
   - Record item id, title, source fields, capture fields, and related counts.

9. Cleanup production.
   - Use `PRAGMA foreign_keys=ON`.
   - Delete exact fixture URL.
   - Verify source URL and related rows are zero immediately and after delay.

10. Scan logs.
    - Dump logcat to a temporary untracked file outside the repo.
    - Produce a redacted summary only.
    - Check for fixture URL, `brain_token`, bearer literal, focused 64-hex values, and raw Capgo share-target payloads.

11. Update documents.
    - Create A28 QA report.
    - Create redacted A28 log-scan summary JSON.
    - Update milestone tracker, delivery gate tracker, release readiness packet, and PM tracker update.
    - Append root running-log entry at milestone.

12. Stage and commit safe artifacts.
    - Stage only A28 docs and tracker updates.
    - Run staged whitespace check.
    - Run staged exclusion scan.
    - Commit if safe.

## Evidence Files To Create

- `UX_v2/execution/UX_V2_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_QA_2026-06-17_00-25-00_IST.md`
- `UX_v2/execution/UX_V2_A28_NATIVE_ANDROID_URL_SHARE_LOG_SCAN_REDACTED_2026-06-17_00-25-00_IST.json`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-17_00-25-00_IST.md`

Screenshots and raw logs may be stored under temporary or ignored evidence paths, but only their redacted summaries should be tracked.

## Validation

- Device state: attached and booted.
- APK identity: `1.0.5/code6`.
- Native result: saved success.
- Production DB: exact fixture full-text item exists, then returns to zero.
- Log scan: no sensitive leakage.
- Staged checks: whitespace and exclusion scan pass.

## Rollback / Cleanup

The only production mutation should be the fixture item and generated related rows. Cleanup deletes the exact fixture item with foreign keys enabled and verifies zero rows. No web deployment or APK publication occurs.
