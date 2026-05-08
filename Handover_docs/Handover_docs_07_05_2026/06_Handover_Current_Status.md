# AI Brain: Current status (handover — 2026-05-07, post-v0.3.0)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none) |
| **Baseline** | (none) |

> **For the next agent:** Read this first for "where are we?" — what is built, what is open, and what you should do next. Commit pin for this snapshot: `5d1c390` on `main`.

## 1. What is built and shipped

| Area | Status | Notes / evidence |
|------|--------|------------------|
| Planning + design + research | **Shipped** | [`BUILD_PLAN.md`](../../BUILD_PLAN.md), [`DESIGN.md`](../../DESIGN.md), [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md), 4 P0 spikes + self-critique under [`docs/research/`](../../docs/research/) |
| v0.0.1 Empirical Sanity | **Shipped + verified** | [`docs/research/EMPIRICAL_SANITY.md`](../../docs/research/EMPIRICAL_SANITY.md) |
| v0.1.0 Foundation | **Shipped + smoke-tested** | Commits `c5f699e` → `fea85e1` → `a578cfa`. Next 16 + SQLite + migrations + PIN auth + theme + library + ⌘K + 6h backup. |
| v0.2.0 Capture core | **Shipped + smoke-tested** | Commit `e3f810a`. URL / PDF / Note capture + strip + FTS5 + md export + unified `/capture`. |
| v0.3.0 Intelligence — enrichment | **Shipped** | Commit `a7c28e5`. Ollama client + queue + pipeline (summary/category/title/quotes/tags) + dual-pane view + `EnrichingPill`. |
| v0.3.0 Intelligence — taxonomy CRUD | **Shipped** | Commit `5d1c390`. Tags + collections CRUD in `/settings/tags` and `/settings/collections`. `src/components/collection-editor.tsx` exists. |
| v0.3.0 Intelligence — bulk zip export | **Shipped** | `/api/library/export.zip` — JSZip stream, Obsidian-ready. Wired into `/settings` Export section. |
| Typecheck / lint / build | **Passing** | `npm run typecheck && npm run lint && npm run build` all clean at `5d1c390`. 14 routes + 4 API endpoints compile. |

## 2. What is deferred or open

| Item | Source | Detail |
|------|--------|--------|
| **F-207** library bulk-select UI (multi-select + batch tag/collection/delete) | v0.3.0 scope → deferred to v0.3.1 | Backend primitives exist (`tags.ts`, `collections.ts`, items.ts); no UI yet. |
| Title hyphenation post-processor | Known v0.3.0 quirk | Qwen 2.5 outputs `Growth-Loops-Messy-Draft` from filename slugs. Add a post-process step in `src/lib/enrich/pipeline.ts` to de-hyphenate + title-case when title contains more hyphens than spaces. |
| Wire `CollectionEditor` into item detail | v0.3.0 partial | Component at [`src/components/collection-editor.tsx`](../../src/components/collection-editor.tsx) is not yet rendered on [`src/app/items/[id]/page.tsx`](../../src/app/items/[id]/page.tsx). |
| Inline tag editor on item detail | v0.3.1 polish | Currently tags are viewable on the item page but editing requires going to `/settings/tags`. |
| `BACKLOG.md` file | Tracker convention | Create at v0.3.1 kickoff per `PROJECT_TRACKER.md` §2. |
| R-VEC spike | Blocks v0.4.0 | sqlite-vec perf benchmark at 10k+ chunks. Output file: `docs/research/vector-bench.md`. |
| R-FSRS, R-CLUSTER, R-YT, R-WHISPER | Later phases | See [04_Implementation_Roadmap_Consolidated.md](./04_Implementation_Roadmap_Consolidated.md) §3. |
| 25 open findings from `SELF_CRITIQUE.md` | Audit | Prioritized but unresolved. Address opportunistically per phase. |

## 3. Immediate next actions (incoming agent)

1. **Confirm HEAD and working tree** — `git log --oneline -1` should show `5d1c390`. If not, something landed after this handover; read recent commits before proceeding.
2. **Smoke test Ollama + dev server** — start Ollama (`ollama serve`), then `npm run dev` from `ai-brain/`. Capture one URL to verify the enrichment worker is alive. Poll `/api/items/[id]/enrichment-status` until `done`.
3. **Append a `RUNNING_LOG.md` entry** using the `running-log-updater` skill **before** starting v0.3.1 work. The last entry should reference this handover.
4. **Start v0.3.1 polish** with the smallest user-visible fix first: wire `CollectionEditor` into `src/app/items/[id]/page.tsx`. Commit atomically.
5. **Plan F-207 bulk-ops UI** — sketch in `BUILD_PLAN.md` (bump to v0.3.1-plan) before implementing. Tests: select-all, bulk tag attach, bulk collection attach, bulk delete with confirm.
6. **Do not start v0.4.0** until R-VEC spike lands. It is the blocker per [`PROJECT_TRACKER.md`](../../PROJECT_TRACKER.md) §1.

## 4. Active endpoints

| Path | Method | Auth | Notes |
|------|--------|------|-------|
| `/` | GET | Session cookie | Library list with search + `EnrichingPill` per card |
| `/setup` | GET/POST | None (blocked after first setup) | First-run PIN creation |
| `/unlock` | GET/POST | None | PIN entry for existing install |
| `/capture` | GET | Session cookie | Unified URL / PDF / Note tabs |
| `/search` | GET | Session cookie | FTS5-backed search results |
| `/items/[id]` | GET | Session cookie | Dual-pane: original + AI digest |
| `/settings` | GET | Session cookie | Theme + backup config + export + about |
| `/settings/tags` | GET/POST | Session cookie | Tag CRUD + promote auto→manual |
| `/settings/collections` | GET/POST | Session cookie | Collection CRUD |
| `/collections/[id]` | GET | Session cookie | Collection detail view |
| `/api/capture/pdf` | POST | Session cookie | Multipart PDF upload → `unpdf` → item insert |
| `/api/items/[id]/export.md` | GET | Session cookie | Single-item YAML+markdown export |
| `/api/items/[id]/enrichment-status` | GET | Session cookie | `{ status, attempt }` for `EnrichingPill` polling |
| `/api/library/export.zip` | GET | Session cookie | Bulk zip of markdown exports (Obsidian-ready) |

## 5. Program status line

`Build plan v0.3.0-plan | Roadmap v0.4.0-roadmap | Tracker v0.4.0-tracker | Handover v1.0 | HEAD 5d1c390 | package.json 0.3.0`

Primary trackers: [`BUILD_PLAN.md`](../../BUILD_PLAN.md) · [`ROADMAP_TRACKER.md`](../../ROADMAP_TRACKER.md) · [`PROJECT_TRACKER.md`](../../PROJECT_TRACKER.md) · [`RUNNING_LOG.md`](../../RUNNING_LOG.md).
