# Card Processing Workflow — Existing Data Model Summary

**Status:** Current-state evidence plus proposed seam; no migration exists

## Central aggregate

`items` is the saved-source aggregate. It stores identity, source/content, generated summary/category, capture provenance/quality, capture/enrichment timestamps, and enrichment state (`src/db/migrations/020_recall_sync.sql:12-40`; `src/db/client.ts:167-205`).

It currently has no workflow status, workflow version, workflow event history, archive timestamp, completion timestamp, or manual rank.

## Do not reuse `cards`

The existing `cards` table is SRS substrate with question, answer, learning state, due date, interval, ease, repetitions, and lapses (`src/db/migrations/001_initial_schema.sql:81-97`). The proposed UI “cards” represent `items`; code and schema should use `itemWorkflow` naming to avoid a domain collision.

## Organization model

| Concept | Current storage | Current meaning | Workflow rule |
|---|---|---|---|
| User tags | `tags(kind='manual')` + `item_tags` | User-managed labels | Independent filter facet |
| Generated tags | `tags(kind='auto')` + `item_tags` | Legacy/current AI-generated labels | Do not expose as workflow |
| AI topics | `topics` + `item_topics` | Generated concepts with confidence/evidence | Recommended AI filter facet |
| Category | `items.category` | One generated scalar | Display metadata, not status |
| Collections | `collections` + `item_collections` | Manual/auto grouping | Independent organization |
| Enrichment state | `items.enrichment_state` | AI pipeline progress/error | Operational, not user workflow |
| Capture quality | `items.capture_quality` | Fidelity/readiness | Orthogonal quality filter |

## Deletion and retention

Hard item deletion cascades relational state and explicitly removes artifacts, vectors/chunks, and note-citing messages (`src/db/items.ts:280-289`). No recoverable archive exists. Attached-note tombstones protect against delayed offline resurrection, but apply only to notes.

## Recommended future seam

The evidence supports additive current-state fields on `items` plus append-only content-free events:

- `workflow_status`: Inbox, To Do, In Progress, Done;
- `workflow_version`: compare-and-swap token;
- `workflow_initialized_at`;
- `workflow_status_changed_at`;
- `archived_at`: separate lifecycle timestamp;
- `item_workflow_events`: initialized, status changed, archived, restored; mutation ID, item version, origin/channel, UTC timestamp.

Archive should require Done, preserve content/taxonomy/notes/retrieval, restore to Done, and block status mutation until restored.

## Migration options

1. **Fields on `items` + event table — recommended.** Fast current-state reads/counts, database Inbox default protects all inserts, event history supports metrics and conflict audit.
2. **One-to-one workflow state table + events.** Better physical isolation but creates join/missing-row complexity and weaker insert guarantees.
3. **Lazy nullable status.** Rejected because `NULL`/Inbox dual semantics poison counts, history, and CAS.
4. **Archive as fifth status.** Rejected because it loses prior state and conflates work with visibility.
5. **Tags/collections as status.** Rejected because users/enrichment can change them and they cannot enforce one state, version, or history.

## Existing-card initialization decision

Platform safety favors a valid persisted status for every row; product exploration rejects a demoralizing silent historical Inbox.

Coordinator resolution: adopt the technical architect's enrolled-lifecycle model. Every legacy item receives a real dormant Inbox baseline with version 0 and a `legacy_baselined` event, but `workflow_enrolled_at` remains null, so it neither appears nor counts in Processing. New captures initialize and enroll Inbox atomically. First use offers explicit recent-30-days, selected-Library, or all-history enrollment. Enrollment events never count as added, processed, completed, or duration samples. “Unenrolled” remains an internal participation boundary, not a fifth workflow status.

## Ordering scope

Phase one should not persist manual intra-column rank. Sort by `workflow_status_changed_at DESC, captured_at DESC, id`; Inbox can offer oldest/newest sort. Drag changes status only. This avoids fractional-rank collisions and column-wide rebalances while prototypes test whether manual priority is actually valuable.
