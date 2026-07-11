# Search, RAG, and Ask

Purpose: Explain lexical/vector retrieval, Related, cited Ask, chat persistence, and evidence boundaries.
Audience: AI agents changing search, indexing, ranking, citations, or chat.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: 2026-07-10; strict provider and Ask boundaries were verified for the deployed release.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Overall status:** Implemented · **Confidence:** High for code/tests; runtime evidence is feature-specific

The single owner needs to rediscover saved material and ask grounded questions without losing source scope. **Target user:** the single owner; maintainers support retrieval, provider and citation behavior.

| Capability | Status | Boundary |
|---|---|---|
| Full-text search | Implemented | Items plus eligible attached-note exact text |
| Semantic/hybrid search | Implemented | 768-dimensional vectors and reciprocal-rank fusion |
| Related items | Implemented | Query-time similarity, not graph edges |
| Scoped cited Ask | Implemented | Library, item, selection, tag, topic and collection scopes |
| Chat persistence | Implemented | Single-owner threads/messages/citations |
| Evidence Scan proposal | Planned | Scoped Ask/citations are adjacent implemented substrate; no verdict/snapshot/policy experience |

## Runtime flow

FTS queries item/note indexes. Semantic search embeds a query and performs sqlite-vec KNN. Hybrid retrieval fuses lexical and vector ranks. Related computes item/source centroids with bounded eligible-note influence. Ask validates session, scope and provider, retrieves eligible chunks, builds a citation-constrained prompt, streams SSE, filters orphan citations and optionally persists messages.

Attached-note eligibility is checked before prompt creation and persistence so revocation or a newer note generation cannot silently remain current evidence. Citation quality still depends on retrieval and model output.

## User states

Search handles empty query, loading/processing, no results, partial provider/index availability and ranked success. Ask reports unavailable providers/scopes, limited-source warnings, streamed progress, citation parsing and persistence failures separately. A saved item may not be semantically ready until processing completes.

## Boundaries and change impact

There is no source-kind policy UI, detailed rank explanation, claim-support verdict, retrieval snapshot or graph. Changes can affect chunks/schema, provider dimensions, note consent, Related, Ask citations and chat persistence. Begin with `src/lib/search/`, `retrieve/`, `related/`, `ask/`, search/Ask routes, `src/db/chunks.ts`/chat/notes and their tests.

API entrypoints are the search and Ask routes plus thread routes. Operational diagnosis must separate FTS state, vector generation, provider health, citation parsing and chat persistence.

Protecting suites include search/retrieve/related index tests, embedding pipeline/factory/client/provider tests, Ask route/request/state/generator/SSE/citation tests and chat repository tests. Configuration covers search mode, generation/embedding provider/model/dimensions, note eligibility flags and scope. Browser session authentication protects Ask/chat; provider consent additionally protects attached-note use. Pinned evidence: [current retrieval source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/lib/retrieve).
