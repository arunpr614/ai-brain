# UX v2 Project Tracker Update - A28/A29 Native Android URL Share Proof And Attribution Fix

Created: 2026-06-17 00:29:00 IST
Owner: PM sidecar
Status: Native Android URL-share success proven after A29 attribution fix; APK publication still gated

## Summary

A28 used restored Homebrew Android tooling and AVD `Brain_API_36` to run a real native Android URL share on debug APK `1.0.5/code6`. The user-facing result saved successfully, but production metadata showed `capture_source=unknown`. A29 added the missing Android capture-source header for URL/note/PDF native share requests, validated locally, deployed production, reran the native URL-share proof with a new fixture, verified `capture_source=android`, and cleaned the fixture from production.

## Status Matrix

| Gate | Status | Evidence |
| --- | --- | --- |
| A28 PRD cycle | Done | A28 PRD v1, adversarial review, PRD v2 |
| A28 plan cycle | Done | A28 plan v1, adversarial review, plan v2 |
| A28 native URL share | Partial | Saved UI and full-text production item proven, but metadata blocked on `capture_source=unknown`. |
| A28 cleanup/log hygiene | Passed | `UX_V2_A28_NATIVE_ANDROID_URL_SHARE_SUCCESS_QA_2026-06-17_00-29-00_IST.md` |
| A29 PRD cycle | Done | A29 PRD v1, adversarial review, PRD v2 |
| A29 plan cycle | Done | A29 plan v1, adversarial review, plan v2 |
| A29 implementation | Passed | `src/lib/android-share/request.ts`, `src/lib/android-share/request.test.ts`, `src/components/share-handler.tsx` |
| A29 validation | Passed | Focused 3 tests; full suite 567 tests / 79 suites; typecheck, lint, build, env, build-artifacts passed. |
| A29 deploy | Passed | `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh` passed with remote provider checks and health. |
| A29 native URL proof | Passed | Saved UI plus production row `capture_source=android`, `capture_quality=full_text`, `extraction_method=readability`. |
| A29 cleanup/log hygiene | Passed | Immediate and delayed zero-count cleanup; no fixture URL/token/bearer in log scan. |

## Completed

- Found Android tooling under `/opt/homebrew/share/android-commandlinetools`.
- Booted AVD `Brain_API_36` and verified APK `1.0.5/code6`.
- Ran A28 real native URL share and proved saved UI.
- Found A28 metadata blocker: `capture_source=unknown`.
- Added Android capture-source request helpers and tests.
- Deployed A29 source to production.
- Reran native URL share after force-stopping the app.
- Verified production stored the A29 item with `capture_source=android`.
- Cleaned A28 and A29 fixtures with foreign keys enabled and delayed rechecks.
- Shut down the A28/A29-owned emulator session.

## Remaining Gates

1. APK publication authorization and named signing/distribution target remain missing.
2. Full TalkBack spoken-order audit remains uncaptured unless Arun accepts the bounded A12 launch smoke.
3. Optional push/PR decision remains open.
4. Root `RUNNING_LOG.md` remains intentionally unstaged unless a log-only staging decision is made.

## PM Verdict

`native_android_url_share_success` is now proven for the emulator debug APK path after A29. Do not claim Android publication or overall project completion until publication authorization/signing/distribution and TalkBack decision gates are closed.
