# Implemented Versus Explored Matrix

**Verified:** protected-main release `167a15d57b8f70574a017ea4cda507870f3600d4` on 2026-07-22, including the narrow NotebookLM export's production UI-only state. Flags are `1:0:0` (UI on, queue off, provider writes off); no NotebookLM target/source, signed-in provider canary, or owner-only real-content enablement is claimed.

This matrix resolves the most likely sources of overclaim. Detailed rows are in `MASTER_FEATURE_AND_IDEA_INVENTORY.md`.

| Product area | Current implementation | Explored/planned extension | Boundary that must remain explicit |
|---|---|---|---|
| Capture repair | Quality signals, artifacts, Needs Upgrade, Review, per-item repair, transcript replacement | One unified Repair Center with complete cross-channel lifecycle | Current primitives do not equal the entire FCP-001 workspace |
| Reading | Item Original/Digest tabs and source-reading Focus | Reading Studio, PDF canvas, anchors, highlights, citations | Focus is not annotation/citation tooling |
| Ask | Streaming cited Ask with item/selection/tag/topic/collection scopes | Evidence Scan, claim verdicts, retrieval snapshot, quality/source policies | Scoped Ask is not Evidence Scan |
| Connections | Related-item similarity | Explainable persisted graph and accessible graph UI | Similarity output is not a graph model |
| Provider trust | Provider health, note consent/default, privacy/offline copy | Complete Trust Center, data-flow readiness history, diagnostics bundle | Settings fragments are not the full FCP-005 dashboard |
| Review | Attention and weak-source queues | FSRS/spaced repetition learning queue | Quality review is not SRS |
| Notes | Standalone note items and one attached My notes document per item | Multiple notes, backlinks, templates, tasks, synthesis, rich editor tools | Current model is intentionally one attached Markdown note |
| Mobile offline | Cached shell/visited pages and note draft journal | Complete offline library, offline capture queue, sync | Fallback is not offline parity |
| Export | Item Markdown, library ZIP, explicit note export | Markdown folder adoption, round-trip import, Obsidian sync | Export is one-way |
| NotebookLM | Experimental one-click export for one explicit item and one fixed owner-only private consumer notebook; protected-main code is deployed UI-only, while queue and provider writes remain off | Broad/daily/batch synchronization, multiple targets, updates/deletes, round trip, and supported provider API | Authenticated Brain UI proof and an attested, stable-installed extension do not establish a loaded/paired connector, target/source, signed-in provider canary, or real-content export; broad synchronization remains Deferred |
| YouTube recovery | User-provided transcript and recovery worker | Official-caption OAuth and owned-media STT | Both adapters remain inactive/not wired |
| Android sharing | URL, note, and one PDF | Multiple PDFs and public-store distribution | Multi-PDF is intentionally rejected |
| Runtime model | Hosted private service with managed edge and configurable providers | Original local-only Mac/Ollama plan | The local-only promise is superseded |

## Status decision rules

- **Implemented:** current code plus reachability evidence under stated availability.
- **Partially implemented:** meaningful current behavior exists but a material contract element is missing.
- **Feature-flagged:** implemented behavior is materially controlled by rollout configuration.
- **Experimental:** candidate behavior exists under explicit safety and rollout limits; this classification alone does not establish deployment, availability, or live-provider proof.
- **Inactive:** code exists but current product paths deliberately disable or do not wire it.
- **Planned/Explored/Deferred/Rejected/Superseded:** intention and decision history only; never use these pages to infer current runtime.
