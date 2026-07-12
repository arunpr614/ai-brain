# Graphify Research Note v2

**Status:** v2 — reviewed canonical research input; not a feature recommendation  
**Verified:** 2026-07-12  
**Graphify baseline:** release [`v0.9.13`](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.13), default branch `v8`, commit [`eec7a0183847cbdc8a87d92b233759a5204b89fe`](https://github.com/Graphify-Labs/graphify/commit/eec7a0183847cbdc8a87d92b233759a5204b89fe)  
**AI Brain baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Review addressed:** [Graphify research note v1 adversarial review](GRAPHIFY_RESEARCH_NOTE_V1_ADVERSARIAL_REVIEW_2026-07-12_23-05-43_IST.md)  
**Proposal classification:** Explored / Proposed — not implemented

## Executive finding

Graphify is a capable, fast-moving Python developer tool that converts code and selected document/media inputs into a queryable graph. Its verified concepts—typed relationships, source provenance, confidence classes, bounded retrieval, path inspection, communities, hubs, and exports—are useful research references. Its query is lexical seed selection plus bounded traversal, its shortest path is unweighted on an undirected view, and its explain command summarizes a node neighborhood rather than reconstructing an edge derivation.

This research does **not** select a feature. AI Brain already has a June 2026 FCP-004 decision to proceed with a reduced-scope native relationship graph, but that is historical planning rather than current implementation or proof of user value. The current audit finds no generalized graph implementation and also finds that the event/lifecycle substrate anticipated by FCP-004 is incomplete.

The evidence supports these research dispositions:

- **No-go on current evidence:** Graphify raw production runtime, HTTP MCP service, generated viewer, installers/hooks, long-lived fork, or copied implementation.
- **Out of current scope, not empirically disproven:** offline batch/CLI sidecar or custom domain adapter. These modes would require a new decision-changing case and representative validation before reconsideration.
- **Neutral research input only:** concepts that can be expressed independently in AI Brain. They receive no preference over completing FCP-004, improving existing Related/search/topic/tag/citation surfaces, or doing nothing.
- **No-go for implementation selection while value is Unknown:** neither technical feasibility nor prior approval establishes a frequent, valuable user problem.

## Research boundary and evidence classes

This document separates evidence from selection. It records verified behavior, risks, exclusions, and unknowns. Candidate creation, deduplication, comparative value judgment, and selection belong to the later council stages.

Evidence labels used below:

- **Source:** implementation or metadata at the pinned commit.
- **Test:** committed/upstream test or isolated exact-baseline execution.
- **Official claim:** upstream documentation or website statement not independently reproduced.
- **Local POC:** fictional, isolated execution described in the POC report.
- **Inference:** conclusion derived from evidence.
- **Unknown:** insufficient evidence; non-passing at implementation selection.

## What Graphify verifiably does

### Inputs and extraction

- Source parsing uses tree-sitter, specialized parsers, regex/XML extractors, manifests/configuration, and cross-file resolution. Markdown has a local structural extractor. Semantic processing for documents, PDFs, images, and transcripts can send content to a configured model provider or host-agent context. [Source: detection and dependencies](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L13-L43), [model backends](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L1413-L1515).
- The code-only path can be local and deterministic. That does not make mixed semantic-corpus modes local by default. [Source: README qualification](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/README.md#L24-L29).
- Content hashes, caches, update/watch, deletion reconciliation, and project/global merge tools exist, but their persistence and lifecycle are tool-centric rather than AI Brain account/item lifecycle contracts. [Source: cache behavior](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cache.py#L334-L439).

### Graph model and analysis

- Nodes and typed pairwise edges carry source/location metadata; graph-level hyperedges are stored separately. Confidence classes are `EXTRACTED`, `INFERRED`, and `AMBIGUOUS`, but deterministic resolver deductions can also be `INFERRED`, and missing scores can be defaulted during export. [Source: confidence rubric](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/skills/claude/references/extraction-spec.md#L47-L59), [export defaults](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/export.py#L252-L255).
- Query tokenizes text, removes stopwords, scores lexical matches with IDF, chooses seeds, and performs bounded BFS/DFS. It is not semantic question answering. [Source](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L286-L372).
- Path uses unweighted shortest path on an undirected view. Edge confidence and direction do not choose the route. [Source](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1191-L1219).
- Explain reports node metadata and nearby relationships; it is not a causal derivation for every edge. Communities use optional Leiden and otherwise Louvain; default labels are structural heuristics. [Source: community implementation](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cluster.py#L22-L110).

### Outputs and interfaces

- Primary output is graph JSON plus caches/sidecars, reports, and conditional interactive HTML. Other exports include GraphML, Cypher, Neo4j/FalkorDB, Obsidian/Canvas/wiki, SVG, tree, and call flow.
- Interfaces include CLI, installers/hooks, MCP stdio/HTTP, project/global graph operations, and integrations. The generated viewer embeds graph data and loads external CDN JavaScript; it does not provide a complete accessible equivalent. [Source: viewer/CDN](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L512-L520).

## FCP-004 reconciliation

FCP-004 is the controlling prior planning package. It is not live functionality and it is not automatically reaffirmed. The current council must compare it under the same value and risk standard as all other options.

| Prior commitment | Current classification | Evidence and rationale |
|---|---|---|
| Graph is a derived projection; owner records remain truth | **Retain as a constraint if any graph-like option survives** | Consistent with current AI Brain architecture and avoids Graphify IDs/artifacts becoming authoritative. |
| Nodes for items, tags, collections | **Available in principle; value Unknown** | Current owner tables exist, but usefulness of a combined graph has not been demonstrated. |
| Anchors/citations and accepted evidence nodes/edges | **Unavailable for a current core promise** | FCP-002/FCP-003 inputs are future/planned; a candidate cannot require them for MVP value. |
| `tagged_with`, `in_collection`, `same_source_url` | **Technically derivable; not selected** | Owner data exists or can be deterministically normalized. User benefit beyond present surfaces is unproven. |
| `semantically_related` | **Current query-time primitive; persistence/trust unresolved** | Related uses current vectors at query time. A stored edge would need version, threshold, stale, correction, and deletion rules. |
| `cites_anchor`, `supports_claim` | **Defer until owner records exist** | Do not simulate future source-of-truth data. |
| Provenance on every edge | **Retain as a mandatory gate** | Graphify reinforces the importance of provenance but does not supply an AI Brain trust contract. |
| Optional rebuildable snapshots with stale marker | **Retain as an architectural constraint, details Unknown** | Current `item_semantic_events` is only a partial signal. Snapshot version, watermark, replay, gap recovery, ordering, retention, and deletion propagation remain undefined. |
| Graph canvas plus outline/list equivalent | **Accessibility constraint retained; visual feature unselected** | Graphify's viewer is not reusable. A canvas is not justified until a simpler accessible interaction is shown insufficient. |
| Filters/detail/open-source journey | **Unselected hypothesis** | Existing plan, no current usability or frequency evidence. |
| No Neo4j, export, manual graph truth, collaborative editing, automatic tag changes, or large-scale analytics in v1 | **Retain as exclusions if FCP-004 is reconsidered** | Graphify research adds no reason to expand these boundaries. |
| DTO/list first, then visual, then stale/rebuild | **Retain as a risk-reducing sequence if selected** | Allows value/accessibility testing before a canvas dependency. |
| Hide route for rollback; owner data unaffected | **Retain but incomplete** | Must also define snapshot deletion, queue cancellation, version rollback, diagnostics, and feature-owner response. |

**Reconciliation result:** Graphify does not create a new graph opportunity by itself. It reinforces provenance, bounded retrieval, and inspection concepts while adding stronger cautions about path semantics, confidence labels, lifecycle, external scripts, and operational isolation. Any overlapping candidate must be framed as completing, narrowing, amending, or rejecting FCP-004—not as a new Graphify-originated feature.

## AI Brain lifecycle reality

AI Brain is item-centered: capture leads to provenance/quality, enrichment, chunks/vectors, search/Ask, notes, and processing. Related is computed at query time from chunk-vector centroids; there is no persisted generalized node/edge model, graph route, community layer, path query, export, or graph UI.

`item_semantic_events` is a content-free **partial** refresh contract, not a proven event bus. The audit found a tested `manual_note` producer, no verified producers for original content, AI summary, or legacy paths, and no graph consumer. Replay, gap recovery, retention, ordering, idempotency, deletion propagation, and watermark semantics remain unproven. Any candidate depending on complete event delivery is **Unknown/non-passing** until lifecycle proof exists.

## Integration-mode disposition

| Mode | Tested / inspected | Current disposition | Independent basis and reopening condition |
|---|---|---|---|
| Raw Python runtime embedded in product | Architecture/source, dependency set, functional tests | **No-go** | Adds a second runtime, storage/lifecycle contract, broad irrelevant grammar surface, and Graphify IDs. Reopen only with a materially different architecture case and ownership model. |
| HTTP MCP service | Source inspection | **No-go** | Optional shared-key auth, no product identity/roles/tenant isolation, caller-selected project paths, resource and audit gaps. [Source](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L843-L909). |
| Generated HTML viewer | Source and generated POC artifact behavior | **No-go** | CDN scripts, embedded data, accessibility and dense-graph mismatch; no complete nonvisual parity. |
| Installers, assistant skills, or hooks | Source inspection; deliberately not executed | **No-go** | Unnecessary global/configuration mutation for the product question. |
| Offline batch/CLI sidecar | Not representative of AI Brain memory data | **Out of scope; not empirically disproven** | Product architecture has no demonstrated need for a second batch artifact. Reopen only for a surviving candidate with synthetic AI Brain-shaped data, exact boundary, resource/deletion/rebuild proof, and disposable output. |
| Custom fragment/domain adapter | Not tested | **Out of scope; not empirically disproven** | Would still require a memory-domain model and owner/lifecycle adapter. A POC is justified only if this mode becomes decision-changing. |
| Long-lived fork | Source size/maturity/dependency analysis | **No-go** | High ownership and upgrade burden without removing native product/model work. |
| Copied implementation | License/source analysis | **No-go** | MIT permits use with notice, but copying creates provenance, private-API, dependency, and drift burden without demonstrated benefit. |
| Concepts-only independent native expression | No Graphify code needed | **Neutral research input** | May enter ideation alongside no feature, FCP-004 completion, and smaller existing-surface improvements. It is not preselected. |

The POC supports only this narrower conclusion: Graphify's default code-only extraction maps software structure rather than AI Brain memory instances, and absolute/path-derived identifiers can occur. It does **not** prove every offline sidecar or custom-adapter boundary unfit, nor does it prove production feasibility.

## Security, privacy, license, and dependency disposition

| Component or finding | Scope | Status / reachability | Independent decision effect |
|---|---|---|---|
| Core Graphify license | Default | MIT, verified at pinned commit | Compatible in principle; does not resolve architecture, privacy, security, or maintenance risk. |
| Default runtime dependencies | Default | Roughly 29 direct distributions, mostly language grammars irrelevant to AI Brain | Material supply-chain/runtime burden; supports embedded-runtime no-go. |
| Pascal grammar `tree-sitter-pascal 0.11.0` | Optional `pascal`; included by `[all]` | AGPL-3.0-only; not installed by core | Never use `all`; requires legal approval if selected. Does not relicense an unmodified/uninstalled MIT core. [Source](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L73-L83). |
| LGPL packages | Optional/transitive paths | Mode-specific obligations; not proven incompatible | Legal/SBOM review required only if the selected dependency path reaches them. |
| Development-only copyleft tools | Contributor group | Not runtime by declaration | Must not enter a distributed artifact; not a core-runtime blocker by itself. |
| Bandit: 3 High / 8 Medium / 77 Low | All-extras source scan snapshot | Exit 1; SHA-1 highs assessed as non-security ID/MinHash use; XML/wildcard findings contextual | No blanket exploit claim. Any use requires a blocking, scoped triage and accepted residual risk. |
| `pip` vulnerability | All-extras environment/tooling snapshot | Fixed version available; not a demonstrated product runtime path | Pin/upgrade and rescan if any Python mode is reconsidered. |
| Optional `soupsieve` vulnerabilities | Optional document-conversion transitive path | Fixed version available; reachability depends on selected extra/use | Not a core blocker; blocking SCA required for the exact selected lock. |
| Upstream security jobs | CI workflow | Bandit and pip-audit are `continue-on-error` | Green CI is functional evidence, not a clean security attestation. [Source](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/.github/workflows/ci.yml#L81-L106). |
| Absolute path/username in IDs/artifacts | Default artifact behavior | Reproduced in fictional POC; open [issue #1789](https://github.com/Graphify-Labs/graphify/issues/1789) | Blocks raw artifact publication/product persistence. Use opaque AI Brain IDs for any native option. |
| Configured provider/host-agent egress | Semantic document/media modes | Confirmed source path; exact exposure depends on selected provider/mode | Requires explicit policy, consent, minimization, and boundary proof; code-only evidence cannot waive it. |
| Sensitive inferred relationships | All graph-like modes | Conceptual privacy/trust risk, even without raw text | Requires provenance, correction/deletion, exclusion policy, and precision validation. |

## Test, POC, and cleanup evidence

- Upstream exact-SHA CI run [29188746335](https://github.com/Graphify-Labs/graphify/actions/runs/29188746335) passed 3,168 tests with 3 skipped on Python 3.10 and 3.12.
- Independent all-extras Python 3.12 execution passed 3,168 tests with 3 skipped and 12 warnings in 129.70 seconds.
- Functional coverage is strong; it does not substitute for security, license, privacy, accessibility, or AI Brain value gates.
- A fictional three-file TypeScript code-only POC produced 12 nodes, 26 extracted edges, and three communities; a second fictional two-file Python POC produced four nodes and four edges. These are abstraction/locality checks, not representative scale tests.
- All temporary Graphify clones, runtimes, fixtures, outputs, scan artifacts, and processes from the research lanes were removed after synthesis. No hook, listener, assistant skill, global configuration, production dependency, or tracked third-party artifact remained. The POC report preserves normalized commands, fixture definition, timings, aggregate results, and limitations for reproduction.

## Validation coverage

| Dimension | Raw runtime / MCP / viewer | Offline sidecar / adapter | Native independent concept |
|---|---|---|---|
| Default code extraction behavior | **Tested**, tiny fictional fixtures | **Partly tested** only for default code semantics | Not applicable |
| AI Brain-shaped memory extraction | Not tested; mode no-go on independent fit/security grounds | **Untested** | Existing owner-data shapes audited; candidate mapping untested |
| Representative scale and resource use | **Untested** | **Untested** | **Untested** |
| Query/path/explain semantics | **Source verified and locally sampled** | Same engine only if chosen | Candidate-specific semantics unselected |
| Identity, tenant, role authorization | **Source-inspected; fails product criteria for HTTP MCP** | **Untested** boundary | Existing AI Brain auth patterns audited; candidate-specific proof untested |
| Deletion, replay, stale detection, rebuild, rollback | Tool behavior inspected; does not match AI Brain lifecycle | **Untested** | **Untested; current event contract incomplete** |
| Privacy/model egress | Source-inspected; mode-dependent | **Untested** exact flow | Candidate policy unselected |
| Dependency/license gate | All-extras snapshot tested; not clean | **Untested** exact minimal lock | Not applicable if no code/dependency copied |
| Accessibility/mobile/large graph | Source/static behavior inspected; no AT/user test | **Untested** | **Untested** until a candidate/prototype exists |
| User problem frequency and value | **Unknown** | **Unknown** | **Unknown** |
| Maintenance ownership/operational SLOs | **Unknown / unsuitable as embedded contract** | **Unknown** | **Unknown** |

These gaps permit neutral ideation. They block MVP recommendation or implementation selection.

## AI Brain production-fit criteria

Any selected mode or native candidate must pass all applicable criteria:

1. Owner records remain authoritative; every derived relationship has provenance and version.
2. Deterministic rebuild, stale detection, deletion propagation, replay/gap recovery, rollback, and cancellation are defined and tested.
3. Product identity, owner scope, future tenant/role boundaries, and audit behavior are enforced.
4. Raw content, paths, titles, URLs, graph associations, and model-provider egress obey explicit consent and minimization policy.
5. Exact dependencies, licenses, hashes, SBOM, and blocking vulnerability review are approved.
6. Build/query memory, CPU, latency, cache growth, and failure behavior are bounded on a representative corpus.
7. Failures are observable through privacy-safe metrics such as rebuild duration/failure, stale rate, deletion lag, fallback rate, and sampled precision.
8. Every visual interaction has a usable keyboard, screen-reader, zoom/reflow, reduced-motion, mobile, and nonvisual equivalent.
9. Feature flag, data cleanup, route/API rollback, and owner-data-safe exit are proven.
10. A named maintainer owns operations, policy, quality review, and deprecation.

Raw runtime, HTTP MCP, and generated viewer fail multiple current criteria. Offline sidecar/adapter modes remain unvalidated rather than rejected by POC behavior. Native concepts avoid Graphify runtime risk but still fail implementation selection while user value and lifecycle are Unknown.

## Neutral option frame for council ideation

The later shortlist must generate and compare options without treating this list as candidates or ranking:

- no new feature;
- complete, narrow, amend, or reject the existing reduced FCP-004 plan;
- improve an existing Related, search/Ask, topic, tag, collection, citation, or source-inspection surface;
- independently express a useful graph concept only if it solves an audited user problem better than simpler alternatives.

Graphify capabilities may be used as non-exhaustive seeds, not preferred families: inspectable provenance, bounded neighborhood retrieval, path explanation, community/bridge heuristics, and confidence vocabulary. A council candidate must state whether it duplicates FCP-004 and what genuinely changes.

## Required gates and non-passing unknowns

No candidate may receive a go while any applicable item remains `Unknown`:

1. Frequent user problem and target behavior demonstrated.
2. Advantage over no feature, FCP-004 completion, and smaller existing-surface improvements.
3. Exact node/relationship/evidence/confidence model using currently available owner data.
4. Measured relationship precision plus correction, deletion, and sensitive-topic controls.
5. Explicit provider-egress, artifact, and association-privacy policy.
6. Owner-scoped authorization and complete lifecycle/rebuild/rollback contract.
7. Accessible interaction equal to any visualization.
8. Representative scale/SLOs, observability, named ownership, and reversible exit.

The strongest current uncertainty is user value. Prior approval and technical adjacency are not substitutes.

## Review finding resolution

| Review finding | v2 resolution |
|---|---|
| P1-1 prior FCP-004 and lifecycle omitted | Added item-by-item reconciliation; classified future inputs; made incomplete event lifecycle explicit. |
| P1-2 POC conclusion overgeneralized | Narrowed the conclusion and added independent mode dispositions; sidecar/adapter are out of scope, not empirically disproven. |
| P1-3 research preselected five concepts | Removed positive concept/native dispositions; replaced candidate list with a neutral option frame including no feature and simpler surfaces. |
| P2-1 decision claims lacked inline traceability | Added immutable links and a scoped evidence ledger; dated volatile activity/test observations. |
| P2-2 security/license scope unclear | Added default/optional/dev, reachability, exploitability, fix, obligation, and decision-effect table. |
| P2-3 POC cleanup unverified | Recorded verified cleanup and preserved reproducibility evidence in the POC report. |
| P2-4 readiness evidence weak | Added tested/partly tested/untested/not-applicable coverage and explicit implementation no-go gates. |
| P3-1 imprecise egress/activity wording | Replaced with configured provider/host-agent egress and dated maturity evidence. |
| P3-2 production fit undefined | Added ten explicit AI Brain production-fit criteria. |

## Canonical sources and annexes

- [Product and knowledge-graph source note](2026-07-12_graphify-product-research-source-note.md)
- [Capability inventory](2026-07-12_graphify-capability-inventory.md)
- [Product claims evidence map](2026-07-12_graphify-product-claims-evidence-map.md)
- [Architecture analysis](2026-07-12_graphify-architecture-analysis.md)
- [Security and privacy analysis](2026-07-12_graphify-security-privacy-analysis.md)
- [License and dependency analysis](2026-07-12_graphify-license-dependency-analysis.md)
- [Technical risk summary](2026-07-12_graphify-technical-risk-summary.md)
- [Synthetic proof of concept](2026-07-12_graphify-synthetic-poc.md)
- [AI Brain versus Graphify comparison](2026-07-12_ai-brain-versus-graphify-capability-comparison.md)
- [AI Brain audit v2](../audit/2026-07-12_ai-brain-feature-audit_v2.md)
- [Semantic event and graph-input lifecycle matrix](../audit/2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md)

## Final research disposition

Graphify is suitable as a pinned source of research concepts, not as an AI Brain production dependency or UI. Its raw runtime/MCP/viewer/fork/copy modes are no-go on current independent architecture, security, lifecycle, accessibility, dependency, and maintenance grounds. Sidecar/adapter modes are outside the current case and remain untested rather than universally disproven. Independent native concepts may enter council ideation with no preference. The council must deduplicate against FCP-004 and compare no feature plus simpler existing-surface improvements before any shortlist is frozen.
