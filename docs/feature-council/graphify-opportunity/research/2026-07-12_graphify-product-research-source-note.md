# Graphify product and knowledge-graph research — source note

Date verified: 2026-07-12  
Purpose: Stage 2 product/capability evidence for later council synthesis. This is not the final research note, a dependency recommendation, or a security/licensing review.

## Examined state

- Repository: [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)
- Default branch: `v8`
- Examined commit: [`eec7a0183847cbdc8a87d92b233759a5204b89fe`](https://github.com/Graphify-Labs/graphify/tree/eec7a0183847cbdc8a87d92b233759a5204b89fe)
- Commit timestamp: `2026-07-12T11:12:18+01:00`
- Release: [`v0.9.13`](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.13), published 2026-07-12; the annotated tag resolves to the examined commit.
- Package version/minimum runtime: `graphifyy` 0.9.13, Python >=3.10 ([`pyproject.toml` lines 5–17](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L5-L17)).
- Historical tag warning: `v1.0.0` points to an older, divergent lineage and is not the current default-branch release. It was not used as the evidence baseline.
- Official website pages accessed 2026-07-12: [home](https://graphify.com/), [quickstart](https://graphify.com/docs), [concepts](https://graphify.com/concepts), [use cases](https://graphify.com/use-cases), [integrations](https://graphify.com/integrations), [languages](https://graphify.com/languages), and [FAQ](https://graphify.com/faq).
- Issue/discussion surfaces inspected 2026-07-12: [issues](https://github.com/Graphify-Labs/graphify/issues), [discussions](https://github.com/Graphify-Labs/graphify/discussions), and specific issues cited below.

## Evidence labels used here

- **Verified source behavior**: directly supported by implementation at the examined SHA.
- **Verified test behavior**: directly asserted by a named committed test, or by the exact-SHA CI run.
- **Official docs claim**: README/repository documentation; stronger than website marketing, weaker than source/tests.
- **Website claim**: official product-site language, not independently verified.
- **Inference**: reasoned interpretation of verified material.
- **Unknown**: evidence was absent or could not be validated.

## Product framing and intended users

**Official docs claim.** Graphify presents itself as a way for an AI coding assistant to map code, docs, PDFs, images, and media into a queryable knowledge graph rather than repeatedly grepping files. The README says code is local/deterministic, while document/media semantic extraction uses the assistant or a configured model ([`README.md` lines 24–29](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L24-L29)). It names onboarding, architecture understanding, change-impact questions, and lower retrieval-context use as core jobs ([official use cases](https://graphify.com/use-cases)).

**Website claim.** The site targets individual developers and teams: developers map and query a repository; teams share `graph.json` or self-host MCP. It frames the central payoff as an auditable path rather than an opaque similarity answer ([home](https://graphify.com/)).

**Verified source behavior.** The CLI, MCP server, assistant skill files, query/path/explain commands, PR analysis, graph artifacts, and exports all exist at the examined SHA. This verifies a developer-tool product surface. It does not verify adoption, time savings, onboarding outcomes, or team-value claims.

**Inference.** The best-evidenced target is a developer or coding agent working in a non-trivial repository whose questions are primarily structural (calls, imports, references, dependencies, connected subsystems). The official site itself says small repositories and fuzzy search over large prose collections may not benefit ([use-cases limitations](https://graphify.com/use-cases)).

## Supported inputs and extraction paths

### Code and structured project files

**Verified source behavior.** Discovery classifies a broad extension set as code and separately recognizes documents, PDFs, images, Office files, and audio/video ([`graphify/detect.py` lines 20–39](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/detect.py#L20-L39)). Default dependencies bundle tree-sitter grammars for 25 named grammar packages; other languages/dialects reuse grammars, use dedicated/regex extractors, or require extras ([`pyproject.toml` lines 13–43](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L13-L43), [`README.md` lines 326–340](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L326-L340)). Therefore “36 languages” is a product counting convention, not 36 distinct bundled tree-sitter dependencies.

The AST pipeline performs per-file extraction followed by cross-file resolution, with cached files skipped and uncached work optionally processed in worker processes ([`graphify/extract.py` lines 4232–4312](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/extract.py#L4232-L4312)). Cross-file calls are guarded by language family, ambiguity, and import evidence; unresolved/ambiguous candidates may be skipped rather than guessed ([`graphify/extract.py` lines 4566–4829](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/extract.py#L4566-L4829)). This is intentionally precision-oriented but means the graph is not a complete call graph.

The README also documents deterministic or dedicated extraction for SQL, Terraform/HCL, MCP configuration, package manifests, .NET solution/project/XAML/Razor files, and Salesforce Apex ([`README.md` lines 326–340](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L326-L340)). Several require optional dependencies.

### Documents, papers, images, Office, and media

**Verified source behavior.** Markdown has a local structural extractor that creates file/heading nodes, nesting edges, and local-document link edges without tree-sitter or an LLM ([`graphify/extractors/markdown.py` lines 53–78](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/extractors/markdown.py#L53-L78), [`graphify/extractors/markdown.py` lines 90–176](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/extractors/markdown.py#L90-L176)). A separate semantic pass asks a model to extract named concepts, entities, citations, rationale attributes, semantic similarity, and limited hyperedges ([`graphify/skills/claude/references/extraction-spec.md` lines 12–42](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/skills/claude/references/extraction-spec.md#L12-L42)).

The documented three-pass model is: local AST structure; local faster-whisper transcription for audio/video; model-based semantic processing for docs, PDFs, images, and transcripts, with optional Office and Google Workspace conversion into Markdown sidecars ([`docs/how-it-works.md` lines 3–22](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/docs/how-it-works.md#L3-L22)). The image prompt explicitly requests visual interpretation rather than OCR-only extraction ([`extraction-spec.md` lines 21–27](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/skills/claude/references/extraction-spec.md#L21-L27)).

**Qualification.** The website’s claim that “everything else” beyond code is read by a model is an oversimplification: Markdown structure/linking, SQL, some manifests/configuration, and media transcription have deterministic/local stages. Conversely, full semantic document/media edges do require a configured model backend unless a local backend such as Ollama is used.

### Live and remote ingestion

**Verified source behavior.** `graphify add` has paths for webpages, tweets, arXiv, and binary download into a local corpus before extraction ([`graphify/ingest.py` function inventory](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/ingest.py)). Live PostgreSQL introspection opens a read-only, serializable transaction, reads tables/views/routines/foreign keys, reconstructs DDL, and routes it through the SQL extractor ([`graphify/pg_introspect.py` lines 11–31](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/pg_introspect.py#L11-L31), [`graphify/pg_introspect.py` lines 131–150](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/pg_introspect.py#L131-L150)).

## Graph model and construction

**Verified source behavior.** Extraction fragments use node-link data with nodes, directed typed edges, and optional hyperedges. The semantic schema restricts `file_type` to `code`, `document`, `paper`, `image`, `rationale`, or `concept`; edge relation names are extensible verb phrases, with examples including `calls`, `implements`, `references`, `cites`, `conceptually_related_to`, `shares_data_with`, `semantically_similar_to`, and `rationale_for` ([`extraction-spec.md` lines 19–20](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/skills/claude/references/extraction-spec.md#L19-L20), [`extraction-spec.md` lines 63–66](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/skills/claude/references/extraction-spec.md#L63-L66)). AST extractors also attach a more granular `type` field (for example class/function/method/interface/package/table), but there is no single closed enum for all AST node subtypes.

Construction deduplicates nodes/edges, remaps semantic IDs to the AST path scheme, merges Markdown quick-scan/semantic twins, drops dangling endpoints, and builds a NetworkX graph ([`graphify/build.py` lines 198–383](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/build.py#L198-L383)). Hyperedges are stored in graph-level metadata and serialized in `graph.json` ([`graphify/export.py` lines 240–270](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/export.py#L240-L270)).

### Extracted, inferred, ambiguous, confidence, and provenance

**Verified source behavior.** Semantic extraction requires every edge to carry a confidence label and score: EXTRACTED = 1.0; INFERRED uses a discrete 0.55–0.95 rubric; AMBIGUOUS uses 0.1–0.3 ([`extraction-spec.md` lines 47–59](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/skills/claude/references/extraction-spec.md#L47-L59)). Source fields include file and location; nodes may also preserve URL, capture time, author, and contributor from frontmatter ([`extraction-spec.md` lines 44–45](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/skills/claude/references/extraction-spec.md#L44-L45)).

Inference is not synonymous with “LLM-made.” The code resolver marks some receiver-type or name-resolution results INFERRED (typically score 0.8), while explicit imported/qualified targets are promoted to EXTRACTED ([`graphify/extract.py` lines 4764–4821](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/extract.py#L4764-L4821)). Missing confidence scores in graph output are defaulted by label to 1.0/0.5/0.2 ([`graphify/export.py` lines 252–255](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/export.py#L252-L255)), so a score’s presence alone does not prove it was explicitly produced by an extractor.

**Qualification.** “Every edge is explained” is directionally supported by relation/confidence/source metadata, but the product does not store a free-text rationale for every resolver decision. `explain` displays node metadata and adjacent relation/confidence tags; it does not reconstruct why the extractor or resolver chose that edge.

## Query, traversal, explanation, community, and centrality behavior

### `query`

**Verified source behavior.** Query is local graph retrieval, not an LLM answer generator. It tokenizes a question, removes stopwords, scores node labels/source paths using exact/prefix/substring tiers and IDF, chooses up to several seeds, then performs BFS or DFS and returns a token-budgeted textual subgraph ([`graphify/serve.py` lines 128–177](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L128-L177), [`graphify/serve.py` lines 286–372](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L286-L372), [`graphify/serve.py` lines 683–708](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L683-L708)). The CLI fixes traversal depth at 2; MCP defaults to 3 and caps it at 6 ([`graphify/cli.py` lines 428–449](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cli.py#L428-L449), [`graphify/serve.py` lines 1051–1078](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1051-L1078)). Optional explicit or heuristic context filters restrict traversed edge contexts.

**Qualification.** “Plain-English query” means lexical seed selection from natural-language text followed by traversal. It does not semantically interpret arbitrary questions, synthesize a prose answer, or guarantee one explicit path.

### `path`

**Verified source behavior.** Endpoints are lexically scored with ambiguity warnings. Shortest path uses an undirected view so callers can ask in either endpoint order, then re-renders each hop with the stored direction, relation, and confidence ([`graphify/cli.py` lines 630–691](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cli.py#L630-L691)). MCP adds a `max_hops` display gate ([`graphify/serve.py` lines 1160–1219](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1160-L1219)). This is unweighted hop count, not confidence-weighted or direction-constrained routing.

### `explain`

**Verified source behavior.** Explain picks the first exact/prefix/substring match, reports ID, source, type, community, degree, and up to 20 adjacent connections sorted by neighbor degree ([`graphify/cli.py` lines 700–780](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cli.py#L700-L780)). It can show a separately derived learning hint. It is a node neighborhood inspector, not a causal/extractive explanation engine.

### Communities and centrality

**Verified source behavior.** Community detection uses Leiden when the optional `graspologic` package is present and otherwise NetworkX Louvain; both run on an undirected stable copy with deterministic seeds/order where supported ([`graphify/cluster.py` lines 22–77](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cluster.py#L22-L77)). Oversized (>25% of graph) and large low-cohesion communities are re-split; isolates become singleton communities; optional hub exclusion removes very high-degree nodes during partitioning and reattaches them by neighbor vote ([`graphify/cluster.py` lines 80–236](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cluster.py#L80-L236)). Default LLM-free names use the highest-degree member ([`graphify/cluster.py` lines 86–110](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cluster.py#L86-L110)); optional model labeling is a separate pass.

“God nodes” are degree-ranked after filters remove file hubs, generic concepts, JSON noise, and common built-ins ([`graphify/analyze.py` lines 100–121](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/analyze.py#L100-L121)). Betweenness centrality is used for single-source surprising connections and bridge-node question suggestions, not as the primary god-node ranking ([`graphify/analyze.py` lines 124–153](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/analyze.py#L124-L153)).

## Outputs, visualization, reports, and exports

**Verified source behavior.** The default product artifacts are `graph.json`, `GRAPH_REPORT.md`, and (when under the visualization limit) `graph.html` ([`README.md` lines 51–57](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L51-L57)). The report includes corpus summary, edge-confidence breakdown, communities/cohesion, degree-ranked god nodes, surprising connections, cycles, hyperedges, ambiguous edges, gaps, and suggested questions ([`graphify/report.py` lines 93–142](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/report.py#L93-L142), [`graphify/report.py` lines 160–299](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/report.py#L160-L299)).

The HTML is a standalone vis-network force-directed viewer with search, click-to-inspect neighbors, community legend/filtering, directed arrow display, and shaded hyperedge regions ([`graphify/exporters/html.py` lines 30–68](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L30-L68), [`graphify/exporters/html.py` lines 70–165](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L70-L165)). It refuses graphs above 5,000 nodes by default; the limit is configurable or visualization can be disabled ([`graphify/exporters/html.py` lines 13–28](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L13-L28), [`graphify/exporters/html.py` lines 312–387](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L312-L387)).

Additional verified export code exists for Cypher, Obsidian vault + Canvas, agent-crawlable Markdown wiki, GraphML, SVG, and Mermaid call-flow HTML ([`graphify/export.py` functions](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/export.py), [`graphify/wiki.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/wiki.py), [`graphify/callflow_html.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/callflow_html.py)). Direct Neo4j and FalkorDB push uses `MERGE` upserts for nodes/edges ([`graphify/exporters/graphdb.py` lines 9–78](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/graphdb.py#L9-L78), [`graphify/exporters/graphdb.py` lines 80–173](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/graphdb.py#L80-L173)).

## Incremental update and freshness

**Verified source behavior.** Content hashes back AST and semantic caches; unchanged files are skipped ([`docs/how-it-works.md` lines 77–80](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/docs/how-it-works.md#L77-L80)). `build_merge` replaces/prunes file-owned material while preserving unrelated data. Watch/update logic reconciles true deletions, queues changes under lock contention, avoids output writes when topology is unchanged, re-clusters when needed, and has anti-shrink/backup handling ([`graphify/watch.py` lines 369–623](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/watch.py#L369-L623), [`graphify/watch.py` lines 990–1083](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/watch.py#L990-L1083)). Git hooks install post-commit and post-checkout rebuild triggers ([`graphify/hooks.py` lines 483–517](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/hooks.py#L483-L517)).

The `v0.9.13` release is largely correctness hardening for incremental behavior, including preserving merely ignored-but-not-deleted sources, preventing contradictory prune/re-extract deletion, and merging duplicate Markdown quick-scan/semantic nodes ([`CHANGELOG.md` lines 5–23](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/CHANGELOG.md#L5-L23)). This is evidence that incremental correctness has been an active defect area, not evidence that all update edge cases are closed.

## Agent integration, hooks, instructions, and MCP

**Verified source behavior.** Packaged skill variants and installation destinations exist for Claude, Codex, OpenCode, Kilo, Aider, Copilot, Agent Skills, Gemini, Cursor, Devin, Amp, Kiro, Pi, Trae, OpenClaw, Droid, Hermes, and Antigravity families ([`graphify/install.py` lines 67–190](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/install.py#L67-L190), [`graphify/install.py` platform configuration starting at line 314](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/install.py#L314)). Integrations install skills, project instructions, and/or pre-tool hooks that nudge an agent toward query-first behavior ([`README.md` lines 297–312](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L297-L312)). These are configuration mutations performed only when the user runs install commands; no such install was run during this research.

The source registers **10 MCP tools**, not 8: `query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, and `triage_prs` ([`graphify/serve.py` lines 913–1035](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L913-L1035), [`graphify/serve.py` lines 1306–1317](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1306-L1317)). It also publishes six MCP resources for report, stats, god nodes, surprises, confidence audit, and suggested questions ([`graphify/serve.py` lines 1328–1389](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1328-L1389)). Stdio and optional HTTP transports exist. The official website/quickstart count of 8 tools is stale.

## Strongest verified capabilities

1. Deterministic, local structural extraction for a broad multi-language code/config/schema surface, with explicit cross-file resolution rules and confidence tagging.
2. A portable, machine-readable graph artifact that retains typed directed relations, source locations, communities, confidence, and optional hyperedges.
3. Local lexical-to-graph retrieval (`query`), undirected shortest-path discovery with direction-preserving rendering (`path`), and focused node-neighborhood inspection (`explain`).
4. Community detection with Leiden/Louvain fallback, deterministic hub labels, cohesion handling, degree-ranked hubs, and selected betweenness-based analyses.
5. Rich local artifacts: report, interactive HTML, GraphML/SVG, Obsidian/Canvas, wiki, call-flow HTML, Cypher, and direct Neo4j/FalkorDB upsert.
6. Incremental cache/update/watch mechanisms and assistant-facing skills/hooks/MCP that make the graph reusable between sessions.
7. Hybrid document/media ingestion that combines deterministic local structure/transcription with model-based semantic extraction and provenance/confidence metadata.

## Verified limitations and claim gaps

- **Natural-language scope:** `query` is lexical ranking plus bounded traversal, not semantic question answering. Product wording can imply more interpretation than source provides.
- **Path semantics:** shortest path ignores direction and edge weight/confidence during route selection. It is connectivity, not causal or highest-confidence routing.
- **Explain semantics:** `explain` reports node metadata and neighbors, capped at 20; it does not give a derivation rationale for each edge.
- **Incomplete static resolution:** dynamic dispatch/reflection/string-built imports and ambiguous same-name targets are skipped or marked uncertain. Precision guards intentionally reduce recall.
- **HTML scale:** default viewer limit is 5,000 nodes.
- **Incremental community labels:** current update/watch calls `to_json` without `community_labels`, so updated `graph.json` can lose readable `community_name` values even though the labels sidecar/report has them ([`graphify/watch.py` lines 1018–1047](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/watch.py#L1018-L1047), [issue #1808](https://github.com/Graphify-Labs/graphify/issues/1808)).
- **Clustering configuration persistence:** `--exclude-hubs` is available on direct clustering but not persisted or honored by watch/hook rebuilds ([`graphify/cli.py` lines 951–1038](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cli.py#L951-L1038), [issue #1800](https://github.com/Graphify-Labs/graphify/issues/1800)).
- **Community-label locale:** the LLM labeling prompt is hard-coded in English and has no output-language control ([`graphify/llm.py` lines 2367–2414](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L2367-L2414), [issue #1824](https://github.com/Graphify-Labs/graphify/issues/1824)).
- **Same-basename, different-extension collision:** file IDs deliberately omit extensions; a `.ts` re-export of same-basename `.mjs` can collapse to a false self-loop/cycle ([`graphify/extract.py` lines 170–177](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/extract.py#L170-L177), [issue #1814](https://github.com/Graphify-Labs/graphify/issues/1814)).
- **Unsupported/unclassified files:** current release warns for unsupported code-like files, but a warning is not extraction. Release notes explicitly cite `.r`, some extensionless files, and MATLAB `.m` as unsupported/follow-up cases ([`CHANGELOG.md` lines 70–78](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/CHANGELOG.md#L70-L78)).
- **Model-dependent semantics:** document/media concept/edge quality, label quality, cost, and data egress depend on the selected model/backend. No corpus-independent accuracy guarantee was found.
- **MCP documentation drift:** website says 8 tools; source registers 10.
- **Privacy documentation drift:** source and release make query logging opt-in ([`graphify/querylog.py` lines 15–31](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/querylog.py#L15-L31)), but the same release’s README still says every query is logged by default ([`README.md` lines 525–533](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L525-L533)). Current code wins.
- **Website privacy wording:** “your code never leaves” is true for the AST code path; semantic docs/media can be sent to a configured external provider. The site later adds this caveat, but some quickstart language is overbroad.

## Benchmarks and marketing qualification

The README reports LOCOMO recall@10 0.497 (n=300), LOCOMO QA 45.3%, LongMemEval-S QA 76% (n=50), and zero LLM credits for graph build ([`README.md` lines 111–120](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L111-L120)). `BENCHMARKS.md` describes a same-model/budget harness and discloses that supermemory recall is embedder-confounded, the code-intelligence comparison has only six graded questions, and the judge was validated on a sample ([`BENCHMARKS.md` lines 36–65](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/BENCHMARKS.md#L36-L65), [`BENCHMARKS.md` lines 94–149](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/BENCHMARKS.md#L94-L149)).

**Status: official self-reported claim, not independently reproduced.** The referenced `memory/` and `crosstool/` harness directories and per-run ledgers are absent from the examined repository, even though reproduction commands reference them ([`BENCHMARKS.md` lines 174–186](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/BENCHMARKS.md#L174-L186)). The metrics should not be used as proof of AI Brain value or generalized to personal-memory retrieval without the missing harness/results and an AI Brain-relevant evaluation.

## Test and validation record

### Committed tests inspected

Representative named tests supporting the product surface include:

- Query/path: `test_query_cli_explicit_context_filter`, `test_query_cli_heuristic_context_filter`, `test_query_cli_rejects_oversized_graph` ([`tests/test_query_cli.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_query_cli.py)); `test_forward_arrow`, `test_reverse_arrow`, `test_endpoint_prefers_full_token_match`, `test_endpoint_falls_back_to_score_head` ([`tests/test_path_cli.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_path_cli.py)).
- Confidence/provenance: `test_extracted_edges_have_score_1`, `test_confidence_score_round_trip`, `test_to_json_defaults_missing_confidence_score`, `test_report_shows_avg_confidence_for_inferred`, and `test_report_inferred_tag_with_score` ([`tests/test_confidence.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_confidence.py)).
- Markdown/document links: `test_markdown_finds_headings`, `test_markdown_finds_nested_heading`, `test_markdown_link_edges_emitted`, `test_markdown_link_skips_external_and_images`, and `test_markdown_link_edges_resolve_to_real_nodes` ([`tests/test_languages.py` lines 2149–2285](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_languages.py#L2149-L2285)).
- Communities/analysis: `test_cluster_returns_dict`, `test_cluster_covers_all_nodes` ([`tests/test_cluster.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_cluster.py)); `test_god_nodes_sorted_by_degree`, `test_surprising_connections_single_file_uses_community_bridges` ([`tests/test_analyze.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_analyze.py)).
- Artifacts/exports: `test_to_json_nodes_have_community`, `test_to_graphml_valid_xml`, `test_to_html_creates_file`, `test_to_html_contains_search`, `test_to_html_contains_legend_with_labels`, and Obsidian overwrite/collision tests ([`tests/test_export.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_export.py)); wiki navigation/audit/link-integrity tests ([`tests/test_wiki.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_wiki.py)).
- Incremental behavior: deletion, rename, lock contention, pending queue, ignore handling, topology no-op, and subdirectory-preservation tests ([`tests/test_watch.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_watch.py)); semantic hyperedge/prune tests including `test_reextracted_file_in_prune_sources_is_not_deleted` ([`tests/test_build_merge_hyperedges_and_prune.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_build_merge_hyperedges_and_prune.py)).
- Database integration: `test_pg_introspect_fk_query_avoids_privilege_filtered_view` ([`tests/test_pg_introspect.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_pg_introspect.py)); `test_push_to_falkordb_creates_expected_graph` and `test_push_to_falkordb_is_idempotent` ([`tests/test_falkordb_integration.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_falkordb_integration.py)).
- Assistant integration: platform destination, project/global scope, idempotence, uninstall, and hook nudge tests are present across [`tests/test_agents_platform.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_agents_platform.py), [`tests/test_search_hook.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/tests/test_search_hook.py), and platform-specific install test modules.

### CI and local validation

- Exact-SHA upstream CI: [run 29188746335](https://github.com/Graphify-Labs/graphify/actions/runs/29188746335), completed successfully on 2026-07-12. Its `test (3.10)` and `test (3.12)` jobs report 3,168 passed / 3 skipped; skill generation and security-scan jobs also succeeded.
- Local actions actually performed: cloned the public repository into an isolated temporary directory; verified commit/tag/date; inspected source, tests, docs, release, official website, issues, and discussions; queried GitHub’s public API for exact release/issue/CI metadata. No installer, assistant skill, global package, global configuration, hook, database push, or private-content upload was performed.
- Local test execution: not performed. The available interpreter was Python 3.9.6, below Graphify’s declared >=3.10 minimum; `uv` was unavailable. An isolated virtual-environment installation attempt failed at the runtime-version gate and made no global change. Test claims above are therefore committed-test/CI evidence, not locally reproduced behavior.

## Unknowns requiring a dedicated proof of concept

- Precision/recall on AI Brain’s actual content, especially notes and mixed personal documents.
- Whether semantic edges remain useful and stable across models/backends and repeated runs.
- Query usefulness when user terminology does not overlap node labels/source paths.
- Practical graph size, rebuild time, artifact churn, and viewer usability on the AI Brain corpus.
- Whether confidence scores are calibrated enough for end-user trust decisions.
- Whether hyperedges, work-memory overlays, global graphs, and PR tooling belong in the AI Brain opportunity at all.
- Actual adoption/retention/token savings; official benchmarks do not answer these product-fit questions.
