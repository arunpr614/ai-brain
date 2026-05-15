# v0.6.0 Enrichment Flow

**Date:** 2026-05-12
**Inputs:** S-1 (usage baseline), S-3 brief, S-4 (AI provider matrix), codebase audit of `src/lib/enrich/` and `src/lib/queue/enrichment-worker.ts`

---

## Pipeline diagram

```
[Capture] ──► items.enrichment_state = 'pending'
                         │
                         │  (trigger inserts enrichment_jobs row)
                         ▼
              enrichment_jobs.state = 'pending'
                         │
          ┌──────────────┴───────────────┐
          │  Daily batch (default)        │  Manual "Enrich now"
          │  node-cron 03:00 UTC          │  POST /api/items/:id/enrich
          │  picks all pending jobs       │  immediate realtime Haiku call
          │  → Anthropic Batch API        │  same enrichItem() fn
          │  → poll up to 24h            │
          └──────────────┬───────────────┘
                         │
              enrichment_jobs.state = 'done'
              items.enrichment_state = 'done'
              items.enriched_at = <timestamp>
              items.batch_id = <batch_id>  (batch path only)
```

---

## State machine

### `items.enrichment_state` values

| State | Meaning | Trigger |
|---|---|---|
| `pending` | Captured, not yet enriched | Row INSERT (existing trigger) |
| `batched` | Submitted to Anthropic Batch API; awaiting result | Daily batch job on submission |
| `running` | Manual "Enrich now" call in progress | Manual endpoint on claim |
| `done` | Enrichment complete | Either path on success |
| `error` | Failed after MAX_ATTEMPTS (3) | Either path on terminal failure |

### `enrichment_jobs.state` values (unchanged from v0.3.0)

`pending` → `running` → `done` | `error`

For the batch path, the job transitions `pending → running` at submission time and `running → done/error` when the batch result is polled and written.

### `items.batch_id` (new column)

Stores the Anthropic Batch API batch ID (e.g. `msgbatch_abc123`) so the daily poller knows which batch to check. NULL for manually enriched items.

---

## Daily batch job

**Scheduler:** `node-cron` (npm package, ~1 KB, no daemon) inside the Next.js server process. Fires at `0 3 * * *` UTC (03:00 UTC = ~08:30 IST, while the user is asleep). The server is always running on Lightsail, so `setInterval`-style reliability is sufficient. No systemd timer needed unless node-cron is found unreliable in practice.

**Job logic (`src/lib/queue/enrichment-batch.ts` — new file):**

1. Query all `enrichment_jobs` with `state = 'pending'`.
2. For each, load the item body + build the enrichment prompt (reuses `enrichmentUserPrompt()` and `ENRICHMENT_SYSTEM` from `prompts.ts` unchanged).
3. Construct one Anthropic Batch API request:
   ```
   POST https://api.anthropic.com/v1/messages/batches
   {
     "requests": [
       {
         "custom_id": "<item_id>",
         "params": {
           "model": "claude-haiku-4-5-20251001",
           "max_tokens": 1200,
           "system": ENRICHMENT_SYSTEM,
           "messages": [{ "role": "user", "content": <prompt> }]
         }
       },
       ...
     ]
   }
   ```
4. On success, capture `batch.id` and update every submitted item:
   - `items.enrichment_state = 'batched'`
   - `items.batch_id = <batch.id>`
   - `enrichment_jobs.state = 'running'`, `claimed_at = now`
5. Schedule a polling loop: check `GET /v1/messages/batches/<batch_id>` every 15 minutes until `processing_status = 'ended'` (up to 24h SLA; in practice ~5–30 min for 30-item batches).
6. On completion, iterate results via `GET /v1/messages/batches/<batch_id>/results` (JSONL stream). For each result, call `validateEnrichment()` and if valid, run the same SQLite transaction as the current `enrichItem()` (write summary, category, title, auto-tags, `enriched_at`).
7. Record `llm_usage` row per item (provider = 'anthropic', cost = batch rate).

**Batch size guard:** If the item queue has 0 items, skip the Anthropic call entirely. If it has > 100 items, log a warning and cap at 100 (Anthropic's Batch API has no hard limit stated, but this is a safety rail).

---

## Manual "Enrich now"

**Route:** `POST /api/items/[id]/enrich` (new route at `src/app/api/items/[id]/enrich/route.ts`).

**Behavior:**
1. Auth check (session cookie).
2. If `enrichment_state = 'done'` and no `?force=true` query param → return `{ alreadyDone: true }` with 200. The UI can show "Re-enrich?" confirmation.
3. Claim the `enrichment_jobs` row (or re-insert if missing), set `state = 'running'`.
4. Call `enrichItem(id)` directly (Haiku realtime, not batch). The existing `enrichItem()` function is provider-agnostic as long as the provider-swap refactor (S-4 open item) is done; if Ollama is still in place at call time, it uses Ollama. Post-migration it uses the Anthropic SDK realtime path.
5. Return `{ queued: true }` immediately; polling via existing `GET /api/items/[id]/enrichment-status` handles progress. (Or, if `enrichItem()` is fast enough, await and return the result synchronously — acceptable since Haiku realtime median ~1.5s for this prompt.)

**Rate limit:** 10 manual enrichment calls per hour per session (simple in-memory counter; fine for a single-user tool).

**UI:** On the item detail page (`src/app/items/[id]/page.tsx`), show an "Enrich now" button when `enrichment_state = 'pending' | 'batched' | 'error'`. For `done`, show a "Re-enrich" link (subtle, secondary style) that appends `?force=true`.

**Cost:** Realtime Haiku 4.5 is 2× batch rate ($1/$5 per MTok vs $0.50/$2.50). A single manual call at average token counts (935 in / 275 out) costs $0.00094 + $0.00138 = $0.0023. Negligible.

---

## Schema changes

Migration `008_enrichment_batch.sql`:

```sql
-- 008_enrichment_batch.sql — v0.6.0
-- Adds batch-path columns for Anthropic Batch API enrichment.

-- New enrichment_state values: 'batched' for items submitted to Batch API.
-- SQLite CHECK constraint must be re-created via table rebuild; use a view
-- alias instead to avoid locking. Simplest path: drop + recreate the CHECK.
-- In practice, easier to just allow any TEXT and validate in app layer.
-- Existing CHECK: ('pending','running','done','error') — extend to include 'batched'.

-- SQLite does not support ALTER COLUMN for CHECK constraints.
-- We keep the app-layer enrichment_state validation and live with the
-- legacy CHECK. The 'batched' value will be written by the app; SQLite
-- will reject it until we migrate. Use a safe approach:

-- Step 1: recreate items with extended CHECK (full table rebuild).
-- Too disruptive for a running migration. Practical decision:
-- Remove the CHECK constraint by rebuilding items, OR just accept that
-- SQLite ignores CHECK on INSERT in older builds.
-- Decision: rebuild is too risky pre-cutover. Instead, add a new column
-- `batch_submitted` INTEGER (0/1) as a flag so the existing CHECK is untouched,
-- and use `enrichment_state = 'running'` for the batched-waiting state.

-- The items row will use enrichment_state = 'running' during batch wait
-- (consistent with what the worker sets today) and batch_id tracks whether
-- it came from the batch path vs manual.

ALTER TABLE items ADD COLUMN batch_id TEXT;
ALTER TABLE items ADD COLUMN batch_submitted_at INTEGER;

-- enrichment_jobs: add triggered_by to distinguish batch vs manual.
ALTER TABLE enrichment_jobs ADD COLUMN triggered_by TEXT
  NOT NULL DEFAULT 'batch'
  CHECK (triggered_by IN ('batch', 'manual'));
```

**Why not add `enrichment_state = 'batched'`:** SQLite requires a full `CREATE TABLE AS ... / DROP / RENAME` cycle to change a CHECK constraint. At migration time this is safe but adds complexity. Since `running` already means "claimed, in flight" and `batch_id IS NOT NULL` distinguishes the batch path, the extra state is not needed. The UI copy maps `running + batch_id IS NOT NULL` → "⌛ Queued for tonight's batch result."

**Summary of `items` additions:**

| Column | Type | Meaning |
|---|---|---|
| `batch_id` | TEXT | Anthropic batch ID; NULL if manually enriched |
| `batch_submitted_at` | INTEGER | Unix ms when submitted to Batch API |

---

## Failure + retry

| Failure mode | Detection | Response |
|---|---|---|
| Batch submission fails (network / 5xx) | HTTP error on POST | Re-queue all items (set `enrichment_jobs.state = 'pending'`); retry next cron fire (next day) |
| Batch result poll times out (>26h) | Poller hits max iterations | Mark batch items back to `pending`; log to `data/errors.jsonl`; next day's job re-submits |
| Anthropic partial batch failure | `result.type = 'errored'` in JSONL | Increment `attempts` for failed items; re-insert as pending for next run. Items that pass succeed immediately. |
| Individual item validation fails | `validateEnrichment()` returns problems | Increment attempts; retry up to MAX_ATTEMPTS = 3 total across all batch runs; then `state = 'error'` |
| Process crash mid-poll | Server restarts; poller is gone | On next boot, detect items with `batch_id IS NOT NULL AND enrichment_state = 'running' AND batch_submitted_at < now - 26h` → re-queue as pending. Items submitted < 26h ago → restart the poller for that batch_id. |
| "Enrich now" collision with running batch | `enrichment_jobs.state = 'running'` | Manual endpoint returns 409 Conflict with `{ state: 'running' }`. UI shows "Already processing." |
| Duplicate batch submission | `batch_id IS NOT NULL` on pending check | Batch job skips items with `batch_id IS NOT NULL AND enrichment_state = 'running'` (they're already in flight). |

**Retry policy summary:** up to 3 attempts per item, across any combination of batch and manual triggers. After 3 failures, `enrichment_state = 'error'`; the "Enrich now" button with `?force=true` resets the attempt counter and re-queues.

---

## Cost estimate (moderate usage, 30 items/month)

From S-1 and S-4 data: avg enrichment prompt = ~935 input tokens + ~275 output tokens.

| Path | Items | Input tokens | Output tokens | Rate (in/out per MTok) | Monthly cost |
|---|---|---|---|---|---|
| Daily batch (Haiku 4.5 Batch API) | 29 of 30 | 27,115 | 7,975 | $0.50 / $2.50 | $0.014 + $0.020 = **$0.034** |
| Manual realtime (Haiku 4.5) | 1 of 30 | 935 | 275 | $1.00 / $5.00 | $0.001 + $0.001 = **$0.002** |
| **Total enrichment** | **30** | | | | **~$0.036/month** |

Compared to a fully realtime enrichment path at Haiku rates:
- Realtime 30 items: $0.028 + $0.069 = $0.071/month
- Batch path savings: **~$0.04/month (~49% reduction)** — consistent with the 50% batch discount.

At Brain's volume this is noise. The value of the batch path is operational (Anthropic Batch API has higher throughput limits and no rate-limit pressure) not financial.

---

## Backfill note

Items already enriched on the Mac (currently 2 items with `enrichment_state = 'done'`) are left as-is. The migration sets `batch_id = NULL` for them (it's a new column with no default required — SQLite adds NULL). No re-enrichment; no double-billing. Items in `pending` state at migration time flow into the first nightly batch.

---

## Rollback

`BRAIN_ENRICH_BATCH_MODE=false` (env var) → the `runEnrichmentBatch()` function exits early and the existing continuous-poll worker takes over. The worker is not deleted in v0.6.0, only dormant. Single-line guard at the top of the batch scheduler:

```typescript
if (process.env.BRAIN_ENRICH_BATCH_MODE !== "true") {
  startEnrichmentWorker(); // legacy Ollama-based path
  return;
}
```

No data migration needed to roll back; `batch_id` and `batch_submitted_at` are nullable and ignored by the legacy worker.
