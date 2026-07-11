# Research Feature Inventory

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Latest revision within the 2026-06-28 planning package.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical planning record from 2026-06-28.** This is the latest revision within that planning package. It is not proof of current implementation, deployment, or runtime behavior. Use the living [Feature Catalog](Feature-Catalog) for present status.

Created: 2026-06-28 21:23 IST  
Version: v2 after core adversarial review

## Source Interpreted

The configured research source is a directory:

`local research workspace`

The key research corpus is `docs/note-md-exploration`, especially:

- `FEATURE_RESEARCH_v2.md`
- `SOURCE_MAP_v2.md`
- `PRD_INDEX_v2.md`
- `ARCHITECTURE_FINDINGS_v2.md`
- `IMPLEMENTATION_PLAN_INDEX_v2.md`
- `PROJECT_TRACKER_v2.md`

The research package is about note.md. It is public-documentation-derived, not source/runtime proof.

## Evidence Confidence Legend

| Label | Meaning |
| --- | --- |
| Official confirmed | Supported by official product, pricing, privacy, or workflow pages. |
| Official technical | Supported by official technical articles. |
| Marketplace partial | Supported by App Store/Product Hunt evidence, not full runtime proof. |
| Inferred/gap | Product-derived or implementation-derived inference. Requires caution. |

## Feature Inventory

| Research ID | Feature | User job | Evidence confidence | AI Brain mapping |
| --- | --- | --- | --- | --- |
| RN-F01 | Project/vault setup and local-first workspace | Keep notes, PDFs, citations, and research files together privately | Official confirmed + marketplace partial | Park. AI Brain is a single personal knowledge store today; multi-vault would be a storage strategy decision. |
| RN-F02 | PDF import and source management | Add papers/documents into a durable source library | Official confirmed | Enhancement. AI Brain imports PDFs but lacks rich source records and repair/readiness states. |
| RN-F03 | Reading Studio side-by-side PDF + notes | Read source material and take notes without switching tools | Official confirmed + marketplace partial | Approved reduced scope as Source Workspace/Reading Studio Lite. |
| RN-F04 | Highlights, bookmarks, annotations, citation anchors | Preserve passages and return to them later | Official confirmed + marketplace partial | Approved reduced scope as anchors attached to captured items/PDFs. |
| RN-F05 | Markdown editor and slash commands | Draft research writing with source/citation commands | Official confirmed | Park. AI Brain is memory-first; writing IDE can follow after source/citation foundations. |
| RN-F06 | Smart citations, BibTeX, APA, `.bib` export | Cite sources without a separate citation manager | Official confirmed | Approved reduced scope inside Source Workspace. |
| RN-F07 | Literature/source metadata management | Correct metadata used for display, search, and citation | Official confirmed | Approved as part of Capture Quality and Source Workspace. |
| RN-F08 | Graph View and relationship model | See relationships among items, sources, citations, anchors, and evidence | Official confirmed + official technical | Approved reduced scope as derived relationship map, not source of truth. |
| RN-F09 | Neo4j export | Move local research graph to external Neo4j tooling | Official confirmed + external platform docs | Park. Dependent on graph maturity and niche user need. |
| RN-F10 | Semantic search | Find relevant local passages by meaning and keywords | Official technical | Enhancement. AI Brain has semantic/hybrid search; approve improved scope/readiness/freshness contracts. |
| RN-F11 | Source indexing and extraction pipeline | Turn sources into chunks, embeddings, FTS rows, artifacts, readiness contracts | Official technical | Approved as foundation inside Capture Quality and Contextual Ask. |
| RN-F12 | Matrix extraction | Fill literature-review tables from selected sources with provenance | Official technical | Needs more research. Strong but specialized and heavy. |
| RN-F13 | Evidence Scan | Check claims against indexed sources and classify support/contradiction/nuance | Official technical | Approved reduced scope inside Contextual Ask. |
| RN-F14 | Existing Markdown vault adoption | Preflight/copy-import existing Markdown without mutating originals | Marketplace partial + official storage foundation | Needs more research. Source mutation and identity guarantees are high risk. |
| RN-F15 | Local AI model/runtime management | Understand model readiness, degraded states, diagnostics, cache lifecycle | Official technical | Approved as AI Services Trust Center, adapted to AI Brain provider model. |
| RN-F16 | Privacy settings and optional analytics | Trust local/private content handling and opt-in analytics | Official confirmed | Approved as Privacy Trust Center. |
| RN-F17 | Subscription/paywall and entitlement | Gate Premium AI without locking local content | Official confirmed | Reject for this personal app unless commercialization becomes a new goal. |

## Additional AI Brain UX Inputs From Research Project

| Input ID | Idea | Disposition |
| --- | --- | --- |
| UX-02 | Capture result contracts | Approved under FCP-001. |
| UX-03 | Weak-source repair workflow | Approved under FCP-001. |
| UX-04 | Ask context and high-quality source scope | Approved under FCP-003. |
| UX-05 | Android unified Ask composer | Park. Depends on FCP-003 but should be mobile polish after web contracts. |
| UX-06 | Android share result surface | Approved as channel requirement under FCP-001, not standalone. |
| UX-07 | QA evidence and release gates | Included in all technical plans and project tracker. |
| UX-09 | Settings/privacy/offline trust states | Approved under FCP-005. |
| UX-11 | YouTube item trust strip | Included in FCP-001 as source-specific repair/trust metadata. |

## Research Constraints To Preserve

- Do not treat note.md public documentation as implementation proof for AI Brain.
- Keep marketplace claims, especially existing-vault/import behavior, caveated.
- Do not overclaim local-only privacy where AI Brain currently uses cloud providers.
- User-authored/manual edits must remain authoritative over AI outputs.
- Heavy AI features need deletion, diagnostics, and derived-state reset contracts before implementation.
