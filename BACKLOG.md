# AI Brain — Backlog

| Field | Value |
|-------|--------|
| **Document version** | v4.0-backlog (v0.4.0 kickoff) |
| **Date** | 2026-05-08 |
| **Owner** | Arun |
| **Update cadence** | at every phase kickoff; whenever an item is promoted, deferred, or closed |
| **Revision** | v4.0 — v0.4.0 execution started; §5 rotated to `docs/archive/BACKLOG_ARCHIVE_2026-05.md` (P-11 closed); F-057 closed under T-0 |

> Single source of truth for work that is **not in the active phase plan** but is known-needed, nice-to-have, or idea-captured. Items promoted from here land in `BUILD_PLAN.md` under a phase heading. Items closed here get a strikethrough and a closing commit SHA.

---

## 1. Active phase — v0.4.0 Ask (RAG) planned, not yet in execution

v0.3.1 shipped 2026-05-08. R-VEC spike closed **GREEN** on 2026-05-08. **Plan drafted 2026-05-08:** [`docs/plans/v0.4.0-ask.md`](./docs/plans/v0.4.0-ask.md) (v1.0, 21 tasks). Execution kicks off after T-0 (F-057 pin audit) clears.

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

### v0.4.0 in progress (closing as tasks land)

- ~~F-057~~ sqlite-vec pin audit → 0.1.9 with explicit overrides (`e8f104a`, T-0)
- ~~M-3~~ Cross-AI plan review (`150ccf5`, T-1) — 4 patches absorbed into plan v1.2; review file: [`docs/plans/v0.4.0-ask-REVIEW.md`](./docs/plans/v0.4.0-ask-REVIEW.md)

---

## 6. Update rules

1. **Promote:** when an item enters an active phase plan, move its row into that phase's `BUILD_PLAN.md` section and leave a one-line breadcrumb here with a `→ promoted to v0.X.Y` note.
2. **Close:** strike through the row and add closing commit SHA, e.g. `~~F-302~~ Inline tag editor (closed abc1234)`. Move closed items into §5 at next phase rollover.
3. **Defer:** if a planned item is bumped to a later phase, record the new target version and the reason in a nested bullet.
4. **Never delete rows** — history matters for retrospectives.
