# Card Processing Workflow — technical plan v2

**Status:** **Explored — not implemented**
**Proposal state:** Recommended implementation approach awaiting stakeholder and engineering approval; not authorization to build.
**Product/UX contract:** [PRD v2](../product/prd-v2.md), [UX/UI v2](../ux/ux-ui-v2.md), [decision log](../decisions/decision-log.md).
**Baseline:** repository `1cb5d36f37611e60442b4f2c4433b45455273500`; 2026-07-11.

## 1. Architecture recommendation

Extend the existing `items` aggregate with a small workflow projection and append-only content-free event log. Keep Library/search/detail/taxonomy/notes canonical. Add a dedicated Processing read model and versioned single-item mutation endpoints. Initialize genuinely new captures transactionally in the central item insert path, with a database guard for future/raw inserts. Baseline legacy rows dormantly, then run any legacy event population as a separate resumable job before enablement.

This plan creates no production code in the current exploration.

## 2. Alternatives considered

| Option | Disposition | Reason |
|---|---|---|
| Store status as User tag/AI topic | Reject | Violates separate user intent/taxonomy lifecycles and stable metrics. |
| Reuse SRS `cards` | Reject | Current `cards` table is Attention Review state, not captured sources. |
| Event-only current state | Reject for v1 | Makes current Inbox age/count/order and conflicts unnecessarily expensive. |
| Separate workflow-item table | Defer | Adds identity/join/consistency complexity without current benefit. |
| `items` projection + events | **Recommend** | Fits current aggregate, SQLite, Library/detail reuse, and traceable metrics. |
| Trigger-only initialization | Reject | Trigger disable/failure can silently create dormant captures. |
| Application transaction + DB guard | **Recommend** | Normal path is explicit/testable; raw inserts still guarded. |
| Synchronous legacy event backfill in boot migration | Reject | Unbounded startup/WAL/disk risk. |
| Batch endpoints in first release | Reject/defer | Product v2 removes batch until single-item trust is validated. |

## 3. Relevant existing modules

Final implementation must inspect the current tree again; v2 planning evidence identifies these seams:

- `src/db/client.ts` — SQLite connection and synchronous append-only migration runner.
- `src/db/items.ts` / capture repository seam — central item insertion and re-read.
- `src/db/migrations/` — additive schema migrations.
- `src/app/library/`, item routes/components, Library query/filter components — current browse/detail/responsive patterns.
- capture routes and adapters for web, Android/extension, Telegram, Recall, URL/PDF/YouTube/note flows.
- tag/topic tables and joins — stable filter IDs.
- notes repository/routes/feature policy — independent draft/revision/consent lifecycle.
- authentication, Origin/CSRF-like request validation, response/error helpers, analytics conventions.

No implementation may infer that a single route is the only insert path; the ingestion matrix in §8 is the test inventory.

## 4. Proposed storage model

### 4.1 `items` projection additions

Names are proposed and require repository-style review:

```sql
workflow_status TEXT NOT NULL DEFAULT 'inbox'
  CHECK (workflow_status IN ('inbox','todo','in_progress','done')),
workflow_version INTEGER NOT NULL DEFAULT 0 CHECK (workflow_version >= 0),
workflow_enrolled_at INTEGER NULL,
workflow_inbox_entered_at INTEGER NULL,
workflow_status_changed_at INTEGER NULL,
workflow_completed_at INTEGER NULL,
workflow_archived_at INTEGER NULL,
workflow_initialized_at INTEGER NULL
```

Invariants:

- Legacy dormant row: status Inbox/version 0, enrollment null, current-entry null, excluded from Processing/metrics.
- New enrolled row: version ≥1, enrollment/initialized/status-changed/current-entry non-null in same transaction.
- Active Inbox: enrolled, archive null, status Inbox, current-entry non-null.
- Active non-Inbox: current-entry null.
- Done may archive; non-Done archive is rejected.
- Restore: archive null, Done, current-entry null.
- Reprocess: archive null, Inbox, current-entry set to operation time.
- Hard delete cascades workflow history according to existing item deletion semantics.

### 4.2 Authoritative current Inbox-entry projection

`workflow_inbox_entered_at` is the source of truth for oldest-current-Inbox age and Inbox order:

- new capture: capture initialization time;
- legacy enrollment: enrollment time;
- ordinary move/reprocess to Inbox: operation time;
- exit Inbox: null;
- Undo an exit back to Inbox: restore the target event's recorded previous Inbox-entry timestamp;
- Undo a move into Inbox: restore the prior non-Inbox null/value exactly;
- archive never applies while Inbox.

Never use `captured_at` as current Inbox age for legacy enrollment/re-entry.

### 4.3 `item_workflow_events`

```sql
id INTEGER PRIMARY KEY,
event_uuid TEXT NOT NULL UNIQUE,
item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
item_version INTEGER NOT NULL,
event_type TEXT NOT NULL,
from_status TEXT NULL,
to_status TEXT NULL,
from_workflow_archived_at INTEGER NULL,
to_workflow_archived_at INTEGER NULL,
from_inbox_entered_at INTEGER NULL,
to_inbox_entered_at INTEGER NULL,
origin TEXT NOT NULL,
surface TEXT NOT NULL,
actor_channel TEXT NOT NULL,
mutation_id TEXT NOT NULL UNIQUE,
undo_of_event_uuid TEXT NULL UNIQUE,
occurred_at INTEGER NOT NULL,
entry_episode_id TEXT NULL,
reason_code TEXT NULL
```

Allowed event types include initialized, legacy_baselined, enrolled, status_changed, archived, restored, reprocessed, undo. There is no free-form event metadata field. `entry_episode_id` is a bounded opaque identifier and `reason_code` is a versioned enum enforced by repository validation and a database CHECK; unknown values/keys cannot be persisted. Neither field may contain source/note text, URL, digest, tag/topic label, error text, or provider payload. Tests reject over-length values and every value outside the allow-list.

Undo invariant: `origin='undo'` events are not Undo targets. Redo is an ordinary later mutation. Repository and DB tests reject Undo-of-Undo, cycles, duplicate targets, and actor/permission mismatch.

### 4.4 Event UUID/provenance

- Application path supplies cryptographically collision-resistant UUID and bounded provenance.
- DB raw-insert guard fallback uses a collision-resistant SQLite expression based on `lower(hex(randomblob(16)))`, maps known `capture_source` values through an explicit table/CASE, and uses bounded `unknown_raw` for unknown sources.
- Any UUID collision aborts the transaction; test injects deterministic collision.
- Provenance values are enums validated by repository code and CHECK constraints where practical.

## 5. Index proposal and query-plan gate

Prototype partial indexes; do not freeze names/order without `EXPLAIN QUERY PLAN` and production-size fixtures:

```sql
CREATE INDEX ... ON items(workflow_inbox_entered_at, id)
WHERE workflow_enrolled_at IS NOT NULL
  AND workflow_archived_at IS NULL
  AND workflow_status='inbox';

CREATE INDEX ... ON items(workflow_status, workflow_status_changed_at DESC, id)
WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL;

CREATE INDEX ... ON items(workflow_archived_at DESC, id)
WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NOT NULL;

CREATE INDEX ... ON item_workflow_events(item_id, occurred_at DESC, id DESC);
CREATE INDEX ... ON item_workflow_events(event_type, occurred_at, item_id);
```

Benchmarks must cover unfiltered, User-tag join, AI-topic join, combined facets, archive, counts, oldest entry, and metrics at 10k/50k with realistic fan-out. Preserve plan snapshots.

## 6. Initialization and every ingestion path

### Normal path

Central `insertCaptured`-equivalent opens one transaction:

1. insert `items` row with valid enrolled Inbox projection/version 1;
2. insert initialized event with mutation/event UUID and capture provenance;
3. perform required existing side effects compatible with current transaction boundaries;
4. commit; re-read item.

If existing code cannot share one transaction cleanly, refactor only after separate authorization; do not introduce a second asynchronous workflow write.

### DB guard

AFTER INSERT guard initializes only rows that still have version 0/null enrollment. It is defense-in-depth for raw/future inserts, not the primary application behavior.

### Ingestion preservation matrix

| Path | New item | Existing/duplicate/repair behavior |
|---|---|---|
| Web Capture Note/URL/PDF/YouTube | enroll Inbox | preserve existing lifecycle on duplicate. |
| Browser extension selected text/URL | enroll Inbox | preserve. |
| Android share | enroll Inbox | preserve. |
| Telegram | enroll Inbox | preserve. |
| Recall import | enroll Inbox | stable identity duplicate preserves. |
| Transcript repair / user transcript | no new lifecycle if same item | preserve. |
| Enrichment/embed/index/quality workers | never reset/enroll | preserve. |
| Raw/future direct insert | DB guard enrolls with bounded unknown provenance | integrity alarm if invalid. |

Automated integration tests must enumerate the actual current functions/routes at implementation time.

## 7. Legacy migration and enrollment

### Boot migration (bounded)

- Add nullable/default projection columns, event table, constraints/indexes/guard.
- Existing rows remain dormant valid baseline.
- Do **not** insert one event per legacy row in this migration.

### Resumable baseline job

- Idempotent cursor/checkpoint and bounded batch size.
- Optionally materializes `legacy_baselined` event/ready marker only if required by approved metrics/audit.
- Records counts, duration, WAL/disk growth, last ID, errors, and completion.
- Interrupt/resume safe; no user content in logs.
- Processing read flag remains off until schema/integrity/readiness succeeds.

### Owner enrollment

Endpoints accept explicit stable IDs or approved recent/all modes after count preview. Recent means last 30 days capped at 25; exact frozen ID set/hash is confirmed before mutation. Enrollment sets time to now and emits enrolled event; it does not backdate current Inbox age or inflate Processed/Completed.

## 8. Read architecture

### Processing read repository

New repository functions return bounded DTOs, not full item content:

- summary counts/oldest entry/weekly metrics;
- Inbox page;
- per-status Board pages;
- List page;
- Archived page;
- filter metadata and canonical item hydration by existing detail path.

### Filter algebra

- Stable User-tag IDs OR within; AI-topic IDs OR within; AND across.
- `EXISTS` or grouped joins avoid count multiplication.
- Explicit no-tag/no-topic predicates.
- Counts and pages use the same normalized filter object and enrolled/archive scope.
- Column/result matching count and unfiltered Inbox total are separate typed response fields.

### Cursor/pagination

Keyset cursors encode normalized sort tuple, stable ID, view/status, filter hash/version, and archive scope. Sign/validate if current conventions require. Reject stale/mismatched cursors with normalized restart contract.

## 9. API proposal

Repository-facing notation follows Next.js bracket routes:

### Reads

- `GET /api/processing/summary`
- `GET /api/processing/items?view=inbox|list|archived&status=...&cursor=...&userTagId=...&topicId=...`
- existing `GET /api/items/[id]` and notes APIs remain canonical.

### Single-item writes

- `PATCH /api/items/[id]/workflow`
  - body: `expectedVersion`, `mutationId`, `action`, action fields.
  - actions: move, archive, restore, reprocess.
- `POST /api/items/[id]/workflow/undo`
  - body: `expectedVersion`, `mutationId`, `targetEventUuid`.
- `GET /api/processing/mutations/[mutationId]`
  - returns accepted event/version plus the current canonical item snapshot and current version; it never asks the client to install a stale historical snapshot.
- `POST /api/processing/enrollment/preview`
- `POST /api/processing/enrollment/confirm`

No batch mutation endpoint in first release.

### Mutation transaction

1. authenticate and Origin/request validate;
2. parse bounded enum/IDs/body;
3. for exact mutation-ID replay, return an immutable mutation receipt (accepted event UUID/version/outcome) plus the current canonical projection/current version; never return a stale accepted-time projection as current state;
4. load projection and verify expected version/eligibility;
5. on mismatch return 409 + current bounded snapshot;
6. update projection/version and insert event in one SQLite transaction;
7. return confirmed projection/event plus `undoEligibleUntil = confirmedAt + 10 seconds` for reversible actions.

Reprocess atomically clears archive and enters Inbox while recording both from/to facts, preferably one compound `reprocessed` event with complete prior/new projection.

## 10. Optimistic UI, unknown outcomes, and Undo

Client state machine per source:

`idle → pending → confirmed | failed | conflicted | outcome_unknown → reconciled`

- Keep source/focus target mounted while pending.
- Failure rolls back one source only.
- 409 displays current snapshot; never silently overwrites.
- Network loss after send queries `GET /api/processing/mutations/[mutationId]` before retry. The response distinguishes accepted, rejected, and unknown and always includes current canonical state when an item still exists.
- BroadcastChannel invalidates/revalidates tabs; device freshness uses bounded polling/re-entry refresh unless existing push infrastructure is approved.
- Undo is one level, visible and server-eligible through `undoEligibleUntil`, exactly 10 seconds after confirmation in this proposal. It targets one reversible non-Undo event and uses CAS/idempotency. Before/at the boundary the server may accept it; after the boundary it returns `410 undo_expired` plus the current canonical projection/version. Exact replay preserves the immutable receipt and returns current truth with the same eligibility timestamp.
- Undo-of-Undo rejected. Redo is ordinary new move.
- If filter removes/restores source, client uses deterministic focus fallback.

## 11. Metrics computation

### Projections/events

- Current Inbox total/oldest: item projection/index.
- Added week: genuinely new items initialized by successful capture and automatically enrolled during the period. Duplicate/repair paths, manual legacy enrollment, reprocess/return, and ordinary move-to-Inbox events are excluded.
- Processed week: one effective owner-driven exit per Inbox-entry episode ID.
- First Triaged: first effective lifetime deliberate Inbox exit, diagnostic.
- Completed week: first effective lifetime Done entry for headline; recurring diagnostic separate.
- Undo target is ineffective while a valid linked Undo exists; Undo cannot itself be undone.

### Effective-event query

Use exact event predicates/origins and linked target exclusion, not raw transition counts. Store/derive a bounded Inbox-entry episode identifier so repeated moves outside Inbox cannot inflate Processed.

### Time

- Initialize owner timezone explicitly; no browser-only inference after first set.
- Week starts Monday.
- Persist UTC epoch; convert boundaries at query layer with tested DST cases.

### Hard delete

Events cascade/delete with item. Metrics describe currently retained items and may decrease for prior periods. Invalidate any summary cache transactionally or avoid cache until measured. Product/help copy states this behavior.

## 12. Archive behavior across current systems

Archive filters only Processing active reads. Do not add `workflow_archived_at IS NULL` to Library/search/Ask/Related/quality/Review/export/worker queries. Instead, include optional archive metadata/badge in bounded DTOs where product v2 requires. Add regression tests per archive matrix, including duplicate capture and independent background jobs.

## 13. Performance and large backlogs

- Independent keyset page per status; bounded DTO.
- Virtualize Board columns/List rows only after semantic/focus prototype passes.
- Do not combine full source/note content into Processing pages.
- Summary may use direct indexed SQL initially; add rollups only from measured need and with transactional/cache invalidation proof.

Proposed pre-authorization budgets (hardware-specific baseline must be recorded):

- unfiltered summary/count p95 ≤100ms at 50k;
- filtered summary p95 ≤200ms at 50k realistic fan-out;
- first page p95 ≤200ms;
- mutation transaction p95 ≤250ms excluding network;
- no boot migration/backfill beyond approved deployment window/disk/WAL gates.

## 14. Security and authorization

- Existing session/bearer authentication and single-owner authorization.
- Existing Origin/request protections for browser writes.
- Enum/ID/body limits, max filter values, cursor length/signature, mutation UUID validation.
- Parameterized SQL; stable IDs, no display label interpolation.
- Rate/size limits proportional to current private deployment.
- CSRF/cross-origin, ID enumeration, stale version, replay, malformed cursor, and abuse tests.
- No multi-user role model added.

## 15. Privacy and analytics

- Workflow event/history/analytics payloads contain IDs, enums, counts, timestamps, versions, surfaces, and bounded reason codes only.
- Never log source text, URL, digest, transcript, note content, tag/topic label text, provider prompt/output, or private endpoint.
- Existing notes AI-consent flags do not affect workflow lifecycle and workflow cannot change them.
- Hard delete semantics remain privacy-first.

## 16. Accessibility implementation

- Native Move select/button available in Inbox/Board/List/detail; drag optional.
- Board columns are native lists; no ARIA grid.
- Ordinary buttons for view/status switch unless full tabs primitive exists.
- Skip link and stable main/results/status heading focus refs.
- Keyed item refs + pending focus target survive virtualization/reconciliation.
- One persistent polite live region and one alert region; no duplicate toast status role.
- 44px mobile task targets, fixed-nav scroll clearance, ≥3:1 meaningful boundaries, reduced motion.
- Existing dialog primitive only if a modal is ever introduced; selected v2 canonical detail is a route.
- Production drag disabled until pointer cancel, Escape, AT announcement, reduced motion, and virtual focus pass.

## 17. Dependencies and M0 gates

- Approve direct E2E browser harness compatible with repository policy.
- Approve automated accessibility/contrast tooling; manual AT remains required.
- Decide whether current list/drag/virtualization dependencies satisfy focus and bundle constraints; do not add one solely for prototype parity.
- No dependency is added in this exploration.

## 18. Test plan

### Unit

- status/archive transition table and same-state no-op;
- current Inbox-entry timestamp for new/enroll/return/reprocess/Undo;
- expected-version/idempotency/Undo-of-Undo rejection;
- typed filter normalization/count scopes;
- event effectiveness/episode Processed/first Completed/timezone/DST/hard delete;
- cursor encode/decode/filter hash;
- provenance mapping and content-redaction assertions.

### Database/integration

- each ingestion path new vs duplicate/repair preservation;
- application transaction and DB raw-insert guard;
- trigger UUID collision/unknown provenance;
- startup integrity query for version0/null enrollment after new capture;
- migration/backfill interruption/resume/WAL/free-space;
- archive downstream matrix;
- tag/topic joins without fan-out duplication;
- concurrent CAS, exact replay, altered replay, lost response;
- notes/workflow independence.

### End to end

- desktop/mobile discovery, Process next, Leave, Move, backward move, Board/List parity;
- route detail/draft guard/return anchor;
- archive/restore/reprocess/Undo;
- loading/error/empty/filtered/offline/pending/failure/conflict/unknown/deleted/topic change;
- two tabs/devices and BroadcastChannel invalidation;
- filters Back/Forward/bookmark;
- 10k/50k virtualized focus and pagination.

### Accessibility/manual

Follow UX v2 no-go matrix: keyboard, NVDA, VoiceOver, TalkBack, switch, zoom/reflow/text spacing, contrast, reduced motion, fixed nav, drag-disabled parity.

## 19. Rollout plan (future, separately authorized)

### M0 — decision/tooling gate

- Stakeholder approves PRD/UX/technical v2 and archive matrix.
- Naming/mobile/preview/enrollment/metric tests complete.
- E2E/a11y tooling approved.

### M1 — schema and integrity spike

- Backup production-size snapshot.
- Rehearse bounded schema migration, DB guard, integrity query, and resumable baseline job.
- Record wall time, free space, WAL/disk amplification, interruption/resume, query plans.

### M2 — repository/API behind server-side disabled state

- Central capture transaction, guard, projections/events, reads/writes, CAS/idempotency, tests.
- Processing UI remains unavailable until readiness zero-defect gate.

### M3 — UI/detail integration

- Inbox/Board/List/Archive, filters/counts, canonical detail, mobile discovery, failure/focus/a11y.

### M4 — dogfood

- Explicit owner opt-in and legacy enrollment preview.
- Monitor integrity/performance/failure/discovery/pressure; no automatic all-history enrollment.

### M5 — enablement decision

- Only after all no-go gates and rollback rehearsal pass.

## 20. Rollback and degraded mode

- Normal rollback is a new forward migration/feature disable, never history rewrite/force reset.
- Disable Processing reads/writes/UI before disabling any guard whose integrity is uncertain.
- Central capture application transaction continues valid initialization even while UI is disabled; readiness repair reconciles missed/invalid rows before re-enable.
- Startup/integrity query: any post-migration new row with version 0, null enrollment/initialized/current-entry, or missing initialized event is a write/UI no-go alert.
- If capture transaction cannot guarantee valid workflow state, fail the capture transaction visibly; never silently accept an invisible dormant new item.
- Restore from verified backup only through approved operator runbook for unrecoverable migration failure.

## 21. Risks and blockers

| Risk/blocker | Required proof |
|---|---|
| SQLite single-writer/long migration | split job, production-size timing/WAL/free-space/interruption rehearsal. |
| Current Inbox age correctness | projection transition/Undo SQL tests and partial-index p95. |
| Raw insert initialization | exact guard UUID/provenance and integrity alarm tests. |
| Metric episode/Undo correctness | fixture SQL and hard-delete/cache tests. |
| Cross-tab/device unknown outcome | CAS/idempotency/reconciliation E2E. |
| Archive downstream surprises | complete matrix regression and stakeholder approval. |
| Drag + virtualization + focus | no-drag parity and manual AT gates before drag enable. |
| Mobile discoverability | moderated Library/More test and promotion gate. |
| Tooling unavailable | no implementation authorization until E2E/a11y gate has an approved path. |

## 22. Review finding resolutions

- Added authoritative `workflow_inbox_entered_at`; removed capture-age ambiguity.
- Made application transaction primary and trigger a guard; degraded mode fails Processing closed and cannot silently create dormant captures.
- Prohibited Undo-of-Undo and defined redo.
- Split bounded boot migration from resumable legacy baseline job.
- Added exact UUID/provenance requirements and integrity/collision tests.
- Removed first-release batch and therefore removed premature batch receipt/API claims.
- Added retained-item hard-delete metric truth.
- Proposed partial indexes and explicit query-plan/fan-out gates.
- Moved E2E/a11y dependency approval into M0.

## 23. No authorization

This is an implementation plan only. No schema, trigger, migration, API, feature flag, application code, rollout, or merge is authorized by this document.
