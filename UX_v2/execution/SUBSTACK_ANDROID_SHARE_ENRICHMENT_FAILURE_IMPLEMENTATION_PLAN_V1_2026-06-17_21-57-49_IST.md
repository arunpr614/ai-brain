# Substack Android Share Enrichment Failure Remediation - Implementation Plan V1

Created: 2026-06-17 21:57 IST
Author: Codex
Status: V1 implementation plan; requires adversarial review before production execution
Source RCA: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_RCA_REVISED_2026-06-17_21-49-13_IST.md`
Adversarial review source: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_RCA_ADVERSARIAL_REVIEW_2026-06-17_21-44-45_IST.md`
Scope: Repair the vector-index integrity bug that caused Android-shared Substack items to show `enrichment failed`, harden the code paths that can recreate it, fix misleading UI state, and define a safe production repair runbook.

## Executive Summary

The revised RCA confirms the direct failure: production has an orphan `chunks_vec` row at rowid `44`, while `chunks_rowid` only tracks rowids through `43`. New embedding writes allocate rowids from `MAX(chunks_rowid.rowid) + 1`, so new writes collide with the orphan vector row and fail with `UNIQUE constraint failed on chunks_vec primary key`.

This plan fixes the issue in six tracks:

1. Harden vector rowid allocation so future writes cannot collide with orphan vectors.
2. Patch backfill/reset scripts so they delete vectors through `chunks_rowid`, not implicit `chunks.rowid`.
3. Add a dry-run-first production repair script and runbook.
4. Recover affected items without re-enriching already-valid summaries.
5. Fix UI state so indexing failures are not shown as enrichment failures.
6. Add a follow-up path for weak Substack note captures and short-content enrichment schema failures.

Production repair remains blocked until the code fixes, dry-run report, backup/restore proof, and production no-go gates are satisfied.

## Implementation Verdict

Execution readiness: not ready for production mutation.
Local code implementation readiness: ready after adversarial review of this plan.
Production repair method: script-driven, dry-run first, worker stopped, backup restore-tested.
Primary success outcome: no orphan vectors, no missing vectors, no `chunks_vec primary key` errors, affected items become semantically indexed, and the UI no longer mislabels indexing failures as enrichment failures.

## Non-Negotiable Constraints

- Do not mutate production from ad hoc SQL pasted from the RCA.
- Do not run broad item re-enrichment if existing summaries/quotes/categories are valid.
- Do not leave the old rowid allocator deployable before reprocessing affected items.
- Do not patch only `scripts/backfill-embeddings-prod.mjs`; the local `scripts/backfill-embeddings.mjs` has the same unsafe delete shape.
- Do not mark the incident closed until item detail, library list, semantic retrieval, and production logs are validated.

## Files Expected To Change

### Core Vector Index

- `src/db/migrations/018_vector_rowid_sequence.sql`
- `src/db/chunks.ts`
- `src/db/chunks.test.ts`
- `src/lib/embed/pipeline.test.ts`
- `scripts/smoke-v0.4.0.mjs`

### Backfill And Repair

- `scripts/backfill-embeddings-prod.mjs`
- `scripts/backfill-embeddings.mjs`
- `scripts/repair-vector-index-consistency.mjs`
- `docs` or `UX_v2/execution` production repair runbook file

### UI And Status

- `src/lib/items/status.ts`
- `src/lib/items/status.test.ts`
- `src/app/api/items/[id]/enrichment-status/route.ts`
- `src/app/api/items/[id]/enrichment-status/route.test.ts`
- `src/components/enriching-pill.tsx`
- `src/components/item-enrichment-watch.tsx`
- `src/components/library-list.tsx`
- `src/app/items/[id]/page.tsx`

### Substack Capture And Enrichment Follow-Up

- `src/lib/capture/substack.ts`
- `src/lib/capture/substack.test.ts`
- `src/lib/enrich/prompts.ts`
- `src/lib/enrich/pipeline.test.ts` or equivalent enrichment validator tests

## Phase 0 - Safety And Baseline

### Goal

Freeze the known state, confirm affected paths, and create an evidence baseline before code changes or production repair.

### Tasks

1. Create or switch to a dedicated branch:

```text
codex/substack-android-enrichment-repair
```

2. Confirm current migration head:

```text
017_topics.sql
```

3. Capture baseline local checks:

```text
npm run typecheck
npm test
npm run smoke:0.4.0
```

4. Capture read-only production evidence into a dated local report:

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

5. Produce a read-only affected-item report:

```sql
SELECT i.id,
       i.title,
       i.source_platform,
       i.capture_source,
       i.capture_quality,
       i.enrichment_state,
       i.enriched_at,
       emb.state AS embedding_state,
       emb.attempts AS embedding_attempts,
       emb.last_error AS embedding_last_error,
       ej.state AS enrichment_job_state,
       ej.attempts AS enrichment_attempts,
       ej.last_error AS enrichment_last_error,
       (SELECT COUNT(*) FROM chunks c WHERE c.item_id = i.id) AS chunk_count
FROM items i
LEFT JOIN embedding_jobs emb ON emb.item_id = i.id
LEFT JOIN enrichment_jobs ej ON ej.item_id = i.id
WHERE i.summary IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM chunks c WHERE c.item_id = i.id)
ORDER BY i.captured_at;
```

### Exit Criteria

- Baseline results are saved in a dated QA/evidence file.
- No production mutation has occurred.
- Affected set is known before repair script design is finalized.

## Phase 1 - Durable Vector Rowid Allocation

### Goal

Replace the fragile `MAX(chunks_rowid.rowid) + 1` allocator with a sequence-backed allocator that is initialized from both `chunks_rowid` and `chunks_vec`.

### Design Decision

Use a SQLite sequence table instead of another `MAX(rowid) + 1` query. This makes the allocator robust against existing orphan vectors and avoids repeated max scans.

### Migration

Add `src/db/migrations/018_vector_rowid_sequence.sql`:

```sql
CREATE TABLE IF NOT EXISTS chunks_vec_rowid_sequence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_rowid INTEGER NOT NULL CHECK (next_rowid > 0)
);

INSERT INTO chunks_vec_rowid_sequence (id, next_rowid)
SELECT 1,
       COALESCE(
         (
           SELECT MAX(max_rowid) + 1
           FROM (
             SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_rowid
             UNION ALL
             SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_vec
           )
         ),
         1
       )
ON CONFLICT(id) DO UPDATE SET
  next_rowid = max(chunks_vec_rowid_sequence.next_rowid, excluded.next_rowid);
```

### Application Code

Update `src/db/chunks.ts`:

1. Add a private `allocateChunkVecRowid()` helper.
2. Ensure it must be called inside the caller's transaction.
3. Read `next_rowid`.
4. Increment the sequence.
5. Return the pre-increment value as `BigInt`.
6. Insert that value into `chunks_rowid`.

Expected shape:

```ts
function allocateChunkVecRowid(): bigint {
  const db = getDb();
  const row = db
    .prepare("SELECT next_rowid FROM chunks_vec_rowid_sequence WHERE id = 1")
    .get() as { next_rowid: number | bigint } | undefined;
  if (!row) throw new Error("chunks_vec_rowid_sequence is not initialized");
  db.prepare(
    "UPDATE chunks_vec_rowid_sequence SET next_rowid = next_rowid + 1 WHERE id = 1",
  ).run();
  return BigInt(row.next_rowid);
}
```

### Tests

Add or update tests in `src/db/chunks.test.ts`:

1. Migration creates `chunks_vec_rowid_sequence`.
2. Sequence initializes to `MAX(chunks_rowid, chunks_vec) + 1`.
3. Existing orphan vector row above `chunks_rowid` does not cause the next allocation to collide.
4. Multiple chunk inserts in one transaction allocate monotonically increasing rowids.
5. Transaction rollback also rolls back sequence increments.

Add or update tests in `src/lib/embed/pipeline.test.ts`:

1. Embedding succeeds when `chunks_vec` has a pre-existing orphan row above `chunks_rowid`.
2. Retry-exhaust still marks `embedding_jobs.state='error'` for genuine provider failures.

### Exit Criteria

- New sequence migration passes from an empty DB and from an existing DB.
- `insertChunkWithRowid()` no longer queries `MAX(rowid)` from `chunks_rowid`.
- Local tests prove orphan-vector tolerance.

## Phase 2 - Patch Backfill And Reset Paths

### Goal

Remove every known reset path that can leave orphan vectors behind.

### Production Backfill Script

Update `scripts/backfill-embeddings-prod.mjs`:

1. Replace unsafe delete:

```js
DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)
```

with bridge-based delete:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT r.rowid
  FROM chunks_rowid r
  JOIN chunks c ON c.id = r.chunk_id
  WHERE c.item_id = ?
);
```

2. Ensure chunk deletion cascades `chunks_rowid`:

```sql
DELETE FROM chunks WHERE item_id = ?;
```

3. Replace `SELECT COALESCE(MAX(rowid), 0) + 1 FROM chunks_rowid` with sequence allocation from `chunks_vec_rowid_sequence`.
4. Add a preflight that fails if `chunks_vec_rowid_sequence` is missing.
5. Add a preflight consistency check that blocks writes if orphan vectors exist and the run is not explicitly in repair mode.

### Local Backfill Script

Update `scripts/backfill-embeddings.mjs`:

1. Replace unsafe reset delete with bridge-based delete.
2. Keep local reset behavior aligned with the production script.
3. Add a small consistency log before and after reset.

### Script Safety

All broad write modes must retain or add:

- `--dry-run` support.
- `--confirm` for broad production changes.
- clear target count before mutation.
- non-zero exit on failed preflight.

### Tests

Add script-level tests where practical, or factor bridge-delete SQL into a small testable helper. Minimum coverage:

1. Reset deletion removes the correct `chunks_vec` rows through `chunks_rowid`.
2. Reset deletion does not depend on implicit `chunks.rowid`.
3. Re-running reset is idempotent.
4. Sequence allocation continues above both bridge and vector max rowids.

### Exit Criteria

- Both backfill scripts use bridge-based vector deletion.
- Production backfill script uses the sequence allocator.
- No `rg "DELETE FROM chunks_vec WHERE rowid IN \\(SELECT rowid FROM chunks"` matches remain.
- No `rg "MAX\\(rowid\\).*chunks_rowid"` allocation remains outside migrations/tests/diagnostics.

## Phase 3 - Production Repair Script

### Goal

Create a dry-run-first repair script that can safely remove orphan vectors, repair sequence state, and prepare affected items for embedding-only recovery.

### New Script

Create:

```text
scripts/repair-vector-index-consistency.mjs
```

### CLI Contract

Supported flags:

```text
--db-path <path>             defaults to BRAIN_DB_PATH or data/brain.sqlite
--dry-run                   default mode; performs no mutation
--apply                     enables mutation
--confirm <phrase>          required with --apply
--item-id <id>              optional narrow recovery
--include-all-affected      includes all affected items found by impact query
--json                      prints machine-readable report
--output <path>             writes report JSON/markdown to file
```

Required confirm phrase:

```text
repair vector index consistency
```

### Dry-Run Report

The dry-run report must include:

- DB path.
- sqlite-vec load status.
- counts for `chunks`, `chunks_rowid`, `chunks_vec`.
- `max(chunks_rowid.rowid)`.
- `max(chunks_vec.rowid)`.
- orphan vector rowids.
- rowids missing vectors.
- rowids missing chunks.
- current sequence `next_rowid`, if present.
- recommended sequence `next_rowid`.
- affected items with summaries but no chunks.
- affected enrichment jobs with `chunks_vec` errors.
- affected embedding jobs in `error`, `running`, or stale `pending`.
- exact mutation plan that would run in `--apply`.

### Apply Behavior

Apply mode must:

1. Refuse to run without `--confirm`.
2. Refuse to run if DB backup marker is not supplied or explicitly acknowledged.
3. Use `BEGIN IMMEDIATE`.
4. Delete orphan vector rows.
5. Initialize or bump `chunks_vec_rowid_sequence.next_rowid` to above both bridge and vector max rowids.
6. Reset affected `embedding_jobs` to `pending` with zero attempts.
7. Set `items.enrichment_state='done'` only for items where enrichment output exists and only indexing failed.
8. Preserve `summary`, `quotes`, `category`, `title`, and capture fields.
9. Commit.
10. Re-run the dry-run report after mutation and print before/after counts.

### Draft Repair SQL

Orphan delete:

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

Embedding job reset for valid enriched items:

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

- Dry-run can be run locally against a copied DB without mutation.
- Apply mode is guarded and transactional.
- Repair script emits enough evidence to attach to QA.

## Phase 4 - UI And Processing State Fix

### Goal

Stop showing `enrichment failed` when enrichment succeeded and semantic indexing failed.

### Current Problem

The UI mostly reflects `items.enrichment_state`. In this incident, summaries exist, but `enrichment_state='error'`, so:

- Library shows `enrichment failed`.
- Item detail can hide summary/quotes because digest display is gated on `enrichment_state === 'done'`.

### Processing Model

Use a richer processing state:

```text
saved
enrichment_pending
enrichment_running
summary_ready
semantic_indexing_pending
semantic_indexing_failed
semantic_indexing_ready
not_applicable
```

Implementation can either extend `src/lib/items/status.ts` or add a thin API-facing wrapper that reuses it.

### API Changes

Update `src/app/api/items/[id]/enrichment-status/route.ts` to include:

```json
{
  "state": "error",
  "processing_state": "semantic_indexing_failed",
  "processing_label": "Semantic indexing failed",
  "has_summary": true,
  "has_quotes": true,
  "embedding_state": "error",
  "chunk_count": 0,
  "last_error": "UNIQUE constraint failed on chunks_vec primary key"
}
```

Keep backward compatibility for existing `state`, `batch_id`, `last_error`, `updated_at`, and `attempts`.

### Component Changes

Update `src/components/enriching-pill.tsx`:

- If `processing_state === semantic_indexing_failed`, show:

```text
indexing failed
```

- If summary exists but indexing is pending, show:

```text
summary ready
```

or:

```text
indexing pending
```

- Only show `enrichment failed` when enrichment content is absent and the enrichment job truly failed.

Update `src/components/item-enrichment-watch.tsx`:

- Accept initial processing status or fetch it from the status endpoint.
- Refresh when either enrichment completes or indexing state changes.

Update `src/components/library-list.tsx`:

- Prefer processing status over raw `enrichment_state` for the badge.
- Preserve compact layout on Android and desktop.

Update `src/app/items/[id]/page.tsx`:

- Change digest visibility from:

```text
item.enrichment_state === "done" && (summary or quotes)
```

to:

```text
summary or quotes exists
```

- If summary exists but indexing failed, display the digest and show a separate indexing status.
- Update placeholder copy so indexing failures do not say provider/enrichment failed.

### Tests

Add or update:

- `src/lib/items/status.test.ts`
  - summary exists + embedding error -> `semantic_indexing_failed`
  - summary exists + no chunks + embedding pending -> `semantic_indexing_pending`
  - summary absent + enrichment error -> enrichment failure class

- `src/app/api/items/[id]/enrichment-status/route.test.ts`
  - response includes processing state and backward-compatible fields

- component tests if available; otherwise add manual QA screenshots to QA report.

### Exit Criteria

- A summary-bearing item with failed embedding no longer displays `enrichment failed`.
- Item detail displays existing summary and quotes even if semantic indexing failed.
- Library list remains compact and readable on Android.

## Phase 5 - Substack Note Capture Quality Follow-Up

### Goal

Handle the separate quality issue where Substack `note/c-...` URLs may produce short or metadata-only captures.

### Design

Do not block vector repair on this track. Treat it as a related hardening track with its own acceptance criteria.

### Capture Changes

Update `src/lib/capture/substack.ts` to detect Substack note URLs:

```text
substack.com/@.../note/c-...
```

Add metadata in `metadata_json`:

```json
{
  "substack_kind": "note",
  "body_source": "metadata",
  "paywall_signal": false
}
```

Decide and implement one of these policies:

1. Conservative: keep `full_text` for short notes if the body is real note text, but surface a clearer UI hint when total chars are low.
2. Stricter: classify Substack notes below a higher threshold as `metadata_only` or `paywall_preview`.
3. Repair-first: mark short Substack notes as `needs_upgrade` and route to Add Text.

Recommended V1 policy:

- Keep existing capture quality behavior for now to avoid overcorrecting.
- Add detection and fixture coverage for Substack notes.
- Add a `needsUpgradeReason` hint for `metadata_only` Substack notes.

### Enrichment Schema Hardening

Update enrichment validation behavior for short or metadata-only captures:

- If body is too short to produce quotes, allow `quotes: []` only under a short-content path, or
- normalize common quote object outputs to strings if safe, or
- use a short-content prompt that asks for fewer or zero quotes.

Recommended V1 policy:

- Add validator tests first.
- Do not relax quote requirements globally until a short-content branch is explicit.

### Tests

Add to `src/lib/capture/substack.test.ts`:

- Substack note URL with real short body.
- Substack note URL with metadata only.
- Substack note URL with RSS fallback.

Add enrichment validation tests:

- metadata-only item does not burn retries on predictable quote absence.
- short-content prompt still returns valid JSON.

### Exit Criteria

- Substack note behavior is documented and covered by tests.
- Weak Substack captures are surfaced as repairable, not confused with vector-indexing failures.

## Phase 6 - Production Repair Runbook

### Goal

Create an operator-safe runbook before mutating production.

### New Runbook File

Create:

```text
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_PRODUCTION_REPAIR_RUNBOOK_YYYY-MM-DD_HH-MM-SS_IST.md
```

### Required Runbook Sections

1. Scope and owner.
2. Production host and app directory confirmation.
3. Git commit deployed.
4. Production DB path confirmation.
5. Worker/app stop command.
6. Backup command.
7. Backup restore-test command.
8. Dry-run command.
9. Dry-run expected output.
10. Apply command.
11. Post-apply consistency command.
12. Re-embedding/requeue command.
13. Worker/app restart command.
14. Monitoring command.
15. Rollback command.
16. User-facing validation checklist.

### No-Go Gates

The runbook must block execution if:

- backup cannot be created;
- backup cannot be restored to a temp path;
- worker/app cannot be stopped;
- dry-run finds more orphan classes than expected and they are not reviewed;
- repair script reports unknown mutation scope;
- deployed code does not include the allocator/backfill fixes;
- post-apply checks are not defined.

### Expected Production Sequence

1. Deploy code fixes.
2. Stop app/worker.
3. Create DB backup.
4. Restore-test backup to a temp DB.
5. Run repair script in dry-run mode against production DB.
6. Review dry-run output.
7. Run repair script with `--apply --confirm`.
8. Run post-repair dry-run.
9. Start app/worker.
10. Re-embed affected items.
11. Monitor logs and UI.

### Exit Criteria

- Runbook exists and references exact script commands.
- Runbook has been reviewed before production mutation.
- Production repair does not rely on manual SQL.

## Phase 7 - QA And Release Validation

### Local Automated Validation

Run:

```text
npm run typecheck
npm test
npm run smoke:0.4.0
npm run build
```

Add targeted test commands in QA report:

```text
node --import tsx --test src/db/chunks.test.ts
node --import tsx --test src/lib/embed/pipeline.test.ts
node --import tsx --test src/lib/items/status.test.ts
node --import tsx --test src/lib/capture/substack.test.ts
```

### Manual UI QA

Validate on desktop and Android-sized viewport:

- Library item with enrichment failure only.
- Library item with summary ready and indexing failed.
- Library item with semantic indexing pending.
- Item detail with summary and quotes while embedding is failed.
- Item detail after successful re-indexing.

Expected screenshots:

- Android Library row before fix, using fixture.
- Android Library row after fix, showing indexing-specific label.
- Item detail showing digest even when indexing failed.
- Item detail after indexing ready.

### Production Validation

After production repair:

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

Validate the two known Substack items:

- `f35c579f2f22e9444c09ad8f`
- `e8e707e2b5897b649e8e2f01`

For each:

- summary/quotes visible;
- no misleading `enrichment failed` badge;
- chunks exist after embedding recovery;
- semantic search or Ask retrieval can cite the item;
- no new `UNIQUE constraint failed on chunks_vec primary key` logs appear.

## Detailed Task Breakdown

| ID | Track | Task | Files | Exit Criteria |
| --- | --- | --- | --- | --- |
| T0.1 | Baseline | Capture local baseline test status | QA report | Typecheck/test/smoke baseline recorded |
| T0.2 | Baseline | Capture read-only production vector report | QA report | Counts and affected set recorded |
| T1.1 | Vector | Add sequence migration | `018_vector_rowid_sequence.sql` | Migration initializes from bridge and vector max |
| T1.2 | Vector | Replace allocator in app code | `src/db/chunks.ts` | No max-only allocator remains |
| T1.3 | Vector | Add orphan-vector allocator tests | `src/db/chunks.test.ts` | Orphan vector above bridge no longer collides |
| T1.4 | Vector | Add embed pipeline regression test | `src/lib/embed/pipeline.test.ts` | Embedding succeeds with orphan vector present |
| T2.1 | Backfill | Patch production reset delete | `scripts/backfill-embeddings-prod.mjs` | Deletes through `chunks_rowid` |
| T2.2 | Backfill | Patch production allocation | `scripts/backfill-embeddings-prod.mjs` | Uses sequence allocation |
| T2.3 | Backfill | Patch local reset delete | `scripts/backfill-embeddings.mjs` | Deletes through `chunks_rowid` |
| T2.4 | Backfill | Add reset tests or helper tests | test/helper files | Reset is idempotent and bridge-based |
| T3.1 | Repair | Create repair script dry-run | `scripts/repair-vector-index-consistency.mjs` | Prints full report without mutation |
| T3.2 | Repair | Add guarded apply mode | repair script | Requires confirm phrase and transaction |
| T3.3 | Repair | Add item recovery logic | repair script | Resets embedding jobs without wiping summaries |
| T4.1 | UI | Extend processing status model | `src/lib/items/status.ts` | Semantic indexing failure distinct |
| T4.2 | UI | Extend status API | enrichment-status route | Backward compatible response |
| T4.3 | UI | Update Library pill | `enriching-pill.tsx`, `library-list.tsx` | No false `enrichment failed` label |
| T4.4 | UI | Update item detail digest gating | `src/app/items/[id]/page.tsx` | Existing digest renders even if indexing failed |
| T5.1 | Substack | Add note fixtures | `src/lib/capture/substack.test.ts` | Note URL behavior covered |
| T5.2 | Substack | Add short-content enrichment tests | enrich tests | Quote-schema issue reproducible or fixed |
| T6.1 | Runbook | Create production repair runbook | `UX_v2/execution/...RUNBOOK...md` | Exact commands and rollback present |
| T7.1 | QA | Run automated tests | QA report | All required commands recorded |
| T7.2 | QA | Run UI QA | QA report/screenshots | Desktop and Android states verified |
| T7.3 | Release | Deploy and repair production | runbook evidence | Post-repair consistency green |

## Acceptance Criteria

### Data Integrity

- `chunks_vec` has no rowids missing from `chunks_rowid`.
- `chunks_rowid` has no rowids missing from `chunks_vec` for vectorized chunks.
- `chunks_rowid` has no chunk IDs missing from `chunks`.
- Rowid allocation continues above both current bridge and vector max rowids.
- Re-running backfill/reset cannot create a new orphan vector.

### Affected Item Recovery

- Known affected Substack items are not stuck in `enrichment_state='error'` when summaries exist.
- Existing summaries/quotes/categories are preserved.
- Embedding jobs are reset and complete successfully.
- Chunks and vectors exist after recovery.
- Ask/search can retrieve affected items.

### UI

- Library no longer shows `enrichment failed` for summary-ready items whose only failure is semantic indexing.
- Item detail shows digest content whenever summary/quotes exist.
- Indexing failure is clearly labeled as indexing/search readiness, not LLM enrichment failure.

### Production Safety

- Backup is created and restore-tested before mutation.
- Worker/app is stopped or embedding writes are otherwise blocked during repair.
- Repair script dry-run output is reviewed before apply.
- Rollback path is documented and usable.
- Monitoring confirms no new `chunks_vec primary key` errors.

## Rollback Plan

### Code Rollback

If code deployment fails:

1. Revert application deployment to previous known-good commit.
2. Do not run production repair.
3. Preserve dry-run reports for follow-up.

### Data Repair Rollback

If production repair apply fails before commit:

1. Transaction should roll back automatically.
2. Keep worker stopped.
3. Run dry-run report again.
4. Restore backup if DB state is uncertain.

If production repair succeeds but post-checks fail:

1. Stop worker/app again.
2. Restore DB backup.
3. Re-run dry-run against restored DB.
4. Keep incident open and do not reprocess items.

### UI Rollback

If UI state regression appears:

1. Roll back UI commit while keeping data-integrity code fixes deployed if safe.
2. Confirm item detail still loads.
3. Keep repair script disabled until UI copy/state is corrected if user-facing confusion is unacceptable.

## Risks And Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| sqlite-vec delete behavior differs in production | High | Test repair script against restored production backup before apply |
| Sequence migration initializes below existing vector max | High | Migration and repair script both compute from `chunks_rowid` and `chunks_vec` |
| Backfill script duplicates app allocator incorrectly | High | Add explicit sequence allocation in prod script and tests |
| UI hides summaries because state is still `error` | High | Change item detail digest gating to content existence |
| Re-enrichment overwrites useful summaries | Medium | Prefer embedding-only recovery for summary-bearing items |
| Substack note capture remains weak after vector repair | Medium | Track separately and surface as needs-upgrade/repairable |
| Production worker writes during repair | High | Stop app/worker before repair; no-go if cannot stop |
| Impact set misses non-`chunks_vec` failures | Medium | Use broad affected-item queries, not only last_error filter |

## Execution Order

1. Adversarial-review this V1 implementation plan.
2. Create V2 implementation plan with review findings incorporated.
3. Implement Phase 1 and Phase 2 code fixes.
4. Implement Phase 3 repair script.
5. Implement Phase 4 UI state fixes.
6. Implement Phase 5 tests/follow-up where low-risk.
7. Create Phase 6 production runbook.
8. Run Phase 7 QA locally.
9. Deploy code.
10. Execute production repair runbook.
11. Validate production and document evidence.

## Required Follow-Up Documents

Create these dated markdown files during execution:

- Adversarial review of this implementation plan.
- V2 implementation plan.
- Production repair runbook.
- Local QA report.
- Production repair evidence report.
- Post-repair validation report.
- Substack note capture follow-up PRD or implementation plan if it expands beyond fixture hardening.

## Final Go / No-Go Gates

### Go For Local Implementation

Allowed after:

- this plan passes adversarial review or a V2 plan is created;
- branch is prepared;
- baseline is captured.

### Go For Production Deployment

Allowed after:

- allocator and backfill fixes pass tests;
- repair script dry-run works on a restored DB copy;
- UI state fix passes local QA;
- build succeeds.

### Go For Production Data Mutation

Allowed only after:

- production backup is created;
- backup restore test passes;
- worker/app is stopped;
- production dry-run report is reviewed;
- exact affected item list is approved;
- rollback command is ready.

### No-Go

Block execution if any of these are true:

- orphan-vector repair is still manual SQL only;
- old allocator remains deployed;
- either backfill script still deletes through implicit `chunks.rowid`;
- production worker cannot be stopped;
- backup cannot be restored;
- dry-run reports unexpected orphan/missing-vector classes;
- UI still hides existing summaries for indexing-failed items.

## Final Notes

This plan intentionally separates the confirmed vector-index integrity issue from the separate Substack-note capture-quality issue. The production incident can be repaired without solving every Substack extraction limitation, but the user-facing experience is not fully complete until weak Substack note captures are labeled and repairable.

Do not use this V1 plan to mutate production directly. Use it as the basis for adversarial review, then execute from the reviewed V2 plan and production runbook.
