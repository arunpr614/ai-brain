# Substack Android Share Enrichment Failure - Revised RCA Implementation Plan V2

Created: 2026-06-24 11:01:38 IST
Author: Codex
Status: Detailed implementation plan; requires adversarial review before production mutation
Source RCA: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_RCA_REVISED_2026-06-17_21-49-13_IST.md`
Prior implementation plan: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_IMPLEMENTATION_PLAN_V1_2026-06-17_21-57-49_IST.md`
Prior revised implementation plan: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_RCA_REVISED_IMPLEMENTATION_PLAN_2026-06-24_09-40-03_IST.md`
Scope: Fix the vector-index consistency bug that caused Android-shared Substack items to show `enrichment failed`, prevent recurrence, repair affected items safely, correct misleading UI state, and address Substack note capture-quality follow-up.

## Executive Summary

The revised RCA confirms that the two Android-shared Substack items were captured and enriched, but semantic indexing failed after enrichment because production has an orphan `chunks_vec` row at rowid `44`. The current vector allocator in `src/db/chunks.ts` chooses the next rowid from `MAX(chunks_rowid.rowid) + 1`; production has `chunks_rowid` max rowid `43`, so every new embedding write attempts to insert `chunks_vec.rowid = 44` and collides with the orphan vector row.

This plan executes the fix in eight controlled tracks:

1. Capture a read-only baseline and affected-item inventory.
2. Replace max-based vector rowid allocation with a durable sequence initialized from both `chunks_rowid` and `chunks_vec`.
3. Patch every backfill, reset, repair, and seed path that writes or deletes vectors.
4. Build a dry-run-first production repair script and runbook.
5. Recover affected items without overwriting already-valid summaries, quotes, categories, or titles.
6. Fix UI/product state so indexing failures are not shown as enrichment failures.
7. Add Substack note capture-quality and short-content enrichment hardening.
8. Validate locally, then deploy with production safety gates, monitoring, and rollback.

Production mutation is explicitly blocked until backup, restore test, worker quiescence, dry-run review, code deployment, and rollback steps are complete.

## Implementation Verdict

Local implementation: ready to begin after adversarial review of this plan.
Production code deployment: allowed only after local tests, migration tests, and smoke checks pass.
Production data repair: no-go until the production runbook gates are satisfied.
Incident closure: no-go until the two known Substack items and the broader affected set validate in Library, item detail, semantic retrieval, Ask, and logs.

## Primary Outcome

After execution:

- new embedding writes cannot collide with orphan vector rowids;
- reset/backfill scripts cannot recreate the orphan-vector condition;
- production has zero orphan vectors, zero bridge rows missing vectors, and zero bridge rows missing chunks;
- affected items with valid summaries are embedded without unnecessary re-enrichment;
- Library no longer shows `enrichment failed` when only semantic indexing failed;
- item detail shows available summaries/quotes even if semantic indexing is degraded;
- Substack note captures are classified and surfaced honestly.

## Current Repository Fit

The current repository has migrations through:

```text
src/db/migrations/020_recall_sync.sql
```

Therefore the vector sequence migration should use the next available migration number in this working tree:

```text
src/db/migrations/021_vector_rowid_sequence.sql
```

If this plan is executed from an older branch where migration `020` is absent, use the next available migration number in that branch and update every reference in this document before implementation.

Known relevant files in the current tree:

```text
src/db/chunks.ts
src/db/chunks.test.ts
src/db/chunks.test.setup.ts
src/db/migrations/005_vector_index.sql
src/db/migrations/006_embedding_jobs.sql
src/lib/embed/pipeline.ts
src/lib/embed/pipeline.test.ts
src/lib/items/status.ts
src/lib/items/status.test.ts
src/app/api/items/[id]/enrichment-status/route.ts
src/app/api/items/[id]/enrichment-status/route.test.ts
src/components/enriching-pill.tsx
src/components/item-enrichment-watch.tsx
src/components/library-list.tsx
src/app/items/[id]/page.tsx
src/lib/capture/substack.ts
src/lib/capture/substack.test.ts
src/lib/queue/enrichment-worker.ts
src/lib/queue/enrichment-batch.ts
src/lib/repair/item-repair.ts
src/lib/repair/item-repair.test.ts
scripts/backfill-embeddings-prod.mjs
scripts/backfill-embeddings.mjs
scripts/smoke-v0.4.0.mjs
scripts/ux-v2-seed-android-a3-ask-item-detail.ts
```

## Non-Negotiable Constraints

- Do not run production repair SQL manually from the RCA.
- Do not mutate production before a fresh backup exists and has been restore-tested.
- Do not repair while the app, worker, or any backfill process can write to `chunks_vec`.
- Do not re-enrich items that already have valid summaries, quotes, categories, and titles unless validation proves the enrichment content is invalid.
- Do not delete summaries, quotes, categories, titles, capture metadata, source URLs, or HTML snapshots during vector repair.
- Do not use count equality as the primary integrity check; use referential checks.
- Do not label the incident fixed until UI state, item detail, semantic retrieval, Ask citations, and logs are validated.
- Do not ship UI copy that hides a degraded state; "summary ready, indexing failed" is acceptable, while generic "enrichment failed" is not.

## Workstream Ownership

| Role | Responsibility |
| --- | --- |
| Product Manager | Validate user-facing states, acceptance criteria, and recovery priority for affected items. |
| Technical Architect | Approve schema, allocator, transaction, repair-script, and rollback design. |
| Project Manager | Track milestones, gates, evidence artifacts, review status, and deployment readiness. |
| QA | Own test matrix, local validation, production smoke, screenshots, log checks, and regression sign-off. |
| Implementation Engineer | Make code changes, write tests, produce repair script and runbook, and execute approved deployment steps. |

## Milestone Plan

| Milestone | Name | Production Mutation? | Exit Criteria |
| --- | --- | --- | --- |
| M0 | Baseline and audit | No | Evidence files created, affected set inventoried, write/delete paths audited. |
| M1 | Allocator hardening | No | Migration and allocator tests pass; orphan row collision test passes. |
| M2 | Reset/backfill hardening | No | Unsafe vector deletes removed; script tests or smoke checks prove bridge deletes. |
| M3 | Repair script and runbook | No by default | Dry-run script produces reviewable report and rollback instructions. |
| M4 | UI state fix | No | Library and item detail represent indexing failure separately from enrichment failure. |
| M5 | Substack capture hardening | No | Substack note fixtures and short-content enrichment behavior are covered. |
| M6 | Local QA | No | Typecheck, lint, targeted tests, and smoke checks pass. |
| M7 | Production deploy | Code only | Migration and code deployed; no data repair yet unless gates pass. |
| M8 | Production repair | Yes, gated | Backup/restore proof, worker stopped, dry-run approved, repair executed, validation passed. |

## Phase 0 - Baseline, Branch, And Evidence

### Goal

Create a precise, read-only baseline before code changes or production repair. This protects against repairing the wrong dataset and gives QA a before/after comparison.

### Tasks

| ID | Task | Owner | Output |
| --- | --- | --- | --- |
| P0.1 | Create or switch to `codex/substack-android-enrichment-repair` | Implementation Engineer | Dedicated branch |
| P0.2 | Record git status, current commit, current migration head, Node version, package-manager state | Project Manager | Baseline note |
| P0.3 | Run local baseline checks: typecheck, targeted tests, and current smoke scripts | QA | Baseline QA result |
| P0.4 | Run read-only vector consistency query against production | Implementation Engineer | Dated evidence file |
| P0.5 | Run affected-item inventory queries | Implementation Engineer | Dated affected-item report |
| P0.6 | Audit every path that writes/deletes `chunks`, `chunks_rowid`, `chunks_vec`, or `embedding_jobs` | Technical Architect | Audit table |
| P0.7 | Confirm whether `scripts/backfill-embeddings-prod.mjs` ran near the incident window | Project Manager | Origin evidence note |

### Read-Only Vector Consistency Query

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

### Affected-Item Inventory

Use at least three read-only queries.

Items with summaries but no chunks:

```sql
SELECT i.id,
       i.title,
       i.source_url,
       i.source_platform,
       i.capture_source,
       i.capture_quality,
       i.extraction_method,
       i.enrichment_state,
       i.enriched_at,
       ej.state AS enrichment_job_state,
       ej.attempts AS enrichment_attempts,
       ej.last_error AS enrichment_last_error,
       emb.state AS embedding_state,
       emb.attempts AS embedding_attempts,
       emb.last_error AS embedding_last_error,
       (SELECT COUNT(*) FROM chunks c WHERE c.item_id = i.id) AS chunk_count
FROM items i
LEFT JOIN enrichment_jobs ej ON ej.item_id = i.id
LEFT JOIN embedding_jobs emb ON emb.item_id = i.id
WHERE i.summary IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM chunks c WHERE c.item_id = i.id)
ORDER BY i.captured_at;
```

Known vector primary-key failures:

```sql
SELECT i.id,
       i.title,
       i.source_platform,
       i.capture_source,
       i.capture_quality,
       i.enrichment_state,
       ej.state AS enrichment_job_state,
       ej.attempts,
       ej.last_error,
       i.captured_at,
       i.enriched_at
FROM enrichment_jobs ej
JOIN items i ON i.id = ej.item_id
WHERE ej.last_error LIKE '%chunks_vec%'
   OR ej.last_error LIKE '%UNIQUE constraint failed%'
ORDER BY i.captured_at;
```

Embedding jobs that are stale, failed, or inconsistent:

```sql
SELECT i.id,
       i.title,
       i.enrichment_state,
       emb.state,
       emb.attempts,
       emb.last_error,
       emb.created_at,
       emb.completed_at,
       (SELECT COUNT(*) FROM chunks c WHERE c.item_id = i.id) AS chunk_count
FROM embedding_jobs emb
JOIN items i ON i.id = emb.item_id
WHERE emb.state IN ('pending', 'running', 'error')
   OR (emb.state = 'done' AND NOT EXISTS (SELECT 1 FROM chunks c WHERE c.item_id = i.id))
ORDER BY emb.created_at;
```

### Exit Criteria

- No production mutation has occurred.
- The affected-item set is saved in a dated evidence artifact.
- The known Substack items are included in the affected-item inventory.
- The origin of the orphan vector is either confirmed or explicitly left as an open hypothesis.
- The write/delete path audit is complete enough for the technical architect to approve Phase 1.

## Phase 1 - Durable Vector Rowid Sequence

### Goal

Eliminate vector rowid collisions caused by orphan rows or stale bridge state.

### Design

Add a sequence table that tracks the next vector rowid independently from `chunks_rowid` and initializes from both `chunks_rowid` and `chunks_vec`.

Use the current tree's next migration number:

```text
src/db/migrations/021_vector_rowid_sequence.sql
```

### Migration Shape

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

### Application Changes

Update `src/db/chunks.ts`:

1. Add `allocateChunkVecRowid()` as an internal helper.
2. Require allocation inside the same transaction as chunk, bridge, and vector insertion.
3. Read `next_rowid` from `chunks_vec_rowid_sequence`.
4. Increment `next_rowid` before returning.
5. Return the pre-increment value as `BigInt`.
6. Insert the allocated rowid into `chunks_rowid`.
7. Remove the current allocator:

```sql
SELECT COALESCE(MAX(rowid), 0) + 1 AS next_rowid FROM chunks_rowid
```

Expected helper shape:

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

Add or update tests in `src/db/chunks.test.ts`:

- migration `021` creates `chunks_vec_rowid_sequence`;
- sequence initializes to one above both bridge and vector max rowids;
- sequence does not move backwards if migration is re-run;
- allocator skips an orphan vector row above `chunks_rowid`;
- multiple inserts allocate monotonically increasing rowids;
- transaction rollback rolls back sequence increments;
- a missing sequence row fails loudly with a useful error.

Add or update tests in `src/lib/embed/pipeline.test.ts`:

- embedding succeeds when `chunks_vec` contains a pre-existing orphan row above `chunks_rowid`;
- genuine provider failure still marks `embedding_jobs.state='error'`;
- vector insertion failure is still surfaced and logged when the virtual table rejects data for a real reason.

### Exit Criteria

- No production code path allocates vector rowids from only `chunks_rowid`.
- Migration works on empty test databases and existing migrated databases.
- Tests prove this incident class cannot recur from a single orphan vector above the bridge.

## Phase 2 - Patch Backfill, Reset, Repair, And Seed Paths

### Goal

Remove every known local or production path that can create, preserve, or hide orphan vectors.

### Files To Audit And Patch

```text
scripts/backfill-embeddings-prod.mjs
scripts/backfill-embeddings.mjs
src/lib/repair/item-repair.ts
src/lib/repair/item-repair.test.ts
scripts/ux-v2-seed-android-a3-ask-item-detail.ts
scripts/smoke-v0.4.0.mjs
src/lib/embed/pipeline.ts
```

### Required Delete Shape

All item-scoped vector deletes must use the bridge:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT r.rowid
  FROM chunks_rowid r
  JOIN chunks c ON c.id = r.chunk_id
  WHERE c.item_id = ?
);
```

The following unsafe shape must be removed everywhere:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?);
```

### Backfill Script Requirements

For both `scripts/backfill-embeddings-prod.mjs` and `scripts/backfill-embeddings.mjs`:

1. Delete vectors through `chunks_rowid`.
2. Delete `chunks_rowid` rows before deleting `chunks`.
3. Use the shared app embedding pipeline where practical, or duplicate the sequence allocator safely if script isolation requires it.
4. Add a startup preflight that checks `chunks_vec_rowid_sequence` exists.
5. Add a startup preflight that prints current orphan-vector and missing-vector counts.
6. Add `--dry-run` behavior if missing.
7. Make mutation require an explicit flag such as `--apply`.
8. Print the affected item IDs before mutation.
9. Exit non-zero if orphan vectors exist and the script is not explicitly running in repair/recovery mode.

### Seed And Smoke Script Requirements

Seed scripts that insert directly into `chunks_vec` must either:

- use a safe fixture-only rowid that cannot touch production;
- run only against a temp database;
- update the sequence table when inserting explicit rowids; or
- delegate to the same insertion helper used by production code.

### Tests

Add or update tests:

- reset deletes vectors through the bridge, not implicit `chunks.rowid`;
- reset removes `chunks`, `chunks_rowid`, and `chunks_vec` rows for a target item;
- reset does not delete another item's vectors;
- direct seed insertion keeps sequence state valid or is isolated to temp databases;
- backfill script dry-run prints target counts without mutation.

### Exit Criteria

- Repository search returns no unsafe item-scoped vector delete shape.
- Backfill/reset scripts cannot recreate the orphan-vector condition.
- Tests or smoke checks prove bridge-based deletion behavior.

## Phase 3 - Production Repair Script And Runbook

### Goal

Provide a repeatable, auditable, dry-run-first repair path instead of manual SQL.

### New Artifact

Create:

```text
scripts/repair-vector-index-consistency.mjs
```

Create a dated runbook in:

```text
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_PRODUCTION_REPAIR_RUNBOOK_<timestamp>_IST.md
```

### Script Modes

| Mode | Flag | Behavior |
| --- | --- | --- |
| Dry run | default or `--dry-run` | Read-only checks, planned orphan deletes, planned item recovery, no mutation. |
| Apply | `--apply --confirm-production-repair` | Runs approved repair under worker quiescence and backup proof gates. |
| Report | `--output <path>` | Writes JSON and/or markdown summary with before/after counts. |

### Required Script Inputs

```text
--db <path>
--dry-run
--apply
--confirm-production-repair
--backup-proof <path>
--output <path>
--item-id <id>              optional scoped repair
--include-known-failures    include enrichment_jobs chunks_vec failures
--include-summary-no-chunks include summary-bearing items missing chunks
```

### Dry-Run Output

The dry run must report:

- database path;
- timestamp;
- git commit, if available;
- orphan vector rowids;
- `chunks_rowid` rows missing vectors;
- `chunks_rowid` rows missing chunks;
- current `chunks_vec_rowid_sequence.next_rowid`;
- recommended repaired sequence value;
- affected item IDs;
- affected item titles;
- whether each item has summary, quotes, category, body, source URL, and capture artifacts;
- proposed item state transition;
- proposed embedding job transition;
- exact SQL class that would run, without exposing private content in shared output.

### Apply Behavior

Apply mode must:

1. Refuse to run without `--confirm-production-repair`.
2. Refuse to run without `--backup-proof`.
3. Refuse to run if the app/worker quiescence marker is missing, unless explicitly overridden for local temp databases.
4. Open the database in a write transaction.
5. Delete orphan vectors only.
6. Repair the sequence to one above max rowid across bridge and vector tables.
7. Reset affected embedding jobs to `pending`.
8. Preserve existing summaries, quotes, categories, titles, source URLs, and capture metadata.
9. Set item display state according to the product-state decision in Phase 4.
10. Run post-repair integrity checks before commit if feasible; otherwise run immediately after commit and halt restart if failed.

### Transaction Safety

The implementation must verify sqlite-vec virtual-table delete behavior in the production runtime. If `DELETE FROM chunks_vec` cannot be safely wrapped in the same SQLite transaction as other updates, the runbook must switch to a validated staged repair sequence and document the resulting rollback limits.

### Rollback

Rollback must be backup-based for production data repair.

The runbook must include:

- backup path;
- restore command;
- service stop command;
- service restart command;
- validation query after restore;
- expected loss window if restore is used.

### Exit Criteria

- Dry run produces a reviewable report.
- Apply mode cannot run accidentally.
- Runbook has exact commands and rollback steps.
- QA and technical architect approve the dry-run output before production mutation.

## Phase 4 - Item Recovery Without Unnecessary Re-Enrichment

### Goal

Recover affected items by rebuilding semantic chunks/vectors while preserving already-valid enrichment output.

### Recovery Classification

Classify each affected item before mutation:

| Class | Condition | Action |
| --- | --- | --- |
| `summary_ready_indexing_failed` | Summary exists and chunks are missing or embedding failed | Preserve summary and reset embedding job. |
| `enrichment_invalid` | Summary missing or enrichment output invalid | Requeue enrichment. |
| `capture_weak_needs_upgrade` | Body is metadata-only or below quality threshold | Send to capture repair or needs-upgrade flow before enrichment. |
| `already_recovered` | Chunks exist and integrity passes | No mutation except clearing stale error UI if needed. |

### Known Substack Item Intent

For `f35c579f2f22e9444c09ad8f`:

- preserve title, summary, quotes, category, source URL, metadata, and snapshot;
- reset embedding job to pending;
- do not re-enrich unless schema validation shows the existing summary is unusable;
- after embedding, verify semantic retrieval and item detail digest.

For `e8e707e2b5897b649e8e2f01`:

- preserve title, summary, quotes, category, source URL, metadata, and snapshot;
- reset embedding job to pending only if content is acceptable for indexing;
- separately flag `metadata_only` capture-quality follow-up;
- do not hide the available summary solely because capture quality is weak.

### Draft State Transition

If keeping the current `items.enrichment_state` enum:

- set `items.enrichment_state='done'` when summary exists and only indexing failed;
- set or leave `embedding_jobs.state='pending'` for indexing recovery;
- let UI derive indexing status from `embedding_jobs`.

If introducing a richer processing-state model:

- avoid changing the existing `items.enrichment_state` check until all migrations and UI consumers are ready;
- add derived status in application code first;
- consider schema changes only after product review.

### Exit Criteria

- Affected items are not re-enriched unless necessary.
- Existing digest content remains available.
- Embedding jobs are ready to run after vector repair.
- QA can validate before/after state for each item.

## Phase 5 - UI And Product State Fix

### Goal

Stop telling the user enrichment failed when enrichment content exists and the failed stage is semantic indexing.

### Product Status Model

Implement or refine a derived status function in `src/lib/items/status.ts`.

Recommended derived states:

```text
saved
enrichment_pending
enrichment_running
enrichment_failed
summary_ready
semantic_indexing_pending
semantic_indexing_running
semantic_indexing_failed
semantic_indexing_ready
```

Do not necessarily add all states to the database enum. Prefer deriving them from:

- `items.enrichment_state`;
- presence of `items.summary`;
- presence of `items.quotes`;
- `embedding_jobs.state`;
- chunk count;
- retrieval/index readiness.

### UI Copy

Use clear, stage-specific labels:

| Condition | Label |
| --- | --- |
| Enrichment failed and no summary exists | `enrichment failed` |
| Summary exists, indexing failed | `summary ready, indexing failed` |
| Summary exists, indexing pending | `summary ready, indexing pending` |
| Summary exists, chunks/index ready | no failure badge or `ready` where useful |
| Capture metadata only | `needs better capture` or existing needs-upgrade language |

### Files To Update

```text
src/lib/items/status.ts
src/lib/items/status.test.ts
src/app/api/items/[id]/enrichment-status/route.ts
src/app/api/items/[id]/enrichment-status/route.test.ts
src/components/enriching-pill.tsx
src/components/item-enrichment-watch.tsx
src/components/library-list.tsx
src/app/items/[id]/page.tsx
```

### Item Detail Behavior

`src/app/items/[id]/page.tsx` must show available digest content when:

- `summary` exists;
- `quotes` exist;
- `category` exists;
- `enrichment_state='error'` only because indexing failed.

Avoid gating digest rendering solely on `enrichment_state='done'`.

### API Behavior

`src/app/api/items/[id]/enrichment-status/route.ts` should return enough state for the client to distinguish:

- enrichment lifecycle;
- embedding lifecycle;
- available digest content;
- index readiness;
- last error stage.

Recommended response additions:

```json
{
  "state": "done",
  "derivedStatus": "semantic_indexing_failed",
  "hasSummary": true,
  "hasQuotes": true,
  "embeddingState": "error",
  "chunkCount": 0,
  "lastErrorStage": "semantic_indexing"
}
```

### Tests

Add or update tests for:

- summary present plus embedding error maps to `semantic_indexing_failed`;
- no summary plus enrichment error maps to `enrichment_failed`;
- summary present plus pending embedding maps to `semantic_indexing_pending`;
- item detail renders digest when summary exists even if embedding failed;
- Library card does not display `enrichment failed` for summary-ready indexing failures;
- polling API returns derived status fields.

### Exit Criteria

- The two known Substack items will not show a misleading `enrichment failed` badge after recovery.
- Users can still see available summary/quotes if indexing is degraded.
- Ask/search degradation is represented separately from enrichment failure.

## Phase 6 - Substack Note Capture And Short-Content Hardening

### Goal

Address the separate capture-quality issues revealed by the incident.

### Problems To Solve

- One Substack note captured as `metadata_only` with about `305` chars.
- One Substack note captured as `full_text` with only about `675` chars.
- Android native share may provide `substack.com/@.../note/c-...` URLs rather than canonical long-form post URLs.
- Short or metadata-only content can trigger weak enrichment and quote-schema failures.

### Implementation Steps

1. Add fixtures for Substack note URLs in `src/lib/capture/substack.test.ts`.
2. Distinguish Substack notes from long-form Substack posts.
3. Add explicit extraction metadata:

```text
substack_kind: note | post | unknown
substack_note_id: <id when present>
canonical_post_url: <url when discoverable>
```

4. Revisit capture-quality classification:
   - `metadata_only` remains weak;
   - very short `full_text` captures should be marked with an extraction warning;
   - notes can be valid short content, but UI should not imply a rich article was captured.
5. Add a needs-upgrade or repair path for Substack notes when richer canonical content is discoverable.
6. Harden enrichment prompt/schema handling for short captures:
   - allow empty quote arrays when content is too short;
   - normalize non-array quote output when safe;
   - keep schema validation strict for genuinely malformed responses.

### Tests

- Substack note URL fixture extracts stable title, body, metadata, and source platform.
- Metadata-only Substack note receives a clear capture-quality state.
- Short full-text Substack note receives an extraction warning when appropriate.
- Short-content enrichment does not fail solely because no quote is available.
- Android shared Substack URL is preserved and canonical URL is attached only when proven.

### Exit Criteria

- Substack notes are no longer treated as ordinary long-form posts without signal.
- Users receive honest capture-quality feedback.
- Short captures do not waste retries due to repairable quote-schema output.

## Phase 7 - QA Matrix

### Local Automated Checks

Run:

```text
npm run typecheck
npm run lint
node --test src/db/chunks.test.ts
node --test src/lib/embed/pipeline.test.ts
node --test src/lib/items/status.test.ts
node --test src/app/api/items/[id]/enrichment-status/route.test.ts
node --test src/lib/repair/item-repair.test.ts
node --test src/lib/capture/substack.test.ts
node scripts/smoke-v0.4.0.mjs
```

If this repository's test runner requires `tsx` imports, use the repo's existing package scripts or the same invocation pattern used by nearby tests.

### Data Integrity Checks

After local repair-script dry run and after production repair:

```sql
SELECT
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

### Product QA

Validate:

- Library cards for both known Substack items;
- item detail digest section;
- item detail Ask entry point;
- semantic retrieval for each known item;
- at least one affected Telegram article;
- at least one affected YouTube item;
- at least one affected LinkedIn item;
- at least one Substack item shared from web;
- Android native share of a new Substack note after fix.

### Visual QA

Capture screenshots for:

- Library list before repair, if available;
- Library list after UI fix;
- item detail digest visible for a summary-ready item;
- indexing-failed label where a controlled fixture still has embedding failure;
- recovered item after semantic indexing succeeds.

### Log QA

Inspect:

- service logs for `chunks_vec primary key`;
- `data/errors.jsonl`;
- enrichment job table;
- embedding job table;
- repair-script output;
- deployment logs.

Expected:

- no new `UNIQUE constraint failed on chunks_vec primary key`;
- no new orphan vectors;
- no summary-ready item trapped behind generic enrichment-failed UI;
- failed indexing states are visible and actionable.

## Phase 8 - Deployment And Production Repair

### Deployment Sequence

1. Complete code changes locally.
2. Run full local QA.
3. Create PR with:
   - RCA link;
   - implementation plan link;
   - test evidence;
   - migration notes;
   - production runbook link.
4. Complete code review and adversarial review.
5. Deploy code and migration only.
6. Confirm production app starts and migration applied.
7. Run production repair script in dry-run mode.
8. Review dry-run output with Product, Technical Architect, Project Manager, and QA.
9. Stop app/worker.
10. Create fresh production DB backup.
11. Restore-test backup.
12. Run repair script in apply mode.
13. Run post-repair integrity checks.
14. Restart app/worker.
15. Requeue or process affected embedding jobs.
16. Monitor logs and UI.
17. Capture final QA report.

### Production No-Go Gates

Do not run apply mode until all are true:

- deployed code includes sequence allocator;
- deployed code includes patched reset/backfill deletes;
- deployed UI distinguishes indexing failure from enrichment failure;
- production backup exists;
- production backup restore has been tested;
- app/worker is stopped or guaranteed not to write vectors;
- dry-run report is reviewed and approved;
- affected-item recovery set is reviewed;
- rollback command is written and tested against backup copy;
- QA owner is available for post-repair validation.

### Rollback Plan

For code rollback:

- revert deployment to previous release if app startup, migration, or UI behavior fails before data repair.

For data repair rollback:

- stop app/worker;
- restore production DB backup;
- run integrity check;
- restart app/worker;
- document any captures lost between backup and restore.

Because data repair is backup-based, minimize the time between backup, repair, and validation.

## Acceptance Criteria

### Engineering

- `src/db/chunks.ts` no longer uses `MAX(chunks_rowid.rowid) + 1`.
- Migration `021_vector_rowid_sequence.sql` or branch-appropriate next migration exists and is tested.
- Backfill/reset scripts delete vectors through `chunks_rowid`.
- Repair script has dry-run and guarded apply modes.
- Tests cover orphan vector row above bridge max.
- Tests cover bridge-based delete.
- Typecheck and lint pass.

### Product

- Library does not show `enrichment failed` when summary content exists and only indexing failed.
- Item detail shows summary and quotes when available.
- Indexing failure has a distinct user-facing label.
- Metadata-only or weak Substack note captures are surfaced honestly.

### QA

- Both known Substack items are repaired or explicitly classified with a documented reason.
- Broader affected set is validated.
- No new vector primary-key errors are observed after repair.
- Referential integrity checks pass.
- Semantic retrieval can find recovered items.
- Ask can cite recovered items when scoped appropriately.

### Operations

- Production backup and restore proof are attached to final evidence.
- Repair dry-run and apply reports are saved.
- Rollback plan is documented.
- Monitoring window completes with no recurrence.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| sqlite-vec deletes do not behave transactionally as expected | Partial repair or rollback complexity | Validate on staging copy before production apply. |
| Migration number conflict with concurrent work | Failed migration or ordering bug | Use next available migration in execution branch and update docs before PR. |
| Backfill script still bypasses app allocator | Recurrence under manual maintenance | Patch scripts and add repository search gate. |
| UI derives state incorrectly | Misleading user labels persist | Add status unit tests and controlled fixture QA. |
| Re-enrichment overwrites good summaries | Data quality regression | Recovery script preserves summary-bearing items and only resets embeddings. |
| Substack note canonical URL is unavailable | Capture remains short | Surface honest capture quality and needs-upgrade path. |
| Repair affects active writers | New inconsistency during repair | Stop app/worker and require apply-mode quiescence gate. |

## Open Questions

1. Did `scripts/backfill-embeddings-prod.mjs` run near `2026-06-15 15:14:50 IST`, the first observed failure time?
2. Is production deployed from a branch with migrations through `020`, or does production currently stop at an older migration?
3. Should `summary_ready, indexing_failed` be a user-visible label or an internal state with a softer UI phrase?
4. Should metadata-only Substack notes be automatically routed into a capture repair queue?
5. Are there additional production scripts outside this repo that write to `chunks_vec` directly?
6. Does production use a single process for embedding writes, or can concurrent writers exist?
7. Is there a staging copy of production data where repair apply mode can be tested before live production?

## Evidence Artifacts To Create During Execution

```text
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_BASELINE_EVIDENCE_<timestamp>_IST.md
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_VECTOR_WRITE_AUDIT_<timestamp>_IST.md
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_REPAIR_DRY_RUN_<timestamp>_IST.md
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_PRODUCTION_REPAIR_RUNBOOK_<timestamp>_IST.md
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_LOCAL_QA_<timestamp>_IST.md
UX_v2/execution/SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_PRODUCTION_QA_<timestamp>_IST.md
```

## Recommended Execution Order

1. Send this plan through adversarial review.
2. Revise plan if review finds blockers.
3. Complete Phase 0 baseline and audit.
4. Implement Phase 1 allocator migration and tests.
5. Implement Phase 2 script hardening.
6. Implement Phase 3 dry-run repair script.
7. Implement Phase 4 recovery classification.
8. Implement Phase 5 UI state fix.
9. Implement Phase 6 Substack capture hardening.
10. Run Phase 7 local QA.
11. Prepare PR and deployment runbook.
12. Deploy code and migration.
13. Run dry-run production repair.
14. Execute production repair only after all no-go gates are cleared.
15. Complete final production QA and incident closure report.

## Done Definition

This work is done only when:

- code fixes are merged and deployed;
- production repair is executed under approved gates or explicitly deemed unnecessary by evidence;
- both known Substack items are validated;
- broader affected items are recovered or documented;
- no orphan vector rows remain;
- no new vector primary-key collisions occur;
- UI no longer mislabels indexing failures as enrichment failures;
- Substack note capture-quality follow-up has either shipped or has a tracked, approved follow-up PRD/plan;
- final QA and production evidence artifacts are saved.
