# PRD-06-FU Capture Result States Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only, next candidate only after PRD-11-SHELL verification
Feature classification: Partial
Primary paths: `src/app/capture`, `src/app/capture-actions.ts`, `src/app/api/capture/*`, `src/app/items/[id]/page.tsx`, `src/components/share-handler.tsx`

## PRD v1

### User Goals

- Know exactly what happened after saving a URL, PDF, note, pasted text, or Android share.
- Understand whether the saved item is reliable for reading and Ask.
- Recover quickly from duplicate, partial, metadata-only, updated-existing, or error-with-save outcomes.

### Scope

- Web capture result states for URL, PDF, note, and paste-text-equivalent flows.
- Android/mobile capture result states shown through the shared web app and share-handler flows.
- API response shape that lets clients distinguish `created`, `duplicate`, `updated_existing`, `saved_with_issues`, `metadata_only`, `preview_only`, `error_with_save`, and `failed_without_save`.
- Item detail arrival banners when capture redirects to `/items/[id]`.

### Web UX

- Capture page and item banner must show status, source platform, captured via, quality, and next best action.
- Duplicate candidate must offer Open existing and Save anyway or Keep both where backend permits it.
- Updated existing must clearly say no duplicate was created.
- Error-with-save must say what was saved and what failed.
- Weak outcomes must link to Needs Upgrade or repair flow.

### Android UX

- Mobile capture must use compact result cards with full, partial, metadata-only, duplicate, updated-existing, and saved-with-issues variants.
- Android share must not rely on alerts only; it needs a result screen/sheet or route state shared with PRD-13.
- Capture result copy must say `via Android share` when appropriate.

### Interactions And States

- Full text saved.
- Transcript saved.
- Preview only saved.
- Metadata only saved.
- Duplicate candidate.
- Updated existing.
- Error with save.
- Failed without save.
- Needs upgrade.
- User dismisses result.
- User opens item, asks item, adds text, retries, opens existing, keeps both.

### Edge Cases

- Existing item is weak and incoming user text upgrades it.
- Duplicate exists but client dedup window fires before historical duplicate lookup.
- PDF upload succeeds in transit but extraction fails.
- YouTube metadata saves while transcript fails.
- Share handler receives a file and URL in one payload.
- Client is offline after share received.

### Data Needs

- Stable capture result enum shared across server actions, API routes, item banner, and share handler.
- Source platform and captured-via remain separate.
- Capture quality and extraction warning are present on result payloads.
- Optional existing item ID, updated item ID, source URL, and repair action URL.

### Analytics / Events

Only add events if Arun approves local/private telemetry. If approved, record local operational events: result type, source platform, captured via, repair action clicked, and duplicate action chosen. Do not send third-party analytics.

### Non-Goals

- Full repair implementation; handled by PRD-10.
- Android share result route implementation; detailed in PRD-13.
- Transcript provider fallback.

### Acceptance Criteria

- Each capture entry point can render a specific result state without guessing from URL params alone.
- Duplicate and updated-existing are visibly distinct.
- Error-with-save does not look like total failure.
- Weak saves never show generic success.
- Tests cover capture result mapping for URL/PDF/note and duplicate/updated/error cases.

### Open Questions

1. Should `Save anyway` create a second item for all source types, or only URL captures?
2. Should error-with-save be possible for PDF and note, or only URL/video extraction?
3. Should capture result state persist in DB, or be request/redirect state only?

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-06-FU-capture-result-states-package.md`

### Executive Verdict

Conditional no-go. The PRD names the states, but v1 does not force a single canonical result contract, so implementation could create more decorative UI without reliable API semantics.

### Evidence Inspected

- `src/app/capture/tabs.tsx`
- `src/app/api/capture/url/route.ts`
- `src/app/api/capture/pdf/route.ts`
- `src/app/api/capture/note/route.ts`
- `src/app/items/[id]/page.tsx`
- `src/components/share-handler.tsx`
- `UX_UI_DESIGN_PACKAGE/docs/AI_MEMORY_INTERACTION_AND_STATE_SPEC.md`

### Findings

P0: No P0 findings found.

P1:

1. The result taxonomy can diverge by entry point. Evidence: web form, API routes, item banner, and share handler currently infer state differently. Recommendation: define a shared result type before UI work.
2. Error-with-save lacks data ownership. Evidence: current URL route returns `422` for capture failure; item banner only knows `capture=url|pdf|note`. Recommendation: decide when saved item ID is returned alongside an error.

P2:

1. Duplicate handling is underspecified for PDF/note. Recommendation: explicitly scope duplicate handling by source type.
2. Android share result depends on PRD-13. Recommendation: document the interface between PRD-06-FU and PRD-13.

P3:

1. Analytics language is vague. Recommendation: keep events optional and local-only unless user approves otherwise.

### Missing Validation

- Unit tests for shared result mapping.
- Browser smoke for each state.
- Android share smoke for duplicate and weak captures.

### Go / No-Go Recommendation

No-go for implementation until PRD v2 requires a canonical contract and source-type-specific duplicate behavior.

## PRD v2

### Changes From Review

- Adds a required canonical `CaptureResultState` contract.
- Separates display state from persistence state.
- Makes duplicate and updated-existing source-type rules explicit.
- Defines PRD-13 dependency for Android share presentation.

### Final Product Requirements

1. Create one canonical capture result model used by server actions, API routes, redirect params, item-detail banners, and Android share result surfaces.
2. Required result states:
   - `created_full_text`
   - `created_transcript`
   - `created_preview_only`
   - `created_metadata_only`
   - `created_needs_upgrade`
   - `duplicate_existing`
   - `updated_existing`
   - `error_with_saved_item`
   - `failed_without_saved_item`
3. Required payload fields:
   - `state`
   - `itemId`
   - `existingItemId`
   - `sourcePlatform`
   - `capturedVia`
   - `quality`
   - `warningCode`
   - `recommendedAction`
   - `message`
4. URL captures support `Open existing` and, where safe, `Save again anyway`.
5. PDF and note duplicate handling may remain window-dedup only unless a stable duplicate key exists.
6. Updated-existing applies when an existing weak item receives better user-provided or extracted text.
7. Error-with-save applies when an item is saved but extraction, artifact save, transcript, enrichment enqueue, or post-save processing partially fails.
8. Failed-without-save applies only when no item exists.
9. Android share UI consumes the same payload and is implemented in PRD-13.

### Acceptance Criteria

- Web and Android have the same state vocabulary.
- Item banner copy distinguishes created, updated, duplicate, weak, and error-with-save.
- API tests cover result states and source-type duplicate limits.
- No weak or partial capture shows generic "Saved successfully" copy.

## Implementation Plan v1

### Architecture

- Introduce a shared result mapper in `src/lib/capture/result.ts`.
- Update web server actions and API routes to return or redirect with canonical state.
- Update item detail `CaptureResultBanner` to accept the full state vocabulary.
- Update capture page panels to render inline duplicate/failed states consistently.
- Leave Android share-specific presentation to PRD-13, but ensure payload is ready.

### Affected Modules

- `src/lib/capture/result.ts` new
- `src/app/capture-actions.ts`
- `src/app/capture/tabs.tsx`
- `src/app/api/capture/url/route.ts`
- `src/app/api/capture/pdf/route.ts`
- `src/app/api/capture/note/route.ts`
- `src/app/items/[id]/page.tsx`
- `src/components/share-handler.tsx`
- Tests near capture API and item banner if component tests exist

### Data/API Needs

- No migration unless result state must be persisted.
- API route responses should include canonical state fields.
- Redirects can use compact query params plus server-derived item fields.

### Tests

- Unit tests for result mapper.
- API tests for duplicate URL, upgraded existing URL, failed URL, note dedup, PDF SHA mismatch, and PDF extraction failure.
- Browser smoke for result banners.

### Rollout Notes

- Implement behind no feature flag, but keep old redirects accepted.
- Do not change production backfill or transcript behavior.

### Milestones

1. Shared model and tests.
2. API/server action wiring.
3. Web banner/UI states.
4. Android share payload compatibility.
5. Browser and focused tests.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional go. The plan is directionally safe, but it underplays derived state and redirect compatibility.

### Findings

P0: No P0 findings found.

P1:

1. Redirect-only result state can be spoofed or stale. Recommendation: item banner must derive source platform, quality, and warning from DB, not trust query params.
2. Error-with-save needs observability. Recommendation: log error-with-save reason with redacted payload.

P2:

1. Tests are too API-heavy. Recommendation: include UI smoke for mobile and desktop banners.
2. Share handler compatibility is deferred too far. Recommendation: add a typed response parser now.

P3:

1. Old comments mention Brain and can confuse future copy audits. Recommendation: separate user-facing copy from historical comments.

### Missing Validation

- Regression test that weak save shows Needs Upgrade action.
- Test for upgraded existing item redirect.

### Go / No-Go Recommendation

Go only after v2 requires DB-derived banner truth and typed share response parsing.

## Implementation Plan v2

### Revised Plan

1. Add `CaptureResultState` and `CaptureResultPayload` in `src/lib/capture/result.ts`.
2. Add `toCaptureResultPayload(item, context)` that derives trust fields from the saved item, not from query params.
3. Update API routes to return canonical payloads; keep legacy `duplicate` fields temporarily for share handler compatibility.
4. Update `captureUrlAction`, `capturePdfAction`, and `createNoteAction` redirect paths to include only `capture_state` and item ID; banner fetches truth from DB.
5. Update `CaptureResultBanner` to map the full state vocabulary and show source platform, captured via, quality, warning, and action.
6. Add typed response parsing in `share-handler.tsx` without building the PRD-13 result UI yet.
7. Add structured error logging for `error_with_saved_item`.

### Required Tests

- `src/lib/capture/result.test.ts`
- Existing capture API route tests extended for canonical payloads.
- Item detail smoke for full, metadata-only, duplicate, updated-existing, and error-with-save where feasible.
- Mobile viewport smoke after PRD-13 consumes the payload.

### Rollout / Backward Compatibility

- Existing `/items/[id]?capture=url|pdf|note` keeps working but maps to a default state.
- New `capture_state` is preferred.
- No database migration unless later analytics persist state.

### Implementation Acceptance

- All capture entry points use the same state names.
- UI copy never overstates weak capture quality.
- Share handler can understand new payloads even before the share result page is built.
