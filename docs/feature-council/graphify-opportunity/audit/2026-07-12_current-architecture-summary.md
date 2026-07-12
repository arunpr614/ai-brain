# AI Brain Current Architecture Summary

**Baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Verified:** 2026-07-12  
**Scope:** current source architecture, not a proposed Graphify architecture

## Architectural character

AI Brain is a compact, single-owner personal knowledge service. A Next.js 16 standalone Node process serves the web application and private thin clients, owns one SQLite database, applies migrations, and starts several in-process workers/schedules. Separate system units handle guarded Recall import and Processing integrity audits. This favors low operational complexity, but HTTP, database access, AI work, local backups, and some schedules share process and storage pressure.

The package declares Node 22, Next 16.2.9, React 19.2.4, better-sqlite3, SQLite FTS5, sqlite-vec 0.1.9, Capacitor, and provider/client libraries (`package.json:2-8,171-201`). `next.config.ts:7-29` builds a standalone runtime, excludes durable `data/`, and leaves native SQLite modules server-side.

## Component map

| Layer | Current responsibility | Evidence |
|---|---|---|
| Browser UI | App Router pages, server components/actions, client editors, navigation, Processing application | `src/app/`; `src/components/`; `src/components/sidebar.tsx:40-44` |
| Private clients | Capacitor Android WebView/share flow, MV3 browser extension, Telegram bot/webhook | `android/`; `capacitor.config.ts`; `extension/`; `src/lib/telegram/` |
| HTTP/API boundary | Capture, Ask, search, threads, item/note/workflow, Settings, Processing, Telegram, health/errors | `src/app/api/` |
| Authentication boundary | PIN/session cookie for browser; shared bearer for allowlisted API clients; one-use pairing; webhook-specific auth | `src/proxy.ts:14-32,48-82,84-157`; `src/lib/auth/`; device-pairing and Telegram modules |
| Domain services | Capture/extraction, enrichment, retrieval, Related, Ask, notes, Processing, Recall, provider policy | `src/lib/` |
| Repositories | Synchronous better-sqlite3 repositories and transactions | `src/db/` |
| Persistence | SQLite canonical rows, FTS5, sqlite-vec, queues, histories, settings; capture artifact files outside SQLite | migrations 001-025; `src/lib/capture/artifacts.ts` |
| Background work | In-process enrichment, transcript recovery, note index, Anthropic batch poll/submit, local backup | `src/instrumentation.ts:25-71` |
| External/optional AI | Ollama/Anthropic/OpenRouter generation; Ollama/Gemini embeddings | `src/lib/llm/factory.ts:29-106`; `src/lib/embed/factory.ts:18-47` |
| Operator runtime | systemd web service, Recall units, Processing audit timer, immutable release and backup tooling | `scripts/deploy/`; release/deploy scripts |

## Primary runtime flows

### Capture to searchable memory

1. A browser session, paired bearer client, Telegram webhook, or guarded Recall process submits a capture.
2. The channel validates authentication/origin/version/input and normalizes source identity.
3. Capture logic deduplicates and extracts available text/metadata, assigns platform, channel, quality, method, and warnings, then writes the item and optional artifact/cache evidence. The URL route demonstrates this sequence at `src/app/api/capture/url/route.ts:57-85,121-178,320-388`.
4. Item insertion triggers enrichment (`src/db/migrations/003_enrichment_queue.sql:30-39`) and initializes the Processing projection/event/receipt for new captures (`src/db/items.ts:110-145`; migration 025).
5. Enrichment writes summary, quotes, category, title, auto-tags, and topic memberships in one transaction (`src/lib/enrich/pipeline.ts:219-251`).
6. Enrichment completion queues embedding (`src/db/migrations/006_embedding_jobs.sql:24-39`). The embed pipeline writes provenance-separated chunks, row-ID bridge rows, and vectors transactionally (`src/lib/embed/pipeline.ts:81-157`).

Failure states remain stage-specific: a retained item can exist while enrichment, embedding, transcript recovery, or artifact storage requires repair.

### Retrieval and Ask

- Exact search uses separate item and eligible-note FTS indexes.
- Semantic retrieval embeds the query and searches sqlite-vec chunks.
- Hybrid search fuses lexical, note, and semantic ranks with RRF (`src/lib/search/index.ts:5-15,62-133`).
- Related builds per-item/source centroids from stored vectors, combines eligible note influence, and ranks candidate items at request time (`src/lib/related/index.ts:52-123`).
- Ask validates a browser session and scope, retrieves eligible chunks, builds a citation-constrained prompt, streams SSE, removes orphan citations, and optionally stores thread/messages/citation JSON.

The retrieval architecture is chunk-centric rather than graph-centric. Item-to-item similarity is not persisted.

### Attached notes

The attached-note path is deliberately separate from captured source and AI digest:

- browser IndexedDB journal and save queue;
- authenticated, same-origin note API;
- epoch/generation CAS and idempotency receipts;
- current note plus revisions and tombstone;
- separate note FTS;
- optional source-aware semantic chunks after per-note opt-in, rollout flags, and provider acknowledgement.

Migration 022 defines state/current/revision/mutation/index/consent/FTS tables (`src/db/migrations/022_item_notes.sql:7-98`). Migration 023 adds chunk source kind/version. UI, write, semantic worker, and Focus flags are independently configured (`src/lib/notes/flags.ts:1-28`; `.env.example:83-96`).

### Processing workflow

The workflow uses `items` as the aggregate and stores:

- validated status/version/current-entry fields on the item;
- append-only content-free events;
- immutable mutation receipts;
- one tab-scoped Undo slot;
- resumable enrollment jobs;
- owner timezone preference and readiness/epoch state.

Mutation logic uses compare-and-swap versions and idempotent mutation IDs. Read, write, and navigation gates additionally require a current green readiness checkpoint (`src/lib/processing/flags.ts:3-25`; `src/db/processing-readiness.ts:4-30`). Schema evidence is `src/db/migrations/025_item_workflow.sql:6-18,24-104,145-169,171-240`.

### Recall

Recall is a guarded one-way importer, not generic synchronization. A separate system timer/worker calls a packaged wrapper which performs lock, dry-run, backup, bounded apply, validation, and checkpoint handling. The optional Settings “Sync now” UI only persists intent and writes an empty wake marker; the web process does not hold Recall credentials or execute the importer. Durable manual request/execution/schedule tables are in migration 024; flags are checked by exact functions in `src/lib/recall/manual-sync-service.ts:28-35`.

## Data model by domain

| Domain | Canonical records and relations | Important semantics |
|---|---|---|
| Core content | `items` | Central aggregate; source type, capture channel, quality/provenance, AI output, workflow projection |
| Taxonomy | `tags`/`item_tags`, `topics`/`item_topics`, `collections`/`item_collections` | Manual/auto labels, generated topics with nullable confidence/evidence, explicit collection membership |
| Retrieval | `items_fts`, `chunks`, `chunks_rowid`, `chunks_vec`, `embedding_jobs`, note FTS/index state | FTS and 768-d vectors; source-aware chunk provenance |
| Enrichment | `enrichment_jobs`, generated item fields, `llm_usage` | SQLite job queue plus structured generation |
| Chat | `chat_threads`, `chat_messages` | Library/item scope; citations stored as JSON |
| Capture evidence | item fields, `capture_artifacts`, `capture_metadata_cache` | Artifact bytes can live outside SQLite |
| Transcript recovery | jobs, attempts, policy decisions, sources, segments | Source/policy-specific recovery and provenance |
| Notes | state/current/revisions/mutations/FTS/jobs/consents | One canonical note/item with deletion tombstone and optional AI inclusion |
| Recall | state/runs/items/manual requests/executions/schedule | One-way external import with guarded checkpointing |
| Processing | item projection, events, receipts, undo, enrollment, preferences/readiness | Operational lifecycle, not semantic relationships |
| SRS substrate | `cards` | Schema only; no current spaced-repetition product |

## Trust boundaries

### Browser and programmatic access

`src/proxy.ts:76-157` applies first-match authentication: public paths; valid signed session; allowlisted bearer route with rate limit; default-deny API; otherwise unlock redirect. Browser sessions are HMAC tokens derived from the stored PIN setting (`src/lib/auth.ts:59-135`). Programmatic clients share a bearer token and only reach `BEARER_ROUTES` (`src/lib/auth/bearer.ts:67-80`).

Processing APIs require the browser session and route-local origin/write controls; bearer reachability does not imply Processing authorization. Telegram, device-pairing exchange, note AI consent, and Recall each add their own narrower policies.

### Data leaving the service

- Configured generation providers may receive retained source/query context.
- Configured embed providers receive chunk/query text.
- Attached note text is stricter: it requires note flags, per-note inclusion, and provider-specific consent/eligibility.
- Cloudflare/managed edge terminates public TLS according to repository deployment documentation.
- Recall credentials are intended for a separate trusted identity, not the web process.

The audit did not re-probe remote providers or host permissions.

## Background processing and failure isolation

`src/instrumentation.ts:25-71` opens/migrates the DB, resumes Processing enrollment, ensures the bearer token, and starts backup, enrichment, transcript, note-index, and batch cron work. The web service runs unprivileged with only `/opt/brain/data` writable (`scripts/deploy/brain.service:6-27`). Separate timers run Recall daily import and six-hour Processing audit.

Queues use explicit pending/running/done/error state and retry/stale-claim logic. This supports stage repair without deleting valid source content. The cost is operational coupling: server restart, SQLite pressure, or provider trouble can affect multiple background domains.

## Observability and analytics

Current observability consists of:

- authenticated health and provider status;
- queue/job/error state;
- rotating JSONL errors (`src/lib/errors/sink.ts:21-41`);
- system journal/service/timer state;
- Recall redacted reports/checkpoints/locks;
- Processing readiness/integrity audit;
- LLM usage/quota diagnostics;
- backup evidence.

No general event analytics, funnel/engagement instrumentation, warehouse exporter, or multi-user audit product was found. `llm_usage` is cost/operation tracking, not product engagement analytics.

## Deployment and verification

- CI at `.github/workflows/product-ci.yml:19-41` performs locked install, typecheck/lint/env checks, product tests, docs checks, Processing/vector tool builds, production build, and release smokes.
- Protected-baseline Product CI run `29200243743` passed 894/894 tests in 95 suites and all static/build/release checks; Agent docs run `29200243741` passed.
- Main pushes additionally package and attest immutable standalone release artifacts (`.github/workflows/product-ci.yml:43-81`).
- No fresh production host, database, timer, provider, or client runtime validation was performed in this audit.

## Graphify integration implications, without making a recommendation

Any future graph feature would cross several current ownership boundaries:

- item identity and deletion in the core repository;
- taxonomy provenance and current null-confidence behavior;
- chunk/source provenance and vector generation;
- note consent and deletion cleanup;
- Recall/capture provenance;
- background rebuild/incremental update work;
- new query and accessible presentation APIs;
- backup, audit, and privacy behavior.

The safest conceptual boundary is a derived, rebuildable relationship projection sourced from canonical items/taxonomy/chunks, not a replacement for current canonical storage. That is an architectural inference for later council work, not an implemented behavior or Stage 1 recommendation.
