# Product Overview

Purpose: Explain AI Brain's users, jobs, workflows, terminology, and current product boundaries.
Audience: AI agents, engineers, and product/design collaborators.
Verified against: `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`.
Runtime evidence through: 2026-07-12 at deployed application `ea7b159515fc37f76ffdb83dedf2d33d17f9a193`; feature scope varies.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

AI Brain serves one owner who wants to capture material from several channels, retain trustworthy source context, let background AI organize/index it, find it later, and ask cited questions without turning the system into a collaborative workspace or full research-writing IDE.

## Core workflow

1. Capture or import a source.
2. Assess fidelity and preserve provenance.
3. Enrich, chunk, and index it.
4. Process captured cards through Inbox, To Do, In Progress, Done, and a workflow-only archive when deliberate triage is useful.
5. Browse, organize, read, review, and repair retained items.
6. Find them through exact, semantic, or hybrid retrieval.
7. Ask cited questions over a controlled source scope.
8. Add private attached notes and optionally include them in retrieval/AI under explicit policy.
9. Export and back up the library.

## Product jobs

| Job | Current behavior | Important boundary |
|---|---|---|
| Capture | Notes, URLs/articles, selected text, YouTube, PDFs, transcripts, Android, extension, Telegram, Recall | Source fidelity varies; inactive recovery adapters remain visible only as unavailable options |
| Organize/read | Library/item views, category/tags/topics/collections, Review/Needs Upgrade, source Focus, My notes | No multi-vault workspace, annotations, or graph |
| Process backlog | Inbox/Board/List/Archived, versioned single-item moves, filters, exact counts/metrics, enrollment, Restore/Reprocess/Undo | No batch, rank, project fields, collaboration, global archive, or drag dependency |
| Find/ask | FTS, semantic/hybrid retrieval, Related, scoped cited Ask, persisted chat | Retrieval quality and provider/citation behavior can fail independently |
| Operate remotely | Hosted web app, private Android shell, extension, Telegram | Not a public multi-user or complete offline-native product |
| Protect/recover | PIN/session/bearer boundaries, consent, database backups, health and queues | Private does not mean E2EE; artifact files are outside database backups |

## Boundaries

- Single owner and one SQLite store; no tenant/team/role/sharing model.
- Hosted architecture with configurable providers; the original “100% local Mac/Ollama” model is superseded.
- Android is a private thin client, not public-store/offline parity.
- Review and Needs Upgrade are source-quality queues, not spaced repetition.
- Related is query-time similarity, not a graph.
- Export is not round-trip Markdown/Obsidian synchronization.
- Schema/type substrate for cards, podcasts, EPUB, or DOCX does not establish product support.

See [Glossary](Glossary), [Feature Catalog](Feature-Catalog), and [Ideas and Exploration](Ideas-and-Exploration-Catalog).
