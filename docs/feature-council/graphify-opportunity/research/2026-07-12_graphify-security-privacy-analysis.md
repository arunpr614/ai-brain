# Graphify security and privacy analysis

**Status:** Stage 2 source note for later v1 synthesis  
**Verified:** 2026-07-12  
**Graphify revision:** [`v0.9.13`](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.13), [`eec7a0183847cbdc8a87d92b233759a5204b89fe`](https://github.com/Graphify-Labs/graphify/commit/eec7a0183847cbdc8a87d92b233759a5204b89fe)  
**Review posture:** source/test threat review, not a penetration test or compliance certification

## Bottom line

Graphify's code-only AST path can operate locally, and the project has meaningful safeguards for symlinks, SSRF, graph-size denial of service, HTML serialization, and prompt-injection sentinels. Those controls do not make the whole product local or suitable as an AI Brain service boundary.

The highest risks for AI Brain are:

1. semantic document/media extraction can send complete content and images to a selected external model;
2. graph artifacts and node IDs can disclose filenames, relationships, local paths, and usernames (open [#1789](https://github.com/Graphify-Labs/graphify/issues/1789), independently reproduced);
3. HTTP MCP authentication is optional and provides neither per-user authorization nor tenant isolation;
4. MCP's `project_path` can select arbitrary `*/graphify-out/graph.json` files accessible to the process;
5. model-origin relationships can be wrong or prompt-injected despite partial defenses;
6. generated viewers fetch third-party CDN scripts when opened;
7. the broad optional dependency surface and non-blocking security scans create supply-chain exposure.

**Recommendation:** do not deploy Graphify's HTTP MCP server or raw graph artifacts as an AI Brain product feature. If graph functionality proceeds, implement it within AI Brain's existing authenticated TypeScript/SQLite boundary. Restrict any Graphify POC to an isolated process, synthetic/public data, code-only mode, no installers/hooks, no HTTP listener, and pinned dependencies.

## Evidence classification

- **Verified source/test:** observed at the pinned commit or in the isolated test/POC.
- **Official claim:** project documentation; discrepancies are called out.
- **Inference:** threat judgment based on the observed data flow.
- **Unknown:** not established by the reviewed evidence.

## Data-flow and processing map

| Operation | Local processing | Possible external flow | Sensitive outputs |
|---|---|---|---|
| Code-only extraction | File enumeration, tree-sitter/regex/XML parsing, resolution, NetworkX build, cache. No model required. | Package installation and viewer CDNs are separate network activity; the extraction itself need not call a model. | Symbols, calls/imports/inheritance, source paths/locations, inferred cross-file links. |
| Docs/PDF/text semantic extraction | Local file read/PDF text extraction, chunking, prompt wrapping/cache/merge. | Full bounded text chunks go to Anthropic, Gemini, OpenAI-compatible providers, Azure, Bedrock, Ollama/custom endpoint, Claude CLI, or the host agent context. [`llm.py` lines 1413-1515](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L1413-L1515). | Raw content in provider request; derived entities/relationships in graph/cache. |
| Image semantic extraction | Local size/path checks and base64 preparation. | Pixel data is included for vision-capable remote backends. | Image contents and derived labels. |
| Audio/video | Local faster-whisper after input acquisition. | URL media uses `yt-dlp`; opening remote URL and download expose network metadata/content request. | Download/transcript/cache and derived entities. |
| URL ingest | Local conversion/storage after fetch. | Explicit fetch plus Twitter oEmbed paths; SSRF-guarded main fetch. | Remote content copied into corpus and graph. |
| Google Workspace | Converts pointer files to Markdown/text sidecars. | Authenticated `gws` CLI exports content through Google APIs. | Converted content under `graphify-out/converted/`. |
| MCP graph query | Local graph load/query. | Stdio stays process-local; HTTP exposes it over the network; PR tools invoke authenticated `gh` and GitHub. | Query terms, node/edge/source data, optional query log. |
| Generated HTML | Local file generation. | Opening graph/tree/call-flow viewers loads scripts from unpkg, d3js.org, or jsDelivr. | Browser network metadata; graph content remains embedded locally unless subsequently shared. |

## Official security claims versus source

Graphify's [`SECURITY.md` lines 23-53](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/SECURITY.md#L23-L53) says graph analysis makes no network calls except explicit ingest, MCP graph paths stay inside `graphify-out`, and optional network calls are ingest/PDF/watch. This is stale/incomplete at `v0.9.13`:

- semantic model backends make external calls;
- Google Workspace export, URL media, GitHub PR MCP tools, and HTML CDNs make external calls;
- `_load_graph()` no longer calls `validate_graph_path()` and MCP multi-project routing accepts a caller-provided absolute project path;
- the supported-version table names only `0.3.x` although the released package is `0.9.13` ([`SECURITY.md` lines 3-8](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/SECURITY.md#L3-L8)).

Treat the source, not this policy prose, as the effective security model.

## Threat model and findings

### S1 — External model egress of private content

**Severity for AI Brain integration:** High  
**Evidence:** verified source

`detect_backend()` selects the first configured paid/provider credential, then Bedrock, and considers Ollama last. [`llm.py` lines 2254-2280](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L2254-L2280). Text files are read and wrapped, images may be loaded and base64-encoded, and those values are placed in provider requests. API keys are environment-derived ([`llm.py` lines 904-939](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L904-L939)).

The tool prints an explicit warning when Ollama is selected without a key, but local-looking URLs can still be a remote LAN/custom endpoint. A host agent semantic pass also places source text in the agent/model context, even when Graphify's Python SDK does not directly make the call.

**AI Brain control:** no implicit backend discovery for user memories. Require explicit per-source consent, provider disclosure, minimization, redaction, purpose/version recording, and an entirely local/off mode. Do not send private AI Brain source or user memories during research.

### S2 — Source path, username, and relationship disclosure

**Severity:** High if artifacts are shared/synced; Medium if strictly local  
**Evidence:** verified test + open upstream issue

The fictional POC graph stored absolute source paths and minted structural IDs from the absolute scan path. The result included the temporary root in node IDs and `source_file`. This matches open [issue #1789](https://github.com/Graphify-Labs/graphify/issues/1789), which reports username/home-path leakage and non-portable IDs.

Even after path normalization, graph content is sensitive: function names, topics, filenames, dependencies, relationship direction, inferred communities, user queries, and graph centrality can expose architecture or personal associations. `graph.json`, reports, HTML, Obsidian/wiki exports, caches, labels, analysis, and memory/reflection sidecars must all be considered source-derived confidential data.

**AI Brain control:** persist stable opaque item/topic IDs, never filesystem paths. Scope every query by user/owner. Do not publish raw graph/report/HTML files. Provide redacted export as an explicit, reviewed operation only.

### S3 — Generated and temporary file lifecycle

**Severity:** Medium  
**Evidence:** verified source/test

Observed/generated data includes:

- `graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html`, optional tree/call-flow/export files;
- `graphify-out/cache/ast/v*/` and unversioned semantic cache containing extracted nodes/edges;
- `graphify-out/manifest.json`, label/analysis/cost/root sidecars, converted Office/Google files, transcriptions, memory/reflection artifacts;
- optional user-home query log, global graph, cloned repositories, and installed agent/IDE/hook files.

AST cache writes use atomic temporary files and relativize `source_file`, but semantic caches intentionally survive Graphify version changes. [`cache.py` lines 387-439](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cache.py#L387-L439). Orphan semantic cache pruning exists ([lines 472-507](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/cache.py#L472-L507)), but retention is tool-centric, not aligned to AI Brain's item deletion, backup, account deletion, or consent lifecycle.

**AI Brain control:** a native projection must cascade deletes, tombstone/version relationship evidence, support rebuild, and remain inside existing backup/retention controls. A POC must use a disposable directory and delete outputs after review.

### S4 — Credential handling and ambient authority

**Severity:** Medium  
**Evidence:** verified source

Graphify does not persist model API keys in its graph; it reads environment variables and uses standard SDK credential chains. However, the process inherits ambient authority:

- Anthropic/OpenAI/Gemini/Kimi/DeepSeek/Azure keys;
- AWS profile/region credential chain;
- authenticated `gws` CLI;
- authenticated `gh` CLI used by MCP PR tools ([`prs.py` lines 139-237](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/prs.py#L139-L237));
- filesystem rights of the launching user.

The MCP PR tools are read-oriented but enlarge the trust boundary and expose repository metadata. The HTTP API key is itself supplied through CLI/environment and is one shared secret, not user identity.

**AI Brain control:** do not run Graphify in the production app process or with production secrets. Use a minimal environment allowlist and a dedicated unprivileged account/container for any server-side POC.

### S5 — Prompt injection and untrusted model output

**Severity:** High for agent-facing semantic graphs  
**Evidence:** verified source; residual risk explicitly acknowledged upstream

Positive controls:

- corpus-root resolution blocks out-of-root symlinks;
- every semantic text unit is wrapped in a hash-stamped `<untrusted_source>` block;
- common role/chat-template tokens and forged closing delimiters are neutralized ([`llm.py` lines 481-555](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L481-L555));
- semantic-fragment validators bound byte/node/edge/hyperedge counts and restrict IDs for skill merge paths ([`semantic_cleanup.py` lines 22-163](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/semantic_cleanup.py#L22-L163));
- MCP text output strips control characters and caps labels ([`serve.py` lines 618-680](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L618-L680)).

Residual problems:

- sentinel neutralization is a finite pattern list and cannot prevent semantic instruction following;
- a malicious document can influence extracted entities/edges without needing to break a delimiter;
- model-returned facts can be hallucinated or poisoned;
- the headless `_parse_llm_json()` path bounds raw JSON and filters non-dict entries but does not apply all strict semantic-fragment ID/count checks at that choke point ([`llm.py` lines 780-881](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/llm.py#L780-L881));
- graph output is fed back to agents, turning poisoned relationships into future context.

**AI Brain control:** distinguish deterministic, model-extracted, and inferred edges; retain per-edge evidence and algorithm/model version; never let graph content issue tool instructions; sanitize and quote all agent context; set confidence thresholds; allow users to inspect/correct/remove edges; evaluate adversarial documents.

### S6 — HTTP MCP exposure and multi-user isolation

**Severity:** Critical if used as a shared AI Brain service; Medium for loopback developer use  
**Evidence:** verified source

Positive controls:

- defaults to stdio and loopback HTTP;
- optional API-key middleware uses constant-time comparison;
- warns when wildcard-bound without a key;
- stream sessions have an idle timeout;
- graph files are size-capped.

Blocking gaps for product use:

- authentication is optional; OAuth is explicitly deferred ([`serve.py` lines 1565-1620](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1565-L1620));
- one API key provides server-wide access, with no user identity, roles, object ownership, or audit trail;
- every tool accepts caller-provided `project_path`, described as an absolute path, and maps it directly to `<project_path>/graphify-out/graph.json` ([`serve.py` lines 843-909](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L843-L909), [1035-1049](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L1035-L1049));
- `_load_graph()` checks `.json`, existence, and size, but does not call the stricter `validate_graph_path()` claimed in `SECURITY.md` ([`serve.py` lines 21-59](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/serve.py#L21-L59));
- shared process memory caches multiple graphs without tenant quotas;
- graph queries can reveal sensitive relationship structure even when raw source text is absent.

**AI Brain control:** do not use this HTTP server. Route graph access through AI Brain's authenticated Next.js APIs and enforce owner predicates in every DB query. If a research service is unavoidable, expose only a fixed graph allowlist in an isolated container with mandatory auth, TLS, rate limits, no arbitrary paths, and no `gh`/cloud credentials.

### S7 — Generated HTML and browser security

**Severity:** Medium  
**Evidence:** verified source

The main viewer applies label bounds, `html.escape`, client-side escaping, and replaces `</` in JSON embedded in `<script>`, which are solid XSS mitigations. See [`exporters/html.py` lines 412-509](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L412-L509). However:

- it loads vis-network from a CDN (with SRI) when opened ([lines 512-520](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/exporters/html.py#L512-L520));
- tree/call-flow viewers load external D3/Mermaid scripts without the same visible SRI treatment;
- there is no Content Security Policy in the generated viewer;
- raw graph data is embedded in the document;
- keyboard interaction is disabled, making it unsuitable as AI Brain's accessible view.

**AI Brain control:** bundle audited visualization code under the app's CSP; no external CDN; escape by construction; provide a non-visual list/path/table; apply relationship visibility rules before serialization.

### S8 — URL ingestion and SSRF

**Severity:** Low-to-Medium after controls; higher for unreviewed optional tools  
**Evidence:** verified source

`validate_url()` permits only HTTP(S), rejects private/reserved/loopback/link-local/CGN/metadata hosts, resolves and connects to the validated IP to prevent DNS rebinding, revalidates redirects, caps bodies, and rejects non-2xx responses. See [`security.py` lines 103-308](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/security.py#L103-L308).

Residual risk includes proxy behavior, provider SDKs outside this fetcher, `yt-dlp`'s own network stack, authenticated CLIs, malicious file formats, and future alternate fetch paths. No URL ingest is needed for an AI Brain-native relationship graph beyond AI Brain's already-reviewed capture pipeline.

### S9 — Denial of service and large graph/resource use

**Severity:** Medium  
**Evidence:** verified source + user reports

Controls include a 512 MiB graph-file cap ([`security.py` lines 24-66](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/security.py#L24-L66)), file size limits, bounded semantic fragments, response/download caps, token budgets, hub traversal suppression, concurrency controls, and a 5,000-node viewer default.

Residual risk: JSON load still materializes the entire allowed file, NetworkX is memory-heavy, community/betweenness operations can be expensive, all-extras media/model dependencies are large, and HTTP mode has no per-user graph/query quotas. Open [#819](https://github.com/Graphify-Labs/graphify/issues/819), [#728](https://github.com/Graphify-Labs/graphify/issues/728), and [#972](https://github.com/Graphify-Labs/graphify/issues/972) report large-project performance/noise/viewer limits.

### S10 — Parser and local file attack surface

**Severity:** Medium for untrusted repositories  
**Evidence:** verified static scan/source review

Tree-sitter parses rather than executes source. Graphify does not use `shell=True` according to source/docs. It does invoke external tools for some optional operations and preprocessors, so ambient PATH and tool trust still matter.

Bandit reported three High SHA-1 findings; inspected uses are non-security MinHash/identifier digests, so they are likely classification false positives rather than credential/integrity weaknesses. Bandit also reported XML `ElementTree.fromstring` sites. Most project/XAML parsers guard size and reject DTD/entity declarations ([`extract.py` lines 2820-2840](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/extract.py#L2820-L2840)), but Maven `pom.xml` parsing uses `ElementTree.fromstring` after a 2 MB cap without the same explicit DTD/entity check ([`manifest_ingest.py` lines 36-64](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/manifest_ingest.py#L36-L64), [224-239](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/manifest_ingest.py#L224-L239)). Treat hostile-repository parsing as untrusted workload.

### S11 — Query logging and telemetry

**Severity:** Low at `v0.9.13` default; High if response logging is enabled without controls  
**Evidence:** verified source and fixed issue

[Issue #1797](https://github.com/Graphify-Labs/graphify/issues/1797) documented a default-on, unbounded plaintext query log containing proprietary questions, corpus paths, and optional full responses. `v0.9.13` changes it to opt-in. [`querylog.py` lines 15-35](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/querylog.py#L15-L35) confirms no log unless `GRAPHIFY_QUERY_LOG` or `GRAPHIFY_QUERY_LOG_ENABLE` is set. Logging remains append-only/fail-silent and includes question/corpus, with full response when separately enabled ([lines 43-80](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/graphify/querylog.py#L43-L80)).

No first-party analytics/telemetry call was found in the reviewed core path. External providers/CLIs/CDNs have their own telemetry/privacy policies.

## Supply-chain and security-scan evidence

### Upstream CI caveat

The latest inspected workflow run was [GitHub Actions run 29188746335](https://github.com/Graphify-Labs/graphify/actions/runs/29188746335), overall successful. Tests passed on Python 3.10 and 3.12. However, both security steps are expressly `continue-on-error` in [`.github/workflows/ci.yml` lines 81-106](https://github.com/Graphify-Labs/graphify/blob/eec7a0183847cbdc8a87d92b233759a5204b89fe/.github/workflows/ci.yml#L81-L106). A green badge is therefore not a clean security gate.

### Independent isolated scans

At the pinned lock/all-extras environment:

- **Bandit:** exit 1; 3 High, 8 Medium, 77 Low. Highs were SHA-1 used for MinHash/IDs, not security. Mediums were XML parser sites and explicit wildcard-bind branches.
- **pip-audit:** exit 1; reported `pip 26.1.1` / `PYSEC-2026-196` fixed in 26.1.2. The all-extras environment additionally reported `soupsieve 2.8.3` / `CVE-2026-49476` and `CVE-2026-49477`, fixed in 2.8.4. `soupsieve` is reached through optional document conversion dependencies, not the default Graphify core.

These results are time-specific dependency evidence, not proof of exploitability in Graphify. They do establish that release `v0.9.13`'s committed lock is not vulnerability-clean on the verification date.

## Sensitive relationship display risk

Graph views can make weakly supported or socially sensitive relationships look authoritative. For AI Brain, examples include:

- two people/projects appearing connected because of co-occurrence;
- private health/financial/work topics clustered together;
- “god node” ranking implying importance or endorsement;
- shortest path crossing inferred/ambiguous edges without communicating uncertainty;
- stale relationships surviving source edits/deletion;
- hidden source details exposed through labels, neighbors, or browser exports.

Graphify's path is unweighted and uses an undirected view, so it can prefer a short weak/inferred path over a longer explicit path. Confidence labels exist but do not control path ranking. AI Brain must default to evidence-first explanations, visually and textually distinguish relationship origin, hide low-confidence/sensitive relationships unless requested, and let users correct/delete them.

## Required security gates for any AI Brain graph MVP

1. No Graphify runtime, MCP HTTP, installer, hook, or generated HTML in production.
2. Explicit data classification and model-egress consent; local/off mode supported.
3. All nodes/edges keyed to AI Brain records and owner scope; no file paths or global graph.
4. Per-edge provenance, evidence excerpt/reference, extraction method, model/algorithm version, confidence, timestamps, and deletion lineage.
5. Authorization tests proving cross-user/tenant denial before any multi-user rollout.
6. Prompt-injection test corpus and a rule that graph content is data, never tool instructions.
7. Cascade deletion, rebuild, rollback, and export-redaction tests.
8. Rate limits, graph-size/query-depth budgets, background-job isolation, and observability without raw-content logging.
9. Bundled visualization under CSP plus accessible list/path/table alternatives.
10. SBOM, license allowlist, blocking dependency audit, and pinned lockfile.

## Unknowns

- Whether AI Brain remains permanently single-user or will introduce multiple accounts/tenants.
- Required retention/export policy for graph evidence and user corrections.
- Acceptable precision thresholds and sensitive-topic policy.
- Provider contractual/privacy requirements for each model backend.
- Whether Graphify's security reporting contact in open [issue #478](https://github.com/Graphify-Labs/graphify/issues/478) is now operational; the issue reports failed contact and remains open.

## Validation record

Safe isolated work performed:

```text
uv sync --all-extras --frozen --python 3.12
uv run --frozen pytest tests/ -q --tb=short
uv run --no-sync bandit -r graphify -ll -f json
uv run --no-sync pip-audit --strict -f json
graphify extract <fictional-corpus> --out <temporary-output> --code-only --no-cluster
graphify path/query/explain against the temporary graph
```

No private source was uploaded, no network listener was started, no global install/config/hook was changed, and all generated data remained temporary.
