# Card Processing Workflow — Technical Plan v1

**Lifecycle:** **Explored — not implemented**
**Artifact type:** Implementation planning; no production code, schema, API, navigation, or runtime behavior is claimed
**Council role:** Technical Architect
**Date:** 2026-07-11
**Application baseline:** `1cb5d36f37611e60442b4f2c4433b45455273500`
**Wiki baseline:** `88a3520038703108a0533501c7a384c6def7b74e`
**Product direction:** Processing — Inbox-first triage with a secondary Board
**Architecture decision:** Current workflow projection on `items`, dormant legacy baseline plus explicit enrollment, append-only history, separate archive, and no manual rank in v1

## 1. Outcome and implementation posture

Build one trusted workflow projection over existing saved-source `items`. A Processing card is not a new record and the existing SRS `cards` table is not involved.

The v1 technical outcome is:

- every genuinely new item is initialized and enrolled in Inbox by database contract;
- every existing item receives a valid dormant Inbox baseline but remains outside visible Processing until the owner explicitly enrolls recent, selected, or all history;
- current status, archive, and version live on `items` for fast reads;
- every confirmed lifecycle mutation appends a content-free event atomically;
- Undo appends a linked inverse event rather than deleting history;
- reads use dedicated server filtering, counts, keyset pagination, and bounded DTOs;
- writes use per-item compare-and-swap and mutation idempotency;
- the Inbox list is the default and accessibility/performance baseline;
- Board drag changes status only; **there is no intra-column manual rank or reorder in v1**;
- optimistic visuals remain pending until server confirmation and reconcile unknown outcomes before Retry;
- archive hides an item only from active Processing, not Library, search, Ask, detail, notes, or background processing; and
- workflow mutations are online-only.

This plan is deliberately implementation-ready in structure but remains **Explored — not implemented** until council decisions, prototype validation, and release gates are satisfied.

## 2. Source decisions and resolved input conflicts

This plan consumes:

- `product/product-directions.md`;
- `product/metrics-framework.md`;
- `research/platform-data-workflow-assessment.md`;
- `research/power-user-workflow-assessment.md`; and
- `technical/architecture-options.md`.

Where those inputs differ, v1 uses these resolutions:

| Input conflict | v1 resolution |
|---|---|
| Platform all-history Inbox versus product no-silent-backfill | Persist a valid Inbox baseline for all legacy rows, but keep `workflow_enrolled_at` null until explicit recent/selected/all enrollment. Baseline is not visible participation. |
| Per-Inbox-cycle “processed” versus first-ever triage | User-facing **Triaged** is the first effective owner-driven Inbox exit per item. Later exits are diagnostic Inbox exits only. |
| Power-user manual priority versus architecture scope | No persisted rank and no intra-column reorder in v1. Chronological/status-change sorts are explicit. Cross-column drag and Move to share one status mutation. |
| Power-user “AI category” versus platform taxonomy evidence | v1 filter API uses User tags (`kind='manual'`) and AI topics (`topics`/`item_topics`) as separate stable-ID facets. Scalar category may display but is not the primary generated facet. |
| Preliminary all-or-nothing batch versus explicit partial-outcome requirement | Each item mutation remains atomic; a batch is a resumable group of per-item CAS mutations and may partially succeed. Results explicitly classify succeeded, replayed, conflicted, ineligible, missing, and failed items. This refinement prevents two stale items from blocking 98 safe moves. |
| Metrics acceptance input that migration adds legacy rows to Inbox stock versus dormant enrollment | Dormant baselines do not count in Inbox stock. The explicit enrollment operation changes stock; migration alone does not. |
| Event proposal without Undo linkage | Add `undo_of_event_uuid`; linked Undo makes only its target event ineffective for milestone metrics. Ordinary backward movement has no link and preserves milestones. |

## 3. v1 scope and non-goals

### In scope

- Processing landing at the unfiltered oldest-first Inbox.
- Active List and desktop Board; mobile one-status-at-a-time Board equivalent.
- Status transitions among Inbox, To Do, In Progress, and Done.
- Explicit Move to controls everywhere; cross-column drag as progressive enhancement.
- Individual and visible-selection batch status moves.
- Done-only archive, Archived view, restore to Done, and explicit reprocess to Inbox.
- Ten-second-or-longer in-tab Undo affordance backed by a new CAS mutation.
- Current-state counts, matching counts, Inbox health, weekly flow, and first-event metrics.
- Manual-tag and AI-topic filters, source/quality filters, text query, no-tag/no-topic values, and URL state.
- Existing item-detail route with validated Processing return context and independent note safety.
- Dormant legacy baseline and explicit selected/recent/all enrollment.
- Same-tab, multi-tab, multi-device, offline-disabled, failure, and conflict handling.

### Out of scope

- Manual rank, priority scores, reorder events, Move up/down/top/bottom, or cross-status global priority.
- Assignees, permissions, teams, comments, due dates, reminders, dependencies, sprints, milestones, WIP limits, or time tracking.
- Custom statuses/columns, saved views, workflow automation, or AI-driven status changes.
- Select-all-matching across unloaded pages.
- Offline mutation queue or background sync.
- New editable note drawer or workflow-specific note model.
- Archive as deletion, search suppression, Ask suppression, export suppression, or worker cancellation.
- Third-party product analytics.
- Bearer/API-client workflow mutation in v1; Android/extension capture defaults are still covered at insertion.

## 4. Likely affected modules

Implementation is expected to touch these areas; exact filenames may change during design review:

| Layer | Likely modules/work |
|---|---|
| Migration/schema | `src/db/migrations/024_item_workflow.sql`, migration tests, `src/db/client.ts` row types |
| Domain repository | New `src/db/item-workflow.ts`, query builder/metrics modules, repository tests |
| Capture integration | `src/db/items.ts` contract tests; duplicate/upgrade routes and Recall/Telegram integration tests, not caller-specific status writes |
| APIs | New workflow read/summary/mutation/batch/enrollment routes and shared auth/HTTP/error DTO helpers |
| Processing UI | New `/processing` route, Inbox/List/Board/Archived components, query-state and mutation controller hooks |
| Navigation | Desktop sidebar peer, mobile More/Library summary entry, routing tests |
| Item detail | Contextual return validation, workflow control, Process next integration without remounting notes |
| Existing surfaces | Archive/enrollment badges or affordances in Library/search/detail/Review as approved; no retrieval exclusion |
| Service worker/offline | Explicitly exclude mutations from caching/queueing; loaded-page read-only behavior |
| Testing/tooling | Node tests, JSDOM component tests, browser E2E/a11y harness, performance fixture/benchmarks |

Do not serialize raw extended `ItemRow` objects from APIs or exports. Use explicit compact DTOs so adding workflow fields cannot accidentally change existing Markdown/ZIP contracts.

## 5. Runtime architecture

```text
Capture paths ──> insert item ──> DB default + AFTER INSERT initialization
                                      │
                                      ├── current projection on items
                                      └── initialized event

Processing UI ──> authenticated read API ──> workflow query repository
      │                                      ├── compact page DTOs
      │                                      ├── matching counts
      │                                      └── unfiltered health/metrics
      │
      └── mutation controller ──> authenticated write API ──> workflow repository transaction
                                                               ├── CAS current projection
                                                               └── append canonical event
```

The server is authoritative. WAL reduces SQLite reader/writer contention but does not resolve semantic conflicts; item versions do.

## 6. Data model

### 6.1 Current workflow projection on `items`

Add the following fields through the next lexicographic migration, expected as `024_item_workflow.sql`:

| Field | SQLite contract | v1 use |
|---|---|---|
| `workflow_status` | `TEXT NOT NULL DEFAULT 'inbox'` plus allowed-value check/trigger | Current Inbox/To Do/In Progress/Done state. |
| `workflow_version` | `INTEGER NOT NULL DEFAULT 0` | Monotonic per-item CAS token. |
| `workflow_initialized_at` | `INTEGER NOT NULL DEFAULT 0` | Technical initialization; capture time for new rows, migration time for dormant legacy baselines. |
| `workflow_status_changed_at` | `INTEGER NOT NULL DEFAULT 0` | Deterministic current-state ordering. |
| `workflow_enrolled_at` | nullable `INTEGER` | Null means dormant legacy baseline; non-null means visible Processing participation. |
| `archived_at` | nullable `INTEGER` | Separate archive lifecycle; null is active. |

Cross-field invariants:

1. Unenrolled requires Inbox and not archived.
2. Archived requires enrolled and Done.
3. Status cannot change while archived.
4. Restore clears archive and keeps Done.
5. Reprocess of archived content is represented as restore followed by a separate Done-to-Inbox status event, sharing a user-visible operation group but preserving two lifecycle facts.
6. Duplicate capture, repair, enrichment, and transcript upgrade cannot write these fields.

Do not add writable `first_processed_at` or `first_completed_at`; derive them from effective events. Do not add `workflow_rank` in v1.

`current_inbox_entered_at` remains derived initially. Benchmark the oldest-age query before adding a projection. If required to meet the performance gate, add it only through a reviewed follow-up migration and maintain it transactionally, including restoration of the prior continuous anchor on linked Undo.

### 6.2 Canonical event history

Create `item_workflow_events`:

| Field | Contract |
|---|---|
| `id INTEGER PRIMARY KEY AUTOINCREMENT` | Local total order. |
| `event_uuid TEXT NOT NULL UNIQUE` | Stable event identity and Undo target. |
| `item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE` | Privacy-aligned ownership. |
| `item_version INTEGER NOT NULL` | Version produced; `UNIQUE(item_id, item_version)`. |
| `event_type TEXT NOT NULL` | `legacy_baselined`, `initialized`, `enrolled`, `status_changed`, `archived`, or `restored`. |
| `from_status`, `to_status` | Nullable checked status delta. |
| `from_archived_at`, `to_archived_at` | Archive delta. |
| `mutation_id TEXT UNIQUE` | Required for user/API mutations; null for DB initialization/migration. |
| `request_hash TEXT` | Stable hash of normalized semantic request; required when mutation ID exists. |
| `undo_of_event_uuid TEXT REFERENCES item_workflow_events(event_uuid)` | Nullable; only linked `origin='undo'` events. |
| `batch_operation_id TEXT` | Nullable content-free group identity. |
| `actor_channel TEXT NOT NULL` | Trusted `web`, `android`, `extension`, `telegram`, `recall`, `system`, `unknown`, or `migration`. |
| `origin TEXT NOT NULL` | `capture`, `user`, `undo`, `legacy_migration`, or `legacy_import`. |
| `action_mode TEXT NOT NULL` | `individual`, `bulk`, or `system`. |
| `surface TEXT NOT NULL` | Bounded `capture`, `inbox`, `list`, `board`, `detail`, `archived`, `library`, or `migration`. |
| `occurred_at INTEGER NOT NULL` | UTC epoch milliseconds. |

No canonical event contains title, body, URL/domain, note, summary, quote, transcript, search query, taxonomy label/ID list, drag position, free-form error, or authentication material.

An effective milestone event has no later valid Undo event referencing its `event_uuid`. Ordinary later moves/restores do not invalidate it.

### 6.3 Batch and enrollment operations

Create content-free operational tables only as needed:

- `workflow_batch_operations(batch_operation_id, request_hash, state, requested_count, completed_count, created_at, updated_at, completed_at)` supports retrying a partially completed route request without duplicating committed per-item events.
- `workflow_enrollment_runs(id, mode, state, cutoff_at, cursor_captured_at, cursor_item_id, enrolled_count, skipped_count, last_error_code, created_at, updated_at, completed_at)` supports recent/all enrollment in bounded chunks.

Batch state is not canonical product history. Item events remain the authority. Hard deletion cascades item events; batch/run rows must be purged or contain no retained item IDs.

### 6.4 Indexes

- Active status page/count: `(workflow_enrolled_at, archived_at, workflow_status, workflow_status_changed_at DESC, captured_at DESC, id)`.
- Oldest Inbox: partial `(captured_at ASC, id ASC)` where enrolled, unarchived, Inbox.
- Archive: partial `(archived_at DESC, id)` where archive is non-null.
- Dormant enrollment discovery: `(workflow_enrolled_at, captured_at DESC, id)`.
- Events: `(item_id, item_version)`, `(item_id, event_type, occurred_at)`, `(event_type, origin, occurred_at, item_id)`, and `(undo_of_event_uuid)`.
- Existing item-tag and item-topic indexes remain; query plans must prove filters use them.

### 6.5 Migration sequence

1. Back up a production-size snapshot and record integrity, FK, FTS, chunk/vector bridge, trigger/job, and row-count manifests.
2. Add current fields using SQLite-safe constant defaults.
3. Create events, operation/run tables if approved, indexes, and invariant triggers.
4. Baseline every pre-existing item as Inbox/version 0 with `workflow_enrolled_at=NULL`, migration-time initialization, and `workflow_status_changed_at=captured_at` solely for deterministic dormant ordering.
5. Insert one `legacy_baselined` event per pre-existing item with version 0, `origin='legacy_migration'`, and no mutation ID.
6. Add an `AFTER INSERT ON items` trigger that sets new rows to Inbox/version 1, initializes/enrolls at capture time, and inserts one `initialized/origin='capture'` event.
7. Verify existing FTS/enrichment/embedding triggers still fire exactly once and in a valid order.
8. Update TypeScript row/repository DTOs only after migration coverage exists.
9. Run post-migration manifests and performance queries.

Applied migrations are not down-migrated. Do not rename the duplicate existing `017_` files.

### 6.6 Dormant legacy baseline and explicit enrollment

- Migration alone changes no visible Processing stock or metric.
- `recent_30_days` uses a captured-time cutoff frozen when the run is created.
- `selected` accepts only validated existing IDs and is bounded to visible selection.
- `all` processes dormant rows in deterministic captured-time/ID chunks.
- Enrollment changes Inbox participation, sets `workflow_enrolled_at`, advances version, and writes `enrolled/origin='legacy_import'`.
- Already-enrolled items are skipped without status reset, version change, or duplicate event.
- Imported-history Inbox duration begins at enrollment; new-capture duration begins at initialization.
- Original `captured_at` still drives oldest-first sort but does not manufacture years of workflow waiting time.

## 7. Lifecycle behavior

### 7.1 Status transitions

Any active status may move to any other active status. A same-status request is rejected as an invalid no-op rather than creating churn history. A move to Inbox records a return event but does not erase the first Triaged milestone.

### 7.2 Deterministic ordering; no manual rank

| Scope | v1 default | Supported alternative |
|---|---|---|
| Inbox | `captured_at ASC, id ASC` | Newest first query sort |
| To Do | `workflow_status_changed_at DESC, captured_at DESC, id` | Captured oldest/newest list sort if product retains it |
| In Progress | `workflow_status_changed_at DESC, captured_at DESC, id` | Captured oldest/newest list sort if retained |
| Done | `workflow_status_changed_at DESC, captured_at DESC, id` | Oldest status change |
| Archived | `archived_at DESC, id` | Oldest archived |

Cross-column drag updates status and appears at the top under status-change ordering. It does not accept a neighbor/rank. No v1 copy says Manual priority, Move to top, or Reorder.

### 7.3 Archive and restore

- Archive requires current enrolled, unarchived Done.
- Completion never auto-archives.
- Archive removes only active Processing visibility/counts.
- Restore clears archive and stays Done.
- Reprocess is explicit restore, then move to Inbox; direct Archived-to-To Do/In Progress is excluded.
- Hard delete remains distinct and cascades workflow events.

### 7.4 Undo

- The client offers Undo for at least ten seconds after confirmation.
- Undo submits a new mutation with the confirmed current version and `undoOfEventUuid`.
- The target must be the most recent reversible event for the current item state.
- The inverse event uses `origin='undo'` and links its target.
- Linked Undo cancels the target only for milestone/activity metrics; it never removes rows.
- An ordinary backward move has no Undo link and does not decrement first Triaged/Completed.
- A stale Undo returns `409` and never overwrites the newer state.
- In-tab Undo context may survive view changes/detail opening, but not reload or tab close.

## 8. Ingestion/default and preservation matrix

| Creation/update path | v1 workflow result | Required proof |
|---|---|---|
| Web manual note | New item initialized/enrolled Inbox | Repository + action integration test |
| Web URL capture | New item initialized/enrolled Inbox | Route/action integration test |
| Web/PDF capture | New item initialized/enrolled Inbox | Cookie and bearer-delegated route tests |
| Android/extension note API | New item initialized/enrolled Inbox without client schema change | API compatibility test |
| Android/extension URL API | New item initialized/enrolled Inbox | API compatibility test |
| Telegram URL | New item initialized/enrolled Inbox with actor channel from capture provenance | Dispatch integration test |
| Telegram text note | Same | Dispatch integration test |
| Telegram PDF | Same | Dispatch integration test |
| Recall genuinely new import | New item initialized/enrolled Inbox; Added time is local import time | Importer/sync integration tests |
| Duplicate URL/share | Existing identity/status/version/enrollment/archive preserved; no initialized event | URL duplicate tests across active, archived, dormant |
| Recall replay/already imported | Preserve lifecycle; no initialized event | Recall replay test |
| Transcript upload/paste | Existing item content upgrade only; lifecycle preserved | Transcript route tests |
| Source repair/quality upgrade | Existing item lifecycle preserved | Repair tests |
| Enrichment/embedding/note/transcript workers | Never infer or mutate workflow; archive does not cancel work | Worker integration assertions |
| Future raw/direct insert | DB trigger enforces Inbox initialization/enrollment | Migration/raw SQL test |

“Capture and start now” is capture to Inbox followed by an explicit user move. Callers never initialize directly into To Do/In Progress/Done.

## 9. Read repository and filter/count contract

### 9.1 Dedicated query builder

Create a workflow-specific validated predicate builder. Do not extend `listItems` until its options become an ambiguous multi-facet board API.

Normalized filter input:

- scope: active or archived;
- zero or more statuses;
- zero or more source types/platform groups;
- zero or more capture-quality groups;
- zero or more manual tag IDs, constrained to `tags.kind='manual'`;
- zero or more AI topic IDs;
- explicit no-manual-tag and no-AI-topic flags;
- bounded text query;
- deterministic sort; and
- enrollment is always required for Processing scopes.

Values within a facet are OR. Facets combine with AND. Use `EXISTS` subqueries or de-duplicated CTEs to avoid tag/topic fan-out. FTS query input must use existing safe phrase/normalization conventions.

### 9.2 Count semantics

- `activeInboxTotal` and oldest Inbox age are owner-wide and never change with active filters.
- Weekly Added/Triaged/Completed are owner-wide in v1.
- Status/column counts use the exact current result predicate without page limit and are labeled matching when filtered.
- Archived matching count uses archived scope plus the same filter predicate.
- Empty state uses server count, not loaded rows.
- Dormant legacy count is separate launch/import information, never added to Inbox total.

### 9.3 Keyset pagination

- Default page size 30; maximum 50.
- Cursor includes schema version, normalized filter hash, scope/status/sort, and the full sort tuple.
- Reject cursor/filter mismatch.
- Board columns page independently.
- Client de-duplicates item IDs and removes returned snapshots that no longer match.
- Counts are not inferred from loaded cards.
- Selection includes loaded/visible items only; no select-all-matching in v1.

The server does not promise a historical snapshot across multiple HTTP requests. Concurrent changes are reconciled by item version and aggregate refresh.

## 10. API contracts

All workflow routes are Node runtime, dynamic, session-verified inside the handler, private/no-store, and explicit DTOs.

### 10.1 Read page

`GET /api/workflow/items`

Parameters: `scope`, repeatable `status`, repeatable `source`, repeatable `quality`, repeatable `manualTagId`, repeatable `topicId`, no-tag/no-topic flags, bounded `q`, `sort`, `cursor`, and `limit`.

Response:

```json
{
  "items": [],
  "nextCursor": null,
  "filteredCountsByStatus": {
    "inbox": 0,
    "todo": 0,
    "inProgress": 0,
    "done": 0
  },
  "activeInboxTotal": 0,
  "oldestInboxEnteredAt": null,
  "matchingArchivedCount": 0,
  "unenrolledLegacyCount": 0,
  "snapshotAt": 0
}
```

Compact item DTO includes ID, title, source/platform, capture time/quality, bounded display taxonomy, workflow snapshot, and archive time. Exclude body, notes, full summary, chunks, and vectors.

### 10.2 Summary and versions

- `GET /api/workflow/summary` returns Inbox health, weekly Added/Triaged/Completed, optional Activity values, sample-qualified durations, and archive stock.
- `GET /api/workflow/versions?itemId=...` accepts a bounded set of visible IDs for focus/poll reconciliation and returns compact versions/current states.
- The server uses the persisted owner timezone; clients cannot override reporting boundaries through this read route.

### 10.3 Individual mutation

`PATCH /api/items/:id/workflow`

```json
{
  "mutationId": "uuid",
  "expectedVersion": 7,
  "operation": "changeStatus",
  "workflowStatus": "in_progress",
  "undoOfEventUuid": null,
  "surface": "inbox"
}
```

Operations: `changeStatus`, `archive`, `restore`. Reprocess is a client-visible compound sequence, not a hidden direct status/archive rewrite.

Success returns:

```json
{
  "snapshot": {},
  "eventUuid": "uuid",
  "acceptedVersion": 8,
  "currentVersion": 8,
  "replayed": false,
  "countDelta": {}
}
```

For replay after later mutations, `acceptedVersion` identifies the original accepted event while `snapshot/currentVersion` are current truth.

Errors:

- `400 WORKFLOW_VALIDATION_FAILED`;
- `401 UNAUTHENTICATED`;
- `403 WORKFLOW_CROSS_ORIGIN_FORBIDDEN`;
- `404 ITEM_NOT_FOUND`;
- `409 WORKFLOW_CONFLICT` with compact current snapshot;
- `422 WORKFLOW_TRANSITION_INVALID`;
- `422 WORKFLOW_MUTATION_MISMATCH`;
- `503 WORKFLOW_WRITE_DISABLED`;
- `500 WORKFLOW_INTERNAL_ERROR` without content.

### 10.4 Batch mutation

`POST /api/workflow/mutations/batch`

- Maximum 100 loaded/selected entries in v1.
- Request has one batch operation ID/hash and per-item `{itemId, mutationId, expectedVersion, operation, targetStatus?, undoOfEventUuid?}`.
- Validate the envelope once, then process each item with the same repository mutation used by the individual route.
- Each item commits atomically; stale/ineligible items do not block valid items.
- On transport loss, retrying the batch replays committed item mutation IDs and attempts only uncommitted items.
- Response classifies item IDs as `succeeded`, `replayed`, `conflicted`, `ineligible`, `missing`, or `failed`, with compact current snapshots for actionable conflicts.
- Successful items clear from selection; conflicted/failed remain selected.
- Batch Undo targets the exact succeeded/replayed subset using their confirmed post-mutation versions and may itself partially conflict.

This item-level outcome model intentionally refines the architecture option's preliminary all-or-nothing batch. It is required by the power-user acceptance inputs and avoids false total-success feedback.

### 10.5 Enrollment

- `POST /api/workflow/enroll` for selected IDs.
- `POST /api/workflow/enrollment-runs` for recent/all.
- `GET /api/workflow/enrollment-runs/:id` for progress.
- `POST /api/workflow/enrollment-runs/:id/resume` after recoverable failure.

Enrollment endpoints are separately flag-gated, same-origin, idempotent, and content-free.

## 11. Repository mutation algorithm

For each item mutation:

1. Normalize and hash semantic request fields.
2. Begin a short database transaction.
3. Look up `mutation_id`.
4. Same hash: return replay information plus current snapshot. Different hash: mutation mismatch.
5. Load item and validate existence, enrollment, archive invariant, target transition, and Undo target.
6. `UPDATE items ... workflow_version=workflow_version+1 WHERE id=? AND workflow_version=?`.
7. Require one changed row; otherwise create no event and return conflict/current snapshot.
8. Insert event with new version and all bounded audit fields.
9. Commit.

The item current projection and event can never commit separately. A failed, optimistic, conflicted, invalid, offline-disabled, or replayed request writes no second canonical event.

## 12. Client state, optimistic reconciliation, and place

### 12.1 Per-item mutation controller

Keep:

- confirmed server snapshot;
- optimistic intended projection;
- pending mutation ID;
- rollback row/column anchor and neighboring IDs;
- semantic Retry intent; and
- unknown-outcome state.

Behavior:

1. Render the intended destination immediately but visibly pending; do not announce completion or remove the original row semantics until confirmation.
2. Keep focus associated with the affected item while pending.
3. After three seconds show “Still saving.”
4. On success, install canonical snapshot/count delta, broadcast invalidation, then show Undo.
5. On known failure/503, restore confirmed state/anchor and offer Retry.
6. On `409`, install current snapshot, announce another session changed it, and offer Try your move again.
7. On lost connection after send, show “Checking saved state,” fetch item state/mutation replay, and enable Retry only when outcome is known.
8. On 404, remove only that item and move focus to the next logical row.

No failure reloads the whole Board or moves unrelated cards.

### 12.2 Inbox focus contract

- On confirmed removal, focus the next matching row at the same visual index.
- If absent, focus the prior row.
- If empty, focus the empty-state heading and announce completion.
- Linked Undo that restores a matching row returns focus to it.
- If filtering/taxonomy removes a row, preserve current focus until the user completes the active interaction, then reconcile.

### 12.3 URL, view, selection, and detail return

- URL owns scope, filters, query, status, and list sort.
- Fresh primary Processing navigation always opens unfiltered Inbox.
- Browser Back/bookmark restores URL state.
- Last explicit Board/List choice is local preference but never bypasses the Inbox landing.
- Selection is in-memory, preserved between Board/List for identical query, and cleared/announced on query/scope/sort changes.
- Session state stores bounded source-ID anchors/cursors, not full content.
- Item-detail return accepts only validated internal Processing paths and source anchors; external/open redirects are forbidden.
- Detail status control does not remount the note editor. Process next runs existing note navigation-safety checks.

## 13. Multi-tab, multi-device, and offline

- Publish server-confirmed hints to `BroadcastChannel('brain-item-workflow-v1')` with item ID, version, status, archived flag, and event time only.
- Receiving tabs invalidate/fetch; broadcasts are never authority.
- A pending local request waits for its own response before reconciling a newer hint.
- Revalidate visible IDs and aggregate counts on focus, visible, online, and a conservative 30–60 second active-page poll.
- Cross-device freshness is fetch-based; CAS prevents lost updates.
- Loaded in-memory/cached pages may remain readable/filterable offline.
- Move, archive, restore, reprocess, batch, Undo, and enrollment controls are disabled offline with a connection-required explanation.
- Do not add workflow requests to service-worker background sync or mutation caches.
- Manual-note local journal/conflict behavior remains independent.

## 14. Scale, virtualization, and performance

### 14.1 UI scale

- Maximum read page 50.
- Each desktop column owns its cursor/loading/error state.
- Virtualize Board columns and long List/Inbox results with focus-aware overscan.
- Keep no more than 200 card DOM nodes across desktop Board.
- Mobile renders one status at a time, not four columns.
- Loaded rows never define totals.

### 14.2 Performance budgets

Measure on the supported deployment class with 10k and 50k items, realistic manual-tag/topic fan-out, dormant rows, archive rows, and concurrent worker writes.

| Operation | v1 gate |
|---|---|
| Initial page plus matching counts | p95 ≤ 200 ms at 10k; ≤ 400 ms at 50k |
| Subsequent status page | p95 ≤ 120 ms at 10k; ≤ 250 ms at 50k |
| Summary/weekly metrics | p95 ≤ 250 ms at 10k; ≤ 500 ms at 50k |
| Individual DB mutation | p95 ≤ 50 ms DB time; route ≤ 200 ms excluding network |
| 100-item batch | p95 ≤ 1 s route time under partial per-item transactions; document lock/worker impact |
| Enrollment chunk | ≤ 100 rows and ≤ 500 ms DB work; resumable |
| Max page response | ≤ 200 KiB uncompressed; no body/notes |
| Board DOM | ≤ 200 cards plus bounded overscan |
| Interaction | INP ≤ 200 ms on target desktop/mobile |
| Layout | CLS ≤ 0.1 with stable skeleton/card dimensions |

Run `EXPLAIN QUERY PLAN`, cold/warm benchmarks, and concurrent enrichment/note-index workloads. Daily metric rollups are forbidden unless raw-event queries miss budgets and a privacy-preserving, hard-delete-correct rollup design is separately approved.

## 15. Metrics and analytics implementation

### 15.1 Primary display

- Inbox now plus oldest current Inbox age.
- This week: Triaged and Added together.
- Completed this week.
- Today values, status totals, archive activity, ratio, and durations live under Activity disclosure.

Primary metrics are owner-wide and unchanged by current filters. Matching state counts are filter-dependent and explicitly labeled.

### 15.2 Canonical definitions

- Added: distinct `initialized/origin='capture'` items in owner-timezone window.
- Triaged: distinct items whose first effective `status_changed` event exits Inbox.
- Completed: distinct items whose first effective event enters Done.
- Effective excludes an event with a later linked Undo.
- Re-entry/re-exit does not create a second Triaged milestone.
- Archive is lifecycle activity, not success.
- Hard delete removes item events and can decrease recomputed history.
- Legacy baseline/enrollment is never Added/Triaged/Completed.
- Imported-history duration begins at enrollment and is reported separately from new captures.

### 15.3 Time and sample rules

- Persist one IANA owner timezone in `settings`.
- Today/week are half-open owner-local intervals converted to UTC; week starts Monday.
- Timezone change re-buckets at query time without rewriting events.
- Duration uses trailing 28-day exit cohort; median first, average second, always `n`.
- No numeric duration below `n=5`; `n=5–19` is Early signal.
- Triage-to-add ratio displays raw numerator/denominator and `—` when Added is zero.

### 15.4 Privacy and optional operational measurement

Canonical events are local product data retained with the item and deleted on hard delete. Optional reliability observations are a separate, owner-approved local store with 30-day retention. The feature must function when optional measurement is disabled or purged.

No headline targets are set before a four-week baseline. Do not use transitions, opens, streaks, zero-Inbox days, time in app, archive count, or DAU as success.

## 16. Authorization, security, and privacy

- Every route verifies the signed owner session internally even though the proxy gates it.
- Cookie-authenticated writes require exact same origin using the note API precedent.
- Workflow routes are not bearer-allow-listed in v1.
- Actor channel derives from trusted request/capture context.
- Zod schemas bound IDs, enums, filters, query length, cursor, page size, batch size, and body size.
- Use parameterized SQL and opaque validated cursors with filter hash.
- All responses include `Cache-Control: private, no-store, max-age=0`, `Vary: Cookie`, and `X-Content-Type-Options: nosniff`.
- Error responses contain stable codes and compact state only; no content/free-form stack.
- Logs/metrics prohibit content, URL/domain, query, taxonomy names, notes, auth tokens, and free-form errors.
- Archive copy says content remains in Library/search/Ask; it is not privacy deletion.
- Hard delete cascades history.
- Existing SQLite/backups/browser storage are not application-level encrypted; do not imply otherwise.
- Return URLs are internal, allow-listed, and normalized to prevent open redirects.

## 17. Accessibility implementation hooks

- One semantic mutation controller powers row menus, Board drag, batch toolbar, detail controls, and Undo.
- Every cross-column drag has a visible/labeled Move to alternative.
- No v1 reorder control exists, avoiding a false keyboard equivalent for unsupported rank.
- Status, pending, conflict, archive, and filters never rely on color alone.
- Columns are labeled regions with headings and matching counts; cards remain list items, not an incomplete ARIA grid.
- Move menu supports arrow keys, Enter, and Escape; Space toggles explicit checkboxes.
- Polite live region announces pending-confirmed changes, loaded-more results, count changes, Undo, and ordinary rollback. Conflicts/deletion use an assertive alert.
- Focus stays on the pending card and follows the Inbox next-row contract after confirmation.
- Virtualization must preserve focused/active descendants and never drop focus to body.
- Respect reduced motion; rollback/pending remains understandable without animation.
- Mobile targets are at least 44×44 CSS pixels and notices sit above bottom navigation.
- Test keyboard-only, VoiceOver/Safari, NVDA/Chrome or equivalent desktop screen reader, and Android TalkBack at the target mobile layout.

## 18. Dependencies and blockers

### Existing capabilities to reuse

- Next.js 16/React 19 server routes and client components.
- `better-sqlite3`, WAL, migrations, transactions, and Node test runner.
- Zod validation.
- Existing session verification, exact-origin helper pattern, private response headers, and `BroadcastChannel` precedent.
- JSDOM component conventions, Library selection patterns, item detail, notes journal, design tokens, and responsive shell.
- Node 22 `Intl` timezone support, provided DST boundary tests prove correctness.

### New dependency decisions

1. **Virtualization:** evaluate a small maintained React 19-compatible virtualizer versus a focused internal implementation. It must support variable height, focus retention, SSR/hydration, and independent columns.
2. **Drag:** evaluate an accessible pointer/touch/keyboard-capable library, but configure it for cross-column status only. Move to remains the accessibility baseline.
3. **Browser E2E:** add `@playwright/test` as a direct dev dependency only after CI/local browser-binary strategy is approved; current lockfile transitive presence is not a supported test contract.
4. **Automated accessibility:** add a direct supported axe integration if chosen; transitive `axe-core` is not a stable project dependency.

Dependency addition requires license/security/bundle review and a prototype spike against virtualization, reduced motion, keyboard focus, and mobile touch. Do not couple schema/API work to the final drag library choice.

### Blocking decisions before production work

- Council approval of workflow-only archive scope and Review behavior.
- Approval of partial-outcome batch semantics as the v1 refinement.
- Approval of User tags + AI topics terminology.
- Direct E2E/a11y tooling and CI execution environment.
- Production-size database fixture and deployment-class benchmark host.
- Owner timezone initialization/settings UX.
- Mobile navigation entry and desktop Processing promotion after prototype evidence.

## 19. Test plan

### 19.1 Unit tests

- Status/archive/restore/reprocess transition reducer and invariant errors.
- Request normalization/hash and mutation mismatch.
- Effective-event/Undo reducer; first Triaged/Completed derivation.
- Timezone day/week boundaries, DST, half-open intervals, duration sample rules.
- Cursor encode/decode/filter hash/sort tuples.
- Filter normalization and OR-within/AND-across SQL fragment parameters.
- Client mutation state machine: pending, still-saving, confirmed, failed, unknown, conflict, replay, Undo.
- Inbox focus-next/previous/empty logic and selection clearing rules.
- Return-context allow-list/normalization.

### 19.2 Database and migration integration tests

- Pre-024 migration baseline is Inbox/version 0, unenrolled, unarchived, and paired with one legacy event.
- Migration baseline alone does not increment active Inbox counts.
- Raw post-migration insert becomes enrolled Inbox/version 1 with one initialized event.
- Migration rerun is idempotent.
- Existing FTS/enrichment/embedding triggers and vector/chunk manifests remain valid.
- DB triggers reject illegal status/archive/enrollment combinations.
- Current state/event atomicity under injected failure.
- CAS winner/loser; same mutation replay; mutation mismatch; replay after later version.
- Linked Undo validity and ordinary backward-move distinction.
- Hard delete cascade and operation/run cleanup.
- Recent/selected/all enrollment idempotency and crash/resume.

### 19.3 Ingestion integration tests

Cover every row in section 8, including web actions, note/URL/PDF APIs, extension/Android-compatible routes, Telegram URL/text/PDF, Recall new/replay, duplicate URL active/archived/dormant, transcript upgrade, repair, and background workers.

### 19.4 Query/API integration tests

- Active/archived/enrollment scope.
- Manual tags versus AI topics; source/quality; no-tag/no-topic; text query.
- Matching count/page predicate parity and unfiltered Inbox health.
- Keyset boundary/ties, filter-cursor mismatch, page de-duplication after a move.
- Auth on direct route invocation, missing/foreign Origin, no-store headers on all outcomes.
- Input/body/page/filter/batch caps and content-free `500`.
- Individual conflicts and current snapshots.
- Partial batch result, lost-response replay, mixed eligibility, and partial Undo.
- Enrollment progress/resume and flags.

### 19.5 Component/integration tests

- Inbox pending then next-row focus; rollback preserves place.
- Unknown transport outcome reconciles before Retry.
- Board/List preserve URL, selection, and best anchor.
- Fresh nav opens unfiltered Inbox while Back/bookmark restores filters.
- Contextual detail return and Process next do not remount/clear note editor.
- Broadcast hint during pending request and post-confirm invalidation.
- Offline mutation controls disabled without affecting note journal.
- Matching versus total labels and distinct empty states.
- Mobile toolbar/Undo notice clears bottom navigation.
- Reduced-motion and virtualized focus behavior.

### 19.6 Browser E2E

Required protected-environment flows:

- desktop Inbox triage, List/Board switching, cross-column drag and Move to equivalence;
- keyboard-only move, batch, archive, restore, Undo, menus, focus, and live regions;
- two-tab CAS conflict and BroadcastChannel convergence;
- network loss after send and idempotent reconciliation;
- item detail/note edit/status/return continuity;
- mobile 390×844 processing, batch, detail, archive/restore without drag;
- 100-row visible selection with two stale items and explicit partial result;
- 5,000 dormant history, recent-30-days enrollment, and no silent legacy stock;
- source deletion and taxonomy change while focused/filtered; and
- offline loaded view with every mutation disabled.

### 19.7 Accessibility and manual validation

- Automated semantic/axe scan after direct dependency approval.
- 200% zoom, high contrast, reduced motion, keyboard, screen-reader announcements, focus under virtualization, and 44×44 mobile targets.
- Manual VoiceOver, NVDA/equivalent, and TalkBack task runs because automated checks cannot validate the complete dynamic workflow.

### 19.8 Performance, security, and rollback tests

- 10k/50k cold/warm query and metrics benchmarks with `EXPLAIN QUERY PLAN` snapshots.
- Concurrent worker/write contention and batch lock duration.
- Migration on production-size backup with before/after manifests.
- Unauthorized/cross-origin/cursor tamper/body abuse tests.
- Flags-off deploy and client pending rollback.
- Forward emergency trigger-disable rehearsal and backup restore procedure review.

## 20. Rollout, rollback, and observability

### Flags

- `ITEM_WORKFLOW_UI_ENABLED` — read/navigation surfaces.
- `ITEM_WORKFLOW_WRITE_ENABLED` — moves/archive/restore/Undo/batch.
- `ITEM_WORKFLOW_ENROLLMENT_ENABLED` — legacy enrollment.

Flags fail closed. Schema/current initialization remains additive while UI is off.

### Staged rollout

1. Prototype and acceptance validation only; no production schema.
2. Rehearse migration/queries on a recent production-size backup.
3. Deploy schema and initialization with all UI/write/enrollment flags off.
4. Verify new captures enter Inbox and all legacy rows remain dormant.
5. Enable read-only owner dogfood; validate counts, metrics, filters, and latency.
6. Enable individual moves/detail/Undo; monitor conflicts, unknown outcomes, and failures.
7. Enable Inbox/List batch and archive/restore.
8. Enable Board drag/virtualization only after accessibility/performance gates.
9. Enable selected/recent enrollment; enable all-history only after resume rehearsal.
10. Promote navigation and update living wiki only after verified release.

### Rollback

- Disable write, enrollment, and UI flags first.
- Reconcile every pending client item to last confirmed server state on `503`/flag change.
- Leave applied additive migration and data intact; do not down-migrate or rebuild `items` during incident response.
- If initialization trigger threatens capture, back up and ship a forward migration that disables only the problematic workflow trigger while retaining safe default columns.
- Restore a database backup only for proven corruption and revalidate FTS/vector/artifact manifests.
- Existing Library/capture/search/Ask paths remain functional with UI off.

### Content-free observability

- Route/query/metrics latency and normalized result code.
- Mutation confirmed/replayed/conflict/invalid/unknown/network/server result.
- Batch per-class counts and duration.
- Enrollment run progress/duration/error code.
- Migration before/after counts/integrity timing.
- Visible/loaded card counts and count-query duration.

Optional attempt instrumentation is local, owner-approved, and purged after 30 days. Canonical history is not an operational log.

## 21. Milestones and exit gates

| Milestone | Deliverables | Exit gate |
|---|---|---|
| M0 — Council ADR | Aggregate, dormant enrollment, archive matrix, metrics, no-rank, partial batch | Blocking decisions signed; prototype inputs reconciled |
| M1 — Persistence | Migration, fields, events/Undo link, constraints, initialization, enrollment repository | Migration/integrity/capture-default suites green on production-size fixture |
| M2 — Domain and read model | Mutation repository, queries, filters, counts, cursors, metrics | CAS/idempotency/count parity and performance budgets pass |
| M3 — Trusted APIs | Read/summary/version/mutation/batch/enrollment routes, auth, flags | Security/route/partial-batch/unknown-outcome tests pass |
| M4 — Inbox/List/detail | Inbox-first UI, Move to, focus, selection, context return, metrics header | Keyboard/mobile/failure/note-continuity scenarios pass |
| M5 — Archive and enrollment | Archive/restore/reprocess, Archived view, selected/recent/all runs | Downstream archive matrix and resume/idempotency pass |
| M6 — Board and scale | Status-only drag, independent columns, virtualization, multi-tab | A11y/performance/two-tab gates pass; no rank code/schema |
| M7 — E2E and release rehearsal | Browser suite, screen readers, migration/rollback rehearsal | Zero P0 failures; documented residual risks accepted |
| M8 — Staged rollout | Flag ramp, dogfood baseline, living docs after verification | Owner sign-off and rollback evidence |

## 22. Acceptance trace inputs

### Power-user scenarios

| Input | v1 technical trace |
|---|---|
| PWF-01 | Inbox page/count API, individual CAS, confirmed removal/focus, first effective Triaged metric. |
| PWF-02 | `undo_of_event_uuid`, effective-event query, ordinary return/re-exit distinction. |
| PWF-03 | Manual-tag + AI-topic ID facets, matching counts, unfiltered total. “AI category” input is normalized to AI topics per architecture evidence. |
| PWF-04 | URL query state, local view choice, in-memory selection, session anchor. |
| PWF-05 | **Adapted:** keyboard Move to In Progress is required; reorder-to-top is deferred because v1 has no manual rank. Focus/announcement portion remains acceptance. |
| PWF-06 | Eligibility preview plus explicit per-item partial batch outcomes; no silent skip. |
| PWF-07 | 100-item partial batch: 98 committed/replayable, 2 conflicts selected, Undo targets confirmed subset. Destination order is status-change/visible response order, not persisted manual rank. |
| PWF-08 | Per-item CAS/409/current snapshot and two-tab E2E. |
| PWF-09 | Unknown-outcome state, authoritative GET/replay, no duplicate event. |
| PWF-10 | Independent note journal, detail control, validated return/next anchor. |
| PWF-11 | Archive/linked Undo/durable restore; downstream content unchanged. |
| PWF-12 | Batch restore to Done and explicit two-event reprocess. |
| PWF-13 | Topic refresh changes result/count only; versioned workflow unchanged. |
| PWF-14 | 404 reconciliation and stable next focus. |
| PWF-15 | 390×844 semantic parity, no drag requirement, bottom-nav clearance. |
| PWF-16 | Loaded read-only state; all mutations online-only and unqueued. Reorder control is absent rather than merely disabled. |
| PWF-17 | Server count distinguishes no matches from empty Inbox. |
| PWF-18 | Fresh Processing navigation versus Back/bookmark URL behavior. |
| PWF-19 | Dormant 5,000-row baseline, explicit recent enrollment, no fabricated milestones. |

### Metrics scenarios

| Inputs | v1 technical trace |
|---|---|
| Metrics 1–3 | New capture/Recall initialization and duplicate/upgrade preservation matrix. |
| Metrics 4 | **Corrected by dormant decision:** migration baselines 500 but active Inbox remains unchanged; explicit enrollment changes Inbox stock. No Added/Triaged/Completed/duration fabrication. |
| Metrics 5–11 | First effective Triaged/Completed, re-entry, linked Undo, direct Inbox-to-Done. |
| Metrics 12–16 | Archive/restore/Undo, failed optimistic attempts, replay, partial bulk first exits with shared batch ID. |
| Metrics 17 | Privacy-first hard-delete cascade and recomputation. |
| Metrics 18–21 | Owner timezone, midnight/Monday boundaries, DST, timezone rebucketing. |
| Metrics 22–24 | Total versus matching counts, empty states, taxonomy-change independence. |
| Metrics 25–27 | Duration sample gates/median/average and zero-denominator ratio. |
| Metrics 28 | Workflow-only archive scope and downstream eligibility. |
| Metrics 29 | Exactly-one CAS winner and no loser metric event. |
| Metrics 30 | Optional instrumentation disable/purge cannot affect canonical workflow or metrics. |

## 23. Risks, unresolved blockers, and mitigations

| Priority | Risk/blocker | Mitigation or decision gate |
|---|---|---|
| P0 | Wrong aggregate (`cards` instead of `items`) | ADR and code/API naming use item workflow; migration attaches to `items`. |
| P0 | Silent legacy backlog | `workflow_enrolled_at` required in every Processing stock/query; migration/5k E2E proves dormancy. |
| P0 | Capture missed/reset state | DB default/trigger plus full ingestion and duplicate/upgrade matrix. |
| P0 | Lost updates or duplicate events | CAS, mutation hash/idempotency, current snapshot in `409`, unknown-outcome reconciliation. |
| P0 | Undo corrupts milestone metrics | Required `undo_of_event_uuid`, latest-event validation, effective-event tests. |
| P0 | Archive scope changes retrieval truth | Council must approve workflow-only matrix before production work. |
| P1 | Partial batch semantics increase route/retry complexity | Reuse per-item mutation, batch receipt, max 100, explicit classifications, lost-response E2E. |
| P1 | Central migration/insert trigger affects capture/FTS/workers | Production-size backup rehearsal, trigger-count tests, flags-off deployment, forward-disable plan. |
| P1 | Count/filter joins are slow or wrong | One predicate builder, stable IDs, `EXISTS`/CTEs, plan assertions, 50k budgets. |
| P1 | Oldest Inbox age with linked Undo is expensive | Benchmark indexed event query; add reviewed current projection only if gate fails. |
| P1 | Virtualization loses focus or breaks drag | Dependency spike, focus-aware overscan, status-only drop, manual/screen-reader tests. |
| P1 | Direct E2E/a11y tooling not supported in CI | Approve direct dependencies/browser binaries before M4; keep release gate manual if CI is unavailable. |
| P1 | Item detail return conflicts with note navigation safety | Reuse current note guard; no drawer/remount; dedicated E2E. |
| P1 | Hard delete causes metrics to decrease | Privacy-first behavior documented; no anonymous rollup without retention decision. |
| P2 | AI topic/category language remains confusing | Council copy decision; API stays stable IDs and separate manual/topic facets. |
| P2 | Owner timezone is unset/changes | Explicit settings initialization, no host timezone, boundary tests. |
| P2 | Cross-device view is stale | Focus/online/poll refresh plus CAS; no server push in v1. |
| P2 | Mobile navigation placement is unresolved | Start through More/Library summary; promote only with prototype evidence. |
| P2 | No manual rank disappoints power users | Label actual sort, validate usage, reserve separate future rank ADR; no fake priority copy. |
| P2 | Optional operational analytics expands privacy surface | Off by default, local/content-free, 30-day purge, owner approval. |

## 24. v1 definition of done

V1 may move from **Explored** to an implementation/release status only when:

1. all blocking council decisions are recorded;
2. migration rehearsal and rollback evidence exist;
3. every creation/duplicate/upgrade path passes the workflow matrix;
4. CAS/idempotency/Undo/partial-batch semantics pass unit, integration, and two-tab E2E;
5. dormant legacy enrollment and metrics are correct on 5k/50k fixtures;
6. read/count/summary and interaction performance budgets pass;
7. keyboard, screen-reader, reduced-motion, virtualization, and mobile acceptance pass;
8. Library/search/Ask/Review/export behavior matches the approved archive matrix;
9. workflow mutations remain safe when offline, unknown, flags-off, or session-expired;
10. no `workflow_rank`, manual reorder, task-management scope, or third-party analytics has entered v1; and
11. the living wiki is updated only after verified implementation and rollout.

## 25. Final technical recommendation

Implement v1 in the order of persistence correctness, read/count correctness, trusted individual mutations, Inbox/List/detail continuity, archive/enrollment, then Board/virtualization. The critical path is not drag-and-drop; it is an honest Inbox admission model, first-event metrics with linked Undo, compare-and-swap writes, and place-preserving failure recovery.

The recommendation remains **dormant legacy baseline plus explicit enrollment**, current workflow fields on `items`, append-only content-free events, separate archive, and deterministic ordering with **no manual rank in v1**. This document is **Explored — not implemented**.
