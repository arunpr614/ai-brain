# Kanban Card Processing — technical plan v2

**Status:** Engineering source of truth; implementation and production verification pending
**Version:** v2
**Date:** 2026-07-12
**Code baseline:** `origin/main` / `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`
**Product authority:** `../product/prd-v2.md`
**Review disposition:** incorporates every finding in `../reviews/technical-plan-v1-adversarial-review.md`
**Selected direction:** Processing, Inbox-first; existing `items` remain canonical

## 1. Authority and implementation gate

Technical plan v1 is superseded and must not drive implementation. This v2 is the engineering source of truth only while it remains consistent with PRD v2 and the accepted UX/UI v2. PRD v2 controls product behavior if a later artifact conflicts; implementation pauses until the conflict is recorded and resolved.

This document does not claim migration 025, APIs, UI, tests, deployment, or live behavior exists. Release still requires all automated/manual evidence, a protected production deployment, live verification, and current repository plus GitHub Wiki documentation.

The v1 adversarial findings are all closed here:

| Finding | V2 disposition |
|---|---|
| Product decisions preceded accepted PRD | PRD v2 is authoritative; AI Topics, visible Today/week metrics, current-Done projection, 30-second tab Undo, exact counts, archive matrix, and conditional virtualization are explicit below. |
| Event rows could not receipt no-op/rejected outcomes | Add immutable `processing_mutation_receipts` for accepted effective, accepted no-op, conflict/ineligible/not-found, expired, and superseded terminal outcomes. |
| Deep readiness could run on every request | Split deploy/startup/periodic deep audit from one-row O(1) request gating and affected-item transactional assertions. |
| Per-status Board pagination could not serve non-status groups | Status grouping uses four status keysets; every non-status grouping uses bounded server group metadata plus independent global group keysets. |
| Cross-column/event invariants were advisory | Add projection validation triggers, partial-insert rejection, deferred last-event linkage, event/receipt immutability, Undo-target constraints, and fail-closed repair tooling. |
| Enrollment lifecycle was incomplete | Define frozen materialized previews, TTL, single-active-job exclusion, CAS, cancel, retry, delete behavior, cleanup, and bounded worker batches. |
| Timezone algorithm/concurrency was unresolved | Use a versioned preference table with CAS/idempotency and `@js-temporal/polyfill` for zoned boundaries. |
| Rollback/observability were intentions | Define artifact paths/checksums, flag snapshots, restore script, audit timers, alert windows/destinations, smoke IDs/cleanup, and rehearsal evidence. |

No migration/API/UI work begins if product/UX contracts conflict, terminal receipt truth is incomplete, a group mode lacks server pagination/count truth, deep scans sit on a request path, or the known-good rollback cannot be rehearsed.

## 2. Verified current baseline

Read-only production checks on 2026-07-12 established, without reading user content or changing state:

| Signal | Baseline |
|---|---|
| Service | active |
| Runtime | Node `v22.22.3` |
| Authenticated loopback health | `{ok:true}` |
| SQLite size | 7,520,256 bytes |
| Retained items | 129 |
| Applied migration filenames | 26 |
| Latest migration | `024_recall_manual_sync.sql` |
| SQLite quick check | `ok` |
| Foreign-key check | no rows |
| Data-filesystem free space | approximately 30,362,880 KB (about 30 GB) |

The current repository has 25 SQL files through `024`, including two distinct `017_*.sql` files. Migration checks compare the exact `_migrations.name` manifest, never the highest prefix or a presumed count.

Local baseline is green on Node `v22.22.3` and npm `10.9.8`: typecheck, lint, 843 tests in 92 suites, and Next.js 16.2.9 standalone build. Fresh migration smoke reaches 024 with integrity OK and no foreign-key rows. These facts are comparison points, not feature/release evidence. Synthetic 10k/50k and isolated production-copy rehearsal remain mandatory.

## 3. Architecture decision and boundaries

Extend `items` with a compact current workflow projection. Store content-free canonical events, terminal mutation receipts, one Undo slot per actor tab, enrollment jobs, owner timezone, and one runtime checkpoint. All writes remain short synchronous SQLite transactions.

```text
genuine capture
  -> src/db/items.ts::insertCaptured
  -> one transaction
       items projection/version 1
       terminal accepted-effective receipt
       initialized event
       existing FTS/enrichment/transcript triggers

old-code/future raw INSERT with untouched workflow defaults
  -> independent AFTER INSERT guard
       valid version-1 Inbox projection
       raw-initialization receipt + event

browser read/write
  -> handler verifies session itself
  -> writes require exact same Origin
  -> O(1) runtime checkpoint (never quick/FK/full scan)
  -> normalized contract/repository
  -> receipt + projection/event/slot atomically

deep readiness
  -> deploy/startup checkpoint + six-hour systemd audit
  -> schema/trigger/receipt/event/projection scans + quick/FK
  -> one-row green/red latch consumed by requests
```

Processing archive filters only Processing active reads. It does not hide or disable the source in Library, item detail/My notes, exact/semantic search, Ask/citations, Related, Needs Upgrade, Attention Review/SRS, duplicate matching, export, workers, or backups.

There is no generic `GET /api/items/[id]` in current main. Full content remains the authenticated server-rendered `/items/[id]` route. Workflow APIs expose only bounded allow-listed projections.

## 4. Alternatives

| Option | Decision | Reason |
|---|---|---|
| Workflow as User tag, auto tag, AI Topic, category, collection, quality, enrichment, or SRS state | Reject | These are independent current concepts and mutation lifecycles. |
| Reuse SRS `cards` | Reject | It is unrelated question/answer review substrate. |
| Event-only current state | Reject | Makes counts/order/CAS expensive and complicated. |
| Separate workflow-item identity | Reject for v1 | Adds joins and consistency without multi-board/multi-owner need. |
| `items` projection + events + receipts | Adopt | Fast current truth, historical metrics/Undo, complete durable idempotency. |
| Event as the only receipt | Reject | Cannot record no-op, conflict, ineligible, expired, superseded, or not-found outcomes. |
| Trigger-only normal initialization | Reject | Primary behavior must be explicit and provenance-rich. |
| Application transaction + raw guard | Adopt | Testable normal path and old-code/raw defense. |
| Full integrity scan in handlers | Reject | Availability and contention defect; use checkpoint tiers. |
| Client regrouping of status pages | Reject | Cannot give complete non-status group counts/pages. |
| Offset/`SELECT *` Processing reads | Reject | Unstable, unbounded, and private-data overfetch. |
| Mandatory virtualization | Reject | Bounded non-virtualized paging is valid if its evidence branch passes. |
| JS `Intl` local-to-instant hand-rolling | Reject | Ambiguous/skipped time correctness is too fragile. |
| Direct metric rollups | Defer | Indexed retained-item queries first; add cache only from measured need. |

## 5. File and module plan

| Target | Responsibility |
|---|---|
| `src/db/migrations/025_item_workflow.sql` | Projection, receipts, events, slots, jobs, preferences, runtime state, constraints, indexes, guard and epoch triggers. |
| `src/db/client.ts` | Extend `ItemRow`; preserve WAL/FK/NORMAL/5s timeout and exact filename migration runner. |
| `src/db/items.ts` | Atomic new item + receipt + event; nested Recall proof. |
| `src/db/item-workflow.ts` | CAS transitions, terminal receipts, replay/outcome, slots, Undo, affected-item assertions. |
| `src/db/processing-queries.ts` | Summary/counts/pages/group metadata/group pages/archive/metrics. |
| `src/db/processing-enrollment.ts` | Preview materialization, job CAS/worker/cancel/retry/cleanup. |
| `src/db/processing-readiness.ts` | One-row hot gate, full audit, failure latch, typed repair plans. |
| `src/lib/processing/contracts.ts` | Zod inputs, enums, DTO/error/receipt schemas and bounds. |
| `src/lib/processing/transitions.ts` | Pure transition and exact prior/result projection facts. |
| `src/lib/processing/filters.ts` | Manual User-tag + AI Topic normalization and shared SQL parameters. |
| `src/lib/processing/cursor.ts` | Versioned HMAC cursor/group cursor/filter hash/epochs. |
| `src/lib/processing/time.ts` | Temporal-based owner-local Today/Monday/capture-age boundaries. |
| `src/lib/processing/metrics.ts` | Effective event and retained-item metric predicates. |
| `src/lib/processing/flags.ts` | Executable schema/read/write/navigation gate evaluation. |
| `src/lib/processing/http.ts` | Explicit session-only auth, exact origin, private/no-store responses. |
| `src/lib/processing/observability.ts` | Content-free rotating samples and threshold inputs. |
| `src/app/processing/page.tsx` | Dynamic authenticated Inbox-first route. |
| `src/components/processing-*.tsx` | Summary, Inbox/Board/List/Archived, group/sort, filters, actions, focus/live regions. |
| `src/app/api/processing/{summary,items,board-groups,board-items,filters}/route.ts` | Private bounded reads. |
| `src/app/api/processing/mutations/[mutationId]/route.ts` | Scoped terminal outcome plus current truth/slot. |
| `src/app/api/processing/enrollment/jobs/...` | Preview/status/confirm/cancel/retry. |
| `src/app/api/processing/preferences/timezone/route.ts` | Versioned timezone GET/PUT. |
| `src/app/api/items/[id]/workflow/route.ts` | Move/archive/restore/reprocess. |
| `src/app/api/items/[id]/workflow/undo/route.ts` | Tab-slot Undo. |
| `src/app/items/[id]/page.tsx` + workflow client | Independent workflow control and validated return context. |
| `src/components/sidebar.tsx`, `sidebar-routing.ts`, `src/app/more/page.tsx` | Flagged navigation and exact Inbox badge. |
| Library/search/result/citation/detail renderers named in §16 | Bounded archive metadata/badges only; membership unchanged. |
| `.env.example`, `scripts/deploy.sh` | Disabled flags, artifact/flag snapshot, deep audit, staged release gates. |
| `scripts/check-processing-readiness.mjs` | Full content-free audit and checkpoint writer. |
| `scripts/repair-processing-integrity.mjs` | Plan-first, confirmed bounded repair under flags-off/backup. |
| `scripts/check-processing-operational-health.mjs` | Windowed thresholds and exit status. |
| `scripts/rollback-processing-release.sh` | Checksum-verified known-good code/flag rollback. |
| `scripts/deploy/brain-processing-audit.{service,timer}` | Six-hour deep audit outside request paths. |
| `scripts/deploy/brain-processing-health.{service,timer}` | Five-minute threshold evaluation/alert. |

Tests remain beside modules/routes under `node:test`; add reviewed browser E2E tooling and manual AT evidence before release.

## 6. Migration 025 schema

Migration `025_item_workflow.sql` is additive. It creates no event/receipt per historical item and performs no unbounded enrollment/backfill.

### 6.1 `items` workflow projection

Add:

```sql
workflow_status TEXT NOT NULL DEFAULT 'inbox'
  CHECK (workflow_status IN ('inbox','todo','in_progress','done')),
workflow_version INTEGER NOT NULL DEFAULT 0 CHECK (workflow_version >= 0),
workflow_legacy_baseline INTEGER NOT NULL DEFAULT 0
  CHECK (workflow_legacy_baseline IN (0,1)),
workflow_enrolled_at INTEGER,
workflow_initialized_at INTEGER,
workflow_inbox_entered_at INTEGER,
workflow_inbox_episode_id TEXT,
workflow_status_changed_at INTEGER,
workflow_current_done_entered_at INTEGER,
workflow_archived_at INTEGER,
workflow_last_event_uuid TEXT
```

Before insert/update validation triggers are created, mark only rows already present as `workflow_legacy_baseline=1`. Future inserts default to 0. Do not use `captured_at` to identify legacy rows because Recall may backdate it.

State invariants:

| State | Required projection |
|---|---|
| Dormant legacy | legacy 1, Inbox/version 0, all workflow times/episode/last-event null |
| New Inbox | legacy 0, version 1, initialized/enrolled/status-change/current-entry/episode/last-event non-null, archive/current-Done null |
| Enrolled legacy Inbox | legacy 1, version 1, initialized null, enrolled/status-change/current-entry/episode/last-event non-null |
| Active To Do/In Progress | enrolled, archive/current-entry/episode/current-Done null, status-change/last-event non-null |
| Active Done | enrolled, archive/current-entry/episode null, current-Done/status-change/last-event non-null |
| Archived | enrolled, status Done, archive/current-Done/status-change/last-event non-null, current-entry/episode null |

`workflow_current_done_entered_at` means the latest effective entry into the current Done stay. Non-Done -> Done sets it; leaving Done clears it; archive/restore preserves it; reprocess clears it; Undo restores the exact prior value. It drives current Done order only. First-lifetime Completed is event-derived.

### 6.2 `processing_mutation_receipts`

Create an immutable terminal receipt ledger:

```text
mutation_id TEXT PRIMARY KEY
scope_type TEXT NOT NULL                 -- item_workflow|timezone|enrollment_job|initialization
item_id TEXT NULL REFERENCES items(id) ON DELETE CASCADE
scope_key_hash TEXT NOT NULL             -- HMAC of normalized scope; no unknown raw ID
action_type TEXT NOT NULL
actor_tab_id TEXT NULL
request_fingerprint TEXT NOT NULL         -- SHA-256 canonical bounded request
expected_version INTEGER NULL
outcome_class TEXT NOT NULL               -- accepted_effective|accepted_noop|rejected
result_code TEXT NOT NULL                 -- allow-listed terminal code
accepted_event_uuid TEXT NULL
accepted_item_version INTEGER NULL
observed_item_version INTEGER NULL
confirmed_at INTEGER NULL
undo_eligible_until INTEGER NULL
undo_target_event_uuid TEXT NULL
created_at INTEGER NOT NULL
expires_at INTEGER NULL
```

Allow-listed rejected codes include `version_conflict`, `action_ineligible`, `item_not_found`, `undo_expired`, `undo_superseded`, and `undo_invalid_target`. Auth/origin/oversize/malformed requests rejected before a valid canonical mutation can be established are not receipted. Every authenticated, origin-valid request with a valid mutation ID and canonical bounded action gets exactly one terminal receipt—including same-state no-op and state-dependent rejection.

Receipts for an existing item live until hard delete and cascade with it. Content-free receipts with no existing item use only the scope HMAC, expire after 90 days, and are deleted in bounded maintenance batches; their documented idempotency window is 90 days. Receipt rows cannot be updated. Exact mutation replay compares the fingerprint and returns the immutable receipt plus the current projection and current tab-slot truth. A changed fingerprint returns 422 and cannot replace the receipt.

### 6.3 `item_workflow_events`

Create:

- unique opaque `event_uuid`;
- `item_id REFERENCES items(id) ON DELETE CASCADE`;
- unique `(item_id,item_version)`;
- unique `mutation_id REFERENCES processing_mutation_receipts(mutation_id)`;
- event type `initialized|raw_initialized|enrolled|status_changed|archived|restored|reprocessed|undo`;
- exact from/to status, archive time, Inbox entry time/episode, status-change time, and current-Done time;
- allow-listed origin/surface/actor channel, optional actor-tab ID and reason;
- `undo_of_event_uuid` unique self-FK, deferred, referencing a non-Undo event on the same item;
- UTC `occurred_at`.

Events contain no content, URL, title, note, summary, transcript, taxonomy label, query, prompt/provider payload, free-form error, or JSON metadata. Hard delete cascades them; retained-item historical totals can decrease.

`workflow_last_event_uuid` is a deferred FK to `item_workflow_events.event_uuid`. Every effective projection version has exactly one last event. Dormant rows have none; no-op/rejected receipts do not change it. Event-insert triggers require receipt `accepted_event_uuid`, event item/version, and all to-facts to match the projection. This closes the item-committed/event-missing gap at commit without an `items` rebuild.

### 6.4 Undo slots

`processing_undo_slots` is keyed by opaque UUID `actor_tab_id` and stores target event/mutation/item, confirmation, eligibility deadline, and updated time with FKs that cascade on item delete. A reversible action upserts the slot only after its effective transaction confirms. Failed/conflicted/no-op/non-reversible requests never replace it. Undo consumes the slot; later confirmed reversible action replaces it. Expired slots are cleaned after 24 hours, but receipt replay still reports original outcome and current slot truth.

Actor-tab IDs live in the mounted application shell memory: client navigation, including detail navigation, preserves them; full reload/closed tab creates a new ID, matching PRD v2. They are not identity or authorization credentials.

### 6.5 Enrollment, preferences, runtime state

Create:

- `processing_enrollment_jobs`: versioned state, mode, frozen count/hash, preview/as-of/recent boundary/timezone+version, confirmed time, progress counters, attempts, bounded error, expiry, cancellation and completion times;
- `processing_enrollment_job_items`: job FK cascade, nullable item FK `ON DELETE SET NULL`, scope hash, stable ordinal, `pending|enrolled|already_enrolled|deleted` result;
- `processing_preferences`: singleton owner timezone, integer version, initialization/update times, last mutation ID;
- `processing_runtime_state`: singleton schema version, workflow/taxonomy epochs, `unverified|green|red`, failure latch/code, last deep success/attempt, audited app SHA/migration hash, update time.

A partial unique index on a constant permits only one active enrollment job across `previewing|preview_ready|confirmed|running|cancel_requested`. Epoch triggers increment workflow epoch for each effective event and taxonomy epoch for `tags`, `item_tags`, `topics`, or `item_topics` mutations. Cursor validation reads epochs once; it never scans those tables.

### 6.6 Indexes

Prove with `EXPLAIN QUERY PLAN` before freezing:

- partial active Inbox `(workflow_inbox_entered_at,id)`;
- partial active status `(workflow_status,workflow_status_changed_at DESC,id)`;
- partial active Done `(workflow_current_done_entered_at DESC,id)`;
- partial Archived `(workflow_archived_at DESC,id)`;
- events `(item_id,occurred_at DESC,id DESC)` and `(event_type,occurred_at,item_id)`;
- receipt scope/item/outcome indexes in addition to unique mutation ID;
- slot deadline;
- enrollment state/version and job-item `(job_id,result,ordinal)`.

Filter/group indexes are added only from 50k plans; correlated `EXISTS` avoids tag-topic fan-out.

## 7. Database-enforced invariants and raw guard

Migration 025 adds focused triggers, all tested on fresh and upgraded databases:

1. **Insert shape:** a post-025 new row may be only untouched version-0 defaults (for old code/raw guard) or a complete valid version-1 initialized Inbox projection. Setting legacy 1 on a newly inserted row or supplying a partial workflow projection aborts.
2. **Projection shape:** INSERT/UPDATE rejects Inbox without entry/episode, non-Inbox with either, Done without current-Done time, non-Done with current-Done time, archived non-Done, version/time/event mismatches, or initialization on legacy enrollment.
3. **Version/event coupling:** an effective workflow update increments version exactly one, changes last-event UUID, and must satisfy the deferred event link. A non-workflow item update may not change any workflow field.
4. **Event linkage:** event to-facts/item/version and accepted receipt/event UUID must match current projection; Undo target must be same-item, non-Undo, unique, and earlier.
5. **Append-only:** event and receipt UPDATE always aborts. Direct event/known-item receipt DELETE aborts while the parent exists; parent hard-delete cascade is allowed. Expired null-item receipt cleanup is allowed only after `expires_at`.
6. **Affected-item assertion:** every repository mutation re-reads the one item, receipt, last event, and slot inside the transaction before commit.

The raw `AFTER INSERT` guard matches only untouched non-legacy version-0 defaults. It inserts a terminal initialization receipt with random mutation/event IDs, updates the row to enrolled Inbox/version 1/episode/last-event, then inserts `raw_initialized`. It maps known capture sources to bounded actor channels and unknown values to `unknown_raw`. Random collision or any invariant failure aborts the entire original INSERT. It does not claim to repair arbitrary partial fields; those are rejected by the insert-shape trigger.

Integrity failure latches runtime readiness red in a separate best-effort short transaction after the failing transaction rolls back. Repair is never automatic: flags off -> verified backup -> `repair-processing-integrity --plan` content-free report -> explicit typed `--apply --confirm` -> full audit. Unsupported corruption requires a forward migration or snapshot restore.

## 8. Central capture and preservation matrix

`insertCaptured()` generates item/event/mutation/episode IDs and one timestamp, then inserts complete version-1 Inbox projection, accepted-effective receipt, and initialized event in one transaction. Existing FTS, enrichment, and transcript triggers remain inside it. Event or assertion failure rolls back every side effect. Recall's outer transaction/savepoint behavior is explicitly tested.

| Path | New identity | Existing identity |
|---|---|---|
| Web note/URL/PDF | initialize once | current explicit duplicate behavior; any reused identity preserves |
| JSON URL/note/PDF | initialize once | duplicate window/upgrade preserves |
| Extension/Android | inherit API behavior | preserves |
| Telegram URL/YouTube/note/PDF | initialize once | duplicate/repair preserves |
| Recall | initialize once | stable-ID skip/weak upgrade preserves |
| Transcript/owned media/repair/upgrade | no initialization | preserves |
| Enrichment/embed/note index | never initializes/resets | preserves |
| Old-code/raw untouched insert | guard initializes once | N/A |
| Raw partial workflow insert | abort | N/A |

Only effective genuine-capture initialization is Added. Enrollment, duplicate, repair, replay, return, reprocess, and background work are excluded.

## 9. Transitions, ordering, and current Done

- any active status moves to any other;
- same-state Move persists `accepted_noop` receipt but no event/version/time/metric/slot change;
- entering Inbox creates a new episode/current-entry except Undo restores prior exact facts;
- exiting Inbox clears current entry/episode while the event carries the exited episode;
- entering Done sets `workflow_current_done_entered_at`; leaving clears it;
- Archive is active Done only, preserves current Done, and sets archive;
- Restore clears archive and remains Done, preserving current Done;
- Reprocess atomically clears archive/current Done and enters Inbox/new episode;
- archived Move is rejected; Restore/Reprocess first;
- hard Delete stays separate.

Workflow-default keysets:

| Scope | Order |
|---|---|
| Inbox | current Inbox entry ASC, ID ASC |
| To Do/In Progress | status change DESC, ID ASC |
| Done | current Done entry DESC, ID ASC |
| Archived | archive time DESC, ID ASC |

Board/List default remains Workflow status + Oldest captured. Supported sorts/groups exactly match PRD v2. There is no custom fixture order, manual rank, fractional position, or drag reorder. Drag changes status only under Workflow-status grouping and remains off until all gates pass.

## 10. AI taxonomy and filters

The AI facet is **AI Topics** using stable `topics`/`item_topics` IDs. User tags use only `tags.kind='manual'`. Auto tags and scalar `items.category` are excluded from the AI facet and cannot affect its filter membership.

- OR within User tags; OR within AI Topics; AND across facets;
- explicit No user tags and No AI topics via `NOT EXISTS`;
- bounded, deduplicated, sorted IDs;
- page, group, and aggregate SQL share one normalized predicate;
- `EXISTS` or pre-grouped subqueries prevent fan-out multiplication;
- taxonomy trigger increments epoch; stale cursor returns typed normalized restart.

Primary tag/topic group is canonical display name ASC then stable ID, recomputed at query time; absent membership uses `none`. Rename/delete/topic membership changes increment taxonomy epoch, invalidate old group cursors, refresh group metadata/counts, and never change workflow status/unfiltered totals.

## 11. Exact counts and metrics

Every active summary returns zero-filled maps independent of pagination:

```text
totalByStatus:    { inbox, todo, in_progress, done }
matchingByStatus: { inbox, todo, in_progress, done }
```

Totals cover all enrolled/unarchived items; matching applies normalized filters. Archived total/matching are separate. Inbox health is `totalByStatus.inbox`. Load failure returns unavailable—not zero/stale.

Summary also returns unfiltered owner-wide:

- `inboxNow`, oldest current Inbox time/age;
- `processedToday`, `processedWeekToDate`;
- `completedToday`, `completedWeekToDate`;
- `addedToday`, `addedWeekToDate`;
- exact Today/week/as-of UTC boundaries, timezone/version, Monday disclosure.

Processed is one effective owner-driven Inbox exit per episode. Completed is the earliest effective owner-driven Done event in retained item lifetime, counted in the window containing that effective event. Current Done projection never substitutes. Linked Undo makes its target ineffective. No-op/rejected/pending/unknown, baseline/enrollment, duplicate/repair, and ordinary return do not count. Hard delete cascades history and can reduce prior recomputed totals.

The UI persistently shows Inbox health, primary week `{processed,added,completed}`, and secondary neutral visible Today `{processed,completed}`. No streak/goal/judgment/progress comparison is implemented.

## 12. Timezone CAS and calendar algorithm

Add reviewed runtime dependency `@js-temporal/polyfill`; pin it in the lockfile. Validate IANA identifiers by constructing a Temporal zoned date-time.

`GET /api/processing/preferences/timezone` returns `{timezone|null, version}`. `PUT` requires `{timezone,expectedVersion,mutationId}`. First initialization succeeds only at version 0; change increments version; same value is an accepted no-op receipt. Conflict persists a terminal receipt and returns 409 plus current preference. Exact replay returns original receipt plus current preference.

Use `Temporal.Instant` -> owner `ZonedDateTime` -> local `PlainDate` -> `startOfDay()` and next date/Monday boundaries -> UTC instants. Temporal-compatible disambiguation governs skipped/ambiguous midnight and is fixture-tested. Store events in UTC epoch milliseconds; timezone change only re-buckets queries.

Capture-age Board groups freeze `asOfUtc`, timezone, and timezone version in group metadata/cursors. Mutually exclusive bins are Today `[todayStart,asOf]`, Previous 7 days `[todayStart-7 local dates,todayStart)`, Previous 30 days `[todayStart-30 local dates,todayStart-7)`, and Older. Timezone/version change invalidates those cursors.

## 13. Board/List read model and pagination

Processing DTOs allow only item ID, bounded title/excerpt, source/type/channel/quality, capture time, workflow projection/version/archive badge, and visible User-tag/AI-Topic labels. Never return body, note text, full summary, quotes, transcript, artifacts, provider data, tokens, or internal events.

### Workflow-status grouping

`GET /api/processing/board-groups?group=workflow_status` returns the four fixed groups and exact matching/total counts. `GET /api/processing/board-items?group=workflow_status&groupKey={status}` uses one independent status keyset. Mobile selects one status; desktop loads bounded first pages for four.

### Every non-status grouping

Never regroup status pages in the client. `board-groups` executes a global aggregate over the normalized active set and keyset-paginates group descriptors, maximum 20 per response, with exact group count. `board-items` accepts one validated `groupKey` and returns a global across-status item keyset for that group. Each visible group has its own item cursor; group metadata has its own cursor.

Group keys:

- Primary User tag / AI Topic: stable ID or `none`;
- source type/channel/quality: allow-listed enum or `none`;
- capture age: frozen bins from §12;
- No grouping: singleton `all`.

Group descriptors include stable key, current label, exact matching count, and selected sort. Labels are response-only and never cursor/log/event data. Group metadata and item cursors bind group mode/key, normalized sort tuple, item/group tie-breaker, filter hash/version, workflow epoch, taxonomy epoch, archive scope, timezone version/as-of where applicable, and cursor schema version. HMAC using a domain-separated server secret rejects tampering. Epoch mismatch returns `409 cursor_stale` with normalized restart, never misleading empty data.

Inbox/List/Archived use independent normalized keysets. Page limits default 50/max 100; group metadata defaults 10/max 20. Counts/groups are SQL truth before page limits. Concurrent mutation/taxonomy change invalidates cursors and revalidates focus rather than risking duplicates/omissions.

## 14. Private API contract

All routes are dynamic and handler-session-only. Success and error responses set `Cache-Control: private, no-store, max-age=0`, `Vary: Cookie`, and `X-Content-Type-Options: nosniff`; the service worker never caches them.

### Reads

- `GET /api/processing/summary`
- `GET /api/processing/items?view=inbox|list|archived...`
- `GET /api/processing/board-groups...`
- `GET /api/processing/board-items...`
- `GET /api/processing/filters`
- `GET /api/processing/mutations/[mutationId]?itemId=...&actorTabId=...`
- `GET /api/processing/enrollment/jobs/[jobId]`
- `GET /api/processing/preferences/timezone`

### Writes

- `PATCH /api/items/[id]/workflow` with expected version, mutation ID, actor-tab ID, one move/archive/restore/reprocess action;
- `POST /api/items/[id]/workflow/undo` with expected version, mutation ID, actor-tab ID, target event UUID;
- `POST /api/processing/enrollment/jobs` to start preview;
- `POST /api/processing/enrollment/jobs/[jobId]/confirm|cancel|retry` with job expected version and mutation ID;
- `PUT /api/processing/preferences/timezone` with expected version and mutation ID.

Every handler verifies a valid session cookie itself. Workflow v1 accepts no bearer-only caller. This is especially mandatory under `/api/items/...` because the current bearer allow-list prefix lets a valid generic bearer reach descendant handlers. A valid bearer with no valid session returns 401. Writes require exact same non-empty Origin; do not use capture's looser CLI/extension Origin helper.

Bound content type/body bytes, page/group/filter counts, IDs/UUIDs, actor-tab, cursor, and unexpected fields before repository work. Parameterize SQL and map enums explicitly. Unknown/inaccessible scope returns normalized 404 without an existence oracle.

## 15. Mutation, replay, unknown outcome, and 30-second Undo

### Terminal transaction

For a canonical mutation:

1. O(1) gate reads runtime singleton and flags;
2. existing mutation ID: compare fingerprint; mismatch 422; match returns immutable receipt + current projection/preference/job and current tab slot;
3. load current scope and derive terminal result;
4. accepted no-op or rejected result inserts one immutable receipt and changes nothing else;
5. effective action inserts accepted receipt, updates projection/version/last-event, inserts event, asserts affected item, and if reversible upserts actor-tab slot—all in one transaction;
6. return receipt, current truth, and current slot.

HTTP/result mapping: effective/no-op 200; version conflict/action ineligible/superseded 409; unknown item 404; expired Undo 410; changed fingerprint 422; DB busy/transport ambiguity 503 without false terminal success. On connection loss, client calls outcome lookup before retry. Missing receipt means unknown; present receipt is authoritative.

### Tab slot and rapid actions

Reversible confirmations are Move, Archive, Restore, Reprocess. Eligibility is exactly `confirmedAt + 30,000ms`; server accepts at/before. B replaces A only when B confirms, even across items. If B fails/conflicts/is unknown/no-op, A remains until original expiry. Different tabs have independent slots. Same-item later confirmation changes version and supersedes A. Exact replay returns current slot and never resurrects A.

Undo verifies target equals current tab slot, has not expired, is non-Undo/reversible, and expected version still matches. Superseded returns 409/current truth; expired returns 410/current truth; intervening item mutation returns conflict. Effective Undo restores exact prior status/archive/Inbox time+episode/status-change/current-Done, inserts a linked event/receipt, and consumes the slot. Undo itself is not undoable. Permanent native Move/Restore/Reprocess remains available after expiry/supersession and creates honest new history rather than invalidating the prior event.

Client per-item truth: `idle -> pending -> confirmed | failed | conflicted | outcome_unknown -> reconciled`. BroadcastChannel only invalidates. Offline retains loaded reads and disables writes; no queue.

## 16. Authoritative archive integration matrix

| Surface | Membership after archive | Technical change and regression |
|---|---|---|
| Active Processing | Excluded | enrolled + archive-null predicate; Done count decrements only after confirmation. |
| Processing Archived | Included | archive keyset/filter/count; badge/time; Restore/Reprocess/Open and trust-state tests. |
| Library | Included | optional bounded workflow metadata; no membership/count/filter change; Open only. |
| Item detail/My notes | Included | badge/time plus Restore/Reprocess; notes and hard Delete remain independent. |
| Exact/FTS search | Included | no active predicate; hydrate badge after ranked result; rank/membership unchanged. |
| Semantic/hybrid search | Included | vectors/chunks stay; no active predicate/re-embed; badge/citation disclosure. |
| Ask/citations | Included | retrieval unchanged; cited detail discloses archive. |
| Related | Included | relation unchanged; badge where rendered. |
| Needs Upgrade | Included | quality predicate/count/repair unchanged; repair preserves workflow. |
| Attention Review/SRS | Included | no workflow predicate; SRS `cards` unchanged; badge where rendered. |
| Duplicate/capture result | Included | match normally, disclose archived identity, never reset/unarchive; explicit workflow UI reprocess only. |
| Export | Included | membership/content unchanged; documented workflow status/archive metadata; no event history by default. |
| Enrichment worker | Continues | no archive predicate; content/taxonomy changes preserve lifecycle. |
| Embedding/index/note-index | Continues | queues/vectors/chunks/note index unchanged. |
| Quality/transcript/repair workers | Continues | no archive predicate; recovery preserves status/archive/version. |
| Backups | Included | projection/events/receipts follow SQLite backup; isolated restore equality test. |
| Hard delete | Removed | existing cleanup plus cascade events/receipts/slots/job item ID; metrics recompute. |

No non-Processing query receives `workflow_archived_at IS NULL`. Each row above has a named integration fixture before release. Badge hydration is bounded and may not change existing ranking/pagination.

## 17. Enrollment job lifecycle

State machine:

```text
previewing -> preview_ready -> confirmed -> running -> completed
     |              |             |          |
     +-> failed     +-> expired   +-> cancel_requested -> cancelled
                                   +-> failed -> retry -> running
```

- Only one active job is DB-enforced. A second request returns 409/current job.
- Preview freezes `previewAsOfUtc`, owner timezone/version, mode boundaries, and an ordered candidate snapshot in job items. Selected/recent responses may return bounded IDs; All returns count/hash/token, never 50k IDs.
- Recent uses the owner-local 30-calendar-day boundary frozen at preview and newest 25 by `captured_at DESC,id`; response includes exact overflow and All option.
- Preview materialization is batched at 500 rows/transaction and pollable; `preview_ready` stores SHA-256 of ordered scope hashes and exact count.
- Ready preview expires 15 minutes after completion. Confirm requires job version/hash/mutation ID before expiry. Timezone/taxonomy/item changes do not alter the frozen set; deleted IDs become null/deleted results.
- Confirmation time is frozen once and becomes enrollment/current-Inbox time for every item in the job, even if its batch executes later.
- Worker claims at most 100 pending rows/transaction. Dormant row becomes version 1 with enrolled event/receipt; already enrolled is an idempotent result. Hard delete `SET NULL` records deleted without retaining item ID and does not block completion.
- Cancel ready preview immediately; running sets `cancel_requested`, completes current transaction, then `cancelled`. Cancelled requires a new preview.
- Failed confirmed/running job retains pending rows and may retry with CAS up to five attempts; retry resumes, never rematerializes. After five, operator review/new preview.
- Abandoned previewing/expired preview rows clean in 500-row batches after 24 hours. Completed/cancelled/failed jobs retain 30 days for content-free evidence, then bounded deletion.

Confirm/cancel/retry use terminal receipts and exact replay. Tests cover two jobs, hard delete before/during, timezone change, expiry boundary, restart, cancellation at batch boundary, retry, cleanup, and 50k writer contention.

## 18. Tiered readiness and runtime gating

### Deep audit—never a request dependency

`check-processing-readiness.mjs` performs exact migration/schema/index/trigger manifest, projection/last-event/receipt/Undo/job invariants, missing initialization, `PRAGMA quick_check`, and `foreign_key_check`. It writes only the singleton checkpoint after the scan. It runs:

1. during deploy after 025 and before any Processing flag;
2. on service startup asynchronously if checkpoint is absent/stale, while Processing remains unavailable;
3. every six hours through `brain-processing-audit.timer` with single-instance lock and low-priority scheduling;
4. after repair/restore.

Target at 50k: complete <=30s on host class, no lock longer than 100ms, and concurrent request p95 degradation <20%. Audit failure immediately latches red. Success records app SHA, exact migration-manifest hash, time, and clears only recognized resolved codes.

### Hot request gate

One primary-key lookup checks schema version, green/red latch, app compatibility, and last deep success age. Budget p95 <=2ms at 50k. No handler runs quick/FK, scans items/events/jobs, or recomputes readiness. Checkpoint older than 24 hours is stale: reads return private 503 unavailable, writes 503, navigation hides; capture initialization/guard remains active.

Every effective write performs O(1) affected-item assertion. Trigger/assertion failure rolls back and latches red. Runtime state contains workflow/taxonomy epochs for cursor invalidation, not an integrity substitute.

### Flags

All default 0:

- `PROCESSING_READ_ENABLED`
- `PROCESSING_WRITE_ENABLED`
- `PROCESSING_NAV_ENABLED`

Effective read = read flag + green/fresh checkpoint. Effective write = effective read + write flag. Effective navigation = effective read + navigation flag. Migration, constraints, central initialization, raw guard, epoch triggers, and receipts for initialization are never flag-disabled. Machine-readable gate output is required in deploy and rollback logs.

## 19. Security, privacy, retention

- Single-owner does not remove handler authorization: every endpoint verifies session; bearer-only is denied.
- Writes require exact same origin, including timezone and enrollment.
- Dynamic/private/no-store/cookie-varying on every success/error; no service-worker cache.
- HMAC cursors/scope hashes use domain-separated keys derived from server secret; request fingerprints hash canonical bounded fields.
- Parameterized SQL, enum-to-clause allow-lists, rate limits, size/page/group/filter bounds, and normalized errors.
- DTO/event/receipt/job/log allow-lists exclude source/note content, URL, title in logs, taxonomy labels outside visible DTO, provider data, secrets, SQL, paths, and generic JSON/free text.
- Actor-tab IDs are opaque behavior scope, not cross-site tracking; no third-party telemetry.
- Archive is not deletion. Hard delete cascades item events/known-item receipts/slots and nulls enrollment job item IDs. Unknown-scope receipt TTL is disclosed above.

Negative tests cover no/expired session, valid bearer only, bearer+invalid session, missing/cross Origin, ID/mutation/job enumeration, malformed/oversized/unknown fields, cursor HMAC/epoch, cache headers on all status classes, receipt scope mismatch, and log/payload inspection.

## 20. Observability and executable alerts

Write content-free structured samples to `data/processing-observability.jsonl`, 5 MiB x 5 rotations, mode 0660 under `brain:brain-data`. Fields are timestamp, operation enum, result/reason enum, scope class, version/count, duration, DB-busy flag, and opaque actor tab/item/mutation IDs. Never log URLs, titles, filters/labels, bodies, notes, excerpts, query strings, request payloads, or stack/SQL in the sample.

`check-processing-operational-health.mjs --window=15m` runs every five minutes and exits nonzero on:

- any readiness red, missing initialization, quick/FK/deep-audit failure (immediate critical);
- deep checkpoint age >24h or audit timer failure (critical);
- >=3 DB-busy or unknown-outcome server results in 15 minutes;
- mutation server-failure rate >5% with >=20 samples;
- conflict rate >25% with >=20 samples (warning, not automatic rollback);
- measured query/mutation p95 above §22 budgets with >=20 samples in two consecutive windows;
- enrollment job no progress for 15 minutes while running.

Destinations: priority-tagged system journal, persistent authenticated Processing/Settings banner sourced from the runtime singleton, and red SwiftBar health state. If owner Telegram alert delivery is configured, criticals also send a content-free code; release does not expose credentials or require Telegram. Operator runbook maps every code to flags-off, audit, repair/rollback, or observe. Alert drill and acknowledged response are release evidence.

Production smoke creates a clearly synthetic source through normal authenticated UI/API, records only returned item/mutation IDs and timestamps in private mode-0600 `data/release-evidence/processing-<sha>.json`, exercises Inbox/Move/Done/Archive/Restore/Reprocess/Undo/counts/metrics, then hard-deletes the fixture and verifies event/receipt cascade. Cleanup failure is a release no-go and alert.

## 21. Known-good artifact and rollback

Current deploy overwrites `/opt/brain`; v2 changes it to preserve an exact rollback artifact before overwrite.

### Artifact contract

- Build a tar archive containing standalone runtime, `.next/static`, `public`, required scripts/unit files, and `release-manifest.json` with git SHA, Node major/ABI, package-lock SHA-256, build time, migration compatibility, and file-list hash.
- Store root-owned mode-0600 at `/opt/brain/data/releases/<git-sha>/ai-brain-<git-sha>.tar.gz` with sibling `.sha256` and processing flag snapshot containing only the three non-secret 0/1 values.
- Before first Processing deploy, package the currently running `/opt/brain` excluding `data` as `pre-processing-<timestamp>` and verify extract/start in staging.
- Keep current + two prior verified artifacts; never delete the sole known-good artifact during deploy.

### Executable code rollback

`scripts/rollback-processing-release.sh --artifact ... --sha256 ...`:

1. sets navigation/write/read flags to 0 atomically and records prior values;
2. creates/quick-checks a pre-rollback SQLite backup;
3. verifies artifact checksum/manifest/Node ABI/migration compatibility;
4. stops `brain`, extracts to a staging directory, replaces runtime files under `/opt/brain` while preserving `data`, repairs native SQLite dependencies using the same deploy function, installs matching unit, and starts service;
5. verifies service active, Node, authenticated health, checkpoint status, private headers, and old-code new-capture guard initialization;
6. records content-free transcript/checksums and leaves Processing flags off.

Rehearsal must prove 025 + old artifact: existing explicit INSERT lists still work and raw guard initializes exactly once. The guard/schema remain during code rollback. Forward repair is normal; no down migration/history rewrite.

Database snapshot restore is destructive last resort. Preserve failed DB/WAL, stop all writers, account for post-snapshot capture/workflow loss, restore only verified backup through existing script, run quick/FK/deep audit/capture/health, and record lost time interval. No operator may call it a routine rollback.

## 22. Performance and conditional virtualization

Deterministic 10k/50k fixtures include realistic statuses/archive, events/receipts, manual-tag/AI-topic fan-out, unassigned groups, source/channel/quality/age groups, long titles, and enrollment jobs. Record Node/SQLite, CPU/RAM/disk, DB/WAL, seed, plans, warm/cold method, p50/p95/max, payload and DOM.

Budgets at 50k:

- hot readiness p95 <=2ms;
- unfiltered summary/count p95 <=100ms;
- filtered summary/group metadata p95 <=200ms;
- first/next item or group page p95 <=200ms;
- mutation transaction including receipt/event/slot/assertion p95 <=250ms excluding network;
- enrollment batch lock <=100ms;
- deep audit <=30s with <20% concurrent p95 degradation.

Test all four status pages, every non-status group metadata/page/next page, exact counts, AI Topic negative auto-tag/category cases, archive, oldest, Today/week, cursor epoch changes, and concurrent mutations/taxonomy changes.

Choose exactly one UI branch:

1. **Virtualized:** prove native list semantics, keyed focus after mutation/filter/page/reconciliation, keyboard/AT browse/action, reduced motion, bounded DOM/memory, overscan, and no missing accessible items.
2. **Non-virtualized (default until need is proven):** page max 100, bounded mounted group/page count, accessible Load more, focus across boundaries, bounded memory/latency, and no unbounded render.

No drag/virtualization dependency enters solely for prototype parity.

## 23. Test plan

### Unit/property

- transition/current-Done/episode/prior-fact tables and same-state receipt no-op;
- receipt fingerprint/result/retention and every terminal code;
- 30-second boundary, rapid A/B same/different item/tab, slot replacement/consumption;
- filter/AI Topic algebra, zero-filled four maps, group keys/bins/cursor epochs;
- effective Processed/Completed/Added, linked Undo, hard delete;
- Temporal midnight/Monday/DST/skipped/ambiguous midnight and timezone CAS.

### Migration/database

- fresh and 024->025 exact manifest, schema/index/trigger, quick/FK;
- dormant legacy no events; central and raw initialization exactly once;
- raw random ID collision, trigger order, partial workflow insert rejection;
- projection/event/receipt mismatch, orphan/cross-item/Undo-of-Undo, direct history update/delete;
- every ingestion path new/duplicate/repair, nested Recall, old-artifact insert;
- accepted effective/no-op, conflict/ineligible/not-found/expired/superseded durable lookup after lost response; changed replay;
- affected-item assertion and red latch; DB busy;
- enrollment expiry/delete/two-job/cancel/retry/restart/cleanup at 50k;
- full archive matrix and notes independence.

### Route/E2E

- session-only/bearer-negative/private headers for every endpoint/status;
- exact four counts and daily/weekly visible metrics;
- Inbox/Board/List/Archived parity and all grouping-specific server pages;
- Process next/focus/pending/failure/conflict/unknown/cursor stale;
- canonical detail return and dirty-note protection;
- rapid tab slots, 30-second Undo and permanent reversals;
- mobile 320/390, Back/Forward, offline loaded reads/no writes;
- archive badges/membership/actions for every matrix row.

### Accessibility/manual

Keyboard, NVDA, VoiceOver, TalkBack, switch, 200%/400% zoom/reflow, text spacing, Light/Dark/forced colors, reduced motion, safe-area/fixed-nav, 30-second Undo and permanent reverse. Drag remains disabled until cancel/Escape/AT/reduced-motion/focus gates. Run the selected virtualization branch only.

### Operations

Deep versus hot gate contention, six-hour/five-minute timers, alert thresholds/destination drill, artifact checksum rollback, native dependency repair, old-code capture, smoke cleanup, forward repair, destructive restore loss accounting.

Release also requires typecheck, lint, all tests, production build, env/artifact checks, and content/privacy inspection.

## 24. Rollout gates

1. **M0 contract:** PRD v2, UX/UI v2, technical v2, traceability and archive rows consistent; adversarial findings closed.
2. **M1 schema rehearsal:** verified backup/copy, 025, invariant injection, exact manifest, performance, restore, old artifact.
3. **M2 deploy all flags off:** retain/checksum known-good artifact and flag snapshot; apply schema/guard; deep audit green.
4. **M3 capture proof UI off:** representative new/duplicate/repair paths; zero missing initialization; service/Node/auth health green.
5. **M4 reads:** enable read only; private headers, exact four counts, group pages, timezone, Today/week, legacy absence.
6. **M5 writes dogfood:** write on; small preview enrollment; CAS/receipt/outcome/rapid Undo/archive; observe two 15-minute windows.
7. **M6 navigation:** nav on only after accessibility/scale/alert/rollback gates; drag off by default.
8. **M7 live verification:** full production journey on desktop/mobile, archive matrix spot checks, alert/runtime status, smoke cleanup.
9. **M8 docs:** repository docs and Wiki match actual schema/API/flags/runbooks/evidence.

Automatic no-go/rollback-to-flags-off: runtime red/stale, any missing initialization, quick/FK failure, smoke cleanup failure, private endpoint bearer/cache leak, receipt/event duplication, sustained two-window p95 breach, or mutation failure threshold. Conflict warning alone does not roll back. Code rollback follows only if flags off/forward repair do not restore safe service.

## 25. Milestones and ownership outputs

| Milestone | Output | Exit evidence |
|---|---|---|
| M0 — contract closure | v2 artifacts/traceability | No product/UX/engineering conflict. |
| M1 — schema/invariants | 025 + audit/repair | Fresh/upgrade/corruption/old-code proof. |
| M2 — domain/receipts | insert/transitions/events/slots/time/enrollment | Every terminal outcome and metric truth table. |
| M3 — private APIs | bounded reads/writes/groups | Session/bearer/origin/cache/abuse proof. |
| M4 — Inbox/detail | processing loop and independent notes | Focus/failure/return/draft evidence. |
| M5 — Board/List/archive | all groups/counts/matrix | Global group keysets and named row regressions. |
| M6 — scale/a11y | 10k/50k + chosen branch + AT | Budgets/no-go matrix pass. |
| M7 — operations | flags/checkpoint/timers/artifact/alerts | Executable rollback and alert drill. |
| M8 — production | staged flags/live smoke | Live private journey and cleanup verified. |
| M9 — closeout | repo docs + Wiki | Shipped truth current; goal audit complete. |

## 26. Risks and no-go proofs

| Risk | Required mitigation/proof |
|---|---|
| New item without event | Atomic insert + deferred last-event + guard/assertion/deep audit. |
| Old/partial raw insert | Untouched old insert guard; partial shape abort; old artifact rehearsal. |
| Event-only idempotency gap | Durable receipts for effective/no-op/rejected/expired/superseded. |
| Replay installs stale truth | Immutable receipt plus separately loaded current projection/slot. |
| Deep checks harm availability | O(1) hot gate; timed external audits and contention budget. |
| Non-status Board lies | Global group aggregate/keyset; group count/page fixtures at 50k. |
| Wrong AI generated facet | AI Topics only; auto-tag/category negative tests. |
| Done ordering corrupts Completed | Current-Done projection separate from earliest effective event. |
| Rapid Undo targets wrong action | Server actor-tab slot and confirmation supersession fixtures. |
| Timed Undo excludes users | 30s minimum and permanent native reversals; lengthen if AT evidence fails. |
| Enrollment drifts/locks | Frozen snapshot/hash, TTL/CAS/single job, 100-row batches, lifecycle tests. |
| Timezone race/DST error | Versioned CAS and Temporal fixtures. |
| Archive leaks outside Processing | Full matrix; prohibit non-Processing active predicate. |
| SQLite writer contention | Short bounded transactions, busy contract, 50k concurrent benchmarks. |
| Logs/API leak private data | Allow-lists, session-only/private headers, content inspection. |
| Rollback artifact unusable | SHA/ABI manifest, native repair, staging and production rehearsal. |
| Alert exists but unnoticed | Journal + owner UI + SwiftBar, optional Telegram, response drill. |
| Restore loses new data | Destructive-last-resort loss accounting; forward rollback first. |
| UI scale/focus regression | Conditional virtualization evidence branch. |
| Scope becomes project management | No batch/rank/dates/assignees/sprints/WIP/collaboration/quick preview/global archive. |

## 27. Final engineering acceptance

Implementation is releasable only when PRD v2 acceptance criteria are traced to code and evidence, plus these technical proofs:

1. every canonical terminal mutation outcome is durable and replayable with current truth;
2. no deep scan appears in a route/server-action hot path;
3. each supported Board grouping has complete bounded server group/item pagination and exact counts;
4. DB rejects partial workflow rows, projection/event/receipt mismatch, orphan/invalid Undo, and direct retained-history mutation;
5. enrollment, timezone, flags, checkpoint, alerts, artifact rollback, native dependency repair, and smoke cleanup state machines execute as documented;
6. every endpoint is session-only, bearer-negative, private/no-store, bounded, and content-safe;
7. 10k/50k budgets and exactly one virtualization evidence branch pass;
8. production staged rollout and live private experience are verified without claiming success early.

This v2 is the engineering source of truth. The persistent execution goal remains incomplete until the feature runs successfully in production, the live experience is verified, and repository documentation plus GitHub Wiki are current.
