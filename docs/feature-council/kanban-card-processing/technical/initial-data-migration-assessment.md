# Kanban Card Processing — initial data and migration assessment
**Status:** Initial assessment for final technical planning; no schema change has been made
**Current code baseline:** `5b92e68`
**Prior approved-source input:** `Kanban-designs/technical/technical-plan-v2.md` (exploration baseline `1cb5d36`, explicitly not implementation)
**Runtime limitation:** no production snapshot contents or production-size benchmark was inspected in this lane.

## Recommendation

Retain the prior architecture direction: store current Processing state as a small projection on `items` and append content-free history in a new `item_workflow_events` table. Do not reuse `cards`, tags, topics, collections, `enrichment_state`, or a separate duplicated item table.

Current-main inspection strengthens that choice:

- `items` is the identity used by Library, detail, search, Ask, Related, Review, export, tags/topics/collections, notes, capture artifacts, queues, and Recall (`src/db/migrations/020_recall_sync.sql:12-40`).
- all genuine new production items converge on `src/db/items.ts::insertCaptured` (`:54-89`);
- existing-item upgrades/repairs converge on update paths and can preserve the projection;
- current synchronous SQLite repositories and transactions already implement comparable CAS/idempotency behavior for notes (`src/db/item-notes.ts:336-563`).

The prior plan recommends the same items-projection + events model and rejects SRS/tag/event-only/separate-table alternatives (`Kanban-designs/technical/technical-plan-v2.md:8-26`).

## 1. Current database facts

- SQLite via `better-sqlite3`, WAL, foreign keys on, synchronous NORMAL, 5s busy timeout (`src/db/client.ts:20-75`).
- Migrations are immutable full filenames, applied lexicographically in one transaction and recorded in `_migrations`; startup fails if a migration fails (`src/db/client.ts:100-153`).
- Current main has 25 migration files through `024_recall_manual_sync.sql`. Both `017_topics.sql` and `017_transcript_recovery.sql` exist, so numeric prefix alone is not unique.
- Fresh isolated migration smoke on this baseline applied all files, then returned `foreign_key_check=[]` and `integrity_check=ok`.
- Current cumulative `items` has 25 columns and no workflow fields (`src/db/migrations/020_recall_sync.sql:12-40`).
- `items` is already rebuilt in migrations `008`, `009`, and `020`, showing a tested but higher-risk table-rebuild pattern. Workflow should prefer additive columns because no existing CHECK constraint needs modification.
- Existing insert triggers maintain item FTS, enqueue enrichment, and enqueue weak YouTube transcript recovery (`src/db/migrations/002_fts5.sql:19-31`; `003_enrichment_queue.sql:30-39`; `021_restore_transcript_recovery_trigger.sql:10-42`).

## 2. Proposed projection and invariants

Use the prior v2 field set as the starting point, subject to final PRD naming:

```sql
workflow_status TEXT NOT NULL DEFAULT 'inbox'
  CHECK (workflow_status IN ('inbox','todo','in_progress','done')),
workflow_version INTEGER NOT NULL DEFAULT 0 CHECK (workflow_version >= 0),
workflow_enrolled_at INTEGER,
workflow_inbox_entered_at INTEGER,
workflow_status_changed_at INTEGER,
workflow_completed_at INTEGER,
workflow_archived_at INTEGER,
workflow_initialized_at INTEGER
```

Source: `Kanban-designs/technical/technical-plan-v2.md:43-70`.

Required cross-column invariants:

| State | Required projection |
|---|---|
| Legacy dormant | `status='inbox'`, version `0`, enrollment/initialized/inbox-entry null; excluded from Processing and metrics |
| New enrolled Inbox | version `>=1`; enrollment/initialized/status-change/inbox-entry non-null; archive null |
| Active non-Inbox | enrolled, archive null, inbox-entry null |
| Done active | status Done, archive null, completion set according to final first/current-completion semantics |
| Archived | enrolled, status Done, archive non-null, inbox-entry null |
| Restored | status Done, archive null |
| Reprocessed | archive null, status Inbox, new current Inbox-entry timestamp |

`workflow_inbox_entered_at`, not `captured_at`, must order the current Inbox and calculate oldest current entry. Legacy enrollment/re-entry happens now and must not make the entry look as old as the original capture (`Kanban-designs/technical/technical-plan-v2.md:72-84`).

### Constraint implementation caution

SQLite `ALTER TABLE ... ADD COLUMN` can express per-column CHECKs but not all cross-column invariants without a rebuild. Avoid a large `items` rebuild solely for cross-field checks in the first migration. Enforce the full state machine in one repository transaction plus focused guard triggers/integrity queries; use column CHECKs for enums/nonnegative version. A later rebuild is justified only if rehearsal shows DB-level cross-field enforcement materially improves safety.

## 3. Event model

Add `item_workflow_events` with:

- immutable event UUID;
- FK `item_id ... ON DELETE CASCADE`;
- resulting item version;
- bounded event/from/to/archive/inbox-entry facts;
- bounded origin/surface/actor channel;
- unique mutation ID;
- optional unique Undo target;
- UTC occurrence time;
- opaque Inbox-entry episode ID;
- enum reason code, never free-form metadata.

The prior proposed shape is at `Kanban-designs/technical/technical-plan-v2.md:86-119`.

### Required event constraints

- `(item_id, item_version)` unique so one accepted state mutation produces one canonical version.
- `mutation_id` unique globally or, if scoped, unique with a clearly fixed item/actor namespace. Global uniqueness is simpler for ambiguous-response lookup.
- `event_uuid` unique.
- `undo_of_event_uuid` unique when present; Undo-of-Undo and cycles rejected in repository logic.
- event/provenance/reason values have CHECK allow-lists and length bounds.
- no title, URL, body, summary, transcript, attached note, tag/topic label, error message, or JSON metadata column.

### Hard delete

Workflow events should cascade with `items`. This preserves current privacy-first hard-delete behavior but means retrospective weekly totals describe retained items and may decrease. Do not build immutable global analytics that survive deletion unless the approved privacy contract changes.

## 4. Migration numbering and file shape

Use `src/db/migrations/025_item_workflow.sql` (or a more precise `025_...` name). Do not rename or renumber either `017` migration.

Recommended bounded boot migration:

1. add projection columns with legacy-safe defaults/nullability;
2. create event table and empty indexes;
3. create defense-in-depth raw-insert guard;
4. create integrity/readiness support state only if final rollout requires it;
5. do **not** write one event per existing item;
6. leave all pre-migration items dormant.

This aligns with the prior bounded migration rule (`Kanban-designs/technical/technical-plan-v2.md:175-193`).

### Why no synchronous legacy event backfill

The migration runner holds one transaction and the application does not start until it completes. A per-item event backfill would scale with the entire library, grow WAL/disk, lengthen downtime, and make rollback harder. Additive columns and an empty event table are bounded; an optional resumable baseline/enrollment job can run after startup under explicit readiness control.

## 5. New-item atomicity

### Normal application path

Refactor `insertCaptured()` so one `better-sqlite3` transaction:

1. creates item ID/time/mutation/event IDs;
2. inserts `items` with valid enrolled Inbox projection at version 1;
3. inserts one `initialized` workflow event with bounded capture provenance;
4. commits;
5. re-reads and returns `ItemRow`.

Current triggers for FTS/enrichment/transcript remain part of the same outer SQLite transaction. A failure in workflow event initialization must roll back the item and trigger side effects. Never insert the item and asynchronously “catch up” workflow later.

`better-sqlite3` nested transactions are already used in Recall: `importRecallCard` wraps import, and the inner new-item path wraps item + Recall mapping (`src/lib/recall/importer.ts:69-79`, `160-179`). The implementation must test the refactored `insertCaptured` under this nesting rather than assume it.

### Raw/future insert guard

An `AFTER INSERT` guard should act only when a row still has legacy/dormant defaults (`workflow_version=0` and enrollment null): update it to a valid enrolled Inbox projection and insert a bounded fallback initialized event. It is defense in depth, not the primary application path.

Important trigger considerations:

- SQLite does not guarantee an application-meaningful order among independent AFTER INSERT triggers; the workflow guard must not depend on the FTS/enrichment/transcript trigger order.
- Guard IDs can use `lower(hex(randomblob(16)))`; inject a collision in tests and require transaction failure.
- Map known `capture_source` values (`web`, `android`, `extension`, `telegram`, `system`, `unknown`, `recall`) to bounded actor channels. Unknown/future values fall back to `unknown_raw`, never the raw source string.
- Existing legacy rows are not touched because the trigger is created after they exist.

## 6. Ingestion preservation matrix

| Path | New item expectation | Existing item expectation | Primary evidence |
|---|---|---|---|
| Web note | Inbox + initialized event | N/A | `src/app/actions.ts:19-35` |
| Web URL | Inbox for each genuinely inserted identity | duplicate open/no insert preserves existing | `src/app/capture-actions.ts:26-94` |
| Web/API PDF | Inbox | failed extraction/checksum creates none | `capture-actions.ts:104-141`; PDF route `:48-165` |
| URL API | Inbox | duplicate/upgrade preserves version/status/archive | URL route `:201-392` |
| Android/extension | inherits API behavior with actor channel | duplicate/upgrade preserves | share handler and `extension/src/capture.ts` |
| Telegram URL/note/PDF | Inbox with Telegram provenance | duplicate/repair preserves | `src/lib/telegram/dispatch.ts:189-617` |
| Recall | Inbox with Recall provenance | stable ID skip and weak URL repair preserve | `src/lib/recall/importer.ts:69-270` |
| Transcript/repair/upgrade | no new lifecycle | preserve | transcript route, item-upgrades, repair repository |
| Enrichment/embed/index | never initialize/reset | preserve | queues and `src/lib/enrich/pipeline.ts` |
| Raw direct SQL | DB guard enrolls | N/A | new migration test |

Added metrics must count only successful initialized events for genuinely new items. Duplicates, upgrades, repairs, enrollment, reprocess, ordinary return to Inbox, and background processing do not count as Added.

## 7. Legacy enrollment strategy

The prior approved-source direction leaves existing items dormant and provides explicit enrollment, rather than flooding Inbox during migration (`Kanban-designs/technical/technical-plan-v2.md:63-64`, `175-193`). Preserve that unless the final approved PRD explicitly changes it.

If enrollment modes remain selected/recent/all:

- preview must return a count and a frozen stable ID set or hash;
- recent means the approved bounded definition (prior plan: 30 days, max 25);
- confirm must use idempotency and refuse a changed preview;
- enrollment time becomes Inbox-entry time; do not backdate;
- already enrolled items are idempotent no-ops;
- manual enrollment emits `enrolled`, not `initialized`, and does not count as Added/Processed/Completed;
- large all-history enrollment, if approved, must be resumable and observable rather than one web request/transaction.

## 8. Query and index assessment

Current Library SQL (`SELECT *`, offset pagination, 100 rows) is not suitable for Board/List scale (`src/db/items.ts:228-240`). Processing needs bounded projections and partial indexes. Start with the prior candidate indexes (`Kanban-designs/technical/technical-plan-v2.md:121-141`):

- active Inbox by `(workflow_inbox_entered_at, id)`;
- active per-status by `(workflow_status, workflow_status_changed_at DESC, id)`;
- archive by `(workflow_archived_at DESC, id)`;
- event history by `(item_id, occurred_at DESC, id DESC)`;
- metrics by event type/time/item as proven by actual queries.

### Filter algebra

- User tag IDs: OR within the facet.
- AI topic IDs: OR within the facet.
- AND across facets/status/archive.
- Use correlated `EXISTS` or pre-grouped subqueries so many tags × topics do not multiply rows/counts.
- No-tag and no-topic need explicit `NOT EXISTS` predicates.
- Counts and page results must accept the same normalized filter object.
- View matching counts and unfiltered Inbox total must be different typed fields.

### Pagination

Use keyset cursors containing view/status/archive scope, normalized sort tuple, item ID, and filter hash/version. Each board column needs an independent cursor; a single global cursor cannot paginate four independently scrolling statuses.

### Processing DTO

Do not return `body`, attached note content, quotes, full summary, artifacts, transcripts, or provider data. Return only fields required by cards/list, then link to `/items/[id]`. Current main has no generic `GET /api/items/[id]`; the prior plan's statement at line 228 is stale.

## 9. Mutation consistency

Adopt the note subsystem's proven ideas without sharing its generation counter:

- `expectedVersion` compare-and-swap;
- cryptographic `mutationId`;
- exact replay returns immutable accepted receipt plus **current** projection/version;
- changed replay payload returns 422/mismatch;
- stale expected version returns 409 with bounded current state;
- projection update and event insert are one transaction;
- network ambiguity reconciles through mutation lookup before retry;
- per-item version increments only on effective workflow mutations;
- same-state move should be a specified no-op, not an event/metric inflation.

Undo needs the event's prior status/archive/Inbox-entry facts. Undo of an Inbox exit must restore the previous entry timestamp; a new timestamp would falsify oldest Inbox age. Undo-of-Undo remains prohibited; redo is an ordinary later move.

## 10. Metrics model

Use projection for current health and events for weekly behavior:

- Inbox now and oldest current Inbox-entry age: projection.
- Added: initialized new-item events in period.
- Processed: one effective owner-driven exit per Inbox-entry episode.
- Completed: final approved first/current Done definition; do not equate raw moves with success.
- Undo: linked target becomes ineffective; never double count target + undo.
- Hard delete: event cascade removes contribution.

Persist timestamps as UTC epoch milliseconds. The app is single-owner but currently has no established workflow-timezone setting. Final design must make timezone/week-start explicit and test DST even though the current operator is in Asia/Kolkata. Do not infer historical week boundaries only from the browser executing a query.

Avoid a rollup/cache table in v1 until direct indexed SQL is measured. A cache adds invalidation on move, Undo, archive/restore, enrollment, and hard delete.

## 11. Migration and performance rehearsal gate

Before enabling reads/writes on production, run against a byte-for-byte production-size copy in an isolated location:

1. record item/tag/topic/event counts, DB/WAL sizes, free space, SQLite version, hardware, and current migrations without exposing content;
2. verify backup and restore candidate integrity;
3. apply migration `025`; record wall time, DB/WAL peak/growth, lock time, and startup impact;
4. interrupt/resume any baseline/enrollment job at multiple batch boundaries;
5. run `integrity_check`, `foreign_key_check`, schema/index/trigger manifest checks;
6. run representative `EXPLAIN QUERY PLAN` snapshots;
7. benchmark 10k and 50k realistic tag/topic fan-out for summary, each status first page/next page, filters, archive, oldest Inbox, and weekly metrics;
8. test concurrent move/Undo/read/capture against the 5s busy timeout;
9. verify legacy rows remain dormant and every post-migration new capture is initialized exactly once;
10. restore/forward-rollback rehearsal and re-run capture/Library/search/Ask/notes smoke.

Prior suggested budgets are summary p95 ≤100ms unfiltered, ≤200ms filtered, page ≤200ms, mutation DB transaction ≤250ms at 50k (`Kanban-designs/technical/technical-plan-v2.md:300-313`). Final budgets must be measured on the deployment host class.

## 12. Deployment and rollback implications

### Forward-compatible rollout

1. create verified predeploy SQLite backup;
2. retain a named known-good application artifact and current flag state;
3. deploy additive schema and guard with Processing UI/read/write off;
4. run schema/integrity/readiness queries;
5. run new-capture matrix smoke while UI remains off;
6. enable reads for owner dogfood only after zero missing-initialization defects;
7. enable writes, observe conflicts/errors/latency;
8. enable broader navigation only after production verification.

### Code rollback

Additive columns/tables are compatible with old `INSERT` column lists and `SELECT *` consumers. The DB guard is essential during old-code rollback because old `insertCaptured` will omit workflow fields; it should still initialize new captures. Do not drop the guard as part of UI rollback.

### Schema rollback

There is no down-migration framework. Normal rollback is flags off + known-good code + forward repair. Restore a verified DB snapshot only for unrecoverable migration corruption, accepting loss of post-snapshot captures and workflow mutations. Preserve the failed/current DB before restore, matching `scripts/restore-from-backup.sh:59-82`.

## 13. Initial risks

| Risk | Severity | Mitigation/proof |
|---|---:|---|
| Item commits but workflow event does not | Critical | one DB transaction; failure rolls back capture; integrity test |
| Old code after rollback creates dormant new rows | Critical | DB guard remains active; rollback capture smoke |
| Duplicate/repair resets workflow | High | exhaustive ingestion matrix tests |
| Legacy migration floods Inbox | High | dormant defaults; no boot backfill |
| Trigger collision/order issue | High | independent guard logic; collision injection; fresh/upgrade DB tests |
| Tag/topic join inflates counts | High | `EXISTS` algebra; fan-out fixtures |
| Offset/full-row Board becomes slow/private | High | bounded DTO + per-column keyset |
| Inbox age uses `captured_at` | High | authoritative entry timestamp transition table |
| Undo/unknown outcome corrupts metrics | High | CAS, receipts, mutation lookup, effective-event fixtures |
| Archive leaks into unrelated feature filters | High | complete downstream archive matrix |
| Startup migration exceeds window/WAL space | High | additive-only boot migration + production rehearsal |
| Weekly totals retain deleted content history | Privacy high | event cascade; retained-item semantics |
| Wiki/docs describe wrong deployed migration | Medium | update after actual merge/deploy verification only |

## 14. Required acceptance evidence before implementation is called migration-ready

- final PRD/UX/technical artifacts agree on enrollment, statuses, archive, Undo, metrics, and time semantics;
- migration `025` fresh DB and upgrade DB tests;
- all 25 prior migrations plus `025` apply with integrity/FK clean;
- production-size rehearsal evidence with no content disclosure;
- every new ingestion channel initialized once; duplicates/repairs unchanged;
- raw insert guard and readiness alarm proven;
- query plan/performance evidence at target sizes;
- code rollback with old insertion code proven;
- backup/restore and flags-off recovery rehearsed;
- no schema/metric/log payload contains user content or taxonomy label text.
