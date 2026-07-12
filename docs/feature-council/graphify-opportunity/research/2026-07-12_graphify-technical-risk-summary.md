# Graphify technical risk summary

**Status:** Stage 2 specialist source note; feeds council synthesis  
**Verified:** 2026-07-12  
**Graphify target:** [`v0.9.13`](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.13), [`eec7a0183847cbdc8a87d92b233759a5204b89fe`](https://github.com/Graphify-Labs/graphify/commit/eec7a0183847cbdc8a87d92b233759a5204b89fe)  
**AI Brain baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`

## Specialist recommendation

### Build versus integrate

- **Direct Graphify production integration: no-go.** The runtime, storage, auth, data-ingestion, dependency, accessibility, and lifecycle boundaries do not fit AI Brain.
- **Long-lived fork: no-go.** It transfers a rapidly changing ~48k-line Python tool and broad dependency/security surface into AI Brain without removing the adapter/product work.
- **Isolated Graphify POC: defer unless it answers a specific council unknown that source inspection cannot.** If authorized, use only fictional/public data, code-only/local mode, pinned commit/dependencies, no installers/hooks/HTTP, and disposable output.
- **Graphify-inspired AI Brain-native capability: technically viable if a candidate clears user-value/trust gates.** Reuse concepts—explicit provenance, extracted/inferred distinction, path explanation, communities/hubs—not the runtime or raw schema.
- **No feature is also acceptable.** Technical novelty is not sufficient evidence of user value.

## Highest risks

| ID | Risk | Impact | Likelihood if directly integrated | Evidence | Required disposition |
|---|---|---:|---:|---|---|
| R1 | Python/NetworkX/file-corpus architecture conflicts with Node/Next/SQLite/Capacitor product runtime. | High | High | Graphify `pyproject.toml`; AI Brain `package.json`, `src/db/client.ts`. | Native implementation or no-go. |
| R2 | Semantic docs/media can leave the machine through automatically selected model/provider or host-agent context. | Critical | High | [`llm.py` backend selection and calls](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L1413-L1515). | Explicit consent/minimization/local mode; no private research upload. |
| R3 | Graph artifacts disclose sensitive symbols, filenames, relationships, and absolute path/user data. | High | High | Reproduced POC; open [#1789](https://github.com/Graphify-Labs/graphify/issues/1789). | Opaque AI Brain IDs; no raw graph publication. |
| R4 | HTTP MCP lacks product-grade identity/authorization/tenant isolation; caller can select filesystem project graphs. | Critical | High | [`serve.py` multi-project path](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L843-L909), [optional auth](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1565-L1620). | Never use as AI Brain product API. |
| R5 | Inferred/model-created relationships can be poisoned, wrong, stale, or misleading; unweighted undirected shortest path ignores confidence. | High | High | Prompt defenses/residual risk; [`shortest_path`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1191-L1219). | Per-edge evidence/version/confidence; correction/deletion; precision gate. |
| R6 | Optional `tree-sitter-pascal 0.11.0` is AGPL-3.0-only and included in `all`. | High legal | Medium | [PyPI](https://pypi.org/project/tree-sitter-pascal/0.11.0/); [`pyproject.toml` lines 73-83](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L73-L83). | Exclude `pascal`/`all`; legal gate. |
| R7 | Rapid `0.x` release/API/schema/CLI churn; plugin/CLI redesign still proposed. | High | High | 20 releases in ~20 days; open [#1070](https://github.com/Graphify-Labs/graphify/issues/1070). | No persistent Graphify IDs/contracts; adapter-only POC. |
| R8 | Viewer scale/accessibility/privacy mismatch: 5k-node default, keyboard disabled, external CDNs. | High | High | [`exporters/html.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L13-L28), [CDN](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L512-L520). | AI Brain-native accessible UI; no third-party script. |
| R9 | Large graphs and incremental updates can be noisy/destructive; backup/dry-run and quality issues remain open. | High | Medium | [#728](https://github.com/Graphify-Labs/graphify/issues/728), [#819](https://github.com/Graphify-Labs/graphify/issues/819), [#1652](https://github.com/Graphify-Labs/graphify/issues/1652), [#1808](https://github.com/Graphify-Labs/graphify/issues/1808). | Idempotent native projection, snapshot/rollback, scale SLOs. |
| R10 | Security scans do not gate upstream releases; pinned all-extras lock had known vulnerabilities. | High | Medium | [CI `continue-on-error`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/.github/workflows/ci.yml#L81-L106); isolated scan. | Blocking SBOM/SCA/license gates for any use. |
| R11 | Semantic cache/output retention is not tied to AI Brain item/account deletion. | High privacy | High | [`cache.py`](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cache.py#L334-L439). | Native cascade lifecycle and rebuild. |
| R12 | Default package installs ~29 direct core packages, most irrelevant to an AI Brain memory graph. | Medium | High | [`pyproject.toml` lines 13-43](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/pyproject.toml#L13-L43). | Avoid dependency; narrow native scope. |

## What is technically reusable

These concepts are reusable without adopting Graphify:

1. **Edge provenance taxonomy:** deterministic/extracted versus resolved/inferred versus ambiguous.
2. **Evidence-first explanation:** show source item, field/chunk, extraction method, and reason an edge exists.
3. **Scoped neighborhood and path views:** query a bounded subgraph, not an unbounded canvas.
4. **Community/hub summaries:** optional derived views with algorithm/version disclosure.
5. **Incremental projection:** content/version events drive idempotent edge refresh.
6. **Accessible alternative:** list/table/path explanation alongside visualization.
7. **Reversibility:** graph is derived from AI Brain records and can be rebuilt/deleted.

Do not copy Graphify's absolute/path-derived IDs, unweighted undirected path behavior, global JSON persistence, optional-auth HTTP surface, or generated HTML.

## AI Brain-native boundary

AI Brain already has the right source-of-truth primitives:

- items, chunks, tags, collections, cards, and chat in `src/db/migrations/001_initial_schema.sql`;
- AI topics with confidence/evidence in `src/db/migrations/017_topics.sql`;
- source-aware chunks and `item_semantic_events` future graph-refresh contract in `src/db/migrations/023_source_aware_chunks.sql`;
- FTS/semantic/hybrid retrieval in `src/lib/search/index.ts`;
- related-item similarity in `src/lib/related/index.ts`;
- authenticated API/application boundary in `src/lib/auth.ts` and Next routes.

A future MVP should add only a derived, versioned relationship projection and authenticated query APIs. Stable AI Brain record IDs remain canonical; graph data never becomes a separate source of truth.

## Architecture gates before a “go”

1. **User-value gate:** one frequent, measurable problem that graph/path/explanation solves better than search, related items, tags, or topics.
2. **Data gate:** exact node/edge types and source evidence available in current AI Brain records.
3. **Trust gate:** measured precision target, explicit provenance UI, correction/deletion flow, and no unsupported relationship presented as fact.
4. **Privacy gate:** egress policy, sensitive-topic policy, no paths/raw export, full lifecycle/deletion behavior.
5. **Authorization gate:** owner scope in schema/API/tests; cross-user denial if multi-user is contemplated.
6. **Performance gate:** representative corpus limits, incremental refresh SLO, query budget, visualization degradation strategy.
7. **Accessibility gate:** keyboard/screen-reader/reduced-motion/mobile plus a complete non-visual alternative.
8. **Operational gate:** background queue, idempotency, observability without raw content, rollback/rebuild/feature flag.
9. **Dependency gate:** native minimal dependencies, SBOM, blocking audit; no Graphify `all`/AGPL parser.
10. **Exit gate:** disable feature and drop/rebuild derived graph without losing items/topics/tags.

## If a POC is still requested

The only proportionate POC is an offline comparison, not an integration:

- exact Graphify SHA and Python 3.12 isolated environment;
- fictional/public export, never AI Brain private source/user data;
- `--code-only` or explicit local model with no ambient provider keys;
- no `graphify install`, agent install, Git hook, HTTP MCP, global graph, Google/GitHub credentials, or `all` extra;
- disposable output; inspect for path leakage before any sharing;
- compare relationship precision, explanation usefulness, build/query time, and accessible native alternative;
- stop if it does not change the council's decision.

## Validation and confidence

### Passing functional evidence

- Exact tag/SHA/release metadata verified.
- Full isolated Python 3.12.13 all-extras suite: **3,168 passed, 3 skipped, 12 warnings in 129.70 seconds**.
- Upstream latest inspected CI run [29188746335](https://github.com/Graphify-Labs/graphify/actions/runs/29188746335) was overall successful; test jobs passed on Python 3.10 and 3.12.
- Fictional 2-file Python code-only POC: **4 nodes, 4 edges, 0.49 seconds**, no key/model; path/query/explain succeeded.
- POC independently reproduced absolute source/path-derived IDs consistent with open [#1789](https://github.com/Graphify-Labs/graphify/issues/1789).

### Failing/non-blocking security evidence

- Upstream Bandit and pip-audit are explicitly **non-blocking** (`continue-on-error`), so successful CI does not imply security-clean.
- Isolated Bandit exited 1: 3 High, 8 Medium, 77 Low; SHA-1 highs were non-security ID/MinHash use, while XML parser/wildcard-bind findings need contextual handling.
- Isolated all-extras pip-audit exited 1: `pip 26.1.1` (`PYSEC-2026-196`, fixed 26.1.2) and optional-path `soupsieve 2.8.3` (`CVE-2026-49476`, `CVE-2026-49477`, fixed 2.8.4).
- Optional `tree-sitter-pascal 0.11.0` verified **AGPL-3.0-only**.
- Generated graph HTML verified to load CDN JavaScript; MCP HTTP/multi-project isolation gaps verified from source.

### Confidence

- **High** on build-versus-integrate recommendation, runtime mismatch, path/artifact disclosure, MCP isolation, license finding, test result, and CI scan caveat.
- **Medium** on real-world performance/quality because only a smoke corpus was executed and scale findings are upstream/user reports.
- **Unknown** on user value and relationship precision for AI Brain memories; council/product research must decide those.

## Handoff conclusion

Graphify validates that provenance-aware relationship graphs, bounded traversal, paths, hubs, and communities are technically achievable. It does not establish that AI Brain should ship them, and its implementation is the wrong production boundary for AI Brain. The defensible council option is **concept reuse plus an AI Brain-native, narrow, reversible MVP—or no-go if the user-value/trust gates fail**.
