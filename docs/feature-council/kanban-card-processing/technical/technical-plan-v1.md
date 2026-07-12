# Kanban Card Processing — technical plan v1

**Status:** Implementation plan v1 for adversarial review; no implementation or release is claimed
**Date:** 2026-07-12
**Code baseline:** `origin/main` / worktree baseline `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`
**Product contract:** `../product/prd-v1.md` and `../discovery/approved-requirements-baseline.md`
**Primary evidence:** `../discovery/current-state-report.md`, `../discovery/relevant-code-map.md`, `initial-data-migration-assessment.md`, `../qa/baseline-verification.md`, and prior source `Kanban-designs/technical/technical-plan-v2.md`

## 1. Executive decision

Implement Processing as a small current-state projection on the canonical `items` row plus a content-free, append-only `item_workflow_events` history. Add bounded Processing repositories and APIs; keep Library, search, Ask, Related, item detail, My notes, taxonomy, quality, enrichment, and hard deletion canonical and independent.

Every genuine new item is initialized as an enrolled Inbox item at version 1 inside the central `insertCaptured()` transaction. An independent SQLite `AFTER INSERT` guard initializes old-code, future, or raw SQL inserts that omit workflow fields. Duplicate, repair, transcript, enrichment, embedding, indexing, and note paths never initialize, reset, unarchive, or count an existing item.

Migration `025_item_workflow.sql` is additive. Existing rows become identifiable dormant legacy rows and remain absent from Processing until explicit enrollment. The migration creates no event per historical item and performs no unbounded boot backfill.

All workflow browser handlers are session-only in v1 and enforce session and exact same-origin checks themselves. This is mandatory for `src/app/api/items/[id]/workflow/...`: the current bearer allow-list contains `/api/items` and uses prefix matching, so a valid bearer token can pass the proxy for every descendant path. Bearer-only workflow requests must still receive 401 from the handler.

## 2. Evidence and operational baseline

The static discovery report correctly describes current code but predates the later read-only production check. The later QA baseline supersedes its “production not inspected” limitation only for these content-free operating facts:

| Signal | Verified read-only baseline |
|---|---|
| Application service | active |
| Runtime | Node `v22.22.3` |
| Authenticated loopback health | `{ok:true}` |
| SQLite database size | 7,520,256 bytes |
| Retained `items` | 129 |
| Applied migrations | 26 full filenames |
| Latest migration | `024_recall_manual_sync.sql` |
| SQLite quick check | `ok` |
| Foreign-key check | no rows |
| Free space | approximately 30,362,880 KB (about 30 GB) |

The current repository has 25 SQL files through `024`, including two distinct `017_*.sql` files. Production reports 26 applied full filenames, so correctness must compare the exact `_migrations.name` manifest rather than infer count or order from the highest numeric prefix. The production check read no item content, title, URL, note, credential, token, or environment value and changed no state.

Current local baseline gates are green: Node `v22.22.3`, npm `10.9.8`, 843 tests in 92 suites, typecheck, lint, and the Next.js 16.2.9 standalone build. Fresh migration smoke reached `024`, `integrity_check=ok`, and no foreign-key rows. These are pre-feature baselines, not feature evidence.

Production is small enough that an additive migration should be modest, but it is not the scale ceiling. Release still requires isolated production-copy rehearsal and synthetic 10k/50k fan-out benchmarks.

## 3. Architecture and boundaries

```text
genuine new capture
  -> src/db/items.ts::insertCaptured
  -> one SQLite transaction
       -> items row with enrolled Inbox projection/version 1
       -> content-free initialized event
       -> existing FTS/enrichment/transcript triggers

raw/future/old-code INSERT with workflow defaults
  -> independent SQLite AFTER INSERT guard
       -> enrolled Inbox projection/version 1
       -> bounded raw_initialized event

Processing read
  -> normalized filter/cursor/time contracts
  -> bounded workflow repository queries
  -> server page or private JSON response

Processing write
  -> explicit session + exact-origin handler checks
  -> transition/CAS/idempotency service
  -> one projection update + one event transaction
  -> receipt plus current canonical projection
```

Processing archive changes Processing visibility only. No workflow join or `workflow_archived_at IS NULL` predicate may be added to Library, item detail/My notes, exact or semantic search, Ask/citations, Related, Needs Upgrade/Attention Review/SRS eligibility, duplicate detection, export, enrichment/index/quality workers, or backups.

There is no generic `GET /api/items/[id]` in current main. The canonical full item read remains the authenticated server-rendered `/items/[id]` route. Processing APIs return only bounded summary DTOs and must not invent or document a generic item JSON endpoint.

## 4. Alternatives considered

| Option | Decision | Reason |
|---|---|---|
| Encode workflow in User tags, auto tags, topics, category, or collections | Reject | Conflates owner intent and taxonomy, breaks filters/history/metrics, and enrichment can mutate generated taxonomy. |
| Reuse `enrichment_state` | Reject | It is a technical processing queue, not owner workflow intent. |
| Reuse SRS `cards` | Reject | It stores question/answer review state and is not the saved-source aggregate. |
| Event-only workflow | Reject for v1 | Current counts, Inbox age, ordering, and CAS would require expensive event folding. |
| Separate workflow-item table | Defer | Adds identity and join consistency without multi-tenant or multi-board benefit. |
| Projection only, no events | Reject | Cannot support trustworthy metrics, replay receipts, Undo, or auditability. |
| Trigger-only initialization | Reject | Hides normal behavior and makes capture correctness dependent on a guard. |
| Application transaction plus DB guard | Adopt | Explicit/testable normal path with rollback-compatible defense in depth. |
| Synchronous legacy event backfill | Reject | Unbounded startup, lock, WAL, disk, and rollback risk. |
| Offset pagination / Library `SELECT *` reuse | Reject | Unbounded payload, unstable pagination, privacy overfetch, and four-column scaling failure. |
| New global client state store | Reject | URL state plus local per-item mutation state fits current architecture. |
| Direct metric rollup table | Defer | Indexed projection/event SQL is simpler until measurements justify cache invalidation complexity. |
| Batch mutation or manual rank | Deferred by product contract | V1 validates single-item trust and deterministic order first. |

## 5. Module and file plan

Names are implementation targets; review may consolidate small files without changing ownership boundaries.

| File/module | Change |
|---|---|
| `src/db/migrations/025_item_workflow.sql` | Add projection columns, event/enrollment-job tables, indexes, and raw-insert guard. |
| `src/db/client.ts` | Extend `ItemRow` workflow projection types; retain migration runner behavior. |
| `src/db/items.ts` | Make item + initialized event one transaction; preserve nested Recall behavior and existing triggers. |
| `src/db/item-workflow.ts` | Projection reads, transitions, replay/outcome lookup, Undo, integrity queries, enrollment batches. |
| `src/db/processing-queries.ts` | Bounded pages, shared predicates, aggregates, filters, metrics, query-plan-focused SQL. |
| `src/lib/processing/contracts.ts` | Zod schemas, enums, DTOs, response/error contracts, strict limits. |
| `src/lib/processing/transitions.ts` | Pure transition table and prior/next projection derivation. |
| `src/lib/processing/filters.ts` | Normalization, facet algebra, canonical URL values, filter hash/version. |
| `src/lib/processing/cursor.ts` | Versioned authenticated cursor encoding/validation and stable keysets. |
| `src/lib/processing/metrics.ts` | Effective-event rules, episode semantics, retained-item metrics. |
| `src/lib/processing/time.ts` | IANA validation and owner-local day/Monday UTC boundaries. |
| `src/lib/processing/flags.ts` | Read, write, navigation gates; default off. |
| `src/lib/processing/readiness.ts` | Fail-closed schema, guard, invariant, and missing-event checks. |
| `src/lib/processing/http.ts` | Private/no-store headers, explicit session-only auth, exact-origin write guard. |
| `src/app/processing/page.tsx` | Authenticated Inbox-first server entry and normalized URL state. |
| `src/components/processing-*.tsx` | Inbox, Board, List, Archived, Group & sort, filters, item actions, Undo, status/alert regions. |
| `src/app/api/processing/summary/route.ts` | Bounded current health and weekly metrics read. |
| `src/app/api/processing/items/route.ts` | Inbox/List/Archived or one status-page read with cursor. |
| `src/app/api/processing/filters/route.ts` | Manual-tag and AI-topic metadata by stable ID. |
| `src/app/api/processing/mutations/[mutationId]/route.ts` | Ambiguous-outcome lookup. |
| `src/app/api/processing/enrollment/{preview,confirm,status}/route.ts` | Exact preview and resumable enrollment orchestration. |
| `src/app/api/processing/preferences/timezone/route.ts` | Read/update the owner IANA timezone. |
| `src/app/api/items/[id]/workflow/route.ts` | Move/archive/restore/reprocess with explicit handler session auth. |
| `src/app/api/items/[id]/workflow/undo/route.ts` | One-level server-authoritative Undo with the same auth boundary. |
| `src/app/items/[id]/page.tsx` and a small workflow component | Show independent workflow control and safe Processing return context without remounting notes. |
| `src/components/sidebar.tsx`, `src/components/sidebar-routing.ts`, `src/app/more/page.tsx` | Desktop/mobile discovery, active route, badge; gated. |
| `src/app/library/page.tsx` / capture success UI | Mobile Inbox summary and accurate new-capture feedback; no Library query rewrite. |
| `.env.example`, deploy/readiness scripts | Disabled flags, preflight, smoke, rollback evidence. |

Tests live beside modules/routes following current `node:test` conventions. Add a dev-only browser E2E harness before UI release; prefer Playwright for deterministic Chromium/WebKit/mobile/axe integration if repository review accepts the dependency. Manual NVDA, VoiceOver, TalkBack, switch, forced-colors, zoom, and reduced-motion evidence remains required regardless of automation.

## 6. Migration 025

### 6.1 Projection on `items`

Add columns without rebuilding `items`:

```sql
workflow_status TEXT NOT NULL DEFAULT 'inbox'
  CHECK (workflow_status IN ('inbox','todo','in_progress','done')),
workflow_version INTEGER NOT NULL DEFAULT 0 CHECK (workflow_version >= 0),
workflow_legacy_baseline INTEGER NOT NULL DEFAULT 0
  CHECK (workflow_legacy_baseline IN (0,1)),
workflow_enrolled_at INTEGER,
workflow_inbox_entered_at INTEGER,
workflow_inbox_episode_id TEXT,
workflow_status_changed_at INTEGER,
workflow_completed_at INTEGER,
workflow_archived_at INTEGER,
workflow_initialized_at INTEGER
```

After adding columns and before creating the guard, migration 025 marks only rows already present as `workflow_legacy_baseline=1`. Future inserts receive the default 0. This makes the following states distinguishable without trusting `captured_at`, which Recall may intentionally backdate:

| State | Required values |
|---|---|
| Dormant pre-025 legacy | legacy 1, Inbox, version 0, enrollment/initialization/current-entry/episode null |
| New enrolled Inbox | legacy 0, version 1, enrollment/initialization/status-change/current-entry/episode non-null, archive null |
| Enrolled legacy Inbox | legacy 1, version at least 1, enrollment/status-change/current-entry/episode non-null, initialization null |
| Active non-Inbox | enrolled, archive null, current-entry/episode null |
| Active Done | status Done, archive null, current completion timestamp non-null |
| Archived | enrolled, status Done, archive non-null, current-entry/episode null |

`workflow_legacy_baseline` records provenance; enrollment does not clear it. The application repository and guard enforce cross-column invariants. Column CHECKs enforce bounded scalar facts. Avoid an `items` rebuild solely for cross-field CHECKs unless rehearsal proves the safety benefit outweighs rebuild risk.

`workflow_completed_at` is the effective entry time for the current Done state and therefore the Done-order projection. Moving out of Done clears it; returning to Done sets a new value; Undo restores the exact prior value. First-lifetime Completed remains an event query, not this projection.

### 6.2 Content-free canonical events

Create `item_workflow_events` with:

- integer primary key plus unique opaque `event_uuid`;
- `item_id` foreign key with `ON DELETE CASCADE`;
- unique `(item_id, item_version)`;
- allow-listed `event_type`: `initialized`, `raw_initialized`, `enrolled`, `status_changed`, `archived`, `restored`, `reprocessed`, `undo`;
- bounded from/to status, archive time, Inbox-entry time, Inbox episode ID, status-change time, and completion time;
- allow-listed `origin`, `surface`, `actor_channel`, and optional `reason_code`;
- globally unique `mutation_id` and a fixed-length `request_fingerprint` of the canonical action payload;
- optional unique `undo_of_event_uuid`;
- UTC epoch-millisecond `occurred_at`.

The event contains enough prior and resulting projection facts for exact Undo and replay validation. `inbox_episode_id` identifies the affected episode: an initialized, enrolled, return-to-Inbox, or reprocess event creates a cryptographically random episode; an Inbox exit carries that same episode; moves wholly outside Inbox carry null. Undo restores the prior episode and timestamp rather than creating a false new episode.

No event or supporting table may contain title, body, URL, summary, quotes, transcript, note content, taxonomy label, query text, prompt/provider payload, free-form error, or generic metadata JSON. CHECK constraints enforce enum and length bounds. Hard delete cascades events, so historical metrics describe retained items and can decrease.

### 6.3 Enrollment job support

Create content-free `item_workflow_enrollment_jobs` and `item_workflow_enrollment_job_items` tables only for exact, resumable selected/recent/all enrollment. A job stores opaque IDs, mode, frozen item count/hash, status, cursor/progress counts, created/confirmed/completed timestamps, and bounded failure code. Job items store only job ID, item ID, and processed state, with item deletion handled explicitly. They contain no display or source data.

Preview materializes or deterministically freezes the candidate ID set before confirmation. Confirm verifies count/hash, is idempotent, and processes bounded transactions. The recent mode is captured in the last 30 days, newest 25 maximum after exact preview; overflow is reported and All remains available. Enrollment time, not capture time, becomes Inbox-entry time. Enrollment creates `enrolled`, not `initialized`, and never Added/Processed/Completed.

### 6.4 Index candidates

Create only indexes proven by query plans, starting with:

- partial active Inbox `(workflow_inbox_entered_at, id)`;
- partial active status `(workflow_status, workflow_status_changed_at DESC, id)`;
- partial active Done `(workflow_completed_at DESC, id)`;
- partial archived `(workflow_archived_at DESC, id)`;
- events `(item_id, occurred_at DESC, id DESC)`;
- events `(event_type, occurred_at, item_id)`;
- events by `mutation_id` and `undo_of_event_uuid` through uniqueness;
- enrollment job/item progress indexes.

All active indexes require enrollment non-null and archive null. Keep query-plan snapshots for unfiltered and filter-fan-out cases.

### 6.5 Raw-insert guard

Create an `AFTER INSERT` trigger whose `WHEN` clause matches only a future/non-legacy dormant default (`workflow_legacy_baseline=0`, version 0, enrollment null). It:

1. maps known `capture_source` values to an allow-listed actor channel and unknown values to `unknown_raw`;
2. updates the new row to a valid enrolled Inbox projection/version 1 with one UTC time and random Inbox episode;
3. inserts one `raw_initialized` event with `lower(hex(randomblob(16)))` opaque identifiers;
4. aborts the entire insert on any identifier collision or invariant failure.

The guard does not depend on execution order relative to FTS, enrichment, or transcript `AFTER INSERT` triggers. It never touches pre-migration rows and is never disabled by Processing feature flags.

## 7. Central insert and ingestion preservation

Refactor `insertCaptured()` into one `better-sqlite3` transaction:

1. generate the item ID, event UUID, mutation ID, Inbox episode ID, and canonical timestamp;
2. insert `items` with legacy 0, enrolled Inbox projection, and version 1;
3. insert one `initialized` event with capture-source provenance;
4. let existing FTS/enrichment/transcript triggers participate in the same outer transaction;
5. commit, then re-read the item.

If event insertion fails, the item and all trigger side effects roll back. The raw guard sees version 1 and is a no-op on the application path. Test the transaction inside Recall's existing transaction/savepoint pattern; do not assume nesting works merely because both use `better-sqlite3`.

Required new-versus-existing matrix:

| Channel/path | Genuine new identity | Existing/duplicate/repair |
|---|---|---|
| Web note, URL, PDF | initialize once | preserve or create a deliberately separate identity where current duplicate UX explicitly does so |
| JSON URL/note/PDF | initialize once | duplicate window/quality upgrade preserves |
| Extension and Android share | inherit capture API behavior | preserve |
| Telegram URL/YouTube/note/PDF | initialize once | duplicate/repair preserves |
| Recall import | initialize once | stable-ID skip/weak URL repair preserves |
| Transcript upload, owned media, upgrade, repair | no new lifecycle | preserve exactly |
| Enrichment, embedding, note indexing | never initialize/reset | preserve exactly |
| Raw/future/old-code SQL insert | guard initializes once | not applicable |

Only successful `initialized`/`raw_initialized` events for genuine new identities qualify for Added. No duplicate, repair, replay, enrollment, return, reprocess, or background event qualifies.

## 8. Transition and archive rules

The transition service is a pure validated state machine consumed by every surface:

- any active status may move to any other active status;
- same-state Move is a true no-op: no event, version, timestamp, episode, or metric change;
- entering Inbox creates a new episode/current-entry time except Undo, which restores prior facts;
- leaving Inbox clears the projection's current-entry/episode but records the exited episode on the event;
- entering Done sets current completion time; leaving Done clears it;
- only active Done can Archive;
- Archive retains status Done and completion, sets `workflow_archived_at`, and removes only from active Processing;
- Restore clears archive and remains Done;
- Reprocess is one atomic command that clears archive, enters Inbox, clears completion, and creates a new episode;
- Move while archived is rejected; Restore or Reprocess first;
- hard delete remains the separate existing destructive operation.

Ordering is deterministic:

| Scope | Default keyset order |
|---|---|
| Dedicated Inbox | `workflow_inbox_entered_at ASC, id ASC` |
| To Do / In Progress, Workflow default | `workflow_status_changed_at DESC, id ASC` |
| Done, Workflow default | `workflow_completed_at DESC, id ASC` |
| Archived | `workflow_archived_at DESC, id ASC` |

Board/List initially use Workflow status grouping plus Oldest captured, matching the accepted design. Supported production sorts are Workflow default, Oldest/Newest captured, Title A–Z/Z–A, Workflow status, Source type, and Capture channel. No fixture order, manual rank, fractional position, or drag reorder exists. Pointer drag changes status only when grouped by Workflow status and remains disabled in production until all accessibility gates pass.

Supported groups are Workflow status, Primary User tag, Primary AI topic, Source type, Capture channel, Capture quality, Capture age, and No grouping. Primary tag/topic selection is deterministic—canonical display name ascending, then stable ID—with a clearly labeled unassigned bucket. Grouping is presentation-only, uses the normalized result set, and never changes workflow state or page truth; non-status grouping always disables pointer drag.

## 9. Read architecture, filters, and pagination

Processing DTOs may return item ID, bounded title/excerpt, source/type/channel/quality, captured time, workflow projection/version, archive badge, and bounded manual-tag/AI-topic display data needed for the visible row. They must not return full body, note text, full summary, quotes, artifacts, transcript, provider data, or hidden content.

Filters use stable IDs and one normalized contract:

- manual tags only (`tags.kind='manual'`), OR within facet;
- AI topics (`topics`/`item_topics`), OR within facet;
- AND between facets and status/archive scope;
- explicit No user tags and No AI topics through `NOT EXISTS`;
- maximum values per facet and deduplicated/sorted IDs;
- page and aggregate queries share the exact predicate builder;
- correlated `EXISTS` or pre-grouped subqueries prevent tag × topic fan-out inflation;
- matching counts, unfiltered Inbox total, and headline metrics remain separately typed.

Use versioned, HMAC-authenticated opaque cursors. A cursor binds view, status, archive scope, normalized sort and tuple, item ID, filter hash, and cursor schema version. Reject tampering. A stale/mismatched cursor returns a typed restart response and canonical normalized URL rather than silently serving a different page.

Inbox/List/Archived each use their normalized keyset. Board maintains one cursor per status; never use one global Board cursor. Aggregate counts and oldest Inbox age are independent indexed queries and never inferred from loaded rows. Do not virtualize until semantic list and focus tests pass; bounded “Load more” is acceptable first.

## 10. API contracts

### Reads

| Endpoint | Purpose |
|---|---|
| `GET /api/processing/summary` | Unfiltered Inbox total/oldest age, view matching totals, weekly metrics, readiness/timezone disclosure. |
| `GET /api/processing/items` | Bounded Inbox/List/Archived or one status page using normalized filters and cursor. |
| `GET /api/processing/filters` | Stable manual-tag and AI-topic filter metadata/counts. |
| `GET /api/processing/mutations/[mutationId]` | Accepted/rejected/unknown mutation outcome plus current canonical projection if item remains. |
| `GET /api/processing/enrollment/status` | Content-free enrollment job progress. |
| `GET /api/processing/preferences/timezone` | Current owner timezone/setup state. |

The authenticated server page may call repositories directly for first paint; client refreshes use the same contracts. All responses use `Cache-Control: private, no-store, max-age=0`, `Vary: Cookie`, and `X-Content-Type-Options: nosniff`.

### Writes

| Endpoint | Body |
|---|---|
| `PATCH /api/items/[id]/workflow` | `expectedVersion`, UUID `mutationId`, one action (`move`, `archive`, `restore`, `reprocess`) and bounded action fields. |
| `POST /api/items/[id]/workflow/undo` | `expectedVersion`, UUID `mutationId`, `targetEventUuid`. |
| `POST /api/processing/enrollment/preview` | mode plus bounded IDs/recent parameters. |
| `POST /api/processing/enrollment/confirm` | preview/job token, frozen hash, UUID mutation ID. |
| `PUT /api/processing/preferences/timezone` | validated IANA timezone. |

Every handler performs explicit session-cookie verification. Every write also requires exact same origin, including a non-empty `Origin`; missing Origin is rejected. Workflow v1 does not accept bearer-only callers. The `/api/items` prefix behavior is covered by route tests using a valid bearer token and no cookie. Do not use the looser capture `validateOrigin()` helper, which intentionally permits CLI/no-Origin and extension origins; use the exact-origin convention from notes.

Validate content type, maximum body bytes, item/mutation/event ID format and length, enum fields, filter counts, cursor size, and pagination limit before repository work. Use parameterized SQL and stable IDs. Return 404 without revealing whether an inaccessible ID exists; the current single-owner model adds no roles.

## 11. CAS, idempotency, optimism, and reconciliation

Within one immediate, short SQLite write transaction:

1. look up `mutation_id`;
2. on exact replay, compare `request_fingerprint`, return the immutable accepted receipt plus the **current** projection/version;
3. reject mutation-ID reuse with a changed payload as 422;
4. load current projection and eligibility;
5. compare `expectedVersion`; on mismatch return 409 and bounded current truth;
6. derive next projection, update with `WHERE id=? AND workflow_version=?`, increment once, and insert one event;
7. return accepted event/version, current projection, confirmed timestamp, and Undo deadline when eligible.

Client state is per item: `idle -> pending -> confirmed | failed | conflicted | outcome_unknown -> reconciled`. Optimistic placement remains visibly Pending until confirmation. Local failure rolls back only the affected item. Conflict installs server truth and requires an explicit retry of intent. Network loss calls mutation lookup before retry. Same-device `BroadcastChannel` is only an invalidation hint; revalidation is authority. Offline keeps already-loaded reads usable and disables writes; v1 has no offline mutation queue.

SQLite remains a single writer with WAL, synchronous NORMAL, 5-second busy timeout. Keep transactions free of network or rendering work. A busy/locked result becomes a typed retryable failure; it is not reported as success. Benchmark concurrent capture, move, Undo, enrollment batch, and summary reads.

## 12. Undo

One-level Undo applies only to a confirmed Move, Archive, Restore, or Reprocess. The server returns `undoEligibleUntil = confirmedAt + 10,000ms`; accept at or before that instant and return `410 undo_expired` plus current truth afterward.

Undo is a new CAS/idempotent event linked to one reversible non-Undo event. It restores the target event's exact prior status, archive time, Inbox-entry time/episode, status-change time, and completion time. An intervening version causes 409. `undo_of_event_uuid` uniqueness prevents a second Undo; repository checks reject Undo-of-Undo and cycles. Redo is an ordinary later action.

The same-tab client stores only the bounded receipt/deadline needed to offer Undo across Processing views and validated detail navigation. Expiry is announced without moving focus. A linked Undo makes its target ineffective for metrics.

## 13. Metrics and time

Use the projection for present health and effective events for behavior:

| Metric | Implementation rule |
|---|---|
| Inbox now | Enrolled, active Inbox, archive null; independent of filters/page length. |
| Oldest current Inbox age | Query time minus minimum current Inbox-entry projection. |
| Added | Distinct retained items with effective genuine-capture initialization in period. |
| Processed | One effective owner-driven Inbox exit per Inbox episode in period. |
| Triaged diagnostic | First effective owner-driven Inbox exit in item lifetime. |
| Completed | First effective owner-driven Done entry in item lifetime. |
| Archived diagnostic | Distinct retained item with an effective archive event in period. |

Exclude baseline/enrollment, duplicates, repairs, replay, same-state no-op, failed/pending/conflicted/rejected/unknown actions, ordinary moves into Inbox, reprocess as Added, and linked Undo targets. Repeated movement outside Inbox cannot inflate Processed because it has no exited episode. Recompletion is diagnostic only. Event cascade means hard delete removes prior contribution.

Persist event times as UTC epoch milliseconds. Store owner timezone under a typed `settings` key such as `processing.owner_time_zone`; initialize it once from an explicit browser/device value and allow change. Validate it as a real IANA zone. If unset/invalid, fail metrics setup visibly rather than use server timezone or a fixed offset.

Compute Today as owner-local midnight to next local midnight and Week-to-date from owner-local Monday midnight, converted to half-open UTC intervals at query time. Timezone changes re-bucket without rewriting events. Test 23/25-hour DST days even if the current owner zone is Asia/Kolkata. Display `Week starts Monday · {IANA timezone}`.

## 14. UI state and canonical detail integration

`/processing` is Inbox-first. Explicit normalized URL state wins, Back/Forward restores it, and remembered Board/List organization may seed only active-work entry. Fresh primary Processing navigation always resets to unfiltered Inbox. Use stable IDs in URL state and reject external return URLs.

Keep ephemeral selection/pending/error/Undo state local. Do not introduce Redux/Zustand. Keep a pending item's focus target mounted through reconciliation. Use one polite status region for success/count/note messages and one alert region for actionable errors/conflicts.

Open `/items/[id]` for full detail. Add workflow controls as a separate component and version domain. A workflow action must not save, clear, submit, index, remount, or resolve My notes. A note action must not change workflow version. Valid internal Processing context restores normalized view/filter/anchor/focus; direct or Library entry retains existing navigation behavior.

Board columns are labeled sections containing native lists in fixed DOM order Inbox, To Do, In Progress, Done—not an ARIA grid. Native Move controls complete every task. Mobile uses a linear Inbox/List and one selected Board status/group, with at least 44px controls and bottom-nav/safe-area clearance.

## 15. Feature flags and readiness

Add server-owned flags, all default off in `.env.example`:

- `PROCESSING_READ_ENABLED=0`
- `PROCESSING_WRITE_ENABLED=0`
- `PROCESSING_NAV_ENABLED=0`

Migration and raw guard are not flag-controlled. Navigation requires read readiness. Writes require both read/write flags and a green readiness check. Navigation enablement is last.

Readiness fails closed if migration/table/index/trigger manifest is wrong or any invariant holds, including:

- non-legacy post-025 row at version 0 or missing enrollment/initialization/current-entry/episode;
- initialized/enrolled row without its canonical version event;
- active Inbox without current-entry/episode, or non-Inbox with either;
- archived non-Done item;
- duplicate item version, mutation ID, event UUID, or Undo target;
- enrollment job/hash/progress inconsistency;
- `quick_check` failure or foreign-key rows.

Expose readiness only to the authenticated owner/operator and never return content. Current `/api/health` is liveness and has no DB check; do not overload it or treat it as Processing readiness.

## 16. Security and privacy

- V1 remains private, single-owner, with no `user_id`, roles, sharing, or collaboration.
- Handler auth is explicit even when proxy auth already ran; bearer-only workflow access is denied.
- Exact same-origin is mandatory for every mutation and timezone/enrollment write.
- HMAC-sign cursors with a server secret derived through a domain-separated key, not a client-visible checksum.
- Bound body, IDs, facet values, page size, cursor, and title/excerpt serialization; rate-limit repeated mutations and enrollment operations.
- Use parameterized SQL and allow-listed enum-to-SQL mappings; never interpolate sort/filter strings.
- Responses are private/no-store and errors are stable codes without DB paths, SQL, item content, or existence oracles.
- Workflow history contains only lifecycle facts. Operational logs contain IDs/enums/versions/counts/timestamps/latency and bounded reason codes.
- Do not log filter labels, item titles, URLs, note data, excerpts, query strings, request bodies, provider payloads, or private endpoint credentials.
- No third-party analytics or transmission is introduced. Existing note AI consent remains unrelated and workflow cannot change it.
- Processing archive is not privacy deletion. Existing hard delete cascades workflow history and remains the privacy operation.

Security tests cover unauthenticated cookie, invalid/expired session, valid bearer/no cookie under `/api/items/...`, cross-origin and missing Origin, malformed/oversized JSON, enum/ID/cursor tampering, changed replay payload, stale version, mutation enumeration, rate abuse, and content/log redaction.

## 17. Analytics and observability

Canonical product metrics come from the local projection/events, not optional telemetry. Operational observation should add content-free counters/timers for:

- initialization/guard path and integrity failures;
- mutation accepted/no-op/failure/conflict/unknown/reconciled/Undo-expired;
- DB busy/lock and transaction latency;
- summary/page/filter/metric query latency by normalized query class;
- enrollment job progress/retry/failure;
- migration duration, DB/WAL growth, free space, quick/FK results;
- capture and archive-matrix smoke results during rollout.

Use bounded error codes with local rotating logs/system journal. Do not copy existing capture log patterns that include `source_url`. Alerts/no-go thresholds: any invalid new-row integrity count, any quick/FK failure, sustained p95 over budget, unexplained mutation duplication, or capture smoke regression.

## 18. Performance and 50k plan

Generate deterministic synthetic fixtures at 10k and 50k with realistic source types, statuses, archive ratios, manual-tag/topic fan-out, untagged/topicless rows, long titles, and event histories. Never use production content in committed fixtures.

Record Node/SQLite versions, CPU, memory, disk, DB/WAL size, fixture seed, query plans, warm/cold method, sample count, and p50/p95/max. Gates at 50k:

- unfiltered summary/count p95 <=100ms;
- filtered summary p95 <=200ms;
- first and next bounded page p95 <=200ms;
- mutation DB transaction p95 <=250ms excluding network;
- bounded response sizes and bounded rendered DOM;
- no offset scan, full body/note load, temp-sort surprise, or count derived from a page.

Test every status first/next page, Inbox oldest, List sorts, Archived, no-tag/no-topic, tag OR, topic OR, combined AND, taxonomy deletion, weekly metrics, and independent Board cursors. Test stable pagination under concurrent inserts/moves; keysets may omit items that leave scope but must not duplicate or reorder retained rows.

Migration rehearsal on an isolated byte-for-byte production-size copy records wall time, lock window, DB/WAL peak, free space, startup impact, integrity, trigger manifest, and old-code insert behavior. The verified production baseline—7.52 MB, 129 items, about 30 GB free—is context, not permission to skip 50k gates.

## 19. Test strategy

### Unit

- complete four-status/archive transition table and same-state no-op;
- Inbox timestamp/episode creation, clearing, re-entry, reprocess, and exact Undo restoration;
- completion projection versus first-lifetime Completed metric;
- filter normalization/algebra/count scopes and cursor hash/signature;
- event effectiveness, linked Undo, episode Processed, hard-delete semantics;
- IANA validation, Monday boundaries, DST, timezone change;
- provenance mapping and prohibited-payload assertions.

### Database and migration

- fresh DB and `024 -> 025` upgrade, exact schema/index/trigger manifest, quick/FK/integrity clean;
- existing rows become legacy dormant without events and remain absent from every read/metric;
- application initialized insert and raw guard each produce exactly one projection/event;
- trigger identifier collision aborts entire insert; trigger order independence;
- Recall nested transaction; old-code insert after code rollback;
- each ingestion path new versus duplicate/repair preservation;
- CAS winner/loser, exact replay after later mutation, changed replay, ambiguous outcome lookup;
- Undo before/at/after deadline, intervening version, duplicate target, Undo-of-Undo;
- enrollment preview/hash/confirm/idempotency/interruption/resume;
- archive downstream matrix and note/workflow independence;
- filter fan-out/count parity and 10k/50k plans.

### Route/component/E2E

- session-only and exact-origin matrix including the `/api/items` bearer-prefix case;
- Inbox Process next/Leave/Move, deterministic focus, pending/failure/conflict/unknown/deleted states;
- Board/List/filter/count/Back/Forward/bookmark parity and per-status pagination;
- canonical detail return and dirty-note Save/Discard/Keep editing regression;
- Archive/Restore/Reprocess/Undo across views and detail;
- mobile More discovery, Library summary, new-capture feedback, 320px and 390x844 task completion;
- offline loaded reads with writes disabled; two-tab invalidation/revalidation;
- loading error never renders zero as truth; stale cursor normalizes visibly.

### Accessibility/manual release no-go

Keyboard, NVDA, VoiceOver, TalkBack, switch control, 200%/400% zoom and reflow, text spacing, Light/Dark/forced colors, reduced motion, fixed navigation, and stable focus through pagination/reconciliation. Pointer drag stays off until cancel/Escape, equivalent announcements, reduced-motion, and virtualized-focus gates all pass.

Full release gate also runs typecheck, lint, all repository tests, production build, environment/artifact checks, and deploy smoke.

## 20. Dependencies

- Runtime: use existing Next.js 16, React 19, `better-sqlite3`, Zod, Node `crypto`, `Intl`, Radix primitives, and current CSS tokens. No runtime state, board, drag, date, or analytics package is required.
- Cursor signing and IDs use Node crypto; timezone boundaries should use tested built-in `Intl` conversion unless correctness tests prove a small timezone library is necessary.
- Add a dev-only E2E/accessibility dependency only through normal lockfile review; Playwright is preferred because no current browser E2E runner exists. Keep manual assistive-technology gates.
- Do not add drag or virtualization dependencies until native no-drag lists pass scale/focus tests and a measured need exists.
- Deployment depends on current backup/build/rsync/systemd/authenticated-health safeguards plus new Processing readiness and smoke scripts.

## 21. Rollout

1. **Preflight:** preserve current read-only baseline, create/quick-check verified predeploy backup, confirm about 30 GB free remains comfortably above measured peak, retain known-good artifact and flag values.
2. **Rehearsal:** apply 025 on isolated production copy and 10k/50k fixtures; run integrity, performance, old-code, restore, and concurrency gates.
3. **Schema deploy, all flags off:** deploy migration and guard; verify full migration filename, schema/index/trigger manifest, quick/FK checks, service active, Node version, authenticated health, and Processing readiness.
4. **Capture proof while UI off:** exercise authorized web/API/Telegram/Recall representative new and duplicate paths without exposing content; verify new initialization once and duplicate preservation.
5. **Read dogfood:** enable read only for owner, keep writes/navigation off; validate counts, legacy absence, bounded pages, timezone, and metrics.
6. **Write dogfood:** enable writes, explicitly enroll a small previewed set, verify move/conflict/replay/Undo/archive/restore/reprocess and observe latency/integrity.
7. **Navigation:** enable desktop/mobile entry and capture feedback only after zero initialization defects and UI/accessibility gates.
8. **Live verification:** verify capture -> Inbox -> Move -> Done -> Archive -> Restore/Reprocess -> Undo, counts, detail/notes continuity, mobile behavior, logs, and readiness in production.
9. **Documentation:** update repository docs and GitHub Wiki to the actually deployed migration, flags, behavior, monitoring, rollback, and dated evidence. Only then can the parent execution goal be considered for completion.

## 22. Rollback and degraded mode

Normal rollback is flags off plus known-good code and forward repair. Disable navigation, writes, then reads; keep the schema and raw guard. Old code's existing explicit `INSERT` column lists remain compatible with additive columns, and the guard must prove that an old-code capture still creates a valid enrolled Inbox row.

Do not drop columns, events, or the guard during routine rollback. Do not reverse event history or reset versions. If reads are unhealthy, capture remains safe because application initialization/guard is independent; if initialization cannot be guaranteed, fail the capture transaction visibly rather than accept an invisible new source.

Schema restore is reserved for unrecoverable corruption. Preserve the failed/current DB, stop writes, restore only a verified snapshot through the existing runbook, rerun quick/FK/authenticated health/capture smoke, and explicitly accept that post-snapshot captures and workflow mutations are lost. Capture artifacts are outside workflow storage, but the existing backup gap still matters to a full-system restore.

## 23. Milestones and exit criteria

| Milestone | Deliverable | Exit evidence |
|---|---|---|
| M0 — adversarial/design closure | Reviewed v1 technical, product, UX, traceability, risk decisions | No unresolved correctness/security/privacy conflict. |
| M1 — migration/integrity | 025, projection/events/jobs/guard, readiness | Fresh/upgrade/rehearsal clean; legacy dormant; old-code/raw insert valid. |
| M2 — repository/domain | transitions, central insert, enrollment, metrics/time | Ingestion matrix, CAS/replay/Undo and metric truth tables pass. |
| M3 — private APIs | bounded reads/writes/outcome/timezone | Handler auth/origin/bounds/privacy tests pass, including bearer-prefix case. |
| M4 — Inbox/detail | Inbox loop, canonical detail, note independence | Desktop/mobile focus, failure, return, draft protection pass. |
| M5 — Board/List/Archive | filters/counts/group/sort/cursors/archive matrix | Parity, deterministic order, no fan-out inflation, archive regressions pass. |
| M6 — scale/accessibility | 10k/50k, E2E, manual AT | Budgets and every accessibility no-go gate pass; drag remains off unless separately proven. |
| M7 — rollout readiness | backup/restore/old-code/flags/observability | Rehearsal evidence complete; zero invalid new rows. |
| M8 — production release | staged flags and live workflow verification | Service/DB/auth healthy and live journey verified. |
| M9 — documentation closeout | repository docs and GitHub Wiki current | Actual shipped behavior, operations, rollback, and evidence published. |

## 24. Risks and mitigations

| Risk | Severity | Mitigation / proof |
|---|---:|---|
| Item commits without workflow event | Critical | One transaction; event failure rolls back item and triggers; integrity query. |
| Old code/raw insert creates dormant new row | Critical | legacy-default 0 plus permanent guard; old-artifact capture rehearsal. |
| Bearer token mutates workflow through `/api/items` prefix | Critical | Handler requires session cookie and exact same origin; valid-bearer/no-cookie test. |
| Migration floods legacy Inbox | High | Explicit legacy marker, dormant version 0, no boot events, previewed enrollment only. |
| Duplicate/repair resets owner intent | High | Exhaustive channel matrix and projection snapshot assertions. |
| Trigger ordering/collision corrupts insert | High | Order-independent guard; deterministic collision injection; atomic abort. |
| CAS replay installs stale state | High | Immutable receipt plus separately loaded current projection/version. |
| Unknown outcome duplicates action | High | Mutation lookup before retry; unique mutation ID/fingerprint. |
| Undo falsifies Inbox age/metrics | High | Store prior facts and episode, server deadline, effective-event exclusion tests. |
| Tag/topic joins inflate pages/counts | High | Shared `EXISTS` predicates, fan-out fixtures, query plans. |
| Archive hides source outside Processing | High | No global archive predicate; explicit downstream regression matrix. |
| Workflow action damages note draft | High | Separate version/endpoints/components; mounted editor/navigation tests. |
| SQLite writer contention | High | Short transactions, bounded enrollment batches, busy error contract, concurrency benchmarks. |
| 50k UI loses focus/performance | High | Keysets/bounded DTO/DOM, defer virtualization, focus traces. |
| Timezone/DST mis-buckets metrics | High | Explicit IANA setting and boundary truth tables. |
| Logs/events leak private content | Privacy high | No generic metadata/free text, allow-lists, redaction inspection tests. |
| Restore loses newer captures | High | Restore only for unrecoverable corruption with explicit loss acknowledgement; normal forward rollback. |
| Drag excludes keyboard/AT users | High | Native Move is primary; drag off until every gate passes. |
| Scope expands into PM tooling | Medium | Enforce deferred list: no batch/rank/dates/assignees/sprints/WIP/collaboration. |

## 25. Adversarial-review questions

The v1 review should specifically attack:

1. whether `workflow_legacy_baseline` and default/trigger ordering can ever classify a post-025 insert as legacy;
2. whether event prior/next fields are sufficient for exact Undo and deterministic ordering without content leakage;
3. whether request fingerprints and replay lookup distinguish exact replay from mutation-ID reuse after later versions;
4. whether per-episode Processed remains correct through return, reprocess, Undo, delete, and same-state no-op;
5. whether any archive predicate leaks into a non-Processing system;
6. whether any workflow handler accidentally accepts the current generic bearer credential;
7. whether enrollment preview remains exact and resumable at 50k without a long writer lock;
8. whether cursor/hash/filter normalization can duplicate, omit, or miscount rows under concurrent mutation;
9. whether built-in `Intl` handling is demonstrably correct for ambiguous/skipped local times;
10. whether rollout can safely run old code after 025 while the permanent guard remains enabled.

This document is a v1 implementation plan only. No feature, migration, production flag, deployment, or live behavior is claimed complete.
