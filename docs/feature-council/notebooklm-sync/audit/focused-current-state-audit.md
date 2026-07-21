# AI Brain → NotebookLM — Focused Current-State Audit

**Audit date:** 2026-07-21
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`
**Method:** Read-only static inspection of current code, tests, repository documentation, Git history, and the live Wiki baseline. No production calls, credentials, private data, or writing test suites were used.

## Executive finding

AI Brain has a sound single-owner SQLite foundation, several mature capture paths, and a notably defensive Recall importer. Those components provide useful patterns, but they do not yet provide a safe outbound synchronization substrate.

The blocking data-model gaps are:

- no monotonically ordered new-item event or outbox;
- no general item `updated_at`, content version, or canonical content hash;
- no deletion tombstone;
- no outbound provider-resource ledger or immutable attempt history;
- no safe reconciliation state for “provider accepted the create, response was lost”;
- no Google account, consent, token, revocation, or target-notebook domain;
- no item-level eligibility/sensitivity policy;
- no general attachment model, and no retained original PDF for the ordinary PDF capture path.

Therefore, a future implementation must introduce a provider-neutral outbound ledger and explicit synchronization state. It must not use `captured_at` as a durable cursor or copy the inbound Recall data model directly.

## Canonical items and change detection

- `items` supports `url`, `pdf`, `note`, `youtube`, `podcast`, `epub`, `docx`, and `telegram`. Capture channel is separately recorded as `web`, `android`, `extension`, `telegram`, `system`, `unknown`, or `recall` (`src/db/client.ts:187-200`).
- Item IDs are random 12-byte/96-bit lowercase hexadecimal strings, not ordered identifiers (`src/db/client.ts:271-279`).
- Normal insertion creates a new ID, defaults `captured_at` to the current time, and initializes workflow projection, receipt, and event in the same transaction (`src/db/items.ts:55-148`).
- `captured_at` is not consistently “time entered AI Brain.” PDF capture may pass a timestamp extracted from PDF metadata (`src/app/capture-actions.ts:102-138`). Library listing orders only by `captured_at DESC` (`src/db/items.ts:288-300`). Equal timestamps and late insertions therefore make it unsafe as a checkpoint.
- Core items have no general `updated_at`, `content_version`, `content_hash`, or deletion tombstone (`src/db/migrations/001_initial_schema.sql:15-35`; `src/db/client.ts:187-237`).
- Capture repair can replace title, body, provenance, and character count without advancing a content version or timestamp (`src/db/items.ts:352-405`).
- Deletion removes artifact files, vectors/chunks, note-derived messages, and the item, but emits no durable content-deletion event (`src/db/items.ts:340-350`).
- Workflow events are append-only operational history for card workflow. They are not a complete content create/update/delete outbox (`src/db/migrations/025_item_workflow.sql:55-87`).

## Supported content and provenance

Reachable capture paths exist for standalone notes, URL/article captures, YouTube, PDF, selected text, Telegram, and Recall.

- `podcast`, `epub`, and `docx` are schema/type substrate; no complete creation routes or services were found. The feature inventory records that boundary (`docs/feature-council/project-wiki/MASTER_FEATURE_AND_IDEA_INVENTORY.md:76,114`).
- URL capture performs platform-aware canonicalization and exact-URL/short-window duplicate handling (`src/app/api/capture/url/route.ts:87-143,245-379`; `src/lib/capture/platform.ts:23-58`).
- Standalone note deduplication is only a two-second title/body hash window, not a permanent logical identity (`src/app/api/capture/note/route.ts:25-28,57-92`).
- YouTube capture uses metadata and best-effort timed-text extraction, with truncation and metadata-only fallbacks (`src/lib/capture/youtube.ts:37-49,223-380`).
- PDF capture validates one uploaded file and extracts text (`src/app/api/capture/pdf/route.ts:48-165`; `src/lib/capture/pdf.ts:46-110`). The ordinary path does not retain the original PDF as a reusable attachment.
- Capture artifacts retain bounded evidence such as HTML, metadata, YouTube JSON/XML, and user text outside SQLite (`src/lib/capture/artifacts.ts:14-24,38-59,78-175`). Database backup does not include these files (`src/lib/backup.ts:20-35,85-121`).
- Attached “My notes” are a distinct versioned/private domain with epochs, generations, revisions, mutation receipts, index state, and provider consent (`src/db/migrations/022_item_notes.sql:7-91`; `src/db/item-notes.ts:132-225,336-515`). They must be excluded by default from a new external sync.
- Generated enrichment stores summary, quotes, category, title, and taxonomy, but no version/hash suitable for external synchronization (`src/lib/enrich/prompts.ts:4`; `src/lib/enrich/pipeline.ts:226-235`).

## Exportable representations

- Single-item Markdown includes provenance and original body, but not generated summary or tags (`src/app/api/items/[id]/export.md/route.ts:27-50`).
- Bulk ZIP Markdown uses a separate formatter and includes summary and tags (`src/app/api/library/export.zip/route.ts:25-51,63-94`).
- Attached-note export is explicit and separate (`src/app/api/items/[id]/note/export.md/route.ts:26-44`).

A NotebookLM mapper can reuse these formatting concepts, but a future implementation should first create one pure, versioned canonical formatter. Current exports are observably inconsistent.

## Jobs, concurrency, and storage

- SQLite uses WAL mode, foreign keys, normal synchronous mode, and a five-second busy timeout (`src/db/client.ts:21-40`).
- New items are trigger-enqueued into unique per-item enrichment jobs; enrichment completion can enqueue unique embedding jobs (`src/db/migrations/003_enrichment_queue.sql:14-34`; `src/db/migrations/006_embedding_jobs.sql:8-32`).
- Server boot runs migrations and starts backup, enrichment, transcript, note-index, and batch-cron work in the web process (`src/instrumentation.ts:25-71`).
- Enrichment is a single in-process worker with atomic claims, stale-claim recovery, three attempts, and provider-down backoff (`src/lib/queue/enrichment-worker.ts:31-38,65-106,128-168,233-250`).
- Transcript recovery is another bespoke in-process queue with stale recovery and exponential retry scheduling (`src/lib/queue/transcript-worker.ts:27-30,67-89,98-129`).
- Recall alone uses durable SQLite lifecycle records plus external systemd services/timers and a private cross-process lock. There is no provider-neutral integration scheduler abstraction.

## Authentication and credential storage

- Browser auth uses a PBKDF2 PIN-derived verifier and signed 30-day session cookie (`src/lib/auth.ts:42-51,59-115,127-135`).
- General settings values are plaintext JSON/strings in SQLite (`src/db/settings.ts:7-35`). They are not suitable for Google refresh tokens.
- A shared programmatic bearer comes from `BRAIN_API_TOKEN`; if absent, boot can generate it into `.env` with restricted permissions (`src/lib/auth/bearer.ts:82-138`).
- AI, Telegram, and Recall integrations use environment credentials. Recall provides the strongest isolation precedent: systemd `LoadCredential` exposes the key only to the trusted Recall service identity (`scripts/recall-scheduled-apply.sh:37-50`; `scripts/deploy/brain-recall-sync.service:6-27`).
- Gemini embedding currently places its API key in a request URL query parameter (`src/lib/embed/gemini.ts:81-98`). That pattern must not be copied for Google OAuth.
- No Google authorization-code/PKCE flow, refresh-token lifecycle, encrypted mutable credential store, account binding, scope audit, revocation, or disconnect workflow was found.

## Status and observability

- Settings has an authenticated safe-projection Recall control with truthful queued, running, partial, blocked, offline, and unknown states (`src/components/recall-manual-sync.tsx:106-127,172-234,237-447`; `src/app/settings/page.tsx:139-178`).
- Recall persists sanitized runs, requests, executions, aggregate counts, stages, and heartbeats.
- General errors go to a local two-file JSONL sink rotating at 5 MB (`src/lib/errors/sink.ts:21-40`).
- `/api/health` is process liveness and intentionally performs no database or provider check (`src/app/api/health/route.ts:17-30`).
- Provider health is point-in-time and cached for 60 seconds (`src/lib/providers/status.ts:43-64,73-205`).
- `llm_usage` is cost/model tracking, not integration-sync analytics (`src/db/migrations/001_initial_schema.sql:120-133`).
- No centralized product analytics, metrics backend, distributed tracing, alerting, or sync dashboard dependency was found.

## Test and deployment posture

- Static inventory found 139 `src/**/*.test.ts` files. Recall has focused client, fidelity, importer, scheduler, runner, manual lifecycle, route, component, contract, and migration coverage.
- Particularly relevant Recall tests cover lock recovery, checkpoint overlap, idempotent re-import, crash after import/before checkpoint, late-card partial failure, changed remote content, strict request idempotency, stale heartbeats, and trusted schedule snapshots (`src/lib/recall/scheduler.test.ts:26-172`; `src/lib/recall/sync-runner.test.ts:459-830`; `src/db/recall-manual-sync.test.ts:45-275`).
- Product CI runs typecheck, lint, all `src` tests, documentation gates, a production build, and release smokes (`.github/workflows/product-ci.yml:30-41`).
- Several Recall process/systemd smoke commands in `package.json` are not explicit protected Product CI steps, including `test:recall-manual-sync-process` and `smoke:recall-scheduler-wrapper` (`package.json:24-26,130-138`).
- This audit inventories coverage; it does not claim a fresh test pass.

## Implications for NotebookLM feasibility

1. **MVP scope must be append-only new eligible items.** Edits and deletes require explicit item versions and tombstones first.
2. **Discovery needs a transactional outbox.** Insert the new-item event with item creation and checkpoint the monotonically increasing outbox sequence.
3. **Every destination item needs durable state.** Persist target, canonical hash/mapping version, provider source ID, attempt state, and reconciliation state.
4. **Remote ambiguity must be first-class.** A successful provider create followed by a lost response cannot be treated as a normal retry.
5. **Private notes remain opt-in.** Provider consent for one AI feature does not imply consent to NotebookLM export.
6. **Existing PDFs map to extracted Markdown/text.** Do not claim original-file upload availability unless a retained file is verified.
7. **Use a trusted external worker.** Reuse the Recall isolation boundary, while adding encrypted mutable OAuth token storage and revocation support.

## Audit limitations

- No current production host or database was accessed.
- Merge and repository evidence do not prove that the manual Recall worker/UI is enabled on the host.
- No tests were executed in this audit phase.
- The live Wiki was inspected at `317e40e8de08fc492e0e2662b5f45b8bb7e48fcd`; its runtime statements remain dated evidence, not a fresh production check.
