# Substack Android Share Enrichment Failure - Revised RCA Implementation Plan

Created: 2026-06-24 09:40:03 IST
Author: Codex
Status: Detailed implementation plan; requires adversarial review before production mutation
Source RCA: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_RCA_REVISED_2026-06-17_21-49-13_IST.md`
Prior implementation plan: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_IMPLEMENTATION_PLAN_V1_2026-06-17_21-57-49_IST.md`
Scope: Fix the vector-index integrity defect that caused Android-shared Substack items to show `enrichment failed`, prevent recurrence, repair affected items safely, improve UI state accuracy, and follow up on Substack note capture quality.

## Executive Summary

The revised RCA found that the two Substack links shared through Android native share were saved and enriched, but semantic indexing failed afterward because production has an orphan `chunks_vec` row at rowid `44`. The current allocator in `src/db/chunks.ts` chooses the next vector rowid from `MAX(chunks_rowid.rowid) + 1`; because `chunks_rowid` tops out at `43`, every new vector write attempts rowid `44` and collides with the orphan vector row.

This implementation plan has four goals:

1. Prevent future rowid collisions by replacing max-based allocation with a durable sequence initialized from both `chunks_rowid` and `chunks_vec`.
2. Patch backfill and reset paths so they delete vectors through the `chunks_rowid` bridge instead of implicit SQLite rowids on `chunks`.
3. Provide a dry-run-first, guarded production repair script and runbook before mutating production data.
4. Fix product state and UI labels so successful summaries are not shown as failed enrichment when only semantic indexing failed.

Substack note capture quality is a related follow-up. It should be handled in this execution stream, but it must not block the vector-integrity repair unless implementation discovers that weak capture quality is required for item recovery.

## Implementation Verdict

Local implementation: ready to start after adversarial review of this plan.
Production deployment: blocked until allocator, backfill, repair script, UI state, and QA checks pass.
Production data mutation: blocked until backup, restore test, worker quiescence, dry-run report review, and rollback plan are complete.
Incident closure: blocked until the two known Substack items and the broader affected set are repaired and validated.

## Inputs And Evidence

Primary RCA findings:

- `chunks_vec` contains orphan rowid `44`.
- `chunks_rowid` has max rowid `43`.
- New embedding writes allocate rowid `44`.
- Insert into `chunks_vec` fails with `UNIQUE constraint failed on chunks_vec primary key`.
- Both Substack items had summaries, quotes, categories, and captured artifacts.
- User-facing `enrichment failed` is misleading because the failed stage was semantic indexing.
- Affected failures span multiple sources, not only Android Substack.
- `scripts/backfill-embeddings-prod.mjs` likely contributed because it deletes vectors through `chunks.rowid`, but this origin is not yet proven.

Known affected Substack items:

- `f35c579f2f22e9444c09ad8f` - `How to Remember Everything You Read: A Guide to Memory Protocols`
- `e8e707e2b5897b649e8e2f01` - `JP Morgan's Summer Reading List 2026 Book Selection`

Key implementation files already present:

- `src/db/chunks.ts`
- `src/db/chunks.test.ts`
- `src/lib/embed/pipeline.ts`
- `src/lib/embed/pipeline.test.ts`
- `scripts/backfill-embeddings-prod.mjs`
- `scripts/backfill-embeddings.mjs`
- `src/lib/items/status.ts`
- `src/lib/items/status.test.ts`
- `src/app/api/items/[id]/enrichment-status/route.ts`
- `src/app/api/items/[id]/enrichment-status/route.test.ts`
- `src/components/enriching-pill.tsx`
- `src/components/item-enrichment-watch.tsx`
- `src/components/library-list.tsx`
- `src/app/items/[id]/page.tsx`
- `src/lib/capture/substack.ts`
- `src/lib/capture/substack.test.ts`

## Non-Negotiable Constraints

- Do not run production repair SQL manually from the RCA.
- Do not mutate production before a backup is created and restore-tested.
- Do not run repair while the app or embedding worker can write to `chunks_vec`.
- Do not re-enrich summary-bearing affected items unless their existing enrichment output is invalid.
- Do not clear existing summaries, quotes, categories, titles, capture metadata, or source URLs during repair.
- Do not rely on count equality alone; use referential integrity checks.
- Do not close the incident until UI, item detail, semantic retrieval, and logs are validated.

## Target Architecture

### Vector Rowid Allocation

Introduce a durable allocator table:

```sql
CREATE TABLE IF NOT EXISTS chunks_vec_rowid_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_rowid INTEGER NOT NULL CHECK (next_rowid > 0)
);
```

Initialize and repair the sequence from the maximum rowid in both tables:

```sql
SELECT MAX(max_rowid) + 1 AS next_rowid
FROM (
  SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_rowid
  UNION ALL
  SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_vec
);
```

All new vector writes must allocate from `chunks_vec_rowid_sequence`, not `MAX(chunks_rowid.rowid) + 1`.

### Vector Reset And Deletion

All reset paths must delete vectors through the bridge:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT r.rowid
  FROM chunks_rowid r
  JOIN chunks c ON c.id = r.chunk_id
  WHERE c.item_id = ?
);
```

The unsafe shape must be removed:

```sql
DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)
```

### Product Processing State

The product should distinguish enrichment from semantic indexing:

```text
saved
enrichment_pending
enrichment_running
enrichment_failed
summary_ready
semantic_indexing_pending
semantic_indexing_failed
semantic_indexing_ready
```

The UI should display `enrichment failed` only when enrichment content is absent and enrichment truly failed. If summary/quotes exist and only indexing failed, the UI should show an indexing-specific state.

## Phase 0 - Baseline And Safety

### Goal

Capture current state without mutation and prepare a controlled implementation branch.

### Tasks

| ID | Task | Output |
| --- | --- | --- |
| P0.1 | Create or switch to `codex/substack-android-enrichment-repair` | Dedicated branch |
| P0.2 | Capture git status and current migration head | Baseline QA note |
| P0.3 | Run local baseline checks: `npm run typecheck`, targeted tests, and smoke if available | Baseline QA note |
| P0.4 | Run read-only production vector consistency query | Dated evidence file |
| P0.5 | Run read-only affected-item query for summaries with missing chunks | Dated evidence file |
| P0.6 | Search all writes/deletes touching `chunks`, `chunks_rowid`, and `chunks_vec` | Audit section in QA note |

### Read-Only Consistency Query

```sql
SELECT
  (SELECT COUNT(*) FROM chunks) AS chunks,
  (SELECT COUNT(*) FROM chunks_rowid) AS rowids,
  (SELECT COUNT(*) FROM chunks_vec) AS vecs,
  (SELECT MAX(rowid) FROM chunks_rowid) AS max_rowid,
  (SELECT MAX(rowid) FROM chunks_vec) AS max_vec_rowid,
  (SELECT COUNT(*)
     FROM chunks_vec v
     LEFT JOIN chunks_rowid r ON r.rowid = v.rowid
    WHERE r.rowid IS NULL) AS orphan_vecs,
  (SELECT COUNT(*)
     FROM chunks_rowid r
     LEFT JOIN chunks_vec v ON v.rowid = r.rowid
    WHERE v.rowid IS NULL) AS rowids_missing_vec,
  (SELECT COUNT(*)
     FROM chunks_rowid r
     LEFT JOIN chunks c ON c.id = r.chunk_id
    WHERE c.id IS NULL) AS rowids_missing_chunk;
```

### Exit Criteria

- No production mutation has occurred.
- Baseline test and database evidence are captured.
- Exact affected-item recovery set is known or clearly marked as provisional.

## Phase 1 - Durable Vector Rowid Sequence

### Goal

Eliminate rowid collisions caused by orphan vectors or max-based allocation.

### Implementation Steps

1. Add a migration, likely `src/db/migrations/018_vector_rowid_sequence.sql`, unless a newer migration number is required by the current tree.
2. Create `chunks_vec_rowid_sequence`.
3. Initialize `next_rowid` from the maximum rowid across both `chunks_rowid` and `chunks_vec`.
4. Make the migration idempotent and safe for existing databases.
5. Update `src/db/chunks.ts` to allocate rowids from the sequence inside the caller's transaction.
6. Preserve BigInt binding behavior for `sqlite-vec`.
7. Remove the current `SELECT COALESCE(MAX(rowid), 0) + 1 ... FROM chunks_rowid` allocator from production code.

### Expected Code Shape

```ts
function allocateChunkVecRowid(): bigint {
  const db = getDb();
  const row = db
    .prepare("SELECT next_rowid FROM chunks_vec_rowid_sequence WHERE id = 1")
    .get() as { next_rowid: number | bigint } | undefined;

  if (!row) {
    throw new Error("chunks_vec_rowid_sequence is not initialized");
  }

  db.prepare(
    "UPDATE chunks_vec_rowid_sequence SET next_rowid = next_rowid + 1 WHERE id = 1",
  ).run();

  return BigInt(row.next_rowid);
}
```

### Tests

Add or update `src/db/chunks.test.ts`:

- sequence table is created by migration;
- sequence initializes to one above both bridge and vector max rowids;
- allocator skips an orphan vector row above `chunks_rowid`;
- multiple chunk inserts allocate monotonically increasing rowids;
- transaction rollback also rolls back sequence increments.

Add or update `src/lib/embed/pipeline.test.ts`:

- embedding succeeds when `chunks_vec` contains a pre-existing orphan row above `chunks_rowid`;
- a genuine provider or vector write error still marks the embedding job as failed.

### Exit Criteria

- No app path allocates vector rowids using only `MAX(chunks_rowid.rowid)`.
- Tests prove the incident class cannot recur from an orphan vector above the bridge.
- Local migration works on empty and existing databases.

## Phase 2 - Patch Backfill And Reset Paths

### Goal

Prevent scripts from creating or preserving orphan vectors during reset/backfill operations.

### Implementation Steps

1. Update `scripts/backfill-embeddings-prod.mjs`.
2. Update `scripts/backfill-embeddings.mjs`.
3. Replace implicit `chunks.rowid` vector deletes with bridge-based deletes.
4. Ensure script allocation uses the sequence or delegates to shared app code where practical.
5. Add preflight checks:
   - sequence table exists;
   - orphan vector count is zero unless explicitly running repair mode;
   - target item count is printed before mutation.
6. Keep or add:
   - `--dry-run`;
   - explicit `--confirm`;
   - non-zero exit on failed safety checks.

### Search Criteria

These searches should return no unsafe production matches after implementation:

```text
rg "DELETE FROM chunks_vec WHERE rowid IN \\(SELECT rowid FROM chunks" scripts src
rg "MAX\\(rowid\\).*chunks_rowid" scripts src
```

Allowed matches may remain in migration initialization, tests, diagnostics, or comments explaining the removed bug.

### Tests

If scripts are not easily unit-testable, extract the reset SQL into a helper and test the helper.

Required cases:

- reset deletes the vectors for the target item through `chunks_rowid`;
- reset does not delete unrelated vectors;
- reset is idempotent;
- sequence remains above both bridge and vector max rowids after reset.

### Exit Criteria

- Both backfill scripts use bridge-based deletion.
- Broad write modes are dry-run-first and guarded.
- Unsafe deletion and max-only allocator patterns are removed from active code.

## Phase 3 - Production Repair Script

### Goal

Create a script that can safely remove orphan vectors, repair sequence state, and prepare affected items for embedding-only recovery.

### New File

```text
scripts/repair-vector-index-consistency.mjs
```

### CLI Contract

```text
--db-path <path>             Defaults to BRAIN_DB_PATH or data/brain.sqlite
--dry-run                   Default mode; no mutation
--apply                     Enables mutation
--confirm <phrase>          Required with --apply
--backup-confirmed          Required with --apply after backup restore test
--item-id <id>              Optional narrow recovery
--include-all-affected      Includes all affected items from impact query
--json                      Emits machine-readable report
--output <path>             Writes report to file
```

Required confirm phrase:

```text
repair vector index consistency
```

### Dry-Run Report Must Include

- DB path.
- sqlite-vec load status.
- counts for `chunks`, `chunks_rowid`, and `chunks_vec`.
- max rowids in `chunks_rowid` and `chunks_vec`.
- orphan vector rowids.
- rowids missing vectors.
- rowids missing chunks.
- current sequence value, if present.
- recommended sequence value.
- items with summaries but no chunks.
- enrichment jobs with `chunks_vec` errors.
- embedding jobs in `error`, stale `running`, or stale `pending`.
- exact mutations that would run in apply mode.

### Apply Behavior

Apply mode must:

1. Refuse to run unless `--confirm "repair vector index consistency"` is supplied.
2. Refuse to run unless backup restore-test acknowledgment is supplied.
3. Use `BEGIN IMMEDIATE`.
4. Delete only orphan vectors.
5. Initialize or bump `chunks_vec_rowid_sequence`.
6. Reset affected `embedding_jobs` to `pending`, `attempts=0`, with cleared transient fields.
7. Set `items.enrichment_state='done'` only when summary/quotes/category are valid and the remaining failure is indexing.
8. Preserve all existing enrichment and capture content.
9. Commit.
10. Re-run the dry-run report and print before/after integrity state.

### Repair SQL Building Blocks

Orphan vector delete:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT v.rowid
  FROM chunks_vec v
  LEFT JOIN chunks_rowid r ON r.rowid = v.rowid
  WHERE r.rowid IS NULL
);
```

Sequence repair:

```sql
INSERT INTO chunks_vec_rowid_sequence (id, next_rowid)
SELECT 1,
       (
         SELECT MAX(max_rowid) + 1
         FROM (
           SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_rowid
           UNION ALL
           SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_vec
         )
       )
ON CONFLICT(id) DO UPDATE SET
  next_rowid = max(chunks_vec_rowid_sequence.next_rowid, excluded.next_rowid);
```

Embedding job reset:

```sql
INSERT INTO embedding_jobs (item_id, state, attempts, last_error, claimed_at, completed_at)
VALUES (?, 'pending', 0, NULL, NULL, NULL)
ON CONFLICT(item_id) DO UPDATE SET
  state = 'pending',
  attempts = 0,
  last_error = NULL,
  claimed_at = NULL,
  completed_at = NULL;
```

Item state repair:

```sql
UPDATE items
SET enrichment_state = 'done',
    batch_id = NULL
WHERE id = ?
  AND summary IS NOT NULL
  AND length(summary) > 0;
```

### Exit Criteria

- Dry-run can run against a copied production DB without mutation.
- Apply mode is guarded and transactional.
- The script emits a report usable as production repair evidence.
- The script can target the two known Substack items and all affected items.

## Phase 4 - Product State And UI Fix

### Goal

Stop presenting semantic indexing failures as failed enrichment.

### Implementation Steps

1. Extend `src/lib/items/status.ts` to derive a richer processing status from:
   - `items.enrichment_state`;
   - summary/quotes/category presence;
   - `embedding_jobs.state`;
   - chunk count;
   - last error.
2. Update `src/app/api/items/[id]/enrichment-status/route.ts` to include backward-compatible raw state plus new derived fields.
3. Update `src/components/enriching-pill.tsx` so it can show indexing-specific labels.
4. Update `src/components/item-enrichment-watch.tsx` to poll until both enrichment and indexing reach a stable state.
5. Update `src/components/library-list.tsx` to use derived processing labels where available.
6. Update `src/app/items/[id]/page.tsx` so digest rendering depends on summary/quotes existence, not only `enrichment_state === "done"`.

### API Shape

```json
{
  "state": "error",
  "processing_state": "semantic_indexing_failed",
  "processing_label": "Indexing failed",
  "has_summary": true,
  "has_quotes": true,
  "embedding_state": "error",
  "chunk_count": 0,
  "last_error": "UNIQUE constraint failed on chunks_vec primary key",
  "batch_id": null,
  "attempts": 3
}
```

### Label Rules

| Condition | Library Label | Item Detail Behavior |
| --- | --- | --- |
| No summary and enrichment failed | `enrichment failed` | Show enrichment failure guidance |
| Summary exists and indexing failed | `indexing failed` | Show summary/quotes and indexing status |
| Summary exists and indexing pending | `summary ready` or `indexing pending` | Show summary/quotes |
| Chunks exist and embedding done | No failure badge | Full digest/search behavior |

### Tests

Add or update:

- `src/lib/items/status.test.ts`
- `src/app/api/items/[id]/enrichment-status/route.test.ts`
- component tests if the project already has a harness for these components;
- otherwise document Playwright/manual screenshots in the QA report.

Required cases:

- summary exists + embedding error + no chunks -> `semantic_indexing_failed`;
- summary exists + embedding pending + no chunks -> `semantic_indexing_pending`;
- summary absent + enrichment error -> `enrichment_failed`;
- summary exists + chunks exist -> `semantic_indexing_ready`;
- API remains backward-compatible for existing clients.

### Exit Criteria

- A summary-bearing item with indexing failure no longer shows `enrichment failed`.
- Item detail shows existing digest content even when indexing failed.
- Android compact card layout remains readable.

## Phase 5 - Substack Note Capture Quality Follow-Up

### Goal

Address the separate issue where Substack `note/c-...` URLs may produce short or metadata-only captures.

### Implementation Steps

1. Detect Substack note URLs in `src/lib/capture/substack.ts`.
2. Store explicit metadata such as `substack_kind: "note"` and `body_source`.
3. Add fixtures for:
   - public short Substack note;
   - metadata-only Substack note;
   - long-form Substack article;
   - paywall or preview case.
4. Revisit `full_text` threshold for Substack notes.
5. Add UI/repair signal for weak Substack captures when `capture_quality` is `metadata_only` or text length is very short.
6. Harden short-content enrichment so predictable quote absence does not burn retries.

### Recommended Policy For This Release

Keep existing `full_text` behavior if the captured body is real note text, but add explicit note classification and tests. Route metadata-only Substack notes to an upgrade/repair hint rather than treating them as the same class as long-form article captures.

### Tests

Add or update `src/lib/capture/substack.test.ts`:

- detects `substack.com/@.../note/c-...`;
- preserves valid short note text;
- classifies metadata-only note captures clearly;
- does not confuse note capture quality with vector-indexing failures.

Add enrichment validator tests:

- short-content prompt can return `quotes: []` when appropriate;
- malformed quote object output is normalized only when safe, or rejected with a clear recoverable error.

### Exit Criteria

- Substack note capture behavior is explicit and tested.
- Weak Substack captures surface a repair path.
- Vector repair remains independent from capture-quality follow-up.

## Phase 6 - Production Repair Runbook

### Goal

Create a production-safe operator runbook before any data mutation.

### New File

```text
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_PRODUCTION_REPAIR_RUNBOOK_YYYY-MM-DD_HH-MM-SS_IST.md
```

### Required Sections

1. Owner and timestamp.
2. Incident scope.
3. Production host/app directory confirmation.
4. Current git commit and deployed version.
5. Production DB path.
6. Worker/app stop command.
7. Backup command.
8. Backup restore-test command.
9. Repair dry-run command.
10. Expected dry-run output.
11. Apply command.
12. Post-apply consistency command.
13. Re-embedding/requeue command.
14. Worker/app restart command.
15. Monitoring commands.
16. Rollback steps.
17. User-facing validation checklist.

### No-Go Gates

Block production repair if:

- backup cannot be created;
- backup cannot be restored to a temp DB;
- app/worker cannot be stopped;
- deployed code does not include allocator and backfill fixes;
- dry-run finds unexpected orphan/missing-vector classes;
- exact mutation scope is unknown;
- rollback command is not ready;
- post-apply validation queries are not ready.

### Expected Production Sequence

1. Deploy code fixes.
2. Stop app/worker.
3. Create DB backup.
4. Restore-test backup.
5. Run repair script dry-run against production DB.
6. Review dry-run report.
7. Run guarded apply.
8. Run post-repair dry-run.
9. Restart app/worker.
10. Let embedding jobs process.
11. Validate data integrity, UI state, semantic retrieval, and logs.

### Exit Criteria

- Runbook exists and is reviewed.
- Production repair uses the script, not manual SQL.
- Evidence report captures before/after state.

## Phase 7 - QA And Release Validation

### Automated Validation

Run from the phase2 project root:

```text
npm run typecheck
npm test
npm run smoke:0.4.0
npm run build
```

Targeted tests:

```text
node --import tsx --test src/db/chunks.test.ts
node --import tsx --test src/lib/embed/pipeline.test.ts
node --import tsx --test src/lib/items/status.test.ts
node --import tsx --test src/app/api/items/[id]/enrichment-status/route.test.ts
node --import tsx --test src/lib/capture/substack.test.ts
```

### Manual UI QA

Validate desktop and Android-sized viewports:

- Library row where enrichment genuinely failed.
- Library row where summary exists but indexing failed.
- Library row where summary exists and indexing is pending.
- Item detail where summary/quotes exist but indexing failed.
- Item detail after indexing succeeds.
- Substack note capture with short body.
- Metadata-only Substack note capture repair hint.

### Production Validation Queries

Referential integrity:

```sql
SELECT
  (SELECT COUNT(*) FROM chunks) AS chunks,
  (SELECT COUNT(*) FROM chunks_rowid) AS rowids,
  (SELECT COUNT(*) FROM chunks_vec) AS vecs,
  (SELECT COUNT(*)
     FROM chunks_vec v
     LEFT JOIN chunks_rowid r ON r.rowid = v.rowid
    WHERE r.rowid IS NULL) AS orphan_vecs,
  (SELECT COUNT(*)
     FROM chunks_rowid r
     LEFT JOIN chunks_vec v ON v.rowid = r.rowid
    WHERE v.rowid IS NULL) AS rowids_missing_vec,
  (SELECT COUNT(*)
     FROM chunks_rowid r
     LEFT JOIN chunks c ON c.id = r.chunk_id
    WHERE c.id IS NULL) AS rowids_missing_chunk;
```

Expected:

```text
orphan_vecs = 0
rowids_missing_vec = 0
rowids_missing_chunk = 0
```

Known Substack item validation:

- summaries and quotes are visible;
- no false `enrichment failed` badge;
- chunks exist after embedding recovery;
- semantic search can return the item;
- Ask retrieval can cite the item when scoped appropriately;
- no new `UNIQUE constraint failed on chunks_vec primary key` logs appear.

### Exit Criteria

- All required tests pass or failures are documented and resolved before release.
- Production consistency checks are green.
- Known affected items are repaired.
- UI state accurately separates enrichment and indexing.

## Detailed Task Tracker

| ID | Phase | Task | Primary Files | Exit Criteria | Status |
| --- | --- | --- | --- | --- | --- |
| T0.1 | Baseline | Create repair branch | git branch | Branch exists | Pending |
| T0.2 | Baseline | Capture current test baseline | QA report | Typecheck/test status recorded | Pending |
| T0.3 | Baseline | Capture production read-only consistency | evidence report | Counts and affected set recorded | Pending |
| T1.1 | Vector | Add rowid sequence migration | `src/db/migrations/...` | Migration initializes correctly | Pending |
| T1.2 | Vector | Replace app allocator | `src/db/chunks.ts` | No max-only allocator in app path | Pending |
| T1.3 | Vector | Add allocator tests | `src/db/chunks.test.ts` | Orphan-vector regression covered | Pending |
| T1.4 | Vector | Add embed pipeline regression | `src/lib/embed/pipeline.test.ts` | Embedding succeeds with orphan vector present | Pending |
| T2.1 | Backfill | Patch production backfill reset delete | `scripts/backfill-embeddings-prod.mjs` | Deletes through bridge | Pending |
| T2.2 | Backfill | Patch local backfill reset delete | `scripts/backfill-embeddings.mjs` | Deletes through bridge | Pending |
| T2.3 | Backfill | Add script preflights | backfill scripts | Dry-run/confirm/preflight present | Pending |
| T2.4 | Backfill | Add reset helper tests | test/helper files | Reset is idempotent and scoped | Pending |
| T3.1 | Repair | Create dry-run report script | `scripts/repair-vector-index-consistency.mjs` | No-mutation report works | Pending |
| T3.2 | Repair | Add guarded apply mode | repair script | Confirm phrase and transaction required | Pending |
| T3.3 | Repair | Add embedding-only recovery logic | repair script | Summaries preserved, jobs reset | Pending |
| T4.1 | UI | Add derived processing status | `src/lib/items/status.ts` | Indexing failure distinct | Pending |
| T4.2 | UI | Extend status API | enrichment-status route | Backward-compatible response | Pending |
| T4.3 | UI | Update status pill and library labels | components | False enrichment failure removed | Pending |
| T4.4 | UI | Update item detail digest gating | item detail page | Digest shows when content exists | Pending |
| T5.1 | Substack | Add note detection and metadata | `src/lib/capture/substack.ts` | Note URLs classified | Pending |
| T5.2 | Substack | Add Substack note fixtures/tests | `src/lib/capture/substack.test.ts` | Short/metadata-only cases covered | Pending |
| T5.3 | Substack | Harden short-content enrichment | enrichment tests/code | Quote schema retry burn addressed | Pending |
| T6.1 | Runbook | Create production repair runbook | execution docs | Commands and rollback defined | Pending |
| T7.1 | QA | Run automated validation | QA report | Required commands pass | Pending |
| T7.2 | QA | Run manual UI QA | QA report/screenshots | Android and desktop states validated | Pending |
| T7.3 | Release | Deploy code and execute repair | runbook evidence | Production repaired and monitored | Pending |

## Acceptance Criteria

### Data Integrity

- `chunks_vec` has no rowids missing from `chunks_rowid`.
- `chunks_rowid` has no rowids missing from `chunks_vec` for vectorized chunks.
- `chunks_rowid` has no chunk IDs missing from `chunks`.
- Rowid allocation always continues above both bridge and vector max rowids.
- Reset/backfill cannot recreate an orphan vector through implicit `chunks.rowid`.

### Affected Item Recovery

- Both known Android-shared Substack items are recovered.
- Existing summaries, quotes, categories, titles, and capture metadata are preserved.
- Embedding jobs are reset and complete.
- Chunks and vectors exist after recovery.
- Search/Ask can retrieve or cite the repaired items.

### UI

- Library does not show `enrichment failed` for summary-ready items whose only failure is semantic indexing.
- Item detail shows digest content whenever summary/quotes exist.
- Indexing failure is labeled as indexing/search readiness, not LLM enrichment failure.
- Android compact card layout remains stable.

### Substack Capture

- Substack note URLs are explicitly detected.
- Short and metadata-only Substack notes are covered by fixtures.
- Weak captures surface a repair/upgrade path.

### Production Safety

- Backup is created and restore-tested before mutation.
- App/worker is stopped or writes are otherwise blocked during repair.
- Repair script dry-run is reviewed before apply.
- Rollback path is documented and usable.
- Monitoring confirms no new `chunks_vec primary key` errors.

## Rollback Plan

### Code Rollback

1. Revert application deployment to the previous known-good commit.
2. Do not execute production data repair if allocator/backfill fixes are rolled back.
3. Preserve dry-run and QA reports for follow-up.

### Data Repair Rollback

If apply fails before commit:

1. Transaction should roll back automatically.
2. Keep worker/app stopped.
3. Run repair dry-run again.
4. Restore from backup if DB state is uncertain.

If apply commits but validation fails:

1. Stop worker/app.
2. Restore the restore-tested backup.
3. Re-run read-only consistency checks.
4. Keep incident open and investigate before retrying.

### UI Rollback

If UI regression appears:

1. Roll back UI-only changes if needed.
2. Keep data-integrity fixes deployed if they have passed validation.
3. Confirm item detail and library still load correctly.

## Risks And Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| sqlite-vec delete behavior differs in production | High | Test repair script on restored backup before production apply |
| Sequence initializes below existing vector max | High | Initialize from both `chunks_rowid` and `chunks_vec`; validate in dry-run |
| Worker writes during repair | High | Stop app/worker; require no-go if quiescence is not possible |
| Script resets too many items | High | Dry-run shows exact affected set; support `--item-id` narrow mode |
| Re-enrichment overwrites good summaries | Medium | Prefer embedding-only recovery for summary-bearing items |
| UI hides summaries because raw state is `error` | High | Gate digest on content existence, not only raw state |
| Substack notes remain weak after repair | Medium | Track as capture-quality follow-up with fixtures and repair hints |
| Backfill scripts drift from app allocator | Medium | Add preflights and tests; audit active allocation paths |

## Execution Order

1. Run adversarial review on this implementation plan.
2. Create V2 implementation plan incorporating review findings.
3. Implement Phase 1 allocator migration and tests.
4. Implement Phase 2 backfill/reset hardening.
5. Implement Phase 3 dry-run-first repair script.
6. Implement Phase 4 UI state separation.
7. Implement Phase 5 Substack note capture hardening.
8. Create Phase 6 production repair runbook.
9. Run Phase 7 QA.
10. Deploy code fixes.
11. Execute production repair runbook.
12. Validate production state and document evidence.

## Required Follow-Up Documents

Create these dated markdown files as execution progresses:

- adversarial review of this implementation plan;
- V2 implementation plan;
- production repair runbook;
- local QA report;
- production dry-run evidence report;
- production repair evidence report;
- post-repair validation report;
- Substack note capture follow-up PRD or implementation plan if it expands beyond fixture hardening.

## Final Go / No-Go Gates

### Go For Local Implementation

Allowed after:

- this plan is adversarial-reviewed;
- a reviewed V2 plan exists or review findings are explicitly accepted;
- branch and baseline evidence are ready.

### Go For Production Deployment

Allowed after:

- allocator migration passes tests;
- backfill scripts are patched;
- repair script dry-run works on a restored DB copy;
- UI state fix passes local QA;
- build succeeds.

### Go For Production Data Mutation

Allowed only after:

- production backup is created;
- backup restore test passes;
- app/worker is stopped;
- production dry-run report is reviewed;
- exact affected item list is approved;
- rollback path is ready.

### No-Go

Block execution if:

- repair still depends on manual SQL only;
- old max-only allocator remains in deployable code;
- any active reset path deletes vectors through implicit `chunks.rowid`;
- worker/app cannot be stopped;
- backup cannot be restored;
- dry-run finds unexpected integrity classes;
- UI still hides existing summaries for indexing-failed items.

## Final Notes

This plan treats the vector-index integrity issue as the production-blocking defect and the Substack note capture weakness as a related product-quality follow-up. The two should be validated together from the user's perspective, but production data repair must prioritize safe vector consistency, embedding recovery, and accurate UI state before broader capture-quality tuning.
