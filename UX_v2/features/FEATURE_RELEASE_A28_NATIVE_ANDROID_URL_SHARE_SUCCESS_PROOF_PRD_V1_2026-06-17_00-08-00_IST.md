# Feature Release A28 - Native Android URL Share Success Proof PRD v1

Created: 2026-06-17 00:08:00 IST
Owner: Codex
Status: Draft for adversarial review
Related blocker: `native_android_url_share_success_not_proven`

## Background

A27 proved that production `/api/capture/url` can save a deterministic IANA URL fixture as `created_full_text` with `capturedVia=android`, and then clean the fixture from production. A27 did not prove that the actual Android share-intent path can receive a URL, classify it as a URL, use the paired Android token, post to production, store the share result in the Android WebView, and show the user a truthful saved-result screen.

The previous A27 environment note said Android tooling was unavailable. A fresh check on 2026-06-17 found the Android command line tools under Homebrew:

- `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`
- `/opt/homebrew/share/android-commandlinetools/emulator/emulator`
- AVD: `Brain_API_36`

## Goal

Prove or fail the real native Android URL-share success path for the current Android debug candidate `1.0.5/code6` without publishing the APK.

The proof must show all of the following in the same run:

1. The installed Android app is `com.arunprakash.brain` at `versionName=1.0.5` and `versionCode=6`.
2. A real Android `ACTION_SEND` `text/plain` intent reaches the app with a unique URL fixture.
3. The app uses the native share handler and reaches production through the live `https://brain.arunp.in` WebView build.
4. The user-facing result screen reports a saved URL result, not a missing-token, unsupported, generic server-unreachable, capture-failed, or duplicate-only state.
5. Production contains exactly one matching item for the fixture after capture, with URL/source fields consistent with Android URL capture.
6. The fixture and related production rows are cleaned up with foreign keys enabled and verified at zero afterward.
7. Device logs are scanned for raw fixture URL, `brain_token`, bearer literals, and token-shaped values; tracked evidence contains only redacted summaries.

## Non-Goals

- Do not publish, sign, upload, or distribute the APK.
- Do not deploy web source unless the proof exposes a source blocker that requires a separate governed fix slice.
- Do not claim full TalkBack spoken-order completion.
- Do not rewrite or stage root `RUNNING_LOG.md`.
- Do not stage APK binaries, raw logcat output, SQLite databases, secrets, `.env`, keystores, `assets/`, or `data/artifacts/`.

## User Experience Requirement

The Android result screen must show saved success copy equivalent to:

- Title: `Saved to AI Memory`
- Quality pill: `full text` or equivalent `full_text`
- Primary action: `Open item`
- Secondary action: `Ask`

If the run shows `Pair device`, `Link could not be saved`, `Could not reach AI Memory`, `Share result expired`, or `Already saved`, the native success gate remains open unless the run is repeated with a valid unique fixture and succeeds.

## Functional Requirements

### A28-FR1 Android Tooling

Use absolute Android tool paths discovered under `/opt/homebrew/share/android-commandlinetools`. Do not rely on shell `PATH`.

### A28-FR2 Emulator Or Device Readiness

Use the existing AVD `Brain_API_36` if no physical Android device is already attached. The emulator must boot to a responsive state before installing or sharing.

### A28-FR3 APK Identity

Verify the installed package identity before the share proof:

- package: `com.arunprakash.brain`
- `versionName=1.0.5`
- `versionCode=6`

If the package is absent or stale, install `data/artifacts/brain-debug-v1.0.5-code6.apk` and recheck identity.

### A28-FR4 Pairing State

Before counting a URL-share result, verify that the app is paired or that the share run reaches a saved result. If the share result is `missing_token`, run the existing pairing flow documented by prior A12 evidence without printing or persisting tokens, then repeat the URL-share proof with a new fixture.

### A28-FR5 Unique Fixture

Use a unique URL fixture that has not been captured before, such as:

`https://www.iana.org/help/example-domains?ai_brain_qa=a28-<timestamp>`

The fixture must be unique enough that a duplicate result cannot masquerade as native success.

### A28-FR6 Native Share Intent

Trigger Android with a real `ACTION_SEND` `text/plain` intent targeted to `com.arunprakash.brain/.MainActivity`.

### A28-FR7 Result Screen Evidence

Capture at least:

- Android screenshot of the share result screen.
- UIAutomator XML dump of the result screen.
- Redacted evidence summary listing visible state/title/actions.

Raw screenshots may stay untracked if they contain no sensitive data, but the QA report must describe where they were stored and what was inspected.

### A28-FR8 Production DB Verification

Verify production DB state after capture from host `brain` without printing tokens:

- exactly one item for the exact fixture URL;
- source type `url`;
- capture source consistent with Android;
- source platform expected for the IANA page;
- capture quality `full_text`;
- extraction method `readability`;
- related rows recorded before cleanup.

### A28-FR9 Production Cleanup

Delete only the exact fixture URL with `PRAGMA foreign_keys=ON`, then verify immediate and delayed zero counts for the fixture and related rows.

### A28-FR10 Privacy And Evidence Hygiene

Device logs must be redacted or summarized before any tracked artifact is written. The raw logcat file must not be staged. The tracked QA report must state whether the scan found:

- fixture URL;
- `brain_token`;
- bearer literal;
- focused token-shaped 64-hex values;
- raw Capgo share-target payloads.

## Acceptance Criteria

| Gate | Pass condition |
| --- | --- |
| PRD cycle | PRD v1, adversarial review, and PRD v2 exist before execution. |
| Plan cycle | Implementation plan v1, adversarial review, and plan v2 exist before execution. |
| Tooling | ADB/emulator paths and AVD/device readiness are recorded. |
| APK identity | Installed package is `1.0.5/code6`. |
| Native share | A real Android share intent is sent to the app with a unique URL fixture. |
| Result UI | Screenshot/XML show saved success, not duplicate or failure. |
| Production item | Exact fixture row exists with full-text Android URL capture metadata. |
| Cleanup | Exact fixture and related rows return to zero after cleanup and delayed recheck. |
| Log hygiene | Redacted log scan finds no token or raw share payload leakage. |
| Tracker | Milestone, delivery, release packet, and PM tracker update distinguish server URL success from native Android URL-share success. |

## No-Go Conditions

- APK identity is not `1.0.5/code6` and cannot be corrected.
- The app is unpaired and pairing cannot be completed without exposing a token.
- The result screen is missing-token, failed, expired, unsupported, or duplicate-only.
- Production DB verification cannot prove the exact fixture row.
- Cleanup verification fails.
- Raw tokens or bearer values appear in tracked evidence.
- Raw logcat, APK binaries, secrets, DB files, or root `RUNNING_LOG.md` are staged.

## Remaining Release Blockers After This Slice

If A28 passes, the remaining known blockers are:

1. APK publication authorization and named signing/distribution target.
2. Full TalkBack spoken-order audit if Arun requires it beyond the bounded A12 launch smoke.
3. Optional push/PR decision.
