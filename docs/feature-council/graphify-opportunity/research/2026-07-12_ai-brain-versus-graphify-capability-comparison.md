# AI Brain versus Graphify Capability Comparison

**Verified:** 2026-07-12  
**AI Brain baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Graphify baseline:** release `v0.9.13`, commit `eec7a0183847cbdc8a87d92b233759a5204b89fe`  
**Purpose:** Council evidence; not a feature or dependency decision

## Executive comparison

AI Brain and Graphify operate on different primary domains.

- AI Brain is a private, item-centered personal knowledge product. Its source of truth is authenticated SQLite records for captured items, chunks, notes, tags, topics, collections, citations, and workflow state.
- Graphify is a Python developer tool whose natural input is a file/project corpus and whose primary output is a NetworkX-derived code/document graph persisted as JSON and sidecars.

They overlap in provenance, semantic organization, and retrieval concepts, but Graphify is not a drop-in personal-memory graph. The defensible reuse boundary is conceptual: explicit relationship origin, evidence, confidence, bounded neighborhoods/paths, communities/hubs, and derived/rebuildable state.

## Capability comparison

| Dimension | AI Brain current behavior | Graphify verified behavior | Council implication |
|---|---|---|---|
| Primary user/job | Single owner captures, organizes, retrieves, asks about, annotates, and processes retained knowledge | Developer/agent maps a repository or document corpus for structural exploration | A Graphify-inspired feature must solve a personal-knowledge job, not import a developer workflow |
| Canonical entity | Item/source, chunk, note, tag, topic, collection, thread, workflow record | File, class, function, method, type, concept, rationale, table, project artifact | Graphify node types do not match AI Brain's user domain |
| Source of truth | SQLite with migrations, foreign keys, queues, authenticated routes | `graph.json` plus cache/label/analysis/report/viewer sidecars | Native graph should remain a derived SQLite projection, never a second truth |
| Capture/ingestion | URL, note, PDF, transcript, selected text, Android, extension, Telegram, Recall | Folder scan; AST/regex/XML; docs/media semantic pass; optional URL/DB/Google inputs | Reuse AI Brain's existing capture and consent pipeline; do not re-ingest through Graphify |
| Deterministic structure | Tags/topics/collections/chunks/citations/workflow joins and provenance | Local AST/Markdown structure, typed code relations, manifests/configuration | AI Brain already has sufficient source primitives for a narrow native projection |
| Semantic relationships | Related items computed from vector centroids; no stored item-to-item edges | Model/resolver edges with relation, confidence and provenance | Persisted AI Brain edges would be new work; Related cannot simply be relabeled as a graph |
| Confidence/evidence | `item_topics` supports nullable confidence/evidence; current enrichment writes null confidence and generic evidence | EXTRACTED/INFERRED/AMBIGUOUS plus scores/source metadata; some defaults are synthesized | Reuse origin taxonomy but require AI Brain-specific evidence/version/correction rules |
| Search/query | FTS, semantic, hybrid RRF, scoped cited Ask | Lexical/IDF node seeding followed by bounded BFS/DFS | Graphify query is not superior semantic QA; AI Brain search remains the right text-retrieval layer |
| Related/explain | Similarity score and bounded related list; no durable reason/path | Node-neighborhood inspector with relation/confidence/source details | Explanation concepts are relevant, but Graphify does not provide causal per-edge derivation |
| Paths | None | Unweighted shortest path on an undirected view, rendered with stored direction | A trust-sensitive memory path must weight evidence/confidence and disclose direction |
| Communities/hubs | Topic pages and flat memberships; no graph communities | Leiden when optional dependency exists, otherwise Louvain; degree hubs/betweenness heuristics | Useful derived summaries only if the user problem and trust thresholds are proven |
| Visualization | No graph view | Interactive vis-network HTML, default 5,000-node limit | Do not reuse viewer: external CDN, keyboard disabled, developer-oriented dense canvas |
| Accessible alternative | Existing pages/lists are conventional web UI | No complete accessible equivalent to the force graph | Any AI Brain graph requires list/table/path/explanation parity, keyboard, screen reader, reduced motion, and mobile behavior |
| Incremental updates | Queues/events/migrations; `item_semantic_events` is a content-free partial refresh contract used for note semantics | Content-hash caches, watch/update/merge; known update/label/hub issues | Native idempotent versioned refresh is feasible; Graphify update state should not be imported |
| Deletion/lifecycle | Item-centered cascades and feature-specific cleanup | Tool-centric cache/sidecar pruning, not account/item consent lifecycle | Graph must cascade on item/note/topic changes and be completely rebuildable/removable |
| Authentication | PIN/session/bearer private product boundary | CLI/stdio; optional shared-key HTTP MCP, caller-selected project path | HTTP MCP is not a product authorization layer and must not be used |
| Multi-user isolation | Current product is effectively single owner; future tenancy unknown | No per-user/tenant graph authorization in HTTP MCP | Owner scope must exist in schema/API from the start if future accounts are possible |
| Model egress | Existing provider-policy/consent patterns for notes and AI work | Semantic corpora/images can go to auto-selected configured providers or agent context | Reuse AI Brain's explicit consent/minimization policy; no ambient provider selection |
| Sensitive outputs | Private item content, notes, citations, provenance | Symbols, paths, graph relations, reports, HTML, caches, query logs | Raw Graphify artifacts must not be published; relationship structure is sensitive data |
| Runtime | Node 22, Next.js, React, SQLite/sqlite-vec, Capacitor | Python >=3.10, NetworkX, NumPy, RapidFuzz, tree-sitter grammars | Direct embedding creates an unnecessary second runtime and deployment surface |
| Dependency/license | AI Brain MIT; current Node dependency governance | Graphify core MIT; default ~29 direct packages; optional `[all]` includes AGPL-only Pascal grammar | Concept reuse is cleanest; reject `[all]` and direct production dependency |
| Maturity | Current main has protected CI, migrations, release tooling, and product-specific operational controls | Active but `0.x`, rapid releases, concentrated maintenance, open plugin/CLI RFC and correctness issues | Do not persist Graphify IDs/contracts or adopt a long-lived fork |
| Tests/security | Protected baseline: 894/894 tests and product/release gates | 3,168 tests pass; Bandit and dependency audit exit nonzero but are non-blocking | Functional depth is real; security/dependency acceptance still fails a product gate |

## AI Brain capabilities Graphify does not replace

- Capture quality, method, artifacts, and repair workflow.
- Source-aware chunks, vector retrieval, FTS, hybrid RRF, and cited Ask.
- Private attached-note consent and provider policy.
- Item/topic/tag/collection pages and scoped Ask.
- Processing workflow, auth, backups, release/readiness controls, and mobile clients.

## Graphify concepts not currently present in AI Brain

- Persisted typed semantic edges with explicit origin/confidence.
- Evidence-first connection inspection.
- Bounded multi-hop paths.
- Derived communities, bridges, and hubs.
- Machine-readable graph export/query surfaces.
- Incremental graph rebuild as a first-class projection.

These are capability gaps, not proof that users need them.

## Build-versus-integrate comparison

| Option | Product fit | Technical/security fit | Reversibility | Research recommendation |
|---|---|---|---|---|
| Direct Graphify dependency | Low | Low | Medium; creates Python/JSON lifecycle | No-go |
| Long-lived fork | Low | Low; large maintenance/supply-chain burden | Low | No-go |
| Copy selected implementation | Low/Medium | Attribution and drift burden; private internals | Medium | Avoid |
| Isolated Graphify POC | Medium only for a specific unknown | Acceptable with fictional/public data and strict isolation | High | Already sufficient; no more unless decision-changing |
| Graphify concept reuse | High | High | High | Preferred baseline |
| AI Brain-native relationship projection | Potentially high, subject to user/trust gates | Highest fit with current auth/data/lifecycle | High if derived | Preferred only if council approves a narrow MVP |
| No feature / defer | Valid | Eliminates new risk and cost | Highest | Required if user-value or trust remains Unknown |

## Comparison conclusion

Graphify proves that relationship provenance, bounded traversal, path inspection, and structural summaries are implementable. It does not prove that AI Brain users need a graph, and its runtime/data model are unsuitable for production integration. Candidate ideation should therefore start from AI Brain's demonstrated gaps and use Graphify only as a concept/reference source.

