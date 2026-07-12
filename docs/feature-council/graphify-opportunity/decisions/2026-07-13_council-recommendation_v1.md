# Council Recommendation v1

**Status:** v1 — awaiting Round 3 adversarial review  
**Decision:** **DEFER**  
**Date:** 2026-07-13  
**Frozen Round 1 packet:** `05048a7a000ede70034bd06e0de05c70d0216b076c1d86dc545b3027f4355512`  
**Classification:** Explored / Proposed — not implemented

## Executive recommendation

Do not select or design a Graphify-inspired production feature from the current evidence.

Use **B-00 Bounded Discovery / Defer** as the preferred next decision posture. It is not a feature Go: its demonstrated-user-problem gate is Unknown and its advantage over immediate no-go is disputed/Unknown. It is a timeboxed evidence plan with no application change.

Disposition of the feature options:

- **C-01 Retrieval Evidence Upgrade — Defer.** Strongest bounded feature hypothesis and first concept comparator, but problem frequency, comparative advantage, faithful provenance, privacy, accessibility, measurable outcome, and rollback remain non-passing.
- **C-02 Organization Hygiene — Defer.** Read-only counts/cues may be feasible, but demand and advantage are unproven; mutation/manual-intent/recovery risks are unresolved.
- **C-03 FCP-004 Relationship Inspection Family — No-go for current selection.** Do not select pair, path, or whole-library variants. Mark historical FCP-004 deferred/amended rather than active for build. Future reopening requires new family-level evidence.

No charter, PRD, UX package, prototype, technical implementation plan, production code, dependency, deployment, or merge is unlocked.

## Council evidence

Five independent blind evaluators used the same frozen 14-file packet and common rubric:

- all preferred B-00 as the bounded next action;
- all deferred C-01 and C-02;
- all rejected C-03 for current selection;
- none recommended Go for any feature;
- no feature passed all eight gates.

See [Round 2 comparative debate](../council/2026-07-13_round2-comparative-debate.md) for raw score aggregation, 17-criterion matrix, gate consensus, disagreements, minority cases, assumptions, and validation.

## Eight decision gates

| Gate | C-01 | C-02 | C-03 | Decision effect |
|---|---|---|---|---|
| Demonstrated user problem | Unknown | Unknown | Unknown | Blocks Go for every feature. |
| Clear AI Brain product fit | Pass | Pass | Unknown | Technical/product adjacency is insufficient. |
| Meaningful advantage over current behavior | Unknown | Unknown | Unknown | Minimum/current comparators untested. |
| Technically feasible MVP | Unknown | Unknown | Unknown | Plausibility is not a proof packet. |
| Acceptable privacy/security | Unknown | Unknown | Unknown | Candidate-specific controls/tests absent. |
| Acceptable licensing/dependencies | Pass while native/no-new-dependency | Pass while native/no-new-dependency | Unknown | Graphify production modes remain no-go. |
| Measurable outcome | Unknown | Unknown | Unknown | Baselines/threshold results absent. |
| Clear rollback/exit | Unknown | Unknown | Unknown | Cleanup/recovery proof absent. |

**Gate result:** zero feature candidates have eight Passes. Unknown is non-passing; therefore no feature can be selected.

## B-00 bounded discovery disposition

B-00 is recommended as a follow-on evidence action, not a selected product candidate.

### Purpose

Determine whether retrieval trust, organization hygiene, or relationship inspection is a recurring, consequential job and whether a minimum-change concept materially beats current behavior.

### Boundaries

- One four-week maximum and one forced decision readout.
- About 3–5 product/research working days; no production code or instrumentation.
- Consented sessions or fictional/redacted fixtures; outcome classes rather than private content.
- Explicit research-record owner, access list, retention/deletion date, withdrawal path, and publication review.
- No screenshots, raw library export, titles, URLs, notes, labels, paths, or free-text telemetry.
- Accessible recruitment/materials and access-mode task measures.

### Directional evidence threshold

- At least five comparable sessions or three unprompted natural episodes for a target job across at least two participants or three distinct weeks for the actual single owner.
- Compare current behavior, minimum change, and concept on the same task.
- Freeze a material-improvement threshold before exposure. Round 1 proposed at least 25% median task-time reduction or 20-point completion/correct-interpretation improvement with no confidence, privacy, error, or accessibility regression.

### Forced exit

At the timebox end, record exactly one:

1. advance one bounded candidate to a new council/proof packet;
2. reject/defer the opportunity family because current/minimum behavior is equivalent, the problem is rare, or a required gate fails;
3. authorize one additional named evidence gap only if it is likely to change the decision.

No indefinite research extension.

## Candidate re-entry conditions

### C-01

- Recurring retrieval-trust problem.
- Material improvement over current source opening/citations and a source-kind/current-state-only comparator.
- Exact field/provenance/state map and honest missing/stale behavior.
- No post-hoc explanation; actual contribution required for any full explanation.
- Owner denial, consent withdrawal, item/note deletion, privacy-safe telemetry, access-mode parity, and feature-off cleanup pass.

### C-02

- Recurring organization-maintenance problem.
- Material improvement over counts/sort/filter in current Settings/attention surfaces.
- Conservative read-only deterministic rule set and adversarial deliberate-near-duplicate tests.
- Each mutation independently passes authorization, preview, origin preservation, atomicity, idempotency, retry/concurrency, partial-failure recovery, undo, accessible status/focus, audit, and zero unrecoverable manual-intent loss.

### C-03 / FCP-004

- Recurring relationship-inspection job and material advantage over C-01, Related, selected Ask, grouping pages, and text lists.
- Only one smallest variant evaluated after the family passes.
- Exact current-data relation allowlist and semantics; no unavailable future inputs.
- Sensitive-relation/non-causality policy and sampled precision/comprehension.
- Complete consent/deletion/watermark/tombstone/replay/gap/rebuild/cancel/failure/cleanup/rollback contract for persisted derivatives.
- Representative scale/resources, privacy-safe metrics, named maintainer, exact dependency/SBOM/license/security plan, and accessible text-first parity before visual work.

## FCP-004 disposition

Change the historical FCP-004 planning status from “Proceed with reduced scope” to:

**Deferred by the 2026-07-13 Graphify opportunity council; not active for implementation. Safety constraints retained. Reopening requires demonstrated relationship-inspection value and all current gate conditions.**

Retain these constraints if reopened:

- derived/rebuildable projection and owner records as truth;
- provenance and visible stale state;
- equal nonvisual access;
- no Neo4j/export/source mutation in initial scope;
- proof packet before code.

## Major risks and minority case

### Defer risk

B-00 may delay a useful small improvement or yield too few episodes. The hard timebox and immediate-no-go comparator are mandatory.

### Strongest minority case

A minimal C-01 source-kind/current-state cue in the existing Related surface may be the cheapest learning instrument. It is not authorized because Related usage/trust harm is unobserved, current/minimum comparators are untested, consent/provenance behavior is unproven, and no product candidate passed the gates.

### Residual Graphify conclusion

Graphify provides useful research vocabulary but no justified production boundary. Raw runtime, HTTP MCP, viewer, installer/hook, fork, copy, and artifact adoption remain no-go. Sidecar/custom adapter remains out of scope without a new product case.

## Stop-rule result

Because recommendation v1 is **Defer** and no feature has eight Pass gates:

- selected-feature charter: blocked;
- PRD: blocked;
- UX/UI and prototypes: blocked;
- technical implementation plan: blocked.

Round 3 must adversarially test this recommendation. Only recommendation v2 can finalize the decision.
