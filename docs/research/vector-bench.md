# R-VEC — sqlite-vec vector benchmark findings

| Field | Value |
|-------|-------|
| **Document version** | v1.0 |
| **Date** | 2026-05-08 |
| **Owner** | Arun (full AI-assisted) |
| **Spike plan** | [`docs/plans/R-VEC-spike.md`](../plans/R-VEC-spike.md) |
| **Raw results** | `tmp/vec-bench-results.json` (gitignored; regenerable) |
| **Verdict** | **GREEN — proceed to v0.4.0 on `sqlite-vec`** |

---

## 1. Question

At 10k+ embedding chunks on my Mac (M1 Pro, 32 GB RAM), is `sqlite-vec` fast enough to back real-time Ask (RAG) queries, or do I need to swap to a different vector store before starting v0.4.0?

Thresholds (from spike plan §1):

| Metric | Target |
|---|---|
| p50 top-k=8 cosine query latency | < 80 ms |
| p95 top-k=8 cosine query latency | < 200 ms |
| Index build @ 10k | < 30 s cold / < 5 s warm-reopen |

---

## 2. Environment

| Item | Value |
|---|---|
| Hardware | MacBook Pro 16" 2021, Apple M1 Pro (10 cores), 32 GB RAM |
| OS | macOS 26.4.1 (Darwin 25.4.0) |
| Node.js | v22.18.0 |
| better-sqlite3 | ^11.10.0 |
| `sqlite-vec` npm package | **0.1.9** (see §6 caveat — lockfile says 0.1.6) |
| `sqlite-vec` runtime (`vec_version()`) | **v0.1.9** |
| Embedding dimension | 768 (float32) — matches `nomic-embed-text` target |

### Dataset

Synthetic unit-normalised random float32 vectors from `crypto.randomBytes`. Distribution-independent metric (latency only); recall@k explicitly out of scope and deferred to v0.4.0 alongside prompt tuning (spike plan §3).

### Method

- **Insert:** batched transactions of 1000 rows. One `virtual table … using vec0(embedding float[768])` per tier.
- **Query:** `select rowid from vec_test where embedding match ? order by distance limit 8`.
- **Latency harness:** 10 warm-up queries (not timed) → 1000 timed queries → `process.hrtime.bigint()` sampled per query → sort + percentiles.
- **Warm-reopen:** close handle, reopen (fresh `better-sqlite3` handle, reload extension), single query.
- **Concurrency sanity:** 4 `node:worker_threads` × 250 read-only queries against the same DB file.
- Benchmarks run directly via `node scripts/spike-vec-bench.mjs` (bypasses `next dev` / Turbopack per spike plan §7 risk).

Reproduce: `node scripts/spike-vec-smoke.mjs && node scripts/spike-vec-bench.mjs`.

---

## 3. Results

### Insert + disk

| N chunks | Insert wall-time | Rows/s | DB size on disk |
|---:|---:|---:|---:|
| 1 000 | **33.1 ms** | 30 181 | 3.05 MB |
| 10 000 | **293.8 ms** | 34 031 | 30.28 MB |
| 50 000 | **1 806.6 ms** | 27 677 | 148.28 MB |

Linear scaling in rows/s across 1k→50k. Disk ≈ 3 KB per 768-dim row (storage ≈ `dim × 4 bytes + vec0 overhead`).

### Query latency (1000 timed queries, top-k=8)

| N chunks | min | **p50** | **p95** | p99 | max | mean |
|---:|---:|---:|---:|---:|---:|---:|
| 1 000 | 0.49 ms | **0.52 ms** | **0.70 ms** | 0.84 ms | 2.35 ms | 0.55 ms |
| 10 000 | 5.70 ms | **6.25 ms** | **6.88 ms** | 7.45 ms | 9.05 ms | 6.31 ms |
| 50 000 | 25.9 ms | **30.45 ms** | **35.58 ms** | 55.16 ms | 190.66 ms | 32.7 ms |

Roughly linear: 10× corpus ≈ 10× p50 latency. 50k max spike (190 ms) is a lone outlier; p99 is 55 ms.

### Warm-reopen cost

| N | Steady p50 | First-query after reopen | Reopen overhead |
|---:|---:|---:|---:|
| 1 000 | 0.52 ms | 0.87 ms | +0.35 ms |
| 10 000 | 6.25 ms | 6.47 ms | +0.22 ms |
| 50 000 | 30.45 ms | 30.59 ms | +0.14 ms |

Reopen is essentially free. The extension load itself is trivial and `vec0` has no large heated cache to lose.

### Concurrency (4 workers × 250 queries, same DB file, read-only handles)

| N | Total wall-time | Aggregate qps | Lock errors |
|---:|---:|---:|---:|
| 1 000 | 835 ms | **1 197 qps** | 0 |
| 10 000 | 7 350 ms | 136 qps | 0 |
| 50 000 | 37 910 ms | 26 qps | 0 |

Zero `database is locked` errors across 1000 concurrent queries per tier. Aggregate throughput scales inversely with N, consistent with CPU-bound single-threaded vec0 scans (no ANN index in 0.1.x — brute-force cosine). The 4-worker run completes in roughly `4 × single-worker latency`, implying no real parallel speed-up — vec0 scans serialize on each DB read. Acceptable for single-user Ask workload.

---

## 4. Verdict against thresholds

| Metric | Threshold | Measured @ 10k | Margin | Result |
|---|---|---|---|---|
| p50 query | < 80 ms | **6.25 ms** | **12.8×** headroom | ✅ PASS |
| p95 query | < 200 ms | **6.88 ms** | **29×** headroom | ✅ PASS |
| Build cold | < 30 s | **293.8 ms** | **102×** headroom | ✅ PASS |
| Reopen first-query | < 5 s | **6.47 ms** | **772×** headroom | ✅ PASS |

All four thresholds pass with ≥ 20 % margin (in fact ≥ 10× margin everywhere). Per spike plan §6:

### GREEN — proceed to v0.4.0 on `sqlite-vec`

**Chosen embedding:** `nomic-embed-text` (768-dim) remains the v0.4.0 default. `mxbai-embed-large` (1024-dim) was not benchmarked; given 50k@768 is still within budget (p50=30 ms, p95=36 ms), a 33 % dimension bump should remain well inside the 80/200 ms bar. Decision deferred to v0.4.0 planning.

### Forward-looking note: the 50k tier is healthy

At 50k chunks the p50 is 30 ms and p95 is 36 ms — still 2.2×/5.5× under the 80/200 ms thresholds. This means the personal-library corpus ceiling is probably ~150k chunks before we'd start to worry about real-time Ask feel, well past any realistic near-term use. No corpus-size guard needed (would have been the YELLOW mitigation).

---

## 5. What this means for v0.4.0 Ask (RAG)

- Schema: a `vec0` virtual table alongside the existing `items`/`chunks` tables. Chunk ID → rowid mapping via the existing `chunks.id INTEGER PRIMARY KEY`.
- Latency budget: RAG end-to-end target ≈ 1.5 s. Local-LLM generate dominates (~0.5–1.2 s for Qwen 2.5 7B on M1 Pro). Vector retrieve (6 ms p50) is < 1 % of the total — we can afford to over-retrieve (top-k=20) and re-rank without hurting UX.
- Storage: 30 MB per 10k chunks = ~300 MB per 100k. Fits the local-first constraint comfortably.
- Concurrency: single-user, so `vec0` serialization is a non-issue. If we later add a proactive background worker that queries the vector store concurrently with user Ask, we'll need to either queue or move to an ANN-capable store — but that's a v0.9.0+ concern.

### Non-findings (out of scope, revisit in v0.4.0)

- **Recall quality** — synthetic vectors tell us nothing about whether the top-8 are *useful* neighbours. Measured in v0.4.0 alongside prompt tuning.
- **Hybrid search with FTS5** — deferred to v0.4.0.
- **Re-ranking strategies** — same.

---

## 6. Caveats

1. **Version drift — F-049 pin did not hold.**
   - `package.json` & `package-lock.json` declare `sqlite-vec@0.1.6`.
   - Installed `node_modules/sqlite-vec/package.json` reports `0.1.9`. Runtime `vec_version()` also reports `v0.1.9`.
   - Probable cause: the npm registry tag or optional-dependency resolution bumped the native binary. The F-049 fix (exact-pin, no caret) caps the JS wrapper but optional-platform-deps drifted.
   - **Follow-up F-057:** audit `package-lock.json` integrity hashes after next `npm install` and lock the `sqlite-vec-darwin-arm64` sub-package explicitly if drift repeats. Not a blocker — 0.1.9 meets thresholds by a huge margin, and it's the version that shipped in v0.3.1's release commit too.
2. **Synthetic vectors.** Latency is data-distribution-independent for brute-force cosine; this is fine for our question. Recall is not measurable here.
3. **Thermal.** Bench ran on AC power, idle background. No measurable throttling; single short run completed in under a minute total.
4. **`nomic-embed-text` not actually invoked.** We mimicked its 768-dim float32 shape; real embeddings cluster in the manifold, which affects recall but not vec0 latency.
5. **vec0 is brute-force.** `sqlite-vec` 0.1.x has no HNSW/IVF. Latency is O(N·dim). If we ever cross 500k chunks, revisit.

---

## 7. Follow-up items (absorbed into BACKLOG)

- **F-057** — periodic integrity check on `sqlite-vec` resolved version (caveat 1 above). Priority P2, track §4A-style hardening.
- **P-8 (from self-critique)** — R-VEC plan measured latency but not memory. Partial close: peak RSS during the 50k run was not captured (single-user Node process under 500 MB measured via Activity Monitor spot-check; not instrumented). Adequate for the GREEN decision but worth revisiting if v0.4.0 bloats.

---

## 8. Reproduce

```bash
# from ai-brain repo root
node scripts/spike-vec-smoke.mjs         # S-1 sanity — 4 toy vectors, ordered neighbours
node scripts/spike-vec-bench.mjs         # S-2..S-5 full benchmark (~45 s on M1 Pro)
cat tmp/vec-bench-results.json           # raw JSON
```

Outputs land in `tmp/` (gitignored). Re-run on a hardware refresh or `sqlite-vec` version bump.
