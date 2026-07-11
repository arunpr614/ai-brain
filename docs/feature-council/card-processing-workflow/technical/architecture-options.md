# Card Processing Workflow — Architecture Options and Recommendation

**Status:** Discovery architecture; planning only, not implemented
**Council role:** Technical Architect
**Date:** 2026-07-11
**Application baseline inspected:** `1cb5d36f37611e60442b4f2c4433b45455273500`
**Wiki baseline inspected:** `88a3520038703108a0533501c7a384c6def7b74e`
**Recommended product direction:** Processing — Inbox-first triage with a secondary board

## Executive recommendation

Implement Processing as an **enrolled lifecycle on the existing `items` aggregate**, backed by:

1. current workflow fields on `items` for fast reads and compare-and-swap writes;
2. a separate `archived_at` timestamp;
3. an append-only, content-free `item_workflow_events` history;
4. a nullable `workflow_enrolled_at` participation boundary that keeps legacy sources out of the active workflow until the owner explicitly imports them; and
5. database initialization for every newly inserted item so every capture path enters Inbox without trusting each caller to remember a field.

This is the recommended reconciliation of the council's two launch hypotheses:

- **Accept the platform invariant:** all rows receive a valid persisted status, and all new inserts receive Inbox at the database boundary.
- **Accept the product trust hypothesis:** the migration does not silently make historical sources visible in the Inbox backlog. Existing rows are baselined as dormant Inbox records with `workflow_enrolled_at IS NULL`; recent, selected, or all-history import explicitly enrolls them and creates an auditable event.

The distinction is technical baseline versus product participation. It avoids permanent nullable-status semantics while preserving an honest, owner-controlled launch.

For phase one, **drag changes status only**. Do not support arbitrary intra-column manual ordering. Inbox triage is oldest-first; other active states are ordered by most recent status change. If prototype evidence later proves manual priority necessary, add it as an independently designed, versioned ranking capability limited initially to To Do and In Progress.

## Evidence from the current implementation

- `items` is the canonical captured-source aggregate. The existing `cards` table is an SRS/review schema and must not be reused for this feature (`src/db/migrations/001_initial_schema.sql`, `src/db/client.ts`).
- All confirmed new-item paths converge on `insertCaptured`; its named-column insert allows a database default and insert trigger to cover web, Android/extension, Telegram, PDF, and Recall without breaking callers (`src/db/items.ts`).
- Duplicate URL and transcript/content-upgrade paths reuse the existing item. They must preserve workflow and archive state (`src/db/items.ts`, capture routes).
- Current Library reads use offset pagination, a 100-row page cap, and a second client-side quality filter. Those conventions cannot produce complete board columns or trustworthy filtered counts at scale (`src/app/library/page.tsx`, `src/components/library-list.tsx`).
- SQLite runs through synchronous `better-sqlite3`, WAL, foreign keys, `synchronous=NORMAL`, and lexicographic migrations. Applied migrations are not reversible (`src/db/client.ts`; wiki `Deployment-and-Operations.md`).
- Manual notes provide the strongest existing trust precedent: explicit session and exact-origin checks, private/no-store responses, request identity, compare-and-swap, current state in `409`, recovery behavior, and `BroadcastChannel` invalidation (`src/db/item-notes.ts`, note API and editor).
- The taxonomy has distinct manual tags, generated tags, topics, and scalar category. Processing filters should use manual tags and AI topics as separate facets; workflow must not be encoded in taxonomy (`src/db/tags.ts`, `src/db/topics.ts`, enrichment pipeline).
- There is no centralized product analytics service. User-facing workflow metrics require durable domain events rather than rotating operational logs.

## Architecture options

### Option A — Current state on `items`, all history visibly backfilled to Inbox

Add `workflow_status`, version/timestamps, and `archived_at` to `items`; create an event table; migrate every existing row into active Inbox.

**Advantages**

- Simplest active query: every item participates and no enrollment predicate exists.
- Database default and current-state reads are straightforward.
- Inbox backlog equals every non-archived item that has never moved.
- Matches the platform/data assessment's all-backfill option.

**Costs and risks**

- Violates the product direction's no-silent-backfill hypothesis.
- Can create an immediately overwhelming and surprising backlog.
- Makes launch-day status counts true at the storage layer but misleading as a statement of owner intent.
- Requires careful exclusion of migration events from velocity and duration metrics.
- A flags-off rollback still leaves every legacy source enrolled.

**Disposition:** Technically coherent, but do not recommend before prototype evidence demonstrates that a full historical Inbox is welcome.

### Option B — Current state plus explicit workflow enrollment on `items` (recommended)

Add valid current-state fields to every row and use `workflow_enrolled_at` to distinguish active Processing participation. The migration baselines legacy rows without enrolling them. New inserts are initialized and enrolled automatically. Explicit recent/selected/all import enrolls legacy rows.

**Advantages**

- Preserves database-level Inbox defaults and a single current-state schema.
- Honors the no-silent-backfill product hypothesis.
- Avoids `NULL` or `COALESCE` as a status meaning.
- Provides a clean query boundary: active Processing requires `workflow_enrolled_at IS NOT NULL AND archived_at IS NULL`.
- Enables staged, reversible-at-the-product-level launch while keeping migration additive.
- Separates “this row has a valid lifecycle baseline” from “the owner chose to manage this historical source in Processing.”

**Costs and risks**

- Adds one participation field and one event type.
- Every Processing query must include the enrollment predicate.
- “Unenrolled” is a launch concept that must not become a prominent permanent fifth status.
- Import-all needs a resumable chunked operation for large libraries.

**Disposition:** **Recommend.** Best balance of storage correctness, owner trust, metric integrity, and rollout control.

### Option C — One-to-one `item_workflow_state` plus event history

Create a separate current-state row only when an item participates. Missing state naturally means a legacy item is not enrolled.

**Advantages**

- Feature schema is isolated from the central `items` table.
- No additional enrollment field is needed; row presence expresses participation.
- Flags-off rollback can ignore the feature tables.

**Costs and risks**

- Every board, list, detail, duplicate, archive, and count query adds a join.
- Missing state becomes ambiguous: intentionally unenrolled, trigger failure, partial migration, or data corruption.
- Direct inserts require a trigger to create the state row, and every read must still defend against missing rows.
- Current state and canonical item identity are split without an ownership or scaling reason in this single-owner SQLite application.
- Export and DTO code has more opportunities for inconsistent joins.

**Disposition:** Viable only if organizational ownership requires strict table isolation; otherwise it adds complexity without improving user semantics.

### Option D — Nullable/lazy status or status-as-tag

Leave legacy status null and interpret it with `COALESCE`, or represent statuses/archive as tags.

**Disposition:** Reject. Both approaches create dual semantics, weaken constraints and history, complicate counts and CAS, and conflate workflow with taxonomy.

## Decision matrix

Scores are 1–5, where 5 is strongest.

| Criterion | Weight | A: Visible full backfill | B: Enrolled lifecycle | C: Side table | D: Lazy/tag |
|---|---:|---:|---:|---:|---:|
| Storage and query correctness | 20 | 5 | 5 | 3 | 1 |
| Product launch trust | 20 | 2 | 5 | 5 | 2 |
| Every-ingestion default | 15 | 5 | 5 | 3 | 2 |
| Metrics integrity | 15 | 4 | 5 | 4 | 1 |
| Delivery and operational risk | 15 | 4 | 4 | 2 | 3 |
| Rollout/rollback control | 10 | 2 | 5 | 5 | 3 |
| Long-term model clarity | 5 | 5 | 4 | 3 | 1 |
| **Weighted result / 100** | **100** | **76** | **96** | **72** | **37** |

## Recommended domain contract

### Aggregate and vocabulary

- A Processing “card” is a presentation of one existing `item`; there is no second content aggregate.
- Persist and name the lifecycle `itemWorkflow` / `workflow_*` to avoid colliding with the SRS `cards` table.
- Status values are `inbox`, `todo`, `in_progress`, and `done`.
- All active statuses may transition to any other active status. Backward moves are valid.
- Unenrolled is participation state, not a fifth workflow status.
- Archive is a separate timestamp and does not alter source content, notes, taxonomy, search eligibility, Ask eligibility, or Library visibility.
- Only enrolled Done items may be archived in phase one.
- Restore clears archive and leaves status at Done. “Reprocess” is a separate subsequent move to Inbox.
- Hard delete remains the privacy-destructive operation and cascades workflow history.

### Status and participation invariants

1. `workflow_status` is never null and always one of the four values.
2. `workflow_enrolled_at IS NULL` requires `workflow_status='inbox'` and `archived_at IS NULL`.
3. `archived_at IS NOT NULL` requires `workflow_enrolled_at IS NOT NULL` and `workflow_status='done'`.
4. Status cannot change while archived; restore first.
5. A capture duplicate or content upgrade preserves status, enrollment, version, and archive.
6. A new item insert initializes and enrolls Inbox in the same database transaction as capture.
7. Undo is a new version-checked mutation and a new event, not deletion or alteration of history.

## Recommended schema

Use the next lexicographic migration filename, expected to be `024_item_workflow.sql`. Do not rename either existing `017_` migration.

### Additive fields on `items`

| Column | Type/default | Contract |
|---|---|---|
| `workflow_status` | `TEXT NOT NULL DEFAULT 'inbox'` | Canonical status, checked to the four values. |
| `workflow_version` | `INTEGER NOT NULL DEFAULT 0` | CAS token. Legacy baselines start at 0; a new-item initialization trigger advances to 1. |
| `workflow_initialized_at` | `INTEGER NOT NULL DEFAULT 0` | Technical lifecycle initialization time. Legacy uses migration time; new items use capture/insert time. |
| `workflow_status_changed_at` | `INTEGER NOT NULL DEFAULT 0` | Current status-order timestamp. Legacy baseline may use `captured_at` solely for deterministic initial order. |
| `workflow_enrolled_at` | nullable `INTEGER` | Null means a baselined legacy item is outside active Processing; non-null means it participates. |
| `archived_at` | nullable `INTEGER` | Separate archive lifecycle. |

Do not add independently writable `processed_at` or `completed_at`; they can drift after backward moves. Derive first-ever milestones from history. Add validated rollups only after measured query cost justifies them.

### `item_workflow_events`

| Column | Purpose |
|---|---|
| `id INTEGER PRIMARY KEY AUTOINCREMENT` | Stable local ordering. |
| `event_uuid TEXT NOT NULL UNIQUE` | Stable API/export identity. |
| `item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE` | Event ownership and privacy deletion. |
| `item_version INTEGER NOT NULL` | Version produced by the event; unique with item ID. |
| `event_type TEXT NOT NULL` | `legacy_baselined`, `initialized`, `enrolled`, `status_changed`, `archived`, or `restored`. |
| `from_status`, `to_status` | Nullable status delta with allowed-value checks. |
| `from_archived_at`, `to_archived_at` | Archive/restore delta. |
| `mutation_id TEXT UNIQUE` | Retry identity for user/system operations; capture initialization uses a deterministic `capture:<item_id>` identity; null only for migration baselines. |
| `request_hash TEXT` | Detect reuse of a mutation ID with a different payload. |
| `actor_channel TEXT NOT NULL` | Trusted `web`, `android`, `extension`, `telegram`, `recall`, `system`, `unknown`, or `migration`. |
| `origin TEXT NOT NULL` | `capture`, `user`, `undo`, `legacy_migration`, or `legacy_import`. |
| `occurred_at INTEGER NOT NULL` | UTC epoch milliseconds. |

Use `UNIQUE(item_id, item_version)`. Events contain no title, body, URL, note text, summary, query, tag/topic name, or drag coordinates.

### Optional operational tables

- `workflow_batch_mutations(batch_mutation_id, request_hash, accepted_at)` provides all-or-nothing batch replay. Each item in a batch still supplies its own unique mutation ID and creates one event.
- `workflow_enrollment_runs(id, mode, state, cutoff_at, cursor_captured_at, cursor_item_id, enrolled_count, created_at, updated_at, completed_at)` supports resumable recent/all imports without a long request or database lock. No content fields belong here.

### Indexes

- Active columns: `(workflow_enrolled_at, archived_at, workflow_status, workflow_status_changed_at DESC, captured_at DESC, id)`.
- Inbox triage: partial index on `(captured_at ASC, id ASC)` where enrolled, active, and Inbox.
- Archive: partial index on `(archived_at DESC, id)` where archived.
- Enrollment discovery: `(workflow_enrolled_at, captured_at DESC, id)`.
- Events: `(item_id, item_version)`, `(event_type, occurred_at)`, and `(origin, occurred_at)`.
- Preserve distinct existing indexes for manual-tag and topic joins. Workflow queries should use `EXISTS` subqueries or de-duplicated CTEs rather than fan-out joins.

### Constraint enforcement

Use table checks where SQLite permits them and `BEFORE INSERT/UPDATE` triggers for cross-column archive/enrollment invariants. Repository validation supplies clearer product errors, while database triggers protect direct/import callers.

An `AFTER INSERT ON items` trigger should, in the capture transaction:

1. keep the database default `inbox`;
2. set `workflow_version=1`;
3. set initialized/status-changed/enrolled timestamps from `captured_at` or insert time;
4. create one `initialized` event with `origin='capture'`; and
5. leave the existing enrichment and FTS triggers intact.

The migration itself must baseline pre-existing rows before enabling the new-item trigger. Migration rows receive status Inbox and version 0, remain unenrolled, and receive `legacy_baselined` events with `origin='legacy_migration'`. These are storage facts, not claims that the owner used Processing historically.

## Explicit reconciliation: no silent backfill versus all-backfill

The platform proposal correctly rejects permanently null or lazy status. The product proposal correctly rejects a surprise historical Inbox. The recommended model does both of the following:

| Concern | Recommended treatment |
|---|---|
| Schema completeness | Every legacy row is baselined with a real Inbox status and version 0. |
| Visible active backlog | Only `workflow_enrolled_at IS NOT NULL` appears or counts in Processing. |
| New captures | Database trigger immediately initializes and enrolls Inbox. |
| Recent 30 days | Explicit owner action creates a resumable enrollment run bounded by capture date. |
| Selected Library sources | Explicit batch enrolls only selected IDs after all-or-nothing validation. |
| All historical sources | Explicit resumable enrollment run; never a migration side effect. |
| Metrics | Baseline and enrollment events do not count as added, processed, completed, or duration samples. |
| Library continuity | Unenrolled sources remain ordinary Library items and may be enrolled from Library later. |
| Rollback | Flags can hide/disable Processing without changing Library or deleting workflow records. |

The temporary launch UI may say “older sources available to add,” but should not expose `unenrolled` as a steady-state status. Once the owner has imported all desired history, the participation field remains an internal invariant.

If prototype testing instead proves users want every historical source immediately, Option B can support that decision by running the explicit all-history enrollment during onboarding. No schema change is required.

## Ingestion-default contract

| Path | Required workflow result |
|---|---|
| Web note, URL, PDF | New row is initialized/enrolled Inbox by DB trigger. |
| Android/extension note and URL | Same; existing API clients need no workflow field. |
| Telegram URL, note, PDF | Same through `insertCaptured`. |
| Recall new import | Same; “added” time remains AI Brain import time under the current mapper. |
| Duplicate URL/share | Reuse item and preserve workflow/archive; response may disclose archived state and offer explicit restore. |
| Transcript upload/paste or source repair | Update content only; preserve workflow/archive/version. |
| Enrichment, embedding, note indexing, transcript workers | Never infer or change user workflow. Archive does not cancel these workers. |
| Future direct SQL/import caller | DB default plus trigger protects the invariant; migration tests must prove it. |

“Capture and start now” remains two auditable operations: capture into Inbox, then a user move to In Progress. No caller bypasses the Inbox initialization event.

## History, metrics, and analytics

The event table is the source for user-facing activity metrics and conflict audit. Operational JSONL is not.

Product metric semantics take precedence over transition volume:

| Metric | Exact definition |
|---|---|
| Current Inbox backlog | Enrolled, non-archived items whose current status is Inbox. |
| Current status counts | Enrolled, non-archived items grouped by current status. Filtered counts reuse the exact filter predicate. |
| Added today | `initialized` capture events in the owner's timezone window; legacy baseline/enrollment excluded. |
| Processed today/week | Distinct items whose **first-ever real** `inbox -> non-inbox` user transition occurs in the window. Re-entry and later exit do not increment it. |
| Completed today/week | Distinct items whose **first-ever real** entry to Done occurs in the window. Reopening and recompleting do not increment it. |
| Archived | Archive events in the window; current archive size is a separately labeled stock count. |
| Average initial Inbox time | First real Inbox exit minus enrollment/initialization time for eligible post-launch or explicitly enrolled items. Report sample size. |

This resolves a discrepancy in the platform assessment, which explored per-Inbox-cycle processing. The chosen product contract is first-ever per item because it avoids rewarding churn. Later cycle diagnostics can exist under a different name but must not be called “processed.”

Store UTC milliseconds. Persist an explicit owner timezone in `settings`; calculate day/week boundaries in that timezone, with Monday as the documented week start unless product copy chooses otherwise. Never inherit the host timezone implicitly.

No external analytics emission is required in phase one. If later added, emit only content-free event type, status delta, latency, channel, success/failure code, and coarse backlog bucket after a separate privacy review.

## Ordering and manual-priority scope

### Phase-one ordering

- Inbox triage: `captured_at ASC, id ASC` (oldest first).
- Board Inbox alternative: user may switch to newest first, but that is a query sort, not persisted rank.
- To Do and In Progress: `workflow_status_changed_at DESC, captured_at DESC, id`.
- Done: `workflow_status_changed_at DESC, captured_at DESC, id`; first-completion metrics remain history-derived.
- Archive: `archived_at DESC, id`.
- A cross-column drag changes status and naturally appears at the top of the destination under status-change ordering.

There is **no intra-column drag reorder in phase one**. The card drag handle moves between status columns only. Accessible “Move to…” actions have identical semantics. This directly reconciles the product's manual-priority exploration with the platform's warning: arbitrary ranking creates an additional data model, CAS surface, rebalance algorithm, and conflict type that is not necessary to validate Inbox processing.

### Future manual priority, only if validated

Start with To Do and In Progress, not Inbox or Done. Add an integer `workflow_rank` with wide gaps, deterministic ID tie-breaks, column-local rebalance in a short transaction, a `rank_changed` event, and version checks. Never rely indefinitely on floating-point midpoints. Treat keyboard “Move before/after” and menu-based priority as first-class, not as an accessibility patch after drag ships.

## Read model and API conventions

### Dedicated repository

Create a workflow-specific repository rather than stretching `listItems` and its single-tag options. It should build one validated filter predicate used by:

- page results;
- filtered per-status counts;
- unfiltered active Inbox total; and
- archived count.

Filters are manual tag IDs and AI topic IDs, not ambiguous names. Values within a facet are OR; facets combine with AND. “No user tags” and “No AI topics” are explicit predicates.

### Read endpoints

`GET /api/workflow/items`

Query parameters:

- `scope=active|archived`;
- repeatable `status` for active scope;
- repeatable `manualTagId`;
- repeatable `topicId`;
- `manualTag=none` / `topic=none` for empty facets;
- optional bounded `q`;
- `sort=inbox_oldest|newest|status_changed|archived`;
- opaque `cursor`;
- `limit`, default 30 and maximum 50.

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
  "unenrolledLegacyCount": 0,
  "snapshotAt": 0
}
```

Return compact card DTOs: identity, title, source type/platform, capture time/quality, small taxonomy labels needed by the card, workflow snapshot, and archive timestamp. Do not return body, full summary, notes, chunks, or vectors.

`GET /api/items/:id/workflow` returns the canonical current workflow snapshot for conflict reconciliation and item detail.

### Pagination and cursor rules

- Use keyset pagination with the full deterministic sort tuple, not offset.
- The opaque cursor contains schema version, scope/status, sort tuple, and a hash of normalized filters. Reject a cursor reused with different filters.
- Board columns request independent status pages and retain independent cursors/loading/error state.
- The server does not promise a historical HTTP snapshot across requests; concurrent moves may change membership. The client de-duplicates by item ID, removes cards whose returned state no longer matches, and offers a “New updates” refresh when focus/poll revalidation detects drift.
- Counts come from SQL over the full matching predicate, never loaded-card length.

### Mutation endpoint

`PATCH /api/items/:id/workflow`

```json
{
  "mutationId": "uuid",
  "expectedVersion": 7,
  "operation": "changeStatus",
  "workflowStatus": "in_progress"
}
```

Operations are `changeStatus`, `archive`, and `restore`. Actor channel is derived from trusted request/auth context, not accepted from arbitrary JSON.

Success returns the full workflow snapshot, the event ID/version, and `replayed`. Errors:

- `400 WORKFLOW_VALIDATION_FAILED`;
- `401 UNAUTHENTICATED`;
- `403 WORKFLOW_CROSS_ORIGIN_FORBIDDEN`;
- `404 ITEM_NOT_FOUND`;
- `409 WORKFLOW_CONFLICT` plus current snapshot;
- `422 WORKFLOW_TRANSITION_INVALID`;
- `422 WORKFLOW_MUTATION_MISMATCH` when an ID is reused with a different request hash;
- `503 WORKFLOW_WRITE_DISABLED`;
- `500 WORKFLOW_INTERNAL_ERROR` with no content.

### Batch and enrollment endpoints

`POST /api/workflow/mutations/batch` accepts a batch mutation ID and, in phase one, at most 100 item changes, each with item ID, mutation ID, expected version, and operation. Validate every item and transition before writing; execute all-or-nothing in one short transaction; write one event per item. Keep 500 as an absolute validation ceiling for a later measured increase, matching existing bulk conventions, but do not enable it without lock-duration evidence. Larger UI selections must be narrowed or presented as explicit sequential batches rather than implying one atomic mutation.

`POST /api/workflow/enrollment-runs` creates `recent_30_days` or `all` runs. `POST /api/workflow/enroll` handles selected IDs up to the same 500-ID cap. Enrollment is idempotent: already-enrolled items are reported, not reset to Inbox or versioned again.

All endpoints are Node runtime, dynamic, `private, no-store, max-age=0`, `Vary: Cookie`, and `X-Content-Type-Options: nosniff`.

## Authorization and security

- Processing is single-owner in phase one. Every read and write validates the signed session inside the route, even though the proxy also gates requests.
- Cookie-authenticated writes require exact same origin using the existing note-route convention.
- Do not add workflow routes to the bearer allow-list in phase one. If native/extension workflow mutation becomes a requirement, add explicit allow-list entries, client API versioning, rate limits, and actor derivation as a separate change.
- Validate payloads and cursors with bounded Zod schemas; cap IDs, query length, filters, page size, and body size.
- Use parameterized SQL. Filter by stable tag/topic IDs and constrain manual tags to `kind='manual'`.
- Responses and logs must not include body, note text, source URLs, query text, generated content, or authentication material.
- Archive is not a privacy feature. UI copy must say the source remains in Library/search/Ask. Hard delete cascades events and may reduce recomputed historical metrics.
- Existing SQLite, backups, service-worker caches, and local browser storage are not application-level encrypted. This feature must not imply otherwise.
- Workflow mutations are online-only. The service worker must not cache or background-queue them.

## Transaction, CAS, idempotency, and conflicts

Each individual mutation runs inside one `better-sqlite3` transaction:

1. Load and validate item, enrollment, archive invariant, and requested transition.
2. Check for an existing event with `mutation_id`.
3. If found with the same request hash, return a replay response; if the hash differs, reject mutation mismatch.
4. Execute `UPDATE items ... workflow_version=workflow_version+1 ... WHERE id=? AND workflow_version=?`.
5. Require exactly one changed row. If zero, return `409` with the current snapshot.
6. Insert the event with the produced version and status/archive delta.
7. Commit state and history atomically.

WAL provides database concurrency, not semantic conflict resolution. Never use silent last-write-wins.

An idempotent replay returns both the originally accepted event version and the current snapshot. If another mutation happened after the accepted event, the client learns that the retry succeeded earlier but the item has since changed.

Undo uses the confirmed post-mutation version and submits the inverse operation with a new mutation ID and `origin='undo'`. The toast timeout only controls affordance visibility; history is not erased. If another client changed the item first, Undo receives `409` and offers a current-state-aware retry.

## Optimistic UI and failure rollback

Maintain per-item client state with:

- `confirmed`: last server snapshot and rendered location;
- `optimistic`: intended status/archive location;
- `pendingMutationId`;
- `rollbackAnchor`: source column/row and neighboring IDs; and
- `intent`: the operation needed for Retry.

On move/archive:

1. Move only the affected card optimistically and mark it pending.
2. Disable additional mutations on that card while the request is outstanding.
3. On success, replace with the canonical snapshot, update counts, broadcast invalidation, and show Undo.
4. On network/5xx/503, restore the confirmed snapshot and local anchor, announce failure, and offer Retry.
5. On `409`, render the server snapshot in its actual location, announce “changed elsewhere,” and offer “Use current” or reapply the intent against the new version.
6. On 404, remove the card and announce that the source is no longer available.

Never refresh or reorder unrelated cards as a side effect of one failed mutation. Batch rollback restores the entire selection because the server transaction is all-or-nothing.

## Multi-tab, multi-device, focus, and offline behavior

- Publish successful mutations to `BroadcastChannel('brain-item-workflow-v1')` with item ID, version, status, archived flag, and event time only.
- A receiving tab does not blindly apply the broadcast payload; it invalidates the affected item and counts, then fetches canonical state.
- On `visibilitychange` to visible, browser `focus`, and `online`, revalidate visible card IDs and counts.
- While Processing is visible, use a conservative conditional poll (for example 30–60 seconds) until the product has a server-push need. Poll only compact versions/counts.
- Cross-device convergence is fetch-based; CAS prevents lost updates even if freshness is delayed.
- Read-only cached UI may remain viewable offline, but all move/archive/restore/enrollment controls are disabled with a clear explanation. Do not silently queue mutations.
- Existing manual-note draft and conflict recovery continues independently when detail is opened.

## Board/list state and virtualization

- URL query parameters are canonical for scope, view, status, tag/topic filters, text query, and sort. This preserves browser history and item-detail return context.
- Last Board/List preference may live in the existing settings or local storage, but URLs override it.
- Store transient per-status scroll anchors and loaded cursors in a bounded client session cache keyed by normalized URL state. Do not persist full card payloads indefinitely.
- Desktop board uses independent virtualized column lists. Mobile uses Inbox/List and a single-status segmented board equivalent; it does not render four miniature columns.
- Keep no more than about 50 loaded rows per page and no more than 200 card DOM nodes across the desktop board. Virtualization overscan should be small and preserve focused rows.
- Opening item detail includes a validated Processing return URL/anchor. Direct item links retain Library as their default return.
- Filters can change when AI topics are regenerated; that changes query membership, never workflow status.

## Performance budgets and validation dataset

Budgets are server-processing targets measured on the supported deployment class, excluding internet latency, against 10,000 and 50,000-item fixtures with realistic tag/topic fan-out.

| Operation | Target |
|---|---|
| Initial active page + four counts | p95 ≤ 200 ms at 10k; ≤ 400 ms at 50k |
| Subsequent one-column page | p95 ≤ 120 ms at 10k; ≤ 250 ms at 50k |
| Individual mutation transaction | p95 ≤ 50 ms DB time and ≤ 200 ms route time |
| 100-item batch transaction | p95 ≤ 500 ms DB time; no 500-item transaction without measured lock evidence |
| Compact page response | ≤ 200 KiB uncompressed at maximum page size; no source body/notes |
| Board rendered DOM | ≤ 200 cards, plus small overscan |
| Interaction responsiveness | INP ≤ 200 ms on target desktop/mobile; pointer drag should not do synchronous SQL/network work per frame |
| Layout stability | Reserve card/column skeleton height; CLS ≤ 0.1 for initial view |

Use `EXPLAIN QUERY PLAN` assertions for indexes, benchmark cold/warm count and page queries, and test during concurrent enrichment/note-index writes because all workers share one SQLite database. If filtered counts dominate, first optimize indexes/predicate reuse; only then consider cached content-free aggregates.

## Accessibility implementation hooks

- Status change semantics live in one command/controller used by drag, card menus, batch controls, detail controls, and keyboard actions.
- Drag is progressive enhancement. Every card exposes a labeled “Move to…” menu and the same archive/restore actions.
- Do not use color alone for status, pending, conflict, or archive. Include visible labels and icons with accessible names.
- Columns are labeled regions with headings and matching counts. Cards remain ordinary focusable content/list items; avoid an over-engineered ARIA grid unless its complete keyboard model is implemented.
- A polite live region announces move success, rollback, conflict reconciliation, archive/restore, count changes, and loaded-more results. Errors that require action use `role='alert'`.
- Preserve focus after optimistic moves and virtualization. If a focused card moves columns, focus its new card instance or the destination heading; never drop focus to the document body.
- Keyboard flow: open Move menu, choose destination, cancel with Escape, activate Undo, and load more without drag. Batch selection retains visible count and supports Escape to clear, following Library precedent.
- Respect reduced motion and avoid animating rollback over long distances. Pending state must remain understandable with motion disabled.
- Touch targets remain at least 44×44 CSS pixels on mobile.
- If a drag library is introduced, it requires dependency/security review and proof of pointer, touch, keyboard, screen-reader, virtualization, and reduced-motion behavior. No current drag/virtualization dependency was found.

## Downstream behavior matrix

| Surface/system | Active/enrolled | Archived | Legacy unenrolled | Hard deleted |
|---|---|---|---|---|
| Processing | Visible by status/filter | Archive scope only | Hidden; import affordance from Library/onboarding | Absent |
| Library/item detail | Visible | Visible with archived badge/restore | Visible normally with optional “Add to Processing” | 404/absent |
| Exact/semantic search | Eligible | Eligible with badge | Eligible | Removed by existing cleanup |
| Ask/Related | Eligible under current rules | Eligible | Eligible | Existing cleanup applies |
| Review/Needs Upgrade | Unchanged; show lifecycle badge if useful | Unchanged in phase one | Unchanged | Absent |
| Export | Current behavior; add workflow metadata only via versioned export decision | Same, marked archived only after that decision | Same | Absent |
| Duplicate/upgrade | Preserve lifecycle | Preserve archive and offer restore | Preserve unenrolled baseline | May create new identity |
| Background workers | Continue | Continue | Continue | Existing claim/cascade guards apply |

Council must explicitly approve workflow-only archive scope before implementation. “Archive hides everywhere” would require coordinated changes across FTS, semantic retrieval, Ask, Related, Review, exports, duplicate detection, and direct navigation.

## Test strategy

### Migration and database

- Migrate a pre-024 fixture and prove all existing items are Inbox/version 0, unenrolled, active, and paired with legacy-baseline events.
- Insert raw items after migration and prove the DB trigger enrolls Inbox/version 1 and creates exactly one initialization event.
- Re-run migrations and prove idempotency.
- Validate checks/triggers for illegal status, unenrolled archive, non-Done archive, status while archived, and duplicate item/version events.
- Run `integrity_check`, `foreign_key_check`, FTS parity, chunk/vector bridge parity, and existing trigger/job counts before and after migration.
- Hard delete cascades events and does not leave mutation/enrollment orphans.

### Repository and queries

- Every legal forward/backward transition, restore-to-Done, explicit reprocess, and no-op handling.
- CAS winner/loser from two connections or simulated tabs.
- Same mutation/same hash replay; same mutation/different hash rejection; replay after later version.
- Duplicate/upgrade/repair preserves lifecycle and archive.
- Manual tag versus AI topic isolation; OR-within/AND-across; no-tag/no-topic; filtered count/page parity.
- Keyset boundaries for every sort, deterministic tie-breaks, de-duplication after concurrent moves, and archive scope.
- Enrollment recent/selected/all idempotency, crash/resume cursor, and no status reset for already-enrolled items.

### Metrics

- Legacy baseline/import exclusion from added, processed, completed, and durations.
- First Inbox exit counts once after return/re-exit.
- First Done counts once after reopen/recomplete.
- Archive/restore does not rewrite completion.
- Owner timezone, DST, midnight, and Monday week boundaries.
- Hard deletion's documented effect on recomputed history.

### API and security

- Session required on reads and writes even when route functions are invoked directly.
- Missing/foreign Origin rejected for writes.
- Private/no-store headers on success and every error.
- Malformed status, cursor, UUID, query/filter count, page limit, body size, and batch size.
- `409` includes only compact current snapshot; `500` contains no content.
- Write-disable flag returns `503` without mutation.
- Workflow routes remain unavailable to bearer clients unless explicitly authorized later.

### UI, accessibility, and integration

- Optimistic success, network rollback, `503`, stale-version reconciliation, 404 removal, Retry, and Undo conflict.
- Broadcast invalidation, focus/online revalidation, and stale cross-device update.
- Board and List preserve filters, selection, URL, return context, and anchors.
- Keyboard-only triage/archive/restore/batch flow; live-region copy; focus after move/rollback; reduced motion; 200% zoom; mobile touch sizes.
- Virtualized card focus and loaded-more behavior.
- Capture path integration matrix for web, APIs, Telegram, Recall, duplicates, and transcript upgrade.
- Search/Ask/Review/Library/export behavior matches the approved archive matrix.

The repository currently uses Node's test runner and JSDOM for selected components. Add browser-level automation only after choosing a supported tool; until then, production readiness requires a documented desktop/mobile keyboard and screen-reader validation pass in addition to unit/JSDOM coverage.

## Rollout, rollback, and observability

### Flags

- `ITEM_WORKFLOW_UI_ENABLED`: expose Processing/navigation/read surfaces.
- `ITEM_WORKFLOW_WRITE_ENABLED`: permit status/archive/restore/batch writes.
- `ITEM_WORKFLOW_ENROLLMENT_ENABLED`: permit legacy enrollment choices.

Flags are fail-closed. The schema and new-item initialization remain additive even when UI/write flags are off.

### Staged rollout

1. Rehearse migration on a recent production-size backup; capture counts, timing, integrity, FTS/vector manifests, and query plans.
2. Deploy additive schema/history with UI and writes off. Verify new captures initialize Inbox and existing captures remain unenrolled.
3. Enable read-only Processing for the owner; compare counts/query performance and audit downstream badges.
4. Enable individual status writes and detail controls; monitor conflict/failure rates.
5. Enable Board drag plus accessible Move actions and virtualization.
6. Enable Done archive/restore and bounded batches.
7. Enable recent/selected legacy enrollment; enable all-history only after resumable-run testing.
8. Promote navigation only after prototype/usability and runtime evidence.

### Rollback

- First response: disable writes, enrollment, and UI; Library/capture/search/Ask continue using existing behavior.
- Applied migrations remain. Do not down-migrate or rebuild `items` during an incident.
- If the insert trigger itself threatens capture, stop rollout and ship a forward emergency migration that safely disables only workflow event initialization after backing up the database; keep the Inbox default columns intact.
- Preserve event/current-state data for diagnosis. Restore from backup only for proven corruption, with explicit FTS/vector/artifact reconciliation.
- Client optimistic state always rolls back to last confirmed state on flag-disable or `503`.

### Content-free operational signals

- Route latency and result code by operation.
- Mutation conflict, replay, rollback, and failure counts.
- Enrollment run state/count/duration.
- Page/count query latency and rows examined.
- Board visible-card and loaded-page counts.
- Migration duration and before/after item/event/integrity manifests.

Do not log card content, query/filter text, tag/topic names, URLs, notes, or auth data.

## Delivery milestones and gates

| Milestone | Scope | Exit gate |
|---|---|---|
| M0 — ADR and baseline | Approve item ownership, enrolled lifecycle, archive matrix, metrics, no manual rank | Council decision recorded; production-size fixture available |
| M1 — Persistence | Migration, events, constraints, initialization, repositories | Migration/integrity/ingestion tests green; performance rehearsal passes |
| M2 — Read model | Dedicated queries, filters, counts, cursors, metrics | Count parity and 10k/50k budgets pass |
| M3 — Trusted writes | Authenticated API, CAS, idempotency, conflicts, flags | Route/security/concurrency tests pass |
| M4 — Inbox/List/detail | Inbox-first UI, return state, accessible Move controls | Keyboard/mobile/failure scenarios pass |
| M5 — Board | Cross-column drag, virtualization, multi-tab invalidation | Accessibility and performance gates pass; no manual reorder |
| M6 — Archive/batch/import | Archive/restore, bounded batch, legacy enrollment runs | Downstream matrix and resume/idempotency tests pass |
| M7 — Rollout | Staged flags, runtime monitoring, documentation | Owner sign-off; rollback rehearsal; wiki updated only after verified release |

## Risk register

| Priority | Risk | Mitigation/gate |
|---|---|---|
| P0 | Implementation targets SRS `cards` instead of captured `items` | ADR and code/API naming say UI card = item; schema attaches to `items`. |
| P0 | Silent historical enrollment breaks trust | `workflow_enrolled_at` predicate; migration tests prove legacy rows do not appear/count. |
| P0 | A capture path misses Inbox or a duplicate resets state | DB trigger/default plus full ingestion/duplicate matrix. |
| P0 | Lost multi-tab/device updates | Per-item CAS, request hash/idempotency, current snapshot in `409`, no last-write-wins. |
| P0 | Archive unexpectedly hides retrieval content | Council approves workflow-only archive matrix; badges explain scope. |
| P1 | Migration affects central SQLite triggers/FTS/vectors | Backup rehearsal, manifest comparison, additive migration, flags-off release. |
| P1 | Filter fan-out causes wrong counts or poor performance | Stable IDs, `EXISTS`/CTEs, shared predicate, query-plan and 50k fixtures. |
| P1 | Board renders full backlog or infers totals from loaded rows | Independent keyset pages, SQL counts, DOM cap, virtualization. |
| P1 | Legacy events corrupt launch metrics | Distinct event type/origin; metrics tests exclude baseline and enrollment. |
| P1 | Optimistic failure moves unrelated cards or loses intent | Per-item confirmed snapshot/anchor, local rollback, Retry, batch all-or-nothing. |
| P1 | Batch writes hold SQLite lock too long | Start with 100-item operational chunks; raise only with measured evidence. |
| P1 | Mutation auth repeats current server-action gaps | Explicit route session plus exact-origin checks; direct-route security tests. |
| P2 | “AI category tags” maps to unstable taxonomy | Public filter contract uses manual tags and AI topics as separate ID facets. |
| P2 | Timezone/DST changes daily metrics | Persist owner timezone, UTC storage, boundary fixtures. |
| P2 | Manual reorder scope expands concurrency and accessibility cost | Defer; status-only drag; future rank is a separate council decision. |
| P2 | Cross-device page appears stale | Focus/online revalidation, conservative polling, visible refresh affordance; CAS protects writes. |
| P2 | Hard delete changes historical metrics | Privacy-first cascade documented; no retained rollup without explicit retention decision. |

## Decisions required before production implementation

1. Approve Option B: persisted baseline plus explicit enrollment for legacy history.
2. Approve workflow-only archive scope and unchanged Review/search/Ask eligibility.
3. Approve product metrics as first-ever Inbox exit and first-ever Done entry.
4. Approve phase-one status-only drag with no intra-column manual ordering.
5. Confirm AI filter wording as User tags and AI topics, not a blended “category tags” facet.
6. Approve online-only workflow mutations and fetch-based cross-device convergence.

## Non-goals

- No production code or migration is authorized by this artifact.
- No assignees, due dates, reminders, dependencies, sprints, WIP limits, or collaboration.
- No automatic AI-driven workflow transitions.
- No archive-as-delete or archive-as-worker-cancellation behavior.
- No second item/card aggregate, no reuse of SRS `cards`, and no status encoded as taxonomy.
- No offline workflow mutation queue in phase one.
- No manual rank until prototype and runtime evidence justifies its additional model.

## Final architecture position

Proceed with **Option B: an enrolled item lifecycle with current state on `items`, separate archive state, and append-only history**. It preserves the platform's strongest invariants—database-default Inbox, atomic history, CAS/idempotency, dedicated queries, and content-free analytics—while honoring the product recommendation not to silently turn the entire historical Library into a backlog. New captures enter Inbox automatically; legacy sources enter Processing only through an explicit recent, selected, or all-history enrollment. Phase-one drag moves between statuses only, keeping manual ordering out of the critical path until evidence supports it.
