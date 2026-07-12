# Adversarial Review: Graphify Research Note v1

**Reviewed artifact:** `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-research-note_v1.md`  
**Review date:** 2026-07-12 23:05:43 IST  
**Review posture:** Independent, evidence-first, implementation-neutral  
**Severity scale:** P0 = immediate critical harm; P1 = blocks the stated decision; P2 = important correction or validation gap; P3 = clarity or durability improvement

## Executive Verdict

**Verdict: NO-GO for freezing or using research note v1 as the authoritative shortlist input in its current form. Conditional go after the P1 findings below are resolved.**

The note is a strong source inventory and is directionally right to reject Graphify's raw production runtime, HTTP MCP server, generated viewer, installer hooks, copied code, and fork as an AI Brain production integration today. The current evidence also supports treating Graphify's graph concepts as research inputs rather than adopting its implementation.

It is not yet decision-ready for three reasons:

1. It does not reconcile the existing FCP-004 decision and v2 product/technical/UX package, which already selected a reduced-scope, native, derived graph projection and established owner-data, provenance, stale-state, list-fallback, privacy, and rebuild constraints.
2. It overgeneralizes from a tiny, code-only POC that did not exercise Graphify's document, model-assisted, manifest, custom-fragment, scale, MCP, or Neo4j paths.
3. It moves from research into solution selection by marking concept reuse as ready and privileging five concept families before independent council comparison or user-value evidence.

No P0 issue was found. The direct-integration no-go remains reasonable for the raw product modes actually assessed, but the note must identify integration modes separately and must not claim the POC proves every possible sidecar or adapter mode unfit.

## Evidence Inspected

### Primary research and validation artifacts

- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-research-note_v1.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-product-research-source-note.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-capability-inventory.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-product-claims-evidence-map.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-architecture-analysis.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-security-privacy-analysis.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-license-dependency-analysis.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-technical-risk-summary.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_graphify-synthetic-poc.md`
- `docs/feature-council/graphify-opportunity/research/2026-07-12_ai-brain-versus-graphify-capability-comparison.md`
- `docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v2.md`
- `docs/feature-council/graphify-opportunity/audit/2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md`
- `docs/feature-council/graphify-opportunity/SOURCE_INVENTORY.md`
- `docs/feature-council/graphify-opportunity/RISK_REGISTER.md`
- `docs/feature-council/graphify-opportunity/DECISION_LOG.md`
- `docs/feature-council/graphify-opportunity/Research-note.md`

### Prior AI Brain council evidence

- `docs/wiki/Feature-Council-Decision-Log.md`
- `docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md`
- `docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2.md`
- `docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2.md`
- `docs/wiki/Ideas-and-Exploration-Catalog.md`

### Independently checked upstream evidence

- [Graphify `pyproject.toml` at the reviewed commit](https://github.com/Graphify-Labs/graphify/blob/eec7db14af973a24996d3fd61ce6427cc568d10d/pyproject.toml)
- [Graphify HTTP/MCP server source at the reviewed commit](https://github.com/Graphify-Labs/graphify/blob/eec7db14af973a24996d3fd61ce6427cc568d10d/src/graphify/cli/serve.py)
- [Graphify CI workflow at the reviewed commit](https://github.com/Graphify-Labs/graphify/blob/eec7db14af973a24996d3fd61ce6427cc568d10d/.github/workflows/ci.yml)
- [Graphify issue #1789: absolute paths leak usernames and break portability](https://github.com/Graphify-Labs/graphify/issues/1789)
- [Graphify issue #1070: plugin API and CLI consolidation RFC](https://github.com/Graphify-Labs/graphify/issues/1070)

## Adversarial Pass Summary

| Pass | Result | Decision impact |
|---|---|---|
| Reality | Mixed | Upstream capability/version/test claims are substantially grounded; the POC cannot support the broad integration conclusion attributed to it. |
| Staleness | Needs correction | Exact commit evidence is good, but activity/maturity claims and scan results are time-sensitive and need dated, immutable citations. |
| Failure mode | Incomplete | Model egress, path disclosure, stale graphs, cache growth, prompt injection, and inferred-edge errors are identified; mode-specific containment and rollback are not fully separated. |
| Data safety | Directionally sound | Raw artifacts, absolute paths, model-provider egress, and sensitive relationships are recognized; tenant/identity/authorization and deletion propagation remain unresolved. |
| Deployment and rollback | Incomplete | Rejecting the raw runtime avoids several deployment risks, but a native projection still lacks an accepted rebuild, versioning, disable, and owner-data reconciliation contract. |
| Observability | Insufficient | There are no candidate SLOs or required metrics for build time, stale rate, inference acceptance, deletion lag, resource use, or fallback frequency. |
| Acceptance | Blocking | Unknowns are labeled nonpassing, but there are no decision-ready acceptance tests for value, accessibility, representative scale, or prior-plan consistency. |
| Scope | Blocking | Research moves into preferred-solution framing and does not reconcile the already-approved reduced FCP-004 scope. |
| UX | Insufficient | Static viewer risks are documented, but no user study, keyboard/assistive-technology validation, large-graph behavior, or comparison with simpler Related/search improvements exists. |
| Security and privacy | Mixed | The important threat classes are identified, but scan findings, optional dependencies, deployment modes, and confirmed exploitability need a clearer disposition matrix. |

## Findings

### P0 — None found

No evidence of an immediate exploitable production condition was found because Graphify is not currently integrated into AI Brain and the POCs used synthetic data in temporary environments.

### P1-1 — The note ignores the existing FCP-004 decision and therefore cannot serve as the canonical shortlist input

**Claim challenged:** The note frames a native derived graph as a new candidate hypothesis and proposes five concept families without reconciling prior council work.

**Evidence:**

- `docs/wiki/Feature-Council-Decision-Log.md` records FCP-004 as **Proceed with reduced scope**, contingent on clear owner events and rebuild semantics.
- `docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md` already defines a derived projection, owner records as source of truth, edge taxonomy and provenance, stale state, list fallback, privacy behavior, large-graph handling, and explicit exclusions such as Neo4j and export.
- The companion technical v2 already proposes snapshot/edge derivation, stale/rebuild controls, routes and DTOs, and future anchor/evidence conditions.
- The companion UX v2 already requires an inspection workflow, detail panel, empty/stale/large states, plain-language provenance, and nonvisual access.
- `docs/wiki/Ideas-and-Exploration-Catalog.md` describes the current gap as missing persisted edges, route, UI, accessible alternative, and rebuild path—not an absence of graph planning.
- The reviewed note contains no FCP-004 reconciliation and proposes candidate concepts that substantially overlap those artifacts.
- The lifecycle matrix shows that `item_semantic_events` is not a complete bus: only the manual-note producer exists, no consumer exists, and delivery/replay/gap/retention/order contracts are absent. Anchors/evidence are also not available as general current inputs.

**Why this blocks the decision:** A council could mistake prior approved scope for a new Graphify-derived opportunity, repeat already-completed product work, or silently inherit obsolete assumptions about anchors, evidence, and event completeness. This violates the stated goal of comparing audited gaps rather than duplicating current or planned capabilities.

**Required revision:** Add a decision-reconciliation table covering every FCP-004 product, technical, UX, and decision-log commitment. For each item state **retain, supersede, reject, or still unknown**, with evidence and rationale. Explicitly distinguish current inputs from future FCP-002/FCP-003 inputs, and state that the semantic event bus is incomplete until lifecycle proof passes.

**No-go condition:** Do not freeze v1, select an overlapping candidate, or call a feature Graphify-originated while any material FCP-004 commitment remains unreconciled.

### P1-2 — The POC conclusion exceeds what the POC tested

**Claim challenged:** The note says the POCs validate both reusable concepts and a direct-integration mismatch, and concludes that no further POC is needed unless a new unknown appears.

**Evidence:**

- The TypeScript run used a tiny code fixture, explicitly ignored README/document input, and produced 12 nodes, 26 edges, and three communities.
- The Python run used four synthetic nodes and four edges, including one deliberately inferred call and one absolute-path disclosure case.
- The POC explicitly did **not** test document/model semantic extraction, custom fragments/manifests, representative AI Brain memory records, scale, Neo4j, MCP, multi-user authorization, or production visualization.
- The POC report itself limits its conclusion to concepts and says it is not a dependency recommendation.
- A default source-code graph returning source-code entities is expected behavior; it proves that the default code abstraction is not an AI Brain memory model, not that every offline adapter or sidecar boundary is invalid.

**Why this blocks the decision:** The note collapses distinct integration choices into one “direct integration” category. Raw HTTP/MCP service adoption, generated viewer embedding, offline CLI batch generation, custom-fragment ingestion, a constrained library call, a fork, copied code, and native concept reimplementation have different security, lifecycle, licensing, and operational properties. Evidence against one does not automatically reject all others.

**Required revision:** Replace the categorical POC conclusion with: “The POC confirms default code-graph semantics and path behavior do not directly match AI Brain's memory domain; it does not evaluate all adapter or sidecar modes.” Add an integration-mode matrix with independent evidence and disposition for:

1. raw runtime and HTTP MCP service;
2. generated viewer;
3. offline batch/CLI sidecar;
4. custom-fragment or domain adapter;
5. copied code or fork;
6. concepts-only native implementation.

The current evidence is enough to retain a no-go for raw runtime/MCP/viewer adoption. If the revised note wants to reject offline sidecar or custom-adapter modes categorically, it needs a representative synthetic memory-domain test plus lifecycle, resource, and deletion/rebuild evidence. If those modes are simply out of scope for architectural reasons, say so without attributing that conclusion to the POC.

**No-go condition:** Do not use the POC as proof of a universal direct-integration mismatch or as proof of production feasibility.

### P1-3 — The research note preselects the shortlist before council comparison and user-value evidence

**Claim challenged:** The note marks concept reuse as “Proceed to council consideration,” calls a native projection the best technical fit, and advances five named concept families.

**Evidence:**

- The source work correctly reports user value as **Unknown** and performance/quality confidence as only medium.
- No user research, behavioral telemetry, task-success baseline, willingness-to-use evidence, or comparison with simpler changes to Related, search, tags, topics, collections, or citations is presented.
- The five proposed families overlap existing FCP-004 graph scope and are not the output of an independent option-ranking exercise.
- The note's “candidate hypotheses” caveat does not remove the anchoring effect of giving only these options a positive disposition in the canonical evidence document.

**Why this blocks the decision:** A research artifact should preserve evidence and exclusions, while the council should own ideation, deduplication, comparative scoring, and shortlist selection. Otherwise Graphify's visible features become the solution space and the no-feature/simpler-improvement alternatives are structurally disadvantaged.

**Required revision:** Move the five ideas into a clearly labeled, non-exhaustive “capability seeds” appendix or remove them from the canonical research note. Replace “Proceed” and “best fit” language with neutral evidence statements. Require the council comparison to include:

- no new feature;
- complete the already-approved reduced FCP-004 plan;
- smaller enhancements to existing Related/search/tag/topic/citation surfaces;
- any genuinely new concept inspired by the audited gap, not merely by Graphify's UI or data model.

**No-go condition:** Do not publish a shortlist until candidates have been deduplicated against current/planned work and compared on user value, architectural fit, privacy, accessibility, lifecycle readiness, maintenance cost, and reversibility.

### P2-1 — High-impact claims are not traceable inline to immutable upstream or local evidence

**Claim challenged:** The note presents version, activity, package, test, security, issue, dependency, and license conclusions in a canonical artifact but generally links only to annex documents.

**Evidence:** The upstream source note and specialist analyses contain exact commit links, workflow lines, issue links, hashes, and commands. The reviewed note summarizes them without a claim-level citation ledger. Volatile terms such as “actively developed,” release counts, open RFCs, and vulnerability status can become stale even when the reviewed commit does not change.

**Impact:** Reviewers cannot efficiently distinguish source fact, local reproduction, analyst inference, and time-sensitive observation. Later updates could preserve a conclusion after its evidence has changed.

**Required revision:** Add inline footnotes or a compact claim ledger for every decision-bearing assertion. Include exact commit or artifact, verification date, evidence class, and confidence. Cite the exact `pyproject.toml`, CI workflow, server implementation, and relevant issues. Keep current-version observations dated and separate from commit-stable facts.

### P2-2 — Security and license findings need scope and exploitability disposition, not just counts

**Claim challenged:** The note juxtaposes passing functional tests with Bandit/pip-audit failures, an AGPL optional grammar, LGPL optional components, and dependency vulnerabilities without one normalized scope table.

**Evidence:**

- Functional CI is not equivalent to a clean security gate: upstream security jobs are nonblocking/continue-on-error.
- The reproduced Bandit result includes three high-severity SHA-1 findings assessed as likely false positives plus medium/low findings requiring contextual review.
- The pip audit includes findings in tooling or optional paths; presence in an environment is not proof of reachability from the proposed production mode.
- The core Graphify package is MIT. `tree-sitter-pascal` is an optional Pascal dependency and is pulled by the broad `all` extra; it does not relicense the MIT core when it is not installed.
- LGPL-licensed optional packages require mode-specific review, but LGPL does not by itself establish incompatibility.

**Impact:** Readers may either underreact (“tests passed”) or overreact (“AGPL/High/CVE means core is unusable”). Both interpretations are unsupported.

**Required revision:** Add a table with columns for component/finding, default vs optional/dev scope, proposed integration mode, confirmed/contextual/false-positive status, reachability, fixed-version availability, license obligation, and independent blocking effect. State explicitly that permissive core licensing does not cure security/architecture risks, and optional license concerns do not automatically contaminate an uninstalled core.

### P2-3 — The POC is described as complete while temporary artifact cleanup remains unverified

**Claim challenged:** The note treats the POC as completed decision evidence.

**Evidence:** The POC report says no process or hook remained and no files were tracked, but the temporary clone, environment, fixture, and output were only “scheduled for removal.” The stated research goal requires temporary outputs and processes to be removed after evaluation.

**Impact:** This is not evidence of sensitive-data exposure—the fixtures were synthetic—but it is an unclosed reproducibility and research-hygiene condition.

**Required revision:** Record the cleanup command/check and its successful result, or mark cleanup as outstanding. Retain the exact commit, fixture definition, command, exit status, timing, and aggregate outputs needed to reproduce the test without retaining the temporary environment.

**No-go condition:** Do not label v1 final while the cleanup requirement is unresolved.

### P2-4 — Performance, maintenance, observability, and accessibility evidence is too weak for downstream readiness claims

**Claim challenged:** The note correctly lists several unknowns, but its positive native-projection framing can still be read as MVP readiness.

**Evidence:**

- POCs contain only four and twelve nodes, not a representative AI Brain corpus.
- There are no peak-memory, CPU, incremental-refresh, rebuild-time, deletion-lag, query-latency, stale-rate, cache-growth, or failure-recovery measurements.
- Repository activity and concentrated maintenance are observations, not a support/SLA, upgrade-cost, or total-cost-of-ownership assessment.
- Accessibility concerns are inferred from source/static behavior; there is no keyboard, screen-reader, zoom/reflow, reduced-motion, or large-graph usability test.
- The prior FCP-004 UX plan requires a list alternative and inspectable provenance, but no usable prototype exists.

**Impact:** These gaps do not block neutral ideation, but they block an MVP recommendation, production commitment, or “done” architecture claim.

**Required revision:** Add a validation-coverage matrix with **tested, inferred, untested, and not applicable** states for each integration mode and candidate. Establish candidate-specific thresholds only after the shortlist: representative corpus size, rebuild and query budgets, deletion propagation, fallback behavior, inference-quality sampling, accessibility criteria, and maintenance ownership.

### P3-1 — “Ambient model egress” and “active development” are too imprecise for a durable canonical record

**Evidence:** Model-assisted behavior depends on the configured provider or host agent; it is not literally ambient in every mode. Repository activity is a dated observation and does not establish API stability, production support, or long-term maintainability.

**Required revision:** Use “configured model-provider or host-agent egress” and name the exact tested/configured paths. Date activity observations and keep them separate from the inference that a 0.x interface with open consolidation work is not a stable embedded contract.

### P3-2 — “Not production-fit” lacks explicit AI Brain fit criteria

**Evidence:** The research contains the underlying concerns—second runtime, lifecycle, authorization, path handling, model egress, caches, accessibility, and dependency surface—but no concise pass/fail definition of production fit.

**Required revision:** Define production-fit criteria for AI Brain: owner-data authority, deterministic rebuild, deletion propagation, tenant/identity enforcement, no unauthorized egress, dependency/license approval, bounded resources, observable failure, accessible fallback, rollback, and a named maintainer. Then state which modes fail which criteria.

## What the Original Work Gets Wrong

1. **It confuses evidence of a default-domain mismatch with evidence against every integration boundary.** The code-only POC is valuable, but its scope is narrow.
2. **It treats a previously planned feature family as a new research-derived opportunity.** FCP-004 is not background color; it is controlling prior decision evidence that must be reconciled.
3. **It crosses the research/council boundary.** Evidence supports exclusions and risks; it does not yet support privileging five concepts.
4. **It puts unlike security and licensing evidence on one narrative plane.** Default, optional, dev-only, false-positive, contextual, and reachable findings need separate treatment.
5. **It recognizes lifecycle gaps but still understates their effect on candidate readiness.** A schema named `item_semantic_events` is not a complete replayable event contract, and future anchors/evidence are not current dependable graph inputs.

## Missing Validation

| Missing validation | Required when | Minimum evidence |
|---|---|---|
| FCP-004 reconciliation | Before freezing research v2 or shortlisting | Item-by-item retain/supersede/reject/unknown matrix across PRD, technical, UX, decision log, and current implementation audit |
| Integration-mode comparison | Before making a categorical direct-integration claim | Separate architecture, data, security, license, operations, and rollback disposition for runtime/MCP, viewer, sidecar, adapter, fork/copy, and native concepts |
| Representative memory-domain Graphify test | Only if an offline sidecar/custom adapter remains a serious candidate or is categorically rejected based on behavior | Synthetic AI Brain-shaped documents/fragments, no private data, exact source, data-flow record, cleanup proof, quality/resource outcomes |
| User-value comparison | Before shortlist approval | Current-task baseline and evidence comparing no-feature, FCP-004 completion, smaller existing-surface enhancements, and new concepts |
| Lifecycle proof | Before native graph MVP commitment | Owner coverage, replay/gap recovery, deletion propagation, ordering/idempotency, snapshot version, stale detection, and rebuild/rollback behavior |
| Performance and resource bounds | Before MVP approval | Representative node/edge distributions, peak memory/CPU, full and incremental build time, query latency, cache behavior, and failure recovery |
| Accessibility and large-graph UX | Before visual graph approval | Keyboard and assistive-technology flow, list equivalent, zoom/reflow, focus, reduced motion, large/empty/stale/error states, provenance comprehension |
| Maintenance and operational ownership | Before production commitment | Named owner, upgrade/dependency policy, support posture, observability, incident rollback, and cost estimate |
| POC cleanup proof | Before marking research complete | Verified absence of temporary clone, environment, fixture, output, process, hook, and tracked artifact |

## Revised Recommendations

1. **Retain the current no-go for adopting Graphify's raw runtime, HTTP MCP server, generated viewer, installers/hooks, fork, or copied implementation in AI Brain production.** That conclusion is supported by architecture, path/data exposure, identity/authorization, lifecycle, accessibility, dependency, and maintenance evidence; do not rest it solely on the POC.
2. **Reclassify the note as a draft source synthesis until FCP-004 reconciliation is complete.** It remains useful and should not be discarded.
3. **Keep concepts as non-exclusive research inputs.** Do not grant concept reuse or a native projection a preferred disposition until the council compares them with no-feature and simpler existing-surface options.
4. **Do not run another POC merely to create activity.** Run a representative memory-domain/custom-input POC only if the council keeps a sidecar or adapter mode alive, or if the note insists on rejecting that mode based on empirical behavior.
5. **Use the existing FCP-004 package as the baseline option.** Determine whether Graphify research changes any edge type, provenance rule, lifecycle control, UX requirement, or exclusion. If it changes nothing material, record that result and avoid a duplicate candidate.
6. **Treat every unknown as nonpassing for implementation selection, but not as a reason to invent evidence during research.** Assign validation only after a candidate survives deduplication and value screening.

## Go / No-Go Recommendation

| Decision | Recommendation | Conditions |
|---|---|---|
| Freeze research note v1 as canonical | **NO-GO** | P1-1 through P1-3 must be resolved; P2 evidence/cleanup issues must be either resolved or explicitly carried as nonpassing unknowns. |
| Use v1 as a draft evidence inventory | **GO** | Label it draft and prevent its positive dispositions from being treated as shortlist decisions. |
| Adopt raw Graphify runtime/MCP/viewer in production | **NO-GO on current evidence** | Requires a new, mode-specific architecture/security/privacy/accessibility/operations case; the present evidence does not justify it. |
| Copy or fork Graphify implementation | **NO-GO on current evidence** | Maintenance, divergence, dependency, security, and lifecycle burden are not justified. |
| Consider concepts during council ideation | **CONDITIONAL GO** | Reconcile FCP-004, neutralize preselection, include no-feature/smaller options, and preserve evidence/provenance without copying code. |
| Commit to a native derived graph MVP | **NO-GO until gates pass** | Requires user-value evidence, owner/lifecycle contract, rebuild/rollback, deletion and privacy behavior, representative performance, accessible fallback, and named ownership. |

## Plan Revision Inputs

### Required deletions or rewrites

- Rewrite “the POC validates direct-integration mismatch” to the narrower domain/default-behavior conclusion in P1-2.
- Remove “Proceed to council consideration” and “best technical fit” from the canonical evidence disposition, or clearly mark them as unranked hypotheses outside the research verdict.
- Remove the implication that the five concept families are the preferred or complete solution space.
- Do not describe repository activity, scan severity, optional licenses, or model egress without scope and date.

### Required additions

- FCP-004 decision/product/technical/UX/current-state reconciliation table.
- Integration-mode matrix with evidence and independent disposition for each mode.
- Claim-level immutable source links, verification dates, evidence class, and confidence.
- Security/license/dependency disposition table separating default, optional, dev-only, contextual, false-positive, reachable, and blocking findings.
- Explicit POC cleanup verification.
- Validation-coverage matrix for performance, accessibility, maintenance, security, privacy, lifecycle, observability, and user value.
- Clear production-fit criteria and candidate no-go gates.

### Acceptance criteria for research note v2

- All three P1 findings are closed with evidence, not merely acknowledged.
- Every prior FCP-004 commitment is classified and no duplicate candidate remains unexplained.
- POC claims match tested scope; no untested integration mode is rejected on POC evidence alone.
- Research evidence and council selection are visibly separated.
- High-impact upstream claims have exact, immutable citations and time-sensitive claims have verification dates.
- Default/optional/dev dependency and license scopes are unambiguous.
- POC cleanup is verified.
- Unknowns remain explicitly nonpassing for implementation selection.

### Validation changes

- Do not require a second POC if the council excludes sidecar/adapter modes on explicit architectural and scope grounds.
- If sidecar/adapter remains viable, test synthetic AI Brain-shaped records, exact data flows, representative scale, deletion/rebuild behavior, and bounded resource use.
- For native candidates, validate against current AI Brain owner tables and the incomplete semantic-event lifecycle rather than assuming a finished event bus.
- Add accessibility and simpler-alternative comparison before approving any visual graph candidate.
- Make functional CI, security scanning, dependency audit, license review, and privacy review separate gates; one cannot substitute for another.

### No-go gates

- Any material FCP-004 conflict remains unclassified.
- Candidate value remains Unknown at implementation-selection time.
- An unavailable future input is required for the candidate's core value.
- Owner-data authority, deletion propagation, stale detection, rebuild, or rollback is undefined.
- Raw paths/artifacts, model-provider egress, or inferred sensitive relationships can cross a boundary without explicit consent and policy.
- HTTP/MCP mode lacks mandatory identity, tenant/role authorization, audit, path constraints, and resource quotas.
- Visual output lacks a usable accessible equivalent.
- License obligations or dependency reachability remain ambiguous for the selected deployment mode.
- Temporary POC artifacts are not demonstrably removed.

## Residual Risks

- Even after correction, Graphify's fast-moving 0.x surface and open consolidation work can stale the research; revalidate only if an implementation mode involving Graphify itself returns to scope.
- A native implementation avoids Graphify runtime risk but not graph-product risk: stale or inferred relationships can mislead users, expose sensitive associations, and create unexplained authority unless provenance and owner-data rules are enforced.
- The strongest remaining uncertainty is user value. Technical feasibility and conceptual attractiveness are insufficient to establish that a graph improves retrieval, synthesis, or decision quality over simpler existing surfaces.
- Completing FCP-004 may still be the best option, but prior approval is not proof of current value. It must compete against no-feature and smaller improvements under the same evidence standard.

