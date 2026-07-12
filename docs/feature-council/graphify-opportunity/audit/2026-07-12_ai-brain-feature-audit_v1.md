# AI Brain Feature Audit v1

**Audit date:** 2026-07-12  
**Repository baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c` (`origin/main`, verified 2026-07-12)  
**Wiki baseline:** `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1` (read-only GitHub Wiki clone, verified 2026-07-12)  
**Audit type:** source, test, configuration, documentation, and history review; not a fresh production-runtime certification

## Executive finding

AI Brain currently solves a coherent single-owner knowledge workflow: capture material from multiple channels, preserve source quality/provenance, enrich and organize it, retrieve it lexically or semantically, ask cited questions, attach private notes, and deliberately process an inbox. It also contains operational controls for authentication, background jobs, backups, Recall import, and diagnostics.

It does **not** currently implement a generalized knowledge graph. The closest capabilities are:

- item membership in tags, AI topics, and collections;
- chunk-to-item and citation-to-chunk provenance;
- query-time semantic Related results;
- optional note-derived semantic context;
- workflow history and capture provenance.

These are useful graph inputs, but they do not provide persisted semantic item-to-item edges, typed entity nodes, graph traversal/path finding, connection explanations, community detection, confidence-governed inferred edges, or a graph visualization/API.

## Method and status rules

The audit inspected all 24 App Router page entrypoints, all 43 API route files, navigation/components/actions, repositories, all 27 SQL migration files through schema 025, capture and retrieval services, background workers, authentication, flags, 139 source test files, deployment units, repository documentation, canonical Wiki pages, and relevant Git history. Current code and tests outrank Wiki and historical plans; counts are inventory aids rather than behavioral proof.

Statuses mean:

- **Implemented:** current code provides a reachable product or operator capability; this does not by itself prove it is enabled on the live host.
- **Partially implemented:** a useful subset exists, but a stated cross-channel/product contract is incomplete.
- **Feature-flagged:** current code exists but effective reachability depends on explicit flags/readiness/consent.
- **Inactive:** code/schema exists but the current product path deliberately does not provide the capability.
- **Deprecated/Superseded:** an older entry point or architecture remains only as redirect/compatibility history.
- **Explored but not implemented / Planned:** documentation or prototypes exist without current product code.
- **Unknown:** source evidence cannot establish current runtime availability.

Confidence is confidence in the assigned status, not a claim that production was exercised during this audit.

## User problems currently addressed

| User problem | Current response | Principal limit |
|---|---|---|
| Save useful material without one rigid input format | Web note/URL/PDF/transcript capture, selected text, Android share, extension, Telegram, Recall import | Fidelity varies by source; some recovery adapters are inactive |
| Know whether a capture is trustworthy | Quality states, warnings, artifacts, provenance, Needs Upgrade, repair/recovery | No unified all-source repair center |
| Turn raw saves into usable memory | Asynchronous summary, title cleanup, category, quotes, generated tags/topics, chunks, embeddings | Provider/queue failures and prompt quality affect output |
| Re-find an exact or conceptually similar source | FTS5, semantic search, hybrid RRF, scoped filtering | No rank explanation or graph traversal |
| Ask questions grounded in retained sources | Scope-aware RAG, streamed answers, citations, persisted chat | Citation validity remains retrieval/model dependent |
| Add private personal context to a source | One attached Markdown note with autosave/revisions/export and consent-gated AI inclusion | Feature flags; one note per item; not E2EE |
| Organize knowledge | Categories, manual/auto tags, generated topics, manual collections | No real hierarchy, smart rules, backlinks, or graph |
| Triage a capture backlog | Feature-flagged Processing Inbox/Board/List/Archived with CAS, events, undo, enrollment | Single-item moves; no collaboration, rank, dates, or batch workflow |
| Use the system across private channels | PIN browser session, shared bearer clients, device pairing, Android/extension/Telegram | Single global bearer identity; no roles or per-device revocation |
| Keep the personal service recoverable | SQLite migrations, queues, local/off-site backup tooling, health/errors/provider status | Artifact bytes are outside DB backup; no general product analytics |

## Capability inventory

### 1. Shell, navigation, library, and item management

| Capability | Status / confidence | Current behavior and user value | Evidence and tests | Limitations / runtime boundary |
|---|---|---|---|---|
| Responsive application shell and navigation | Implemented / High | Sidebar exposes Library, conditionally Processing, Needs Upgrade, Ask, Settings, Capture, and mobile More; Processing is removed when its navigation gate is off. | `src/components/sidebar.tsx:40-44,65-100,186-316`; `src/components/sidebar-routing.test.ts`; `src/components/sidebar-routing.ts:32-54` | Runtime theme/device behavior was not re-exercised. |
| Library browse/filter/select and bulk organization | Implemented / High | Chronological item list; source, quality, and tag filters; multi-select bulk tag/collection/delete and selected-source Ask/Processing actions. | `src/db/items.ts:188-330`; `src/app/library/page.tsx`; `src/components/library-list.tsx`; `src/app/actions.bulk.test.ts`; `src/lib/library/selected-actions.test.ts` | No saved searches, smart rules, or multi-vault model. |
| Item detail and source Focus | Implemented / High | Reads source, digest, provenance/trust, tags/topics/collections, Related, Ask, repair, attached note, and Markdown export. | `src/app/items/[id]/page.tsx:216-268,293-477`; `src/components/item-companion-tabs.tsx`; `src/components/related-items.tsx` | Not a native PDF reader or annotation studio. |
| Item/library export | Implemented / High | Per-item Markdown and library ZIP export routes. | `src/app/api/items/[id]/export.md/route.ts`; `src/app/api/library/export.zip/route.ts`; `src/app/api/library/export.zip/route.test.ts` | One-way export; attached notes excluded from default library export. |
| `/items/new` standalone form | Deprecated/Superseded / High | Old entry point redirects to unified Capture. | `src/app/items/new/page.tsx`; Wiki `Ideas-and-Exploration-Catalog.md:50` | Retained only for compatibility/navigation continuity. |

### 2. Capture, ingestion, fidelity, and repair

| Capability | Status / confidence | Current behavior and user value | Evidence and tests | Limitations / runtime boundary |
|---|---|---|---|---|
| Standalone note capture | Implemented / High | Creates a user-provided full-text item and enters the common enrichment/workflow pipeline. | `src/db/items.ts:151-160`; `src/app/api/capture/note/route.ts`; `src/app/api/capture/note/route.test.ts` | Distinct from the attached “My notes” layer. |
| URL/article and selected-text capture | Implemented / High | Validates, canonicalizes, detects duplicates, extracts platform content, accepts trusted selected/pasted text, writes source/artifact state, and returns an explicit capture result. | `src/app/api/capture/url/route.ts:57-85,97-178,320-388`; `src/lib/capture/capture-url.ts:28-78`; route test cases at `src/app/api/capture/url/route.test.ts` | Some pages remain preview/metadata-only; remote extraction is source-dependent. |
| YouTube capture and recovery | Implemented with inactive subpaths / High | Metadata/best-effort transcript capture, weak-source recovery queue, user-provided transcript upgrade, and operator backfill tooling. | `src/app/api/capture/transcript/route.ts`; `src/lib/capture/youtube.ts`; `src/lib/capture/youtube-transcript/recovery.ts`; `src/lib/queue/transcript-worker.test.ts`; `src/app/api/capture/transcript/route.test.ts` | Official-caption adapter is not wired as a usable current path. |
| PDF capture | Implemented / High | Single-PDF extraction with metadata and integrity/error handling. | `src/lib/capture/pdf.ts:46-108`; `src/app/api/capture/pdf/route.ts`; `src/app/api/capture/pdf/route.test.ts`; `src/app/capture/pdf-file-validation.test.ts` | No OCR, native rendering, highlight anchors, or multi-PDF flow. |
| Owned-media speech-to-text | Inactive / High | Adapter/service tests exist, but the current product route stops with provider-disabled behavior. | `src/app/api/transcripts/owned-media/route.ts`; `src/lib/capture/transcripts/owned-media-stt-route-service.ts`; `src/app/api/transcripts/owned-media/route.test.ts` | Not a live ingestion capability. |
| Capture result contract | Partially implemented / High | Canonical states distinguish full text, transcript, preview/metadata, needs upgrade, duplicate, update, saved-item error, and failure. | `src/lib/capture/result.ts:4-12,45-72,75-139`; client/result tests under `src/lib/android-share/` and capture route tests | Channel feedback remains partly client-specific; no single end-to-end lifecycle UI for all channels. |
| Provenance, quality, artifacts, and metadata cache | Implemented / High | Item stores content kind separately from capture channel and quality fields; artifacts/cache retain bounded extraction evidence. | `src/db/client.ts:187-263`; migrations `012_capture_source.sql`, `013_capture_quality.sql`, `014_capture_artifacts.sql`, `015_capture_metadata_cache.sql`, `016_capture_artifacts_hardening.sql`; `src/lib/capture/artifacts.test.ts` | Artifact retention is not a user-managed lifecycle; artifact bytes are outside DB backup. |
| Needs Upgrade, attention Review, repair | Implemented / High code; runtime Unknown for Review | Weak items surface in Needs Upgrade; item repair and transcript recovery are available; separate Review route uses attention logic. | `src/db/items.ts:194-207,302-330`; `src/app/needs-upgrade/page.tsx`; `src/app/review/page.tsx`; `src/lib/repair/item-repair.test.ts`; `src/lib/review/attention.test.ts` | Review is not spaced repetition and is not primary navigation. |
| Android share, browser extension, Telegram | Implemented / High code | Programmatic/private clients feed the same capture routes with channel-specific result/auth policies. | `src/components/share-handler.tsx`; `src/lib/android-share/*.test.ts`; `extension/manifest.json`; `src/app/api/telegram/webhook/route.ts`; `src/lib/telegram/dispatch.test.ts` | Android is a private thin client; Telegram is owner/private-chat only; store distribution not established. |
| Recall one-way import | Implemented, host/flag dependent / High code; current runtime Unknown | Guarded enumeration, fidelity checks, dry run/apply, checkpointing, import/weak-item upgrade, durable run records, and daily system timer. | `src/lib/recall/sync-runner.ts`; `src/lib/recall/importer.ts`; `src/db/migrations/020_recall_sync.sql`; `src/lib/recall/sync-runner.test.ts`; `scripts/deploy/brain-recall-sync.timer:1-8` | One-way only; credentials/host timer state not reverified. |
| Recall manual sync control | Feature-flagged / High code; not freshly runtime verified | Settings control writes a durable request and wake marker for a separate trusted worker; it does not call Recall in the web process. | `src/lib/recall/manual-sync-service.ts:28-35,174`; `src/app/api/settings/recall-sync/route.ts`; `src/db/migrations/024_recall_manual_sync.sql`; route/component/process tests; `.env.example:128-134` | Default off; effective availability requires UI, configured-worker, and sync flags plus host units. |

### 3. AI enrichment and categorization

| Capability | Status / confidence | Current behavior and user value | Evidence and tests | Limitations / runtime boundary |
|---|---|---|---|---|
| Asynchronous enrichment | Implemented / High | New items auto-enqueue; worker writes summary, quotes, category, cleaned title, auto-tags, and topic memberships transactionally. | `src/db/migrations/003_enrichment_queue.sql:14-39`; `src/lib/enrich/pipeline.ts:153-251`; `src/lib/enrich/prompts.ts:28-77`; pipeline/worker tests | Bodies under 200 characters bypass model enrichment and receive safe defaults (`pipeline.ts:159-181`). |
| LLM provider abstraction and batching | Implemented / High | Enrichment and Ask independently select Ollama, Anthropic, or OpenRouter; Anthropic can use daily batch submit/poll. | `src/lib/llm/factory.ts:29-106`; `src/lib/queue/enrichment-batch-cron.ts:34-86`; provider/factory/batch tests | Provider health, quota, and configuration are external runtime dependencies. |
| Generated taxonomy | Implemented, semantically limited / High | Enrichment turns the same generated label list into auto-tags and topics; category is a single controlled classifier. | `src/lib/enrich/pipeline.ts:241-249`; `src/lib/enrich/prompts.ts:9-24,67-72`; `src/db/topics.test.ts` | Topics are not independently extracted entities. Current enrichment records `confidence = null` and generic evidence, so “confidence-aware concept graph” would be an overstatement. |

### 4. Retrieval, search, Ask, and memory

| Capability | Status / confidence | Current behavior and user value | Evidence and tests | Limitations / runtime boundary |
|---|---|---|---|---|
| Full-text search | Implemented / High | FTS5 searches titles/bodies and, when note UI is enabled, exact attached-note text; note hits return the parent once with explicit source/snippet. | `src/db/migrations/002_fts5.sql:7-30`; `src/lib/search/index.ts:49-69,95-133`; `src/lib/search/index.test.ts:44-78` | No saved queries or detailed ranking explanation. |
| Chunking and semantic indexing | Implemented / High | Enrichment completion queues embeddings; original content and AI summary are chunked separately with explicit provenance and 768-d vectors. | `src/db/migrations/005_vector_index.sql:12-20`; `006_embedding_jobs.sql:8-39`; `023_source_aware_chunks.sql`; `src/lib/embed/pipeline.ts:51-157`; embedding tests | Index readiness/provider failures are independent of a successful capture. |
| Semantic/hybrid search | Implemented / High | Semantic results deduplicate top chunk matches to items; hybrid mode combines FTS, notes, and semantic ranks using reciprocal-rank fusion. | `src/lib/search/index.ts:5-15,26-39,62-91`; `src/lib/search/index.test.ts:82-134`; `src/lib/retrieve/index.test.ts:60-203` | Fixed vector dimension and provider/index generation dependencies. |
| Related items | Implemented / High code; current runtime Unknown | Computes source-aware item centroids from stored vectors and ranks other items by query-time cosine similarity; UI shows a bounded list. | `src/lib/related/index.ts:1-16,25-41,52-132`; `src/components/related-items.tsx:20`; `src/lib/related/index.test.ts` | No persisted edge, edge type, causal explanation, path, or graph. A centroid can blur multi-topic items (`related/index.ts:13-15`). |
| Scoped Ask/RAG and citations | Implemented / High | Library, item, selected-items, tag, topic, and collection scopes retrieve chunks, stream provider output, parse/filter citations, and can persist chat. | `src/lib/ask/scope.ts`; `src/lib/ask/generator.ts`; `src/app/api/ask/route.ts`; `src/lib/ask/generator.test.ts`; `src/app/api/ask/route.test.ts`; `src/lib/ask/parse-citations.test.ts` | Citations depend on retrieval/model output; no claim-verdict or immutable retrieval snapshot. |
| Chat persistence | Implemented / High | Threads/messages support library or item scope and store citation JSON. | `src/db/migrations/001_initial_schema.sql:99-118`; `src/db/chat.ts`; `src/db/chat.test.ts`; thread API routes | Single owner; not shared/collaborative. |
| Attached My notes | Feature-flagged / High | One canonical per-item Markdown note, local journal, autosave/manual save, tombstone, versions/restore, exact search, export, and optional Focus. | `src/db/migrations/022_item_notes.sql:7-98`; `src/components/manual-note-editor.tsx`; note route/repository/journal/save-queue/focus tests; `.env.example:83-96` | UI/write/worker/Focus flags default off in example config; not E2EE; one note per item. |
| Notes in AI and Related | Feature-flagged plus consent / High | Source-aware manual-note chunks can enter search/Ask/Related only after per-note opt-in, rollout flags, and provider policy checks. | `src/db/migrations/023_source_aware_chunks.sql`; `src/lib/related/index.ts:59-84`; `src/lib/notes/provider-policy.test.ts`; `src/lib/queue/note-index-worker.test.ts` | Exact search and semantic/provider eligibility differ; remote provider calls cannot be recalled after start. |

### 5. Knowledge organization and relationship primitives

| Capability | Status / confidence | Current behavior and user value | Evidence and tests | Limitations / runtime boundary |
|---|---|---|---|---|
| Categories | Implemented / High | One enrichment-generated string on each item. | `src/db/migrations/001_initial_schema.sql:23-35`; `src/lib/enrich/prompts.ts:9-24` | Controlled classification, not a relation or browsable entity model. |
| Manual/auto tags | Implemented / High | Shared canonical labels with item many-to-many joins; auto tags can be promoted, renamed/merged, detached, or deleted. | `src/db/migrations/001_initial_schema.sql:67-79`; `src/db/tags.ts:19-124` | Slash-separated names do not create an enforced hierarchy. |
| AI topics | Implemented / High, with semantic caveat | Topic entities have pages; item-topic joins store nullable confidence/evidence. | `src/db/migrations/017_topics.sql:4-24`; `src/db/topics.ts:92-152`; topic pages/tests | Enrichment currently mirrors tag names into topics and sets confidence null (`src/db/topics.ts:109-137`); no topic-to-topic edges. |
| Collections | Implemented / High | Explicit manual groups with item many-to-many membership and collection pages/scoped Ask. | `src/db/migrations/001_initial_schema.sql:50-65`; `src/db/collections.ts`; `src/app/collections/[id]/page.tsx` | No smart/rule collections, nesting, or collaboration. |
| Knowledge graph / connection map | Planned; not implemented / High | Prior council documents and Wiki describe a possible relationship graph. | Wiki `Ideas-and-Exploration-Catalog.md:18,33,47`; repository search found no graph library, route, generalized node/edge schema, graph query service, or graph tests | Related and memberships are substrate only. |
| Spaced-repetition cards | Inactive schema / Planned product / High | Initial schema contains an SRS-shaped `cards` table, but no product routes/services/scheduler were found. | `src/db/migrations/001_initial_schema.sql:81-97`; Wiki `Data-Model.md:24`; Wiki `Ideas-and-Exploration-Catalog.md:21` | “Card Processing” means captured-item workflow, not flashcards/SRS. |

### 6. Processing workflow

| Capability | Status / confidence | Current behavior and user value | Evidence and tests | Limitations / runtime boundary |
|---|---|---|---|---|
| Inbox/Board/List/Archived workflow | Feature-flagged and readiness-gated / High code; Wiki claims dated production enablement | New captures initialize Inbox; selected legacy items can be enrolled; versioned single-item move/archive/restore/reprocess/undo with immutable events/receipts. | `src/db/migrations/025_item_workflow.sql:6-18,24-104,171-240,348-413`; `src/lib/processing/flags.ts:3-25`; processing route/repository/migration tests | Fresh configuration defaults off (`.env.example:98-106`); current host flags/readiness were not probed. No drag/drop, batch moves, manual rank, due dates, projects, or collaboration. |

### 7. Authentication, privacy, observability, and deployment

| Capability | Status / confidence | Current behavior and user value | Evidence and tests | Limitations / runtime boundary |
|---|---|---|---|---|
| PIN setup/unlock/session | Implemented / High | PBKDF2 PIN, HMAC-signed 30-day HttpOnly/SameSite cookie, protected-route redirect. | `src/lib/auth.ts:42-135`; `src/proxy.ts:14-32,76-157`; auth/proxy tests | Four-character minimum; no multi-user roles/SSO. |
| Bearer auth and device pairing | Implemented / High | Allowlisted programmatic routes, timing-safe shared token, per-token in-process rate limiting, short-lived one-use pairing code, rotation. | `src/lib/auth/bearer.ts:39-93,149-223`; `src/proxy.ts:89-138`; bearer/pairing/route tests | One shared identity; rotation revokes every client; limiter is process-local. |
| Provider consent/redaction | Implemented around notes / High | Remote note use requires provider-specific acknowledgement; provider diagnostics redact long credential-like values. | `src/lib/notes/provider-policy.ts`; `src/lib/providers/status.ts:197-205`; provider-policy/security tests | Broader app content can still be sent to configured remote LLM/embed providers. |
| Background processing | Implemented / High | Server boot applies migrations and starts backup, enrichment, transcript recovery, note-index, and batch schedulers; Recall and Processing audit use system units. | `src/instrumentation.ts:25-71`; `scripts/deploy/brain-processing-audit.timer:1-9`; Recall timer/path units | HTTP, in-process workers, backups, and SQLite share failure/resource pressure. |
| Health/errors/provider diagnostics | Implemented, operator-oriented / High | Liveness route, namespaced client/server JSONL errors, provider probes/status, quota debug, queue/readiness tools. | `src/app/api/health/route.ts:21-30`; `src/app/api/errors/client/route.ts:35-84`; `src/lib/errors/sink.ts:21-41`; `src/lib/providers/status.ts:43-64`; route/provider tests | This is observability, not product engagement analytics; no centralized telemetry pipeline was found. |
| SQLite backup and off-site tooling | Implemented / High code; current schedule/storage Unknown | Consistent `VACUUM INTO` snapshots on boot/interval with retention; separate encrypted off-site/operator tooling. | `src/lib/backup.ts:20-30,41-118`; `scripts/backup-offsite.sh`; backup tests; `.env.example:174-192` | Database backup does not include capture-artifact files; restore was not exercised here. |
| Hosted deployment | Implemented / High code; dated Wiki runtime evidence | Next standalone Node service on loopback, unprivileged system identity, managed edge, immutable release/rollback tooling, CI verification. | `next.config.ts:7-29,38-65`; `scripts/deploy/brain.service:6-27`; `.github/workflows/product-ci.yml:19-41`; release scripts/tests | No fresh host/deployed-version probe in this audit. |

## Graphify-like overlap versus missing capability

| Graph-like concern | Existing AI Brain substrate | Current status | What is absent |
|---|---|---|---|
| Nodes/entities | Items, topics, tags, collections, chunks, notes, chat threads | Implemented domain records | General entity ontology and stable node contract |
| Edges/memberships | item-tag, item-topic, item-collection, item-chunk, item-note, citation references | Implemented typed joins/provenance | Generalized semantic item-to-item edges and lifecycle |
| Similarity | Query-time Related and semantic retrieval | Implemented | Persisted similarity edge, threshold/version/provenance, explanation |
| Confidence/evidence | Nullable item-topic confidence/evidence; chunk source kind/version; citations | Partial substrate | Confidence is not populated by current enrichment; no inferred-edge review policy |
| Queries | FTS, vector KNN, scoped Ask | Implemented | Graph query language, neighborhood/path query, entity explain operation |
| Visualization | Related list, topic/collection pages | Implemented adjacent UI | Graph canvas and accessible alternate graph view |
| Clustering/community | None in current product | Planned only | Algorithms, stored results, validation, UX |
| Incremental maintenance | Queues update enrichment/chunks; taxonomy joins replaced on enrichment | Implemented per-domain | General graph rebuild/diff/invalidation controls |

## Validation result and limitations

- The canonical Wiki was cloned read-only and inspected at `10a3e2b…`; no Wiki write or production mutation was performed.
- Exact-baseline protected Product CI run `29200243743` is the authoritative clean-install result: 894 tests across 95 suites, 894 passed, plus typecheck, lint, environment checks, documentation checks, production build, Processing/vector tools, and release smokes. Agent docs run `29200243741` also succeeded.
- A local nested-worktree `npm test` resolved a stale shared parent `node_modules`: 868 of 872 loaded tests passed and four Processing files could not import declared dependency `@js-temporal/polyfill`. The dependency is present in `package.json:178`; clean-install CI at the exact SHA passed all 894 tests. The local result is therefore an environment-resolution limitation, not evidence of a current assertion/product failure.
- No fresh browser, Android, extension, Telegram, provider, Recall API, systemd host, database contents, or deployed-production behavior was exercised.
- Wiki runtime claims are retained as dated documentation evidence, not independently promoted to present-tense runtime facts.
- Counts of pages/routes/tests are inventory aids, not proof of behavior. The traceability artifact names the protecting code and tests.

## Product-manager assessment

The highest-value behavior already present is not visualization; it is trustworthy capture, quality-aware retention, rediscovery, cited Ask, and private attached context. A Graphify-inspired opportunity would need to improve a real sense-making or recall job beyond the existing Related list, topic/collection browsing, and scoped Ask. The code is ready to supply item identity, taxonomy membership, chunk provenance, and similarity candidates, but relationship meaning, provenance, confidence, user correction, and accessible explanation remain product and data-model gaps—not merely a missing canvas.
