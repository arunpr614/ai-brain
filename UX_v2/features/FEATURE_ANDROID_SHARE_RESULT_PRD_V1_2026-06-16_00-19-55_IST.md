# Feature PRD v1 - Android Share Result Surface

Created: 2026-06-16 00:19:55 IST
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
Status: Draft for adversarial review. Not approved for implementation yet.

## Source Authority

| Source | Use |
| --- | --- |
| `ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md` | Product source for Android share result states, privacy rules, and Android evidence labels |
| `ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md` | Execution source for Phase 6 Android share result surface |
| `src/components/share-handler.tsx` | Current implementation: native share listener, capture API calls, alert-only failures, item redirect on success |
| `src/lib/capture/result.ts` | Existing capture result payload contract returned by capture APIs |
| Android manifest share filters | Native entry path: text/plain, application/pdf, and SEND_MULTIPLE application/pdf |

## Problem

Android share currently routes success into item detail when possible, but failure and unsupported states still rely on `alert()` calls. Alerts are not durable, are hard to screenshot, lose context after dismissal, and can imply that no route-level recovery exists.

The revised Android PRD requires a durable result state/sheet or route for share outcomes. This feature implements that first Android P0 slice.

## Goals

1. Replace alert-only Android share outcomes with a durable route-level result surface.
2. Preserve existing capture behavior for URL, note, and single-PDF shares.
3. Map API capture results and native/share failures into the PRD-approved state vocabulary.
4. Keep sensitive content out of URLs, logs, and reports.
5. Add deterministic unit coverage for state mapping and expiry behavior.

## Non-Goals

- No QR pairing.
- No offline queue or offline share retry storage.
- No APK publication.
- No native Android rewrite.
- No support for processing multiple PDFs in this slice; multi-PDF shares are rejected with an explicit result state.
- No live production mutation unless later release gates authorize it.

## User Stories

| Priority | Story | Acceptance |
| --- | --- | --- |
| P0 | As Arun, when I share a URL or note from Android and it saves, I can see a durable result with useful next actions. | URL/note success maps to `saved_full`, `saved_limited`, `duplicate_existing`, or `updated_existing` based on API result. |
| P0 | As Arun, when sharing fails because the app is not paired, I see a pairing result instead of a transient alert. | Missing token maps to `missing_token` with Pair Device and Done actions. |
| P0 | As Arun, when a shared PDF cannot be read or uploaded, I get a durable error state with retry guidance. | PDF missing URI/read/upload/checksum failures map to the matching PRD states. |
| P0 | As Arun, when I share unsupported content, the app tells me what to do next. | Empty/no supported payload maps to `unsupported_share`. |
| P0 | As Arun, when multiple PDFs are shared, I am told this revamp supports one PDF at a time. | Multi-PDF share maps to `multi_pdf_rejected`; no file is silently processed. |

## Required State Vocabulary

This feature must support these states:

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

`processing` may be added later only if the UI truly shows an in-progress state. This slice may navigate only after a result exists.

## Result Storage Contract

| Requirement | Rule |
| --- | --- |
| URL shape | Use `/capture/share-result?key=<opaque-key>` |
| Payload storage | Store safe payload in `sessionStorage` |
| Expiry | Payload expires within 30 minutes |
| Missing payload | Show `expired_result` |
| Forbidden in URL | Raw shared URL, note body, PDF name, token, cookie, raw exception, full private content |
| Forbidden in logs | Token, cookie, raw URL, full note body, PDF name, raw exception stack |

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

## UI Requirements

Add a route-level result screen at `/capture/share-result`.

| State group | Copy/action requirements |
| --- | --- |
| Saved states | Show truthful save status, quality if available, Open item when an item id exists, Ask when item id exists and state is eligible, Done |
| Duplicate/updated | Show existing/updated status, Open existing/Open item, Ask if item id exists, Done |
| Missing token | Explain Android app is not paired, Pair Device, Done |
| Unsupported | Explain content was not supported, Capture manually, Done |
| Retryable failure | Explain the save did not happen, Retry if enough safe context exists, Done |
| PDF integrity/read/upload states | Explain PDF could not be saved, Retry, Done |
| Multi-PDF rejected | Explain one PDF at a time, Capture one PDF, Done |
| Expired result | Explain result is no longer available, Library, Capture |

## Implementation Constraints

- Share handler must not call `alert()` for production result states after this slice.
- Share handler must not put sensitive share content in route parameters.
- Share handler must still suppress cold-start double-fire duplicate events.
- Existing item detail capture-state behavior may remain for non-Android web capture result banners.
- API route behavior is not changed by this slice.
- Android native manifest filters are not changed by this slice.

## Validation Requirements

| Gate | Required result |
| --- | --- |
| Pure unit tests | State mapping, sessionStorage key creation, expiry, missing payload, action eligibility |
| Focused browser route test or component test | `/capture/share-result` renders saved, error, missing-token, multi-PDF, and expired states |
| Static scan | No `alert(` remains in `src/components/share-handler.tsx` for share result outcomes |
| Privacy scan | No raw token/Bearer text or raw shared URL in result route DOM for synthetic fixtures |
| Full static gates | `git diff --check`, typecheck, lint, test, build |

## Browser/Android Evidence Labels

Local browser evidence may validate the result route, but final Android completion for native share requires a later APK/device pass labeled:

- `Android native entry path validated`

Until that exists, this feature can be marked "implemented locally; Android runtime validation pending."

## Release Rules

- Do not deploy until this feature passes tests, route screenshots, and a release review.
- Do not claim Android share complete until native share tests prove URL, note, PDF, missing token, unsupported share, server unreachable, PDF failures, duplicate/update, and multi-PDF rejection.
