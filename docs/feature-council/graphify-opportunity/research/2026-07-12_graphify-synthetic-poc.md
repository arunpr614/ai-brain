# Graphify Synthetic Proof of Concept

**Date:** 2026-07-12  
**Graphify baseline:** `eec7a0183847cbdc8a87d92b233759a5204b89fe`, package `0.9.13`, default branch `v8`  
**Purpose:** Research only; no production dependency or application code  
**Data classification:** Fictional and publication-safe

## Decision question

Does Graphify's default local path turn an AI Brain-like TypeScript memory model into a user-knowledge graph, or does it map the implementation as a software graph?

## Safety boundary

- Created a temporary Python 3.12 virtual environment.
- Installed the exact cloned Graphify source editable inside that environment only.
- Did not run `graphify install`, any platform installer, `hook install`, or global command.
- Used `--code-only`; the fixture README was explicitly skipped.
- Launched Graphify with an empty environment containing only a temporary home and minimal executable path, so no model or service credentials were visible.
- Used no AI Brain source, documents, configuration, secrets, or user data.
- Kept all generated output outside the repository.

## Fixture

Three small fictional TypeScript files defined:

- `Memory`, `Relationship`, and `Confidence` types;
- `createRelationship()` and `sharedTopics()`;
- `KnowledgeMapService.explainConnection()` and `.buildConnections()`;
- `summarizeKnowledgeMap()`.

The accompanying README explicitly stated that the fixture contained no AI Brain source or user data.

## Commands

The commands below are normalized to temporary variables; no user-specific local path is required.

```bash
python3.12 -m venv "$TMPDIR/graphify-poc-env"
"$TMPDIR/graphify-poc-env/bin/python" -m pip install -e "$TMPDIR/graphify-source"

env -i HOME="$TMPDIR/graphify-home" \
  PATH="$TMPDIR/graphify-poc-env/bin:/usr/bin:/bin" \
  graphify extract "$TMPDIR/graphify-poc-fixture" \
  --code-only --out "$TMPDIR/graphify-poc-output"

env -i HOME="$TMPDIR/graphify-home" \
  PATH="$TMPDIR/graphify-poc-env/bin:/usr/bin:/bin" \
  graphify cluster-only "$TMPDIR/graphify-poc-output" --no-label
```

Queries executed against the generated graph:

```bash
graphify query "how are memories connected by shared topics" --budget 800
graphify explain "KnowledgeMapService"
graphify path "summarizeKnowledgeMap" "sharedTopics"
```

## Observed output

### Extraction

- Scan: three code files and one documentation file.
- `--code-only`: skipped the documentation file and made no semantic/model call.
- Graph: 12 nodes, 26 edges, three communities.
- Edge confidence: 26 `EXTRACTED`, zero `INFERRED`, zero `AMBIGUOUS`.
- Relations: `calls`, `contains`, `imports`, `imports_from`, `method`, and `references`.
- Initial extraction: 1.76 seconds wall time.
- No-cluster-label post-processing: 0.27 seconds wall time.
- Artifacts: `graph.json`, `.graphify_analysis.json`, manifest/cache files, `GRAPH_REPORT.md`, `.graphify_labels.json`, and `graph.html`.

### Query behavior

The question “how are memories connected by shared topics” lexically seeded `sharedTopics()` and expanded breadth-first to 11 of 12 software nodes at depth two. It returned code entities and their call/import/reference edges, not instances of memories, topics, or user-level relationships.

`explain KnowledgeMapService` correctly reported its source location, community, degree, two methods, containing file, and importing file. `path summarizeKnowledgeMap sharedTopics` correctly returned a three-hop file/import path.

## Interpretation

### Verified

- Graphify's no-model TypeScript path is fast and produces traceable code-structure edges with source locations and confidence labels.
- Query, explain, and path operate locally against `graph.json`.
- The generic query uses lexical seeding plus graph traversal; it does not answer the fixture question semantically.
- A TypeScript model whose runtime concepts include “memories” still becomes a graph of files, types, methods, calls, imports, and references.

### Inference

Directly adding Graphify would not create an AI Brain personal-memory graph without a separate domain-specific extraction and persistence layer. Graphify concepts—provenance labels, path explanation, community detection, and accessible graph exports—may still inform an AI Brain-native feature.

## Limitations

- Tiny synthetic fixture; no scale conclusion.
- TypeScript only; no documents or model-backed semantic extraction.
- No evaluation of Neo4j/FalkorDB/MCP or multi-user hosting.
- The generated visualization was not adopted or copied into AI Brain.
- This is decision evidence, not a dependency recommendation.

## Cleanup

Cleanup completed after canonical research synthesis on 2026-07-12. Temporary source clones, virtual environments, fictional fixtures, generated outputs, scan reports, and installer artifacts from every research lane were removed. No Graphify process, listener, hook, skill, global configuration, or tracked AI Brain file remained. The clean Wiki baseline clone is retained separately for the later authorized Wiki publication workflow.
