# Existing Knowledge and Relationship Capabilities

**Baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Verified:** 2026-07-12  
**Question:** what knowledge/relationship primitives already exist, and which Graphify-like claims would overstate them?

## Bottom line

AI Brain already has enough structured data to express several useful relationship views, but it does not have a knowledge graph. Its current model is an item-centered relational database plus lexical/vector indexes. Relationships are either explicit memberships/provenance or transient similarity results.

The most important distinction is:

> **Stored joins and query-time similarity are graph-adjacent primitives, not a generalized graph product.**

## Current knowledge primitives

| Primitive | Identity and storage | Creation/maintenance | Current consumer | Status |
|---|---|---|---|---|
| Saved item | `items.id`; content, source, quality, generated fields, workflow state | Capture/import, repair, enrichment | Library, detail, search, Ask, Processing | Implemented |
| Captured source provenance | `source_type`, `capture_source`, URL/platform/quality/method/version; artifacts/cache | Capture channel/extractor | Trust, repair, dedup, exports | Implemented |
| Category | `items.category` string | Enrichment structured output | Item digest/organization copy | Implemented |
| Tag | `tags.id/name/kind` | User or enrichment; canonicalized/mergeable | Item, Library filter, Processing filter | Implemented |
| Topic | `topics.id/slug/name/description/source` | Current enrichment mirrors generated tag labels; repository also supports system source | Topic page, item, Ask scope, Processing filter | Implemented with semantic limitation |
| Collection | `collections.id/name/kind/description` | User action | Collection page, item, Ask scope | Implemented |
| Chunk | `chunks.id` with item FK, index, body, token count, source kind/epoch/version | Embed/note index pipelines | Semantic retrieval, Related, Ask | Implemented |
| Vector | `chunks_vec` row aligned through `chunks_rowid` | Embed provider | KNN retrieval and Related | Implemented |
| Attached note | one current note per item plus state/revisions/mutations | Owner editor and note API | Exact search; optional Ask/Related | Feature-flagged |
| Citation | item/chunk/source provenance in streamed/persisted answer metadata | Ask generator/parser | Citation chip and chat history | Implemented |
| Chat thread/message | library or item scope, optional item FK | Ask flow | Conversation history | Implemented |
| Workflow event | append-only item lifecycle event and mutation receipt | Processing mutation | Counts/audit/undo | Feature-flagged operational relation |
| Recall identity | source card mapping/run state | Recall importer | Dedup/update/checkpoint | Implemented, host-dependent |

## Explicit stored relationships

### Item to tag

Migration 001 defines `item_tags(item_id, tag_id)` as a many-to-many join (`src/db/migrations/001_initial_schema.sql:67-79`). `src/db/tags.ts:19-124` canonicalizes labels, distinguishes manual/auto, attaches/detaches, promotes generated tags, and merges on rename collision.

Relationship semantics:

- edge type is fixed: “has tag”;
- provenance is only indirectly represented by `tags.kind` for the tag, not an edge-level actor/time/reason;
- there is no confidence, source excerpt, or version on membership;
- slash-containing names are strings, not parent-child taxonomy edges.

### Item to topic

Migration 017 defines topics and `item_topics` with `confidence`, `evidence`, and `detected_at` (`src/db/migrations/017_topics.sql:4-24`). `src/db/topics.ts:92-107` supports explicit attachment with nullable confidence/evidence; `:140-164` powers item/topic navigation.

This is the strongest existing graph-shaped semantic join, but current production logic underuses it:

- `replaceTopicsForItem` sets `confidence: null` (`src/db/topics.ts:109-137`);
- enrichment supplies `output.tags` as the topic names and a generic category-based evidence sentence (`src/lib/enrich/pipeline.ts:241-249`);
- therefore topics are not currently an independently extracted entity set, and confidence is not currently model-generated or calibrated;
- there are no topic-to-topic, topic-to-tag, or item-to-item semantic edges.

The fields are useful future substrate. They are not evidence that confidence-tagged relationship extraction is already implemented.

### Item to collection

Migration 001 defines `item_collections` with `added_at` (`src/db/migrations/001_initial_schema.sql:50-65`). Current product behavior is explicit manual grouping. The collection has identity and description; the edge has time but no actor/reason/confidence.

### Item to chunk and note

Chunks are child records of an item (`src/db/migrations/001_initial_schema.sql:37-48`). Migration 023 separates `legacy_item_context`, `original_content`, `ai_summary`, and `manual_note` and adds source epoch/version. This is strong provenance for retrieval evidence, not a semantic relationship between knowledge entities.

Attached notes have a one-to-one logical relationship with an item through `item_note_state` and `item_notes` (`src/db/migrations/022_item_notes.sql:7-30`). Revisions, tombstones, and source generations make the relationship lifecycle explicit.

### Chat and citations

`chat_threads` can scope to a library or item and `chat_messages.citations` stores JSON references (`src/db/migrations/001_initial_schema.sql:99-118`). Ask generation maps retrieved chunks to citation IDs, parses model output, and prevents unmatched/orphan citations from being treated as valid evidence. Source-aware note citations preserve item/chunk/source version.

This is an evidence graph in a narrow sense—answer → citation → chunk → item—but it is implemented as retrieval/persistence metadata, not a queryable generalized graph or claim-support verdict system.

### Capture and workflow provenance

Capture source/platform/quality/method/version and artifacts explain where an item came from and what extraction occurred (`src/db/client.ts:187-263`). Processing events/receipts explain operational state transitions (`src/db/migrations/025_item_workflow.sql:24-89`). Both are valuable provenance families, but neither asserts semantic relationships among ideas.

## Computed relationships

### Related items

`findRelatedItems` is the primary existing item-to-item connection mechanism (`src/lib/related/index.ts:52-132`). It:

1. loads chunk vectors and their source kinds;
2. excludes manual-note chunks unless note UI/provider policy and per-note opt-in are eligible (`:59-84`);
3. forms separate baseline/manual centroids per item;
4. combines them with bounded note influence;
5. computes candidate similarity and returns a bounded ranked list.

The returned object contains `similarity`, `matched_chunk_id`, and `matched_source_kind` (`src/lib/related/index.ts:25-30`). The component renders related items as a list (`src/components/related-items.tsx:20`).

What it does not do:

- persist an edge or the embedding/model/index version that produced it;
- label the semantic reason for the relation;
- expose supporting passages or a user-facing confidence explanation;
- distinguish extracted, inferred, or manually confirmed relations;
- find paths or neighborhoods beyond one ranked query;
- keep history when content/embeddings change;
- support user correction, pinning, or rejection.

The source itself warns that a mean centroid can blur multi-topic items (`src/lib/related/index.ts:13-15`).

### Search and RAG

FTS, vector KNN, and hybrid RRF find evidence but do not create durable knowledge relations. Hybrid behavior is explicit in `src/lib/search/index.ts:5-15,62-133`; tests cover exact note provenance, semantic deduplication, and RRF (`src/lib/search/index.test.ts:44-134`). Scoped Ask adds a natural-language query interface over library/item/items/tag/topic/collection scopes, not graph traversal.

## Provenance and confidence assessment

| Capability | Provenance available | Confidence available | User-visible explanation |
|---|---|---|---|
| Capture | channel/platform/quality/method/version, warning, artifacts | quality classification, not numeric confidence | Trust/repair surfaces |
| Generated tag | tag `kind=auto`; inferred from enrichment | none | Label only |
| Generated topic | topic source; edge evidence and detection time | schema nullable; current value null | Topic label/page; generic evidence not prominently explained |
| Semantic chunk | source kind, epoch/version, parent item | vector score/distance at query time | Citation/source chips; search rank explanation absent |
| Related item | matched chunk/source kind internally | numeric similarity | bounded Related list; no “why connected” narrative |
| Ask citation | item/chunk/source provenance | no claim-support confidence | cited source chip; orphan filtering |
| Workflow event | actor channel/surface/time/mutation/event/version | n/a | status/undo/metrics rather than semantic explanation |

## Graphify-like capability comparison

| Capability family | AI Brain today | Classification |
|---|---|---|
| Parse heterogeneous inputs into retained records | Capture extractors and Recall importer | Implemented, domain-specific |
| Stable project/knowledge nodes | Stable item/taxonomy/chunk IDs | Partial substrate |
| Extract typed relations | Fixed membership/provenance joins only | Partial substrate |
| Infer semantic relations | Query-time vector similarity | Partial; transient and unlabeled |
| Confidence-tagged relations | Nullable topic edge field, currently null in enrichment | Schema substrate only |
| Relation provenance | Strong for chunks/citations/capture; weak for generated taxonomy | Mixed/partial |
| Query entities/neighbors | Search, topic/collection pages, Related list | Partial, not graph query |
| Path finding | None | Not implemented |
| Explain why entities connect | Citation provenance and similarity source kind only | Partial substrate; product behavior absent |
| Community/cluster detection | No current algorithm/service/result model | Planned/explored only |
| Centrality/importance | None | Not implemented |
| Graph visualization/export | None | Planned/deferred only |
| Incremental graph update | Per-domain enrichment/index queues | No generalized graph maintenance |
| Machine-readable graph artifact/API | None | Not implemented |

## Existing user value from relationships

Current relationships already help users:

- narrow a large library through manual labels and groups;
- discover generated concepts through topic pages;
- find conceptually similar sources without knowing exact wording;
- ask across explicit scopes;
- see which retained chunk supports an AI answer;
- keep private note context separate and consent-controlled;
- understand capture origin and repair weak material;
- process an inbox without altering Library identity.

This means a new relationship feature must create incremental value beyond another way to display the same memberships or similarity list. Likely durable value would need one or more currently absent jobs: explaining a connection, traversing a meaningful path, validating inferred relations, revealing a stable cluster, or identifying missing context. Those are hypotheses for later council evaluation, not Stage 1 conclusions.

## Data-quality and trust limitations for a future graph

- Auto-tags and topics currently share the same LLM-produced label list, so treating them as two independent signals would double-count one extraction.
- Topic confidence is structurally available but not populated; generic evidence is not passage-level provenance.
- Similarity changes with content, chunking, provider, and embeddings; a stored edge would require version/provenance and invalidation rules.
- Original content, AI summary, and private note are distinct source kinds and should not be collapsed into one unexplained connection.
- Note-derived relationships must honor flags, per-note policy, provider consent, revocation, deletion, and generation checks.
- Recall and weak captures can be metadata-only; graph construction must not imply content-level knowledge when fidelity is low.
- Single-owner privacy reduces tenancy complexity but does not eliminate exposure risk from displaying sensitive inferred relationships.
- Accessibility cannot rely on a visual graph alone; current Related/topic/collection list patterns are useful alternate-view precedent.

## Verified absences

Repository-wide source/dependency inspection found no current:

- generalized node/edge storage;
- graph route or graph query API;
- graph visualization dependency/component;
- traversal/path-finding or community-detection service;
- persisted similarity edge lifecycle;
- confidence calibration/review workflow;
- Neo4j or graph-artifact exporter;
- graph-specific tests, flags, background rebuild, or deployment config.

The Wiki correctly classifies Relationship Graph/Connection Map as planned and Neo4j export as deferred (`Ideas-and-Exploration-Catalog.md:18,33`).
