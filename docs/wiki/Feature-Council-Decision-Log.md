# Feature Council Decision Log

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Created: 2026-06-28 21:23 IST  
Version: v2 after core adversarial review

## Council Roles

| Role | Decision lens |
| --- | --- |
| Coordinator | Fit to goal, consistency, final package integrity |
| Expert project manager | Sequencing, blockers, milestone discipline |
| Growth/engagement PM | User value, habit formation, retention |
| Platform/data PM | Data model, ingestion, retrieval, privacy |
| Power-user/workflow PM | Daily utility, edge cases, user trust |
| Technical architect | Feasibility, security, scalability, rollback |
| UX/UI designer | Flows, states, accessibility, mobile/desktop behavior |
| QA/reviewer | Acceptance criteria, testability, failure states |

## Approved Packages

| Package | Outcome | Priority | Why |
| --- | --- | --- | --- |
| FCP-001 Capture Quality And Repair Center | Proceed | P0 | Directly fixes trust gaps in the core capture loop across web, Android, extension, review, and Ask. |
| FCP-002 Source Workspace And Reading Studio Lite | Proceed with reduced scope | P1 | Builds a source-centered reading and citation foundation without taking on a full writing IDE. |
| FCP-003 Contextual Ask And Evidence Scan | Proceed with reduced scope | P1 | Improves existing Ask/search with source control, high-quality retrieval, and claim-level evidence without overbuilding Matrix. |
| FCP-004 Relationship Graph And Connection Map | Proceed with reduced scope | P2 | Extends existing related-items substrate into an inspectable derived graph, but only after owner events and rebuild semantics are clear. |
| FCP-005 AI Services And Privacy Trust Center | Proceed | P0 | Reduces confusion around provider readiness, privacy, diagnostics, offline limits, and source eligibility. |

## Feature-By-Feature Council Decisions

| ID | Decision | Council summary |
| --- | --- | --- |
| RN-F01 | Park for later | Useful if AI Brain becomes multi-project, but current product is single-user/single-store. Storage split would distract from trust gaps. |
| RN-F02 | Proceed through FCP-001/FCP-002 | PDF/source handling exists and should be hardened with metadata, readiness, and source workspace behavior. |
| RN-F03 | Proceed with reduced scope through FCP-002 | Strong workflow value. First release should be source viewer plus notes, not a full research IDE. |
| RN-F04 | Proceed with reduced scope through FCP-002 | Anchors improve retrieval trust and citation quality. Avoid complex annotation layers until PDF viewer basics ship. |
| RN-F05 | Park for later | Full Markdown editor/slash commands is too broad and changes product identity. Revisit after source anchors/citations are real. |
| RN-F06 | Proceed with reduced scope through FCP-002 | Citation metadata and export are valuable once anchors/source records exist. Limit v1 to item/PDF sources and simple `.bib`/APA output. |
| RN-F07 | Proceed through FCP-001/FCP-002 | Metadata editing supports display, search, citations, repair, and trust. |
| RN-F08 | Proceed with reduced scope through FCP-004 | Graph should be derived from existing item/tag/collection/chunk/anchor/evidence data. Do not let graph become source of truth. |
| RN-F09 | Park for later | Neo4j export depends on a mature graph and is not core to daily AI Brain use. |
| RN-F10 | Proceed through FCP-003 | Existing search can be made more trustworthy with source quality filters, freshness checks, and better result explanation. |
| RN-F11 | Proceed through FCP-001/FCP-003 | Existing indexing needs readiness contracts and reset behavior more than a brand-new pipeline. |
| RN-F12 | Needs more research | Matrix is powerful but specialized. It should wait until Evidence Scan and source anchors prove demand. |
| RN-F13 | Proceed with reduced scope through FCP-003 | Claim-level support/contradiction checks fit AI Brain if scoped to selected sources and citations, not a full literature workflow. |
| RN-F14 | Needs more research | Existing vault import has high data safety and identity risk. Require proof packets before approval. |
| RN-F15 | Proceed through FCP-005 | Users need model/provider readiness, degraded states, and diagnostics. Adapt to AI Brain's cloud/local provider reality. |
| RN-F16 | Proceed through FCP-005 | Privacy trust states are required before adding more AI surfaces. |
| RN-F17 | Reject for current product | Paywall is irrelevant for a personal app. Reopen only under a commercialization goal. |
| UX-02 | Proceed through FCP-001 | Capture result contracts are foundational to trust. |
| UX-03 | Proceed through FCP-001 | Repair workflow protects retrieval quality and user confidence. |
| UX-04 | Proceed through FCP-003 | Ask context and quality filters reduce hallucination and source drift. |
| UX-05 | Park until FCP-003 | Android composer should follow the shared Ask contract. |
| UX-06 | Proceed as FCP-001 channel requirement | Share capture must show the same result and repair states as web. |
| UX-09 | Proceed through FCP-005 | Settings must explain privacy, providers, backup, export, and offline truthfully. |
| UX-11 | Proceed through FCP-001 | YouTube weak/transcript states need explicit trust UI. |

## Key Decision Records

### DR-001 - Do not import note.md wholesale

Outcome: accepted. AI Brain is a personal memory and capture system. note.md is a research-writing workspace. Only features that strengthen AI Brain's capture, source trust, retrieval, evidence, graph, and privacy posture should move forward.

### DR-002 - Keep approved v1s implementation-planning only

Outcome: accepted. No production code should be implemented from this package. Every technical plan must include proof gates before code entry.

### DR-003 - Make repair and readiness first-class before advanced AI

Outcome: accepted. Weak-source repair, capture quality, source eligibility, and provider readiness are prerequisites for Evidence Scan, Graph, and Reading Studio.
