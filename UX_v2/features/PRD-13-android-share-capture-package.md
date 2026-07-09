# PRD-13 Android Share Capture Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only, depends on PRD-06-FU
Feature classification: Partial/Missing
Primary paths: `android/app/src/main/AndroidManifest.xml`, `src/components/share-handler.tsx`, `src/app/api/capture/*`, `public/offline.html`

## PRD v1

### User Goals

- Share a URL, text, or PDF into AI Memory from Android and get a clear result.
- Understand whether the capture is complete, partial, duplicate, or needs repair.
- Recover from offline/unpaired/server failures without losing trust.

### Scope

- Android share result surface for incoming shared source, processing, success, partial, duplicate, needs upgrade, failed, and offline/unpaired states.
- Uses canonical capture result payload from PRD-06-FU.
- Supports text/plain URLs, plain text notes, single PDF, and multi-PDF handling policy.

### Web UX

Not applicable as a primary surface. Web and extension capture must remain compatible with the shared PRD-06-FU capture result contract, but this PRD targets Android share entry from the system share sheet.

### Android UX

- Show a bottom-sheet or route-based result after share.
- Result includes platform, captured via Android share, quality, and next action.
- Actions: Open item, Add text, Ask, Done, Open existing, Keep both where safe.
- Unpaired state routes to setup with clear copy.
- Offline/server down state shows retry and setup options.

### Interactions And States

- Incoming share received.
- Processing/saving.
- Full capture success.
- Partial or metadata-only capture.
- Duplicate existing item.
- Updated existing item.
- PDF read failure.
- Missing token/unpaired.
- Server unreachable.
- Retry after failure.

### Edge Cases

- Capgo plugin double-fires.
- Missing bearer token.
- PDF URI read fails.
- SHA mismatch.
- Duplicate URL.
- Metadata-only YouTube.
- Multiple PDFs shared.
- Server unreachable after share received.

### Data Needs

- Canonical capture result payload from PRD-06-FU.
- Short-lived client-side share-result state that avoids putting full titles, URLs, or document text in query strings.
- No offline outbox data model for UX v2 unless explicitly approved.

### Analytics / Events

Not applicable by default. If events are approved later, use local-only share result outcome counts and redact titles/URLs/text.

### Non-Goals

- No offline share queue.
- No multi-PDF batch capture unless a new tracked decision is added and approved.
- No native Android UI rewrite outside the existing Capacitor/WebView shell.

### Acceptance Criteria

- No share outcome relies only on `alert()`.
- Duplicate and weak captures show designed actions.
- Failed share logs operational error without hiding user-facing result.
- Offline share does not claim queued save unless outbox exists.

### Open Questions

1. Should multi-PDF share capture all, first only, or reject with explanation?
2. Should offline shares be queued? Current code suggests no outbox exists; default is no.

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-13-android-share-capture-package.md`

### Executive Verdict

Conditional go. The PRD is grounded, but it must explicitly reject offline queueing unless a real outbox is built.

### Findings

P0: No P0 findings found.

P1:

1. Offline behavior could overpromise. Evidence: no `/inbox` or outbox route found. Recommendation: show not saved/retry, not queued.
2. Alerts currently hide state. Recommendation: replace alert-only paths with route state.

P2:

1. Multi-PDF policy unclear. Recommendation: pick first-only with explanation or reject.

### Go / No-Go Recommendation

Go after offline/no-outbox behavior and multi-PDF policy are explicit.

## PRD v2

### Final Product Requirements

1. Android share remains online-only for UX v2.
2. If server is unreachable, show "Not saved yet" with Retry and Re-scan/Pair actions.
3. Multi-PDF default: process first PDF and explain that multiple PDF capture is not yet supported, unless Arun decides otherwise.
4. Use PRD-06-FU canonical result payloads.
5. Replace alert-only success/failure UX with a durable result route or sheet state.
6. Keep double-fire suppression.

## Implementation Plan v1

### Architecture

- Add share result client state store or route like `/capture/share-result`.
- Update `share-handler.tsx` to route with serialized result state.
- Parse canonical capture payloads from API routes.
- Keep operational logging through existing client error route.

### Tests

- Unit tests for share result mapper.
- Manual or Browser mobile smoke for result route.
- Android emulator/device smoke for real share is required. If no emulator/device is available, record the exact blocker and do not claim Android share verification.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional go. Serialized route state may leak too much data in URL.

### Findings

P1:

1. URL query result payload can expose titles/URLs. Recommendation: store minimal state in sessionStorage or server result ID.
2. Share handler runs before full app hydration. Recommendation: make result route robust to early navigation.

P2:

1. Native plugin failures are hard to simulate. Recommendation: keep manual device checklist.

### Go / No-Go Recommendation

Go after v2 avoids sensitive query payloads.

## Implementation Plan v2

### Revised Plan

1. Add `src/lib/capture/share-result-store.ts` using sessionStorage for short-lived result payloads on the client.
2. Add `/capture/share-result` page that reads a result key and renders result states.
3. Route query contains only a random result key and optional fallback state.
4. `share-handler.tsx` writes result payload to sessionStorage after API response, then pushes result route.
5. For failures before sessionStorage is available, route with minimal `status=unpaired|offline|failed`.
6. Do not queue offline shares.

### Required QA

- URL share success.
- URL duplicate.
- Metadata-only YouTube.
- Note share.
- PDF share read failure.
- Missing token/unpaired.
- Server unreachable.

### Implementation Acceptance

- Every share result has a visible, recoverable UI.
- No sensitive full payload is placed in the URL.
- Offline share copy does not claim saved or queued.
