# Graphify architecture analysis

**Status:** Stage 2 source note for later v1 synthesis; not a final recommendation  
**Verified:** 2026-07-12  
**Repository:** [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)  
**Revision:** tag [`v0.9.13`](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.13), commit [`eec7a0183847cbdc8a87d92b233759a5204b89fe`](https://github.com/Graphify-Labs/graphify/commit/eec7a0183847cbdc8a87d92b233759a5204b89fe)  
**Commit date:** 2026-07-12T11:12:18+01:00 (committer)  
**AI Brain comparison revision:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  

## Evidence conventions

- **Verified source** means inspected at the exact Graphify commit above.
- **Verified test** means exercised in an isolated temporary clone with no private corpus and no global install.
- **Official claim** means Graphify documentation or project metadata; it is not treated as independent validation.
- **Inference** is architectural judgment based on the verified evidence.
- **Unknown** identifies behavior not established by source/tests reviewed here.

Line links below are immutable links to the pinned commit. AI Brain references are repository-relative because the AI Brain source is the local source of truth.

## Executive architecture finding

Graphify is a capable Python developer tool and graph-construction pipeline, not an embeddable TypeScript knowledge-graph library or a multi-tenant product service. Its natural unit of ingestion is a folder/file corpus, its primary persistence is NetworkX node-link JSON plus sidecars under `graphify-out/`, and its product integration is a CLI/agent skill/MCP server. AI Brain is a Node 22/Next.js 16 application with SQLite as its operational store, Capacitor/Android packaging, and single-user application authentication.

**Implication:** use Graphify as a reference implementation and, at most, an isolated research sidecar. For an AI Brain user feature, build the smallest useful graph projection natively in the existing TypeScript/SQLite architecture. Directly embedding Graphify would add a Python runtime, a second persistence lifecycle, file-export mediation, and a second auth/query surface without solving AI Brain's ownership, deletion, provenance, or product-UX requirements.

## Package and module structure

### Runtime and dependencies

**Verified source:** Graphify is one Python distribution named `graphifyy`, version `0.9.13`, requiring Python `>=3.10`. It exposes `graphify` and `graphify-mcp` console scripts. The default install declares NetworkX, NumPy, RapidFuzz, tree-sitter, and 25 language grammar wheels as mandatory direct dependencies; integrations are extras. See [`pyproject.toml` lines 5-43](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L5-L43) and [lines 50-87](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L50-L87).

The inspected source contains approximately 47,790 Python lines across core, extractor, and exporter modules. The largest modules are `extract.py` (~4,941 lines), `extractors/engine.py` (~4,519), `cli.py` (~2,772), `llm.py` (~2,593), `extractors/resolution.py` (~2,292), and `install.py` (~2,148). This is a modularization-in-progress codebase, not a small library boundary.

### Logical pipeline

**Official claim, substantially source-aligned:** [`ARCHITECTURE.md`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/ARCHITECTURE.md) describes:

`detect -> extract -> build_graph -> cluster -> analyze -> report -> export`

**Verified source:** responsibilities are distributed across:

| Layer | Key modules | Verified behavior |
|---|---|---|
| Corpus discovery | `detect.py`, `manifest.py`, `google_workspace.py` | Classifies code/docs/papers/images/video; honors ignore rules; sensitive-name filtering; symlinks off by default; optional Google Workspace conversion. |
| Deterministic extraction | `extract.py`, `extractors/*`, `manifest_ingest.py`, `mcp_ingest.py`, `scip_ingest.py` | tree-sitter AST plus regex/XML/specialized parsers, cross-file symbol resolution, rationale and manifest extraction. |
| Semantic extraction | `llm.py`, `semantic_cleanup.py` | Sends docs/papers/images/transcripts to configured model backends or relies on an orchestrating agent; merges returned JSON fragments. |
| Graph assembly | `build.py`, `symbol_resolution.py`, language-specific resolution modules | Constructs NetworkX Graph/DiGraph/MultiGraph variants, normalizes schema and IDs, merges/deduplicates nodes/edges/hyperedges. |
| Analysis | `cluster.py`, `analyze.py`, `dedup.py`, `affected.py` | Leiden/Louvain clustering, degree hubs, cross-community surprises, betweenness, MinHash/Jaro-Winkler dedup, impact traversal. |
| Persistence/export | `export.py`, `exporters/*`, `wiki.py`, `tree_html.py`, `callflow_html.py` | `graph.json`, HTML viewers, report, GraphML/SVG/Cypher/Neo4j/FalkorDB/Obsidian/wiki/canvas outputs. |
| Interfaces | `cli.py`, `__main__.py`, `serve.py`, `install.py`, `hooks.py`, `watch.py` | CLI commands, MCP stdio/HTTP, agent-skill installation, hooks, watch/incremental rebuild. |

## Parsing and graph construction

### File detection and safety boundaries

**Verified source:** detection resolves the corpus root, disables symlink following unless explicitly enabled, rejects symlink targets outside the root, applies ignore rules, and skips filenames/directories judged sensitive. See [`detect.py` lines 185-208](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/detect.py#L185-L208) and [lines 1068-1195](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/detect.py#L1068-L1195).

**Inference:** sensitive-name filtering is useful defense-in-depth, not a data-loss-prevention boundary. A secret in an ordinary source/document filename is still indexed, and a benign file whose name looks secret may be silently excluded with only a warning list.

### AST and non-AST extraction

**Verified source:** the mandatory package set includes the tree-sitter runtime and grammars for Python, JavaScript/TypeScript, Go, Rust, Java, Groovy, C/C++, Ruby, C#, Kotlin, Scala, PHP, Swift, Lua, Zig, PowerShell, Elixir, Objective-C, Julia, Verilog, Fortran, Bash, and JSON. Other languages/formats use optional grammars or regex/XML/specialized extractors. The `extractors/` split is incomplete; many extractors and resolution passes still live in the large `extract.py`/`engine.py` modules.

**Verified test behavior:** on a fictional two-file Python corpus, `graphify extract ... --code-only --no-cluster` produced 4 nodes and 4 edges without an API key. A cross-file `run() -> greet()` call was represented as `calls`, confidence `INFERRED`, score `0.8`; the containment and import syntax were `EXTRACTED`. This confirms that `INFERRED` does not necessarily mean model-generated: deterministic cross-file resolver deductions also use it.

**Unknown:** precision and recall across the advertised language matrix were not independently benchmarked. The upstream suite provides broad regression coverage, but fixtures are not a substitute for representative AI Brain content.

### Semantic/model behavior

**Verified source:** text-like files are read under a corpus-root guard, capped, wrapped as hash-stamped `<untrusted_source>` blocks, and common chat-template sentinels are neutralized before a model call. See [`llm.py` lines 470-555](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L470-L555). Direct/headless backends include Anthropic, Gemini, OpenAI/OpenAI-compatible, Kimi, DeepSeek, Azure OpenAI, Bedrock, Ollama, and a Claude CLI route; API keys are read from environment variables. See [`llm.py` lines 59-151](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L59-L151) and [lines 1413-1515](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L1413-L1515).

The model is instructed to return nodes, edges, hyperedges, provenance fields, confidence classes, and scores. `deep` mode asks for additional inferred architectural edges. This semantic layer is non-deterministic and provider/model dependent even though the surrounding schema and merge are deterministic.

**Important distinction:** code-only extraction can be fully local. Documents, papers, images, and transcripts are not automatically local; they use the selected backend or the host agent's model context. Community naming can also invoke a model, though deterministic hub labels are available.

## Graph model and algorithms

### Data model and persistence

**Verified source:** Graphify uses plain dictionaries for extracted fragments and NetworkX for graph assembly. Nodes have ID, label, file type, source file/location and optional metadata. Edges have source/target, relation, confidence, source provenance, weight, and sometimes context/confidence score. Hyperedges are stored in `G.graph["hyperedges"]`, outside NetworkX's pairwise edge model. [`build_from_json`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/build.py#L383-L447) defaults to an undirected `Graph` for backward compatibility, while the MCP loader forces loaded JSON to directed form before rehydration ([`serve.py` lines 21-47](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L21-L47)). Direction is also stashed in edge attributes for rendering.

**Inference:** this compatibility layering makes edge semantics harder to treat as a stable application contract. An AI Brain graph should choose explicit directed edge semantics and preserve multiple evidence records rather than inherit Graphify's Graph/DiGraph compatibility behavior.

Primary persistence is NetworkX node-link `graph.json` plus sidecars/caches. AST cache entries are versioned by extractor version; semantic cache entries are content-hashed but intentionally unversioned to avoid repeat model cost. See [`cache.py` lines 334-439](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cache.py#L334-L439) and [lines 472-507](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cache.py#L472-L507).

### Algorithms

| Capability | Verified implementation | Product implication |
|---|---|---|
| Communities | Tries optional `graspologic.partition.leiden`; if absent, falls back to seeded NetworkX Louvain. Converts directed graphs to undirected, isolates singletons, can exclude hubs, and splits oversized/low-cohesion communities. [`cluster.py` lines 22-83](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cluster.py#L22-L83), [134-236](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cluster.py#L134-L236). | Default install is Louvain, despite high-level “Leiden” messaging; algorithms are replaceable concepts rather than a reason to embed the package. |
| Community labels | Highest-degree hub label without a model; optional model labeling. [`cluster.py` lines 86-110](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cluster.py#L86-L110). | Labels are heuristic and should not be presented as ground truth. |
| Query | Lexical tokenization, stopwords, IDF-weighted exact/prefix/substring/source matching, trigram prefilter, seed selection, then bounded BFS/DFS with high-degree transit suppression and text budget. [`serve.py` lines 286-372](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L286-L372), [562-708](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L562-L708). | “Natural-language query” is graph-aware lexical retrieval, not a semantic query planner. |
| Path | Unweighted NetworkX shortest path on an undirected view, maximum-hop guard. [`serve.py` lines 1191-1219](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1191-L1219). | Confidence/edge weight does not affect path choice; an AI Brain trust-sensitive path should rank by evidence and confidence. |
| Hubs/surprises | Degree hubs; cross-file/community heuristics; edge/node betweenness (sampled in one path). [`analyze.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/analyze.py). | Useful inspiration, but explainability must expose why a result ranked. |
| Dedup | Local MinHash/LSH plus string similarity/community heuristics. [`dedup.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/dedup.py), [`_minhash.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/_minhash.py). | Separate entity resolution from relationship creation in any native design. |

## Visualization, query, CLI, MCP, and agent integration

### Visualization

**Verified source:** the primary `graph.html` viewer uses vis-network, interactive search/filter/inspection, force-directed physics, confidence-styled edges, and a default 5,000-node limit. It can produce an aggregated community graph when explicitly called with a node limit. See [`exporters/html.py` lines 13-28](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L13-L28), [312-390](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L312-L390). It loads vis-network from `unpkg.com` with SRI ([lines 512-520](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L512-L520)); tree/call-flow viewers also load D3/Mermaid CDNs.

This viewer is a developer artifact, not an accessible/responsive AI Brain UI. Keyboard interaction is explicitly disabled in vis-network (`keyboard: false`) at [`exporters/html.py` lines 141-165](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L141-L165).

### CLI and agent installation

**Verified source:** Graphify has a wide CLI surface for extraction, update/watch, query/path/explain, export, DB push, project merge, hooks, and 20+ agent integrations. Platform installers can edit `AGENTS.md`, `.codex/hooks.json`, assistant settings, IDE rules, and Git hooks. Codex hook and `AGENTS.md` writes are visible at [`install.py` lines 1306-1365](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/install.py#L1306-L1365); Git hook installation is at [`hooks.py` lines 435-517](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/hooks.py#L435-L517).

**Implication:** never run `graphify install`, platform install, or hook install as part of an AI Brain dependency or production deployment. The integration boundary must be an explicit library/CLI invocation in an isolated process, if used at all.

### MCP

**Verified source:** stdio is the default. Optional Streamable HTTP binds to loopback by default; API-key authentication is optional, and OAuth is deferred. See [`serve.py` lines 1407-1423](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1407-L1423) and [1565-1620](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1565-L1620). Tools include graph query/read operations plus GitHub PR listing/impact/triage through the authenticated local `gh` CLI. See [`serve.py` lines 970-1049](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L970-L1049) and [`prs.py` lines 139-237](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/prs.py#L139-L237).

MCP is therefore an agent/developer interface, not a stable AI Brain internal API. Its optional `project_path` parameter can select other filesystem graphs, which is especially unsuitable for a multi-user product boundary.

## Extensibility and external systems

- **Extractors:** adding a language currently requires source changes/registration. A formal third-party plugin API remains an open 1.0 RFC: [issue #1070](https://github.com/Graphify-Labs/graphify/issues/1070).
- **Storage/export:** local JSON is primary. Optional exports/pushes include Neo4j, FalkorDB, GraphML, Cypher, SVG, Obsidian, Canvas, and wiki.
- **Database inputs:** package manifests, optional live PostgreSQL schema introspection, Cargo, SCIP, and MCP configuration ingestion.
- **External services:** configured model providers, GitHub via `gh`, explicit URL ingestion, Google Workspace via authenticated `gws`, YouTube/media via `yt-dlp`, and CDN assets when generated viewers are opened.
- **Optional dependencies:** MCP/HTTP, graph databases, PDF/Office/Google, watch, SVG/Leiden, PostgreSQL, video, model SDKs, Chinese segmentation, SQL/Pascal/DreamMaker/Terraform grammars.

## Performance and scale

**Verified source:** AST extraction supports multiprocessing; semantic chunks and label batches support bounded concurrency; content-hash caches and incremental rebuilds reduce repeat work. Query uses an eager trigram index and bounded traversal. HTML visualization defaults to 5,000 nodes; graph loads are capped at 512 MiB unless configured.

**Verified test:** fictional 2-file Python code-only extraction completed in 0.49 seconds wall time and wrote a 2,367-byte graph. This is a smoke test only, not a benchmark.

**Official claims not independently validated:** published token-reduction and build-speed numbers in `README.md`, `BENCHMARKS.md`, and `docs/how-it-works.md`.

**Known scale evidence:** open [issue #819](https://github.com/Graphify-Labs/graphify/issues/819) reports bottlenecks on a ~10k-file monorepo; [issue #728](https://github.com/Graphify-Labs/graphify/issues/728) reports 24.5% low-value isolated nodes in a 10,006-node graph; [issue #972](https://github.com/Graphify-Labs/graphify/issues/972) reports HTML skipped at ~20k nodes. These are user reports, not independently reproduced here.

## Tests and validation

### Upstream suite

**Verified test:** in the temporary clone, Python 3.12.13 with the committed lock and all extras produced:

`3168 passed, 3 skipped, 12 warnings in 129.70s`

The suite spans languages, cross-file resolution, incremental rebuild, cache, export, MCP/HTTP, security, installation round-trips, model-provider mocks, Google Workspace, databases, and packaging. Upstream CI also tests Python 3.10 and 3.12. The workflow installs all extras and runs the same suite at [`.github/workflows/ci.yml` lines 49-79](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/.github/workflows/ci.yml#L49-L79).

### Important test caveats

- A default-only dependency install ran 3,110 tests successfully but four provider tests failed because `tests/test_ollama_retry_cap.py` imports the optional `openai` package. After matching upstream's `--all-extras` environment, all tests passed. This indicates the test suite itself is not cleanly default-install-only.
- Tests are strong regression evidence, not compatibility evidence for AI Brain's Node/SQLite/Capacitor runtime.
- Security scans are non-blocking in upstream CI; details are in the security note.

## AI Brain integration boundary

### Verified current boundary (not a repeat of Stage 1 audit)

- `package.json` declares a private MIT Node application, Node `>=22 <23`, Next `16.2.9`, React 19, SQLite (`better-sqlite3`), `sqlite-vec`, and Capacitor.
- `src/db/client.ts` owns a singleton SQLite connection, WAL, migrations, and sqlite-vec loading.
- `src/db/migrations/001_initial_schema.sql` stores captured items, chunks, collections, tags, cards, chat, and usage.
- `src/db/migrations/017_topics.sql` already models AI-detected topics and item-topic confidence/evidence.
- `src/db/migrations/023_source_aware_chunks.sql` explicitly creates `item_semantic_events` as a content-free future graph-refresh integration contract and states that no persisted knowledge graph exists today (lines 59-76).
- `src/lib/search/index.ts` already supplies FTS/semantic/hybrid retrieval; `src/lib/related/index.ts` computes item-level semantic similarity.
- `src/lib/auth.ts` is local, single-user PIN/session authentication. A product graph must remain under the same authorization boundary.

### Option assessment

| Option | Technical fit | Recommendation |
|---|---|---|
| Production dependency/embedded Python | Poor: separate runtime, broad grammar dependency tree, JSON sidecar store, file-corpus input, second server/auth surface, mobile packaging burden. | **Do not select.** |
| Long-lived fork | Poor: inherits 48k-line Python maintenance, rapid v0.x churn, security/dependency burden; AI Brain would still need an adapter and product data model. | **Do not select.** |
| Isolated server-side POC | Possible for publication-safe synthetic/exported Markdown and offline evaluation; must pin SHA, disable model egress, avoid installers/hooks/HTTP, and discard output. | **Conditional research tool only.** |
| AI Brain-native graph projection | Strongest fit: derive item/topic/tag/source/collection relationships from existing SQLite records/events; preserve user ownership, deletion, provenance, API/auth, mobile behavior. | **Preferred if council selects a graph feature.** |
| Concept-only reuse | Very strong: reuse extracted/inferred/ambiguous provenance, path explanation, community/hub concepts, and accessible non-visual views without code dependency. | **Preferred baseline.** |

### Native boundary recommendation

If the council approves a graph-inspired feature, define a narrow internal interface around stable AI Brain IDs:

1. `item_semantic_events` (and direct item/topic/tag mutations) enqueue graph projection work.
2. A TypeScript service derives versioned nodes/edges in SQLite with `owner/user`, `source_kind`, evidence, confidence, algorithm/model version, timestamps, and deletion lineage.
3. Authenticated Next.js APIs return scoped neighborhoods/path explanations; never expose a filesystem path.
4. UI provides a list/path/table alternative to visualization and loads no third-party scripts.
5. Existing item deletion cascades into graph deletion; reprocessing is idempotent and reversible.

Graphify's JSON schema can inform fixtures, but should not become the persisted contract.

## Unknowns to carry into synthesis

- Real AI Brain user demand and which graph interaction has durable value.
- Target scale (items, nodes per item, edges, rebuild latency) and device/server split.
- Whether inferred relationships can meet a measurable precision/trust threshold.
- Whether a limited developer-only Graphify POC adds decision value beyond source inspection.
- Exact accessibility and mobile interaction design.
- Operational cost of native relationship extraction and refresh.

## Reproduction record

All commands ran under an isolated temporary directory. No global package, skill, hook, configuration, or private corpus was used.

```text
git clone --filter=blob:none https://github.com/Graphify-Labs/graphify.git <temp-clone>
git -C <temp-clone> rev-parse HEAD
UV_UNMANAGED_INSTALL=<temp-bin> UV_NO_MODIFY_PATH=1 sh <reviewed-uv-installer>
uv python install 3.12
uv sync --all-extras --frozen --python 3.12
uv run --frozen pytest tests/ -q --tb=short
graphify extract <fictional-two-file-corpus> --out <temp-output> --code-only --no-cluster
graphify path run greet --graph <temp-output>/graphify-out/graph.json
graphify explain greet --graph <temp-output>/graphify-out/graph.json
graphify query "what calls greet" --graph <temp-output>/graphify-out/graph.json --budget 500
```

No third-party source or generated graph was copied into AI Brain.
