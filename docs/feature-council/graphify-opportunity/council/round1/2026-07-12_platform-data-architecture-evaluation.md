# Round 1 Platform, Data, and Architecture Evaluation

## 1. Blindness declaration

- **Evaluator perspective:** Platform, data, and architecture. Assigned file: `docs/feature-council/graphify-opportunity/council/round1/2026-07-12_platform-data-architecture-evaluation.md`.
- **Frozen packet hash:** `05048a7a000ede70034bd06e0de05c70d0216b076c1d86dc545b3027f4355512`.
- I used only the frozen packet/evidence listed in the manifest. I read no other Round 1 evaluation, conclusion, draft council matrix, assignment register, or non-manifest source.
- I did not inspect the other submission directory before filing this evaluation.
- I independently verified all 14 listed file hashes and reconstructed the combined hash from the manifest lines. All matched; no material packet change was observed.
- **Role conflict / expertise limits:** I am evaluating architecture, data lifecycle, feasibility, scale, dependency/runtime boundaries, operations, rollback, and extensibility. I am not a substitute for direct user research, assistive-technology testing, privacy counsel, security testing, or license counsel. The packet contains no representative production benchmark, current runtime-health probe, candidate implementation proof, or observed user-value data. Those absences remain `Unknown` and non-passing.

This is a blind, evidence-bounded evaluation. Scores express relative judgment only; evidence status and gate logic control the recommendation.

## 2. Perspective principles and conflicts

1. **Owner records stay authoritative.** Items, tags, collections, notes, chunks/vectors, and their eligibility/consent records are truth. A relationship, cue, path, or snapshot is derived and disposable; no graph-only fact may be required to restore owner state. ([A], [L], [T])
2. **Prefer the smallest native read path.** Existing TypeScript/SQLite surfaces are the default boundary. Query-time metadata or deterministic owner-table joins are preferred to a new projection; a projection is preferred to a second runtime only when measured scale requires it. Direct Graphify runtime, MCP, viewer, fork, copy, installer, or hook is not an acceptable current boundary. ([C], [R])
3. **Freshness is a contract, not a timestamp label.** `item_semantic_events` has no consumer, covers only manual-note production, lacks complete action tests, and loses deletion evidence through cascade. It cannot be described as a complete invalidation bus. Every included source therefore needs either a durable invalidation/outbox contract or a complete owner-watermark reconciliation contract. ([L])
4. **Deletion and consent withdrawal are first-class inputs.** A lagging consumer must still discover a deleted item or revoked note. Durable tombstones or complete reconciliation must live outside the rows that cascade with the item. ([L])
5. **Rebuildability must be demonstrable.** Rebuilding from owner records must reproduce the eligible projection for a declared schema/algorithm epoch; partial refresh, dropped events, stale snapshots, and rebuild failures must be visible without leaking private content. ([L], [R])
6. **Do not persist what can safely be recomputed.** C-01 cues and the read-only portion of C-02 should not introduce graph state. C-03 pair inspection should begin on demand if it ever passes its job gates. Persistence is justified only by measured latency/resource evidence and must remain disposable.
7. **Unknown is non-passing.** Source adjacency, technical plausibility, a historical plan, or an upstream capability is not implementation proof. ([U], [Q], [R])
8. **Operational ownership is part of feasibility.** A selected capability needs a named maintainer for policy, quality, incidents, rebuilds, dependencies, deprecation, and privacy-safe observability. ([R])

The main perspective conflict is that B-00 postpones potential user benefit, while C-01 and C-02 appear architecturally small. I do not convert that small apparent scope into a Pass because candidate-specific field mapping, representative performance, rollback, and outcome evidence are absent. C-03 has the greatest future expressiveness, but that is also the strongest risk of prematurely creating a generalized graph platform.

## 3. Current-stack and source-of-truth finding

- **Feasible and native now, subject to proof:** B-00 requires no application change. C-01's minimal source-kind/current-state badges could plausibly be computed in the existing retrieval path without persisted edges. C-02's read-only exact/normalized duplicate and unused-group cues could plausibly be computed from existing owner tables. These are feasibility hypotheses, not implementation authorization. ([S], [A], [L])
- **Not ready now:** a faithful contribution explanation, any organization mutation lacking preview/idempotency/recovery, a persisted relationship projection, graph paths with trustworthy semantics, and a whole-library inspector. ([S], [L], [R])
- **Prohibited current boundary:** Graphify as production runtime, HTTP MCP, generated viewer, long-lived fork, or copied implementation. It introduces a Python/JSON lifecycle and deployment surface that does not match AI Brain's Node/Next.js/SQLite owner model; the generated viewer and HTTP boundary also fail current product-fit criteria. Concept vocabulary may be re-expressed independently. ([C], [R], [D])
- **Available owner data:** item identity/source, manual and auto tag memberships, collection memberships, source-aware chunks/vectors, note consent/policy state, transient Related similarity, citations, and normalized URLs exist with material qualifications. Topics have null confidence and generic evidence; similarity is query-time, not a stored edge. Future source anchors and accepted claim evidence do not exist and must be excluded. ([A], [L])
- **Lifecycle proof missing:** complete producers/actions, durable delivery, replay, gap detection, retention, ordering, idempotency, source/algorithm epochs, item-deletion tombstones, complete watermarks, deterministic rebuild, stale detection, cancellation, and privacy-safe failure observability. ([L], [Q])

## 4. Required 17-criterion evaluation

### B-00 — Bounded Discovery / Defer

| # | Criterion | Score | Status | Evidence-backed rationale | Principal assumption | Minimum validation if not Pass |
|---:|---|---:|---|---|---|---|
| 1 | User value | 2 | Unknown | B-00 may prevent premature build cost, but it makes no current task better and the value of reducing uncertainty has not been observed. ([S]) | A decision-quality benefit is worth a bounded delay. | Complete the predeclared sessions/episode study and show that it changes a candidate decision or closes the family. |
| 2 | Problem frequency | 2 | Unknown | The packet establishes an evidence gap, not recurring retrieval, organization, or relationship pain. ([A], [S]) | The timebox will contain enough natural or representative episodes. | At least the shortlist's predeclared evidence volume, with recurrence/severity recorded without private content. |
| 3 | Alignment with AI Brain | 4 | Pass | It preserves the single-owner product and tests needs in existing retention/retrieval/organization workflows without adding platform state. ([S], [A]) | Research remains bounded to AI Brain jobs. | — |
| 4 | Improvement over existing capabilities | 2 | Not applicable | B-00 is a decision process, not a replacement for Related, Ask, search, or organization surfaces; opportunity cost is evaluated separately. ([U], [S]) | The rubric permits no-product-change treatment here. | — |
| 5 | Discoverability | 2 | Not applicable | No product surface is introduced. Participant recruitment is a research-operability issue, not feature discoverability. ([S]) | No covert production instrumentation is added. | — |
| 6 | User trust | 4 | Pass | The protocol calls for consented or fictional/redacted evidence, outcome classes rather than private content, and no production mutation. ([S]) | The eventual protocol preserves these safeguards. | — |
| 7 | Technical feasibility | 4 | Pass | It requires no route, schema, runtime, dependency, or deployment change. Recruitment is external to application feasibility. ([S]) | The owner can access enough participants/tasks. | — |
| 8 | Data readiness | 3 | Pass | It does not depend on incomplete graph inputs or future FCP records; it can collect publication-safe task outcomes against current behavior. ([S], [L]) | Consented sessions or suitable fixtures can be obtained. | — |
| 9 | Privacy and security | 3 | Pass | The stated boundary excludes private production content and production instrumentation. ([S]) | The research protocol is reviewed and followed. | — |
| 10 | Performance | 2 | Not applicable | No production workload or new user-facing runtime is created. ([S]) | Research tooling remains outside the product. | — |
| 11 | Accessibility | 2 | Not applicable | No product interaction is shipped. Study materials still need ordinary participant accommodation, but no candidate UI exists. ([S]) | Research can accommodate participants as needed. | — |
| 12 | Implementation cost | 4 | Pass | The packet bounds effort to about 3–5 working days plus a four-week evidence window and no implementation. ([S]) | Recruitment does not expand the timebox. | — |
| 13 | Maintenance cost | 4 | Pass | The program ends with a decision and leaves no runtime, schema, projection, queue, or dependency to operate. ([S]) | The stop rule is enforced. | — |
| 14 | Dependency risk | 4 | Pass | No Graphify or other production dependency is introduced. ([S], [R]) | Research uses existing approved tools. | — |
| 15 | Measurable success | 3 | Pass | The shortlist provides evidence-volume, baseline, meaningful-improvement, and exit/no-go thresholds. ([S]) | Thresholds are finalized before observation. | — |
| 16 | Reversibility | 4 | Pass | The timebox ends without application or owner-data state; the exit is a recorded council decision. ([S]) | No prototype or instrumentation is smuggled into scope. | — |
| 17 | Future extensibility | 2 | Not applicable | B-00 creates evidence, not a technical foundation. Its value is preserving option space rather than extending a platform. ([S]) | Findings remain comparable across candidates. | — |

### C-01 — Retrieval Evidence Upgrade

| # | Criterion | Score | Status | Evidence-backed rationale | Principal assumption | Minimum validation if not Pass |
|---:|---|---:|---|---|---|---|
| 1 | User value | 2 | Unknown | Trust cues might help on surprising Related/Ask results, but task improvement and useful follow-through are unobserved. ([S], [A]) | Users currently misinterpret or abandon results because cues are missing. | Comparative task evidence against source opening/citations and a label-only comparator. |
| 2 | Problem frequency | 1 | Unknown | Current adoption, index health, cue need, and frequency/severity are Unknown. ([A], [E]) | The problem occurs often enough among retrieval users. | Natural episodes or representative sessions meeting a predeclared recurrence threshold. |
| 3 | Alignment with AI Brain | 3 | Pass | It improves provenance/trust inside current Related and selected-item retrieval, retaining the item-centered architecture. ([S], [C]) | The scope stays in existing surfaces and does not become an edge platform. | — |
| 4 | Improvement over existing capabilities | 2 | Unknown | Current source opening, citations, selected Ask, and minimal source/current-state labels have not been compared. ([S]) | Compact cues add actionable information beyond present surfaces. | Blinded/comparable task test showing material improvement over all minimum-change comparators. |
| 5 | Discoverability | 2 | Unknown | Existing placement helps, but users have not demonstrated that they notice or understand origin/current-state cues. ([S]) | The Related/Ask moment is the right intervention point. | Prototype task measuring encounter, comprehension, and action without training. |
| 6 | User trust | 2 | Unknown | Basic provenance may be deterministic, but contribution-level explanation could become post-hoc rationalization; note-derived influence is sensitive. ([S], [L]) | Source kind/current-state can be labeled faithfully and explanations remain out of scope. | Field-to-label truth table, adversarial fixtures, consent-withdrawal test, and proof that any fuller account uses actual contributions. |
| 7 | Technical feasibility | 2 | Unknown | Existing source-aware metadata makes badges plausible, yet the packet has no candidate field map, stale-state contract, query plan, or protecting proof. ([A], [L], [S]) | Required cues can be computed on the existing retrieval response without new persistent state. | Native TypeScript/SQLite proof mapping every label to an owner/version record, including unavailable and stale behavior. |
| 8 | Data readiness | 2 | Unknown | Source kind and vector inputs exist, but current generation/state, complete origin coverage, eligibility, and lifecycle behavior are not proven for the disclosure. ([L], [E]) | Existing metadata is complete enough for the minimal cues. | Enumerate every retrieval input and prove owner, eligibility, version, invalidation, deletion, and missing-data behavior. |
| 9 | Privacy and security | 1 | Unknown | Note-derived influence can expose sensitive context; immediate withdrawal, owner scope, and telemetry minimization are unproven. ([A], [L], [S]) | The MVP can omit raw evidence and sensitive theme disclosure. | Threat fixtures covering auth, note opt-in/out, deletion, stale caches, empty/error states, and privacy-safe diagnostics. |
| 10 | Performance | 2 | Unknown | Avoiding persistence and graph traversal should bound cost, but no representative latency, query, payload, mobile, or cache evidence exists. ([S], [R]) | Metadata joins add negligible overhead to current retrieval. | Benchmark the exact response path on representative library/vector sizes against predeclared latency/resource budgets. |
| 11 | Accessibility | 2 | Unknown | Accessible text is specified, but no keyboard, screen-reader, zoom/reflow, reduced-motion, or mobile proof exists. ([S]) | Small badges/disclosures can use current accessible primitives. | Candidate prototype audit and equivalent task completion across required modes. |
| 12 | Implementation cost | 2 | Unknown | A 10–20 engineering-day range is low confidence and excludes unresolved lifecycle/privacy details. ([S]) | The scope stays at badges/disclosure, with no explanation engine or new storage. | Field map, test matrix, rollout plan, and refined estimate with named owners. |
| 13 | Maintenance cost | 2 | Unknown | Native/no-persistence design limits operations, but origin semantics, provider/index epochs, privacy rules, and stale-state behavior still need ownership. ([S], [R]) | Retrieval maintainers can own these contracts. | Named maintainer, policy/versioning responsibilities, observability, incident, and deprecation plan. |
| 14 | Dependency risk | 4 | Pass | The candidate explicitly uses a native current-stack change and no Graphify runtime or viewer. ([S], [R]) | The selected disclosure adds no new third-party package. | — |
| 15 | Measurable success | 2 | Unknown | Metrics are named, but baseline, threshold, sampling design, and result are absent. ([S]) | Confidence and interpretation can be measured without private telemetry. | Predeclare privacy-safe baseline, outcome, guardrail, decision threshold, then run the comparator. |
| 16 | Reversibility | 3 | Unknown | A feature flag and no persisted relationship are strong design properties, but route/UI rollback, cache cleanup, version rollback, and acceptance proof are absent. ([S], [R]) | The MVP introduces no durable derived records. | Demonstrate flag-off behavior, response compatibility, cache invalidation, rollback, and no residual note-derived disclosure. |
| 17 | Future extensibility | 3 | Pass | A bounded owner/version provenance contract can support future retrieval trust without committing to graph storage or traversal. ([S], [C]) | The contract remains retrieval-specific and avoids graph IDs. | — |

### C-02 — Organization Hygiene in Existing Surfaces

| # | Criterion | Score | Status | Evidence-backed rationale | Principal assumption | Minimum validation if not Pass |
|---:|---|---:|---|---|---|---|
| 1 | User value | 2 | Unknown | Deterministic cleanup cues are plausible, but no improvement in findability, time, errors, or confidence has been observed. ([S], [A]) | Organization noise causes material user cost. | Comparative cleanup task showing material improvement over current Settings and counts/sort/filter only. |
| 2 | Problem frequency | 1 | Unknown | Tags/topics/collections exist, but adoption, volume, and recurring maintenance pain are Unknown. ([A], [E]) | Larger-library curators encounter this often enough. | Natural-task evidence or sessions meeting a predeclared frequency/severity threshold. |
| 3 | Alignment with AI Brain | 3 | Pass | It operates on current owner organization records and existing Settings/attention surfaces rather than introducing graph truth. ([S], [A]) | The feature remains organization maintenance, not semantic graph analysis. | — |
| 4 | Improvement over existing capabilities | 2 | Unknown | Existing pages and the counts/sort/filter comparator have not been tested against the proposed cues/actions. ([S]) | Duplicate/unused cues add enough value beyond simple visibility. | Comparator test including current surfaces and counts/sort/filter only. |
| 5 | Discoverability | 2 | Unknown | Current Settings may be an appropriate maintenance moment, but placement and comprehension are untested. ([S]) | Users visit these surfaces when willing to curate. | Prototype task measuring encounter and correct use without a new queue. |
| 6 | User trust | 2 | Unknown | Exact/normalized rules can still conflate deliberate labels; preview, dismissal, idempotency, undo, and preservation of manual intent are unproven. ([S]) | Initial rules can be deterministic and conservative. | Adversarial label fixtures plus per-action preview/idempotency/recovery/manual-intent acceptance. |
| 7 | Technical feasibility | 2 | Unknown | Read-only counts/duplicate/unused cues are native-owner-table queries, but the candidate includes actions whose recovery contracts are not proven. ([S], [L]) | MVP actions can be limited to already-safe existing mutations. | Query/field proof for cues and an explicit transaction, concurrency, retry, idempotency, and undo contract for every action. |
| 8 | Data readiness | 2 | Unknown | Labels, origin, memberships, and timestamps exist, but normalization semantics and complete reversible mutation support are not established. Topics also have null confidence and generic evidence. ([A], [L]) | Read-only cues can avoid weak topic semantics and mutation history gaps. | Data profiling for collision/volume; source-of-truth mapping; action-specific lifecycle and recovery proof. |
| 9 | Privacy and security | 2 | Unknown | Labels and counts are sensitive in aggregate; diagnostics and action authorization/CSRF/concurrency behavior are not candidate-tested. ([S], [A]) | Existing owner-private Settings controls can be reused. | Threat fixtures covering auth, diagnostics, concurrent mutation, delete/merge targets, and no sensitive telemetry. |
| 10 | Performance | 2 | Unknown | Owner-table aggregation should be simpler than graph computation, but no query plans or representative tag/collection volumes are provided. ([S]) | Indexed joins/aggregates meet page budgets. | Benchmark exact queries and mutation transactions on representative skew, including high-membership labels and mobile payloads. |
| 11 | Accessibility | 2 | Unknown | Existing surfaces reduce novelty, but preview, keep/dismiss, errors, recovery, keyboard, screen-reader, zoom/reflow, and mobile behavior are untested. ([S]) | Current components can express the flow accessibly. | End-to-end candidate audit across required modes. |
| 12 | Implementation cost | 2 | Unknown | The 10–25 day range is low confidence; safe merge/delete/recovery can dominate the read-only UI work. ([S]) | Most MVP value comes from cues and proven existing actions. | Split estimate for read-only cues versus each mutation, with migration/test/rollout/recovery effort. |
| 13 | Maintenance cost | 2 | Unknown | Normalization and destructive-action policy create ongoing review/incident cost even without new runtime dependencies. ([S]) | Rules remain few, deterministic, and versioned. | Named data owner, rule-version policy, incident/recovery process, and privacy-safe quality metrics. |
| 14 | Dependency risk | 4 | Pass | The candidate is native TypeScript/SQLite and requires no Graphify code or new graph/rendering dependency. ([S], [R]) | Selected UI uses existing approved components. | — |
| 15 | Measurable success | 2 | Unknown | Task metrics and guardrails are named, but baselines, meaningful thresholds, and outcomes are absent. ([S]) | Useful-action and loss-of-intent measures are collectable without sensitive labels. | Predeclare privacy-safe measures/thresholds and run the comparator study. |
| 16 | Reversibility | 2 | Unknown | Read-only cues are easy to remove; mutation rollback is not proven, and durable user intent may be lost even if the UI is flagged off. ([S]) | The selected MVP can exclude any action lacking complete recovery. | Flag/rollback proof for cues and per-action transactional undo/recovery, including partial failure and concurrent edits. |
| 17 | Future extensibility | 3 | Pass | Versioned, deterministic organization-health queries on owner tables are a bounded foundation and do not commit to a generalized graph/platform. ([S], [A]) | Scope excludes semantic community/isolation judgments and new review state. | — |

### C-03 — FCP-004 Relationship Inspection Family

The following evaluates C-03 as the first-level family. V-03A, V-03B, and V-03C are conditional scopes, not peer candidates, and receive no independent scores because C-03 does not pass its applicable gates.

| # | Criterion | Score | Status | Evidence-backed rationale | Principal assumption | Minimum validation if not Pass |
|---:|---|---:|---|---|---|---|
| 1 | User value | 1 | Unknown | The historical plan and Graphify concepts do not demonstrate that relationship inspection improves an AI Brain task. ([P], [R], [S]) | Larger-library users need cross-item inspection beyond existing retrieval/grouping. | Recurring job evidence plus material improvement over C-01, selected Ask, Related, and grouping pages. |
| 2 | Problem frequency | 1 | Unknown | Frequency, severity, target cohort, and adoption are absent. ([A], [S]) | Occasional high-intent use is sufficient to justify the cost. | Predeclared natural-episode/task evidence for the family before variant selection. |
| 3 | Alignment with AI Brain | 2 | Unknown | Inspectable retained-memory relationships could fit, but the job is unproven and a generalized map could distract from item-centered retrieval/organization. ([A], [S], [P]) | Relationship inspection is a core retained-memory job rather than visual novelty. | Product-fit study demonstrating a distinct recurring job with bounded scope. |
| 4 | Improvement over existing capabilities | 1 | Unknown | No evidence shows advantage over Related, selected Ask, citations, tags/topics/collections, C-01, or text-only lists. ([S], [C]) | Multi-hop or broader structure conveys task-relevant information those surfaces cannot. | Comparative task test; C-03 fails if a smaller comparator performs equivalently. |
| 5 | Discoverability | 1 | Unknown | Sidebar/map, selected-item, pair, and text-first entry points imply different jobs; no variant or placement has passed. ([S], [X]) | A high-intent contextual entry can be found and understood. | Test the smallest job-aligned entry after the family passes; no graph route by default. |
| 6 | User trust | 1 | Unknown | Paths can privilege hubs or imply causality; similarity lacks stored derivation; note influence, stale state, no-path behavior, precision, and correction are unproven. ([C], [L], [R]) | An allowlisted evidence model can avoid false authority. | Precision/comprehension fixtures with origin, direction, version, no-path, hubs, correction, consent, deletion, and stale behavior. |
| 7 | Technical feasibility | 1 | Unknown | On-demand deterministic pair/path experiments are plausible, but no variant is selected; persisted projection lacks complete invalidation, tombstone, rebuild, scale, and rollback proof. ([L], [S], [T]) | A narrow native variant can meet the job without Graphify or generalized storage. | Candidate proof packet for exactly one variant, satisfying lifecycle, query semantics, performance, failure, and rollback criteria. |
| 8 | Data readiness | 1 | Unknown | Some deterministic owner inputs exist, but future anchors/evidence are absent, topics are weak, similarity is transient, and complete eligibility/version/lifecycle coverage is missing. ([L], [A]) | Items/tags/collections plus governed similarity are sufficient for a useful first job. | Exact node/edge allowlist; owner/eligibility/provenance/version map; exclusion of unavailable inputs; complete change/delete/rebuild proof. |
| 9 | Privacy and security | 1 | Unknown | Relationship views concentrate sensitive titles, projects, people, affinities, paths, and note-derived signals; authorization, redaction, diagnostics, and withdrawal are unproven. ([A], [L], [R]) | Single-owner controls can be strengthened enough for concentrated views. | Threat model and fixtures covering unlock/auth, owner scope, future tenancy, redaction, consent/deletion, errors, caches, and telemetry. |
| 10 | Performance | 1 | Unknown | Tiny Graphify fixtures are not representative, and native build/query/render, cache growth, rebuild, mobile, and failure behavior are untested. ([R]) | A narrow text-first query can meet product budgets; a projection might be needed only later. | Representative corpus benchmark with skew/density, predeclared build/query/resource budgets, cancellation, cache bounds, and degraded behavior. |
| 11 | Accessibility | 1 | Unknown | Historical list fallback is a requirement, not proof; no text-first value, canvas parity, AT, reflow, reduced-motion, or mobile test exists. Graphify's viewer is unusable as the product solution. ([X], [C], [R]) | A text-first interaction can fully complete the job. | Prove text-first task value and required-mode parity before any visual/map work. |
| 12 | Implementation cost | 1 | Unknown | Estimates span 15–35 days for pair/path and 30–60+ for an inspector, with unknown lifecycle, migration, scale, and accessibility work. ([S]) | Variant selection can remove most platform work. | Select one scope only after job proof; produce data-flow, migration, test, rollout, operations, and decommission estimate. |
| 13 | Maintenance cost | 1 | Unknown | Relationship quality policy, model/index epochs, rebuilds, privacy, incidents, rendering, and dependencies need named ownership; none is assigned. ([S], [R]) | A bounded on-demand deterministic variant has manageable ownership. | Named maintainer and SLO/runbook for quality, stale/deletion lag, rebuild, incidents, policy, dependency upgrades, and deprecation. |
| 14 | Dependency risk | 2 | Unknown | Native/no-Graphify is the stated boundary, but storage/rendering choice and exact dependency/SBOM are unselected for the family. ([S], [R]) | The smallest surviving variant needs no new dependency. | Exact dependency plan; prefer no new package; blocking license/SCA review for any selected storage/rendering package. |
| 15 | Measurable success | 1 | Unknown | Metrics are proposed, but no baseline, threshold result, sampled precision, stale/deletion SLO, or task outcome exists. ([S], [R]) | Privacy-safe structural/operational metrics can accompany task outcomes. | Predeclare and observe job outcome, comparator, precision, comprehension, stale/deletion, performance, and accessibility guardrails. |
| 16 | Reversibility | 1 | Unknown | Owner-data truth and route hiding are helpful, but snapshot deletion, queue cancellation, epoch rollback, diagnostics, and cleanup are not defined or tested. ([T], [R]) | All derived state can be deleted without foreign contracts. | Rebuild/rollback drill proving flag-off, cancellation, projection/cache deletion, prior-version compatibility, and owner-data safety. |
| 17 | Future extensibility | 1 | Unknown | A narrow evidence contract could be reusable, but a general node/edge/snapshot layer risks premature graph-platform commitment before a job or scale need is proven. ([S], [T]) | Variant-first design can avoid a generalized graph API/schema. | Architecture review after job proof showing the selected contract is minimal, replaceable, owner-derived, and free of Graphify IDs/foreign runtime contracts. |

## 5. Required eight-gate ledger

`Unknown` is non-passing. A gate marked Pass here is only passed for the candidate scope as written; it does not authorize implementation.

| Gate | B-00 | C-01 | C-02 | C-03 | Platform/data rationale |
|---|---|---|---|---|---|
| 1. Demonstrated user problem | Unknown | Unknown | Unknown | Unknown | The packet has hypotheses and code-adjacency, not observed recurring target problems. B-00 documents the evidence gap but not a product problem. ([A], [S]) |
| 2. Clear AI Brain product fit | Pass | Pass | Pass | Unknown | B-00 preserves scope; C-01/C-02 enhance existing item-centered surfaces. C-03 depends on an unproven distinct relationship-inspection job. ([S]) |
| 3. Meaningful advantage over current behavior | Unknown | Unknown | Unknown | Unknown | B-00's opportunity cost is unmeasured; all feature comparators remain untested. ([S]) |
| 4. Technically feasible MVP | Pass | Unknown | Unknown | Unknown | B-00 has no app change. C-01 lacks a cue field/lifecycle proof; C-02 lacks mutation/recovery proof; C-03 lacks selected scope and lifecycle/scale proof. ([L], [S]) |
| 5. Acceptable privacy and security posture | Pass | Unknown | Unknown | Unknown | B-00 has a bounded consented/redacted protocol. Candidate-specific disclosure, mutation, concentration, deletion, and diagnostic controls are unproven. ([A], [L], [S]) |
| 6. Acceptable licensing and dependency posture | Pass | Pass | Pass | Unknown | B-00 adds none; C-01/C-02 are explicitly native/no-new-Graphify. C-03 has a native boundary but no exact rendering/storage dependency plan. ([R], [S]) |
| 7. Measurable outcome | Pass | Unknown | Unknown | Unknown | B-00 has a timebox and exit threshold. Feature candidates name metrics but lack baselines, thresholds, and observed outcomes. ([S]) |
| 8. Clear rollback or exit strategy | Pass | Unknown | Unknown | Unknown | B-00 ends cleanly. C-01 lacks a tested rollback; C-02 mutations may persist user-intent loss; C-03 lacks projection/cache/queue/version cleanup proof. ([S], [R], [T]) |

No option qualifies for `Go` under the common rule.

## 6. Per-option recommendation and confidence

| Option | Recommendation | Confidence | Rationale / disposition |
|---|---|---|---|
| B-00 | **Defer — execute the bounded discovery plan** | High on platform safety; Medium on evidence yield | It is the only currently bounded and fully reversible path, but Gate 1 and Gate 3 remain Unknown, so it cannot receive Go. Enforce the four-week stop rule and one-decision exit. |
| C-01 | **Defer** | Medium-high | It is the smallest plausible native feature and should be the first architecture proof if user evidence selects retrieval trust. Limit proof to deterministic cues in the current response; do not persist relationships or generate post-hoc explanations. |
| C-02 | **Defer** | Medium | Read-only cues are plausibly native and bounded. Any mutation remains outside selection until action-specific transaction, idempotency, preview, concurrency, and recovery proof exists. |
| C-03 | **No-go for current implementation; defer the family for possible re-entry** | High on current no-go; Low on eventual best variant | The family fails to pass its job, comparative, lifecycle, scale, privacy, accessibility, dependency, ownership, and rollback gates. Historical FCP-004 remains planning-only and should be marked deferred/amended rather than left as active implementation authority. |

## 7. Preferred option

**Preferred current decision: B-00, bounded discovery/defer.**

This preference is not architectural conservatism for its own sake. C-01 and the read-only subset of C-02 are likely expressible natively, but feasibility without observed need still does not justify implementation. B-00 has a concrete timebox, privacy boundary, exit threshold, no application state, no dependency, and no maintenance tail. It should explicitly compare current behavior, C-01's label/current-state minimum, C-02's counts/sort/filter minimum, and the C-03 relationship job. ([S])

If direct evidence selects a feature, the architecture order is:

1. **C-01 minimal query-time cues** if retrieval trust wins: current response metadata only, no stored edge, no generated rationale.
2. **C-02 read-only owner-table cues** if organization hygiene wins: no new queue/state; add mutations only one action at a time after recovery proof.
3. **C-03 conditional variant** only if the relationship-inspection family first passes its job and advantage gates; choose exactly one smallest sufficient variant.

## 8. Conditional C-03 architecture, not peer ranking

Because C-03 does not pass its first-level gates, none of its variants is a current candidate. The following states what evidence would change the architecture decision if the family later passes:

- **V-03A Pair explanation:** default first proof only when the user job is understanding one already-proposed relation and actual contributing signals can be reconstructed. Implement on demand in the current retrieval/item boundary; do not persist a graph. Missing evidence must produce unavailable/insufficient state, not a narrative. Note influence must disappear immediately on withdrawal.
- **V-03B Selected-item evidence path:** consider only if a path task materially beats selected-item Ask and pair explanation. Begin with an allowlist of deterministic owner-table relations and bounded text output. Define direction, weighting, hub suppression, cycle/duplicate behavior, maximum depth, alternative/no-path behavior, and non-causal language before performance work.
- **V-03C Whole-library inspector:** consider only after text-first whole-library value is demonstrated and persistence is justified by measured cost. Require an epoch-versioned disposable projection with complete owner watermark or durable outbox, non-cascading deletion reconciliation, stale marker, idempotent rebuild, cancellation, bounded cache, privacy-safe metrics, and rollback/deletion drill before any canvas or rendering dependency.

No evidence in the packet supports Graphify runtime adoption for any variant. A Graphify sidecar/custom adapter would require a materially new, decision-changing architecture case and separate proof; it is not a shortcut around the native lifecycle contract. ([R])

## 9. Strongest contrary case

The strongest contrary case is to advance a **strictly read-only C-02 proof** or **minimal C-01 cue proof** immediately because both appear to reuse existing SQLite owner data, current UI surfaces, and existing runtime boundaries, while B-00 leaves current friction in place. C-02 in particular could expose exact duplicate/unused counts without model inference, new dependencies, a graph projection, or destructive actions. C-01 could expose source kind/current-state without persisting edges.

That case is technically credible but not decision-complete. The packet still lacks evidence that either problem is frequent, that the minimum comparator changes outcomes, that the exact data is complete enough to label faithfully, and that representative performance/rollback/privacy behavior passes. A proof would also be a prototype or implementation action, which Round 1 does not authorize. The contrary case should therefore shape B-00's first comparator, not bypass the gates.

## 10. Major assumptions and risks

| Assumption or risk | Decision effect |
|---|---|
| Current source-aware metadata can distinguish source kind and index generation for C-01 without new durable state. | If false, C-01 cost and lifecycle risk rise; defer or reduce to a simpler label. |
| Exact/normalized organization rules can be conservative and query owner tables efficiently. | If false, C-02 should stay at counts/sort/filter or no-go. |
| Existing action paths can provide per-action preview/idempotency/undo. | If false, C-02 must remain read-only. |
| Single-owner auth remains the selected near-term boundary. | A multi-user plan materially changes schemas, authorization tests, caches, and operational isolation for every relationship view. |
| A candidate can avoid raw-content/title/URL/path telemetry. | If false, privacy and observability posture is unacceptable. |
| Complete owner reconciliation can recover deletions without relying on cascading semantic-event rows. | If false, no persisted C-03 projection is acceptable. |
| Rebuild can be deterministic across source/algorithm epochs. | If false, stale state and rollback cannot be trusted. |
| Representative corpora can be created without private production-data exposure. | If false, scale evidence remains Unknown and blocks C-03 persistence/canvas. |
| A named owner can absorb ongoing policy, quality, incident, and deprecation work. | If false, C-03 maintenance is unacceptable; C-01/C-02 scope must shrink. |
| Deferral will be enforced as a timebox rather than becoming indefinite. | If false, B-00 creates ongoing opportunity cost without evidence value. |

## 11. Minimum decision-changing validation

The following is the smallest evidence sequence that could change this recommendation. It is validation planning only, not authorization to execute.

1. **Common decision evidence:** predeclare tasks, current/minimum comparators, material-improvement thresholds, privacy safeguards, and stop rules; obtain the B-00 evidence volume for natural or representative episodes. Select at most one first-level feature job.
2. **C-01 if selected:** produce a field-level provenance/current-state map from owner records through the retrieval response; define missing/stale behavior; prove consent withdrawal/deletion and feature-flag rollback; benchmark the exact path at representative scale; compare labels/current-state only against present source opening/citations. Any fuller explanation requires actual contribution accounting.
3. **C-02 if selected:** profile label/membership volume and normalization collisions; benchmark read-only queries; compare counts/sort/filter only; for each proposed mutation separately prove transaction boundaries, authorization, preview, idempotency, retry, concurrency, undo/recovery, and preservation of manual intent. Exclude any action that fails.
4. **C-03 only after the family passes:** choose one variant. Specify exact node/relation allowlist and semantics using current owner data only. Exclude anchors/evidence until owner records exist. For any persisted state, prove a complete watermark or durable outbox, non-cascading deletion discovery, consent invalidation, source/algorithm epochs, deterministic rebuild/checksum, dropped-event reconciliation, stale and failure visibility, cancellation, cleanup, and owner-safe rollback.
5. **Scale/operations for the surviving option:** define representative item/chunk/tag/collection size and relationship density before measuring; set build/query/page/mobile resource budgets; test skew, partial failure, rebuild, and cache bounds; name the maintainer and publish privacy-safe SLOs/runbooks for stale rate, deletion lag, rebuild failure, fallback, and deprecation.
6. **Decision-changing outcomes:** advance only if all eight gates become Pass. Reject or continue current behavior when the problem is rare, a smaller comparator is equivalent, provenance cannot be faithful, deletion/consent cannot be timely, performance/accessibility budgets fail, or ownership remains unnamed.

The most decision-changing architecture evidence would be: (a) proof that C-01 cues are fully derivable query-time with no new durable contract; (b) proof that C-02's useful value is achieved read-only; or (c) a complete lifecycle/rebuild/scale proof showing that one C-03 job genuinely requires a persisted projection. Until then, persistence is an avoidable commitment.

## 12. Authorization boundary

**This Round 1 evaluation authorizes no production implementation, source or test edit, dependency installation, Graphify integration, prototype, migration, deployment, feature flag, rollout, merge, or publication claim.** Any later activity requires the council's subsequent gate-controlled authorization. The candidates remain explored/proposed; no relationship graph is implemented or live.

## Packet citations

- [M] — Round 1 frozen packet manifest
- [U] — Round 1 evaluation rubric
- [S] — Opportunity shortlist v2
- [A] — AI Brain feature audit v2
- [E] — Capability status/evidence ledger
- [Q] — Capability acceptance/test closure
- [L] — Semantic-event and graph-input lifecycle matrix
- [C] — AI Brain versus Graphify capability comparison
- [R] — Graphify research note v2
- [D] — Decision log
- [K] — Risk register
- [V] — Audit v2 QA/evidence review
- [P] — FCP-004 PRD v2
- [T] — FCP-004 technical v2
- [X] — FCP-004 UX v2

[M]: ../2026-07-12_round1-frozen-packet-manifest.md
[U]: ../2026-07-12_round1-evaluation-rubric.md
[S]: ../2026-07-12_opportunity-shortlist_v2.md
[A]: ../../audit/2026-07-12_ai-brain-feature-audit_v2.md
[E]: ../../audit/2026-07-12_capability-status-evidence-ledger.csv
[Q]: ../../audit/2026-07-12_capability-acceptance-test-closure.csv
[L]: ../../audit/2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md
[C]: ../../research/2026-07-12_ai-brain-versus-graphify-capability-comparison.md
[R]: ../../research/2026-07-12_graphify-research-note_v2.md
[D]: ../../DECISION_LOG.md
[K]: ../../RISK_REGISTER.md
[V]: ../../reviews/2026-07-12_ai-brain-audit-v2-qa-evidence-review.md
[P]: ../../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md
[T]: ../../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2.md
[X]: ../../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2.md
