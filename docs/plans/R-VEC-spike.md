# R-VEC — sqlite-vec perf spike (blocker for v0.4.0)

| Field | Value |
|-------|--------|
| **Document version** | R-VEC-plan v1.0 |
| **Date** | 2026-05-08 |
| **Owner** | Arun (full AI-assisted) |
| **Priority** | P1 (blocks v0.4.0 Ask/RAG) |
| **Target output** | `docs/research/vector-bench.md` |
| **Expected timebox** | ~half a day of focused dev; hard cap at one full day |

---

## 1. Question to answer

**At 10k+ embedding chunks on my Mac (M1 Pro, 32 GB RAM), is `sqlite-vec` fast enough to back real-time Ask (RAG) queries, or do I need to swap to a different vector store before starting v0.4.0?**

Concretely we need three numbers:

| Metric | Success threshold | Rationale |
|---|---|---|
| p50 top-k=8 cosine query latency | **< 80 ms** | Leaves headroom for LLM call to dominate the total Ask latency budget (~1.5 s target). |
| p95 top-k=8 cosine query latency | **< 200 ms** | Per the `PROJECT_TRACKER.md` §6 risk ("sqlite-vec perf collapses at scale — p50 query > 200ms on 10k chunks"). Using p95 gives a stricter bar that matches a live-feel Ask UX. |
| Index build wall time for 10k chunks | **< 30 s cold; < 5 s warm-reopen** | Ensures bulk re-embed on model upgrade isn't a half-hour chore. |

If any metric fails by more than 2× at 10k chunks, escalate to alternatives (FAISS via a Python sidecar, or LanceDB embedded). Decision gate at step §6.

---

## 2. Environment assumptions (pinned)

- MacBook Pro 16" 2021, M1 Pro, 32 GB RAM, 455 GB free, macOS 26.4.1
- Node.js / Next.js 16 stack per [`Handover_docs/Handover_docs_07_05_2026/02_Systems_and_Integrations.md`](../../Handover_docs/Handover_docs_07_05_2026/02_Systems_and_Integrations.md)
- `better-sqlite3` already installed — spike only adds `sqlite-vec` native extension
- Embedding model: Ollama local, `nomic-embed-text` (768-dim) as the primary candidate; `mxbai-embed-large` (1024-dim) as a fallback. Both are cheap locally.

---

## 3. Scope

### In scope
- Install `sqlite-vec` extension and confirm it loads from `better-sqlite3`
- Build a one-off benchmark script outside the app's schema so nothing leaks into production data
- Measure on **three chunk-count tiers**: 1k, 10k, 50k
- Measure on **one embedding dimension** (768) — add 1024 only if 768 passes
- Produce a reproducible benchmark script + results file

### Out of scope
- Production schema migration (that's v0.4.0 planning work, not the spike)
- Retrieval quality (recall@k, MRR) — latency only; quality will be measured in v0.4.0 alongside prompt tuning
- Re-ranking strategies
- Hybrid search (BM25 + vector) — v0.4.0 integration concern
- Any Ask UI or RAG prompt work

---

## 4. Method

### S-1. Install + load smoke test
1. `npm install sqlite-vec` and verify the prebuilt binary exists for darwin-arm64.
2. Write `scripts/spike-vec-smoke.mjs`: open an in-memory `better-sqlite3` DB, `loadExtension(sqliteVec.getLoadablePath())`, create a `virtual table vec_test using vec0(embedding float[4])`, insert four toy vectors, run one `MATCH` query, print the result.
3. **Exit criterion:** query returns ordered neighbours without error.

### S-2. Synthetic dataset generation
1. Write `scripts/spike-vec-bench.mjs` that generates N random 768-dim float32 vectors (`crypto.randomBytes` → normalise) in batches of 1k.
2. Three runs: `N ∈ {1_000, 10_000, 50_000}`. Persist each to a tmp file DB (`./tmp/vec-bench-N.db`) so warm-reopen can be measured.
3. Measure wall time of: (a) batch insert, (b) optional reindex, (c) DB size on disk.

### S-3. Query latency harness
1. Pre-generate 100 random query vectors (same dimension, same normalisation).
2. Warm-up: 10 queries (not timed).
3. Timed run: 1000 queries of `SELECT rowid FROM vec_test ORDER BY embedding <=> ? LIMIT 8` (or the `MATCH … k=8` form depending on `sqlite-vec` surface at spike time — confirm in S-1).
4. Record per-query ns via `process.hrtime.bigint()`; compute min / p50 / p95 / p99 / max.
5. Repeat across N tiers and record in a table.

### S-4. Warm-reopen cost
1. Close DB, reopen, run one query, time the first query vs the steady-state p50.
2. Record cold-start latency alongside the steady numbers.

### S-5. Concurrency sanity
1. Fire 4 parallel worker threads each doing 250 queries.
2. Confirm no sqlite `database is locked` errors.
3. Record aggregate throughput (queries/sec).

### S-6. Write `docs/research/vector-bench.md`

Required sections:
1. Question, environment, dataset, method (mirroring §1–§4 here)
2. Results table (three N tiers × {insert time, disk size, p50, p95, p99, cold-start, concurrent throughput})
3. Verdict against the three thresholds in §1
4. **If PASS:** green-light v0.4.0 and record the chosen embedding model + dimension
5. **If FAIL:** note which threshold failed by how much, and which alternative to evaluate next (ranked: FAISS via Python sidecar > LanceDB > Chroma embedded)
6. Repro commands

---

## 5. Deliverables

| Artifact | Path |
|---|---|
| Smoke script | `scripts/spike-vec-smoke.mjs` |
| Benchmark script | `scripts/spike-vec-bench.mjs` |
| Raw result JSON (untracked; regenerable) | `tmp/vec-bench-results.json` in `.gitignore` |
| Written findings | `docs/research/vector-bench.md` |
| Commit | `docs(research, R-VEC): sqlite-vec benchmark at 1k/10k/50k chunks` |

The two scripts stay in-repo so the benchmark is re-runnable on a laptop refresh or `sqlite-vec` version bump.

---

## 6. Decision gate

At the end of the spike, the written findings doc must conclude with **one of three decisions**, named explicitly:

- **GREEN — proceed to v0.4.0 on sqlite-vec.** All three thresholds pass with ≥ 20% margin.
- **YELLOW — proceed but cap corpus size.** Thresholds pass at 10k but fail at 50k. Note the ceiling; revisit before the library grows past that.
- **RED — swap vector store.** One or more thresholds fail at 10k. Escalate to a follow-up spike R-VEC-2 scoped to the next-ranked alternative (FAISS sidecar first).

Whatever the verdict, update:
- `PROJECT_TRACKER.md` §3 — mark `R-VEC` row `●` with the verdict letter appended
- `BACKLOG.md` §2 — strikethrough R-VEC and move to §5 Recently closed
- `BUILD_PLAN.md` — unblock or re-scope the v0.4.0 plan accordingly

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| `sqlite-vec` prebuilt binary missing for macOS-arm64 at install time | Fall back to building from source; budget is still within one day. Record build time in findings. |
| Benchmark vectors aren't representative (synthetic random vs real embeddings) | Acceptable for latency-only measurement (sqlite-vec doesn't learn from data distribution). Note the caveat in the findings doc. Recall@k is explicitly out of scope. |
| Thermal throttling skews numbers | Run on AC power; plug in before the harness starts; record mac temperature before/after via `sudo powermetrics` if available, else just note the caveat. |
| Turbopack dev mode interferes | Run bench scripts directly with `node scripts/...`, not through `next dev`. |
| Results depend heavily on `sqlite-vec` version | Pin the version in `package.json` during the spike; note the version in findings. |

---

## 8. What happens next

- If **GREEN**: draft `docs/plans/v0.4.0-ask.md` (Ask/RAG) using sqlite-vec as the given. Separate plan, not this doc.
- If **YELLOW**: same as above but add a corpus-size guard to the capture pipeline that warns when the library exceeds the validated ceiling.
- If **RED**: write `docs/plans/R-VEC-2-faiss-sidecar-spike.md` and park v0.4.0 until that spike completes. Update `ROADMAP_TRACKER.md` to reflect the slip.
