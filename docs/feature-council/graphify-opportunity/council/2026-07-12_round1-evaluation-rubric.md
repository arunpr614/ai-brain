# Round 1 Blind Evaluation Rubric

**Status:** Common rubric; becomes immutable when the shortlist-v2 packet hash is recorded  
**Candidates:** B-00, C-01, C-02, C-03; C-03 variants are conditional and not peer candidates  
**Decision rule:** `Unknown` is non-passing at implementation selection

## Blindness declaration required in every submission

Each evaluator must declare:

1. evaluator perspective and assigned file;
2. exact frozen packet hash from the manifest;
3. that only the frozen packet/evidence listed by the manifest was used;
4. that no other Round 1 evaluation, conclusion, or draft council matrix was read;
5. that no material packet change was observed;
6. any role conflict, missing expertise, or evidence limitation.

If the packet hash differs or another evaluation was read, mark the submission invalid and request a restarted round. Do not inspect the other submission directory before filing.

## Evidence status

For every criterion and gate, record one:

- **Pass:** sufficient evidence supports the candidate at the current decision stage.
- **Fail:** evidence shows the candidate does not meet the criterion/gate.
- **Unknown:** evidence is absent or insufficient. Unknown is non-passing for a final go.
- **Not applicable:** allowed only for a criterion genuinely irrelevant to B-00; explain why.

Do not convert a plausible hypothesis, technical adjacency, prior approval, source-code existence, or Graphify capability into a Pass.

## Comparative score

Use the score only to expose relative judgment; evidence status and gate logic control the decision.

| Score | Meaning |
|---:|---|
| 0 | Materially harmful, infeasible, or contradicted |
| 1 | Weak; major disadvantages or unsupported assumptions |
| 2 | Mixed; plausible but important evidence/gaps remain |
| 3 | Strong relative case with bounded gaps |
| 4 | Compelling and well supported at this stage |

A score of 3 or 4 cannot override `Unknown` on a required gate.

## Required 17-criterion evaluation

Evaluate B-00 and all three first-level opportunities independently, then compare them. Do not score C-03 variants as peer candidates unless the evaluator first finds that the C-03 relationship-inspection job passes its applicable gates.

1. **User value** — concrete task/outcome improvement, not visual novelty.
2. **Problem frequency** — how often and how severely the target problem occurs.
3. **Alignment with AI Brain** — fit with retained-memory, retrieval, organization, trust, and single-owner product direction.
4. **Improvement over existing capabilities** — advantage over Related, search/Ask, tags/topics/collections, citations, Processing, Needs Upgrade, and current settings.
5. **Discoverability** — users can encounter and understand the feature at an appropriate moment.
6. **User trust** — provenance, uncertainty, correction, no-path/empty behavior, and avoidance of false authority.
7. **Technical feasibility** — credible MVP within current stack and explicit lifecycle limits.
8. **Data readiness** — required owner data exists now with sufficient quality/version/lifecycle; future FCP inputs do not count.
9. **Privacy and security** — sensitive associations, note consent, model egress, auth/owner scope, deletion, diagnostics, and browser unlock boundary.
10. **Performance** — representative scale, latency, memory/CPU, rebuild, cache, and mobile behavior.
11. **Accessibility** — keyboard, screen reader, text/list parity, zoom/reflow, reduced motion, and mobile use.
12. **Implementation cost** — initial product/design/engineering/test/migration/rollout cost.
13. **Maintenance cost** — ongoing quality, policy, operations, dependency, incident, and ownership cost.
14. **Dependency risk** — direct/optional dependencies, license, supply chain, upgrade churn, and lock-in. Native/no-dependency options can score well but still need normal dependency review.
15. **Measurable success** — privacy-safe baseline, leading outcome, guardrail, and decision threshold.
16. **Reversibility** — feature flag, rollback, data cleanup, owner-data safety, and exit without durable foreign contracts.
17. **Future extensibility** — useful bounded foundation without prematurely committing to a generalized graph/platform.

For each candidate/criterion record:

- score 0–4;
- Pass/Fail/Unknown/Not applicable;
- one evidence-backed rationale;
- principal assumption;
- minimum validation needed if not Pass.

## Required eight-gate ledger

Record `Pass`, `Fail`, or `Unknown` for every candidate:

1. Demonstrated user problem.
2. Clear AI Brain product fit.
3. Meaningful advantage over current behavior.
4. Technically feasible MVP.
5. Acceptable privacy and security posture.
6. Acceptable licensing and dependency posture.
7. Measurable outcome.
8. Clear rollback or exit strategy.

The evaluator may recommend **Go** only if all eight gates Pass. Any Fail or Unknown permits only **Defer** or **No-go**.

## Required option-specific challenges

### B-00 Bounded Discovery / Defer

- Does deferral have a concrete evidence-gathering plan and revisit threshold?
- What opportunity cost or user harm might continue?
- Is “do nothing” being favored merely because evidence is incomplete?

### C-01 Retrieval Evidence Upgrade

- Do minimal origin/current-state cues materially outperform current source opening/citations?
- Can any fuller explanation be reconstructed faithfully rather than rationalized after the fact?
- Can note-derived/sensitive signals be disclosed and withdrawn safely?

### C-02 Organization Hygiene in Existing Surfaces

- Is organization noise frequent enough, and are existing Settings/attention surfaces the right moment?
- Do counts/sort/filter solve the task without a new state or action system?
- Does every mutation preserve manual intent with preview, idempotency, undo/recovery?

### C-03 FCP-004 Relationship Inspection Family

- Does relationship inspection solve a frequent task, or mainly offer visual/technical novelty?
- Does it materially outperform C-01, selected-item Ask, and current grouping pages?
- If the family passes, which one variant is the smallest sufficient scope: pair explanation, selected-item evidence path, or whole-library inspector?
- For pair explanation, can actual contributions be reconstructed? For paths, are hubs/no-path/causality controlled? For inspector, do lifecycle/scale/text-first/accessibility proofs pass?

## Required evaluator output

1. Blindness declaration.
2. Perspective-specific principles and conflicts.
3. Complete 17-criterion table for B-00 and C-01–C-03.
4. Complete eight-gate ledger.
5. Per-option Go/Defer/No-go recommendation and confidence.
6. Preferred option or B-00, if any, with rationale.
7. Strongest minority/contrary case.
8. Major assumptions and risks.
9. Minimum validation that could change the recommendation.
10. Explicit statement that no production implementation is authorized.
