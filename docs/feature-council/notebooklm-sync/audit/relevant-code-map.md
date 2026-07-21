# NotebookLM Synchronization Research — Relevant AI Brain Code Map

**Baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`
**Purpose:** Fast evidence navigation for reviewers. References identify inspected code; they do not imply that NotebookLM support exists.

| Area | Evidence |
|---|---|
| SQLite configuration and migrations | `src/db/client.ts:21-40,101-170` |
| Item fields and timestamps | `src/db/client.ts:187-237` |
| ID generation | `src/db/client.ts:271-279` |
| Item insert and workflow initialization | `src/db/items.ts:55-148` |
| Item ordering, deletion, and content repair | `src/db/items.ts:288-300,340-417` |
| Core item schema | `src/db/migrations/001_initial_schema.sql:15-35` |
| Workflow events | `src/db/migrations/025_item_workflow.sql:55-87` |
| Source-aware chunks/events | `src/db/migrations/023_source_aware_chunks.sql:11-27,59-76` |
| Enrichment and embedding jobs | `src/db/migrations/003_enrichment_queue.sql:14-34`; `src/db/migrations/006_embedding_jobs.sql:8-32` |
| URL capture | `src/app/api/capture/url/route.ts:87-143,245-379` |
| Platform mapping | `src/lib/capture/platform.ts:23-58`; `src/lib/capture/capture-url.ts:28-75` |
| YouTube extraction | `src/lib/capture/youtube.ts:223-380` |
| PDF route and extraction | `src/app/api/capture/pdf/route.ts:48-165`; `src/lib/capture/pdf.ts:46-110` |
| Capture artifacts | `src/lib/capture/artifacts.ts:14-24,38-59,78-175` |
| Attached-note data | `src/db/migrations/022_item_notes.sql:7-91`; `src/db/item-notes.ts:132-225,336-515` |
| Item, bulk, and note export | `src/app/api/items/[id]/export.md/route.ts:27-50`; `src/app/api/library/export.zip/route.ts:25-94`; `src/app/api/items/[id]/note/export.md/route.ts:26-44` |
| Recall schema and repository | `src/db/migrations/020_recall_sync.sql:109-169`; `src/db/recall-sync.ts:109-413` |
| Recall client, mapper, importer | `src/lib/recall/client.ts:35-112`; `src/lib/recall/mapper.ts:24-209`; `src/lib/recall/importer.ts:69-270` |
| Recall planner and runner | `src/lib/recall/scheduler.ts:38-130`; `src/lib/recall/sync-runner.ts:112-615` |
| Manual request/execution schema | `src/db/migrations/024_recall_manual_sync.sql:3-74` |
| Manual lifecycle repository | `src/db/recall-manual-sync.ts:121-544` |
| Manual API, service, and UI | `src/app/api/settings/recall-sync/route.ts:17-125`; `src/lib/recall/manual-sync-service.ts:27-188`; `src/components/recall-manual-sync.tsx:106-447` |
| Trusted Recall wrapper | `scripts/recall-scheduled-apply.sh:37-322` |
| Recall lifecycle and worker | `scripts/recall-sync-lifecycle.ts:64-155`; `scripts/recall-manual-sync-worker.ts:14-117` |
| Recall systemd units | `scripts/deploy/brain-recall-sync.{service,timer}`; `scripts/deploy/brain-recall-manual-sync.{service,path,timer}` |
| Server worker bootstrap | `src/instrumentation.ts:25-71` |
| Generic worker retries | `src/lib/queue/enrichment-worker.ts:31-38,128-168,233-250`; `src/lib/queue/transcript-worker.ts:27-89` |
| Browser auth and settings | `src/lib/auth.ts:42-135`; `src/db/settings.ts:7-35` |
| Shared bearer and pairing | `src/lib/auth/bearer.ts:82-175`; `src/lib/device-pairing/codes.ts:58-163` |
| AI provider factories | `src/lib/llm/factory.ts:29-76`; `src/lib/embed/factory.ts:18-47` |
| Provider retry example | `src/lib/llm/anthropic.ts:38-44,163-229` |
| Error sink and health | `src/lib/errors/sink.ts:21-40`; `src/app/api/health/route.ts:17-30` |
| Product CI and scripts | `.github/workflows/product-ci.yml:30-41`; `.github/workflows/agent-docs.yml:42-53`; `package.json:14-169` |

## Highest-value review paths

For implementation planning, begin with `src/db/items.ts`, migrations `020`, `024`, and `025`, `src/lib/recall/sync-runner.ts`, `src/lib/recall/importer.ts`, the three existing Markdown exporters, and the trusted Recall deployment boundary. Review authentication only after the Google edition and supported interface are known.
