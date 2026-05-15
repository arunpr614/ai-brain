# S-12 — Batch Result Write Race vs Manual "Enrich Now"

**Date:** 2026-05-15 (drafted post Phase B closure)
**Owner:** Arun (AI-assisted)
**Branch:** `main`
**Cost ceiling:** $0 (mocked Anthropic, no live calls)
**Trigger:** Phase C-3's poll loop and Phase C-5's `/api/items/[id]/enrich` force-realtime path both write to `items` for the same row. Two questions C-6 idempotency design needs to answer empirically.
**Priority:** Optional. Defer until C-3 is partly written; promote to required if C-6 design feels shaky from inspection.

---

## 1. Why this spike exists

Plan §3.4 says "Manual `Enrich now`... If `LLM_ENRICH_BATCH=true` AND item is `pending`, this endpoint forces realtime path (bypasses batch)." The plan doesn't specify what happens in two race scenarios:

- **Race A:** item is `batched` (already submitted to Anthropic). User clicks "Enrich now" → realtime path runs → enrichment completes. Then 5 minutes later, the cron poll fires → batch result comes back → tries to write again on top of the realtime result.
- **Race B:** item is `pending`. Cron tick T0 submits a batch including item X (state → `batched`). Within the same tick or shortly after, manual "Enrich now" sees state still `pending` (transactional read race) and submits realtime. Now both paths write back.

Both races result in **duplicate Anthropic spend** + **double `attempts++`** + **last-write-wins semantics for `summary`/`title`/`tags`**. None catastrophic, but each is a paper-cut that compounds in prod.

This spike confirms whether the C-6 idempotency design (single `enrichment_state` transition gate) actually closes both races, or whether we need an additional `batch_id IS NULL` predicate.

## 2. Hypotheses & predictions

### H-1 — Single-state-transition guard prevents Race A

**Prediction:** if the realtime path's transition is `enrichment_state IN ('pending', 'batched') → 'running' → 'done'` *atomically* (inside a `BEGIN IMMEDIATE` SQLite transaction), and the cron poll's write is `enrichment_state IN ('batched') → 'done'`, then SQLite's WAL serialisation ensures one of them wins outright. The loser sees zero rows updated and short-circuits without writing.

**Failure mode if wrong:** double-write on the `items` row. Last-writer wins; usage row gets two entries; `attempts` increments twice. Anthropic still bills twice — that part is unfixable post-submit.

### H-2 — Batch submit acquires `batch_id` BEFORE realtime can race

**Prediction:** the cron's submit transaction is structured as:

```sql
BEGIN IMMEDIATE;
SELECT id FROM items WHERE enrichment_state = 'pending';   -- list
-- submit batch to Anthropic, receive batch_id
UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id IN (...);
COMMIT;
```

Then a manual "Enrich now" that arrives *during* the submit waits on the lock. By the time it reads, the row is `batched`, not `pending`. Force-realtime is gated on `pending`, so it correctly skips.

**Failure mode if wrong:** if we instead submit *outside* the transaction and update *after*, there's a window where Anthropic has the request but our DB still says `pending`. Race B fires.

### H-3 — Idempotency at the API level: 409 Conflict on re-trigger

**Prediction:** `POST /api/items/:id/enrich` against an item already in `running` or `done` state returns 409 with body `{state: "<current>"}`, doesn't trigger a second LLM call.

**Failure mode if wrong:** UI buttons that double-click submit two requests; second one bills Anthropic and overwrites.

### H-4 — Cron retry on errored batch doesn't double-bill

**Prediction:** if a batch's per-result entry returns `errored`, the entry returns to `pending` with `attempts++`. The next day's cron resubmits in a *new* batch with a *new* `batch_id`. The old `batch_id` is cleared (or the entry's row carries the new one). No item ever has two live `batch_id`s pointing at active Anthropic batches.

**Failure mode if wrong:** if `batch_id` retention overlaps with a new submit, polling could pull the wrong results, or worse, both polls could race to write.

## 3. Method

Pure unit-level concurrency simulation. No live API calls.

1. **Setup:** SQLite test DB with the migration 008 schema applied. Pre-populate one item in `pending` state.
2. **Race A simulation:**
   - Mock Anthropic provider with `submitBatch` returning a fake `batch_id`.
   - Manually call `submitBatch` flow (transitions `pending` → `batched`, sets `batch_id`).
   - Spawn two parallel async tasks:
     - Task X: `pollBatch` returns `ended` with a successful result; calls write-back.
     - Task Y: `enrichItem` (realtime) called concurrently against the same item.
   - Assert: only one of the two completes a write; the other sees zero rows updated and returns gracefully with a "already enriched" response.
3. **Race B simulation:**
   - Mock cron submit transaction with a deliberate 100ms sleep between the SELECT and the UPDATE (simulating a slow Anthropic submit).
   - Spawn manual "Enrich now" against the same item during the sleep.
   - Assert: the manual call blocks on the SQLite lock and then sees the row in `batched`, not `pending`. Returns 409 instead of triggering realtime.
4. **API-level idempotency:**
   - Hit `POST /api/items/:id/enrich` against an item in `running`. Expect 409.
   - Same against an item in `done`. Expect 409.
5. **Errored-batch retry:**
   - Mock `pollBatch` returning a per-result entry with `type: "errored"`.
   - Apply the C-7 fallback path. Assert: row state goes `batched` → `pending` with `attempts: 1`, `batch_id: NULL`.
   - Verify: a subsequent submit assigns a *new* `batch_id`; no overlap with the previous (now-NULL) value.

## 4. Stop conditions

- Any test fails → mark spike RED. Document the failure mode and recommend a stronger idempotency design (e.g., `batch_id` column as a row-level lock + state machine).
- If the test for H-1 reveals SQLite's `BEGIN IMMEDIATE` doesn't prevent Race A in `better-sqlite3`'s default WAL mode, this changes the migration 008 design (may need to add a `lock_token` column).
- Spike total time > 30 min → abort, surface findings.

## 5. Expected outcomes (likelihood × impact)

| Hypothesis | Pre-spike confidence | If RED, impact |
|---|---|---|
| H-1 single transition guard | 70% | MEDIUM — need `batch_id IS NULL` extra predicate or row-lock token |
| H-2 submit-inside-transaction | 90% (cheap to enforce) | LOW — code-only fix |
| H-3 API 409 on non-pending | 85% | LOW — code-only fix |
| H-4 errored-batch clean retry | 80% | MEDIUM — affects C-7 design |

The 70% on H-1 is the spike's main reason. SQLite WAL serialisation is well-understood, but `better-sqlite3`'s sync API + `node-cron`'s async tick + SSE realtime path interactions are not.

## 6. Defer-or-run decision rule

**Run S-12 if any of these are true after C-3 is partly written:**
- C-6's idempotency unit tests are flaky.
- C-3's submit transaction structure isn't yet decided.
- A code review of C-3 surfaces "we should test this concurrency" as a comment.

**Skip S-12 if:**
- C-3 + C-6 are written and unit tests for them include the Race A + Race B simulations *without* a separate spike doc. (i.e., the spike's value is replaced by direct test coverage in production code.)

## 7. Findings

_Filled in if/when run._
