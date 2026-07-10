# Product Overview

Purpose: Describe what AI Brain does and separate working capabilities from future goals.
Audience: AI agents, engineers, and technical product collaborators.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-09; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Product Jobs

| Job | Current capability | Important qualification |
|---|---|---|
| Capture | Notes, articles, YouTube, PDFs, transcripts, Android share, extension, Telegram, and Recall | Fidelity varies by source and some paths exist on only one baseline |
| Organize | Tags, topics, collections, summaries, quality states, repair, and review inboxes | Main and the documentation branch have different review implementations |
| Find | Full-text, semantic, and hybrid retrieval | Results require successful enrichment and embedding |
| Ask | Streamed RAG answers with scopes, citations, and persisted threads | Provider and citation quality can fail independently |
| Sync | Guarded daily Recall ingestion | Runtime is documented but the complete production SHA is Unknown |
| Use remotely | Hosted web app, private Android sideload, and extension | Android is not a public store release |
| Operate safely | Health checks, backups, off-site backup, redaction, services, and timers | Exact production operations remain private |

## Product Shape

AI Brain is single-user by design. It stores the knowledge library in SQLite, uses background jobs for enrichment and embeddings, and exposes the same capture API to the web UI, extension, Android client, and Telegram integration. Recall sync maps external cards into the same item/capture model through fidelity gates.

Pinned source anchors: [library](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/app/library/page.tsx), [capture](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/app/capture/page.tsx), [Ask](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/app/ask/page.tsx), and [Recall runner](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/recall/sync-runner.ts).

## Status Boundaries

- `Shipped` describes a usable product capability with evidence.
- `Main` describes code merged into the default branch.
- `Branch-only` describes code present only in the documentation worktree baseline.
- `Deployed-verified` requires dated evidence tied to a source SHA.
- `Deployed-unverified` means operation is documented but the exact complete runtime revision is not proven.
- `Planned` means no shipped implementation was found.

See the [Feature Catalog](Feature-Catalog) for the complete matrix.

## Future Goals

Spaced repetition, generated pages, multi-step flows, a knowledge graph UI, Obsidian synchronization, and a fully offline mobile library remain planned or incomplete. Existing schema fragments, related-item retrieval, review inboxes, and offline fallback pages must not be presented as those completed products.
