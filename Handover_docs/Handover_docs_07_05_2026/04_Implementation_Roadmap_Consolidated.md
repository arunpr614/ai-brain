# AI Brain: Implementation roadmap (consolidated — 2026-05-07)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none) |
| **Baseline** | (none) |

> **For the next agent:** This file is a **pointer hub** — it consolidates links to all active program documents, release tracking, and quality gates. It is not itself the roadmap; it tells you where to find the current roadmap.

## 1. Active program source of truth

| Document | Status | Role |
|----------|--------|------|
| [`BUILD_PLAN.md`](../../BUILD_PLAN.md) (v0.3.0-plan, **Active**) | Authoritative | Full phase-by-phase build plan through v1.0.0 gate. §15 contains locked-in tech decisions. |
| [`ROADMAP_TRACKER.md`](../../ROADMAP_TRACKER.md) (v0.4.0-roadmap, **Active**) | Authoritative | Feature lanes by version — what ships in which release. |
| [`PROJECT_TRACKER.md`](../../PROJECT_TRACKER.md) (v0.4.0-tracker, **Active**) | Authoritative | Tactical "what's in flight / blocked / next" snapshot. Updated at phase boundaries. |
| [`RUNNING_LOG.md`](../../RUNNING_LOG.md) (**Append-only**) | Authoritative narrative | 9 timestamped entries covering Planning → v0.3.0. Read top-to-bottom for journey context. |
| [`DESIGN.md`](../../DESIGN.md) (v0.1.0-design, **Active**) | Authoritative | `getdesign.md`-style YAML-frontmatter design tokens + interaction patterns. |
| [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) (v0.1.0-design, **Active**) | Authoritative | UX contract + 6-pillar acceptance checklist (color, type, spacing, motion, a11y, responsiveness). |
| [`STRATEGY.md`](../../STRATEGY.md) | Historical | Original strategic rationale. |
| [`FEATURE_INVENTORY.md`](../../FEATURE_INVENTORY.md) | Historical | Feature-by-feature comparison of Recall + Knowly. |
| [`PROJECT_CLOSURE.md`](../../PROJECT_CLOSURE.md) | Historical | Closure marker from the prior project scope. |
| `BACKLOG.md` (not yet created) | Pending | Create at v0.3.1 kickoff for deferred items. |

## 2. Release / milestone status matrix

| Release | Theme | Status | Handover note |
|---------|-------|--------|---------------|
| Planning | Plan + design + research queue | **Shipped** (2026-05-07) | All 4 P0 research spikes complete + self-critique. |
| **v0.0.1** Empirical Sanity | Morning de-risk on architecture, model stack, PDFs, APK plugin | **Shipped** (2026-05-07) | S-1..S-5 all green. Caught 2 plan corrections (plugin name, PDF threshold). |
| **v0.1.0** Foundation | Next.js 16 + SQLite + migrations + PIN auth + theme + library + ⌘K + 6h backup | **Shipped** (2026-05-07, commit `c5f699e` + polish `fea85e1` + `a578cfa`) | F-000..F-010 all green. Smoke-tested end-to-end. |
| **v0.2.0** Capture core | URL (Readability) + PDF (unpdf, 301 cpp paywall guard) + Note + header/footer strip + FTS5 search + markdown export + unified `/capture` tabs | **Shipped** (2026-05-07, commit `e3f810a`) | Smoke-tested. |
| **v0.3.0** Intelligence | Ollama client + enrichment queue + pipeline (summary/category/title/tags/quotes) + dual-pane view + enriching pill + tags/collections CRUD + bulk zip export | **Shipped** (2026-05-07, commits `a7c28e5` + `5d1c390`) | F-207 bulk-ops UI deferred to v0.3.1. |
| **v0.3.1** Polish | Title hyphenation fix; wire `collection-editor` into item detail; inline tag editor; F-207 bulk-select UI | **Planned** | First task after this handover. |
| **v0.4.0** Ask (RAG) | sqlite-vec + chat UI + RAG pipeline | **Planned** | Blocked by R-VEC spike. |
| **v0.5.0** APK + extension | Capacitor APK + Android share target + mDNS + CSRF + token rotation | **Planned** | Plugin confirmed: `@capgo/capacitor-share-target@^8.0.30`. JDK 21 required. |
| **v0.6.0** GenPage + clusters | Qwen 3 8B (with `think:false`) long-form generator + topic clustering | **Planned** | Blocked by R-CLUSTER. |
| **v0.7.0** GenLink | Cross-item link suggestions | **Planned** | — |
| **v0.8.0** Review (SRS) | Spaced repetition cards + scheduler | **Planned** | Blocked by R-FSRS. |
| **v0.9.0** Flow + proactive | Daily review flow + proactive surfacing | **Planned** | — |
| **v0.10.0** Breadth + graph + Obsidian | YouTube ingest + whisper.cpp + graph view + Obsidian vault sync | **Planned** | Blocked by R-YT, R-WHISPER. |
| **v1.0.0** Solid-product gate | Decision checkpoint: keep local, or host? | **Planned** | Gate, not a build. |

## 3. Research spikes (queue and status)

| ID | Question | Blocks | Status | Output |
|----|----------|--------|--------|--------|
| R-LLM | Which Ollama models run on M1 Pro / 32GB? | v0.3.0 | **Shipped** | [`docs/research/llm-sizing.md`](../../docs/research/llm-sizing.md) + empirical verify in v0.0.1 |
| R-LLM-b | Qwen 3 8B vs Qwen 2.5 7B head-to-head | v0.3.0 default | **Shipped** | [`docs/research/llm-b-qwen3.md`](../../docs/research/llm-b-qwen3.md) (§7 is the locked prompt) |
| R-CAP | Android share plugin on Android 14+? | v0.5.0 | **Shipped** | [`docs/research/android-share.md`](../../docs/research/android-share.md) — plugin corrected to `@capgo/capacitor-share-target` |
| R-PDF | Best PDF extractor for messy Substack PDFs | v0.2.0 | **Shipped** | [`docs/research/pdf-extraction.md`](../../docs/research/pdf-extraction.md) — `unpdf` + 301 cpp paywall threshold |
| R-AUTH | LAN auth model | v0.5.0 | **Shipped** | [`docs/research/lan-auth.md`](../../docs/research/lan-auth.md) |
| R-SELF-CRITIQUE | Adversarial review of own research | — | **Shipped** | [`docs/research/SELF_CRITIQUE.md`](../../docs/research/SELF_CRITIQUE.md) — 35 findings, 8 RESOLVED, drives remediations |
| R-VEC | sqlite-vec perf at 10k+ chunks | v0.4.0 | **Open** | `docs/research/vector-bench.md` (to be written) |
| R-FSRS | SRS algorithm choice | v0.8.0 | **Open** | `docs/research/srs-algorithm.md` |
| R-CLUSTER | Topic clustering approach | v0.6.0 | **Open** | `docs/research/clustering.md` |
| R-YT | yt-dlp reliability | v0.10.0 | **Open** | `docs/research/youtube.md` |
| R-WHISPER | whisper.cpp vs faster-whisper | v0.10.0 | **Open** | `docs/research/whisper.md` |

## 4. Verification and quality gates

| Artifact | Location | Status |
|----------|----------|--------|
| [`docs/research/EMPIRICAL_SANITY.md`](../../docs/research/EMPIRICAL_SANITY.md) | v0.0.1 morning gate | **Shipped** — S-1..S-5 green |
| [`docs/research/SELF_CRITIQUE.md`](../../docs/research/SELF_CRITIQUE.md) | Self-critique report | **Shipped** — 8/35 findings resolved; 25 open, prioritized |
| Typecheck (`npm run typecheck`) | CI-equivalent local gate | **Passing** at `5d1c390` |
| Lint (`npm run lint`) | CI-equivalent local gate | **Passing** at `5d1c390` |
| Build (`npm run build`) | Production bundle | **Passing** at `5d1c390` — 14 routes + 4 API endpoints |
| Runtime smoke test | Manual end-to-end | **Passed** at v0.3.0 ship |

## 5. Operator playbooks (cross-links)

| Doc | Use when |
|-----|----------|
| [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) | Starting local dev / shipping a release |
| [08_Debugging_and_Incident_Response.md](./08_Debugging_and_Incident_Response.md) | Something breaks (Ollama down, stale cache, migration fails) |
| [`RUNNING_LOG.md`](../../RUNNING_LOG.md) | Appending a new narrative entry after a milestone — use the `running-log-updater` skill |

## 6. What not to do

- **Do not treat planning docs as code** — when they disagree, code wins. `BUILD_PLAN.md` was written before v0.0.1 empirical sanity and has two known inaccuracies (plugin name, PDF threshold) that the empirical phase corrected. The **code** reflects the correct values.
- **Do not enqueue enrichment jobs manually** — the AFTER INSERT trigger on `items` does it automatically. Manual inserts into `enrichment_jobs` risk duplicate keys.
- **Do not call `getDb()` inside Edge routes** — `src/proxy.ts` is Edge; `better-sqlite3` is Node-only. Edge code reads cookie presence only.
- **Do not remove `NODE_OPTIONS='--max-old-space-size=8192'`** from `package.json` scripts — V8 OOMs on long dev sessions without it (observed ~38 min into a session).
- **Do not strip `serverExternalPackages: ["better-sqlite3", "sqlite-vec"]`** from `next.config.ts` — Turbopack cannot bundle native modules.
- **Do not deploy to Vercel or any host before v1.0.0** — hard constraint. The app is local-only by design.
- **Do not commit `data/` or `.env.local`** — they are gitignored for a reason.
- **Do not re-run migrations in production without a backup** — the backup scheduler runs every 6h, but during development it is easy to delete the DB accidentally.
