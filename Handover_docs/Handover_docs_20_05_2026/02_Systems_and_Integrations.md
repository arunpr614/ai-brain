# M2 — Systems and Integrations (delta)

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta — Anthropic + retrieve findings |

> **For the next agent:** Three system-level findings today. Read §1 (Anthropic 529) before designing v0.6.1.1 retry policy. Read §2 (retrieve revalidation) before touching `src/lib/retrieve/index.ts`.

---

## 1. Anthropic API — intermittent 529 from Hetzner

### 1.1 Evidence

Curl probe 2026-05-20 from Hetzner against `api.anthropic.com/v1/messages`:

| Attempt | Status | Time |
|---|---|---|
| 1 | 200 | 1.45s |
| 2 | **529 `overloaded_error`** | 2.01s |
| 3 | 200 | 1.60s |

Response body for the 529:
```json
{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"},"request_id":"req_011CbDVyoVLY8XUJH1sqFsBY"}
```

### 1.2 Code path of the bug

**Stream path (Ask UI):** `../../src/lib/llm/anthropic.ts:210-217`

```ts
if (!res.ok) {
  const text = await res.text().catch(() => "");
  throw new LLMError(
    "http",
    `Anthropic stream returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
    res.status,
  );
}
```

The throw is caught by `toSSEStream` at `../../src/lib/ask/sse.ts:46-52` which emits a `STREAM_FAILED` error frame to the browser. **The UI showing "..." indefinitely suggests the client doesn't render that error frame** — that's a separate, smaller bug (UI affordance).

**Non-stream path:** `../../src/lib/llm/anthropic.ts:174-188` — same shape, same gap.

**Existing retry:** `../../src/lib/llm/anthropic.ts:289-310` — retries ONLY on malformed JSON, not on HTTP errors.

### 1.3 Cascading symptom

The enrichment worker at `../../src/lib/queue/enrichment-worker.ts` logs `[enrich] LLM provider unreachable; backing off 30000ms` every 30 seconds when it hits a 529. The "unreachable" wording is misleading — it's a 529, not a network failure. Confirmed by:
- `tr "\0" "\n" < /proc/$BRAIN_PID/environ` shows `NODE_ENV=production` (process is healthy).
- Curl from same host succeeds 67% of the time → network is fine.
- Pattern: every ~30s during quiet hours, logged 5+ times in the 00:56–01:25 IST D-17 verification window.

### 1.4 Recommended fix shape (for v0.6.1.1 / v0.6.2 planning)

- Wrap both `if (!res.ok)` blocks in `fetchWithRetry(req, { retryStatuses: [429, 503, 529], maxAttempts: 3, backoff: [500, 2000, 5000] })`.
- Respect `Retry-After` header per RFC 7231 §7.1.3.
- Honour `signal.aborted` during backoff sleep.
- After all retries fail, throw `LLMError("http", "Anthropic overloaded after 3 attempts: ...", lastStatus)` so callers can surface meaningfully.
- For the enrichment worker idle-spam, separately: only call `isAlive()` when there's queued work.

**Verification path:**
1. Unit tests with mocked fetch returning `[529, 529, 200]` and `[529, 529, 529, 529]`.
2. Empirical retest at next 529 window — UI should either stream (after retry) or show error frame (after exhaustion); never hang on "...".

---

## 2. Retrieve pipeline — BUG-RETRIEVE-ITEM revalidated

### 2.1 Probe results 2026-05-20

Probe ran via `/opt/brain/scripts/spike-retrieve-revalidate.mjs` (cleaned up post-test):

| Item chunk count | Generic query, item scope | Specific query, item scope |
|---|---|---|
| **1 chunk** | **0 chunks returned (BUG)** | 1 chunk at sim 0.91 |
| 4 chunks | 2 chunks at sim 0.83+ | 4 chunks (all) |
| 21+ chunks | works | works |

### 2.2 Code path

`../../src/lib/retrieve/index.ts:88-122`:

```ts
const scanLimit = topK * 4;  // line 88 — sets vec0 scan to 32 globally
// ... vec0 MATCH query that doesn't filter by item_id ...
// then JS post-filter at lines 118-122:
result = result.filter(r => r.item_id === opts.itemId).slice(0, topK);
```

A single short item's chunk doesn't survive the global top-32 vec0 scan when the query is generic (the 44-chunk `c3fa6db5` item dominates the leaderboard).

### 2.3 Recommended fix shape

Push the predicate into the vec0 query when `opts.itemId` is set. Drop the `topK * 4` scanLimit for item-scope (no longer needed since the SQL filter eliminates noise). Library-scope path stays unchanged.

**Severity:** P2, not P1 — only triggers on 1-chunk items + generic queries. Multi-chunk items work correctly today.

### 2.4 Code SoT mismatch with #48

RUNNING_LOG #48 framed this as "per-item Ask returns 0 chunks for generic queries" without the boundary condition. Today's revalidation tightens the boundary: ≥ 2 chunks works. The fix is still right; the urgency was inflated.

---

## 3. Embeddings — generic-query noise

### 3.1 Phenomenon

`gemini-embedding-001` at output-dim 768 returns Hindi YouTube transcripts and an Uber receipt at sim 0.84+ for the English generic query "what is this about?" against a mixed-language library.

### 3.2 D-16 retest result

Content-specific query "What does Ruben Hassid say about AI learning?" returned **8 chunks with the right item at slot 1**. Embedding pipeline is healthy for content-specific queries.

### 3.3 Conclusion

Not a bug; a quality ceiling on generic queries. Down-scoped P1 → P2 in BACKLOG (`R-EMBED-QUALITY`). Possible future fix: rerank or hybrid step downstream of vec0. Out of scope for v0.6.2; revisit at v0.7.x or v0.8.x when product context calls for it.

---

## 4. Inbox tab clarification

The "Inbox" UI tab is the **outbox state surface** — local-only IndexedDB queue for items captured-but-not-yet-synced from APK / browser. Source: `../../src/app/inbox/inbox-client.tsx`. The user-facing rename ("Outbox" → "Inbox") is intentional but slightly confusing. Worth noting because the v0.6.x-offline-mode-apk plan refers to it as "outbox" throughout.
