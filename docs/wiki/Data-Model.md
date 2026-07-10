# Data Model

Purpose: Describe persistent domains, migration history, and item lifecycle.
Audience: AI agents and engineers changing storage or data flow.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-10; production migrations verified through `023_source_aware_chunks.sql`.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Domains

| Domain | Persistent responsibility | Owning modules |
|---|---|---|
| Settings and auth | PIN-derived auth state, bearer configuration, provider settings | `src/db/settings.ts`, auth modules |
| Items | Captured title, body, source, quality, enrichment state, timestamps | `src/db/items.ts` |
| Search | FTS projection, chunks, row-id mapping, vector index | `src/db/chunks.ts`, search/retrieve modules |
| Enrichment | Enrichment queue, embedding jobs, generated summary and taxonomy | queue, enrich, and embed modules |
| Organization | Tags, topics, collections, and item joins | tags, topics, collections modules |
| Chat | Threads and messages | `src/db/chat.ts` |
| Capture evidence | Artifacts, metadata cache, transcript sources and segments | capture-artifacts, metadata-cache, transcripts modules |
| Integrations | Telegram update idempotency and device pairing codes | telegram-updates and device-pairing modules |
| Recall | Checkpoints, locks, runs, source identity, and sync state | `src/db/recall-sync.ts` |
| Attached manual notes | Per-item epoch/tombstone, canonical Markdown, revisions, mutation receipts, FTS, semantic jobs, and provider consent | `src/db/item-notes.ts`, note policy/worker modules |

Pinned database source: [worktree DB modules](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/db) and [worktree migrations](https://github.com/arunpr614/ai-brain/tree/8178117c80923e5724e355fb2684cbc836013d39/src/db/migrations).

## Migration Sequence

The integrated release-candidate baseline runs migrations `001` through `023`: the prior foundation through Recall sync, transcript trigger reconciliation, separate attached manual notes, and source-aware semantic chunks with a durable vector row-id allocator.

Migration 022 keeps canonical Markdown and derived plain text separate from items and AI summaries. Migration 023 labels legacy, original, AI-digest, and manual-note chunks explicitly. A migration that rebuilds a referenced table declares foreign-key disablement; the runner applies it before the transaction, restores it afterward, and rejects any changed violation manifest.

The default branch diverges after the shared history and uses migration `017_transcript_recovery.sql` for review and transcript recovery. The worktree uses `017_topics.sql`. This filename-number collision means a merge cannot be considered safe from Git success alone. A future integration must compare deployed `schema_migrations`, table shapes, and both branches' assumptions before producing a new monotonic sequence.

## Item Lifecycle

1. A client submits content through a capture entrypoint.
2. Capture normalizes source identity, deduplicates, extracts body/metadata, records provenance, and assigns quality.
3. The item is persisted even when enrichment is delayed or extraction is partial, subject to policy.
4. Enrichment creates summaries and taxonomy.
5. Chunking and embedding create retrieval records and vectors.
6. Search and Ask query FTS and/or vectors.
7. Repair, upgrade, transcript recovery, or Recall reprocessing may improve the item later.

## Data Safety

- Use migrations for durable schema changes; do not patch production SQLite manually.
- Preserve idempotency for webhook and Recall imports.
- Keep item, note, chunk, row-id, and vector writes transactionally aligned; vec0 requires explicit deletion before bridge cascades.
- Treat backup/restore, backfill, and migration execution as production-write operations.
- Do not expose private item content in diagnostics or documentation.
