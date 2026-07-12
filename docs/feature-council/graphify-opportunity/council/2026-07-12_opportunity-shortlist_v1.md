# Graphify Opportunity Shortlist v1

**Status:** v1 — unranked options awaiting adversarial review  
**Created:** 2026-07-12  
**AI Brain evidence baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Graphify evidence baseline:** `eec7a0183847cbdc8a87d92b233759a5204b89fe` / `v0.9.13`  
**Classification:** Explored / Proposed — not implemented

## Purpose and selection boundary

This shortlist defines four meaningfully different product options for independent council evaluation. It does not rank them, approve implementation, or treat Graphify as necessary. The options come from audited AI Brain gaps and prior FCP-004 planning, with Graphify used only as a research reference.

The council must compare every option with **B-00 No new feature / defer**. User-problem frequency, adoption, task improvement, and durable value are currently Unknown. Those Unknowns are non-passing at final selection.

## Controlling evidence

- [AI Brain audit v2](../audit/2026-07-12_ai-brain-feature-audit_v2.md) and [QA/evidence review](../reviews/2026-07-12_ai-brain-audit-v2-qa-evidence-review.md)
- [Graphify research note v2](../research/2026-07-12_graphify-research-note_v2.md)
- [AI Brain versus Graphify comparison](../research/2026-07-12_ai-brain-versus-graphify-capability-comparison.md)
- [Semantic event and graph-input lifecycle matrix](../audit/2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md)
- Historical FCP-004 [PRD v2](../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md), [UX v2](../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2.md), and [technical v2](../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2.md)

## Shared constraints

These apply to every option:

- AI Brain owner records remain source of truth. No graph-only fact may become authoritative.
- Raw Graphify runtime, HTTP MCP, generated viewer, installer/hook, fork, or copied implementation is out of scope.
- A Graphify offline sidecar/custom adapter is not selected or disproven; reopening it needs a candidate-specific case and representative proof.
- Current `item_semantic_events` is not a complete invalidation bus. A stored projection needs a complete watermark/reconciliation design.
- Future source anchors and accepted-evidence records cannot be required for current MVP value.
- Model-generated or similarity-derived relationships are suggestions, not facts, and require evidence, version, correction, deletion, and sensitive-topic rules.
- Any visual interaction requires an equal nonvisual, keyboard, screen-reader, mobile, zoom/reflow, and reduced-motion path.
- Runtime state and user-value evidence are Unknown unless separately demonstrated.

## Baseline B-00 — No new feature / defer

**Concept:** Keep current Related, search/Ask, tags, topics, collections, citations, and FCP-004 planning unchanged while gathering user-problem evidence.

**Why it is a real option:** Current code already offers several ways to re-find and organize retained material. No observed analytics, interviews, task studies, or adoption evidence shows that connection inspection is frequent enough to justify a new product surface.

**Current workaround:** Related list, scoped Ask, topic/tag/collection pages, item provenance, citations, and manual organization.

**Cost and risk:** Lowest engineering/privacy/maintenance cost; opportunity cost if users truly struggle to understand relationships.

**Evidence required to leave defer:** Repeated user tasks or observed failures that a named option solves materially better than current behavior; a measurable baseline; acceptable trust/privacy/exit conditions.

This baseline is not counted among the four product opportunities but must appear in every council comparison.

---

## O-01 — Explain Related

### Feature concept

Add a compact “Why related?” explanation to the existing Related list and item detail. For one source/result pair, show the eligible signals that contributed to similarity—such as shared semantic themes, matched source kinds, common manual tags/collections, and the index/version used—without creating a persistent graph or new map.

### User problem

Related currently returns a ranked list with a numeric/internal similarity calculation but no user-facing reason. A user cannot judge whether a result is useful, stale, coincidental, or influenced by a private manual note.

### Target users

Users who already inspect Related while reviewing a saved item, especially users with multi-topic items or consented private notes.

### Current workaround

Open both items, compare titles/summaries/tags manually, or ask a scoped question. This is slow and still does not expose retrieval/index provenance.

### Proposed value

Increase trust and actionability in an existing surface with a narrow, reversible change. It may also reveal whether connection explanations are used enough to justify broader graph work.

### Example user journeys

1. User opens Related, selects “Why related?” and sees that two items share a current semantic theme plus one manual collection.
2. User sees that a match includes note-derived context, understands the consent boundary, and can exclude that source from the explanation.
3. User marks an explanation unhelpful; the feedback is recorded as product evidence, not automatically used to rewrite owner data.

### Relationship to current AI Brain features

This is a direct enhancement to F27 Related and reuses existing item, chunk/source-kind, vector, tag, and collection evidence. It does not add path traversal, communities, graph storage, or a graph route.

### Graphify capability used or adapted

Concept only: relation/provenance/confidence vocabulary and explainable neighborhoods. Graphify's `explain` output is not integrated; AI Brain would need its own pair-specific explanation contract.

### Direct integration versus native implementation

Native only. Existing TypeScript/SQLite/vector logic already owns the relevant data. Graphify adds no justified runtime value.

### Required data

- Current Related inputs and matched chunks/source kinds.
- Stable item IDs, current index generation, similarity score/threshold.
- Optional manual tag and collection intersections, clearly separated from model/similarity signals.
- Optional user feedback event that contains no raw private content.

### Privacy implications

Explanations can reveal note-derived or sensitive shared themes. They must remain owner-scoped, avoid raw note/body excerpts by default, honor note consent immediately, and exclude titles/themes from diagnostics.

### Technical feasibility

Medium. The Related pipeline exists, but it currently averages chunk vectors into item centroids. A trustworthy explanation cannot simply invent a rationale from the centroid; it needs traceable matched source/chunk contributions and deterministic wording.

### Differentiation

Improves trust in an existing retrieval action rather than adding visual exploration. It is the narrowest option and a potential value probe before any persisted graph.

### Expected adoption

Unknown. Hypothesis: a minority of Related users open explanations when a match is surprising or important. There is no current Related usage baseline.

### Success metrics

- Related explanation open rate among Related sessions.
- Percentage of opened explanations followed by opening the related item.
- Sampled explanation correctness and provenance completeness.
- Unhelpful/dismiss rate and note-source exclusion rate.
- No increase in consent violations, stale explanations, or private diagnostic leakage.

### MVP scope

- Explanation for one source/result pair in the existing list.
- Deterministic evidence classes and source/version display.
- Accessible text-first panel.
- Privacy-safe feedback and feature flag.

### Non-goals

Graph canvas, persisted edges, path finding, communities, automatic taxonomy edits, model-written causal stories, export, or multi-user sharing.

### Risks

- A centroid match may not support a simple faithful explanation.
- Users may interpret “related” as factual agreement or causality.
- Explanations may concentrate sensitive associations.
- Instrumentation could collect private context if poorly designed.

### Unknowns

Problem frequency; acceptable precision; best evidence granularity; whether explanations improve task success; latency/resource impact; sensitive-theme policy.

### Estimated implementation complexity

**Medium** relative to current AI Brain: existing surface and retrieval path, but new evidence accounting, privacy rules, tests, and UX states.

### Recommendation confidence

**Low.** Appropriate for council comparison; not implementation-ready. User value and faithful explanation quality are unproven.

### FCP-004 relationship

Narrow amendment or predecessor. It tests the “inspect why” job without completing the FCP-004 map/projection.

---

## O-02 — Relationship Inspector (complete or amend FCP-004)

### Feature concept

Reconsider the existing reduced-scope FCP-004 package: a derived, rebuildable relationship projection over current owner data with a text/list inspector first and an optional visual map only after proof. Users could browse items, tags, collections, source relationships, and carefully governed semantic similarities across a library.

### User problem

Users can inspect one item, one grouping, or one query result at a time but cannot survey the larger organization of their retained knowledge or inspect relationship provenance across many items.

### Target users

Users with a sufficiently large, diverse library who perform synthesis, curation, or orientation tasks across many saved sources.

### Current workaround

Open separate tag/topic/collection pages, scan Related per item, run multiple scoped searches/Ask queries, or maintain an external map.

### Proposed value

Provide a coherent inspection surface for broader sense-making while preserving owner records as truth and making relationship origin/staleness visible.

### Example user journeys

1. User opens a text-first relationship outline filtered to manual tags and collections, then opens an item.
2. User includes semantic similarity, sees its algorithm/version and weak status, and hides it.
3. User sees a stale projection after source/index change and requests a cancellable rebuild.
4. After accessibility and scale proof, a user optionally switches to a visual map with the same information and actions.

### Relationship to current AI Brain features

Aggregates F21–F27 owner joins and query-time similarity into a new cross-library inspection surface. It is not currently implemented. FCP-004 already planned much of this scope.

### Graphify capability used or adapted

Concept references: typed relationships, provenance, filters, bounded views, communities only if later justified. No Graphify viewer, runtime, IDs, storage, or algorithms are assumed.

### Direct integration versus native implementation

Native derived TypeScript/SQLite projection if selected. Raw Graphify modes remain no-go. A sidecar/custom adapter has no current case.

### Required data

- Current item/tag/collection owner tables and normalized source URL policy.
- Current eligible vectors for optional semantic relationships.
- Snapshot version/watermark, source references, origin class, algorithm version, timestamps, and stale state.
- Future anchors/evidence excluded from MVP until owner records exist.

### Privacy implications

A map concentrates titles, people, projects, affinities, and inferred sensitive associations. It needs owner scope, unlock/access review, on-screen privacy behavior, consent-aware derived data, no raw-content diagnostics, and deletion/rebuild guarantees.

### Technical feasibility

Medium-to-high. Deterministic owner joins are feasible. A trustworthy persisted similarity projection is not ready because refresh coverage, durable deletion reconciliation, scale budgets, and complete event/watermark behavior are unproven.

### Differentiation

The only option that addresses whole-library spatial/structural survey. It is also the broadest, costliest, and most visually novelty-prone.

### Expected adoption

Unknown. Hypothesis: periodic use by users with larger libraries, not a daily default. No corpus-size distribution or map-task frequency evidence is available.

### Success metrics

- Successful completion of a predefined cross-library orientation task versus current surfaces.
- Percentage of inspector sessions leading to a useful item/group action.
- Relationship provenance comprehension and sampled precision.
- Rebuild time/failure/stale duration/deletion lag on representative libraries.
- Text/list versus visual usage and accessibility task parity.
- Retention only as a secondary outcome after task value is established.

### MVP scope

- Text/list relationship inspector over manual tags, collections, and a narrowly defined source relation.
- Optional semantic similarities only after precision/lifecycle proof.
- Provenance detail, filters, stale state, rebuild/disable/delete controls.
- Feature flag and representative scale/accessibility proof before any canvas.

### Non-goals

Neo4j/export, graph as truth, manual edge editing, collaborative graph, automatic taxonomy mutation, anchors/evidence before their owner features, large-scale analytics, Graphify runtime/viewer.

### Risks

- Large cost before user value is demonstrated.
- Decorative graph novelty may not improve a task.
- Stale/inferred edges can mislead.
- Dense graphs fail accessibility, mobile usability, and performance.
- Incomplete deletion/event coverage can retain sensitive associations.

### Unknowns

Problem frequency; target library scale; useful relation types; semantic precision; map versus list value; rebuild budgets; deletion/tombstone design; ownership and maintenance cost.

### Estimated implementation complexity

**High.** New projection/lifecycle/observability layer, new product route and accessible interactions, scale proof, and significant trust/privacy work.

### Recommendation confidence

**Low.** It must compete as the prior planned option, not receive preference from prior approval. Current value and lifecycle gates do not pass.

### FCP-004 relationship

Direct continuation/amendment. Selection would explicitly reaffirm a narrowed FCP-004; non-selection would defer or reject that historical plan.

---

## O-03 — Evidence Path Between Two Items

### Feature concept

Let a user choose two saved items and inspect a bounded, text-first path of supported relationships between them—for example common manual collection, shared manual tag, normalized source relationship, or a separately labeled semantic hop. Each step shows its origin and limitations.

### User problem

When two ideas seem connected, users cannot ask “how are these connected?” and inspect a reproducible chain. Search and Ask can produce answers, but they do not expose a bounded relationship path with step-level provenance.

### Target users

Users synthesizing research, revisiting project context, or comparing two retained sources.

### Current workaround

Use scoped Ask over selected items, manually inspect their tags/collections/citations, or traverse Related lists by hand.

### Proposed value

Turn a vague connection question into a inspectable sequence rather than a model-written narrative. A path may help synthesis if every hop is understandable and reversible.

### Example user journeys

1. User selects two Library items and requests a path.
2. AI Brain returns no supported path and suggests current search/Ask instead of inventing one.
3. User sees two alternative paths, excludes semantic hops, and opens a supporting item.
4. User reports a misleading semantic hop without changing manual owner data.

### Relationship to current AI Brain features

Builds on selected-item actions, manual organization joins, Related, and item navigation. Scoped Ask already supports selected sources, so the path must demonstrate value beyond a cited natural-language answer.

### Graphify capability used or adapted

Concept only: bounded path inspection. Graphify's unweighted undirected shortest path is not appropriate as-is; AI Brain would need direction/origin/trust-aware rules and a no-path outcome.

### Direct integration versus native implementation

Native. Graphify path behavior is source-code-domain specific and ignores edge confidence in route choice.

### Required data

- User-selected endpoint item IDs.
- Deterministic current joins and source relation.
- Optional current semantic candidates with version/threshold/evidence.
- A bounded path policy, hop cap, relation allowlist, and alternative/no-path behavior.

### Privacy implications

Paths can reveal associations more sensitive than individual items. They must remain owner-scoped, exclude ineligible note-derived edges immediately, avoid telemetry of titles/path content, and support sensitive-relation suppression.

### Technical feasibility

Medium-to-high. A deterministic small graph can be constructed on demand, but useful path semantics, ranking, cycles, hubs, misleading shortcuts, and performance require proof. Persisted projection is not necessarily required for a first experiment.

### Differentiation

Goal-directed pair comparison rather than whole-library browsing or single Related explanation. It may be useful even without a visual graph.

### Expected adoption

Unknown. Hypothesis: occasional high-intent use during synthesis. There is no observed “connect these two items” task baseline.

### Success metrics

- Path request completion and no-path rate.
- Percentage of paths rated understandable/useful.
- Supporting item opens or follow-up synthesis actions.
- Sampled hop precision/provenance completeness.
- Comparison with selected-item Ask task time and confidence.
- Sensitive-hop suppression and deletion-lag correctness.

### MVP scope

- Two selected item endpoints.
- Two or three deterministic relation classes first.
- Text/list path, alternative/no-path state, per-hop provenance.
- Strict hop/result bounds and feature flag.
- Semantic hops excluded until precision and lifecycle proof passes.

### Non-goals

Whole-library canvas, communities, unlimited traversal, confidence-free shortest path, causal claims, automatic relationship persistence, Graphify runtime, export.

### Risks

- Shortest path may be mathematically valid but meaningless.
- High-degree tags/collections create trivial shortcuts.
- Users may infer causality or endorsement.
- Existing selected-item Ask may already satisfy the job more naturally.

### Unknowns

Problem frequency; path semantics; acceptable relation/hop policy; improvement over Ask; whether a no-path result is useful; scale and latency.

### Estimated implementation complexity

**Medium-to-high.** On-demand derivation may avoid snapshots, but path-quality policy, trust UX, bounds, accessibility, and tests are substantial.

### Recommendation confidence

**Low.** It is a distinct high-intent hypothesis; necessity and advantage over selected-item Ask are unproven.

### FCP-004 relationship

Narrow functional slice/amendment. It can be evaluated without reaffirming a general map.

---

## O-04 — Knowledge Organization Review

### Feature concept

Add a nonvisual review queue that identifies organization conditions users may want to inspect: duplicate or near-duplicate tags/topics, unused manual collections, highly broad labels, isolated items, and model-generated memberships with weak/currently generic evidence. The user decides whether to rename, merge, detach, keep, or ignore.

### User problem

AI Brain accumulates manual and model-generated organization, but users lack one place to assess its quality. Current topics mirror auto-tag labels with null confidence and generic evidence, while tags and collections are flat. Over time, noisy organization can reduce trust and make browsing harder.

### Target users

Users with growing libraries who actively curate tags, topics, collections, and capture quality.

### Current workaround

Open settings and grouping pages individually, notice issues opportunistically, and manually rename/merge/delete tags or collections.

### Proposed value

Improve knowledge hygiene and trust through explicit reviewable suggestions. This solves a maintenance problem without requiring a relationship map or persistent semantic graph.

### Example user journeys

1. User opens Organization Review and sees two near-duplicate tags with affected-item counts.
2. User inspects a model-generated topic whose evidence is generic and chooses to keep or detach it.
3. User sees an isolated item and chooses a collection or dismisses the suggestion.
4. User undoes a merge/detach action or ignores that suggestion class.

### Relationship to current AI Brain features

Extends existing tag/topic/collection management and capture/attention review patterns. It could use deterministic counts and current metadata before adding any semantic relationship logic.

### Graphify capability used or adapted

At most concept inspiration from deduplication, hubs, isolates, and communities. No Graphify code or graph artifact is required. The option is valid even if Graphify did not exist.

### Direct integration versus native implementation

Native. Current owner repositories/actions already implement many user-approved mutations.

### Required data

- Tag/topic/collection owner tables and item joins.
- Manual versus auto origin, counts, timestamps, current generic evidence/confidence.
- Deterministic similarity/normalization rules for duplicate-label suggestions.
- Review decision/undo/ignore state, without raw-content telemetry.

### Privacy implications

Lower than a relationship map but not zero: label/item counts and inferred hygiene signals can expose sensitive categories. Suggestions must stay owner-private and diagnostics must avoid names/titles.

### Technical feasibility

Medium. Deterministic counts and normalized-label duplicates are feasible. “Isolated,” “broad,” or weak organization needs careful definitions and must not shame users or auto-mutate data.

### Differentiation

Focuses on correction and maintenance actions rather than exploration or connection explanation. It may create clearer durable value if organization noise is a frequent problem.

### Expected adoption

Unknown. Hypothesis: periodic maintenance by high-volume users. There is no current taxonomy-management frequency or quality baseline.

### Success metrics

- Review completion and useful-action rate by suggestion class.
- Undo and dismiss/ignore rates.
- Reduction in duplicate labels or orphaned groups without loss of manual intent.
- Time to find an item through organization pages before/after.
- Trust/usability study results for model-generated topic explanations.
- No automatic source-of-truth mutation.

### MVP scope

- Deterministic duplicate-label and unused-group checks.
- Text/list review queue with inspect, keep, rename/merge/detach, ignore, and undo where current actions safely support them.
- Clearly separate manual and model-generated organization.
- No semantic isolate/community suggestions until evidence demonstrates precision and value.

### Non-goals

Graph canvas, path finding, persistent semantic edges, automatic cleanup, hidden model-driven taxonomy changes, content upload, Graphify dependency.

### Risks

- “Noise” is subjective; suggestions could damage deliberate personal organization.
- Merge/detach operations can be destructive without robust preview/undo.
- Review queues can become chores with low repeat value.
- It may duplicate current tag settings or Processing/Needs Upgrade attention patterns.

### Unknowns

Frequency of organization pain; useful suggestion definitions; safe undo boundaries; whether current settings are sufficient; expected volume; trust impact.

### Estimated implementation complexity

**Medium.** Uses current data/actions but adds suggestion policy, review state, preview/undo, measurements, and accessibility requirements.

### Recommendation confidence

**Low.** It is less graph-dependent and potentially more actionable, but the problem and adoption remain unmeasured.

### FCP-004 relationship

Distinct alternative. It uses organization structure for maintenance rather than completing the relationship-map plan.

## Shortlist completeness and deduplication

| Option | Primary job | New surface | Stored graph required | FCP-004 disposition | Main disqualifier risk |
|---|---|---|---|---|---|
| B-00 | Continue current behavior / gather evidence | None | No | Defer/reject pending evidence | Missed real need |
| O-01 | Understand one Related result | Existing item/Related | No | Narrow predecessor/amendment | Unfaithful centroid explanation |
| O-02 | Survey relationships across a library | New inspector/list; optional later visual | Likely derived snapshot | Continue/amend prior plan | Novelty/cost without value |
| O-03 | Inspect a path between two selected items | Selected-item path flow | Not necessarily for MVP | Narrow functional slice | Meaningless or misleading paths |
| O-04 | Correct noisy organization | Review queue | No | Distinct alternative | Subjective/destructive chores |

O-01 is not O-03: the former explains a single already-ranked result; the latter searches for a bounded multi-hop connection between explicit endpoints. O-02 is broader than both and is the only whole-library structural survey. O-04 is a correction workflow, not connection exploration.

## Evidence required before final selection

Every option must be independently evaluated against the 17 council criteria and eight decision gates. At minimum:

- demonstrate the named problem and its frequency;
- compare task success with current Related/search/Ask/topic/tag/collection behavior;
- establish trustworthy provenance and correction/no-path behavior;
- prove owner/deletion/consent lifecycle for any derived relation;
- define privacy-safe measurement;
- validate accessible desktop/mobile interaction;
- estimate build and ongoing ownership cost;
- prove a reversible exit.

No option is implementation-ready in v1. `Unknown` remains non-passing.
