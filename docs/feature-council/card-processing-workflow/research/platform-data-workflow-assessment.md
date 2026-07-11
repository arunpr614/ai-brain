# Card Processing Workflow: Platform and Data Assessment

**Council role:** Product Manager — Platform and Data

**Artifact status:** Discovery recommendation; no production implementation is claimed

**Repository baseline inspected:** `1cb5d36f37611e60442b4f2c4433b45455273500` (2026-07-11)

**Wiki baseline inspected:** `88a3520038703108a0533501c7a384c6def7b74e` (2026-07-11)

**Decision scope:** persistence, migrations, ingestion defaults, taxonomy boundaries, lifecycle, retrieval/filtering, API/state contracts, metrics, concurrency, and platform risk

## Executive recommendation

Model processing as a new lifecycle on the existing `items` aggregate, not on the existing `cards` table and not as tags. Add four current-state fields to `items`—`workflow_status`, `workflow_version`, `workflow_status_changed_at`, and `archived_at`—plus a durable `workflow_initialized_at` and an append-only `item_workflow_events` table. Use the database default `inbox` so every creation channel is covered even if an application caller forgets the field. Backfill all existing items into Inbox, but label the initialization as `legacy_backfill` and exclude it from velocity metrics.

Archive should be a nullable lifecycle timestamp, not a fifth status. Only Done items may be archived. Restore clears `archived_at` and returns the item to Done; a later move to another status is a separate, auditable action. Archive should hide an item only from the active Processing experience in the first release. Library, exact/semantic search, Ask, exports, and the original item remain intact. Hard delete remains the privacy-destructive operation and removes workflow history with the item.

The first release should support moving between columns but not manual reordering within a column. Use deterministic ordering by `workflow_status_changed_at DESC, captured_at DESC, id`. This avoids rank collisions and column-wide rebalances while the product learns whether manual priority is genuinely useful. If council requires intra-column ordering now, treat it as a separate schema and concurrency feature, not a side effect of drag-and-drop.

For the AI-generated filter, expose **AI Topics** (`topics`/`item_topics`) rather than the legacy auto-tag rows or the single `items.category` value. Current enrichment writes all three representations from related output, so calling all of them “AI category tags” would create an unstable contract.

## Evidence method

- **Confirmed** means directly supported by current repository code or the current living wiki.
- **Inference** means the behavior follows from code paths but is not named as a product contract.
- **Recommendation** is the proposed feature model, not current behavior.
- File citations use repository-relative or wiki-relative `file:line` notation. The current repository has no source changes after the wiki's pinned code baseline (`23868f...`), so the cited living-wiki implementation claims and inspected code describe the same source tree.

## Confirmed current-state facts

### 1. The captured-card aggregate is `items`; `cards` means something else

**Confirmed.** `items` contains captured source identity, original content, generated fields, capture provenance/quality, timestamps, and enrichment state (`src/db/migrations/020_recall_sync.sql:12-40`). `ItemRow` mirrors those fields and has no workflow or archive attribute (`src/db/client.ts:167-205`).

**Confirmed.** The pre-existing `cards` table is an SRS/review-card schema with `question`, `answer`, learning `state`, due date, interval, ease, reps, and lapses (`src/db/migrations/001_initial_schema.sql:81-97`). The living wiki explicitly says this table is only a review substrate and that no spaced-repetition product implementation was found (`Data-Model.md:12-24`).

**Platform implication.** In the feature brief, “card” is product language for a captured item. Persisting this workflow on `cards` would create one workflow record per study prompt rather than per saved source, orphan non-SRS items, and collide with a future learning feature. Code and API names should therefore use `itemWorkflow`; UI copy may continue to say “card.”

### 2. Current `status` concepts are processing states, not user workflow

**Confirmed.** `items.enrichment_state` is limited to `pending`, `running`, `batched`, `done`, and `error` and describes AI enrichment (`src/db/migrations/020_recall_sync.sql:21-24`). Embedding, transcript, note-index, Telegram, Recall, and provider modules each have separate operational state machines. The wiki treats capture save, enrichment, embeddings, transcript recovery, note save/indexing, Recall, and backups as isolated failure domains (`APIs-and-Integrations.md:43-45`).

**Recommendation.** Never overload `enrichment_state` or use an unqualified `status` field. The new lifecycle is `workflow_status`; API DTOs use `workflowStatus`.

### 3. All production item creation paths converge on `insertCaptured`

`insertCaptured` is the canonical repository insert. It generates identity, defaults `captured_at` to now, defaults `capture_source` to `web`, inserts the item, and returns the stored row (`src/db/items.ts:54-89`). Its SQL explicitly names the current columns, making a database-level default on a newly added `workflow_status` column effective without changing every caller on day one (`src/db/items.ts:59-87`).

| Creation path | Confirmed creation behavior | Workflow implication |
|---|---|---|
| Web manual note | `createNoteAction` calls `createNote`, which calls `insertCaptured` (`src/app/actions.ts:19-35`; `src/db/items.ts:91-101`). | DB default covers it. |
| Web URL capture | Server action extracts then calls `insertCaptured` (`src/app/capture-actions.ts:42-74`). | DB default covers it. |
| Web/PDF capture | PDF action extracts then calls `insertCaptured` (`src/app/capture-actions.ts:104-142`). | DB default covers cookie and bearer route because the route delegates to this action. |
| Android/extension note API | Authenticated note route calls `insertCaptured` with trusted capture source (`src/app/api/capture/note/route.ts:57-100`). | DB default covers clients without an API-version break. |
| Android/extension URL API | New URL path calls `insertCaptured` (`src/app/api/capture/url/route.ts:338-354`). | DB default covers it. |
| Telegram URL | Telegram dispatch calls the same repository with `capture_source: telegram` (`src/lib/telegram/dispatch.ts:358-374`). | DB default covers it. |
| Telegram text note | Telegram dispatch calls the same repository (`src/lib/telegram/dispatch.ts:473-507`). | DB default covers it. |
| Telegram PDF | Telegram dispatch extracts then inserts (`src/lib/telegram/dispatch.ts:551-594`). | DB default covers it. |
| Recall import | Guarded importer inserts the mapped item and sync row in one transaction (`src/lib/recall/importer.ts:146-165`). Mapper sets `captured_at` to import time, not Recall's original creation time (`src/lib/recall/mapper.ts:55-71`). | Counts as added to AI Brain at import time; preserve Recall source date separately. |
| User transcript upload/paste | Updates an existing YouTube item and returns `action: upgraded` (`src/app/api/capture/transcript/route.ts:156-177`). | Must retain existing workflow/archive state. It is not a new Inbox item. |

**Confirmed.** URL duplicate and content-upgrade paths reuse the existing item identity rather than creating a second row (`src/app/api/capture/url/route.ts:300-334`). `findItemByUrl` currently considers every matching item and has no lifecycle predicate (`src/db/items.ts:347-356`).

**Recommendation.** A duplicate share or content repair must never silently reset status or unarchive. If the matched item is archived, return `archived: true` in the capture result and offer an explicit restore action. An upgrade to archived content may proceed but remains archived. This policy prevents a background Recall import or repeated share from undoing user lifecycle choices.

### 4. Current deletion is hard and irreversible in application state

**Confirmed.** `deleteItem` removes filesystem artifacts, vector/chunk rows, persisted messages citing a manual note, and finally the parent `items` row inside a transaction (`src/db/items.ts:280-289`). Relational children use cascading foreign keys, including tags, collections, SRS cards, chunks, and attached-note state (`src/db/migrations/001_initial_schema.sql:39-118`; `src/db/migrations/022_item_notes.sql:7-30`).

**Confirmed.** Item detail and Review offer hard delete; mobile item detail submits it directly with no confirmation state in that component (`src/app/items/[id]/page.tsx:1157-1169`; `src/app/review/actions.ts:12-21`). Bulk delete loops through `deleteItem` in a transaction (`src/app/actions.ts:174-194`). There is no item archive repository or archive field in the current source.

**Confirmed.** Attached-note deletion is a different, stronger no-loss pattern: it removes current note/revisions but leaves a content-free epoch/generation tombstone to block delayed offline resurrection (`src/db/migrations/022_item_notes.sql:1-13`; `src/db/item-notes.ts:467-515`). That is precedent for lifecycle correctness, not current item archive behavior.

**Recommendation.** Keep hard delete distinct from archive. Workflow events should reference `items(id) ON DELETE CASCADE`; after hard deletion, historical productivity metrics recomputed from events may decrease. That privacy-first consequence must be documented. If immutable historical totals are later required, add anonymous daily rollups only after an explicit retention decision.

### 5. User tags, generated tags, topics, and category are distinct—but enrichment currently duplicates concepts

**Confirmed.** The original tag model is a shared many-to-many namespace with `kind IN ('manual','auto')` (`src/db/migrations/001_initial_schema.sql:67-79`). Tags are canonicalized by lowercasing and replacing spaces with hyphens (`src/db/tags.ts:1-17`). Re-enrichment clears auto-tag joins but preserves manual tags; promoting an auto tag flips the shared tag row to manual (`src/db/tags.ts:56-79`).

**Confirmed.** AI topics have dedicated `topics` and `item_topics` tables with confidence/evidence and detection timestamps (`src/db/migrations/017_topics.sql:1-24`). The item detail page deliberately filters the tag editor to manual tags and fetches topics separately (`src/app/items/[id]/page.tsx:208-213`).

**Confirmed.** Enrichment writes a single free-text `items.category`, creates auto tags for every generated tag, and then replaces topics using that same generated tag list (`src/lib/enrich/pipeline.ts:219-249`; batch equivalent at `src/lib/queue/enrichment-batch.ts:259-287`). The living wiki accurately distinguishes category, tags, topics, and collections but also notes that generated taxonomy may require backfill/reclassification review (`Organization-Tags-Topics-and-Collections.md:12-19`, `:27-35`).

**Source-language conflict.** The feature brief says “AI-generated category tags,” while current storage has three plausible meanings:

1. `items.category`: one enrichment classifier, not a tag join.
2. `tags(kind='auto')`: generated rows in the same namespace as user tags.
3. `topics`/`item_topics`: generated concepts already separated in product UI and capable of evidence metadata.

**Recommendation.** Define the feature's two filter dimensions as **User tags** = `tags.kind='manual'` and **AI topics** = `topics`/`item_topics`. Treat `items.category` as display/classification metadata and the current auto-tag joins as legacy/generated enrichment substrate, not the new public filter contract. Do not join filters merely by tag name: promotion can change a globally shared tag from auto to manual (`src/db/tags.ts:72-79`).

### 6. Current Library filtering and search are too narrow for the proposed board

**Confirmed.** Library supports source, quality, and one normalized tag. Dimensions combine with SQL `AND`; the tag subquery does not restrict tag kind (`src/db/items.ts:125-225`). Results are chronological, capped at 100 on the page, while count queries are separate (`src/db/items.ts:228-268`; `src/app/library/page.tsx:72-81`). The client then applies a second in-memory quality filter to only those loaded rows (`src/components/library-list.tsx:106-117`, `:196-213`, `:380-405`).

**Confirmed.** Exact item search uses FTS over title/body and has no source, taxonomy, lifecycle, or archive predicate (`src/db/items.ts:359-384`). Unified search adds manual-note FTS and semantic/hybrid retrieval, then returns de-duplicated item rows (`src/lib/search/index.ts:56-92`, `:94-137`). The API accepts only query, search mode, and limit (`src/app/api/search/route.ts:21-53`).

**Recommendation.** Build a dedicated workflow query repository rather than extending the Library's current single-tag options object until it becomes ambiguous. It should provide:

- active/archived scope;
- zero or more workflow statuses;
- zero or more manual tag IDs, explicitly constrained to `kind='manual'`;
- zero or more topic IDs;
- optional text query;
- cursor pagination and per-status counts from the same filter predicate.

Use **OR within a dimension and AND across dimensions**: `(manual tag A OR B) AND (topic X OR Y) AND text query`. Add explicit `No user tags` and `No AI topics` predicates rather than representing missing labels as fake tags. Counts displayed on a filtered board should be filtered counts; if overall counts are useful, label both values rather than silently mixing them.

Archive scope in phase one is workflow-only: archived items are excluded from active board/list queries but remain in Library/search/Ask/export. Add an `Archived` badge when such an item appears outside Processing. A later “archive means hidden everywhere” choice would require coordinated predicates in FTS, semantic retrieval, Related, every Ask scope, Review, exports, duplicate detection, and direct item navigation; it is not a safe implicit change.

### 7. Existing API and concurrency patterns are uneven

**Confirmed.** The application uses synchronous `better-sqlite3`, one singleton connection per Node process, WAL, foreign keys, and `synchronous=NORMAL` (`src/db/client.ts:1-72`). WAL reduces reader/writer contention but does not resolve two clients making semantically conflicting moves.

**Confirmed.** Many browser mutations are server actions with Zod validation and transactions. Bulk selection caps input at 500 IDs and validates existence (`src/app/actions.ts:45-80`). However, destructive item server actions do not explicitly verify the session inside the action (`src/app/actions.ts:38-43`, `:174-194`), while the wiki states destructive actions require authenticated server actions (`Library-and-Item-Management.md:12-18`). Page authentication and framework transport protections are not a substitute for an explicit mutation authorization gate in a new JSON route.

**Confirmed.** Attached notes provide the strongest reusable state convention: epoch/generation compare-and-swap, mutation IDs and request hashes for idempotency, a `409` response carrying the current snapshot, and cross-tab notification (`src/db/item-notes.ts:132-167`, `:336-456`; `src/lib/notes/api.ts:35-63`; `src/components/manual-note-editor.tsx:284-303`). Note APIs are authenticated, same-origin for writes, dynamic, private, and `no-store` (`src/app/api/items/[id]/note/route.ts:36-76`; `src/lib/notes/http.ts:3-18`).

**Recommendation.** Reuse the note pattern in smaller form for workflow writes: per-item integer version, client mutation UUID, transactional compare-and-swap, current state in a `409`, same-origin/session checks, private/no-store responses, and cross-tab invalidation. Do not depend on last-write-wins.

### 8. There is operational logging and usage accounting, but no durable product analytics system

**Confirmed.** `llm_usage` records provider/model/purpose/token/cost data (`src/db/migrations/001_initial_schema.sql:120-133`). Capture decisions and errors are appended to a rotating JSONL error sink; it rotates at 5 MB and swallows filesystem failures (`src/lib/errors/sink.ts:20-40`). The wiki explicitly calls existing operational signals “not centralized product analytics” (`Deployment-and-Operations.md:16-18`).

**Recommendation.** Do not compute workflow metrics from JSONL. The content-free workflow event table should be the durable source for user-facing metrics and audits. Any future external analytics emission needs a separate privacy decision; event payloads must exclude title, body, URL, note text, query text, summary, and tag/topic names.

## Proposed product and data contract

### Status meanings

| Stored value | Display label | Product meaning | Entry/exit rule |
|---|---|---|---|
| `inbox` | Inbox | Captured but not yet triaged in the processing workflow. | Every newly inserted item and all launch backfill items begin here. |
| `todo` | To Do | Reviewed; the owner intends to act later. | May move from or to any active status. |
| `in_progress` | In Progress | The owner is actively working with the item. | May move from or to any active status. |
| `done` | Done | Processing is complete and no immediate action remains. | Only this status is eligible for archive. |

Backward moves are permitted. They are corrections or reprocessing, not data errors. Undo is another compare-and-swap transition and must create its own history event.

### Archive invariants

- `archived_at IS NULL` means active in Processing.
- `archived_at IS NOT NULL` requires `workflow_status='done'`.
- Archive never mutates original source content, generated digest, tags, topics, collections, notes, chunks, or vectors.
- Restore clears `archived_at` and leaves status at Done.
- Returning a restored item to Inbox/To Do/In Progress is a second explicit transition.
- Status moves while archived are rejected; restore first.
- Duplicate capture, repair, enrichment, transcript recovery, and Recall synchronization preserve workflow/archive state.
- Hard delete remains available and cascades workflow history.

### Recommended current-state columns on `items`

| Column | Type/default | Purpose |
|---|---|---|
| `workflow_status` | `TEXT NOT NULL DEFAULT 'inbox'` with allowed-value check | Canonical current active status; database default covers every ingestion path. |
| `workflow_version` | `INTEGER NOT NULL DEFAULT 1` | Compare-and-swap token for multi-tab/device writes. |
| `workflow_initialized_at` | `INTEGER NOT NULL DEFAULT 0`, normalized by insert trigger | When the item entered the workflow model. New items use insert time; legacy items use `captured_at` but are marked as backfill. |
| `workflow_status_changed_at` | `INTEGER NOT NULL DEFAULT 0`, normalized by insert trigger | Stable ordering and current-state age. |
| `archived_at` | nullable `INTEGER` | Separate archive lifecycle; null is active. |

Indexes:

- `(archived_at, workflow_status, workflow_status_changed_at DESC, id)` for board columns and counts;
- `(workflow_initialized_at)` for additions/backlog cohorts;
- existing taxonomy join indexes remain usable, but topic and manual-tag filtering must use distinct joins/aliases.

Do not add `completed_at` or `processed_at` as independent writable truth in phase one. They can drift when cards move backward. Derive milestones from the event stream; add validated rollups only if query cost warrants it.

### Recommended `item_workflow_events`

| Field | Purpose |
|---|---|
| `id INTEGER PRIMARY KEY AUTOINCREMENT` | Total event order inside this SQLite database. |
| `event_uuid TEXT NOT NULL UNIQUE` | Stable API/export identity. |
| `item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE` | Privacy-aligned ownership. |
| `item_version INTEGER NOT NULL` | Version created by this event; unique with `item_id`. |
| `event_type TEXT` | `initialized`, `status_changed`, `archived`, or `restored`. |
| `from_status`, `to_status` | Nullable for initialization; checked workflow values otherwise. |
| `from_archived_at`, `to_archived_at` | Captures archive/restore delta. |
| `mutation_id TEXT UNIQUE` | Idempotency across retries; null only for migration/DB initialization. |
| `actor_channel TEXT` | `web`, `android`, `system`, or `migration`; no person/profile model is implied. |
| `origin TEXT` | `capture`, `user`, `undo`, or `legacy_backfill`; allows metric exclusion. |
| `occurred_at INTEGER NOT NULL` | UTC epoch milliseconds for calendar metrics. |

Use `UNIQUE(item_id, item_version)`. A transition transaction must:

1. Validate requested transition and archive invariant.
2. `UPDATE items ... workflow_version = workflow_version + 1 WHERE id=? AND workflow_version=?`.
3. Require exactly one changed row; otherwise return conflict with current state.
4. Insert the corresponding event with the new version and mutation ID.
5. Commit current state and history atomically.

### Ordering within a column

**Phase-one recommendation:** no manual order. Sort active columns by `workflow_status_changed_at DESC`, then `captured_at DESC`, then `id`. A drag may change status but not create an unspoken priority rank. List and board use the same ordering.

**If manual priority becomes required:** add `workflow_rank INTEGER` with wide gaps and deterministic `id` tie-break; rebalance only one status column in a short transaction. Rank changes need their own mutation/event contract and conflict tests. Do not use floating-point midpoint ranks indefinitely: precision collapse and simultaneous midpoint choices create nondeterminism.

## Migration options

| Option | Model | Benefits | Costs/risks | Council disposition |
|---|---|---|---|---|
| A. Add current fields to `items` plus event table | Recommended model above | Fast list/count reads; DB default covers every insert; item lifecycle is co-located with canonical aggregate; history supports metrics and audit. | Adds fields to a central table; every typed row/export decision must be reviewed; backfill/event volume must be rehearsed. | **Recommend.** |
| B. One-to-one `item_workflow_state` plus event table | State is joined by `item_id`. | Isolates feature schema and makes rollback-by-ignore easier. | Every board, detail, duplicate, and filter query needs a join; missing row has ambiguous semantics; insert initialization can drift without a trigger; current state fetch is more complex. | Viable only if organizational ownership requires strict separation. |
| C. Nullable/lazy status with `COALESCE(status,'inbox')` | New items initialized; old items interpreted at read time. | Smallest launch write and fast migration. | Permanent dual semantics; missing rows/values poison counts, CAS, filters, and history; later backfill is harder; “Inbox” is not actually persisted. | Reject. |
| D. Archive as fifth workflow status | `archived` added to status enum. | Fewer columns. | Loses the prior completion state, makes restore ambiguous, conflates visibility with work state, weakens completion history, and violates the feature brief's key distinction. | Reject. |
| E. Reuse tags or collection | Status/archive encoded as labels/groups. | No migration. | Re-enrichment/user edits can change state; cannot enforce one status, archive timestamp, CAS, ordering, or history; filters collide with taxonomy. | Reject. |

### Recommended additive migration sequence

Use the next lexicographic migration name (`024_...`). Current migration execution is lexicographic by full filename and the repository already has duplicate `017_` prefixes, which the wiki calls a tooling/human hazard (`src/db/client.ts:114-150`; `Data-Model.md:25-27`). Do not renumber existing files.

1. Add the five item columns with constant SQLite-safe defaults.
2. Create `item_workflow_events`, indexes, allowed-value triggers, and archive invariant triggers.
3. Backfill current rows to Inbox with `workflow_initialized_at=captured_at` and `workflow_status_changed_at=captured_at`.
4. Insert one `initialized` event per legacy item with `origin='legacy_backfill'`, `actor_channel='migration'`, and migration-time `occurred_at`. Do not pretend the workflow existed at capture time.
5. Add an `AFTER INSERT` initialization trigger that replaces zero timestamp sentinels with insert time and writes the `origin='capture'` initialization event. This protects future direct/import callers in addition to `insertCaptured`.
6. Update `ItemRow` and the item repository DTO only after the schema exists; retain explicit database defaults.
7. Rehearse against a production-size snapshot, validate `integrity_check`, `foreign_key_check`, event/item counts, indexes, FTS counts, vector bridge integrity, and rollback-by-feature-disable. Applied structural migrations are not down-migrated; the living operations guide confirms rollback cannot reverse applied migrations (`Deployment-and-Operations.md:20-24`).

**Backfill metric rule:** legacy items count in current Inbox backlog and status counts. They do not count as “added today,” “processed,” “completed,” or duration samples until a real post-launch user transition occurs. Show legacy Inbox age from original `captured_at`, but label aggregate duration cohorts as post-launch until sufficient new data exists.

## API and client-state proposal

### Read contract

`GET /api/workflow/items?scope=active|archived&status=...&manualTagId=...&topicId=...&q=...&cursor=...&limit=...`

Response:

- `items`: current workflow DTOs plus the existing compact item fields;
- `nextCursor`;
- `filteredCountsByStatus` computed from the same predicate without page limit;
- `activeInboxCount` for the primary backlog indicator;
- `snapshotAt` for debugging freshness.

Cursor should encode `(workflow_status_changed_at, captured_at, id)` rather than use offset pagination; cards moving while paging otherwise cause duplicates/skips. Cap page size. Current Library's 100-row cap and Review's 300-row cap are not adequate backlog strategies (`src/app/library/page.tsx:72-80`; `src/app/review/page.tsx:76-84`).

### Mutation contract

`PATCH /api/items/:id/workflow`

```json
{
  "mutationId": "uuid",
  "expectedVersion": 7,
  "operation": "changeStatus",
  "workflowStatus": "in_progress",
  "actorChannel": "web"
}
```

Operations: `changeStatus`, `archive`, `restore`. Derive actor channel from trusted request context where possible rather than accepting arbitrary client claims.

Success returns the complete current workflow snapshot and `replayed`. Error conventions:

- `400` malformed body/enum;
- `401` unauthenticated;
- `403` cross-origin mutation;
- `404` item absent;
- `409 WORKFLOW_CONFLICT` with current snapshot;
- `422 WORKFLOW_TRANSITION_INVALID` (for example archive outside Done);
- `503 WORKFLOW_WRITE_DISABLED` during staged rollout;
- `500` content-free internal failure.

Responses should be private/no-store. The server must validate session and exact origin inside the route. Provide a bulk transition route only after individual semantics are stable; copy the existing 500-ID cap and all-or-nothing existence validation, but use one transaction and one event per item.

### Optimistic UI and multi-tab behavior

- Update the dragged card optimistically and mark it pending.
- On success, replace it with the canonical returned snapshot.
- On network/5xx failure, restore the prior location and offer Retry.
- On `409`, show the current server status and offer “Use current” or retry the intended move from the new version; never silently overwrite.
- Broadcast successful mutations with `BroadcastChannel` and revalidate stale cards/counts, following the manual-note precedent (`src/components/manual-note-editor.tsx:284-303`).
- Keep filters/view choice in URL or the existing `settings` key-value store, not only component state. A board/list switch should not change the query snapshot or filter semantics.

## Metric definitions

All timestamps are stored as UTC epoch milliseconds. “Today” and “week” boundaries must be calculated in an explicit owner timezone saved in settings; never use host timezone implicitly. Week starts Monday unless product copy/configuration says otherwise.

| Metric | Exact definition | Inclusion/exclusion |
|---|---|---|
| Current Inbox backlog | Count of items where `archived_at IS NULL AND workflow_status='inbox'`. | Includes legacy backfill and filtered/weak sources; a filtered-board count is separately labeled. |
| Current status count | Count of active items per status. | Archived excluded. Filtered counts use the identical active filter predicate. |
| Cards added today | Count of `initialized` events in today's owner-timezone window where `origin='capture'`. | Recall imports count when imported; legacy backfill excluded; duplicates/upgrades excluded. |
| Cards processed today/week | Distinct `(item_id, inbox_cycle)` whose first real event from `inbox` to a non-Inbox status falls in the window. | Initialization and `legacy_backfill` excluded. Re-entering Inbox starts a new cycle; each cycle can be processed once. |
| Cards completed today/week | Distinct item IDs with a real `status_changed` event from a non-Done status to `done` in the window. | Archive alone is not completion. Multiple completions for one item within the same window count once. |
| Cards archived | Count of `archived` events in the window, plus current archive size as a separately labeled stock metric. | Restore does not erase the past event. Hard deletion removes the item's event history in phase one. |
| Average time in Inbox | Mean of `first exit from Inbox - inbox cycle start` for processed cycles in the selected period. | Exclude legacy cycles until a real post-launch re-entry starts a measurable cycle. Report sample size. |
| Average time to first completion | Mean of `first Done event - capture initialization` for post-launch items completed in the period. | Exclude legacy backfill and deleted items; do not reset on backward moves. |

`inbox_cycle` can be derived by windowing ordered events: initialization or every later transition into Inbox begins a cycle, and the first subsequent exit processes it. If this query is too expensive at real volume, maintain a tested content-free daily rollup or explicit cycle number in events; do not weaken the definition.

The primary dashboard should show current Inbox backlog, processed today/week, and completed today/week. “Any workflow transition” is not “processed”; it rewards churn and should not be a headline metric.

## Search, archive, and downstream behavior matrix

| Downstream | Active item | Archived item | Hard-deleted item |
|---|---|---|---|
| Processing board/list | Visible by status/filter. | Hidden from active; visible in Archive. | Absent. |
| Library/item detail | Visible. | Visible with Archived badge and restore link. | Absent/404. |
| Exact/semantic search | Eligible under current rules. | Still eligible; result badge discloses archived workflow state. | Removed through existing item/FTS/vector cleanup. |
| Ask/Related | Eligible under existing quality/index/note policy. | Still eligible in phase one. | Existing cleanup/persistence rules apply. |
| Export | Included by current Library export unless an explicit scope is added. Include workflow frontmatter only after the contract is stable. | Included and marked archived if workflow metadata is exported. | Absent. |
| Capture duplicate/upgrade | Reuses identity and preserves workflow state. | Reuses identity, preserves archive, returns restore affordance. | May create a new item because identity no longer exists. |
| Enrichment/transcript/note-index workers | Continue independently. | Continue; archive is not a processing cancellation signal. | Existing cascade/claim guards must prevent commit. |
| Review quality queue | **Council decision required.** Default recommendation is unchanged/inclusive because it is a separate capture-quality surface; show archive state. | Same until council explicitly chooses “archive suppresses Review.” | Absent. |

## Confirmed wiki alignment and source conflicts

| Claim | Assessment |
|---|---|
| Wiki: `items` is the central aggregate and separates source type from capture channel (`Data-Model.md:10-23`). | **Confirmed in code.** Workflow belongs on/with items. |
| Wiki: Library is chronological and filters by source/quality/tag (`Library-and-Item-Management.md:10-18`). | **Confirmed, with limits.** One exact tag and 100 loaded results; no lifecycle/topic filter. |
| Wiki: category, tags, topics, and collections are distinct (`Organization-Tags-Topics-and-Collections.md:12-19`). | **Confirmed.** Feature-brief phrase “AI category tags” is the conflict; use AI Topics. |
| Wiki: destructive actions require authenticated server actions (`Library-and-Item-Management.md:16-18`). | **Partially supported.** Pages are session-gated, but item delete/bulk delete actions do not perform an explicit session check inside the action. New workflow routes must. |
| Wiki: duplicate URLs reuse existing identity (`Capture-and-Ingestion.md:22-28`). | **Confirmed.** Archive policy must define how reuse of archived identity is presented. |
| Wiki: no centralized product analytics (`Deployment-and-Operations.md:16-18`). | **Confirmed.** Durable workflow events are required for metrics. |
| Wiki: migrations through `023`, duplicate `017` prefix hazard (`Data-Model.md:25-27`). | **Confirmed.** Add `024`; do not rename history. |
| Wiki: archive behavior. | **No current claim found.** Code implements hard item delete and note tombstones, not item archive. Archive/restore is net-new. |

## Risk register and validation gates

| Priority | Risk | Why it matters | Mitigation / gate |
|---|---|---|---|
| P0 | `cards` vs `items` naming collision | Implementing against the SRS table corrupts domain ownership and omits most saved sources. | ADR and code naming must state “UI card = item”; migration attaches to `items`. |
| P0 | Archive scope remains ambiguous | Hiding archived items from search/Ask/Library changes retrieval truth and touches many modules; workflow-only archive may surprise users elsewhere. | Council explicitly accepts the downstream matrix before implementation; add visible archive badges. |
| P0 | Lost updates from drag/multi-tab/device | WAL serializes writes but last-write-wins can silently reverse user intent. | Per-item version CAS, mutation idempotency, current snapshot in `409`, conflict tests across tabs. |
| P0 | Legacy backfill corrupts headline metrics | Treating migration initialization as capture/processing creates false launch-day success. | `origin='legacy_backfill'`; exclude from velocity/duration; verify metric fixtures. |
| P1 | AI taxonomy ambiguity | Current category, auto tags, and topics overlap. Filters can change after re-enrichment or tag promotion. | Public contract uses manual tags + AI topics with separate joins and IDs; generated labels can change without changing workflow. |
| P1 | Archived duplicate/upgrade behavior | Existing URL lookup will match archived items; an ordinary share could appear to vanish or silently unarchive. | Preserve archive, return state/restore CTA, add URL/Recall/Telegram tests. |
| P1 | Board scale and count drift | Existing 100-row Library and 300-row Review caps are not backlog pagination. Client-side filtering yields incomplete counts. | Dedicated cursor query; SQL counts from identical predicates; large-fixture performance tests. |
| P1 | Migration/rollback risk on central SQLite table | Structural migrations are startup-applied and not down-migrated; workers share the same process/database. | Backup and snapshot rehearsal, feature flags, additive schema, integrity/FK/vector/FTS audits, flags-off rollback. |
| P1 | Hard delete changes historical metrics | Events cascade for privacy, so past productivity counts decrease after deletion. | Disclose current-library semantics; do not add retained rollups without explicit privacy decision. |
| P1 | Inconsistent mutation auth conventions | Existing item actions lack an explicit in-action auth gate, while note routes have strong checks. | New JSON workflow route uses session + exact-origin gates; security tests for unauthorized/cross-origin calls. |
| P2 | Timezone/window errors | Server timezone may differ from owner; DST and week boundaries can shift today/week counts. | Persist owner timezone, test boundary instants and DST zones, store UTC only. |
| P2 | Manual order scope creep | Fractional ranks and simultaneous reorder introduce new conflict and rebalance behavior. | Defer intra-column reorder; deterministic status-change ordering for v1. |
| P2 | Archive and background processing expectations | Archive does not stop enrichment/transcript/index work under the recommended model. | State this explicitly; if cancellation is desired, model it separately from archive. |
| P2 | Export/API compatibility | Adding fields to `ItemRow` can accidentally leak internal workflow events or change stable Markdown contracts. | Return explicit DTOs; do not serialize raw DB rows; add workflow frontmatter only through a versioned export decision. |

### Required implementation gates before production work

1. Council signs off that Processing “cards” map one-to-one to `items`.
2. Council signs off on workflow-only archive scope and Review behavior.
3. Migration is rehearsed against a recent production-size snapshot with counts and integrity manifests.
4. Every listed creation path proves Inbox default; every duplicate/upgrade path proves state preservation.
5. Transition/archive/restore repository tests cover legal moves, backward moves, undo, idempotent replay, stale version, hard delete, and archive invariant.
6. Filter tests prove manual tags and AI topics are distinct, OR-within/AND-across semantics, empty-label filters, and count parity.
7. Metrics fixtures cover backfill exclusion, re-entry Inbox cycles, repeat Done transitions, restore, hard delete, owner timezone, week boundary, and Recall import time.
8. Search/Ask/export/Review integration tests assert the accepted archive matrix.
9. Optimistic UI tests prove rollback on failure and visible reconciliation on conflict.
10. Public wiki is updated only after implementation and verified release; this artifact remains discovery evidence.

## Final platform position

The feature is feasible without redesigning capture or retrieval if workflow is treated as a small, explicit lifecycle attached to `items`. The safe core is: database-default Inbox, append-only history, separate archive timestamp, compare-and-swap mutations, distinct manual-tag and AI-topic filters, and metrics derived from real transitions rather than UI events or operational logs. The largest avoidable mistakes are using the SRS `cards` table, making archive a status, letting legacy backfill inflate metrics, and allowing last-write-wins drag updates.
