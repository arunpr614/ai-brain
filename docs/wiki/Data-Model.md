# Data Model and Storage

Purpose: Document persistent domains, relationships, migrations, indexing, retention, and privacy boundaries.
Audience: AI agents and engineers changing storage or data flow.
Verified against: deployed application `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-22; production applies 28 migrations through `026_notebooklm_export.sql` including the preserved historical `018_topics.sql` identity.
Last reviewed: 2026-07-22.
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
| NotebookLM export | connector pairing codes, scoped connectors, at most one active private target, runtime control, frozen export requests, request events and content-free operational events |
| Review substrate | `cards` table exists, but no spaced-repetition product implementation was found |

## Migrations

Migrations are tracked in `_migrations` by full filename, SHA-256, and lexicographic application order. The deployed baseline includes `024_recall_manual_sync.sql`, `025_item_workflow.sql` and `026_notebooklm_export.sql`, plus the exact preserved historical `018_topics.sql` identity. Both `017_topics.sql` and `017_transcript_recovery.sql` remain; duplicate numeric prefixes are a tooling/human hazard. Do not rename applied migrations or infer order from the prefix alone.

Recall request rows preserve the immutable 30-minute request deadline, idempotency key, safe terminal reason, and aggregate counts. Execution rows link manual or automatic occurrences to dry-run/apply core run IDs and persist stage, heartbeat, counts, and terminal outcome. The last-success marker is updated atomically only when a linked apply is complete and final validation has passed.

Workflow fields on `items` hold current status, version, current-entry timestamps, and Done-only archive state. Content-free events preserve lifecycle history; immutable receipts preserve terminal mutation outcomes; Undo slots scope one eligible reversal to an actor tab; enrollment jobs freeze and resume an explicit legacy-item selection. New captures initialize the projection/event/receipt atomically. Historical items remain dormant until explicitly enrolled. Existing content repair, enrichment, taxonomy, attached notes, retrieval, and duplicate handling preserve workflow identity.

NotebookLM export stores a hashed connector credential and non-authenticating token hint, binding/subject fingerprints, a safe target label, capacity and privacy observations, durable request state, and opaque provider/source aliases; it never stores the raw connector token. Migration 027 records whether a request is a URL or copied-text source and temporarily freezes the validated URL when applicable. URL/title/text snapshots are purged after their bounded retention window while content-free request history and events remain for reconciliation and operations. Google session material remains in the owner's local Chrome profile and is never stored by AI Brain.

## Retrieval storage

FTS stores lexical item and eligible attached-note text. Chunks retain explicit source kind and version. Vectors use 768 dimensions with a row-ID bridge. Semantic events/generations support invalidation after content or note-policy changes.

## Retention and privacy

SQLite, artifact files, local backups, browser note journals, service-worker caches, extension storage, and Android preferences are not application-level encrypted. Default library export excludes attached notes; note export is explicit. Database backup does not include capture-artifact files. NotebookLM-aware backup tooling securely removes transient export title/text snapshots from the isolated backup copy before durable off-site handling.

Begin schema changes in `src/db/migrations/`, then update the owning repository, queue/trigger behavior, migration tests, [Feature Architecture](Feature-Architecture), and this page.
