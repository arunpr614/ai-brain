# PRD-09-FU Ask Context, Scope, And History Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only, decision needed before implementation
Feature classification: Partial/Missing
Primary paths: `src/app/ask`, `src/app/api/ask/route.ts`, `src/lib/retrieve/index.ts`, `src/lib/ask/*`, `src/db/chat.ts`

## PRD v1

### User Goals

- Ask questions against exactly the sources they intend.
- Attach one or more saved items, pasted links, or notes and see that attachments override route scope.
- Restrict Ask to high-quality sources when weak captures would reduce trust.
- Restore past conversations with their original scope, attachments, citations, and warnings.

### Scope

- Effective Ask scope model covering library, item, selected, tag, topic, collection, attached context, and high-quality-only.
- Web UI for attached context or equivalent source picker.
- Android contract required by PRD-12.
- Extended durable history for non-library scopes.

### Web UX

- Scope banner always visible.
- Attached context chips appear above composer.
- When attachments exist, copy says `Using attached context instead of <route scope>`.
- High-quality-only appears as a user-visible scope chip/toggle or warning action.
- History rail restores messages, scope, attachments, citations, warnings, and source counts.

### Android UX

- Android Ask uses the same scope model but presents add context through sheets in PRD-12.
- History is a bottom sheet.
- Empty-send nudges depend on whether attachments exist.

### Interactions And States

- Add saved item.
- Remove attached item.
- Paste link and attach after save.
- Write note and attach after save.
- Toggle high-quality-only.
- Send with empty input.
- Send with attachment but empty question.
- Restore scoped thread.
- Route scope changes while thread is restored.

### Edge Cases

- Attached context contains limited sources.
- Attachments include more than 50 items.
- Attached context is deleted after history restore.
- Tag/topic/collection membership changes after thread creation.
- High-quality-only leaves zero readable sources.
- Provider is offline.

### Data Needs

- Chat threads need more than `library` and `item` scope.
- Messages need citations with quality metadata already partly present.
- Attachments need persisted source references or temporary conversation context.
- Retriever needs filters for item IDs and high-quality-only quality clauses.

### Analytics / Events

Optional local-only events: scope selected, attachment added/removed, high-quality-only toggled, history restored. Requires user approval.

### Non-Goals

- Android sheet UI implementation, covered in PRD-12.
- Capture/repair implementation for pasted links, covered in PRD-06-FU and PRD-10.

### Acceptance Criteria

- Effective scope is visible before every answer.
- Citations come only from effective scope.
- Attachments visibly override route scope.
- High-quality-only excludes limited sources.
- Restored history shows original scope and warnings.

### Open Questions

1. Are attached links/notes temporary to a question, saved as real items, or both?
2. Should high-quality-only be a persistent user preference or per-question scope?
3. Should tag/topic/collection histories keep dynamic membership or snapshot item IDs?

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-09-FU-ask-context-scope-history-package.md`

### Executive Verdict

No-go until persistence semantics are decided. The PRD mixes temporary attachments, saved items, and durable history without defining the data ownership model.

### Evidence Inspected

- `src/app/ask/page.tsx`
- `src/app/ask/ask-client.tsx`
- `src/app/api/ask/route.ts`
- `src/lib/retrieve/index.ts`
- `src/db/chat.ts`
- Design interaction spec and Android Ask source export

### Findings

P0:

1. Attachment persistence is undefined. Failure mode: restored history shows citations from sources that were never stored or cannot be recovered. Recommendation: choose temporary, saved, or hybrid before schema work.

P1:

1. Current API only supports `library`, `item`, and `items`. Recommendation: keep tag/topic/collection as resolved item sets or extend API deliberately.
2. Chat schema only supports library/item thread scope. Recommendation: add scope metadata JSON or explicit columns.

P2:

1. High-quality-only can silently reduce answers to zero. Recommendation: show zero-source state before send.
2. Dynamic versus snapshot scope is undecided. Recommendation: store both label and resolved item IDs for history fidelity.

P3:

1. Events may be sensitive. Recommendation: default to no analytics.

### Go / No-Go Recommendation

No-go until PRD v2 defines attachment persistence, scope snapshot behavior, and zero-source UX.

## PRD v2

### Decisions Required Before Implementation

- Default recommendation: hybrid attachment model.
  - Saved-item attachments reference existing item IDs.
  - Pasted link and write note create real saved items first, then attach them.
  - If Arun wants temporary-only attachments, create a separate spike because citations/history become harder.
- Scope history should store both the human label and resolved source IDs at send time.
- High-quality-only should be per-question and visible, not a hidden preference.

### Final Product Requirements

1. Define `AskEffectiveScope` with:
   - `routeScope`
   - `attachedItemIds`
   - `highQualityOnly`
   - `resolvedItemIds`
   - `scopeLabel`
   - `limitedCount`
2. Attachments override route scope for the next answer and remain visible until removed or thread reset.
3. Pasted links and written notes become saved items before attachment unless user decision changes this.
4. High-quality-only excludes metadata-only, preview-only, failed, needs-upgrade, and warning-limited sources.
5. Ask history persists:
   - scope kind
   - scope label
   - route params
   - resolved item IDs
   - attached item IDs
   - high-quality-only flag
   - citations
   - warnings
6. If effective scope has zero readable sources, send is blocked with repair or remove-filter actions.

### Acceptance Criteria

- Ask selected/tag/topic/collection can be restored from history with scope label and source chips.
- Attachments override route scope and citations only reference attachments.
- High-quality-only source counts are visible.
- Deleted attached items show a missing-source warning on restore.

## Implementation Plan v1

### Architecture

- Add scope-resolution helper for route scope, attachments, and quality filter.
- Extend chat persistence to store scope metadata.
- Extend API body to accept item IDs plus flags; avoid passing raw tag/topic queries to API until there is a deliberate server model.
- Build web attachment UI as a small version of Android add-context flows.

### Affected Modules

- `src/lib/ask/scope.ts`
- `src/lib/ask/history.ts`
- `src/db/chat.ts`
- migration for thread scope metadata
- `src/app/ask/page.tsx`
- `src/app/ask/ask-client.tsx`
- `src/app/api/ask/route.ts`
- `src/lib/retrieve/index.ts`
- `src/components/citation-chip.tsx`

### Data/API Needs

- New chat thread metadata column or new table.
- API accepts `item_ids`, `high_quality_only`, `effective_scope_label`, and `thread_id`.
- Retriever filters by item IDs and quality when requested.

### Tests

- Scope resolver tests.
- Chat history metadata tests.
- API tests for selected IDs plus high-quality-only.
- Retriever tests for quality filtering.
- Browser smoke for attachment override and restored history.

### Milestones

1. Scope resolver.
2. Chat metadata migration.
3. API/retriever support.
4. Web UI attachment chips and high-quality-only.
5. History restore.
6. QA.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional no-go. The plan risks a broad migration before the product decision is locked and could break existing library/item history.

### Findings

P0: No P0 findings found.

P1:

1. Migration blast radius is underplanned. Recommendation: keep existing `scope` and `item_id`, add nullable metadata JSON for compatibility.
2. API trust boundary is vague. Recommendation: server must validate requested item IDs against resolved scope where possible.

P2:

1. Web attachment UI could duplicate PRD-12. Recommendation: build shared primitives for chips and source picker.
2. High-quality-only quality clauses need central definition. Recommendation: reuse capture quality helpers.

P3:

1. History titles need predictable generation. Recommendation: store first question title and scope label.

### Go / No-Go Recommendation

Go only after plan v2 preserves existing history and validates effective scope server-side.

## Implementation Plan v2

### Revised Architecture

1. Add a nullable `scope_metadata_json` column to `chat_threads`; leave current `scope` and `item_id` intact.
2. Add `AskEffectiveScope` helpers in `src/lib/ask/scope.ts`:
   - resolve route scope to item IDs
   - apply attachments
   - apply high-quality-only
   - produce label and warning counts
3. Store scope snapshots at thread creation and optionally per message when attachments change.
4. Extend `/api/ask` body with `item_ids`, `high_quality_only`, and `scope_metadata`.
5. Server validates item IDs exist and caps at 50.
6. Retriever applies quality filtering using a central helper from capture quality.
7. Build shared attachment chips and saved-item picker primitives for web now and PRD-12 reuse.
8. Preserve old library/item history readers and backfill missing metadata lazily as `legacy`.

### Required Tests

- Migration preserves existing threads.
- Scope resolver covers library, item, selected, tag, topic, collection, attachments, and high-quality-only.
- API rejects empty/over-limit attachment sets.
- Retriever excludes weak qualities for high-quality-only.
- History restore includes labels, attachments, and warnings.

### Rollout Notes

- Start with web hidden behind the selected feature route, then reuse primitives in PRD-12.
- Do not add product analytics unless Arun approves.

### Implementation Acceptance

- Existing library/item history still loads.
- New scoped history restores correctly.
- Attachments and high-quality-only are impossible to miss in the UI.
