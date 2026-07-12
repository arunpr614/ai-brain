# Data Model and Storage

Purpose: Document persistent domains, relationships, migrations, indexing, retention, and privacy boundaries.
Audience: AI agents and engineers changing storage or data flow.
Verified against: deployed application `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Runtime evidence through: 2026-07-12; production applies 27 migrations through `025_item_workflow.sql` including the preserved historical `018_topics.sql` identity.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

`items` is the central aggregate. It separates content kind (`source_type`) from ingestion channel (`capture_source`) and carries quality/provenance, generated output, and processing state.

| Domain | Tables/state |
|---|---|
| Core | settings and items |
| Organization | tags/item_tags, topics/item_topics, collections/item_collections |
| Retrieval | items FTS, chunks, row-ID bridge, vec0 vectors, embedding jobs, semantic events |
| Enrichment | enrichment jobs, generated item fields, usage records |
| Chat | threads and messages with citation metadata |
| Capture evidence | artifacts and metadata cache; artifact bytes live outside SQLite |
| Transcript policy/provenance | jobs, attempts, policy decisions, sources, segments |
| Integrations | Telegram updates, device-pairing codes, Recall state/runs/items plus manual requests/executions/schedule snapshot |
| Attached notes | state, current note, revisions, mutation receipts, note FTS/index jobs/provider consents |
| Card workflow | validated item projection, append-only events, mutation receipts, tab Undo slots, enrollment jobs, readiness/preferences/epochs |
| Review substrate | `cards` table exists, but no spaced-repetition product implementation was found |

## Migrations

Migrations are tracked in `_migrations` by full filename, SHA-256, and lexicographic application order. The deployed baseline includes `024_recall_manual_sync.sql` and `025_item_workflow.sql`, plus the exact preserved historical `018_topics.sql` identity. Both `017_topics.sql` and `017_transcript_recovery.sql` remain; duplicate numeric prefixes are a tooling/human hazard. Do not rename applied migrations or infer order from the prefix alone.

Recall request rows preserve the immutable 30-minute request deadline, idempotency key, safe terminal reason, and aggregate counts. Execution rows link manual or automatic occurrences to dry-run/apply core run IDs and persist stage, heartbeat, counts, and terminal outcome. The last-success marker is updated atomically only when a linked apply is complete and final validation has passed.

Workflow fields on `items` hold current status, version, current-entry timestamps, and Done-only archive state. Content-free events preserve lifecycle history; immutable receipts preserve terminal mutation outcomes; Undo slots scope one eligible reversal to an actor tab; enrollment jobs freeze and resume an explicit legacy-item selection. New captures initialize the projection/event/receipt atomically. Historical items remain dormant until explicitly enrolled. Existing content repair, enrichment, taxonomy, attached notes, retrieval, and duplicate handling preserve workflow identity.

## Retrieval storage

FTS stores lexical item and eligible attached-note text. Chunks retain explicit source kind and version. Vectors use 768 dimensions with a row-ID bridge. Semantic events/generations support invalidation after content or note-policy changes.

## Retention and privacy

SQLite, artifact files, local backups, browser note journals, service-worker caches, extension storage, and Android preferences are not application-level encrypted. Default library export excludes attached notes; note export is explicit. Database backup does not include capture-artifact files.

Begin schema changes in `src/db/migrations/`, then update the owning repository, queue/trigger behavior, migration tests, [Feature Architecture](Feature-Architecture), and this page.
