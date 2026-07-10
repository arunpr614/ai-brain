# Feature Release A25 - Android URL Share Result Honesty Implementation Plan v1

Created: 2026-06-16 23:23 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_V2_2026-06-16_23-22-00_IST.md`

## Scope

Fix Android share-result mapping so typed non-OK capture failures do not masquerade as server connectivity failures.

## Files Expected To Change

| File | Change |
| --- | --- |
| `src/lib/android-share/result.ts` | Add `url_capture_failed` and `note_capture_failed`; add source-specific failure mapping helper for typed capture responses; update actions/retry/state sanitization. |
| `src/components/share-handler.tsx` | On URL/note non-OK responses, map typed `capture_result` before falling back to generic failure. |
| `src/app/capture/share-result/share-result-client.tsx` | Add icons/copy/fixture support for new states. |
| `src/lib/android-share/result.test.ts` | Add mapping/action/redaction tests. |
| `scripts/ux-v2-browser-android-share-result-payloads.ts` | Add safe fixtures for new states. |
| `UX_v2/execution/*` | Add A25 QA/evidence report. |
| `UX_v2/project_management/*` and trackers | Record milestone, status, and remaining gates. |
| `RUNNING_LOG.md` | Append milestone only; do not stage unless explicitly approved. |

## Implementation Steps

1. Extend the state model:
   - add `url_capture_failed` and `note_capture_failed`;
   - include both in the runtime state allow-list;
   - mark both retry-guidance states;
   - return `capture` and `done` actions.
2. Add a typed response helper:
   - map valid `capture_result.state=failed_without_saved_item` for URL/note into the new states;
   - preserve existing mappings for success responses;
   - keep malformed non-OK response fallback as `server_unreachable`.
3. Update the share handler:
   - on `!res.ok`, call the typed response helper first;
   - only call `mapCaptureFailureToShareResult()` if no typed failure payload exists;
   - continue sanitized client-error logging.
4. Update UI copy:
   - URL failure title/body: link could not be saved; try manual capture or another source;
   - note failure title/body: note could not be saved; try capture manually;
   - never render API `message`.
5. Update tests and fixture generation.
6. Run validation:
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
7. Deploy source to production only after validation passes.
8. Run Android runtime proof:
   - use the paired emulator and installed APK WebView;
   - perform a URL share that deterministically fails capture;
   - capture screenshot/XML of new state;
   - scan logcat for token leakage;
   - document no-mutation or cleanup proof.

## No-Go Gates

- Any raw URL, token, note body, or exception text in stored payload or UI blocks release.
- Any regression in existing share-result states blocks release.
- A25 cannot close URL-share success unless a successful save fixture passes separately.
- APK publication cannot proceed without explicit user authorization.
