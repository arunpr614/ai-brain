# Feature Release A29 - Android Capture Source Attribution PRD v2

Created: 2026-06-17 00:20:00 IST
Owner: Codex
Status: Approved for implementation-plan drafting
Supersedes: `FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_V1_2026-06-17_00-18-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_ADVERSARIAL_REVIEW_2026-06-17_00-19-00_IST.md`

## Revision Summary

PRD v2 incorporates the adversarial review by requiring a small testable helper, URL/note/PDF header coverage, production deployment before native rerun, and explicit preservation of the A28 partial finding.

## Problem

A28 showed the real Android native URL-share path can save a full-text item and show the saved-result UI, but the resulting production row had `capture_source=unknown`. The server already supports `x-brain-capture-source`, and the Android WebView share handler is the missing client-side sender.

## Goal

Ensure Android native share capture requests identify themselves through the existing trusted header contract so production items created by native URL/note/PDF shares are stored with `capture_source=android`.

## Requirements

1. Add a small testable helper that returns the Android capture-source header.
2. Use the helper for JSON URL/note captures.
3. Use the helper for PDF upload captures alongside authorization and checksum headers.
4. Preserve existing content type and authorization behavior.
5. Add focused unit tests for the helper/header behavior.
6. Run typecheck, lint, focused tests, full tests, production build, env check, and build-artifact check.
7. Deploy to production because the APK WebView loads live JS from `https://brain.arunp.in`.
8. After deploy, force-stop/cold-start the Android app through a new native URL-share fixture.
9. Verify the new production row has `capture_source=android`.
10. Clean the fixture and related rows to zero.
11. Record A28 as `user_success_metadata_blocked`, not as a full pass.

## Acceptance Criteria

| Gate | Pass condition |
| --- | --- |
| Header helper | Pure helper returns `x-brain-capture-source: android`. |
| URL/note | JSON capture requests include content type, authorization, and Android capture-source header. |
| PDF | PDF upload includes authorization, checksum, and Android capture-source header. |
| Tests | Focused tests cover the helper or request header construction. |
| Validation | Local validation gates pass before deploy. |
| Deploy | Production deploy succeeds and smoke checks pass. |
| Native rerun | New Android URL share saves full text with `capture_source=android`. |
| Cleanup | Fixture and related rows return to zero. |
| Evidence | A28 partial and A29 fix proof are documented without raw secrets/logs. |

## No-Go Conditions

- Header change breaks auth or content type.
- PDF path remains un-attributed.
- Production deployment fails.
- Native rerun still saves as `unknown`.
- Cleanup fails.
- Excluded artifacts or raw logs are staged.

## Remaining Release Gates After A29

If A29 passes and rerun proof succeeds, remaining gates are APK publication authorization/signing/distribution, TalkBack spoken-order decision, and optional push/PR.
