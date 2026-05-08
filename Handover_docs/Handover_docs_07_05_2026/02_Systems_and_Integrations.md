# AI Brain: Systems and integrations (handover — 2026-05-07)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none) |
| **Baseline** | (none) |

> **For the next agent:** This file maps every runtime, service, and external dependency **as of v0.3.0**. Use it to understand what talks to what and where state lives. Pre-v1.0.0, the only external service is a **local** Ollama server — no cloud.

## 1. Runtime stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.5 (App Router, Turbopack in dev) |
| UI runtime | React 19.2.4 + React DOM 19.2.4 |
| Language | TypeScript ^5 (`tsc --noEmit` for typecheck) |
| Styling | Tailwind CSS ^4 (`@tailwindcss/postcss`) + CSS variables in `src/styles/tokens.css` |
| UI primitives | `@radix-ui/react-dialog`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`, `cmdk` (⌘K palette), `lucide-react` icons |
| Database | SQLite via `better-sqlite3@^11.10.0` (native bindings) |
| Vector store | `sqlite-vec@^0.1.6` (loaded as SQLite extension; wired for v0.4.0 RAG, unused at v0.3.0) |
| LLM runtime | Ollama (external process, `localhost:11434`) with `qwen2.5:7b-instruct` default |
| PDF extraction | `unpdf@^1.6.2` |
| HTML extraction | `@mozilla/readability@^0.6.0` + `jsdom@^29.1.1` |
| Archive export | `jszip@^3.10.1` |
| Validation | `zod@^3.24.1` |
| Node runtime | Node.js 20+ (per `@types/node@^20`) with `--max-old-space-size=8192` |

## 2. Components / services

| Component | Role | External APIs | Persistent state |
|-----------|------|---------------|------------------|
| `src/app/*` | Next.js App Router routes and server actions | — | — |
| `src/proxy.ts` | Edge-runtime request gate; redirects to `/unlock` if no session cookie | — | Reads cookie only |
| `src/lib/auth.ts` | PBKDF2-HMAC-SHA256 PIN hashing + HMAC session cookie | — | Reads/writes `settings` table (`auth.pin_hash`, `auth.session_secret`) |
| `src/lib/capture/url.ts` | URL fetch + Readability extraction | Fetches arbitrary HTTP(S) URLs | Writes `items` |
| `src/lib/capture/pdf.ts` | PDF text extraction via `unpdf` | — | Writes `items` |
| `src/lib/capture/strip.ts` | Boilerplate (header/footer) removal | — | Pure function |
| `src/lib/llm/ollama.ts` | Typed Ollama client; `generateJson<T>()` with retry at temp 0.1 | `POST localhost:11434/api/generate`, `/api/chat` | — |
| `src/lib/enrich/prompts.ts` | Locked enrichment prompt (R-LLM-b §7) + zod validator + 14-category taxonomy | — | Pure |
| `src/lib/enrich/pipeline.ts` | `enrichItem(id)` transactional writer | — | Writes `items.summary/category/title/quotes`, `item_tags`, `llm_usage` |
| `src/lib/queue/enrichment-worker.ts` | Long-lived poll loop with atomic claim + stale-claim sweep | — | Reads/writes `enrichment_jobs` |
| `src/lib/backup.ts` | 6h `VACUUM INTO` scheduler, 28 retention | — | Writes `data/backups/*.sqlite` |
| `src/db/client.ts` | Singleton DB + migrations runner + type definitions | — | Owns `data/brain.sqlite` handle |
| `src/db/items.ts` | `insertCaptured`, `findItemByUrl`, `searchItems` (FTS5 + LIKE fallback) | — | Reads/writes `items`, `items_fts` |
| `src/db/tags.ts` | Taxonomy CRUD (`upsertTag`, `renameTag` with merge-on-collision, `promoteTagToManual`, etc.) | — | Reads/writes `tags`, `item_tags` |
| `src/db/collections.ts` | Full CRUD + attach/detach | — | Reads/writes `collections`, `item_collections` |
| `src/db/settings.ts` | JSON settings key/value helper | — | Reads/writes `settings` |
| `src/instrumentation.ts` | Next.js `register()` hook — boots DB, backup scheduler, and enrichment worker on server start | — | — |

## 3. External services matrix

| Service | Purpose | Config / secret names |
|---------|---------|----------------------|
| **Ollama** (local) | LLM inference for enrichment (summary/category/title/quotes/tags) | `OLLAMA_HOST` (defaults to `http://127.0.0.1:11434`), `OLLAMA_MODEL` (defaults to `qwen2.5:7b-instruct`) |
| **File system** | SQLite DB + backups + captured PDFs | `data/brain.sqlite`, `data/backups/`, `data/pdfs/` (relative to CWD) |

> Pre-v1.0.0, there are no cloud services, no API keys, and no third-party SaaS integrations. See [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) for the full (short) secret inventory.

## 4. Optional / ancillary components

| Component | Role | Required? |
|-----------|------|-----------|
| `scripts/rllm-b-bench.ts` | R-LLM-b benchmark harness (Qwen 3 vs Qwen 2.5 head-to-head) | Optional — research only; referenced in [`docs/research/llm-b-qwen3.md`](../../docs/research/llm-b-qwen3.md) |
| Capacitor toolchain (JDK 21 + Android SDK) | APK build for v0.5.0 | Deferred — not yet initialized at v0.3.0 |

## 5. API surfaces / internal contracts

All routes run on the **Node runtime** unless noted. Edge-restricted work happens only in `src/proxy.ts`.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/api/capture/pdf` | Session cookie required | Multipart upload → `unpdf` → `items` INSERT |
| `GET` | `/api/items/[id]/export.md` | Session cookie | YAML frontmatter + body |
| `GET` | `/api/items/[id]/enrichment-status` | Session cookie | Returns `{ status: "pending" \| "running" \| "done" \| "failed", attempt }` for `EnrichingPill` polling |
| `GET` | `/api/library/export.zip` | Session cookie | Streams JSZip with one `.md` per item (Obsidian-ready) |

### Server actions (form-driven; RSC boundary)

- `src/app/taxonomy-actions.ts` — 10 zod-validated actions: attach/detach tag, rename tag, delete tag, promote auto-tag to manual, attach/detach collection, create/rename/delete collection.
- `src/app/capture/actions.ts` — URL submit, Note submit, PDF commit post-upload.
- `src/app/setup/form.tsx` + `src/app/unlock/form.tsx` — PIN setup and unlock.

## 6. Cross-links

- [01_Architecture.md](./01_Architecture.md) — topology diagram and request paths
- [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) — secret names referenced above
- [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) — how to start Ollama + dev server
