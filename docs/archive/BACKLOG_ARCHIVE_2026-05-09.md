# BACKLOG Archive — v0.4.0 closure set

| Field | Value |
|-------|--------|
| **Archive date** | 2026-05-09 |
| **Rotated by** | v0.5.0 plan T-0 |
| **Source** | `BACKLOG.md` §5 "Recently closed" prior to this date |
| **Covers** | v0.4.0 Ask (RAG) — all 21 tasks shipped between 2026-05-08 and 2026-05-09 |
| **Prior archive** | [`BACKLOG_ARCHIVE_2026-05.md`](./BACKLOG_ARCHIVE_2026-05.md) (v0.3.1 + R-VEC + F-057) |
| **Successor** | new `BACKLOG.md` §5 entries accumulate here until next rotation |

> Append-only snapshot. Preserves the v0.4.0 closure list so future retrospectives can reconstruct what shipped in that phase without spelunking through git log.

---

## v0.4.0 closures (all shipped 2026-05-08 → 2026-05-09)

### Pre-plan housekeeping

- ~~F-057~~ sqlite-vec pin audit → 0.1.9 with explicit platform overrides (`e8f104a`, T-0)
- ~~M-3~~ Cross-AI plan review (`150ccf5`, T-1) — 4 patches absorbed into plan v1.2; review file: [`docs/plans/v0.4.0-ask-REVIEW.md`](../plans/v0.4.0-ask-REVIEW.md)
- ~~P-11~~ BACKLOG §5 archive rotation → `docs/archive/BACKLOG_ARCHIVE_2026-05.md` (`c603ec6`, T-2)
- ~~A-8~~ FTS5 LIKE-fallback removed from `searchItems()` (`e5f5b13`, T-6)

### Migrations + queue (T-3)

- Migration 005 — `chunks_vec` (vec0 float[768]) + `chunks_rowid` TEXT→INT bridge (`6e4957a`)
- Migration 006 — `embedding_jobs` sibling queue + trigger on `enrichment_state='done'` + backfill clause

### Chunker + embeddings

- ~~F-011~~ markdown-aware semantic chunker, 400–800 tok, 10% overlap (`5637520`, T-4)
- ~~F-013~~ embedding pipeline: Ollama `nomic-embed-text`, 768-dim, batch=16, idempotent write of chunks + chunks_rowid + chunks_vec in single txn; retry 3× exp backoff with fail-fast on non-retriable codes (`cdf1d2f`, T-5)
- ~~F-012~~ backfill script for already-enriched items (`0eceda9`, T-16) — preflight exits 2/3 on daemon-down/model-missing

### Retrieve + Ask

- vec0 retriever with subquery-LIMIT pattern + L2→cosine (`b4749f0`, T-7)
- ~~ASK-1~~ / ~~DIG-4~~ /api/ask SSE route — Zod validation, session auth, thread preflight, user-message-write-before-stream (`80597c0`, T-8; `71e3676`, T-9; `ab35c7a`, T-10)
- ~~ASK-2~~ citation chips + scroll-to-chunk on item detail (`a17a68b`, T-12)
- ~~ASK-3~~ per-item chat at /items/[id]/ask (`9f6321c`, T-13)
- ~~ASK-4~~ thread persistence: create/append/list/delete cascade (`9f6321c`, T-13)

### Search + related

- ~~ORG-3~~ unified search (fts/semantic/hybrid via RRF k=60) + /api/search + /search mode toggle (`14b357f`, T-14)
- ~~EXP-3~~ related-items panel on item detail (mean chunk centroid, L2-normalised, vec0 MATCH excluding source) (`59f7ac2`, T-15)

### Release gate

- 13-assertion end-to-end smoke (`a2e00c9`, T-17)
- SC-7 latency bench scaffold + research doc (`030370c`, T-18) — live numbers pending user run
- Version bump 0.3.1 → 0.4.0 + annotated tag `v0.4.0` (`726ce21`, T-19)
- Tracker updates + closure log entry (`db89668`, T-20)

---

*End of archive. New closures accumulate in `BACKLOG.md` §5 from 2026-05-09 onward.*
