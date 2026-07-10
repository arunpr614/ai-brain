# UX v2 Project Tracker Update - A25/A26 Android URL Share and Log Hygiene

Created: 2026-06-16 23:40:00 IST
Owner: PM sidecar
Status: A25 production web deployed; A26 debug APK candidate validated; publication still gated

## Summary

A25 fixed the misleading Android URL-share failure result and deployed that source change to production. A26 then fixed a native log-hygiene issue found during runtime proof by patching the Capgo share-target plugin during APK builds and validating `1.0.5/code6` on the emulator.

## A25/A26 Status Matrix

| Gate | A25 Android URL-share result honesty | A26 Android share-target log hygiene |
| --- | --- | --- |
| PRD cycle | Done through adversarial review and PRD v2 | Done through adversarial review and PRD v2 |
| Implementation-plan cycle | Done through adversarial review and plan v2 | Done through adversarial review and plan v2 |
| Execution | Done in source commit `c17f07a` | Done in APK/build commit `8577751` |
| QA | Passed source tests, browser DOM proof, production smoke, and Android visible failure proof | Passed APK build/install, Android visible failure proof, and redacted log scan |
| Production / publication | Web production deployed with A25 source | Debug APK candidate `1.0.5/code6` validated; not signed/uploaded/published |

## Completed

- Added `url_capture_failed` and `note_capture_failed` result states.
- Mapped URL/note non-OK capture responses to source-specific failure states.
- Verified the Android share-result page shows "Link could not be saved" with `Capture manually` and `Done`.
- Deployed A25 to production and verified public/private smoke plus remote bundle contents.
- Identified raw shared URL logging in the native Capgo share-target plugin during A25 Android runtime proof.
- Added a build-time native patch that replaces raw share payload logging with count-only logging.
- Built and installed Android `1.0.5/code6`; SHA-256 is `e7539f1afb8b730b0c5f5808724d960df20a6db9fadc943b90c73ac9979298b7`.
- Confirmed the A26 redacted log scan contains no fixture URL, `brain_token`, bearer literal, or focused 64-hex values.

## Validation

| Check | Result |
| --- | --- |
| A25 focused tests | Passed, 14/14. |
| A25 full tests | Passed, 564 tests across 78 suites. |
| A25 typecheck/lint/build | Passed; build retains known `unpdf` warning. |
| A25 production deploy | Passed with remote provider checks and live smoke. |
| A26 APK build/install | Passed for `1.0.5/code6`. |
| A26 log scan | Passed: `share_target_count_only=True`, `share_target_raw_payload=False`. |
| Final A26 lint/tests/build:apk | Passed; tests remained 564 across 78 suites. |

## Remaining Gates

1. APK publication authorization and named signing/distribution target.
2. Full TalkBack spoken-order audit, unless Arun explicitly accepts bounded launch smoke.
3. URL-share success decision or deterministic URL success fixture; A25/A26 prove honest failure and log hygiene, not URL success.
4. Optional push/PR decision for branch `codex/ai-brain-ux-v2-execution`.
5. Root `RUNNING_LOG.md` remains intentionally unstaged unless a log-only staging decision is made.

## PM Verdict

A25/A26 reduce the Android release risk materially: the production web app now tells the truth on URL-share failure, and the newest debug APK candidate no longer logs raw shared URLs from the native share target. Do not mark the full project complete until publication and the remaining explicit Android gates are closed.
