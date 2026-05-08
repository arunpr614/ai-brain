# AI Brain: Project retrospective (handover — 2026-05-07, post-v0.3.0)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none) |
| **Baseline** | (none) |

> **For the next agent:** This file captures project history, recurring patterns, known bugs, and hard-won lessons from the Planning → v0.3.0 arc — all shipped in a single intensive day (2026-05-07). Read the **watch-outs** section (§5) before making any changes.

## 1. Timeline (compressed)

All dates 2026-05-07 unless stated. The full narrative is in [`RUNNING_LOG.md`](../../RUNNING_LOG.md) (9 entries, append-only).

| Period | Focus |
|--------|-------|
| Morning — Planning | Build plan + design system + 4 P0 research spikes + self-critique. `arunpr614/ai-brain` repo created public. Decisions D-1..D-3 closed (full AI-assisted coding; public repo; M1 Pro / 32GB confirmed). |
| Morning — v0.0.1 Empirical Sanity | S-1 Next+SQLite; S-2 Ollama smoke; S-3 `unpdf` on a real Substack PDF; S-4 Capacitor share plugin check; S-5 `sqlite-vec` load. Caught 2 plan corrections: `@capgo/capacitor-share-target` not `@capawesome/*`; PDF paywall threshold 301 cpp not 180. |
| Afternoon — v0.1.0 Foundation | Shipped F-000..F-010: Next.js 16 + SQLite migrations + PIN auth + theme toggle + library page + ⌘K palette + 6h backup scheduler. Polish commits fixed 3 boot warnings (`fea85e1`) and SSR theme hydration + 8GB heap (`a578cfa`). |
| Afternoon — v0.2.0 Capture core | URL via Readability + PDF via unpdf + Note + FTS5 search + boilerplate strip + md export + unified `/capture` tabs. |
| Late afternoon — R-LLM-b | Qwen 3 8B vs Qwen 2.5 7B benchmark. Qwen 3 kept truncating JSON because `<think>` mode consumed `num_predict`. Fix: pass `think:false` at top level unconditionally. Decision: default Qwen 2.5 7B for v0.3.0; reserve Qwen 3 for v0.6.0 GenPage long-form. |
| Evening — v0.3.0 Intelligence | Async enrichment queue (migration 003 + trigger + worker) + pipeline (summary/category/title/quotes/auto-tags) + dual-pane item view + `EnrichingPill` + tags/collections CRUD + bulk `.zip` export. F-207 bulk-ops UI explicitly deferred to v0.3.1. |
| Night — Ship + handover | v0.3.0 committed (`5d1c390`), pushed to main. Handover package created (this document). |

## 2. Recurring themes

1. **Empirical verification beats planning** — The v0.0.1 sanity morning caught two wrong-in-plan items (plugin name, PDF threshold) before they cost a full implementation phase. Keep this discipline: for any external dependency, run a 15-minute smoke test before writing against it.
2. **Local-only is a feature, not a limitation** — Every time a "what if we just deploy it" shortcut appeared (Vercel for styling, hosted Ollama for speed), the right call was to stay local. Pre-v1.0.0 means no hosting; v1.0.0 is a deliberate gate decision.
3. **Next.js 16 is new and has convention shifts** — `middleware.ts` became `proxy.ts`, Turbopack is the default dev runtime, and `serverExternalPackages` is required for native modules. Expect more paper-cuts; search official docs before assuming a StackOverflow answer from 2024 applies.
4. **React 19 purity lint is strict** — `useState({ … Date.now() })` triggers it. Always lazy-init: `useState(() => ({ … }))`.
5. **Ollama model behaviors differ meaningfully** — Qwen 3 needs `think:false` or it burns output tokens on a hidden reasoning trace. Qwen 2.5 ignores the flag. Always test a new model against the locked prompt in `src/lib/enrich/prompts.ts`.
6. **Async queue > inline enrichment** — User-facing capture is instant; enrichment runs in a background worker with `EnrichingPill` polling. The item appears in the library immediately; the AI digest fills in over ~10–30s per item.
7. **Transactional writes for multi-column updates** — `enrichItem` updates `items.summary/category/title/quotes` + `item_tags` + `llm_usage` in one transaction. If any step fails, none persist.
8. **FTS5 + LIKE fallback** — FTS5 can be absent or misbehave after schema drift. `searchItems` degrades gracefully to LIKE.

## 3. Incident / decision index

| File / commit | Title or summary |
|---------------|------------------|
| [`docs/research/SELF_CRITIQUE.md`](../../docs/research/SELF_CRITIQUE.md) (v0.1.2-critique) | 35 adversarial findings across the research spikes; 8 RESOLVED, 25 open and prioritized. |
| [`docs/research/EMPIRICAL_SANITY.md`](../../docs/research/EMPIRICAL_SANITY.md) | v0.0.1 morning report — S-1..S-5 results and the two plan corrections. |
| [`docs/research/llm-b-qwen3.md`](../../docs/research/llm-b-qwen3.md) | R-LLM-b decision + locked prompt template (§7). |
| commit `fea85e1` | v0.1.1 polish — silenced 3 boot warnings (workspace root, Next 16 proxy rename, missing instrumentation hook). |
| commit `a578cfa` | v0.1.2 dev stability — SSR theme hydration fix + `NODE_OPTIONS='--max-old-space-size=8192'`. |
| commit `5d1c390` | v0.3.0 final — tags/collections CRUD + bulk zip export. |

## 4. Mitigations already in place

| Issue class | Mitigation |
|-------------|------------|
| Ollama down mid-enrichment | `OLLAMA_DOWN_BACKOFF_MS=30000` back-off in worker; job stays `pending` and retries. |
| Worker crashes mid-job | `STALE_CLAIM_MS=90000` sweep reclaims jobs stuck `running` past the threshold. |
| LLM returns malformed JSON | `generateJson<T>()` retries once at `temperature=0.1` and runs zod validation. After `MAX_ATTEMPTS=3` the job fails and is visible in `enrichment_jobs.status='failed'`. |
| Qwen 3 thinking-mode truncation | Top-level `think:false` in every Ollama payload (unconditional — Qwen 2.5 ignores it safely). |
| V8 OOM on long dev session | `NODE_OPTIONS='--max-old-space-size=8192'` baked into `package.json` scripts. |
| SSR theme hydration warning | `suppressHydrationWarning` on `<html>` because pre-hydration script legitimately overrides server-rendered `data-theme`. |
| Turbopack + native modules | `serverExternalPackages: ["better-sqlite3", "sqlite-vec"]` in `next.config.ts`. |
| DB loss | 6h `VACUUM INTO` scheduler with 28-snapshot retention. |
| Public repo secret leak | Only secret is PIN, stored hashed. `.env.local` and `data/` gitignored. |
| Edge runtime + `node:crypto` | Two-layer auth: Edge checks cookie presence; Node routes verify HMAC signature. |

## 5. Watch-outs for the next agent

1. **The repo is public** (`github.com/arunpr614/ai-brain`). Never commit the user's PIN, the contents of `data/`, or anything under `.env.local`. Treat every handover file as world-readable.
2. **Code is SoT over docs.** `BUILD_PLAN.md` was written before the v0.0.1 empirical phase and has two known inaccuracies (plugin name, PDF threshold). Always check `src/` before trusting a plan detail.
3. **Qwen 3 without `think:false` will truncate JSON.** If a future agent switches to Qwen 3 or another reasoning model, verify the flag is passed at the top level of the Ollama payload (not nested inside `options`).
4. **The enrichment AFTER INSERT trigger** on `items` auto-enqueues — do not manually INSERT into `enrichment_jobs` from capture code.
5. **Turbopack stale cache after renames** can produce ghost errors. Fix: `rm -rf .next/dev .next/cache` then restart.
6. **Next.js 16 conventions:** `middleware.ts` → `proxy.ts`; function export must be named `proxy`, not `middleware`. `register()` in `src/instrumentation.ts` is where server startup hooks go.
7. **F-207 (library bulk-select UI) is deferred** to v0.3.1 — not forgotten. Ditto the title hyphenation post-processor (Qwen 2.5 outputs `Growth-Loops-Messy-Draft` from filename slugs) and wiring `src/components/collection-editor.tsx` into `src/app/items/[id]/page.tsx`.
8. **`useState` with a fresh object or `Date.now()`** must be lazy — React 19 lint will flag it.
9. **JSZip output type** for streaming HTTP responses in Next.js 16: use `uint8array`, then wrap `new Blob([new Uint8Array(buf)], { type: "application/zip" })` to satisfy `BodyInit`. `nodebuffer` caused a type error.
10. **The `ItemRow` type** is exported from `@/db/client`, not `@/db/items`. Both modules reference it; the canonical export is `client.ts`.
11. **Running log discipline:** invoke the `running-log-updater` skill after every milestone. The log has 9 entries to date — future agents rely on reading it top-to-bottom to reconstruct journey context.
12. **PARA model (project + area)** is approved (per auto-memory) — keep this in mind when designing the v0.6.0 clustering work.

## 6. Related reading

- [04_Implementation_Roadmap_Consolidated.md](./04_Implementation_Roadmap_Consolidated.md) — active program context
- [`RUNNING_LOG.md`](../../RUNNING_LOG.md) — full narrative
- [`docs/research/`](../../docs/research/) — all research spike outputs
