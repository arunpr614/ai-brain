# Feature Release A25 - Android URL Share Result Honesty Implementation Plan v2

Created: 2026-06-16 23:25 IST
Owner: Codex
Status: Approved for execution
PRD: `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_V2_2026-06-16_23-22-00_IST.md`
Supersedes: `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_IMPLEMENTATION_PLAN_V1_2026-06-16_23-23-00_IST.md`

## Scope

Make Android share-result failures source-honest when AI Memory responds with a typed capture failure before saving anything.

## Code Changes

| File | Required Change |
| --- | --- |
| `src/lib/android-share/result.ts` | Add `url_capture_failed` and `note_capture_failed`; export `mapNonOkCaptureResponseToShareResult(data, sourceKind, now): AndroidShareResultPayload | null`; update actions, retry guidance, state allow-list, and sanitization. |
| `src/components/share-handler.tsx` | On URL/note `!res.ok`, call `mapNonOkCaptureResponseToShareResult()` first; fallback to `mapCaptureFailureToShareResult()` only when helper returns null. |
| `src/app/capture/share-result/share-result-client.tsx` | Add icon, copy, fixture support, and source-kind mapping for the new states. |
| `src/lib/android-share/result.test.ts` | Add tests for typed non-OK URL/note failures, malformed fallback, retry/actions, and redaction. |
| `scripts/ux-v2-browser-android-share-result-payloads.ts` | Add safe fixtures for `url_capture_failed` and `note_capture_failed`. |

## Helper Contract

`mapNonOkCaptureResponseToShareResult(data, sourceKind, now)` must:

- accept only `sourceKind` values `url` and `note`;
- inspect nested `capture_result`;
- return non-null only when `isCaptureResultPayload(capture_result)` is true and `capture_result.state === "failed_without_saved_item"`;
- return `url_capture_failed` for URL and `note_capture_failed` for note;
- set a stable error code from the source-specific state;
- ignore and never store/render raw `capture_result.message`;
- return null for malformed payloads, PDF, unknown source, missing payload, or any saved/duplicate/update state on a non-OK response.

## Execution Steps

1. Edit the typed share-result model and helper.
2. Wire the helper into URL and note non-OK response handling.
3. Add UI copy and fixture coverage.
4. Run focused tests:
   - `npm test -- src/lib/android-share/result.test.ts` if supported by Node's test filter, otherwise full `npm test`.
5. Run full validation:
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
6. Generate or inspect browser fixture output for the new states; if full screenshot automation is not available, document the limitation and use component/unit evidence plus Android runtime screenshot.
7. Commit source only after checks pass.
8. Deploy source to production.
9. Run Android runtime proof against the live WebView:
   - clear logcat;
   - perform a URL share fixture expected to fail capture;
   - capture screenshot and UI XML showing `url_capture_failed` copy;
   - scan logcat for `brain_token`, bearer token, 64-character token, and the fixture URL marker;
   - document that no item should be created for failed capture.
10. Update QA, delivery tracker, milestone tracker, project tracker, and root running log.

## Evidence Rules

- A25 evidence can close only the "URL failure honesty" bug.
- URL-share success remains pending unless a successful save fixture is separately executed and cleaned up.
- TalkBack spoken-order remains pending unless a spoken-order checklist is produced.
- APK publication authorization remains pending until Arun provides target/approval.

## No-Go Gates

- No raw shared URL, token, note body, exception text, cookie, or bearer value in result UI, payload, logs, or committed evidence.
- No deployment if tests/type/lint/build fail.
- No Android publication claim from A25 alone.
