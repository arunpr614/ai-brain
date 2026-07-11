# Data Model and Storage

Purpose: Document persistent domains, relationships, migrations, indexing, retention, and privacy boundaries.
Audience: AI agents and engineers changing storage or data flow.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: 2026-07-10; the verified release applied migrations through `023`.
Last reviewed: 2026-07-11.
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
| Integrations | Telegram updates, device-pairing codes, Recall state/runs/items |
| Attached notes | state, current note, revisions, mutation receipts, note FTS/index jobs/provider consents |
| Review substrate | `cards` table exists, but no spaced-repetition product implementation was found |

## Migrations

Migrations are tracked in `_migrations` by full filename and applied lexicographically. Current main contains 24 SQL files through `023`, including both `017_topics.sql` and `017_transcript_recovery.sql`. The former branch conflict is resolved, but duplicate numeric prefixes remain a tooling/human hazard. Do not rename applied migrations or infer order from the prefix alone.

## Retrieval storage

FTS stores lexical item and eligible attached-note text. Chunks retain explicit source kind and version. Vectors use 768 dimensions with a row-ID bridge. Semantic events/generations support invalidation after content or note-policy changes.

## Retention and privacy

SQLite, artifact files, local backups, browser note journals, service-worker caches, extension storage, and Android preferences are not application-level encrypted. Default library export excludes attached notes; note export is explicit. Database backup does not include capture-artifact files.

Begin schema changes in `src/db/migrations/`, then update the owning repository, queue/trigger behavior, migration tests, [Feature Architecture](Feature-Architecture), and this page.
