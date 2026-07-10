# Search, RAG, and Ask

Purpose: Explain indexing, retrieval, answer generation, citations, and chat persistence.
Audience: AI agents working on search, embeddings, retrieval, or Ask.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-10 for exact note search, remote semantic indexing, Related, and Ask manual-note citation provenance at `8654f293d0f8615617df883e4703c0ca098a6029`.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Indexing

After enrichment, content is divided into stable chunks. Embedding providers convert chunk text to vectors, and SQLite plus `sqlite-vec` stores text, row-id mappings, and embeddings. Embedding jobs track completion and failures independently from enrichment.

The manual-notes release candidate separates original content, AI digest, and My notes into source-aware chunks. Note FTS is synchronous with an accepted save; semantic indexing is asynchronous, generation-bound, and optional. Search de-duplicates all sources to one parent item and labels note matches explicitly.

Pinned source: [chunker](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/chunk/index.ts), [embedding pipeline](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/embed/pipeline.ts), and [retrieval](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/retrieve/index.ts).

## Retrieval Modes

- Full-text search uses SQLite FTS for lexical matches.
- Semantic search uses vector similarity for conceptual matches.
- Hybrid retrieval combines signals and applies scope constraints.
- Related items reuse item/chunk similarity in the worktree baseline.

Scopes include the whole library, a single item, or selected/multiple items. Scope filtering must occur before or within retrieval, not only after results are returned.

## Ask Flow

1. Authenticate and validate the request and scope.
2. Retrieve relevant chunks.
3. Construct a bounded provider prompt with source identifiers.
4. Stream answer events over SSE.
5. Parse and validate citation markers.
6. Persist thread/message history where requested.

Manual-note chunks carry source epoch/version in prompts and citations. Eligibility is rechecked before prompt construction and before persistence, so opt-out, deletion, provider revocation, or a newer note generation cannot be silently persisted as current note-derived evidence.

Pinned Ask source: [route](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/app/api/ask/route.ts), [generator](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/ask/generator.ts), [SSE](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/ask/sse.ts), and [citation parser](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/ask/parse-citations.ts).

## Failure Modes

- Missing chunks or embedding jobs produce weak semantic results.
- Provider overload or configuration errors interrupt generation.
- Citation markers may be malformed even when text generation succeeds.
- Scope bugs can return no chunks or unrelated chunks.
- Metadata-only captures may not provide enough evidence for an answer.
- A disabled note rollout, missing provider acknowledgement, or stale note generation intentionally removes manual-note chunks from retrieval.

Debug retrieval before changing prompts. Verify item state, chunk presence, embedding dimensions/provider, scope construction, retrieved chunks, SSE frames, and citation parsing separately.

## Safe Verification

```bash
npm run typecheck
npm test
```

Tests are isolated W1 fixture writes. Provider checks and live Ask benchmarks have separate command classifications and are not safe defaults.
