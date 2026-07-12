# Graphify Research Note v1

**Status:** v1 — awaiting adversarial review  
**Verified:** 2026-07-12  
**Graphify baseline:** release `v0.9.13`, default branch `v8`, commit `eec7a0183847cbdc8a87d92b233759a5204b89fe`  
**AI Brain baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Proposal classification:** Explored / Proposed — not implemented

## Executive finding

Graphify is a substantial, actively developed Python developer tool for extracting code/document structure into a queryable graph. Its strongest verified ideas—typed edges, source provenance, extracted/inferred/ambiguous confidence, bounded graph retrieval, path inspection, communities, hubs, and multiple exports—are relevant references for AI Brain.

Graphify is not a production-fit dependency or fork for AI Brain. Its file-corpus model, Python/NetworkX runtime, JSON/sidecar persistence, optional-auth HTTP MCP, ambient model egress, path-bearing artifacts, external-CDN viewer, dependency surface, accessibility limits, and `0.x` churn conflict with AI Brain's authenticated Node/Next/SQLite/Capacitor boundary.

Research recommendation for the council:

- **Reject direct production integration.**
- **Reject a long-lived fork or copied implementation.**
- **Reuse selected concepts only.**
- **Consider a narrow AI Brain-native, derived relationship capability only if user-value, trust, privacy, measurability, and exit gates pass.**
- **Defer or no-go remains valid if problem frequency/value is not demonstrated.**

This is a research boundary, not the feature-council decision.

## Research method and evidence hierarchy

The study inspected the exact source SHA, package metadata/lock, tests, CI logs, README/architecture/security/benchmark documentation, official website, releases/issues/discussions, PyPI metadata, dependency licenses, and two fictional isolated code-only POCs.

Evidence labels:

- **Verified source behavior:** implementation inspected at the pinned SHA.
- **Verified test behavior:** committed test or isolated/upstream exact-SHA execution.
- **Official documentation claim:** repository documentation not independently reproduced.
- **Official website claim:** product/marketing claim requiring qualification.
- **Inference:** conclusion derived from evidence.
- **Unknown:** evidence absent or insufficient.

## Exact version and maturity

- Current default branch: `v8`.
- Current release/package: `v0.9.13` / `graphifyy==0.9.13`.
- Python requirement: >=3.10.
- The historical `v1.0.0` tag is on a divergent older lineage; it is not the current release baseline.
- The repository is highly active, but remains `0.x`, has a rapid release cadence and concentrated maintainer activity, and has an open plugin/CLI redesign RFC.

**Inference:** active and capable, but not a stable embedded-platform contract. Pin every claim and any POC to exact artifacts; never persist Graphify identifiers in AI Brain.

## Verified product capabilities

### Inputs and extraction

- Broad code/project parsing through tree-sitter, specialized parsers, regex/XML extractors, manifests, configuration, SQL/schema inputs, and cross-file resolution.
- Local Markdown heading/link structure.
- Optional model-backed semantic extraction for documents, PDFs, images, and transcripts.
- Optional local transcription and Google Workspace/URL/database integrations.
- Content-hash caching, update/watch, deletion reconciliation, and project/global merge tools.

The code-only AST path can be fully local. Mixed semantic corpora are not automatically local: full text/images may go to the selected provider or host-agent context.

### Graph model

- Nodes and typed pairwise edges plus graph-level hyperedges.
- Source file/location and optional URL/author/capture metadata.
- `EXTRACTED`, `INFERRED`, and `AMBIGUOUS` confidence labels with scores.
- Deterministic resolver deductions can be `INFERRED`; model output is not the only source of inference.
- Some missing confidence scores are defaulted during export, so the presence of a score does not prove extractor-supplied certainty.

### Query, path, explain, analysis

- `query` tokenizes natural-language text, removes stopwords, performs lexical/IDF node scoring, selects seeds, and returns a bounded BFS/DFS subgraph. It is not semantic QA.
- `path` calculates unweighted shortest path on an undirected view, then renders stored directions/relations/confidence. Confidence does not influence route choice.
- `explain` summarizes a node, source, type, community, degree, and nearby edges. It does not reconstruct a causal derivation for each edge.
- Communities use Leiden only when the optional dependency is available; otherwise Louvain. Labels default to a degree hub unless an optional model pass runs.
- Hubs use filtered degree; betweenness supports bridge/surprise heuristics. These are structural heuristics, not importance or runtime-impact truth.

### Outputs and integrations

- Primary graph JSON, analysis/label/cache/manifest sidecars, Markdown report, and conditional interactive HTML.
- GraphML, Cypher, Neo4j, FalkorDB, Obsidian/Canvas/wiki, SVG, tree, and call-flow exports.
- CLI, multi-assistant skill/instruction/hook installers, MCP stdio/HTTP, GitHub PR tools, and global/project graph operations.

The headline “three files” is an intended summary, not literal output. HTML is conditional and capped by default.

## Important claim corrections

1. “Plain-language query” is lexical seeding plus traversal, not semantic question answering.
2. “Every edge is explained” means relation/confidence/source metadata; free-text derivation is not universal.
3. `EXTRACTED` is not synonymous with AST and `INFERRED` is not synonymous with model-generated.
4. Static ambiguity is often omitted for precision even though semantic extraction may retain `AMBIGUOUS` edges.
5. Paths are undirected/unweighted, not confidence-aware causal routes.
6. Leiden is optional; Louvain is the default fallback.
7. The website's MCP count and install-everywhere wording are stale relative to source.
8. Query logging is opt-in at `0.9.13` despite stale README text saying otherwise.
9. Benchmarks are self-reported; the referenced harness/results were absent from the examined tree and were not independently reproduced.
10. “Code never leaves your machine” applies to the local AST path, not model-backed documents/media or auxiliary integrations/CDNs.

## Architecture and AI Brain fit

Graphify's logical pipeline is detect → extract → graph assembly → cluster → analyze → report/export. It uses a Python distribution with NetworkX, NumPy, RapidFuzz, tree-sitter, many grammar wheels, and optional integration packages. Primary persistence is JSON plus caches/sidecars.

AI Brain is a Node 22/Next.js/React application with SQLite/sqlite-vec, migrations, queues, authenticated product routes, mobile packaging, capture provenance, and item-centered lifecycle controls. Existing `item_semantic_events` provides a content-free partial refresh contract, but no persisted generalized graph exists.

Direct integration would add a second runtime, data lifecycle, query/auth surface, dependency tree, and product abstraction while still requiring a native memory-domain model and accessible UX. The appropriate boundary—if any feature proceeds—is a derived TypeScript/SQLite projection keyed to stable AI Brain IDs.

See [AI Brain versus Graphify capability comparison](2026-07-12_ai-brain-versus-graphify-capability-comparison.md).

## Security and privacy analysis

### Positive verified controls

- Corpus-root and symlink guards.
- SSRF-resistant explicit URL fetcher.
- File/graph/semantic-fragment size caps.
- Untrusted-source delimiters and common prompt-sentinel neutralization.
- HTML escaping and bounded labels.
- Optional constant-time HTTP API-key check and loopback default.
- Opt-in query logging at the pinned release.

### Blocking product-fit risks

- Semantic text/images can leave the machine through configured providers or agent context.
- Graph IDs/artifacts can expose absolute paths/usernames; open issue #1789 was reproduced.
- HTTP MCP authentication is optional, has one shared secret rather than identity/roles, and accepts caller-selected project paths without tenant isolation.
- Model-created relationships remain vulnerable to semantic prompt injection, hallucination, poisoning, and staleness.
- Graphs expose sensitive associations even without raw text.
- Generated viewers fetch external CDN scripts, embed graph data, lack CSP, and do not provide an accessible alternative; keyboard interaction is disabled.
- Cache/sidecar retention is tool-centric rather than tied to AI Brain deletion/consent/account lifecycle.
- Large graph loading/analysis can consume significant memory/CPU; upstream issues report noise/update/viewer limits.

**Research security disposition:** no Graphify runtime, HTTP MCP, installer, hook, raw artifact, or generated viewer in an AI Brain product feature.

## Open-source, license, and dependency analysis

- Graphify core is MIT and compatible in principle with AI Brain's MIT license; copied/substantial code would require preserving Graphify's notice.
- The default runtime has roughly 29 direct distributions, including many language grammars irrelevant to a personal-memory graph.
- Optional extras substantially expand supply-chain and service terms.
- `tree-sitter-pascal 0.11.0` is AGPL-3.0-only and is included in the `all` extra. Never use `[all]`; exclude this package absent legal approval.
- Some optional paths include LGPL components that require separate review.
- PyPI installs do not automatically consume the committed development lock; ranged requirements can resolve different transitives.
- The official package name `graphifyy` creates typo/dependency-confusion risk.

The pinned all-extras dependency audit found known vulnerabilities in `pip` and optional `soupsieve` versions. Upstream Bandit and dependency-audit steps are `continue-on-error`; overall green CI is not a clean security/license gate.

## Test and validation evidence

- Upstream exact-SHA CI: 3,168 passed, 3 skipped on Python 3.10 and 3.12.
- Independent all-extras Python 3.12 run: 3,168 passed, 3 skipped, 12 warnings.
- Bandit: exit 1, with 3 High/8 Medium/77 Low; SHA-1 Highs were non-security ID/MinHash use, while XML and wildcard-bind findings require contextual handling.
- Dependency audit: exit 1 for a vulnerable `pip` snapshot and optional `soupsieve` path.
- These results show strong functional regression coverage and a non-clean security/dependency gate at the same time.

## Synthetic proof-of-concept findings

The coordinator's fictional three-file TypeScript fixture ran code-only with no ambient credentials, installers, hooks, or model calls:

- 12 nodes, 26 `EXTRACTED` edges, three communities.
- 1.76 seconds extraction plus 0.27 seconds cluster/report/view generation.
- Query seeded `sharedTopics()` lexically and expanded to 11 of 12 software nodes.
- Explain and path accurately described code structure.

The technical reviewer independently ran a two-file Python fixture:

- 4 nodes, 4 edges in 0.49 seconds.
- A deterministic cross-file call was `INFERRED` at 0.8.
- Path/query/explain succeeded.
- Absolute/path-derived identifiers were reproduced.

**POC conclusion:** the default abstraction maps software structure, not AI Brain memory instances. It validates implementation concepts and the direct-integration mismatch; further POC work is unnecessary unless a later council question cannot be answered from existing evidence.

## Build-versus-integrate research disposition

| Option | Disposition | Rationale |
|---|---|---|
| Direct production dependency | Reject | Runtime/storage/auth/lifecycle/accessibility/dependency mismatch |
| Long-lived fork | Reject | Own a large fast-changing Python tool without eliminating adapter/product work |
| Copy selected Graphify code | Reject | Attribution, private API, dependency, and drift burden; native re-expression is smaller |
| Additional generic POC | Defer | Existing POCs answer abstraction/locality questions; require a decision-changing unknown |
| Concept reuse | Proceed to council consideration | Provenance/confidence/path/community ideas are separable from implementation |
| AI Brain-native derived projection | Proceed only as candidate hypothesis | Best technical fit but must pass user-value/trust/privacy/measurability/exit gates |
| No feature | Valid | Required if the demonstrated problem or trust threshold remains unproven |

## Candidate-enabling insights, not candidate decisions

The evidence suggests five concept families worth evaluating later:

1. Explain why two retained items are related, with source evidence and confidence.
2. Explore a bounded evidence-weighted path between two ideas/items.
3. Summarize topic communities or bridges with algorithm/version disclosure.
4. Surface weak/missing connections as review suggestions, never facts.
5. Provide agent/project context from existing memories without exposing raw private graph artifacts.

These are hypotheses. The shortlist must still demonstrate problem frequency, improvement over Related/search/topics, discoverability, accessibility, privacy, measurable value, and reversibility.

## Required gates for any candidate

1. Demonstrated frequent user problem; technical adjacency does not count.
2. Clear advantage over Related, search/Ask, topics, tags, and collections.
3. Exact node/edge/evidence/confidence contract using available AI Brain data.
4. Measured relationship precision and user correction/deletion path.
5. Explicit model-egress and sensitive-relationship policy.
6. Owner-scoped auth and lifecycle/deletion/rebuild behavior.
7. Accessible non-visual interaction equal to any visualization.
8. Representative scale/SLO, observability, rollback/feature flag, and exit strategy.

## Unknowns carried forward

- Direct evidence of user problem frequency and durable engagement/retention value.
- Relationship precision thresholds and sensitive-topic policy.
- Target corpus/node/edge scale and server/mobile performance budgets.
- Whether inferred edges should be in MVP at all.
- Correct evidence-weighted path semantics.
- Future multi-user/tenant requirements.
- Accessibility/mobile interaction that adds value beyond existing lists.
- Ongoing cost of relationship extraction, refresh, and review.

An `Unknown` on a council gate is non-passing.

## Source artifacts

- [Product and knowledge-graph source note](2026-07-12_graphify-product-research-source-note.md)
- [Capability inventory](2026-07-12_graphify-capability-inventory.md)
- [Product claims evidence map](2026-07-12_graphify-product-claims-evidence-map.md)
- [Architecture analysis](2026-07-12_graphify-architecture-analysis.md)
- [Security and privacy analysis](2026-07-12_graphify-security-privacy-analysis.md)
- [License and dependency analysis](2026-07-12_graphify-license-dependency-analysis.md)
- [Technical risk summary](2026-07-12_graphify-technical-risk-summary.md)
- [Synthetic proof of concept](2026-07-12_graphify-synthetic-poc.md)
- [AI Brain versus Graphify comparison](2026-07-12_ai-brain-versus-graphify-capability-comparison.md)

