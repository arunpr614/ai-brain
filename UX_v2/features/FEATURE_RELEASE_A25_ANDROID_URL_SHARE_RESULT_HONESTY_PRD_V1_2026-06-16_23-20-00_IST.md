# Feature Release A25 - Android URL Share Result Honesty PRD v1

Created: 2026-06-16 23:20 IST
Owner: Codex
Status: Draft for adversarial review
Related gate: A12 Android publication gate

## Problem

A12 proved the authenticated Android note-share path and token health for APK `1.0.4/code5`, but the URL-share fixture using `https://example.com` ended on the Android share-result screen with "Could not reach AI Memory." That copy is too broad for a server-side capture failure: the stored token health check passed, the request reached AI Memory, and the URL extractor returned an unsuccessful capture result.

This matters because Android publication evidence must distinguish three materially different outcomes:

- the app cannot reach the server;
- the server rejects or fails capture before saving anything;
- the server saves full, limited, duplicate, or updated content.

The current result screen collapses URL extraction failure into server unreachable, which weakens the publication evidence and gives Arun the wrong recovery instruction.

## Goals

1. Add a truthful Android URL-share failure result for server-reached-but-not-saved capture failures.
2. Keep network or thrown `fetch` failures mapped to the existing server-unreachable state.
3. Preserve the existing privacy guarantees: no raw URL, note body, token, exception message, file URI, cookie, or bearer value in result URLs, sessionStorage payloads, screenshots, client-error logs, or QA documents.
4. Produce fresh unit and Android runtime evidence that the URL-share failure path is now honest.
5. Keep Android publication status gated until explicit APK publication authorization and distribution target are supplied.

## Non-Goals

- Do not add active offline queueing.
- Do not change URL extraction algorithms or make `example.com` reliably extract.
- Do not introduce QR pairing, package-name migration, analytics, or store publication automation.
- Do not claim full TalkBack spoken-order completion from screenshot-only evidence.
- Do not ship or publish an APK without explicit user authorization.

## Users And Use Cases

| User | Use Case | Needed Outcome |
| --- | --- | --- |
| Arun using Android share | Shares a normal URL while paired | If saved, sees saved/limited/duplicate/update result and next action |
| Arun using Android share | Shares a URL whose content cannot be extracted | Sees that the link could not be saved, not that the server was unreachable |
| Arun using Android share | Shares while offline or server is down | Sees server-unreachable recovery guidance |
| Release owner | Reviews Android publication evidence | Can tell whether URL-share failure was app connectivity or capture limitation |

## Requirements

### Functional

| ID | Requirement | Acceptance |
| --- | --- | --- |
| A25-F1 | Introduce a sanitized URL capture failure result state. | A valid API response with `capture_result.state=failed_without_saved_item` and URL source maps to a new URL-specific failed state, not `server_unreachable`. |
| A25-F2 | Optionally support a note capture failure state with the same model. | If note capture returns a valid failed capture result, it maps to a note-specific failed state; legacy non-OK note responses may still use server-unreachable if no typed result exists. |
| A25-F3 | Keep network failures separate. | `fetch` throw, status `0`, or malformed/no JSON response remains `server_unreachable` for URL/note. |
| A25-F4 | Render recovery copy that matches the state. | URL capture failure says the link could not be saved and suggests manual capture or another source; it must not say the server could not be reached. |
| A25-F5 | Keep result actions conservative. | Failed URL/note capture states offer `Capture manually` and `Done`, with no `Open item` or `Ask` action. |
| A25-F6 | Preserve payload privacy. | Stored payload includes only state, source kind, retry flag, timestamps, optional item ids, optional quality, and stable error code. |

### Validation

| ID | Validation | Acceptance |
| --- | --- | --- |
| A25-V1 | Unit mapping tests | Tests cover URL failed capture result, note failed capture result, server/network failure, malformed non-OK response, state actions, and storage redaction. |
| A25-V2 | Browser result fixture | Safe fixture payloads include the new URL failure state for browser screenshot/report generation. |
| A25-V3 | Android runtime proof | Rebuilt APK installed on emulator; URL share to a deterministic failure fixture lands on the new honest result screen. |
| A25-V4 | Secret scan | Fresh Android logcat scan shows no `brain_token`, no 64-char token, no bearer token, and no shared raw URL in sanitized client-error log lines produced by this flow. |
| A25-V5 | Regression suite | `npm test`, `npm run typecheck`, `npm run lint`, and production build pass before release-source commit. |

## Success Metrics

- Android URL-share failure evidence changes from "Could not reach AI Memory" to a state that says the link was not saved.
- No increase in raw private data stored or logged by the share-result surface.
- Existing saved, limited, duplicate, updated, PDF, missing-token, unsupported, and expired states remain behaviorally unchanged.

## Dependencies

- Existing Android share-result state machine in `src/lib/android-share/result.ts`.
- Existing result route in `src/app/capture/share-result/*`.
- Existing Android share handler in `src/components/share-handler.tsx`.
- A12 APK/token runtime evidence and emulator setup.

## Release And Rollback

- Release requires a new source commit and fresh deployment evidence if code changes are made.
- APK publication remains gated until the user authorizes a distribution target.
- Rollback is the previous deployed source commit plus APK `1.0.4/code5`; rollback restores the broader but less precise `server_unreachable` result.

## Open Questions

1. Should the URL failure state name be URL-specific (`url_capture_failed`) or source-neutral (`capture_failed`)?
2. Should note capture get a parallel state now, even though A12 note sharing passed?
3. Is the A25 Android runtime proof enough to close the URL-share fixture decision, or should a successful URL-save fixture also be required?
