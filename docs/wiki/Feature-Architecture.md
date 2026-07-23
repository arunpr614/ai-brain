# Feature Architecture

Purpose: Map major capabilities from user entrypoints through domain logic, storage, jobs, and integrations.
Audience: AI agents and engineers planning code changes.
Verified against: `167a15d57b8f70574a017ea4cda507870f3600d4`.
Runtime evidence through: 2026-07-22 at deployed application `167a15d57b8f70574a017ea4cda507870f3600d4`; feature scope varies and NotebookLM is UI-only.
Last reviewed: 2026-07-22.
Owner: AI Brain maintainer.

| Capability | Entry points | Domain path | Storage/jobs | Change-impact page |
|---|---|---|---|---|
| Capture | capture pages/APIs, Android, extension, Telegram, Recall | `src/lib/capture/` and repair policy | items, artifacts/cache, enrichment/transcript jobs | [Capture and Ingestion](Capture-and-Ingestion) |
| Library/read/organize | Library/item/topic/collection pages and actions | item/library/taxonomy modules | items and organization joins | [Library and Item Management](Library-and-Item-Management) |
| Card processing | Processing, Library summary, capture feedback, mobile More, command palette, item workflow controls | processing query/readiness/config and item-workflow repositories | item workflow projection, events, receipts, Undo slots, enrollment, preferences/readiness/epochs | [Card Processing Workflow](Card-Processing-Workflow) |
| Search/Related/Ask | search/Ask routes and item companions | chunk/embed/retrieve/search/related/Ask | FTS, chunks, vectors, chat | [Search, RAG, and Ask](Search-RAG-and-Ask) |
| Attached notes | item My notes tab and note/settings APIs | editor, notes policy, note repository | state/current/revisions/receipts/FTS/jobs/consent | [Manual Content Notes](Manual-Content-Notes) |
| Enrichment | capture completion and workers | prompt/provider/enrich/embed queues | generated item fields, jobs, usage | [Enrichment and AI Providers](Enrichment-and-AI-Providers) |
| Pairing/clients | settings, setup APK, native share, extension | auth, pairing, reachability, result mapping | settings, codes, client-local token | [Authentication and Pairing](Authentication-Sessions-and-Device-Pairing) |
| NotebookLM static export | item export control, settings connector setup, extension 0.7.4 | `src/lib/notebooklm/`, scoped protocol v2, local URL/copied-text provider adapter | connector/target/runtime control, frozen URL-or-text requests, request/operational events, retention timer | [NotebookLM One-Click Export](NotebookLM-One-Click-Export) |
| Recall | external daily timer and packaged runner | client/map/fidelity/import/sync | Recall run/item/state tables | [Recall Synchronization](Recall-Synchronization) |
| Operations | instrumentation, deploy, backup, health | scripts/services/provider checks | SQLite snapshots, logs, reports | [Deployment and Operations](Deployment-and-Operations) |

## Cross-cutting invariants

- Original source, generated digest, standalone note item, and attached My notes remain distinct.
- Capture provenance and quality survive repair and reprocessing.
- Workflow state and archive never replace Library membership, content identity, notes, retrieval, or quality state.
- NotebookLM export is one explicit URL or text source to one pre-bound private consumer notebook, never continuous or bidirectional synchronization.
- Queue acceptance and provider creates require independent fail-closed rollout gates; the current `1:0:0` state exposes UI only, with the extension not loaded/paired and no provider canary or owner enablement.
- Save, enrichment, embedding, transcript, and note-index states can fail independently.
- Code presence is not runtime proof.
- Migrations are append-only and tracked by full filename.
- Production writes require current private context and explicit authority.

See [Repository Map](Repository-Map), [Data Model](Data-Model), and [APIs and Integrations](APIs-and-Integrations) for deeper entrypoints.
