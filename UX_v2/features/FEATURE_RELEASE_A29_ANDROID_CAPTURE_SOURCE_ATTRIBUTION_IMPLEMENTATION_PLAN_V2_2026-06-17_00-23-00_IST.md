# Feature Release A29 - Android Capture Source Attribution Implementation Plan v2

Created: 2026-06-17 00:23:00 IST
Owner: Codex
Status: Ready for execution
PRD: `FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_V2_2026-06-17_00-20-00_IST.md`
Supersedes: `FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_IMPLEMENTATION_PLAN_V1_2026-06-17_00-21-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_00-22-00_IST.md`

## Revision Summary

Plan v2 moves the helper into a small non-React module, adds a focused unit test, requires force-stopping the app before postdeploy rerun, and keeps APK publication explicitly closed.

## Implementation Steps

1. Add `src/lib/android-share/request.ts`.
   - Export `androidCaptureSourceHeaders()`.
   - Export helper(s) for merging Android source headers with JSON/PDF request headers if useful.
2. Add `src/lib/android-share/request.test.ts`.
   - Verify Android source header.
   - Verify JSON headers retain `content-type`, `authorization`, and `x-brain-capture-source`.
   - Verify PDF headers retain `authorization`, `x-expected-sha256`, and `x-brain-capture-source`.
3. Update `src/components/share-handler.tsx`.
   - Use JSON helper in `postJson()`.
   - Use PDF helper in PDF upload fetch.
4. Run focused test for the new helper.
5. Run:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run check:env`
   - `npm run check:build-artifacts`
6. Deploy production with provider warn-only flag.
7. After deploy, force-stop Android app.
8. Generate a new unique A29 fixture and pre-share production zero check.
9. Clear logcat and send a cold native Android URL share.
10. Capture result screenshot and UI evidence.
11. Verify production row:
    - exact source URL;
    - `capture_source=android`;
    - `capture_quality=full_text`;
    - `extraction_method=readability`.
12. Cleanup with `PRAGMA foreign_keys=ON`; verify immediate and delayed zero counts.
13. Scan logs and produce redacted summary only.
14. Write A28 partial QA, A29 QA, PM update, tracker updates, and running-log append.
15. Stage only safe docs/source/test files and commit after staged hygiene checks.

## Validation Gates

| Gate | Required evidence |
| --- | --- |
| Header helper | Focused tests pass. |
| Source health | Typecheck, lint, full tests, build, env, build-artifacts pass. |
| Deploy | Production deploy succeeds and smoke passes. |
| Native rerun | New fixture saved through Android share with `capture_source=android`. |
| Cleanup | Immediate and delayed zero counts. |
| Staging | No root log, raw logs, screenshots, APKs, DBs, `.env`, keystores, `assets/`, or `data/artifacts/` staged. |

## No-Go Gates

- Focused helper test fails.
- Full validation fails.
- Deploy fails.
- Postdeploy native rerun still saves `capture_source=unknown`.
- Cleanup fails.
- Evidence hygiene fails.

## Publication Boundary

A29 does not publish, sign, upload, or distribute an APK. If an APK build is run for validation, it remains a local debug artifact and publication stays blocked until explicit authorization.
