# AI Brain — Backlog

| Field | Value |
|-------|--------|
| **Document version** | v5.0-backlog (v0.4.0 closed · v0.5.0 next) |
| **Date** | 2026-05-09 |
| **Owner** | Arun |
| **Update cadence** | at every phase kickoff; whenever an item is promoted, deferred, or closed |
| **Revision** | v5.0 — v0.4.0 SHIPPED 2026-05-09 (tag `v0.4.0`); all 21 tasks closed; §1 rewritten to v0.5.0 framing; §5 accumulated v0.4.0 closures |

> Single source of truth for work that is **not in the active phase plan** but is known-needed, nice-to-have, or idea-captured. Items promoted from here land in `BUILD_PLAN.md` under a phase heading. Items closed here get a strikethrough and a closing commit SHA.

---

## 1. Active phase — v0.4.0 SHIPPED 2026-05-09; next is v0.5.0 APK + extension

v0.4.0 closed 2026-05-09 with all 21 tasks (T-0..T-19) shipped. Tag `v0.4.0` annotated on `main`; 23 commits + tag pushed to `origin/main`. 107 unit tests + 29 smoke assertions green. Full closure list in §5. Next lane = v0.5.0 APK + extension — no blockers; R-AUTH and R-CAP are both closed. Plan drafting has not started.

### Historical (v0.3.1 snapshot, for reference — all closed; see §5)

Full plan: [`docs/plans/v0.3.1-polish.md`](./docs/plans/v0.3.1-polish.md) (v2.0). Critique source: [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md).

### 1a. Polish (carried from v0.3.0)

| ID | Title | Source | Size | Severity | Notes |
|---|---|---|---|---|---|
| F-207 | Library bulk-select UI (multi-select + batch tag/collection/delete) | v0.3.0 scope | M | — | Backend primitives exist; plan §T-B-5. |
| B-301 | Title hyphenation post-processor | v0.3.0 QA finding | S | — | **Heuristic tightened per critique P-1**: fire only on `0 spaces && ≥ 2 hyphens`. |
| F-301 | Wire `CollectionEditor` into item detail | v0.3.0 partial | XS | — | Component exists at [`src/components/collection-editor.tsx`](./src/components/collection-editor.tsx). |
| F-302 | Inline tag editor on item detail | v0.3.1 polish | S | — | Reuse `addTagToItemAction` + `removeTagFromItemAction`. |

### 1b. Hardening (absorbed from 2026-05-08 self-critique)

| ID | Title | Critique ref | Severity | Track |
|---|---|---|---|---|
| F-042 | Bind Next dev server to `127.0.0.1` | A-1 | **P0** | §4A T-A-1 |
| F-043 | Session cookie expiry + `SameSite=Strict` | A-5 | P1 | §4A T-A-8 |
| F-044 | `globalThis` worker-boot guard (HMR-safe) | A-2 | P1 | §4A T-A-3 |
| F-045 | Periodic `sweepStaleClaims()` inside loop | A-3 | P1 | §4A T-A-4 |
| F-046 | Expose `attempts` on enrichment status endpoint | A-4 | P2 | §4A T-A-6 |
| F-047 | Log non-nodejs `instrumentation.ts` branch | A-11 | P2 | §4A T-A-5 |
| F-048 | Force `WAL` + `synchronous=NORMAL` per-connection | A-6 | P1 | §4A T-A-2 |
| F-034 | DB restore script + runbook (promoted from v0.10.0) | A-7 | P1 | §4A T-A-9 |
| F-049 | Exact-pin `sqlite-vec@0.1.6` before R-VEC | A-9 | P1 | §4A T-A-10 |
| F-050 | `data/errors.jsonl` rotation | A-10 | P2 | §4A T-A-11 |
| F-051 | Adopt `node:test` + `npm test` precedent | P-2 | P1 | §4A T-A-7 |
| F-052 | `scripts/smoke-v0.3.1.mjs` end-to-end smoke | P-4 | P1 | §4A T-A-13 |
| F-053 | Bulk actions revalidate `/collections/[id]` + `/settings/tags` | P-6 | P1 | §4B T-B-5b |
| F-054 | Release guard (clean tree + revert rehearsal) | P-12, M-4 | P1 | §4B T-B-6 |
| F-055 | Per-task `RUNNING_LOG.md` breadcrumbs | M-1 | P1 | Cross-cutting (append after every `T-*` commit) |
| F-056 | Refuse PIN overwrite without reset flag | A-12 | P2 | §4A T-A-12 |

### 1c. Deliberately deferred from critique to v0.4.0+

| Critique ref | Why deferred |
|---|---|
| A-8 (FTS5 LIKE fallback cleanup) | Revisit when hybrid search stresses FTS5 in v0.4.0 |
| P-11 (BACKLOG.md §5 archive rotation) | Not urgent before §5 has > ~20 closed items |
| P-5 (plan provenance nits) | Cosmetic; folded into v2.0 plan header |
| M-3 (cross-AI review) | Run if `gsd-review` is available; otherwise user spot-checks |

---

## 2. Research spikes queued

| ID | Question | Blocks | Priority | Plan |
|---|---|---|---|---|
| ~~R-VEC~~ | ~~sqlite-vec perf at 10k+ chunks on M1 Pro~~ | ~~v0.4.0~~ | — | **Closed 2026-05-08 GREEN** — see §5 |
| R-FSRS | SRS algorithm choice (SM-2 / FSRS) | v0.8.0 | P1 | — |
| R-CLUSTER | Topic clustering (JS vs Python vs LLM-only) | v0.6.0 | P2 | — |
| R-YT | yt-dlp reliability on YouTube auto-subs | v0.10.0 | P2 | — |
| R-WHISPER | whisper.cpp vs faster-whisper on M1 Pro | v0.10.0 | P2 | — |

---

## 3. Open self-critique findings

25 of 35 findings from [`docs/research/SELF_CRITIQUE.md`](./docs/research/SELF_CRITIQUE.md) remain open. Address opportunistically per phase rather than as a dedicated sprint — capture fix commit SHAs in that file, not here.

---

## 4. Ideas / seeds (not scheduled)

| ID | Idea | Notes |
|---|---|---|
| I-01 | Auto-collection suggestion from enrichment tags | Would sit behind a user toggle; needs R-CLUSTER first. |
| I-02 | Per-item "regenerate enrichment" button | Already safe: `enrichItem` is idempotent. UI work only. |
| I-03 | Export Obsidian vault directly (not just zip) | Requires D-4 (Obsidian vault path) — still open. |
| ~~F-057~~ | ~~Audit `sqlite-vec` resolved version on install~~ | **Closed 2026-05-08** under v0.4.0 T-0 (`e8f104a`): pinned to 0.1.9 with explicit overrides for all five platform sub-packages. `npm ls` shows `sqlite-vec-darwin-arm64@0.1.9 overridden`. |

---

## 5. Recently closed

Rotated 2026-05-08 (plan T-2 / P-11). Everything shipped in or before v0.3.1 + the R-VEC spike + F-057 lives in [`docs/archive/BACKLOG_ARCHIVE_2026-05.md`](./docs/archive/BACKLOG_ARCHIVE_2026-05.md). Future v0.4.0 closures accumulate here until the next rotation (rule of thumb: rotate when §5 crosses ~20 items).

### v0.4.0 closures (all shipped; rotate at next v0.5.0 kickoff)

**Pre-plan housekeeping:**
- ~~F-057~~ sqlite-vec pin audit → 0.1.9 with explicit platform overrides (`e8f104a`, T-0)
- ~~M-3~~ Cross-AI plan review (`150ccf5`, T-1) — 4 patches absorbed into plan v1.2; review file: [`docs/plans/v0.4.0-ask-REVIEW.md`](./docs/plans/v0.4.0-ask-REVIEW.md)
- ~~P-11~~ BACKLOG §5 archive rotation → `docs/archive/BACKLOG_ARCHIVE_2026-05.md` (`c603ec6`, T-2)
- ~~A-8~~ FTS5 LIKE-fallback removed from `searchItems()` (`e5f5b13`, T-6)

**Migrations + queue (T-3):**
- Migration 005 — `chunks_vec` (vec0 float[768]) + `chunks_rowid` TEXT→INT bridge (`6e4957a`)
- Migration 006 — `embedding_jobs` sibling queue + trigger on `enrichment_state='done'` + backfill clause

**Chunker + embeddings:**
- ~~F-011~~ markdown-aware semantic chunker, 400–800 tok, 10% overlap (`5637520`, T-4)
- ~~F-013~~ embedding pipeline: Ollama `nomic-embed-text`, 768-dim, batch=16, idempotent write of chunks + chunks_rowid + chunks_vec in single txn; retry 3× exp backoff with fail-fast on non-retriable codes (`cdf1d2f`, T-5)
- ~~F-012~~ backfill script for already-enriched items (`0eceda9`, T-16) — preflight exits 2/3 on daemon-down/model-missing

**Retrieve + Ask:**
- vec0 retriever with subquery-LIMIT pattern + L2→cosine (`b4749f0`, T-7)
- ~~ASK-1~~ / ~~DIG-4~~ /api/ask SSE route — Zod validation, session auth, thread preflight, user-message-write-before-stream (`80597c0`, T-8; `71e3676`, T-9; `ab35c7a`, T-10)
- ~~ASK-2~~ citation chips + scroll-to-chunk on item detail (`a17a68b`, T-12)
- ~~ASK-3~~ per-item chat at /items/[id]/ask (`9f6321c`, T-13)
- ~~ASK-4~~ thread persistence: create/append/list/delete cascade (`9f6321c`, T-13)

**Search + related:**
- ~~ORG-3~~ unified search (fts/semantic/hybrid via RRF k=60) + /api/search + /search mode toggle (`14b357f`, T-14)
- ~~EXP-3~~ related-items panel on item detail (mean chunk centroid, L2-normalised, vec0 MATCH excluding source) (`59f7ac2`, T-15)

**Release gate:**
- 13-assertion end-to-end smoke (`a2e00c9`, T-17)
- SC-7 latency bench scaffold + research doc (`030370c`, T-18) — live numbers pending user run
- Version bump 0.3.1 → 0.4.0 + annotated tag `v0.4.0` (`726ce21`, T-19)

---

## 6. Update rules

1. **Promote:** when an item enters an active phase plan, move its row into that phase's `BUILD_PLAN.md` section and leave a one-line breadcrumb here with a `→ promoted to v0.X.Y` note.
2. **Close:** strike through the row and add closing commit SHA, e.g. `~~F-302~~ Inline tag editor (closed abc1234)`. Move closed items into §5 at next phase rollover.
3. **Defer:** if a planned item is bumped to a later phase, record the new target version and the reason in a nested bullet.
4. **Never delete rows** — history matters for retrospectives.
