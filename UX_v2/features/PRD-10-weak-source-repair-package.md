# PRD-10 Weak-Source Repair Workflow Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only, blocked until capture result contract and repair decisions are closed
Feature classification: Partial
Primary paths: `src/app/needs-upgrade/page.tsx`, `src/app/items/[id]/page.tsx`, `src/app/api/capture/url/route.ts`, `src/db/items.ts`, enrichment and embedding modules

## PRD v1

### User Goals

- Turn weak captures into reliable saved sources.
- Add transcript, full text, or notes without losing the existing item.
- Know when Ask is now safe to use.

### Scope

- Web repair workflow reachable from Needs Upgrade, item detail, focus mode, and capture result states.
- Android/mobile repair entry points via shared responsive UI and PRD-13 share results.
- Repair actions: add text/transcript, retry capture, open source, mark good enough, delete, and merge/handle duplicate where supported.
- Data reset rules after repair.

### Web UX

- Needs Upgrade row has a primary repair action based on reason.
- Item detail weak-source panel opens repair form or route.
- Repair form supports paste text/transcript, optional title override, source URL retention, preview of changed quality, and confirmation.
- Success state explains what changed and whether item left Needs Upgrade.

### Android UX

- Mobile repair opens as a route or bottom sheet that fits small screens.
- Share result weak state links directly to Add text.
- Android copy must avoid suggesting Ask is reliable before repair finishes.

### Interactions And States

- Add text/transcript.
- Retry extraction.
- Mark good enough.
- Open source.
- Delete.
- Merge duplicate.
- Repair save pending.
- Repair success.
- Repair partial failure.
- Derived-state rebuild queued.

### Edge Cases

- User pastes very short text.
- User repairs a deleted item from stale link.
- Retry capture still returns metadata only.
- Repair succeeds but embeddings fail.
- Existing tags/topics/collections need preservation.
- Existing chunks/citations become stale.

### Data Needs

- Repair transaction updates item body, quality, warnings, extraction metadata, total chars, updated timestamp if available.
- Repair must invalidate or rebuild chunks, FTS, embeddings, summaries, topics, related items, and enrichment/embedding jobs.
- Audit or event log for repair action is useful if already aligned with local ops logging.

### Analytics / Events

Optional local event: repair action chosen, repair outcome, quality before/after. No third-party telemetry.

### Non-Goals

- Transcript provider fallback strategy.
- Full rich text editor.
- Native Android offline repair queue.

### Acceptance Criteria

- Metadata-only item can be upgraded with user text.
- Needs Upgrade count updates after repair.
- Ask warnings and retrieval reflect repaired content.
- Derived state is reset or queued for rebuild.
- Repair tests prove stale chunks are not reused.

### Open Questions

1. Does "mark good enough" remove Needs Upgrade or only mute one warning?
2. Should user-provided transcript be visibly labeled in item detail?
3. Should repair be allowed while offline or only online?

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-10-weak-source-repair-package.md`

### Executive Verdict

Conditional no-go. V1 names repair actions but does not make data invalidation a hard requirement. That is the main failure mode.

### Evidence Inspected

- `src/db/items.ts`
- `src/app/api/capture/url/route.ts`
- `src/app/needs-upgrade/page.tsx`
- `src/app/items/[id]/page.tsx`
- `src/lib/retrieve/index.ts`
- enrichment, chunks, embeddings, and topics source paths from repo inventory

### Findings

P0:

1. Repair can corrupt trust if stale derived data remains. Evidence: `updateItemCaptureContent` updates item fields; PRD v1 does not require chunk/embedding/enrichment reset. Recommendation: make reset transaction mandatory.

P1:

1. "Mark good enough" can hide real quality problems. Recommendation: define it as user acknowledgment with clear scope, not quality upgrade unless content exists.
2. Retry capture can produce same weak result. Recommendation: result state must explain no improvement.

P2:

1. Auditability is weak. Recommendation: log repair before/after quality locally.
2. Android offline repair is out of scope but not explicitly blocked. Recommendation: state online-only unless offline queue is built.

P3:

1. Repair copy should distinguish transcript from article text. Recommendation: store/display user-provided source type if feasible.

### Go / No-Go Recommendation

No-go until PRD v2 makes derived-state reset and "mark good enough" semantics explicit.

## PRD v2

### Final Product Requirements

1. Repair is online-only for UX v2 unless a future offline outbox is built.
2. Add text/transcript creates `user_provided_full_text` quality when text length and validation pass.
3. Retry capture reruns extraction and returns a capture result state; if quality is unchanged, say so.
4. Mark good enough does not turn weak content into full text. It records user acknowledgment and can remove the item from the maintenance queue only if Arun approves that behavior.
5. Repair must preserve tags, collections, source URL, source platform, captured-via, and original capture metadata unless explicitly replaced.
6. Repair must reset or enqueue rebuild for:
   - FTS row
   - chunks
   - vector rows
   - embedding jobs
   - enrichment state
   - summary
   - quotes
   - AI-detected topics
   - related-item cache if any
7. Repair success states must say when reindexing/enrichment is pending.

### Acceptance Criteria

- Repaired item appears as reliable only after content and derived state are updated or queued.
- Needs Upgrade criteria are transparent.
- Ask never cites stale chunks after repair.
- Tests cover before/after body, quality, warning, chunks, embeddings, and queue state.

## Implementation Plan v1

### Architecture

- Add a repair route or component under item detail or Needs Upgrade.
- Add server action/API endpoint to update weak item with user-provided text.
- Add helper `repairItemContent` that wraps item update and derived-state invalidation.
- Reuse capture result state model from PRD-06-FU.

### Affected Modules

- `src/app/needs-upgrade/page.tsx`
- `src/app/items/[id]/page.tsx`
- new `src/app/items/[id]/repair/page.tsx` or modal component
- `src/app/actions.ts` or new repair action file
- `src/db/items.ts`
- chunks/embeddings/enrichment/topic repositories
- tests for DB and repair actions

### Data/API Needs

- Possible migration for repair audit/acknowledgment.
- Derived-state reset helper.
- Optional `repair_events` table if local audit is desired.

### Tests

- DB transaction test for repair.
- Retrieval test proves repaired content is used.
- Needs Upgrade query test before/after.
- UI smoke for Needs Upgrade to repair to item detail.

### Milestones

1. Define derived-state reset helper.
2. Add repair action and tests.
3. Add web repair UI.
4. Add mobile responsive repair path.
5. Wire success states and QA.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional no-go. The plan correctly names reset, but it does not identify the exact repositories/tables or rollback behavior.

### Findings

P0:

1. Transaction boundary is undefined. Recommendation: item update, stale data deletion, and job enqueue must be one transaction or have a recovery strategy.

P1:

1. Topic deletion can remove useful AI topics before re-enrichment succeeds. Recommendation: either mark stale or remove with queued regeneration and visible pending state.
2. Repair form can create low-quality "full text" from tiny input. Recommendation: validate minimum useful length and let user save as note if short.

P2:

1. Merge duplicate is too broad for first slice. Recommendation: defer merge unless duplicate model is ready.
2. Android offline repair should be no-go. Recommendation: route to online-required state.

P3:

1. Add explicit test for preserving tags/collections.

### Go / No-Go Recommendation

Go only after v2 defines transaction boundary, short-text validation, and deferred duplicate merge.

## Implementation Plan v2

### Revised Architecture

1. Create `src/lib/repair/item-repair.ts` with `repairItemWithText(input)`.
2. Transaction does:
   - validate item exists and text is long enough
   - update item body, quality, warning, extraction method/version, total chars
   - delete old chunks and vector rowids for item
   - reset enrichment fields/state to pending or batched
   - delete or mark item topics stale
   - enqueue embedding/enrichment jobs using existing queue helpers
   - preserve tags, collections, source URL, source platform, and captured-via
3. Add optional `repair_events` migration only if audit cannot use existing error/event sink.
4. Build `/items/[id]/repair` as the first web/mobile route. Bottom sheet styling can come later.
5. Defer merge duplicate to a later slice unless PRD-06-FU result contract adds safe merge primitives.
6. Mark-good-enough remains a decision-gated feature; do not implement by default.

### Required Tests

- `repairItemWithText` updates quality and preserves tags/collections.
- Old chunks/vector mappings are removed and replacement jobs are queued.
- Needs Upgrade count decreases only when criteria actually change.
- Ask retrieval no longer returns stale chunks after repair.
- Short repair text is rejected with clear copy.

### Rollout Notes

- Start with add text/transcript and retry capture.
- Leave merge/mark-good-enough behind decisions.
- No production transcript provider changes.

### Implementation Acceptance

- User can repair a weak item end-to-end.
- Data model cannot serve stale citations after repair.
- UI explains pending reindex/enrichment if immediate Ask quality is not ready.
