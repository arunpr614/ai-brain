# AI Brain: Architecture (handover — 2026-05-07, post-v0.3.0)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none — first handover) |
| **Baseline** | (none — first handover) |

> **For the next agent:** This document is the **technical topology** source of truth. Start here to understand how AI Brain is structured and where data flows. Code is authoritative; planning docs (`BUILD_PLAN.md`, `DESIGN.md`) describe intent.

## 1. Problem statement

AI Brain is a **local-first personal knowledge app** that combines the features of Recall.it (capture + smart collections) and Knowly (spaced-repetition + knowledge graph) into a single tool. Hard constraints: (a) runs 100% on the user's Mac with no cloud dependency until v1.0.0; (b) sideloadable Android APK via Capacitor for mobile capture; (c) single-user (the owner); (d) non-technical user, full AI-assisted build. LLM inference is local via Ollama (no API costs).

## 2. System topology

```mermaid
graph TD
    User["User (browser or Android APK)"]
    Next["Next.js 16 App Router<br/>(React 19, Turbopack)"]
    Proxy["src/proxy.ts<br/>(Edge runtime — cookie presence check)"]
    Actions["Server Actions + API routes<br/>(Node runtime)"]
    Auth["lib/auth.ts<br/>(PBKDF2 + HMAC session)"]
    DB[("SQLite<br/>data/brain.sqlite")]
    FTS[("FTS5 virtual table<br/>items_fts")]
    Queue[("enrichment_jobs<br/>queue table")]
    Worker["Enrichment worker<br/>(poll loop, 1s)"]
    Ollama["Ollama server<br/>localhost:11434<br/>qwen2.5:7b-instruct"]
    Capture["Capture pipelines<br/>URL/PDF/Note"]
    Backup["Backup scheduler<br/>(6h VACUUM INTO)"]
    APK["Android APK<br/>(Capacitor 8 — v0.5.0)"]

    User --> Next
    APK -.v0.5.0.-> Next
    Next --> Proxy
    Proxy --> Actions
    Actions --> Auth
    Actions --> Capture
    Capture --> DB
    DB -->|INSERT trigger| Queue
    Worker -->|claim| Queue
    Worker --> Ollama
    Worker --> DB
    DB --> FTS
    Backup --> DB
```

### Narrative

- The browser (or, in v0.5.0+, the Capacitor APK) hits a single Next.js 16 server.
- **Edge proxy** (`src/proxy.ts`, renamed from `middleware.ts` in Next 16) checks for a session cookie; if missing, `/api/*` returns JSON 401, page routes redirect to `/unlock`. Edge cannot use `node:crypto`, so it only checks cookie presence. HMAC signature verification runs at page/route level on Node.
- **Server actions** and **API routes** run on the Node runtime. They call the typed layer under `src/db/` and feature libraries under `src/lib/`.
- **Capture** (`src/lib/capture/{url,pdf,strip,note}.ts`) extracts content, strips boilerplate, and INSERTs into `items`. An **INSERT trigger** (migration `003_enrichment_queue.sql`) auto-enqueues a job.
- **Enrichment worker** (`src/lib/queue/enrichment-worker.ts`) runs as a long-lived async loop started by `src/instrumentation.ts` on server boot. It claims jobs atomically, calls Ollama, writes back summary/category/title/quotes/auto-tags, and records usage in `llm_usage`.
- **FTS5** (migration `002_fts5.sql`) keeps `items_fts` in sync via triggers on `items` INSERT/UPDATE/DELETE.
- **Backup scheduler** runs `VACUUM INTO data/backups/brain-<timestamp>.sqlite` every 6 hours, retaining the last 28.

## 3. Request paths / data flows

| Path | Step | Behavior |
|------|------|----------|
| **URL capture** | 1 | User submits URL via `/capture` URL tab (`src/app/capture/`). |
| | 2 | Server action calls `fetchAndExtract()` → `@mozilla/readability` + `jsdom` on the HTML. |
| | 3 | Boilerplate strip (`src/lib/capture/strip.ts`) removes headers/footers/nav. |
| | 4 | `insertCaptured()` writes `items` row. AFTER INSERT trigger enqueues `enrichment_jobs` row. |
| | 5 | Worker polls, claims, calls Ollama via `generateJson()`, writes summary/category/title/quotes + auto-tags in a transaction. |
| **PDF capture** | 1 | User drops PDF onto `src/app/capture/pdf-dropzone.tsx` (client component). |
| | 2 | POST multipart to `/api/capture/pdf` (Node runtime). |
| | 3 | `unpdf` extracts text; paywall guard at 301 chars/page for known messy sources (Substack). |
| | 4..5 | Same INSERT + queue + enrichment path as URL. |
| **Note capture** | 1 | User types in Note tab; server action writes directly to `items` with `kind='note'`. |
| | 2..3 | Same enrichment path. |
| **Search** | 1 | `/search` calls `searchItems(q)` in `src/db/items.ts`. |
| | 2 | FTS5 query against `items_fts`; LIKE fallback if `items_fts` unavailable. |
| **Export single** | 1 | `/api/items/[id]/export.md` — renders YAML frontmatter + body. |
| **Export all** | 1 | `/api/library/export.zip` — JSZip stream with one `.md` per item. |
| **Library view** | 1 | `/` (`src/app/page.tsx`) lists items. |
| | 2 | Each card uses `EnrichingPill` component that polls `/api/items/[id]/enrichment-status` while the item is still being enriched. |

## 4. Source-of-truth table

| Topic | Authoritative location | May be stale |
|-------|------------------------|--------------|
| Database schema | [`src/db/migrations/001_initial_schema.sql`](../../src/db/migrations/001_initial_schema.sql) + `002..004` **(SoT: code)** | `BUILD_PLAN.md` schema sketches |
| Enrichment prompt | [`src/lib/enrich/prompts.ts`](../../src/lib/enrich/prompts.ts) **(SoT: code)** | [`docs/research/llm-b-qwen3.md`](../../docs/research/llm-b-qwen3.md) §7 (matches as of v0.3.0) |
| Category taxonomy (14 fixed) | [`src/lib/enrich/prompts.ts`](../../src/lib/enrich/prompts.ts) **(SoT: code)** | `BUILD_PLAN.md` |
| Model choice | [`src/lib/llm/ollama.ts`](../../src/lib/llm/ollama.ts) default `qwen2.5:7b-instruct` **(SoT: code)** | [`docs/research/llm-sizing.md`](../../docs/research/llm-sizing.md), [`docs/research/llm-b-qwen3.md`](../../docs/research/llm-b-qwen3.md) |
| Auth scheme | [`src/lib/auth.ts`](../../src/lib/auth.ts) + [`src/proxy.ts`](../../src/proxy.ts) **(SoT: code)** | [`docs/research/lan-auth.md`](../../docs/research/lan-auth.md) |
| Capture pipeline | [`src/lib/capture/`](../../src/lib/capture/) **(SoT: code)** | [`docs/research/pdf-extraction.md`](../../docs/research/pdf-extraction.md) |
| Queue design | [`src/lib/queue/enrichment-worker.ts`](../../src/lib/queue/enrichment-worker.ts) + migration `003` **(SoT: code)** | `BUILD_PLAN.md` §Queue |
| Design tokens | [`src/styles/tokens.css`](../../src/styles/tokens.css) **(SoT: code)** | [`DESIGN.md`](../../DESIGN.md) YAML frontmatter |
| Roadmap sequencing | [`ROADMAP_TRACKER.md`](../../ROADMAP_TRACKER.md) v0.4.0-roadmap | `FEATURE_INVENTORY.md` |
| Current phase status | [`PROJECT_TRACKER.md`](../../PROJECT_TRACKER.md) v0.4.0-tracker | `RUNNING_LOG.md` entries (append-only narration) |

## 5. Decisions / alternatives rejected

| Decision | Chosen | Rejected | Rationale |
|----------|--------|----------|-----------|
| Default LLM | Qwen 2.5 7B Instruct | Qwen 3 8B (default) | R-LLM-b benchmark: Qwen 3's "thinking" mode burned `num_predict` on `<think>` traces, producing truncated JSON. Qwen 3 kept as v0.6.0 GenPage candidate with `think:false`. |
| LLM runtime | Ollama (localhost:11434) | llama.cpp direct, LM Studio | Ollama is the simplest supervised runtime for non-technical user; model pulls via `ollama pull`. |
| DB | SQLite (better-sqlite3) | Postgres + pgvector | Local-only constraint. SQLite + `sqlite-vec` covers v0.4.0 RAG needs. |
| Search | FTS5 with porter+unicode61 tokenizer | Naive LIKE, external index | FTS5 is zero-config and ships with SQLite. LIKE fallback present if FTS5 unavailable. |
| Android share intent plugin | `@capgo/capacitor-share-target@^8.0.30` | `@capawesome/capacitor-android-share-target` (planned) | Planned plugin 404'd on npm. Empirical-verification morning caught this before v0.5.0 execution. |
| Full-AI-assisted coding | Yes (D-1 closed 2026-05-07) | Pair programming, tutorial-driven | User is non-technical; full delegation with user validating behavior end-to-end. |
| GitHub repo visibility | Public (D-2) | Private | User explicitly chose public `arunpr614/ai-brain`. |
| PDF extractor | `unpdf` | `pdf-parse`, `pdfjs-dist` direct | R-PDF empirical test: `unpdf` handled messy Substack PDFs; paywall guard at 301 chars/page threshold. |
| Proxy vs middleware | `src/proxy.ts` (Next 16 convention) | `src/middleware.ts` | Next.js 16 renamed the convention. Function export must be named `proxy`. |
| Session crypto placement | HMAC verify at Node routes, not Edge | Full verify in Edge | Edge runtime lacks `node:crypto`. Two-layer check documented in `src/proxy.ts`. |

## 6. Related reading

- [02_Systems_and_Integrations.md](./02_Systems_and_Integrations.md) — runtime details and component inventory
- [`BUILD_PLAN.md`](../../BUILD_PLAN.md) — phase-by-phase plan with §15 locked tech decisions
- [`DESIGN.md`](../../DESIGN.md) — design tokens and interaction patterns
- [`docs/research/SELF_CRITIQUE.md`](../../docs/research/SELF_CRITIQUE.md) — 35 adversarial findings against the research spikes
