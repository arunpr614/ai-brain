# Product Overview

Purpose: Explain AI Brain's users, jobs, workflows, terminology, and current product boundaries.
Audience: AI agents, engineers, and product/design collaborators.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-23 at deployed protected-main application `8314d39fd11cf82e612de44e6ac0fa0cf1633719`; feature scope varies. NotebookLM has a provider-level production URL-source canary.
Last reviewed: 2026-07-23.
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
9. Export/back up the library, or deliberately copy one reviewed item to the configured private NotebookLM target when that experimental integration is fully enabled.

## Product jobs

| Job | Current behavior | Important boundary |
|---|---|---|
| Capture | Notes, URLs/articles, selected text, YouTube, PDFs, transcripts, Android, extension, Telegram, Recall | Source fidelity varies; inactive recovery adapters remain visible only as unavailable options |
| Organize/read | Library/item views, category/tags/topics/collections, Review/Needs Upgrade, source Focus, My notes | No multi-vault workspace, annotations, or graph |
| Process backlog | Inbox/Board/List/Archived, versioned single-item moves, filters, exact counts/metrics, enrollment, Restore/Reprocess/Undo | No batch, rank, project fields, collaboration, global archive, or drag dependency |
| Find/ask | FTS, semantic/hybrid retrieval, Related, scoped cited Ask, persisted chat | Retrieval quality and provider/citation behavior can fail independently |
| Operate remotely | Hosted web app, private Android shell, extension, Telegram | Not a public multi-user or complete offline-native product |
| Protect/recover | PIN/session/bearer boundaries, consent, database backups, health and queues | Private does not mean E2EE; artifact files are outside database backups |
| Export to NotebookLM | Experimental one-item static export to one fixed owner-only private consumer notebook; safe saved URLs become web/YouTube sources and URL-less notes become copied text | Deployed at `1:1:1`; extension 0.7.4 paired at protocol v2; private target healthy; provider-level URL-source canary verified |

## Boundaries

- Single owner and one SQLite store; no tenant/team/role/sharing model.
- Hosted architecture with configurable providers; the original “100% local Mac/Ollama” model is superseded.
- Android is a private thin client, not public-store/offline parity.
- Review and Needs Upgrade are source-quality queues, not spaced repetition.
- Related is query-time similarity, not a graph.
- Export is not round-trip Markdown/Obsidian synchronization.
- NotebookLM export is not synchronization, provider-backed enrichment, or a general connector platform. It does not update/delete remote sources, import NotebookLM content, choose among notebooks per click, or run in batch/schedule mode.
- The public NotebookLM entrance is [https://notebooklm.google/](https://notebooklm.google/); the signed-in application and optional Chrome permission use `https://notebooklm.google.com/`.
- Schema/type substrate for cards, podcasts, EPUB, or DOCX does not establish product support.

See [Glossary](Glossary), [Feature Catalog](Feature-Catalog), and [Ideas and Exploration](Ideas-and-Exploration-Catalog).
