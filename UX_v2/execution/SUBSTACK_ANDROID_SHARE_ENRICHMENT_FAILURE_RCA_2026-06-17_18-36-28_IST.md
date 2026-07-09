# Substack Android Share Enrichment Failure RCA

Created: 2026-06-17 18:36 IST
Author: Codex
Status: RCA complete; no production data mutation performed during investigation
Scope: Two Substack links shared through Android native share that appeared in Library with `enrichment failed`

## Executive Summary

The two Substack items were captured successfully through Android native share. The failure shown in the UI is not primarily a Substack extraction failure and not an Android share-intent failure.

The root cause is a production vector index consistency bug: `chunks_vec` contains an orphan vector row at rowid `44`, while the bridge table `chunks_rowid` only knows rowids through `43`. New embedding writes allocate `MAX(chunks_rowid.rowid) + 1`, so each new item tries to insert vector rowid `44` and fails with:

```text
UNIQUE constraint failed on chunks_vec primary key
```

The enrichment LLM step did write summaries, quotes, and categories for both Substack items. The item was later marked `enrichment_state='error'` because the worker treats the post-enrichment embedding failure as an enrichment job failure.

## User-Visible Symptom

Screenshot showed two Library rows:

1. `How to Remember Everything You Read: A Guide to Memory Protocols`
   - Substack
   - via Android
   - Full text
   - `675 chars`
   - `enrichment failed`

2. `JP Morgan's Summer Reading List 2026 Book Selection`
   - Substack
   - via Android
   - Metadata only
   - `305 chars`
   - `enrichment failed`

## Production Rows Inspected

```text
Item id: f35c579f2f22e9444c09ad8f
Title: How to Remember Everything You Read: A Guide to Memory Protocols
Source URL: https://substack.com/@polymathinvestor/note/c-261699738
Source platform: substack
Capture source: android
Capture quality: full_text
Extraction method: substack_readability_metadata
Extraction version: capture-v0.7.5
Total chars/body length: 675
Captured: 2026-06-17 18:10:57 IST
Enrichment state: error
```

```text
Item id: e8e707e2b5897b649e8e2f01
Title: JP Morgan's Summer Reading List 2026 Book Selection
Source URL: https://substack.com/@richholmes/note/c-265508521
Source platform: substack
Capture source: android
Capture quality: metadata_only
Extraction method: substack_readability_metadata
Extraction version: capture-v0.7.5
Total chars/body length: 305
Captured: 2026-06-17 17:20:12 IST
Enrichment state: error
```

## Evidence

### Capture Artifacts Exist

Both items have production capture artifacts:

- `html_snapshot`
- `metadata_json`
- `write_status='ok'`
- no artifact write error

The first item had a `55,334` byte HTML snapshot. The second item had a `54,746` byte HTML snapshot.

### Enrichment Content Was Written

Both items have enrichment output in the `items` row:

```text
e8e707e2b5897b649e8e2f01
has_summary: true
summary_len: 1123
has_quotes: true
quotes_len: 203
category: Announcement
enriched_at: 2026-06-17 17:20:30 IST
```

```text
f35c579f2f22e9444c09ad8f
has_summary: true
summary_len: 790
has_quotes: true
quotes_len: 194
category: Blog Post
enriched_at: 2026-06-17 18:11:13 IST
```

This proves the LLM enrichment step did not wholly fail.

### Terminal Job Error

Both enrichment jobs ended with:

```text
UNIQUE constraint failed on chunks_vec primary key
```

Job details:

```text
f35c579f2f22e9444c09ad8f
state: error
attempts: 3
last_error: UNIQUE constraint failed on chunks_vec primary key
```

```text
e8e707e2b5897b649e8e2f01
state: error
attempts: 3
last_error: UNIQUE constraint failed on chunks_vec primary key
```

### Service Logs Show Enrichment Succeeded Before Embedding Failed

For item `f35c579f2f22e9444c09ad8f`, logs show:

```text
[enrich] job #85 item=f35c579f2f22e9444c09ad8f attempt=1
[enrich] job #85 DONE in 2751ms (attempts: 1)
[enrich] job #85 retry 1/3: UNIQUE constraint failed on chunks_vec primary key
...
[enrich] job #85 FAILED after 3 attempts: UNIQUE constraint failed on chunks_vec primary key
```

For item `e8e707e2b5897b649e8e2f01`, logs show:

```text
[enrich] job #84 retry 1/3: validation failed: quotes must be an array of strings
[enrich] job #84 item=e8e707e2b5897b649e8e2f01 attempt=2
[enrich] job #84 DONE in 3864ms (attempts: 1)
[enrich] job #84 retry 2/3: UNIQUE constraint failed on chunks_vec primary key
...
[enrich] job #84 FAILED after 3 attempts: UNIQUE constraint failed on chunks_vec primary key
```

The second item did have a first-attempt LLM schema validation issue, but the terminal failure was still the vector write collision.

### Vector Table Consistency Check

Production vector/bridge consistency:

```json
{
  "chunks": 43,
  "rowids": 43,
  "vecs": 44,
  "max_rowid": 43,
  "max_vec_rowid": 44,
  "rowids_missing_vec": 0,
  "orphan_vecs": 1
}
```

The orphan row is:

```json
[
  {
    "rowid": 44
  }
]
```

This is the direct cause of the collision.

## Scope Of Impact

The same vector collision is not isolated to Android or Substack.

Observed affected production window:

```text
first_failed: 2026-06-15 15:14:50 IST
last_failed: 2026-06-17 18:10:57 IST
failures: 18
```

The affected set includes Telegram, web, and Android captures across multiple platforms:

- generic_article via Telegram
- YouTube via Telegram
- LinkedIn via Telegram
- Substack via web
- Substack via Android

This means the two Substack shares are the latest visible instances of a broader embedding/indexing failure.

## Technical Root Cause

Current normal embedding path:

- `src/lib/queue/enrichment-worker.ts`
  - runs `enrichItem(job.item_id)`
  - marks `enrichment_jobs.state='done'`
  - then calls `embedItemWithRetry(job.item_id)`
  - if embedding throws, the catch path routes it into `handleFailure()`
  - `handleFailure()` marks `items.enrichment_state='error'`

- `src/lib/embed/pipeline.ts`
  - chunks the enriched item
  - calls the embedding provider
  - writes rows into `chunks`, `chunks_rowid`, and `chunks_vec`

- `src/db/chunks.ts`
  - allocates vector rowid using:

```sql
SELECT COALESCE(MAX(rowid), 0) + 1 AS next_rowid FROM chunks_rowid
```

This allocator only checks `chunks_rowid`. It does not check existing `chunks_vec` rowids. Because production has an orphan vector row at `chunks_vec.rowid=44`, the next allocation returns `44`, causing a primary-key collision.

## Likely Origin Of The Orphan Vector

The most likely source is an embedding reset/backfill path.

`scripts/backfill-embeddings-prod.mjs` contains this reset delete:

```js
db.prepare("DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)").run(itemId);
```

That query is wrong for this schema. `chunks_vec.rowid` maps through `chunks_rowid.rowid`, not the implicit `chunks.rowid`. Deleting vectors through `chunks.rowid` can miss real vector rows and leave orphaned `chunks_vec` entries.

Correct shape should be bridge-based, for example:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT r.rowid
  FROM chunks_rowid r
  JOIN chunks c ON c.id = r.chunk_id
  WHERE c.item_id = ?
);
```

The app repair path in `src/lib/repair/item-repair.ts` already uses the bridge table and is safer than the production backfill script.

## Why The UI Is Misleading

The UI reports `enrichment failed` because it reflects `items.enrichment_state='error'`.

In this incident, enrichment output exists. The failure is better described as:

- enrichment generated content successfully;
- indexing/embedding failed;
- item is not searchable/askable via vector retrieval yet;
- UI collapsed that state into `enrichment failed`.

This conflates two different lifecycle stages.

## Immediate Remediation Plan

1. Create a fresh production DB backup.
2. Delete orphan vector rows:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT v.rowid
  FROM chunks_vec v
  LEFT JOIN chunks_rowid r ON r.rowid = v.rowid
  WHERE r.rowid IS NULL
);
```

3. Patch rowid allocation so it considers both bridge and vector tables, or replace it with a durable sequence.

Safer interim allocator:

```sql
SELECT MAX(max_rowid) + 1 AS next_rowid
FROM (
  SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_rowid
  UNION ALL
  SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_vec
);
```

4. Patch `scripts/backfill-embeddings-prod.mjs` to delete vectors through `chunks_rowid`, not through `chunks.rowid`.
5. Add tests for orphan-vector recovery and backfill reset deletion.
6. Requeue or reprocess the 18 affected items.
7. Verify vector consistency after reprocessing:

```text
chunks == chunks_rowid == chunks_vec
orphan_vecs == 0
rowids_missing_vec == 0
```

## Product/UI Remediation Plan

1. Split item state into at least two user-visible concepts:
   - enrichment/content generation
   - indexing/search readiness

2. Avoid showing `enrichment failed` when:
   - `summary` exists,
   - `quotes` exists,
   - `category` exists,
   - but chunk/vector creation failed.

3. Suggested UI label for this class:

```text
indexing failed
```

or

```text
saved, indexing pending
```

4. Add a retry action or automatic repair path for indexing failures.

## Validation After Fix

Recommended post-fix checks:

```sql
SELECT
  (SELECT COUNT(*) FROM chunks) AS chunks,
  (SELECT COUNT(*) FROM chunks_rowid) AS rowids,
  (SELECT COUNT(*) FROM chunks_vec) AS vecs,
  (SELECT COUNT(*) FROM chunks_vec v LEFT JOIN chunks_rowid r ON r.rowid=v.rowid WHERE r.rowid IS NULL) AS orphan_vecs,
  (SELECT COUNT(*) FROM chunks_rowid r LEFT JOIN chunks_vec v ON v.rowid=r.rowid WHERE v.rowid IS NULL) AS rowids_missing_vec;
```

Expected:

```text
orphan_vecs = 0
rowids_missing_vec = 0
```

Then reprocess:

- `f35c579f2f22e9444c09ad8f`
- `e8e707e2b5897b649e8e2f01`
- all other items where `enrichment_jobs.last_error LIKE '%chunks_vec%'`

Final user-facing validation:

- both Substack rows no longer show `enrichment failed`;
- item detail pages show the generated summary/quotes;
- Ask/search can retrieve the items;
- no new `chunks_vec primary key` errors appear in `data/errors.jsonl` or service logs.

## Conclusion

The two Android-shared Substack links surfaced an existing production vector-index integrity issue. Capture succeeded, Substack extraction produced artifacts, and LLM enrichment content was written. The item state became `error` because the worker folded a post-enrichment embedding/indexing failure into the enrichment retry path.

The durable fix is to repair the orphan vector row, harden rowid allocation/deletion, reprocess the affected items, and split enrichment versus indexing state in the UI.
