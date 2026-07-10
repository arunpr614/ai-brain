# Substack Android Share Enrichment Failure RCA - Revised

Created: 2026-06-17 21:49 IST
Author: Codex
Status: Revised after adversarial review; production mutation remains blocked until safety gates are satisfied
Original RCA: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_RCA_2026-06-17_18-36-28_IST.md`
Adversarial review: `SUBSTACK_ANDROID_SHARE_ENRICHMENT_FAILURE_RCA_ADVERSARIAL_REVIEW_2026-06-17_21-44-45_IST.md`
Scope: Two Substack links shared through Android native share that appeared in Library with `enrichment failed`

## Privacy Classification

This is a local/private RCA. It contains personal library item titles, internal item IDs, source URLs, timestamps, and production-state observations. If this report is copied into a shared issue, PR, Slack thread, or external handover, redact source URLs and item IDs unless explicitly approved.

## Executive Summary

The two Android-shared Substack items were saved successfully. The visible `enrichment failed` badge was not primarily caused by Android native share failing, and it was not a total LLM enrichment failure.

The confirmed direct cause is a production vector-index consistency bug:

- `chunks_vec` contains an orphan vector row at rowid `44`.
- `chunks_rowid` only knows rowids through `43`.
- New embedding writes allocate `MAX(chunks_rowid.rowid) + 1`.
- Each new embedding write therefore tries to insert vector rowid `44`.
- `chunks_vec` already has rowid `44`, so the insert fails with:

```text
UNIQUE constraint failed on chunks_vec primary key
```

The enrichment LLM did write summaries, quotes, and categories for both Substack items. The user-visible failure appears because the worker and UI collapse a post-enrichment semantic indexing failure into the broad `enrichment_state='error'` lifecycle.

The likely origin of the orphan vector is an embedding reset/backfill path, especially `scripts/backfill-embeddings-prod.mjs`, which currently deletes vectors through `chunks.rowid` instead of the `chunks_rowid` bridge. That origin is a strong hypothesis, not yet proven. Before declaring the incident closed, execution evidence must confirm that path ran or another source must be found.

There is also a separate capture-quality issue: one Substack note was captured as `metadata_only`, and the other has only `675` chars despite being labeled `full_text`. Even after vector repair, Substack note URLs may still produce weak summaries unless the capture-quality path is handled separately.

Production repair must not be executed from the original immediate-remediation SQL alone. A safe repair requires worker quiescence, a restore-tested backup, code patches, dry-run impact queries, exact state-reset logic, and post-fix validation.

## Revised Verdict

Diagnosis: confirmed for the direct vector collision.
Origin: plausible but unproven for the backfill reset script.
Execution readiness: no-go until the safety gates in this revised RCA are satisfied.
User-facing recovery: incomplete until UI state and item-detail digest gating are fixed or explicitly accepted.

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
Enriched: 2026-06-17 18:11:13 IST
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
Enriched: 2026-06-17 17:20:30 IST
Enrichment state: error
```

## Evidence

### 1. Capture Artifacts Exist

Both items have production capture artifacts:

- `html_snapshot`
- `metadata_json`
- `write_status='ok'`
- no artifact write error

Observed snapshot sizes:

```text
How to Remember Everything You Read: 55,334 byte HTML snapshot
JP Morgan's Summer Reading List: 54,746 byte HTML snapshot
```

This supports that Android share and capture persistence worked.

### 2. Enrichment Content Was Written

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

This proves the enrichment stage did not wholly fail.

### 3. Terminal Job Error

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

### 4. Logs Show Enrichment Succeeded Before Embedding Failed

For item `f35c579f2f22e9444c09ad8f`, logs showed:

```text
[enrich] job #85 item=f35c579f2f22e9444c09ad8f attempt=1
[enrich] job #85 DONE in 2751ms (attempts: 1)
[enrich] job #85 retry 1/3: UNIQUE constraint failed on chunks_vec primary key
...
[enrich] job #85 FAILED after 3 attempts: UNIQUE constraint failed on chunks_vec primary key
```

For item `e8e707e2b5897b649e8e2f01`, logs showed:

```text
[enrich] job #84 retry 1/3: validation failed: quotes must be an array of strings
[enrich] job #84 item=e8e707e2b5897b649e8e2f01 attempt=2
[enrich] job #84 DONE in 3864ms (attempts: 1)
[enrich] job #84 retry 2/3: UNIQUE constraint failed on chunks_vec primary key
...
[enrich] job #84 FAILED after 3 attempts: UNIQUE constraint failed on chunks_vec primary key
```

The JP Morgan item had a first-attempt LLM schema validation issue, but the terminal failure was still the vector write collision.

### 5. Vector Table Consistency Check

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

The orphan vector row is:

```json
[
  {
    "rowid": 44
  }
]
```

This is the direct cause of the collision.

## Scope Of Impact

The vector collision is not isolated to Android or Substack.

Observed affected production window:

```text
first_failed: 2026-06-15 15:14:50 IST
last_failed: 2026-06-17 18:10:57 IST
failures: 18
```

Observed affected sources include:

- generic articles via Telegram
- YouTube via Telegram
- LinkedIn via Telegram
- Substack via web
- Substack via Android

This count is a known affected set, not a complete impact guarantee. The revised impact assessment must also check items with summaries but no chunks, stale or errored `embedding_jobs`, and items whose UI state is `error` despite valid enrichment content.

## Technical Root Cause

### Direct Cause

The normal embedding path inserts rows into:

- `chunks`
- `chunks_rowid`
- `chunks_vec`

The rowid bridge exists because `chunks.id` is text while `chunks_vec` requires integer rowids.

Current rowid allocation in `src/db/chunks.ts` uses:

```sql
SELECT COALESCE(MAX(rowid), 0) + 1 AS next_rowid FROM chunks_rowid
```

This allocator only checks `chunks_rowid`. It does not check existing rowids already present in `chunks_vec`.

Because production currently has:

```text
MAX(chunks_rowid.rowid) = 43
MAX(chunks_vec.rowid) = 44
```

the allocator returns `44`, then the vector insert collides with the orphan vector at `chunks_vec.rowid=44`.

### Worker-State Coupling

The enrichment worker performs enrichment and then runs embedding inline.

Expected conceptual stages:

1. Capture saved.
2. LLM enrichment writes summary/quotes/category.
3. Semantic indexing writes chunks/vectors.

Current user-visible state collapses these stages. In this incident:

- enrichment output was written;
- semantic indexing failed;
- the item wound up in `enrichment_state='error'`;
- the UI displayed `enrichment failed`.

This makes the UI misleading and can also hide existing summaries/quotes in item detail if rendering is gated on `enrichment_state='done'`.

### Likely But Unproven Origin Of The Orphan Vector

The strongest candidate source is an embedding reset/backfill path.

`scripts/backfill-embeddings-prod.mjs` contains this reset delete:

```js
db.prepare("DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)").run(itemId);
```

That query is wrong for this schema. `chunks_vec.rowid` maps through `chunks_rowid.rowid`, not through the implicit `chunks.rowid`.

Correct deletion shape should be bridge-based:

```sql
DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT r.rowid
  FROM chunks_rowid r
  JOIN chunks c ON c.id = r.chunk_id
  WHERE c.item_id = ?
);
```

However, this RCA does not yet prove that `scripts/backfill-embeddings-prod.mjs` ran during the incident window or created rowid `44`. Until that is proven, the origin should be treated as:

```text
strong hypothesis, not confirmed root origin
```

Evidence still needed:

- command history or deployment logs showing the script ran;
- service logs or shell logs around the first failed timestamp;
- backup comparison, if available;
- audit of every path that deletes or inserts into `chunks_vec`;
- any recoverable mapping between orphan rowid `44` and the item/chunk that produced it.

## Secondary Contributing Issues

### 1. Substack Note Capture Quality

The terminal failure is the vector collision, but capture quality remains a separate issue.

Evidence:

- `JP Morgan's Summer Reading List 2026 Book Selection` captured as `metadata_only` with `305 chars`.
- `How to Remember Everything You Read` captured as `full_text` with only `675 chars`.
- Both source URLs are Substack `note/c-...` URLs.

The current Substack extraction path can label content as `full_text` when extracted body length is at least `100` chars. That may be technically accurate for a short note, but from the user's perspective it may not mean a rich document was captured.

Required follow-up:

- Determine whether Substack notes should be treated differently from long-form Substack posts.
- Confirm whether Android share passes a note URL instead of a canonical article URL.
- Decide whether `metadata_only` Substack notes should automatically enter the needs-upgrade or repair flow.
- Revisit the `full_text` threshold for very short Substack note captures.

### 2. LLM Schema Validation On Short Captures

The JP Morgan item first failed with:

```text
validation failed: quotes must be an array of strings
```

This was not the terminal incident cause, but it consumed one retry and indicates a weak-content/schema-hardening issue.

Required follow-up:

- Handle metadata-only or short captures with a different enrichment prompt, or
- allow safe empty quote arrays for short content, or
- repair common non-array quote shapes before failing the job.

### 3. UI State Is Too Coarse

The existing UI displays `enrichment failed` for `enrichment_state='error'`.

That is misleading when:

- summary exists;
- quotes exist;
- category exists;
- semantic indexing failed after enrichment.

The product state should distinguish:

- saved;
- enrichment pending;
- summary ready;
- semantic indexing pending;
- semantic indexing failed;
- fully searchable/askable.

## Revised No-Go Gates For Production Mutation

Do not run production repair SQL until all of the following are true:

1. A fresh production DB backup exists.
2. The backup has been restore-tested.
3. The app/worker is stopped or otherwise prevented from running embedding writes during repair.
4. The vector allocator path is patched or the repair is run under strict process exclusivity.
5. `scripts/backfill-embeddings-prod.mjs` reset deletion is patched or disabled.
6. A dry-run impact report has been generated and reviewed.
7. The exact item recovery set is known.
8. State reset SQL for `items`, `enrichment_jobs`, and `embedding_jobs` is reviewed.
9. Rollback steps are documented.
10. Post-fix validation queries and UI checks are ready.

## Revised Remediation Tracks

### Track A - Production Safety Runbook

Create a separate execution runbook before mutating production.

Minimum runbook sections:

1. Preflight owner and timestamp.
2. Current git commit and deployed version.
3. Production DB path.
4. Backup command.
5. Backup restore-test command.
6. Worker/app stop command.
7. Dry-run consistency queries.
8. Repair SQL or script invocation.
9. Post-repair consistency queries.
10. Item state reset and requeue logic.
11. Worker/app restart command.
12. Monitoring window.
13. Rollback command.
14. User-facing validation checklist.

### Track B - Code Fixes

Required code changes before broad reprocessing:

1. Replace rowid allocation with a durable sequence or a single shared allocator that cannot collide with either `chunks_rowid` or `chunks_vec`.
2. Patch `scripts/backfill-embeddings-prod.mjs` to delete vectors through `chunks_rowid`.
3. Add tests for orphan-vector recovery.
4. Add tests for backfill reset deletion.
5. Add tests for allocator behavior when `chunks_vec` contains an orphan row above `chunks_rowid`.
6. Audit all code paths that write or delete `chunks`, `chunks_rowid`, or `chunks_vec`.

Interim allocator, if a durable sequence is not implemented immediately:

```sql
SELECT MAX(max_rowid) + 1 AS next_rowid
FROM (
  SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_rowid
  UNION ALL
  SELECT COALESCE(MAX(rowid), 0) AS max_rowid FROM chunks_vec
);
```

This is safer than the current allocator, but it still relies on `MAX(rowid) + 1`. It should be treated as temporary unless process exclusivity is guaranteed.

### Track C - Data Repair

The direct vector repair should remove orphan vectors only after the no-go gates are satisfied.

Dry-run orphan query:

```sql
SELECT v.rowid
FROM chunks_vec v
LEFT JOIN chunks_rowid r ON r.rowid = v.rowid
WHERE r.rowid IS NULL
ORDER BY v.rowid;
```

Draft repair shape, not approved for direct execution until the runbook is ready:

```sql
BEGIN IMMEDIATE;

DELETE FROM chunks_vec
WHERE rowid IN (
  SELECT v.rowid
  FROM chunks_vec v
  LEFT JOIN chunks_rowid r ON r.rowid = v.rowid
  WHERE r.rowid IS NULL
);

COMMIT;
```

If `sqlite-vec` virtual-table deletes do not behave transactionally as expected in the production runtime, stop and use the validated repair method from a staging copy.

### Track D - Item Recovery And Requeue

Do not blindly re-enrich all affected items. For items that already have valid summaries/quotes/categories, prefer embedding-only recovery.

Affected set should include at least:

```sql
SELECT i.id, i.title, i.enrichment_state, ej.state AS embedding_state, ej.last_error
FROM items i
LEFT JOIN embedding_jobs ej ON ej.item_id = i.id
WHERE i.summary IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM chunks c WHERE c.item_id = i.id);
```

Known chunks-vector failures:

```sql
SELECT i.id, i.title, i.source_platform, i.capture_source, ej.state, ej.last_error
FROM enrichment_jobs ej
JOIN items i ON i.id = ej.item_id
WHERE ej.last_error LIKE '%chunks_vec%'
ORDER BY i.captured_at;
```

Stale or failed embedding jobs:

```sql
SELECT i.id, i.title, i.enrichment_state, emb.state, emb.attempts, emb.last_error
FROM embedding_jobs emb
JOIN items i ON i.id = emb.item_id
WHERE emb.state IN ('error', 'running', 'pending')
ORDER BY emb.created_at;
```

Draft recovery intent:

- Preserve existing `summary`, `quotes`, `category`, and cleaned title when they are already valid.
- Reset `embedding_jobs` for affected items to `pending`.
- Set `items.enrichment_state` intentionally:
  - `done` if summary/quotes/category are valid and only indexing failed;
  - `pending` only if re-enrichment is required;
  - do not leave user-visible `error` for items whose summary exists and only indexing failed.

The exact SQL must be generated and reviewed in the implementation plan before execution.

### Track E - UI/Product State Fix

Required UI behavior:

- Library should not show `enrichment failed` when enrichment content exists and indexing failed.
- Item detail should show available summary/quotes even when semantic indexing failed.
- A separate status should communicate that the item is saved but not yet searchable/askable by semantic retrieval.

Recommended labels:

```text
semantic indexing failed
```

or

```text
summary ready, indexing failed
```

Avoid `enrichment failed` for this class.

### Track F - Substack Capture-Quality Follow-Up

This incident is not primarily an Android share failure, but the Substack note capture quality still needs a follow-up.

Required checks:

1. Confirm what URL Android native share sends for each Substack item.
2. Compare shared note URL versus canonical Substack post URL, if any.
3. Check whether RSS or metadata can provide richer text for `note/c-...` URLs.
4. Add fixture coverage for Substack note URLs.
5. Decide whether very short `full_text` Substack captures should be downgraded or surfaced as needs-upgrade.

## Revised Validation After Fix

### Referential Consistency

Use referential checks, not simple count equality, as the primary invariant.

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

### Item-Level Validation

For both Substack items:

- no `enrichment failed` badge in Library;
- summary and quotes visible in item detail when present;
- semantic chunks exist after recovery;
- semantic retrieval can return the item;
- Ask can cite the item when scoped appropriately;
- no new `chunks_vec primary key` errors appear in service logs or `data/errors.jsonl`.

### Broader Regression Validation

Validate at least one affected item from each observed source family:

- Telegram generic article;
- Telegram YouTube;
- Telegram LinkedIn;
- web Substack;
- Android Substack.

## What Changed From The Original RCA

1. The original immediate remediation is no longer execution-ready. It is replaced by a no-go gated production runbook requirement.
2. The backfill script is no longer stated as the confirmed origin. It is a strong hypothesis pending execution evidence.
3. The impact scope is no longer limited to the known 18 `chunks_vec` enrichment-job failures.
4. UI impact now includes item-detail digest hiding, not only an inaccurate library badge.
5. Substack note capture quality is now a separate contributing issue.
6. Validation now prioritizes referential integrity over count equality.

## Open Questions

1. What process actually inserted orphan `chunks_vec.rowid=44`?
2. Did `scripts/backfill-embeddings-prod.mjs` run between 2026-06-15 15:14 IST and 2026-06-17 18:11 IST?
3. Are there other manual or production scripts that delete from `chunks` without deleting from `chunks_vec` through `chunks_rowid` first?
4. Should Substack notes be treated as first-class captures or as weak captures requiring repair?
5. Should the app store separate persisted states for enrichment and semantic indexing instead of deriving both from `items.enrichment_state` and `embedding_jobs`?

## Final Conclusion

The screenshot surfaced a broader production semantic-indexing integrity issue. Android share saved the Substack links, capture artifacts exist, and LLM enrichment content was written. The visible failure is caused by a post-enrichment vector write collision against an orphan `chunks_vec` row.

The direct technical fix is to repair the orphan vector and prevent future rowid collisions. The durable product fix is to separate enrichment state from semantic-indexing state so successful summaries are not shown as failed enrichment. The Substack capture-quality limitation should be handled as a related but separate follow-up.

Do not execute production repair from this RCA alone. Use this revised RCA as the diagnostic basis for a separate implementation plan and production runbook.
