# Technical Plan FCP-001 Capture Quality And Repair Center v2

Status: v2 final planning package  
Review addressed: `reviews/FCP001_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md`

## Recommended Architecture

Create a capture application service that owns canonical result DTOs and repair transitions. Current route-specific capture code and Telegram dispatch should call this service instead of each re-implementing duplicate/upgrade/artifact/transcript behavior.

## Likely Affected Modules

- `src/lib/capture/*`
- `src/app/api/capture/url/route.ts`
- `src/app/api/capture/pdf/route.ts`
- `src/app/api/capture/note/route.ts`
- `src/lib/telegram/dispatch.ts`
- `src/components/share-handler.tsx`
- `extension/src/capture.ts`
- `extension/src/background.ts`
- `src/lib/review/attention.ts`
- `src/app/review/*`
- `src/app/items/[id]/*`
- `src/db/items.ts`
- `src/db/capture-artifacts.ts`
- `src/db/transcript-jobs.ts`

## Data Model / Storage

Preferred first migration:

- Add `capture_repair_events` with `id`, `item_id`, `action`, `channel`, `state_before`, `state_after`, `error_code`, `created_at`, `completed_at`.
- Add optional `items.source_health_state` only if computed state becomes too expensive or ambiguous.
- Reuse existing `capture_quality`, `extraction_warning`, `capture_source`, `capture_artifacts`, and `transcript_jobs`.

Derived-state reset transaction:

1. Lock item/update repair event.
2. Update body/metadata/artifacts.
3. Clear stale summary/category/quotes if source body changed.
4. Delete chunks/vector bridge/vector rows for item.
5. Requeue enrichment and embedding according to selected worker mode.
6. Mark item as repair running or complete based on queue state.

## Security And Privacy

- Define a shared `requireAppAuth()` route helper that verifies session HMAC or bearer token as appropriate before new repair APIs.
- Do not log raw body, transcript, selected text, prompt, URL query strings, or bearer tokens.
- Repair diagnostics should expose stable error codes and redacted provider names.

## Dependencies And Blockers

- Decide realtime enrichment vs batch enrichment ownership for repaired items.
- Add deploy check proving migration files are present in standalone artifact.
- Confirm extension and Android test coverage strategy.

## Test Plan

- Unit: result DTO mapping, state computation, repair event reducer.
- DB: derived-state reset removes old chunks/vector rows and requeues jobs.
- API: capture states for full text, duplicate, metadata-only, failed item saved, no item.
- Review UI: row action visibility for each reason.
- Extension: expired token, duplicate, weak save, selected-text success.
- Android: URL share, PDF share, weak YouTube, provider down, offline fallback.

## Rollout

1. Add read-only computed Source Health panel using existing data.
2. Add canonical result DTO to APIs while preserving old consumers.
3. Update web capture and Review.
4. Update extension and Android.
5. Add repair history and derived-state reset.
6. Remove legacy copy once parity tests pass.

## Rollback

Keep existing capture paths functional behind the same APIs. If repair history migration lands, rollback must leave existing capture rows readable and ignore repair events.
