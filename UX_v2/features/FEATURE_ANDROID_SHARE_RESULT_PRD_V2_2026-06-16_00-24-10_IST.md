# Feature PRD v2 - Android Share Result Surface

Created: 2026-06-16 00:24:10 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Revised after adversarial review. Approved as product source for this slice.

## Source Authority

| Source | Use |
| --- | --- |
| `ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md` | Product source for Android share result states, privacy rules, and Android evidence labels |
| `ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md` | Execution source for Phase 6 Android share result surface |
| `FEATURE_ANDROID_SHARE_RESULT_PRD_ADVERSARIAL_REVIEW_2026-06-16_00-22-00_IST.md` | Review findings resolved by this v2 |
| `src/components/share-handler.tsx` | Current implementation to replace: native share listener, capture API calls, alert-only failures, item redirect on success |
| `src/lib/capture/result.ts` | Existing capture result payload contract returned by capture APIs |
| Android manifest share filters | Native entry path: text/plain, application/pdf, and SEND_MULTIPLE application/pdf |

## Mandatory Pre-Implementation Gate

Before coding this slice, create a scoped Android source/truth artifact:

`UX_v2/execution/ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_<timestamp>.md`

It must record:

- revised Android PRD and plan paths;
- Magic Patterns mobile artifact ID/status from the revised docs, with a note if live recheck is unavailable;
- current share-handler alert branches and line references;
- Android manifest share filters;
- D-decision check: D-007 offline, D-008 QR, D-013 package migration remain excluded; share-result work is web-only Android WebView unless native validation later requires an APK build;
- state-by-state production truth for `MobileShareCapture.tsx` visual intent.

No implementation plan or code may claim the Android share slice is ready without this artifact.

## Problem

Android share currently routes success into item detail when possible, but failure and unsupported states still rely on `alert()` calls. Alerts are not durable, are hard to screenshot, lose context after dismissal, and can imply that no route-level recovery exists.

The revised Android PRD requires a durable result state/sheet or route for share outcomes. This feature implements that first Android P0 slice locally, while final Android completion remains blocked until native share is validated in the APK/device path.

## Goals

1. Replace alert-only Android share outcomes with a durable route-level result surface.
2. Preserve existing capture behavior for URL, note, and single-PDF shares.
3. Map API capture results and native/share failures into the PRD-approved state vocabulary.
4. Keep sensitive content out of URLs, logs, sessionStorage safe payloads, screenshots, and reports.
5. Add deterministic unit coverage for classification, mapping, storage expiry, action eligibility, and log redaction.

## Non-Goals

- No QR pairing.
- No offline queue or offline share retry storage.
- No APK publication.
- No native Android rewrite.
- No support for processing multiple PDFs in this slice; multi-PDF shares are rejected with an explicit result state before any file processing.
- No automatic retry from stored raw share payload. This slice shows recovery guidance instead of storing private content to retry later.
- No live production mutation unless later release gates authorize it.

## Required State Vocabulary

```ts
type AndroidShareResultState =
  | "saved_full"
  | "saved_limited"
  | "duplicate_existing"
  | "updated_existing"
  | "unsupported_share"
  | "missing_token"
  | "server_unreachable"
  | "pdf_missing_uri"
  | "pdf_read_failed"
  | "pdf_checksum_failed"
  | "pdf_upload_failed"
  | "multi_pdf_rejected"
  | "expired_result";
```

`processing` is intentionally excluded from this local slice because the app navigates after a result exists. A later implementation may add `processing` only if the UI truly displays and validates in-progress work.

## State Precedence

Native payload classification must happen before any capture API call.

| Priority | Condition | Result/action |
| --- | --- | --- |
| 1 | `payload.files` has more than one PDF | `multi_pdf_rejected`; do not read or upload any PDF |
| 2 | No bearer token in Capacitor Preferences | `missing_token`; do not call capture APIs |
| 3 | One PDF file without URI | `pdf_missing_uri` |
| 4 | One PDF file with URI | Attempt PDF capture |
| 5 | First text exists and is http/https URL | Attempt URL capture |
| 6 | Joined text body is non-empty | Attempt note capture |
| 7 | Nothing supported remains | `unsupported_share` |

Mixed text plus one PDF follows PDF priority. Mixed text plus multiple PDFs follows `multi_pdf_rejected`.

## Capture Result Mapping

| Input/outcome | Required state |
| --- | --- |
| Capture API returns `capture_result.state=created_full_text` | `saved_full` |
| Capture API returns `capture_result.state=created_transcript` | `saved_full` |
| Capture API returns `capture_result.state=created_preview_only` | `saved_limited` |
| Capture API returns `capture_result.state=created_metadata_only` | `saved_limited` |
| Capture API returns `capture_result.state=created_needs_upgrade` | `saved_limited` |
| Capture API returns `capture_result.state=duplicate_existing` or legacy `duplicate=true` | `duplicate_existing` |
| Capture API returns `capture_result.state=updated_existing` | `updated_existing` |
| Capture API returns `capture_result.state=error_with_saved_item` | `saved_limited` with stable `error_with_saved_item` code |
| Capture API returns `capture_result.state=failed_without_saved_item` | `server_unreachable` or source-specific failure state when no item was saved |
| Capture API success has no safe item id and no known result state | `saved_limited` with no Open item action, or `server_unreachable` if response is malformed enough to be untrustworthy |
| URL/note `fetch` throws or returns network status `0` | `server_unreachable` |
| URL/note non-OK API status | `server_unreachable` with stable error code |
| PDF read throws | `pdf_read_failed` |
| PDF upload `fetch` throws | `pdf_upload_failed` |
| PDF HTTP 422 | `pdf_checksum_failed` |
| PDF non-OK API status other than 422 | `pdf_upload_failed` |

## Result Storage Contract

| Requirement | Rule |
| --- | --- |
| URL shape | Use `/capture/share-result?key=<opaque-key>` |
| Payload storage | Store only safe payload in `sessionStorage` |
| Expiry | Payload expires within 30 minutes |
| Missing payload | Show `expired_result` |
| Forbidden in URL | Raw shared URL, note body, PDF name, token, cookie, raw exception, full private content |
| Forbidden in sessionStorage payload | Raw shared URL, note body, PDF name, token, cookie, raw exception, full private content |
| Forbidden in logs | Token, cookie, raw URL, file URI, PDF name, note body, raw exception stack |

## Safe Payload Shape

```ts
interface AndroidShareResultPayload {
  state: AndroidShareResultState;
  sourceKind: "url" | "note" | "pdf" | "unknown";
  quality?: string;
  itemId?: string;
  existingItemId?: string;
  retryable: boolean;
  createdAt: number;
  expiresAt: number;
  errorCode?: string;
}
```

`retryable` means the user may try the native share again or manually capture. It does not authorize automatic retry from stored private payload.

## UI Requirements

Add a route-level result screen at `/capture/share-result`.

| State | Copy/action requirements |
| --- | --- |
| `saved_full` | Saved successfully; Open item, Ask, Done |
| `saved_limited` | Saved but may need more source text; Add text/Open item if item id exists, Done; no Ask action unless quality is known Ask-eligible |
| `duplicate_existing` | Already saved; Open existing if id exists, Ask if eligible, Done |
| `updated_existing` | Existing item updated; Open item if id exists, Add text if weak, Done |
| `missing_token` | Android app is not paired; Pair Device, Done; no save implied |
| `unsupported_share` | Shared content was unsupported; Capture manually, Done |
| `server_unreachable` | Save did not happen; Try sharing again when online, Done |
| `pdf_missing_uri` | Android did not provide a usable PDF URI; Try sharing again, Done |
| `pdf_read_failed` | PDF could not be read; Try sharing again, Done |
| `pdf_checksum_failed` | PDF upload integrity check failed; Try sharing again, Done |
| `pdf_upload_failed` | PDF upload failed; Try sharing again, Done |
| `multi_pdf_rejected` | Multiple PDFs are not supported; Capture one PDF, Done |
| `expired_result` | Result is no longer available; Library, Capture |

## Implementation Constraints

- Share handler must not call `alert()` for production result states after this slice.
- Share handler must not put sensitive share content in route parameters.
- Share handler must still suppress cold-start double-fire duplicate events.
- Share handler must log only stable sanitized error codes/messages.
- API route behavior is not changed by this slice.
- Android native manifest filters are not changed by this slice.
- Existing item detail capture-state behavior may remain for non-Android web capture result banners, but Android share success should use the share-result route so every native share has durable evidence.

## Testability Contract

Implementation should extract pure helpers so the important behavior does not require a native plugin to test:

| Helper responsibility | Expected coverage |
| --- | --- |
| Share payload classification | multi-PDF, single PDF, missing URI, URL, note, unsupported, mixed payload precedence |
| Capture response mapping | saved full, saved limited, duplicate, updated, malformed success |
| Result payload storage | opaque key, sessionStorage serialization, expiry, missing payload |
| Action eligibility | Ask/Open/Add text/Pair/Capture/Done by state and id availability |
| Error logging sanitizer | no token, URI, URL, file name, note body, or raw exception text |

## Validation Requirements

| Gate | Required result |
| --- | --- |
| Source/truth artifact | `ANDROID_SHARE_RESULT_SOURCE_TRUTH_MATRIX_<timestamp>.md` created before implementation plan v2 is marked executable |
| Pure unit tests | State mapping, classification precedence, storage key creation, expiry, missing payload, action eligibility, log sanitizer |
| Focused browser route/component evidence | `/capture/share-result` renders saved, limited, duplicate, missing-token, server-unreachable, PDF failure, multi-PDF, and expired states |
| Static scan | No `alert(` remains in `src/components/share-handler.tsx` for share result outcomes |
| Privacy scan | No raw token/Bearer text, raw URL, file URI, note body, or PDF name in result route DOM/session payload for synthetic fixtures |
| Full static gates | `git diff --check`, typecheck, lint, test, build |

## Browser/Android Evidence Labels

Local browser evidence may validate the result route, but final Android completion for native share requires a later APK/device pass labeled:

- `Android native entry path validated`

Until that exists, this feature can be marked "implemented locally; Android runtime validation pending."

## Release Rules

- Do not deploy until this feature passes tests, route screenshots, and a release review.
- Do not claim Android share complete until native share tests prove URL, note, PDF, missing token, unsupported share, server unreachable, PDF failures, duplicate/update, and multi-PDF rejection.
- Any raw URI, URL, token, note body, PDF name, raw exception, or cookie in share-result URL, DOM, sessionStorage safe payload, or client-error message blocks release.
- Any alert-only production share outcome blocks release.
- Any multi-PDF path that reads or uploads a file blocks release.
