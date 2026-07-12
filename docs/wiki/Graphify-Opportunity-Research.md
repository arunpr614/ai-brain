# Graphify Opportunity Research

Purpose: Summarize the source-backed Graphify evaluation and its relationship to current AI Brain capabilities.
Audience: Product, design, engineering, security, documentation maintainers, and AI agents.
Verified against: AI Brain code baseline `8c1341100b174fe4ca518e6a745c30b9078df21c`, Graphify `eec7a0183847cbdc8a87d92b233759a5204b89fe`, and council artifact commit `bad4fbd2af6a480aa8c208324bbb23e7234990a2`.
Runtime evidence through: None for AI Brain; isolated fictional POCs and dependency tests only.
Last reviewed: 2026-07-13.
Artifact source commit: `bad4fbd2af6a480aa8c208324bbb23e7234990a2`.
Audited AI Brain baseline: `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Graphify baseline: release `v0.9.13`, default branch `v8`, commit `eec7a0183847cbdc8a87d92b233759a5204b89fe`.
Research evidence date: 2026-07-12.
Runtime verification: No AI Brain production runtime change; Graphify functional tests and isolated fictional POCs only.
Lifecycle: Final source-research summary for the 2026-07-13 council decision.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

**Status: Explored / Proposed — not implemented.** See the [final council decision](Graphify-Opportunity-Decision).

## Executive summary

Graphify is a capable Python developer tool for extracting code and selected document/media structure into a queryable graph. Its verified concepts include typed relationships, source provenance, confidence classes, bounded graph retrieval, path inspection, communities, hubs, and exports.

Its semantics are narrower than headline wording can imply:

- query is lexical seed selection plus bounded traversal, not semantic question answering;
- shortest path is unweighted on an undirected view, not confidence-aware causality;
- explain summarizes a node neighborhood, not a universal derivation for each edge;
- code-only local processing does not prove document/media paths remain local when a configured model provider or host-agent context is used.

## AI Brain comparison

AI Brain already has item, tag, topic, collection, chunk/citation, provenance, capture-quality, and query-time Related primitives. It does **not** implement a generalized node/edge graph, persisted semantic item-to-item relationship model, multi-hop path query, community layer, graph API, graph route, graph UI, or export.

`item_semantic_events` is a partial future refresh contract, not a complete graph invalidation bus. Only the manual-note `indexed` action has a direct event assertion; there is no graph consumer, durable item-deletion tombstone, complete producer coverage, replay/gap contract, or accepted watermark/rebuild design.

## Build-versus-integrate result

| Mode | Research disposition |
|---|---|
| Raw Graphify Python runtime | No-go on current architecture, lifecycle, dependency, and ownership evidence |
| HTTP MCP service | No-go: optional shared-key auth, no product identity/role/tenant isolation, caller-selected project paths |
| Generated viewer | No-go: external CDN, embedded relationship data, accessibility and dense-graph mismatch |
| Installers/hooks | No-go: unnecessary global/configuration mutation for AI Brain |
| Fork or copied implementation | No-go: maintenance, drift, dependency, and provenance cost without demonstrated value |
| Offline sidecar/custom adapter | Out of the current case; untested rather than universally disproven |
| Independently expressed native concepts | Neutral research input only; no preference over current/minimum behavior or no feature |

Graphify core is MIT, but permissive core licensing does not cure product-fit or security risk. The default runtime is broad, security scans are non-blocking upstream, and the optional `[all]` dependency set includes an AGPL-only Pascal grammar. No Graphify dependency was added to AI Brain.

## Validation snapshot

- Upstream exact-SHA CI passed 3,168 tests with 3 skipped on Python 3.10 and 3.12.
- Independent all-extras Python 3.12 execution passed 3,168 tests with 3 skipped and 12 warnings.
- Bandit and dependency audit exited nonzero while upstream CI treats them as non-blocking; functional green is not a clean security attestation.
- Fictional isolated POCs confirmed Graphify's default code abstraction maps software structure rather than AI Brain memory instances and can expose path-derived identifiers.
- Temporary Graphify clones, environments, fixtures, outputs, scans, and processes were removed after synthesis.

## Principal risks and unknowns

- No direct evidence establishes a frequent user need or durable value for graph-like behavior.
- Inferred or similarity-derived associations can be wrong, stale, sensitive, or falsely authoritative.
- Consent withdrawal, deletion, stale detection, rebuild, rollback, scale, accessibility, measurement, and ownership remain non-passing for a production relationship feature.
- A visual map may add novelty without improving recall, comparison, orientation, or correction over Related, Ask, group pages, and text lists.

## Canonical repository evidence

The complete audit, research, security/privacy/license notes, isolated POC record, council submissions, reviews, matrices, and final recommendation are in the publication-safe [Graphify opportunity artifact tree](https://github.com/arunpr614/ai-brain/tree/codex/research-graphify-feature-council/docs/feature-council/graphify-opportunity).

The final decision is [Defer feature selection](Graphify-Opportunity-Decision). This page is research evidence, not implementation authorization.
