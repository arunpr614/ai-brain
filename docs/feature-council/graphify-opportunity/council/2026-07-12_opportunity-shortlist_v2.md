# Graphify Opportunity Shortlist v2

**Status:** v2 — reviewed, evidence-neutral decision packet; not ranked or selected  
**Created:** 2026-07-12  
**Review addressed:** [Shortlist v1 adversarial review](GRAPHIFY_OPPORTUNITY_SHORTLIST_V1_ADVERSARIAL_REVIEW_2026-07-12_23-39-27_IST.md)  
**AI Brain baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Graphify baseline:** `eec7a0183847cbdc8a87d92b233759a5204b89fe` / `v0.9.13`  
**Classification:** Explored / Proposed — not implemented

## Decision structure

Round 1 evaluates four first-level decisions under the same rubric:

1. **B-00 Bounded discovery / defer** — make no product change; collect decision evidence under a timebox.
2. **C-01 Retrieval Evidence Upgrade** — improve trust cues in existing Related/selected-item retrieval without a new graph or route.
3. **C-02 Organization Hygiene in Existing Surfaces** — improve correction/maintenance inside current settings and attention surfaces.
4. **C-03 FCP-004 Relationship Inspection Family** — reaffirm, narrow, amend, defer, or reject the historical relationship-inspection job.

C-03 contains three **scope variants**, not three peer candidates: pair explanation, selected-item evidence path, and whole-library inspector. They may be compared only if C-03 first passes the demonstrated-job and comparative-advantage gates. This prevents vote-splitting and duplicate approval of FCP-004.

No option is implementation-ready. Runtime, problem frequency, adoption, task improvement, relationship precision, and ongoing value remain Unknown. Unknown is non-passing for a final go.

## Controlling evidence and common instrument

- [AI Brain audit v2](../audit/2026-07-12_ai-brain-feature-audit_v2.md) and [QA/evidence review](../reviews/2026-07-12_ai-brain-audit-v2-qa-evidence-review.md)
- [Graphify research note v2](../research/2026-07-12_graphify-research-note_v2.md)
- [AI Brain versus Graphify comparison](../research/2026-07-12_ai-brain-versus-graphify-capability-comparison.md)
- [Semantic event and graph-input lifecycle matrix](../audit/2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md)
- Historical FCP-004 [PRD v2](../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md), [UX v2](../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2.md), and [technical v2](../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2.md)
- [Round 1 evaluation rubric](2026-07-12_round1-evaluation-rubric.md), which defines all 17 criteria, scoring, evidence status, eight gates, and submission requirements

## Evidence vocabulary

- **Verified:** supported by current source/test/history at the recorded baseline.
- **Inferred:** reasonable conclusion from verified evidence, not observed demand/outcome.
- **Hypothesis:** proposition requiring user/task evidence.
- **Unknown:** insufficient evidence; non-passing at final selection.

## Shared constraints

- AI Brain owner records remain truth; no graph-only fact becomes authoritative.
- Graphify raw runtime, HTTP MCP, viewer, installer/hook, fork, copied implementation, and raw artifact remain no-go.
- Sidecar/custom-adapter modes are out of the current case, not universally disproven; reopening needs separate evidence.
- `item_semantic_events` is incomplete and has no consumer or durable item-deletion tombstone.
- Future anchors/evidence cannot be required for current value.
- Similarity/model relationships are suggestions with origin, version, limitation, correction, consent, deletion, and stale-state rules.
- Any visual task requires equal keyboard, screen-reader, zoom/reflow, reduced-motion, mobile, and nonvisual completion.
- Product measurement must not record raw titles, bodies, URLs, note text, relationship paths, or sensitive labels.

## Common cost basis

Ranges below are comparative planning estimates, not commitments. They assume one product/designer/engineer-equivalent lane, current test standards, feature flagging, privacy/accessibility work, and no production Graphify dependency. They exclude elapsed user-research recruitment time. Confidence is Low because no implementation plan has been authorized.

---

## B-00 — Bounded Discovery / Defer

### Feature concept

No product feature. Run a timeboxed, privacy-safe discovery program using current AI Brain behavior to determine whether retrieval trust, organization hygiene, or relationship inspection is a frequent and valuable job.

### Problem hypothesis

The council lacks evidence about which, if any, graph-adjacent problem occurs frequently enough to justify product investment. This is verified as an evidence gap, not proof that users have no problem.

### Candidate user hypothesis

Current or prospective users with growing libraries may encounter one or more target jobs, but their frequency and severity are Unknown.

### Current workaround

Use Related, scoped Ask, search, item provenance, tags/topics/collections, Settings, Processing, and Needs Upgrade as they exist today.

### Value hypothesis

A bounded discovery effort avoids premature build cost and creates comparable evidence. It has value only if it produces a decision by its exit date.

### Example user journeys

1. Participant completes representative find/compare/organize tasks with the current product while task time, confidence, errors, and workarounds are recorded without private content.
2. Participant keeps a four-week diary of naturally occurring “why related,” “connect these,” “survey my library,” or “clean organization” episodes.
3. Council compares observed problems and decides to advance one option, continue discovery once with a named gap, or reject/defer the family.

### Relationship to current AI Brain features

Uses current features as the baseline; makes no runtime or schema change.

### Graphify capability used or adapted

None. Graphify remains research context only.

### Direct integration versus native implementation

Neither; no implementation.

### Required data

Publication-safe task results, participant-reported episodes, current-surface task baselines, and option-changing observations. No production private-content analytics are required.

### Privacy implications

Use consented sessions or fictional/redacted fixtures; record outcomes and issue classes rather than private content. Do not introduce production instrumentation during this goal.

### Technical feasibility

High for the research activity; no application change. Recruitment/access remains an external uncertainty.

### Differentiation

Optimizes for learning and reversibility rather than shipping. It is the only option that does not assume any target job is worth solving.

### Expected adoption

Not applicable as a product feature. Discovery participation is Unknown.

### Success metrics and exit threshold

- Complete at least five comparable task sessions or record at least three natural episodes for a target job during a four-week window.
- Predeclare current-behavior baseline, task completion/confidence rubric, and minimum meaningful improvement before testing concepts.
- Exit to a candidate only if a target problem recurs and a candidate/minimum-change comparator shows a material task improvement without failing a gate.
- Exit to no-go/defer if evidence volume is insufficient after one timebox, the problem is rare, or current behavior performs equivalently.

### MVP scope

Four-week timebox; task protocol; privacy-safe notes; decision readout; no production code, dependency, or instrumentation.

### Non-goals

Prototype commitment, feature selection by interview preference alone, indefinite research, collection of private library contents, or weakening gates to force a decision.

### Risks

Recruitment may be limited; tasks may not represent natural behavior; deferral can hide opportunity cost; one personal-library workflow may not generalize.

### Unknowns

Participant access, sufficient task volume, natural problem frequency, and whether one timebox distinguishes options.

### Estimated implementation complexity and cost basis

**Low / no implementation.** About 3–5 product/research working days plus up to four weeks elapsed evidence collection. Ongoing maintenance: none after decision.

### Recommendation confidence

**Medium as the current default; Low on expected learning volume.** It is favored only because all feature value gates are currently Unknown, not because no need exists.

### FCP-004 disposition

**Defer** during the timebox; retain historical safety constraints; do not treat prior approval as active implementation authorization.

### Smallest viable alternative

Immediate no-go without discovery. It is insufficient only if the owner values reducing the current uncertainty enough to spend the bounded research effort.

### Candidate-specific no-go tests

- No open-ended discovery beyond the stated timebox without a new decision.
- No feature advance based only on stated preference, technical interest, or prior FCP approval.
- No private-content collection or production mutation.

---

## C-01 — Retrieval Evidence Upgrade

### Feature concept

Add minimal deterministic trust cues to existing Related and selected-item retrieval surfaces: source-kind/origin badges, current/stale index state, and a compact evidence disclosure. A full pair-explanation panel is a later extension only if the minimal cues prove insufficient and faithful contribution accounting exists.

### Problem hypothesis

Users may distrust or ignore surprising Related/Ask results because current surfaces do not expose enough origin/version context. Frequency and impact are Unknown.

### Candidate user hypothesis

Users who already use Related or selected-source Ask, especially with multi-topic items or consented manual-note indexing.

### Current workaround

Open both items, inspect tags/collections/summaries, review citations, or ask another scoped question.

### Value hypothesis

Small evidence cues may improve confidence and useful follow-through in an existing moment without a new graph, route, projection, or review queue.

### Example user journeys

1. User sees that a Related result uses current original-content vectors and opens it.
2. User sees note-derived influence, reviews its consent status, and can exclude that source.
3. User sees stale/insufficient evidence and chooses refresh or current Ask instead of receiving a fabricated rationale.

### Relationship to current AI Brain features

Direct enhancement to F27 Related and retrieval provenance. No persisted edge, traversal, community, or map.

### Graphify capability used or adapted

Concept vocabulary for origin/provenance only. No Graphify explain/query/runtime integration.

### Direct integration versus native implementation

Native current-stack change only.

### Required data

Current source kind, index generation/state, eligible vector provenance, similarity score/threshold, and optional deterministic manual tag/collection intersection. Full explanations require actual contributing evidence, not post-hoc centroid narratives.

### Privacy implications

Note-derived influence and sensitive shared themes need immediate consent withdrawal, owner scope, and privacy-safe telemetry. Raw evidence text is excluded by default.

### Technical feasibility

Medium. Basic badges are likely feasible from current metadata; faithful contribution-level explanation is not yet proven.

### Differentiation

Improves an existing retrieval action with the smallest product/runtime surface. It does not select FCP-004.

### Expected adoption

Unknown. Hypothesis: trust cues matter primarily on surprising/high-stakes results.

### Success metrics and exit threshold

- Baseline Related/selected-Ask task completion and confidence before concept exposure.
- Material improvement in correct evidence interpretation and useful result opens in a predefined task comparison.
- Zero provenance mislabeling, consent-withdrawal failures, or private telemetry leaks in acceptance fixtures.
- Do not advance to a full explanation if badges/current-state cues perform equivalently.

### MVP scope

Existing-surface badges and disclosure; stale/unknown state; accessible text; feature flag; no new route or persistent relationship.

### Non-goals

Graph map, path, communities, model-written rationale, automatic taxonomy change, Graphify dependency, or export.

### Risks

Cues may not solve a real problem; similarity provenance may be too technical; centroid results may resist faithful explanation; sensitive context can be exposed.

### Unknowns

Problem frequency, cue comprehension, matched-contribution availability, benefit over opening sources/citations, latency, and sensitive-theme policy.

### Estimated implementation complexity and cost basis

**Small-to-medium / Low confidence.** Discovery 2–4 days; prototype/usability 3–5 days; implementation/test/privacy/accessibility roughly 10–20 engineering days if selected; ongoing maintenance Low-to-medium. Owner roles: retrieval maintainer plus product/privacy review.

### Recommendation confidence

**Low.** Smallest plausible feature investment, but user value and explanation fidelity remain Unknown.

### FCP-004 disposition

**Defer** FCP-004. C-01 can be selected independently and does not reaffirm a relationship projection/map.

### Current-feature duplication and smallest viable alternative

Comparator: add only a source-kind label and current/stale indicator to existing Related/citations, or improve selected-item Ask source inspection. The fuller disclosure is insufficiently justified unless it materially beats this comparator.

### Candidate-specific no-go tests

- No full explanation unless derived from actual contributing evidence.
- No advance if current source opening/citations or the minimal label comparator performs equivalently.
- No note-derived influence after consent revocation; no private evidence in telemetry.
- No user-facing certainty/causality claim beyond verified origin and similarity semantics.

---

## C-02 — Organization Hygiene in Existing Surfaces

### Feature concept

Add deterministic organization-health cues and reversible actions inside existing tag/topic/collection Settings and attention surfaces. Start with exact/normalized duplicate labels and unused groups; do not create a new queue or semantic “isolation/community” system unless current-surface changes prove insufficient.

### Problem hypothesis

Growing manual/model-generated organization may become noisy and reduce trust or findability. Current topics mirror auto-tags with null confidence and generic evidence. Frequency and impact are Unknown.

### Candidate user hypothesis

Users who actively curate tags/topics/collections in larger libraries.

### Current workaround

Open grouping/settings pages individually and manually notice, rename, merge, detach, or delete labels/groups.

### Value hypothesis

Small deterministic cues within existing maintenance moments may improve organization quality without exposing a cross-library relationship map.

### Example user journeys

1. Settings flags exact/normalized duplicate tags and previews affected memberships.
2. User keeps both, renames/merges where a current reversible contract exists, or dismisses the cue.
3. Topic page labels current evidence/confidence limitations rather than implying independent concepts.

### Relationship to current AI Brain features

Enhances current tag/topic/collection management and potentially Needs Upgrade/Processing attention, while preserving manual intent.

### Graphify capability used or adapted

None required. Deduplication/isolate ideas are research seeds only; semantic/hub/community suggestions are excluded from initial scope.

### Direct integration versus native implementation

Native current-stack change only.

### Required data

Owner tables, origin, normalized label, membership count, timestamps, and current reversible mutation support. No content graph is required.

### Privacy implications

Counts/labels are sensitive in aggregate; stay owner-private and omit names from diagnostics. Never auto-mutate model or manual organization.

### Technical feasibility

Medium. Read-only deterministic cues are feasible; merge/detach/delete require preview, idempotency, recovery, and manual-intent proof per action.

### Differentiation

Correction/maintenance job rather than retrieval trust or relationship exploration.

### Expected adoption

Unknown. Hypothesis: periodic use by higher-volume curators.

### Success metrics and exit threshold

- Baseline time/error/confidence for a defined organization-cleanup task.
- Useful-action rate, keep/dismiss rate, undo/recovery rate, and loss-of-intent incidents.
- Material improvement over existing Settings with only counts/sorting/filters.
- No automatic mutation; zero unrecoverable manual-intent loss in acceptance fixtures.

### MVP scope

Existing-surface counts, exact/normalized duplicate cues, unused-group cue, preview, keep/dismiss, and only already-proven reversible actions.

### Non-goals

New review queue, graph/map/path, semantic isolate/broad/community judgment, automatic cleanup, Graphify code/dependency, or hidden taxonomy rewrite.

### Risks

The problem may be rare; even deterministic normalization can conflate deliberate labels; settings may become cluttered; destructive actions may lack complete undo.

### Unknowns

Problem frequency, safe duplicate rules, existing mutation reversibility, sufficient current-surface placement, volume, and maintenance value.

### Estimated implementation complexity and cost basis

**Small-to-medium / Low confidence.** Discovery 2–4 days; prototype 3–5 days; implementation/test/recovery roughly 10–25 engineering days if selected; ongoing maintenance Medium for policy/action safety. Owner roles: organization-data maintainer plus product/QA.

### Recommendation confidence

**Low.** It is less graph-shaped and actionable, but demand and safe mutation value remain Unknown.

### FCP-004 disposition

**Defer or reject as unrelated to this job.** C-02 neither reaffirms nor depends on FCP-004.

### Current-feature duplication and smallest viable alternative

Comparator: add counts/sort/filter only to current Settings without a review state or new actions. C-02 does not advance if that comparator solves the task equivalently.

### Candidate-specific no-go tests

- No action without preview, idempotency, recovery/undo, and preservation of explicit manual intent.
- No semantic “weak/broad/isolated” judgment in MVP.
- No new queue if improved current Settings/attention surfaces perform equivalently.
- No auto-mutation or sensitive label telemetry.

---

## C-03 — FCP-004 Relationship Inspection Family

### Feature concept

Explicitly decide whether the historical FCP-004 relationship-inspection job should be reaffirmed, narrowed, amended, deferred, or rejected. Only after the job passes should the council select one mutually exclusive scope variant.

### Problem hypothesis

Users with larger libraries may need to understand why items relate, how selected ideas connect, or how knowledge is structured beyond one grouping/query. Frequency, value, and preferred interaction are Unknown.

### Candidate user hypothesis

Users performing cross-source synthesis, orientation, or curation across larger/diverse libraries.

### Current workaround

Related per item, selected-item Ask, search, tags/topics/collections, citations, and external/manual maps.

### Value hypothesis

Inspectable, evidence-bearing relationships may improve cross-library sense-making if they outperform current and minimum-change retrieval/organization alternatives.

### Example user journeys

1. User inspects why a pair is related and sees actual origin/version/limitations.
2. User asks for a bounded path and receives a meaningful path or an honest no-path result.
3. User surveys a text-first relationship outline; only after task/accessibility/scale proof may an optional visual map be evaluated.

### Relationship to current AI Brain features

Would derive from current items/tags/collections/source normalization and optional governed similarity. Future anchors/accepted evidence are excluded. No generalized graph exists today.

### Graphify capability used or adapted

Concept-only reference for typed relationships, provenance, bounded path/neighborhood, and structural analysis. Graphify's unweighted path, viewer, runtime, IDs, and persistence are not adopted.

### Direct integration versus native implementation

Native TypeScript/SQLite derived behavior if selected. Raw Graphify modes remain no-go; no sidecar case exists.

### Required data

Current owner records, explicit origin/evidence/version/time, source quality, eligibility, correction, consent, complete watermark/reconciliation, durable deletion handling, stale state, rebuild/rollback, and representative scale evidence.

### Privacy implications

Highest of the options: concentrated titles, people/projects, inferred affinities, sensitive paths, and note-derived signals. Requires owner authorization, on-screen privacy, immediate consent/deletion response, no private telemetry, and sensitive-relation policy.

### Technical feasibility

Medium-to-low confidence. On-demand deterministic pair/path experiments may be feasible. A persisted whole-library projection is not ready because lifecycle, tombstone, scale, and user-value proof are absent.

### Differentiation

Only first-level option addressing relationship inspection as a product job. Nested variants differ in scope after the family passes; they are not separate votes.

### Expected adoption

Unknown. Hypothesis: occasional high-intent use, possibly concentrated among larger-library users.

### Success metrics and exit threshold

- Demonstrated recurring job and material task improvement over current Related/selected Ask/grouping pages and C-01.
- Relationship/path provenance comprehension and sampled precision meet predeclared thresholds.
- Consent revocation/deletion/stale/rebuild/accessibility/scale/rollback acceptance passes.
- Select the smallest variant that meets the demonstrated job; reject visual/map scope if text-first completion is equivalent.

### MVP scope

No scope is approved. If the family passes, choose exactly one variant below and create a new charter. Owner-data and text-first rules are mandatory.

### Non-goals

Neo4j/export, graph as truth, manual relationship source of truth, collaboration, automatic taxonomy mutation, future FCP inputs, large-scale analytics, raw Graphify modes.

### Risks

Visual novelty without durable value; misleading paths/semantic edges; incomplete deletion; dense inaccessible UI; high build/maintenance cost; duplicate of C-01/current Ask.

### Unknowns

All value/frequency/interaction questions; target scale; precision; relation policy; lifecycle design; accessibility parity; named maintainer and operating cost.

### Estimated implementation complexity and cost basis

**Medium-to-very-high / Low confidence.** Family discovery 5–10 days; variant prototype 5–10 days. Pair/path implementation may be roughly 15–35 engineering days; whole-library projection/inspector 30–60+ days, excluding unknown lifecycle migration/scale work. Ongoing maintenance Medium-to-high. Owner roles: product, retrieval/data, privacy/security, accessibility/UX, operations.

### Recommendation confidence

**Low.** Technically plausible concepts and prior planning do not close the demonstrated-job, value, lifecycle, or accessibility gates.

### Controlled FCP-004 disposition

**Amend/narrow pending evidence.** Retain derived owner truth, provenance, stale state, accessible parity, no export/Neo4j/source mutation, and proof-before-code. Remove future anchors/evidence from current MVP. Reopen whether any feature proceeds, interaction scope, edge types, algorithms, metrics, and scale. A final C-03 no-go must mark FCP-004 deferred or rejected rather than leaving two active plans.

### Current-feature duplication and smallest viable alternatives

Comparators: C-01 minimal retrieval cues, current selected-item Ask/compare, current group pages, and text-only filtered lists. C-03 cannot advance if one of these performs equivalently.

### Candidate-specific no-go tests

- No family advance while problem frequency or advantage is Unknown.
- No inferred/semantic relation without precision, origin/version, correction, consent, deletion, and stale rules.
- No persisted projection until watermark/tombstone/rebuild/rollback passes.
- No visual work before text-first task value and accessibility parity pass.
- No path scope if selected-item Ask performs equivalently or hubs/undirected shortcuts mislead.

### Nested scope variants — compare only after C-03 passes

| Variant | Job | Minimum implementation | Additional no-go condition | FCP-004 effect |
|---|---|---|---|---|
| V-03A Pair explanation | Understand one already-proposed relationship | Text evidence panel from actual contributing signals; no persisted graph | Cannot faithfully reconstruct contribution or immediately remove consented-note influence | Narrow FCP-004 to pair inspection; defer map/path |
| V-03B Selected-item evidence path | Inspect how two explicit items connect | Bounded text path over relation allowlist with no-path/alternative behavior | Current selected-item Ask is equivalent; paths favor meaningless hubs or imply causality | Narrow FCP-004 to path; defer map |
| V-03C Whole-library inspector | Survey broader organization/relationships | Derived text/list projection, stale/rebuild controls; optional visual only later | Text-first job not valuable; lifecycle/scale/accessibility proof absent | Reaffirm amended FCP-004 |

## Search-space balance and deduplication record

| Considered family | v2 treatment | Reason |
|---|---|---|
| Direct Graphify runtime/MCP/viewer/fork/copy | Rejected from candidate set | Research v2 independent architecture/security/lifecycle/accessibility/dependency no-go |
| Offline Graphify sidecar/custom adapter | Not a candidate | No surviving product job requires it; remains untested/out of scope |
| Related explanation | Minimum cues in C-01; full pair explanation nested V-03A | Separates current-surface trust upgrade from relationship-family investment |
| Path between ideas | Nested V-03B | Not an independent first-level job until relationship inspection passes |
| Full visual relationship map | Nested V-03C; visual deferred behind text-first proof | Existing FCP-004 scope; avoids graph-shaped vote splitting |
| Knowledge communities/bridges/hubs/map summary | Deferred within C-03 | No demonstrated problem; higher inference/scale/authority risk |
| Missing/weak connections | Excluded from MVPs | “Missing” semantic relation lacks trustworthy ground truth and can mislead |
| Agent/project context graph | Rejected as separate candidate | Existing scoped/selected Ask overlaps; private graph artifact risk; no user problem evidence |
| Organization cleanup queue | Narrowed into C-02 existing surfaces | Minimum-change comparator avoids a new chore/queue |
| Improve search/Ask/citations generally | C-01 comparator, not a broad candidate | Too broad; only evidence/provenance gap is adjacent to this council |

## Exact 17-criterion pre-evaluation matrix

This matrix records current evidence status before blind Round 1. Evaluators must score independently using the common rubric; they may disagree. `U` = Unknown/non-passing, `P` = Pass at shortlist stage, `F` = Fail, `N/A` = justified not applicable.

| Criterion | B-00 | C-01 | C-02 | C-03 | Evidence / decision threshold | Owner / next validation |
|---|---|---|---|---|---|---|
| User value | U | U | U | U | Demonstrate meaningful task/outcome improvement versus current behavior | Product/user-value evaluator; task study/diary |
| Problem frequency | U | U | U | U | Recurring natural episodes or equivalent task evidence under predeclared threshold | Product/user-value evaluator; bounded discovery |
| Alignment with AI Brain | P | P | P | U | B-00 preserves focus; C-01/C-02 use current surfaces; C-03 fit depends on job evidence | Memory/knowledge evaluator; compare product principles |
| Improvement over existing capabilities | N/A | U | U | U | Material improvement over minimum-change comparator | Product + UX evaluators; comparative task test |
| Discoverability | N/A | U | U | U | Users find/use at intended moment without training | UX evaluator; prototype task |
| User trust | P | U | U | U | Correct interpretation; no false authority/manual-intent loss | Memory/trust evaluator; comprehension/adversarial fixtures |
| Technical feasibility | P | U | U | U | Candidate-specific proof within current stack and boundaries | Platform/architecture evaluator; proof packet |
| Data readiness | P | U | P for read-only cues; U for mutations | U | Current owner data sufficient; no future inputs/incomplete bus assumed | Platform/data evaluator; field/lifecycle mapping |
| Privacy and security | P with research safeguards | U | U | U | Owner scope, consent/deletion, sensitive association, telemetry rules pass | Security/privacy evaluator; threat/fixture review |
| Performance | N/A | U | U | U | Candidate-specific representative latency/resource budget | Architecture evaluator; benchmark plan |
| Accessibility | N/A | U | U | U | Equal task completion across required modes | UX/accessibility evaluator; prototype audit |
| Implementation cost | P | U | U | U | Comparable range and opportunity cost accepted | Project manager/architecture; refined estimate |
| Maintenance cost | P | U | U | U | Named owner and bounded policy/operations burden | Project manager; ownership plan |
| Dependency risk | P | P if native/no new dependency | P if native/no new dependency | U until rendering/storage choice | No Graphify runtime; exact selected dependencies approved | Security/license evaluator; dependency plan |
| Measurable success | P for discovery exit | U | U | U | Baseline, leading metric, guardrail, decision threshold defined | Product/QA; measurement plan |
| Reversibility | P | U | U | U | Flag/rollback/data cleanup/owner safety demonstrated | Architecture/QA; rollback proof |
| Future extensibility | N/A | U | U | U | Bounded foundation without premature platform commitment | Architecture/product; option assessment |

No feature candidate currently passes all applicable criteria. The matrix is evidence accounting, not Round 1 consensus.

## Eight-gate pre-evaluation ledger

| Option | Gate | Current status | Evidence / threshold | Owner | Validation action | Decision date |
|---|---|---|---|---|---|---|
| B-00 | Demonstrated user problem | U | Discovery need verified; target product problem unproven | Product/user-value | Run bounded task/episode study | Round 4 |
| B-00 | Clear AI Brain product fit | P | No product mutation; evidence goal aligns with council | Council | Confirm timebox and privacy | Round 4 |
| B-00 | Advantage over current behavior | N/A | It preserves current behavior | Council | Evaluate opportunity cost | Round 4 |
| B-00 | Technically feasible MVP | P | No implementation | Project manager | Confirm research access | Round 4 |
| B-00 | Privacy/security acceptable | P | Publication-safe/consented research plan | Security/privacy | Approve protocol | Round 4 |
| B-00 | License/dependency acceptable | P | No dependency | License reviewer | Confirm no tooling change | Round 4 |
| B-00 | Measurable outcome | P | Timebox and exit threshold defined | Product/QA | Finalize protocol | Round 4 |
| B-00 | Rollback/exit | P | Ends at timebox; no runtime state | Project manager | Record decision | Round 4 |
| C-01 | Demonstrated user problem | U | No frequency/task evidence | Product/user-value | Compare current and minimal cues | Round 4 |
| C-01 | Clear AI Brain product fit | P | Existing retrieval trust surface | Memory/product | Validate user comprehension | Round 4 |
| C-01 | Advantage over current behavior | U | Minimal comparator untested | Product/UX | Comparative task test | Round 4 |
| C-01 | Technically feasible MVP | U | Metadata exists; contribution fidelity unproven | Architecture | Evidence-accounting proof | Round 4 |
| C-01 | Privacy/security acceptable | U | Note influence/telemetry policy unproven | Security/privacy | Consent/deletion/privacy fixtures | Round 4 |
| C-01 | License/dependency acceptable | P | Native/no new dependency hypothesis | License reviewer | Verify selected design | Round 4 |
| C-01 | Measurable outcome | U | Metrics named; baseline/threshold not observed | Product/QA | Predeclare and run task test | Round 4 |
| C-01 | Rollback/exit | U | Flag stated; cleanup proof absent | Architecture/QA | Rollback plan | Round 4 |
| C-02 | Demonstrated user problem | U | No frequency/task evidence | Product/user-value | Observe organization tasks | Round 4 |
| C-02 | Clear AI Brain product fit | P | Existing owner organization surfaces | Memory/product | Validate task and placement | Round 4 |
| C-02 | Advantage over current behavior | U | Counts/sort/filter comparator untested | Product/UX | Comparative task test | Round 4 |
| C-02 | Technically feasible MVP | U | Read-only cues plausible; action recovery unproven | Architecture/QA | Mutation-contract proof | Round 4 |
| C-02 | Privacy/security acceptable | U | Sensitive labels/action safety unproven | Security/privacy | Privacy and manual-intent fixtures | Round 4 |
| C-02 | License/dependency acceptable | P | Native/no new dependency hypothesis | License reviewer | Verify selected design | Round 4 |
| C-02 | Measurable outcome | U | Metrics named; baseline/threshold not observed | Product/QA | Predeclare and run task test | Round 4 |
| C-02 | Rollback/exit | U | Read-only cues reversible; mutations not proven | Architecture/QA | Preview/undo/recovery proof | Round 4 |
| C-03 | Demonstrated user problem | U | No frequency/task evidence | Product/user-value | Compare relationship job to current tasks | Round 4 |
| C-03 | Clear AI Brain product fit | U | Prior plan exists; value/fit unproven | Memory/product | Evaluate retained-memory job | Round 4 |
| C-03 | Advantage over current behavior | U | Related/Ask/group comparators untested | Product/UX | Comparative task test | Round 4 |
| C-03 | Technically feasible MVP | U | Incomplete lifecycle/tombstone/scale proof | Architecture | Candidate proof packet | Round 4 |
| C-03 | Privacy/security acceptable | U | Sensitive association and lifecycle policy unproven | Security/privacy | Threat and lifecycle fixtures | Round 4 |
| C-03 | License/dependency acceptable | U | Native boundary set; selected rendering/storage unknown | License reviewer | Exact dependency plan | Round 4 |
| C-03 | Measurable outcome | U | Metrics named; no baseline/threshold result | Product/QA | Predeclare and test variant | Round 4 |
| C-03 | Rollback/exit | U | Owner-data rule set; projection cleanup unproven | Architecture/QA | Rebuild/rollback/delete proof | Round 4 |

No feature candidate can receive Go from this pre-evaluation ledger. Blind Round 1 records independent judgments; Round 4 controls the final decision.

## Review finding resolution

| Finding | v2 resolution |
|---|---|
| P1 executable instrument absent | Linked and aligned exact 17-criterion rubric; added complete current-evidence and eight-gate ledgers. |
| P1 B-00 unfair | Promoted B-00 to identical full template with timebox, metrics, costs, owner roles, exit and no-go tests. |
| P1 relationship options not independent | Consolidated pair/path/map under C-03 nested variants; first-level options now represent independent jobs/decisions. |
| P1 unsupported problem/value framing | Renamed to explicit hypotheses; labeled Unknown; added evidence thresholds and validation actions. |
| P2 Graphify-shaped portfolio | Added search-space balance/dedup record; first-level C-01/C-02 are minimum-change current-surface options. |
| P2 simpler alternatives absent | Added smallest viable alternative/current-feature duplication to every option. |
| P2 option-specific safety gates absent | Added per-option no-go tests plus gate owners/actions. |
| P2 costs incomparable | Added shared estimate basis and discovery/prototype/build/maintenance ranges with Low confidence. |
| P3 FCP disposition inconsistent | Added one controlled FCP-004 disposition per option and an exact retained/reopened scope for C-03. |

## Freeze acceptance criteria

- B-00 and C-01–C-03 use the same required option schema.
- First-level options represent independent decisions; C-03 variants cannot be peer-ranked unless the family passes.
- All user/problem/value/adoption statements are hypotheses or Unknown unless supported.
- The 17 criteria and eight gates are explicit; applicable Unknown remains non-passing.
- Minimum-change comparators, FCP disposition, costs, owners, validation actions, and candidate no-go tests are present.
- The packet remains proposal-only and authorizes no code, dependency, prototype, deployment, or merge.
