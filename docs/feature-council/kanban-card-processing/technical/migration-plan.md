# Kanban Card Processing — migration plan

**Status:** Migration implemented and isolated current-production-copy rehearsal passed; production migration remains pending
**Date:** 2026-07-12
**Engineering authority:** `technical-plan-v2.md`
**Product authority:** `../product/prd-v2.md`
**Implemented migration:** `src/db/migrations/025_item_workflow.sql`
**Baseline:** `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`

## 1. Safety boundary

This document specifies migration 025 and its validation. Implementation and content-free isolated-copy evidence are now recorded in `technical/implementation-report.md` and `qa/production-copy-migration-rehearsal.md`. Production has not been migrated, deployed, or flag-enabled.

Migration 025 is additive. Routine rollback never drops its columns/tables/triggers or rewrites history. Existing rows remain dormant until explicit enrollment; no boot-time event-per-item backfill is allowed. The permanent raw-insert guard remains active through code rollback so old code continues to initialize new captures.

## 2. Current production baseline

The dated, read-only 2026-07-12 baseline to preserve and re-record before deployment is:

| Field | Baseline |
|---|---|
| Service | active |
| Node | `v22.22.3` |
| Authenticated loopback health | `{ok:true}` |
| SQLite bytes | 7,520,256 |
| Retained items | 129 |
| Applied migration filenames | 26 |
| Latest migration | `024_recall_manual_sync.sql` |
| `quick_check` | `ok` |
| `foreign_key_check` | no rows |
| Data-filesystem free KB | approximately 30,362,880 |

No title, URL, body, note, label, credential, token, or environment value belongs in migration evidence. Pre-feature main had 25 SQL files while production had 26 applied names because it retained historical `018_topics.sql`. The candidate restores that exact idempotent file and adds 025, for 27 packaged names. Exact filenames and SHA-256 values—not numeric prefixes/count assumptions—are authoritative. Record `_migrations.name` sorted lexicographically; see KCP-040.

## 3. Ordered migration 025 program

Migration runner applies the complete file in one transaction. SQL below is the required shape; final enum names must match technical v2 contracts exactly.

### Step 1 — add projection columns except the deferred event link

```sql
ALTER TABLE items ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'inbox'
  CHECK (workflow_status IN ('inbox','todo','in_progress','done'));
ALTER TABLE items ADD COLUMN workflow_version INTEGER NOT NULL DEFAULT 0
  CHECK (workflow_version >= 0);
ALTER TABLE items ADD COLUMN workflow_legacy_baseline INTEGER NOT NULL DEFAULT 0
  CHECK (workflow_legacy_baseline IN (0,1));
ALTER TABLE items ADD COLUMN workflow_enrolled_at INTEGER
  CHECK (workflow_enrolled_at IS NULL OR workflow_enrolled_at >= 0);
ALTER TABLE items ADD COLUMN workflow_initialized_at INTEGER
  CHECK (workflow_initialized_at IS NULL OR workflow_initialized_at >= 0);
ALTER TABLE items ADD COLUMN workflow_inbox_entered_at INTEGER
  CHECK (workflow_inbox_entered_at IS NULL OR workflow_inbox_entered_at >= 0);
ALTER TABLE items ADD COLUMN workflow_inbox_episode_id TEXT
  CHECK (workflow_inbox_episode_id IS NULL OR length(workflow_inbox_episode_id) BETWEEN 32 AND 64);
ALTER TABLE items ADD COLUMN workflow_status_changed_at INTEGER
  CHECK (workflow_status_changed_at IS NULL OR workflow_status_changed_at >= 0);
ALTER TABLE items ADD COLUMN workflow_current_done_entered_at INTEGER
  CHECK (workflow_current_done_entered_at IS NULL OR workflow_current_done_entered_at >= 0);
ALTER TABLE items ADD COLUMN workflow_archived_at INTEGER
  CHECK (workflow_archived_at IS NULL OR workflow_archived_at >= 0);
```

Immediately mark only rows present during upgrade:

```sql
UPDATE items SET workflow_legacy_baseline = 1;
```

This update precedes insert/update guard creation. Future inserts retain default 0. Do not infer legacy from `captured_at`; Recall can backdate it.

### Step 2 — create terminal mutation receipts

```sql
CREATE TABLE processing_mutation_receipts (
  mutation_id TEXT PRIMARY KEY CHECK(length(mutation_id) BETWEEN 32 AND 64),
  scope_type TEXT NOT NULL CHECK(scope_type IN
    ('item_workflow','timezone','enrollment_job','initialization')),
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  scope_key_hash TEXT NOT NULL CHECK(length(scope_key_hash)=64),
  action_type TEXT NOT NULL CHECK(length(action_type) BETWEEN 2 AND 32),
  actor_tab_id TEXT CHECK(actor_tab_id IS NULL OR length(actor_tab_id) BETWEEN 32 AND 64),
  request_fingerprint TEXT NOT NULL CHECK(length(request_fingerprint)=64),
  expected_version INTEGER CHECK(expected_version IS NULL OR expected_version >= 0),
  outcome_class TEXT NOT NULL CHECK(outcome_class IN
    ('accepted_effective','accepted_noop','rejected')),
  result_code TEXT NOT NULL CHECK(result_code IN
    ('accepted','same_state','version_conflict','action_ineligible','item_not_found',
     'undo_expired','undo_superseded','undo_invalid_target')),
  accepted_event_uuid TEXT,
  accepted_item_version INTEGER CHECK(accepted_item_version IS NULL OR accepted_item_version >= 0),
  observed_item_version INTEGER CHECK(observed_item_version IS NULL OR observed_item_version >= 0),
  confirmed_at INTEGER CHECK(confirmed_at IS NULL OR confirmed_at >= 0),
  undo_eligible_until INTEGER CHECK(undo_eligible_until IS NULL OR undo_eligible_until >= 0),
  undo_target_event_uuid TEXT,
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  expires_at INTEGER CHECK(expires_at IS NULL OR expires_at >= created_at),
  CHECK (
    (outcome_class='accepted_effective' AND result_code='accepted'
      AND accepted_event_uuid IS NOT NULL AND accepted_item_version IS NOT NULL)
    OR
    (outcome_class='accepted_noop' AND result_code='same_state'
      AND accepted_event_uuid IS NULL AND accepted_item_version IS NOT NULL)
    OR
    (outcome_class='rejected' AND accepted_event_uuid IS NULL)
  ),
  CHECK (item_id IS NOT NULL OR expires_at IS NOT NULL)
);
```

Valid authenticated/origin-valid canonical requests always insert one immutable terminal row, including no-op, conflict, ineligible, not-found, expired, and superseded. Pre-canonical auth/origin/malformed/oversize rejection is not receipted. Existing-item receipts cascade on hard delete; null-item scope uses only HMAC and 90-day expiry.

### Step 3 — create canonical events

```sql
CREATE TABLE item_workflow_events (
  id INTEGER PRIMARY KEY,
  event_uuid TEXT NOT NULL UNIQUE CHECK(length(event_uuid) BETWEEN 32 AND 64),
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_version INTEGER NOT NULL CHECK(item_version >= 1),
  mutation_id TEXT NOT NULL UNIQUE
    REFERENCES processing_mutation_receipts(mutation_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN
    ('initialized','raw_initialized','enrolled','status_changed','archived','restored','reprocessed','undo')),
  from_status TEXT CHECK(from_status IS NULL OR from_status IN ('inbox','todo','in_progress','done')),
  to_status TEXT NOT NULL CHECK(to_status IN ('inbox','todo','in_progress','done')),
  from_archived_at INTEGER,
  to_archived_at INTEGER,
  from_inbox_entered_at INTEGER,
  to_inbox_entered_at INTEGER,
  from_inbox_episode_id TEXT,
  to_inbox_episode_id TEXT,
  from_status_changed_at INTEGER,
  to_status_changed_at INTEGER NOT NULL,
  from_current_done_entered_at INTEGER,
  to_current_done_entered_at INTEGER,
  origin TEXT NOT NULL CHECK(origin IN ('capture','enrollment','user','undo','raw_guard')),
  surface TEXT NOT NULL CHECK(surface IN
    ('web_capture','api_capture','telegram','recall','inbox','board','list','archived','detail','raw')),
  actor_channel TEXT NOT NULL CHECK(actor_channel IN
    ('web','android','extension','telegram','recall','system','unknown_raw')),
  actor_tab_id TEXT CHECK(actor_tab_id IS NULL OR length(actor_tab_id) BETWEEN 32 AND 64),
  undo_of_event_uuid TEXT UNIQUE
    REFERENCES item_workflow_events(event_uuid) DEFERRABLE INITIALLY DEFERRED,
  reason_code TEXT CHECK(reason_code IS NULL OR length(reason_code) BETWEEN 2 AND 32),
  occurred_at INTEGER NOT NULL CHECK(occurred_at >= 0),
  UNIQUE(item_id,item_version)
);
```

Then add the deferred projection link:

```sql
ALTER TABLE items ADD COLUMN workflow_last_event_uuid TEXT
  REFERENCES item_workflow_events(event_uuid)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
```

Events store lifecycle facts only. No content, URL, title, note, summary, transcript, taxonomy label, query, prompt/provider payload, free-form error, or JSON metadata is permitted.

### Step 4 — create Undo slots

```sql
CREATE TABLE processing_undo_slots (
  actor_tab_id TEXT PRIMARY KEY CHECK(length(actor_tab_id) BETWEEN 32 AND 64),
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  target_event_uuid TEXT NOT NULL REFERENCES item_workflow_events(event_uuid) ON DELETE CASCADE,
  target_mutation_id TEXT NOT NULL REFERENCES processing_mutation_receipts(mutation_id) ON DELETE CASCADE,
  confirmed_at INTEGER NOT NULL,
  undo_eligible_until INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK(undo_eligible_until = confirmed_at + 30000)
);
```

A reversible effective action upserts its tab slot only after confirmation. No-op/rejected/pending actions do not replace it. Undo consumes it. Expired slots clean after 24 hours.

### Step 5 — create enrollment jobs

```sql
CREATE TABLE processing_enrollment_jobs (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  mode TEXT NOT NULL CHECK(mode IN ('selected','recent','all')),
  state TEXT NOT NULL CHECK(state IN
    ('previewing','preview_ready','confirmed','running','cancel_requested',
     'completed','cancelled','failed','expired')),
  preview_as_of_utc INTEGER NOT NULL,
  recent_start_utc INTEGER,
  owner_timezone TEXT NOT NULL,
  timezone_version INTEGER NOT NULL,
  frozen_count INTEGER CHECK(frozen_count IS NULL OR frozen_count >= 0),
  frozen_hash TEXT CHECK(frozen_hash IS NULL OR length(frozen_hash)=64),
  confirmed_at INTEGER,
  processed_count INTEGER NOT NULL DEFAULT 0 CHECK(processed_count >= 0),
  enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK(enrolled_count >= 0),
  already_enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK(already_enrolled_count >= 0),
  deleted_count INTEGER NOT NULL DEFAULT 0 CHECK(deleted_count >= 0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  error_code TEXT,
  preview_expires_at INTEGER,
  cancel_requested_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX processing_one_active_enrollment_job
ON processing_enrollment_jobs((1))
WHERE state IN ('previewing','preview_ready','confirmed','running','cancel_requested');

CREATE TABLE processing_enrollment_job_items (
  job_id TEXT NOT NULL REFERENCES processing_enrollment_jobs(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  scope_key_hash TEXT NOT NULL CHECK(length(scope_key_hash)=64),
  result TEXT NOT NULL DEFAULT 'pending'
    CHECK(result IN ('pending','enrolled','already_enrolled','deleted')),
  PRIMARY KEY(job_id,ordinal),
  UNIQUE(job_id,scope_key_hash)
);
```

An `AFTER UPDATE OF item_id` trigger changes pending rows to `deleted` when FK action sets item ID null. Preview materializes at 500 rows/transaction; ready preview expires after 15 minutes. Confirm freezes one timestamp used as every enrolled item's entry time. Worker claims at most 100 rows/transaction. Cancel finishes the current batch then stops. Only failed confirmed/running jobs retry, maximum five attempts; cancelled/expired requires new preview. Cleanup uses 500-row batches.

### Step 6 — create timezone and runtime singleton tables

```sql
CREATE TABLE processing_preferences (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  owner_timezone TEXT,
  timezone_version INTEGER NOT NULL DEFAULT 0 CHECK(timezone_version >= 0),
  initialized_at INTEGER,
  updated_at INTEGER,
  last_mutation_id TEXT REFERENCES processing_mutation_receipts(mutation_id)
);
INSERT INTO processing_preferences(singleton) VALUES(1);

CREATE TABLE processing_runtime_state (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  schema_version INTEGER NOT NULL,
  workflow_epoch INTEGER NOT NULL DEFAULT 0,
  taxonomy_epoch INTEGER NOT NULL DEFAULT 0,
  readiness_state TEXT NOT NULL CHECK(readiness_state IN ('unverified','green','red')),
  failure_code TEXT,
  last_deep_attempt_at INTEGER,
  last_deep_success_at INTEGER,
  audited_app_sha TEXT,
  audited_migration_hash TEXT,
  updated_at INTEGER NOT NULL
);
INSERT INTO processing_runtime_state(singleton,schema_version,readiness_state,updated_at)
VALUES(1,1,'unverified',unixepoch()*1000);
```

Timezone PUT is CAS/idempotent using expected version and receipt. `@js-temporal/polyfill` implements owner-local boundaries in application code, not SQL/host timezone.

### Step 7 — create invariant and immutability triggers

Required triggers:

1. `items_workflow_insert_shape`: new row is either untouched non-legacy version-0 defaults or a complete version-1 initialized Inbox row; any new legacy=1 or partial projection aborts.
2. `items_workflow_update_shape`: validates every state; dormant->enrolled is version 0->1; effective changes increment exactly one and change last-event UUID; enrollment/initialization/legacy provenance become immutable afterward.
3. `items_workflow_existing_event_guard`: if proposed last-event already exists it must match item/new version/to-facts; otherwise deferred FK requires a matching event before commit.
4. `item_workflow_event_projection_guard`: receipt is accepted-effective with matching event UUID and event item/version/to-facts exactly match current projection.
5. `item_workflow_undo_target_guard`: target is same item, earlier, non-Undo, reversible, and unique.
6. `item_workflow_events_no_update` and `processing_receipts_no_update`: always abort.
7. guarded no-delete triggers: abort direct retained history deletion while parent exists; allow tested parent hard-delete cascade and expired null-item receipt cleanup.
8. `processing_job_item_deleted`: pending + item FK SET NULL becomes deleted.
9. `processing_workflow_epoch`: each event insert increments runtime workflow epoch.
10. taxonomy epoch triggers after INSERT/UPDATE/DELETE on `tags`, `item_tags`, `topics`, and `item_topics`.

Use `IS` for null-safe SQLite fact comparison. Trigger error strings are bounded codes, never content. Fresh/upgrade tests must prove hard-delete cascade is not blocked by immutability triggers; otherwise the migration is a no-go.

### Step 8 — create raw initialization guard

`items_workflow_raw_initialize` is `AFTER INSERT` and matches only:

```text
legacy=0, version=0, status=inbox, and every workflow time/episode/last-event null
```

It performs, in the original INSERT transaction:

1. insert one accepted-effective initialization receipt using randomblob IDs/hashes and mapped bounded capture provenance;
2. update item to enrolled Inbox/version 1 with one timestamp, random episode, and receipt's event UUID;
3. insert `raw_initialized` referencing that receipt;
4. allow the event/projection/deferred checks to commit or abort the entire original INSERT.

Known capture sources map to `web|android|extension|telegram|recall|system`; all others map to `unknown_raw`. It is independent of existing FTS/enrichment/transcript trigger order. It never repairs partial workflow input—the insert-shape trigger rejects it. Collision injection must abort the item and all trigger side effects.

### Step 9 — create indexes

```sql
CREATE INDEX items_processing_inbox
ON items(workflow_inbox_entered_at,id)
WHERE workflow_enrolled_at IS NOT NULL
  AND workflow_archived_at IS NULL AND workflow_status='inbox';

CREATE INDEX items_processing_active_status
ON items(workflow_status,workflow_status_changed_at DESC,id)
WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL;

CREATE INDEX items_processing_done
ON items(workflow_current_done_entered_at DESC,id)
WHERE workflow_enrolled_at IS NOT NULL
  AND workflow_archived_at IS NULL AND workflow_status='done';

CREATE INDEX items_processing_archived
ON items(workflow_archived_at DESC,id)
WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NOT NULL;

CREATE INDEX workflow_events_item_time
ON item_workflow_events(item_id,occurred_at DESC,id DESC);
CREATE INDEX workflow_events_metric
ON item_workflow_events(event_type,occurred_at,item_id);
CREATE INDEX processing_receipts_item_time
ON processing_mutation_receipts(item_id,created_at DESC);
CREATE INDEX processing_receipts_expiry
ON processing_mutation_receipts(expires_at)
WHERE item_id IS NULL;
CREATE INDEX processing_undo_expiry ON processing_undo_slots(undo_eligible_until);
CREATE INDEX processing_enrollment_progress
ON processing_enrollment_job_items(job_id,result,ordinal);
```

Additional filter/group indexes require 50k `EXPLAIN QUERY PLAN` proof; do not guess them into 025.

## 4. Exact invariants to audit

- dormant means legacy 1, Inbox/version 0, every other workflow field null;
- enrolled Inbox has entry+episode, no archive/current-Done;
- enrolled To Do/In Progress has no entry/episode/archive/current-Done;
- active Done has current-Done and no entry/episode/archive;
- Archived is Done with archive+current-Done and no entry/episode;
- every effective version has exactly one event and accepted-effective receipt matching last-event;
- no-op/rejected receipt has no event and changes no projection/slot;
- Undo target is same-item, non-Undo, unique; target effectiveness excludes it from metrics;
- no new non-legacy row remains version 0 after statement commit;
- legacy enrollment is version 1 with initialized null and confirmation-time entry;
- event/receipt/log schema contains no prohibited content;
- hard delete removes item/events/known-item receipts/slots and nulls job item ID;
- runtime singleton exists exactly once and starts unverified.

## 5. Fixture matrix

### Fresh database

1. Apply every exact migration filename through 025.
2. Assert schema/index/trigger manifest, `integrity_check=ok`, quick OK, no FK rows.
3. Insert through new application transaction: one version-1 Inbox, one receipt/event, guard no-op.
4. Insert old-code column list: guard creates exactly one receipt/event.
5. Direct partial projection, legacy=1 new insert, ID collision, event failure: entire insert and existing trigger effects roll back.
6. Exercise effective/no-op/rejected receipt, replay/fingerprint, current truth, event immutability, hard-delete cascade.

### Upgrade from 024

Create representative 024 rows for every source/capture path, duplicates, archived-unaware downstream joins, tags/topics, notes, queues, Recall and SRS. Apply 025:

- every old row is dormant legacy with no receipt/event and absent from all Processing/count/metric reads;
- Library/search/Ask/Related/Review/export/worker membership is unchanged;
- first post-migration app/raw/old-code capture initializes once;
- duplicate/repair/transcript/enrichment/index/note mutations preserve dormant/enrolled workflow exactly;
- selected/recent/all enrollment preview/confirm/interrupt/retry/cancel/delete/cleanup passes.

### Mutation/event atomicity

Inject failure after receipt, after projection update, before event, at event trigger, at affected-item assertion, DB busy, and lost response. An effective mutation commits all receipt+projection+event(+slot) or none. A terminal no-op/rejection commits receipt only. Lookup distinguishes effective/no-op/conflict/ineligible/not-found/expired/superseded/unknown; changed fingerprint never overwrites.

## 6. Readiness tiers

Deep audit runs only in deploy/startup asynchronous/timer/operator contexts. It checks exact manifest, all invariants, missing initialization, receipts/events/slots/jobs, `quick_check`, and `foreign_key_check`, then updates the singleton. It never runs in a request handler.

- deploy deep audit: mandatory after 025, flags off;
- startup: if checkpoint absent/stale, Processing unavailable while asynchronous audit runs;
- periodic: six-hour single-instance low-priority timer;
- after repair/restore: mandatory;
- hot path: one singleton PK read, p95 <=2ms;
- stale after 24 hours: reads/writes unavailable and nav hidden;
- effective write: O(1) affected-item assertion;
- any audit/assertion failure: red latch and flags-off response.

50k deep-audit target is <=30s, no lock >100ms, and <20% concurrent request p95 degradation. Quick/FK/full scans on a request path are an automatic no-go.

## 7. Synthetic 10k/50k rehearsal

Generate deterministic, content-free fixtures with realistic source/status/archive distribution, current-Done/episode/event/receipt histories, manual-tag/AI-topic fan-out, unassigned groups, enrollment jobs, and long bounded display fields.

Record for each 10k/50k run:

| Evidence field | Required value |
|---|---|
| Fixture seed/version | exact |
| Git SHA/migration hash | exact |
| Node/npm/SQLite/better-sqlite3 versions | exact |
| CPU/RAM/disk/filesystem | exact |
| Starting DB/WAL/SHM bytes | exact |
| Free bytes before/peak/after | exact |
| Migration wall/CPU time | ms |
| Longest observed lock/startup delay | ms |
| Peak DB/WAL/SHM bytes and amplification | exact |
| Row counts before/after by table/state | exact |
| Quick/FK/integrity results | typed |
| Query-plan snapshots | every required query class |
| p50/p95/max and sample count | summary/count/group/page/mutation/hot gate/deep audit |
| Payload/DOM/memory branch | bounded proof |
| Enrollment batch lock/progress/restart | exact |
| Old-code guard/rollback result | exact |

Budgets: summary/count <=100ms p95 unfiltered; filtered/group <=200ms; first/next page <=200ms; mutation <=250ms; hot gate <=2ms; enrollment lock <=100ms; deep audit <=30s with <20% p95 degradation. Any unbounded scan/payload/DOM, offset paging, count from loaded rows, or unexplained temp sort is no-go.

## 8. Ordered rehearsal runbook

1. Record repository SHA, clean status, exact migration manifest, tool/runtime/hardware, and content-free production baseline fields.
2. Create a byte-for-byte isolated SQLite backup with SQLite `.backup`; hash it; run quick/FK; never open content in artifacts.
3. Copy the known-good application artifact and processing flag snapshot; hash/verify extraction and Node ABI.
4. Restore database copy into an isolated directory with at least measured peak free space; prevent network and production credentials.
5. Apply 025 through the real migration runner; record all fields in §7.
6. Run exact schema/index/trigger manifest, deep audit, quick/FK/integrity and row-count reconciliation.
7. Run fresh/upgrade/application/raw/partial/collision/nested Recall/receipt-event fixture suites.
8. Run enrollment lifecycle including 50k preview, expiry, delete, cancel, retry, restart and cleanup.
9. Run all summary/count/filter/status/global-group/archive/Today/week keysets with plans and budgets.
10. Run concurrent capture/move/Undo/enrollment/read/deep-audit against WAL/5s busy timeout.
11. Deploy the known-good old application artifact only in isolation against migrated DB; prove old-code capture guard initialization and unchanged Library/search/Ask/notes.
12. Exercise flags-off -> audited reads -> writes -> nav gate simulation; no real production flags.
13. Exercise forward repair plan/apply/re-audit on injected supported corruption.
14. Exercise code artifact rollback with checksum/native dependency repair and capture proof.
15. Exercise destructive snapshot restore only on disposable copy; record post-snapshot loss interval semantics.
16. Publish content-free rehearsal report with commands, exit codes, hashes, timings, plans, failures and disposition.

## 9. Code rollback, forward repair, restore boundary

### Code rollback

Normal rollback is navigation/write/read flags 0, verified backup, checksum/ABI-compatible known-good artifact restore, native SQLite dependency repair, service/auth health, O(1) status, and old-code capture proof. Migration 025 and raw guard remain. No down migration, event deletion, version reset, or enrollment reversal.

Required artifact evidence: `/opt/brain/data/releases/<sha>/ai-brain-<sha>.tar.gz`, sibling SHA-256, manifest with git SHA/Node ABI/package-lock/migration compatibility, and non-secret three-flag snapshot. Rehearsal must prove the rollback script preserves `/opt/brain/data` and starts the old artifact against 025.

### Forward repair

Only with flags off, verified backup, red latch, content-free `--plan`, explicit typed `--apply --confirm`, one bounded transaction per affected item/batch, then full deep audit. Supported repair may recreate a provably derivable missing link/receipt/event or correct a job counter; it may never invent owner intent, rewrite valid history, or auto-enroll dormant legacy. Unsupported corruption requires a forward migration or destructive restore decision.

### Destructive restore

Snapshot restore is reserved for unrecoverable corruption. Stop every writer; preserve failed DB/WAL; identify snapshot timestamp and every post-snapshot capture/mutation that will be lost; obtain explicit operator acknowledgement; restore through existing script; rerun quick/FK/deep audit/service/auth/capture smoke. It is never routine rollback.

## 10. No-go checklist

- [ ] PRD v2, technical v2, migration SQL and exact enums/fields conflict.
- [ ] Migration touches production or source code before review approval.
- [ ] Existing rows are auto-enrolled or receive boot events.
- [ ] A new app/raw/old-code item can commit without exactly one valid projection, receipt and event.
- [ ] Partial workflow insert can bypass/reach dormant state.
- [ ] Effective mutation can commit receipt/projection/event/slot partially.
- [ ] No-op/rejected/expired/superseded outcome is not durably distinguishable from unknown.
- [ ] Direct retained event/receipt mutation or invalid Undo link succeeds.
- [ ] Hard-delete cascade is blocked or leaves private workflow references.
- [ ] Enrollment preview/expiry/CAS/cancel/retry/delete/cleanup is not exact and bounded.
- [ ] Quick/FK/deep scan occurs in request path or hot gate exceeds 2ms p95.
- [ ] 10k/50k plans/budgets/evidence fields are incomplete.
- [ ] Migration/DB/WAL/free-space peak exceeds approved host budget.
- [ ] Exact migration filename manifest, quick/FK/integrity, or row reconciliation fails.
- [ ] Known-good artifact checksum/ABI/native repair/old-code capture proof fails.
- [ ] Forward repair cannot produce a plan before mutation.
- [ ] Destructive restore loss boundary is absent or treated as routine.
- [ ] Evidence contains source/note/taxonomy/private credential data.

Every box must be false, with evidence, before migration 025 can be called ready. This plan itself performs no migration or production action.
