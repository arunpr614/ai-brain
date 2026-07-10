# UX v2 A12 Android Publication Gate QA

Created: 2026-06-16 18:59 IST
Branch: `codex/ai-brain-ux-v2-execution`
HEAD at start of A12 execution: `37c82857a3630fabba0e527d75b038a7d6d9f8f0`
Verdict: `android_candidate_advanced_publication_still_gated`

## Summary

A12 moved Android runtime evidence materially forward and produced a new APK candidate after finding and fixing a token-log hygiene issue.

The prior `1.0.3/code4` APK candidate is superseded for publication review by `1.0.4/code5` because A12 changed `capacitor.config.ts` to disable Capacitor bridge logging and bumped `android/app/build.gradle`.

APK publication is still not marked complete because final ownership/commit review and explicit publication authorization remain open. TalkBack evidence is a bounded launch smoke, not a full spoken-order audit.

## Build And Install

| Check | Result | Evidence |
| --- | --- | --- |
| APK version | Passed | `versionName=1.0.4`, `versionCode=5` in `android/app/build.gradle` and installed package report |
| Build pipeline | Passed | `npm run build:apk` completed typecheck/build, Capacitor sync, Gradle assemble, and artifact copy |
| APK artifact identity | Passed | `data/artifacts/brain-debug-v1.0.4-code5.apk` and Gradle output both SHA-256 `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7` |
| Emulator install | Passed | `adb install -r data/artifacts/brain-debug-v1.0.4-code5.apk` succeeded |
| Installed metadata | Passed | `a12-v104-installed-package.txt`: `versionCode=5`, `versionName=1.0.4`, `lastUpdateTime=2026-06-16 18:45:12` |

## Evidence Directory

All screenshots/manifests are under:

`UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a12/`

## Runtime Matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| Locked-shell privacy | Passed | `locked-launch.png`, `window-locked.xml`; no private counts/items visible while locked |
| Authenticated Library route | Passed | `a12-30day-session-library.png`, `a12-v104-online-recovery-after-offline.png` |
| Authenticated Ask route | Passed | `a12-route-ask-coordinate-corrected.png`; keyboard opens on composer as expected |
| Authenticated Capture route | Passed | `a12-route-capture-from-library-button.png`; URL field auto-focuses and opens keyboard |
| Authenticated More route | Passed | `a12-route-more-coordinate-corrected.png` |
| Item detail route | Passed | `a12-route-item-detail.png` |
| Session persistence after restart | Passed with test-harness caveat | `a12-session-persistence-after-force-stop.png`; session was seeded into debug WebView cookie store using production signing key, not typed PIN |
| Pairing-token runtime | Passed | Pairing code exchange stored a 64-char token; host-side health check returned 200 in `a12-v104-stored-token-health.redacted.txt` |
| Native share receiver before pairing | Passed | `a12-native-share-text-intent-2.png` showed expected "Pair this Android app" guard |
| Native share after pairing | Passed for note path | `a12-v104-native-share-note-fixture-result-2.png` showed "Saved to AI Memory" |
| Native share mutation cleanup | Passed | `a12-v104-native-share-note-fixture-cleanup-manifest-2.txt`: one fixture note was created and deleted back to zero by unique marker |
| URL share path | Partial | `a12-v104-share-after-logging-fix.png` shows URL fixture reached paired flow but `example.com` capture failed with "Could not reach AI Memory"; host health for the stored token passed, so note-share is the stronger native-share proof |
| Offline fallback | Passed | `a12-v104-offline-cold-launch.png` shows branded fallback and no offline queue overclaim |
| Online recovery after offline | Passed | `a12-v104-online-recovery-after-offline.png` returns to Library after connectivity restore and relaunch |
| Keyboard smoke | Passed | PIN, Ask, and Capture screenshots show expected Android keyboard behavior and no visible overlap that blocks primary actions |
| TalkBack smoke | Partial | `a12-v104-talkback-smoke-manifest.txt`, `a12-v104-talkback-enabled-launch.png`; TalkBack was enabled for launch and restored, but no spoken-order capture was available |

## Fix Applied During A12

Finding: Capacitor bridge debug logging exposed the pairing token in Android logcat when Preferences `set/get` carried `brain_token`.

Fix:

- Added `loggingBehavior: "none"` to `capacitor.config.ts`.
- Bumped Android candidate to `1.0.4/code5`.
- Rebuilt and installed the new APK.

Verification:

- Cleared logcat, installed `1.0.4/code5`, reran paired share.
- `a12-v104-log-token-scan.PASS.txt` found no `brain_token`, no 64-hex token, and no Capacitor method-data token pattern in the fresh post-fix logcat.

## Production Mutation Cleanup

The successful native share proof used marker `A12_SHARE_NOTE_FIXTURE_20260616_1849_IST`.

Cleanup evidence:

- Before count: `0`
- Matched count after share: `1`
- After cleanup count: `0`
- Cleanup method: `PRAGMA foreign_keys=ON; DELETE FROM items WHERE title/body match unique marker`

## Release Verdict

A12 clears the biggest Android runtime evidence gaps for authenticated routes, pairing, native note share, offline fallback/recovery, keyboard smoke, APK identity, and secret-log hygiene.

Do not mark the overall UX v2 goal complete yet. Remaining gates:

1. Final release ownership/commit review for the broad dirty worktree.
2. Explicit APK publication authorization and distribution decision.
3. Full TalkBack spoken-order audit if required for publication, beyond the bounded launch smoke.
4. Decide whether URL-share capture failure on `example.com` is acceptable as a fixture limitation or needs a dedicated URL fixture.
