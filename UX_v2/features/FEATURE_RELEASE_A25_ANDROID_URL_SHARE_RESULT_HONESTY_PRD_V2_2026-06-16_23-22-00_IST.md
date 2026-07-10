# Feature Release A25 - Android URL Share Result Honesty PRD v2

Created: 2026-06-16 23:22 IST
Owner: Codex
Status: Approved for implementation planning
Related gate: A12 Android publication gate
Supersedes: `FEATURE_RELEASE_A25_ANDROID_URL_SHARE_RESULT_HONESTY_PRD_V1_2026-06-16_23-20-00_IST.md`

## Decision Summary

A25 fixes one concrete Android share-result honesty bug: when a paired Android URL share reaches AI Memory but capture fails before saving anything, the app must show a URL capture failure, not a server-unreachable failure.

A25 does not by itself prove successful URL-share saving. The URL-share success gate remains open unless a deterministic successful URL-save fixture is executed and cleaned up.

## Problem

A12 URL-share evidence used `https://example.com`. The Android app reached the paired share-result flow, but the user saw "Could not reach AI Memory." Host token health passed, so this was not proven as a connectivity failure. Source inspection shows the URL capture API can return a typed non-OK response with `capture_result.state=failed_without_saved_item`, while `ShareHandler.captureUrl()` ignores response data on non-OK and falls back to `server_unreachable`.

The product should not tell Arun the server was unreachable when the server responded and the capture extractor could not save the link.

## Goals

1. Add explicit Android share-result states:
   - `url_capture_failed`
   - `note_capture_failed`
2. Map non-OK typed capture responses before generic fallback:
   - `capture_result.state=failed_without_saved_item` + URL source -> `url_capture_failed`
   - `capture_result.state=failed_without_saved_item` + note source -> `note_capture_failed`
3. Keep true connectivity and malformed response failures mapped to `server_unreachable`.
4. Render static, privacy-safe copy for URL/note capture failure.
5. Produce source tests and Android runtime evidence for the URL failure state.
6. Keep URL-share success, TalkBack spoken-order, and APK publication authorization as separately tracked gates.

## Non-Goals

- Do not alter extraction behavior.
- Do not retry capture automatically.
- Do not expose raw API error messages.
- Do not claim URL-share success from a failed fixture.
- Do not publish or distribute an APK.

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A25-F1 | Extend the share result state model with `url_capture_failed` and `note_capture_failed`. | Types, state allow-list, actions, retry guidance, fixture generation, and UI rendering understand both states. |
| A25-F2 | Preserve network fallback semantics. | `fetch` throw, status `0`, malformed JSON, or non-OK response without a typed `capture_result` maps to `server_unreachable` for URL/note. |
| A25-F3 | Parse typed non-OK capture responses. | URL/note handlers inspect `res.data` when `!res.ok`; valid failed capture payloads map to source-specific states. |
| A25-F4 | Keep copy static and safe. | UI copy for new states does not include URL, title, note body, file name, exception message, bearer token, or API `message`. |
| A25-F5 | Keep actions conservative. | New states render `Capture manually` and `Done`; no item-specific action appears without an item id. |
| A25-F6 | Keep payload storage sanitized. | `storeShareResult()` stores only schema-approved fields and stable error codes. |

## Validation Requirements

| ID | Validation | Acceptance |
| --- | --- | --- |
| A25-V1 | Unit tests | Cover URL typed failed capture response, note typed failed capture response, malformed non-OK fallback, action list, retry flag, and redaction. |
| A25-V2 | Type/lint/build | `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass. |
| A25-V3 | Browser fixture | The safe payload generator includes both new states for visual QA. |
| A25-V4 | Android runtime failure proof | A real Android share intent lands on the new URL failure result screen after the web runtime is updated. Screenshot/XML evidence is captured. |
| A25-V5 | No-mutation proof | For a failure fixture, evidence states that no production item was expected or created; if a success fixture is attempted, a unique marker cleanup manifest is mandatory. |
| A25-V6 | Secret scan | Fresh logcat scan for the A25 flow has no `brain_token`, no bearer token, and no 64-character token. |

## Tracker Rules

- A25 can be marked complete when the honest-failure bug is fixed and verified.
- A12 URL-share success remains pending unless a separate successful URL-save fixture passes with cleanup.
- APK publication remains blocked until Arun authorizes the distribution target.
- Full TalkBack spoken-order remains pending unless an audio/manual spoken-order checklist is produced.

## Release And Rollback

This is a web runtime/source change. It requires source deployment to production for users and may use the already-installed APK WebView for runtime proof after deployment. A fresh APK rebuild/install may be used as extra evidence but is not required for the code path itself unless native assets change.

Rollback is the previous deployed source commit. Rollback restores less precise failure copy but does not affect saved data.

## Open Questions

No blocking product questions remain. URL-share success remains a separate evidence task, not an A25 prerequisite.
