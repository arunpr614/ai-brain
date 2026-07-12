# AI Brain Feature Audit v1 - Adversarial Review

**Created:** 2026-07-12 22:48:54 IST  
**Reviewer stance:** Independent, evidence-first, hostile to false confidence  
**Reviewed target:** `docs/feature-council/graphify-opportunity/audit/2026-07-12_ai-brain-feature-audit_v1.md`  
**Report path:** `docs/feature-council/graphify-opportunity/audit/AI_BRAIN_FEATURE_AUDIT_V1_ADVERSARIAL_REVIEW_2026-07-12_22-48-54_IST.md`

## Executive Verdict

**NO-GO as the Stage 1 gate for candidate ideation; conditionally acceptable as a strong code-oriented feature inventory after revision.**

The audit is unusually careful about distinguishing a relational/vector substrate from a generalized knowledge graph. Its baseline, inventory counts, protected-CI claims, central Wiki corrections, and negative graph-capability claims are reproducible. No P0 issue was found.

However, three P1 failures prevent approval as the council's authoritative ideation input:

1. it reduces a completed, reviewed, council-decided Relationship Graph v2 planning package to a generic “planned” capability and therefore does not tell the council what has already been decided;
2. it misses `item_semantic_events`, an implemented schema-and-producer primitive whose migration explicitly calls it a future graph-refresh integration contract;
3. it presents inferred product jobs and “highest-value” behavior as current user value despite having no fresh runtime, engagement analytics, or user-research evidence.

These gaps can cause duplicate ideation, incorrect graph-maintenance assumptions, and product prioritization based on code existence rather than demonstrated user value. A v2 must add a prior-decision/delta analysis, inventory the semantic-event contract with its partial coverage, and separate implemented capability from availability and validated user value.

## Evidence Inspected

- Target audit and all four sidecars under `docs/feature-council/graphify-opportunity/audit/`.
- `docs/feature-council/graphify-opportunity/SOURCE_INVENTORY.md`, `RISK_REGISTER.md`, and the Stage 1 goal brief.
- Current repository baseline `8c1341100b174fe4ca518e6a745c30b9078df21c`.
- App Router entrypoints, API routes, migrations through 025, feature flags, auth, retrieval/Related, note indexing, deployment configuration, and relevant tests.
- Graph planning sources: `docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md`, `...-UX-v2.md`, `...-Technical-v2.md`, `Feature-Council-Decision-Log.md`, and `Feature-Council-Project-Tracker.md`.
- Canonical GitHub Wiki clone at `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1`; independently confirmed 86 Markdown files and byte-for-byte equality with `docs/wiki/`.
- Git history for Recall manual sync, including feature commit `fdd7406`, PR #22 merge `4e917c7`, and rollout-fix merge `5b92e68`; `5b92e68` is an ancestor of the audited baseline.
- Protected Product CI run `29200243743` and Agent docs run `29200243741` at the exact baseline. Product CI logs report 894/894 tests passing across 95 suites.

## Findings

### P0 - Blockers

No P0 finding.

### P1 - High Risk

#### P1-01 - The audit omits the already-decided Relationship Graph v2 package

**Evidence**

- The audit classifies the graph as “Planned, not implemented” and cites only broad Wiki exploration in the traceability row (`2026-07-12_feature-to-code-traceability.md:47`). Its closing assessment proposes what a Graphify-inspired opportunity would need (`2026-07-12_ai-brain-feature-audit_v1.md:155`) without identifying the existing council decision.
- `docs/wiki/Feature-Council-Decision-Log.md:32-40` records FCP-004 Relationship Graph and Connection Map as **Proceed reduced scope**, priority P2.
- `docs/wiki/Feature-Council-Project-Tracker.md:43` says the v2 planning package is complete and the next action is a graph proof packet, not renewed candidate ideation.
- The v2 PRD already defines a derived projection, typed edges, provenance, accessible outline, filters, staleness, snapshot behavior, acceptance criteria, risks, and open questions. Its explicit edge taxonomy includes `tagged_with`, `in_collection`, `semantically_related`, `cites_anchor`, `supports_claim`, and `same_source_url` (`Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md:50-60`).
- The v2 technical plan already sets rebuild, privacy, rollout, rollback, performance, and test boundaries; the UX plan already specifies canvas/list/detail/filter modes plus empty, stale, weak, large-graph, and accessibility states.

**Why this is a problem**

“Planned” is factually true but decision-incomplete. It collapses a mature council record into the same category as an undeveloped idea. The audit therefore cannot serve its stated anti-duplication purpose: a candidate-generation stage could recreate the same scope, reopen decided questions, or contradict the approved derived-projection boundary.

**Failure scenario**

The council selects “relationship graph” as a new candidate, spends a cycle rediscovering edge taxonomy and UX states, then produces a proposal that conflicts with the prior P2 decision or ignores its proof-packet prerequisites.

**Required revision**

Add a “Prior council decisions and delta” section that:

- identifies FCP-004's decision, priority, package maturity, and next proof gate;
- compares its historical baseline with current main and lists which assumptions changed;
- treats Graphify research as a potential amendment, validation source, or alternative to FCP-004—not a blank-sheet candidate;
- states which prior decisions remain binding and which require council reopening.

#### P1-02 - A real graph-refresh primitive, `item_semantic_events`, is missing from the audit

**Evidence**

- Migration `src/db/migrations/023_source_aware_chunks.sql:59-76` creates `item_semantic_events` and explicitly calls it a “content-free integration contract for future graph refresh consumers.” It records item, semantic source kind, epoch/version, action (`indexed`/`purged`), and time.
- `src/lib/notes/semantic-events.ts:5-27` implements writes to the table.
- `src/lib/queue/note-index-worker.ts` invokes the producer, and `src/lib/queue/note-index-worker.test.ts:81-86` asserts an emitted `indexed` event.
- The event stream does not appear in the audit's executive list of closest graph capabilities (`2026-07-12_ai-brain-feature-audit_v1.md:12-20`), its Graphify-like comparison, the current-primitives table (`2026-07-12_existing-knowledge-relationship-capabilities.md:15-31`), or the relationship/provenance trace (`2026-07-12_feature-to-code-traceability.md:50-61`).
- Source search found only the manual-note index worker producing these events; it is not a complete all-source semantic invalidation bus, and no graph consumer exists.

**Why this is a problem**

This is precisely the kind of Graphify-adjacent primitive the audit was required to surface. Omitting it understates current architecture while also hiding a dangerous limitation: the contract looks general in schema but its producer coverage is partial.

**Failure scenario**

A future derived graph subscribes to `item_semantic_events` and assumes it observes all semantic changes. Manual-note changes refresh the graph, while original-content or AI-summary re-indexing does not, leaving silent stale edges and inconsistent explanations.

**Required revision**

Inventory it as **implemented schema + tested feature-flagged producer; no consumer; partial source coverage**. Add an event-coverage matrix for each `source_kind`, action, producer, deletion path, test, and intended consumer. The graph proof packet must prove complete invalidation semantics before treating this table as a reliable refresh feed.

#### P1-03 - The product-value conclusion is not supported by the evidence class collected

**Evidence**

- The executive says AI Brain “currently solves” a coherent workflow (`2026-07-12_ai-brain-feature-audit_v1.md:10`) and labels a table “User problems currently addressed” (`:38-51`).
- The closing assessment declares “The highest-value behavior already present” (`:155`).
- The audit also correctly states that it did not exercise browser, clients, providers, Recall, host, database, or deployed production (`:149`) and that the product has no general analytics (`:51`).
- Notes, Processing, and Recall manual control are default-off or readiness/host gated in `.env.example:83-106,128-134`. Current runtime is explicitly unknown for multiple capabilities.
- No user interviews, usage metrics, support evidence, task-success study, or current host behavior is cited.

**Why this is a problem**

Source inspection can establish intended jobs and implemented affordances. It cannot establish that users currently obtain those outcomes or that one behavior has the highest value. The wording turns a defensible product hypothesis into an evidence claim and can bias candidate ranking against unmet needs.

**Failure scenario**

The council rejects a candidate as duplicative because code contains a nominally similar path, even though that path is disabled, unused, unreliable in the live environment, or fails the user's actual job.

**Required revision**

- Rename the section to “Intended jobs inferred from current product surfaces.”
- Separate **code-supported job**, **runtime availability**, **observed adoption**, and **validated outcome**.
- Replace “highest-value” with a clearly labeled hypothesis unless user/runtime evidence is added.
- Carry R001 into ideation as a mandatory discovery gate: no candidate advances on novelty or code inference alone.

### P2 - Meaningful Gaps

#### P2-01 - The status model still collapses code completeness and effective reachability

**Evidence**

- “Implemented” is defined as a reachable product/operator capability while also disclaiming live enablement (`2026-07-12_ai-brain-feature-audit_v1.md:28`).
- The same inventory labels hosted deployment, private clients, Related, and host-dependent Recall as implemented while separately stating current runtime unknown or distribution not established (`:77-79,96,128-129`).
- Feature flags and readiness are sometimes embedded in status labels and sometimes relegated to the limitations column.

**Why this is a problem**

One label is being asked to represent source completeness, default configuration, route/UI exposure, dependency readiness, deployment, and live health. The caveats are present but not mechanically comparable, so a council summary can easily strip them away.

**Failure scenario**

A candidate depends on note-derived semantics or Processing state because the substrate is “implemented,” but the selected environment has flags off, readiness absent, or no host unit.

**Required revision**

Replace the compound status cell with explicit axes for every capability:

1. implementation completeness;
2. product entrypoint and default/config gate;
3. external dependency/readiness state;
4. deployed/enabled evidence and verification date;
5. confidence in each axis.

#### P2-02 - Accurate counts are not backed by a coverage-closure ledger

**Evidence**

- The stated counts—24 pages, 43 API routes, 27 migrations, and 139 source test files—are accurate.
- The audit correctly calls counts inventory aids (`2026-07-12_ai-brain-feature-audit_v1.md:24,151`).
- The traceability sidecar contains 38 feature rows, but there is no closure appendix mapping every page/route/migration to a capability, exclusion, or unresolved item.
- Protecting evidence often names a test family rather than the acceptance criteria, negative paths, or coverage dimensions it proves.
- The missed semantic-event table demonstrates that full-file inspection and accurate counts did not ensure conceptual coverage.

**Why this is a problem**

Reviewers cannot distinguish “inspected and classified” from “counted and sampled,” nor identify unclassified surfaces. The artifact therefore lacks a reproducible completion criterion.

**Required revision**

Add a machine-checkable closure appendix: each page, API route, migration, worker/unit, and externally reachable client maps to a capability ID or an explicit exclusion. For each capability, map acceptance behavior and critical negative paths to exact tests rather than only listing filenames.

#### P2-03 - Security limitations omit the browser unlock brute-force boundary

**Evidence**

- The audit records a four-character minimum PIN and no roles, but does not record the lack of a discovered unlock-attempt limiter (`2026-07-12_feature-to-code-traceability.md:11`).
- The maintained Wiki states “four-character minimum PIN, no discovered unlock-attempt limiter” (`docs/wiki/Authentication-Sessions-and-Device-Pairing.md:21`).
- `src/app/auth-actions.ts:64-80` calls `verifyPin` and returns an error without a throttle, lockout, durable attempt record, or challenge. The bearer limiter in `src/proxy.ts:121-134` is a different control and does not protect browser PIN submission.

**Why this is a problem**

A relationship view can concentrate and expose sensitive titles, affinities, notes, and inferred connections. Candidate ideation needs the actual access-control boundary, especially if hosted deployment is considered implemented.

**Required revision**

Add the missing auth limitation and distinguish browser-session unlock controls from bearer API limits. Any graph candidate that expands sensitive summary surfaces must include access-control, redaction, private-note eligibility, deletion, and non-leaking empty/error-state acceptance criteria.

#### P2-04 - Git-history evidence is internally inconsistent even though the central correction is valid

**Evidence**

- The source inventory says “AI Brain Git history … Pending targeted review” (`SOURCE_INVENTORY.md:9`).
- The audit method says relevant Git history was inspected (`2026-07-12_ai-brain-feature-audit_v1.md:24`), and the Wiki discrepancy report relies on exact history for W-01 (`2026-07-12_wiki-versus-code-discrepancy-report.md:26-30`).
- Independent verification confirms the core W-01 conclusion: `fdd7406` is present, PR #22 merged, rollout fix `5b92e68` is an ancestor of the audited baseline.

**Why this is a problem**

The correction is supported, but the evidence manifest contradicts the completed artifact. A later reviewer cannot tell whether the history pass was completed after the manifest froze or whether other history-dependent claims remain unchecked.

**Required revision**

Update the source inventory to “verified” with the exact history questions, commits, and date, or narrow the audit's method claim. Add a claim-to-history evidence list for every conclusion that depends on chronology or merge state.

#### P2-05 - The audit does not convert graph-input risks into an eligibility and lifecycle contract

**Evidence**

- The audit identifies note consent, source kinds, weak captures, topic-confidence limits, provider egress, and artifacts outside DB backup.
- The risk register correctly flags misleading inferred relationships and sensitive relationship exposure.
- The audit does not provide a graph-input eligibility table covering source fidelity, private-note consent, provider policy, delete/purge, epoch/version invalidation, or derived snapshot rebuildability.
- The prior FCP-004 package already treats the graph as a derived projection with staleness and rebuild requirements.

**Why this is a problem**

For candidate ideation, listing raw primitives is insufficient. The safe set of graph inputs is narrower than the set of stored data. Without a lifecycle contract, a proposal can persist relationships after consent revocation, deletion, repair, or embedding-model change.

**Required revision**

Add a graph-input eligibility matrix with: source family, minimum fidelity, privacy/consent gate, provider boundary, provenance fields, change event, deletion/purge behavior, rebuild source of truth, and failure visibility. Treat all inferred graph data as derived and rebuildable unless a later council decision explicitly changes that boundary.

### P3 - Polish / Evidence Hygiene

#### P3-01 - The local-test conclusion is sound, but its causal wording is not reproducible

**Evidence**

- The exact-baseline clean-install Product CI is authoritative and passed 894/894 tests. `@js-temporal/polyfill` is declared in `package.json` and the lockfile.
- The local run loaded 872 tests, passed 868, and failed four imports. This is correctly not presented as a product assertion failure.
- The wording that the nested worktree “resolved a stale shared parent `node_modules`” (`2026-07-12_ai-brain-feature-audit_v1.md:148`) is a specific root-cause claim without retained environment/path evidence in the audit package.

**Why this is a problem**

The distinction between a dirty/shared install, absent install, and module-resolution behavior matters if someone tries to reproduce the local result. The current evidence proves a local dependency-resolution limitation, not necessarily the exact stale-parent mechanism.

**Required revision**

Retain the CI-based conclusion, but state only the observed fact unless the environment evidence is recorded: “the local nested worktree could not resolve a declared dependency; the exact-SHA locked clean install passed.” Never use 868/872 as behavioral coverage or combine it numerically with CI.

## What the Original Work Gets Wrong

1. It treats “planned graph” as the complete historical state when the council has already completed and reviewed a reduced-scope v2 package.
2. It claims comprehensive Graphify-adjacent primitive coverage while omitting the one migration explicitly designed as a future graph-refresh contract.
3. It promotes intended jobs and PM hypotheses to current/highest user value without the evidence needed to support those claims.
4. It relies on prose caveats to separate implementation, enablement, deployment, and live health instead of representing those as independent fields.
5. It demonstrates inventory breadth but not traceability closure or acceptance-criteria coverage.

The work is **not** wrong about the following material points:

- AI Brain does not currently implement a generalized knowledge graph.
- Related is transient vector similarity, not a persisted or explained graph edge.
- Tags/topics/collections, chunks/citations, provenance, and workflow data are useful but limited graph substrate.
- The Wiki and repository copies match at their stated baselines.
- W-01 through W-04 are substantially supported; W-05 is an appropriate runtime-evidence guard.
- Exact-baseline protected CI passed; the local import failure should not be promoted to a current product failure.

## Missing Validation

- A baseline-to-baseline delta between the historical FCP-004 package and current main.
- A council-decision register identifying binding, superseded, and reopenable graph decisions.
- A complete producer/consumer/delete-path test matrix for `item_semantic_events`.
- A route/page/migration/client coverage-closure ledger.
- Fresh runtime evidence for flags, provider/index readiness, clients, Recall units, host deployment, and actual database state—or explicit “not required for this gate” acceptance language.
- User evidence for problem severity, adoption, failure frequency, and value; source affordances alone are insufficient.
- Graph-input eligibility and derived-data lifecycle tests, including consent revocation, deletion, repair, embedding-version changes, partial event failure, rebuild, and stale-snapshot visibility.
- Security acceptance for browser unlock throttling and for relationship views that may aggregate sensitive data.
- Accessible UX proof using the list/outline fallback, keyboard navigation, non-color edge semantics, stale/weak/no-relationship states, and large-graph degradation.
- Observability acceptance for refresh lag, dropped/partial events, rebuild failures, stale snapshots, and unexplained-edge rates without logging sensitive graph content.

## Revised Recommendations

1. Revise the audit to v2 before using it as the council's candidate-generation authority.
2. Preserve the strong feature inventory and Wiki discrepancy work; do not redo the repository-wide count pass.
3. Add a “Prior decisions and delta” section led by FCP-004, with explicit proof-packet prerequisites and any changes introduced by Graphify research.
4. Add `item_semantic_events` to the primitive, traceability, architecture, and risk views with an explicit warning that current producer coverage is partial.
5. Replace the single status label with implementation, gate/readiness, deployment, runtime-verification, and confidence axes.
6. Reframe user-problem/value statements as hypotheses unless supported by user/runtime evidence.
7. Add route/data/test closure and graph-input lifecycle matrices as v2 appendices.
8. Preserve the current no-generalized-graph conclusion and the rule that graph data is a derived, rebuildable projection.

## Go / No-Go

**Decision: NO-GO for Stage 1 sign-off and downstream candidate ideation in its current form.**

The audit may be used immediately as a provisional technical inventory, provided readers carry the caveat that it is incomplete on prior council decisions, semantic refresh substrate, and validated user value. It should not be used to decide whether “relationship graph” is a new candidate, rank Graphify-inspired opportunities, or approve a graph data contract until P1-01 through P1-03 are corrected.

**Approval threshold for v2:** all P1 findings closed with cited evidence; P2-01, P2-02, and P2-05 closed; remaining P2/P3 items either closed or explicitly accepted by the council with owner and rationale.

## Plan Revision Inputs

### Deletions / wording removals

- Remove or qualify “currently solves” and “highest-value” unless user/runtime evidence is cited.
- Remove the unqualified implication that graph work is merely generic Wiki exploration.
- Remove the unsupported “stale shared parent `node_modules`” causal assertion unless its environment evidence is retained.

### Additions

- Prior FCP-004 decision, full v2 package summary, current-main delta, and next proof gate.
- `item_semantic_events` schema, producer, test, consumer absence, and source-kind coverage.
- Multi-axis capability status matrix.
- Graph-input eligibility/deletion/rebuild matrix.
- Page/route/migration/client coverage-closure appendix.
- User-evidence column distinguishing intended job from observed outcome.
- Browser unlock-rate-limit limitation and sensitive-relationship UX/security constraints.
- Updated source-inventory history status with exact commit evidence.

### Acceptance criteria

- Every current capability has implementation, reachability/gate, runtime, confidence, evidence, test behavior, and known-limit fields.
- Every page, API route, migration, worker/unit, and client entrypoint is mapped or explicitly excluded.
- Every prior graph decision is classified as binding, changed, superseded, or open, with evidence.
- Every semantic source kind has a documented change/invalidation/delete path; gaps are marked rather than inferred away.
- Product-value statements identify whether evidence is source inference, runtime observation, analytics, or direct user research.
- No sensitive or consent-revoked content survives a tested graph rebuild or snapshot refresh.

### Required validation

- Re-run only targeted tests needed for new claims; retain exact-baseline protected CI as the full-suite authority.
- Add or cite tests for semantic-event emission on all claimed sources/actions and explicitly test missing coverage.
- Validate graph lifecycle failure modes with synthetic, non-sensitive fixtures.
- Conduct a decision-delta review against FCP-004 before generating or ranking candidates.
- If live availability is material to selection, perform a separately authorized read-only runtime verification and timestamp every observation.

### No-go conditions

- FCP-004 remains absent or is treated as an undeveloped idea.
- `item_semantic_events` is described as a complete invalidation bus without producer-coverage proof.
- Implemented code is used as evidence of enabled/live/adopted behavior.
- “Highest value” or similar prioritization language remains unsupported.
- A graph candidate can persist private, weak-fidelity, deleted, or invalidated relationships without an explicit lifecycle contract.

## Residual Risks

- Even after v2, the repository cannot establish whether users need or trust graph interactions; discovery evidence remains necessary.
- Graphify may demonstrate technically useful patterns without proving product fit for AI Brain's single-owner, privacy-sensitive memory workflow.
- Similarity and generated taxonomy can create persuasive but misleading relationships unless explanation and correction are first-class.
- SQLite and same-process workers may be adequate initially, but refresh backlogs, snapshot staleness, and rebuild contention require proof at realistic library scale.
- A complete event contract does not guarantee complete historical data; initial rebuild and migration behavior remain separate risks.
- Fresh runtime verification would improve availability confidence but would not substitute for user-value or accessibility evidence.
