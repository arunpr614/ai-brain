# Graphify Opportunity — Risk Register

| ID | Risk | Initial severity | Mitigation / evidence needed | Status |
|---|---|---:|---|---|
| R-001 | Graph novelty is mistaken for demonstrated user value | High | Require user-problem and current-behavior evidence before selection | Open |
| R-002 | Existing AI Brain knowledge/relationship capability is duplicated | High | Audit/traceability complete; require candidate comparison against Related, topics, tags, citations, and collections | Open through council |
| R-003 | Inferred relationships mislead users | High | Provenance, confidence, explainability, correction, and accessible alternatives | Open |
| R-004 | Sensitive memories or source relationships are exposed | High | Threat model storage, model calls, exports, UI, and tenant boundaries | Open |
| R-005 | Graphify license/dependency/API maturity is unsuitable | High | Core MIT verified; avoid direct dependency/fork; exclude or separately review optional AGPL-only Pascal dependency; require exit strategy | Open through decision |
| R-006 | Large graphs cause unusable performance or accessibility | Medium | Scale evidence, progressive rendering, list/path alternatives, reduced motion | Open |
| R-007 | Wiki or marketing claims conflict with code | Medium | Discrepancy maps complete; resolve Wiki corrections and qualify Graphify claims before publication | Open through Wiki stage |
| R-008 | Council convergence hides unresolved minority concerns | Medium | Preserve independent rounds, disagreements, and confidence | Open |
| R-009 | Graphify version labels are misread because default branch `v8`/package `0.9.13` and historical tag `v1.0.0` are divergent | Medium | Pin every claim to an exact SHA/tag/package and compare release artifacts before adoption | Open |
| R-010 | Graphify's green CI can be misread as a clean security audit even though Bandit and dependency audit are explicitly non-blocking and currently exit nonzero | High | Review every finding for materiality, pin dependencies, and require AI Brain's own blocking security gates before any dependency adoption | Open |
| R-011 | Graphify's code graph is mistaken for an AI Brain personal-memory graph | High | Treat the data model and extraction pipeline as domain-specific; prefer concept reuse or an AI Brain-native graph unless a direct dependency demonstrates memory-domain value | Confirmed by synthetic POC |
| R-012 | Direct evidence of user-problem frequency and durable value is insufficient | High | Explicit evidence ledger; technical adjacency cannot pass the gate; defer if frequency/value remains Unknown | Open |
| R-013 | Artifact or council gates are bypassed through compressed workflow | High | D-005, expanded tracker, decision IDs, and QA gate audit | Mitigated; monitor |
| R-014 | Wiki permission or concurrent remote update blocks/overwrites publication | Medium | Verify base immediately before push, no force push, compare remote, fresh-clone and live verification | Open |
| R-015 | Two agents edit the same artifact or overwrite synthesis | Medium | Exclusive file ownership and explicit lock release before reviewer/v2 work | Mitigated; monitor |
| R-016 | Proposed graph capability is published as implemented or live | High | Mandatory “Explored / Proposed — not implemented” in index, PRD, prototypes, Wiki, and PR | Open through publication |
| R-017 | Temporary POC clone, environment, fixtures, or outputs outlive research | Medium | D-007 cleanup and process/path verification | Closed |
| R-018 | Graphify graph identifiers disclose absolute paths or usernames | High | Do not publish raw artifacts; normalize IDs at source; regression-test against issue #1789 before any reuse | Confirmed/reproduced |
| R-019 | Graphify HTTP MCP exposes graphs without adequate tenant/project isolation | High | No direct hosted reuse; require mandatory auth, allowlisted roots, tenant isolation, and threat tests | Open |
| R-020 | Generated Graphify HTML depends on external CDNs and lacks AI Brain accessibility guarantees | Medium | Do not adopt generated viewer; bundle audited assets and provide list/table/path alternatives in native design | Open |
| R-021 | Optional Graphify all-extras dependency includes AGPL-3.0-only `tree-sitter-pascal` | High | Never adopt `[all]`; maintain allowlisted extras and license SBOM if any dependency is evaluated | Open |
