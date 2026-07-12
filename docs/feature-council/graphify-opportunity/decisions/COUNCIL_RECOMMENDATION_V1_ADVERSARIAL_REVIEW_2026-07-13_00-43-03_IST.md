# Council Recommendation v1 - Adversarial Review

**Created:** 2026-07-13 00:43:03 IST  
**Reviewer stance:** Brutally honest adversarial review  
**Reviewed target:** `docs/feature-council/graphify-opportunity/decisions/2026-07-13_council-recommendation_v1.md`  
**Report path:** `docs/feature-council/graphify-opportunity/decisions/COUNCIL_RECOMMENDATION_V1_ADVERSARIAL_REVIEW_2026-07-13_00-43-03_IST.md`

## Executive Verdict

**No-go on finalizing recommendation v1 unchanged. Conditional go on a revised Defer decision.**

The product conclusion is supported: no feature clears all eight gates, Graphify adds no necessary production capability, C-01 and C-02 remain unproven, C-03/FCP-004 should not remain active for implementation, and feature-specific downstream work must stay locked.

The proposed B-00 follow-on is not yet decision-safe. It combines prompted task sessions and naturally recurring problems into one threshold, requires concept comparison that the same decision bars from prototype/UX work, lacks a current-runtime baseline-readiness gate, and prefers more research even though its advantage over immediate no-go is Fail/Unknown. Those defects can produce false demand, invalid comparisons, or an institutionalized defer loop.

Graphify should remain research vocabulary only. Raw runtime, HTTP MCP, generated viewer, installer/hook, fork, copy, and artifact adoption remain no-go. Sidecar/custom-adapter modes remain untested and out of scope, not disproven.

## Evidence Inspected

- Council recommendation v1 and Round 2 comparative debate.
- All five blind Round 1 evaluations: user value/engagement; memory/knowledge/trust; platform/data/architecture; security/privacy/licensing; UX/accessibility.
- Frozen-packet manifest, common rubric, and shortlist v2.
- AI Brain audit/review evidence, Graphify research v2, and AI Brain-versus-Graphify comparison included in the frozen packet.
- Graphify opportunity decision log and risk register.
- Historical FCP-004 PRD v2, UX v2, technical v2, and Feature Council decision log.
- User goal instructions for Round 3, Round 4, downstream stop rules, Wiki publication, and definition of done.
- Independent integrity check: all 14 current packet-file hashes match the manifest and recompute to combined SHA-256 `05048a7a000ede70034bd06e0de05c70d0216b076c1d86dc545b3027f4355512`.
- Independent arithmetic check: all 20 evaluator-by-option raw means in Round 2 match the five submissions; the four council means also recompute correctly to the displayed two-decimal values.
- Gate cross-check: the feature gate statuses in recommendation v1 match the five submissions. B-00 Gate 3 remains one Fail and four Unknown, as Round 2 records.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. B-00 requires a concept/prototype comparator that its own stop rules prohibit

**Evidence:** Recommendation v1 requires comparison of “current behavior, minimum change, and concept on the same task” and uses task-time/completion improvements as decision evidence (`2026-07-13_council-recommendation_v1.md`, lines 56–71). The same artifact blocks prototypes and all feature-specific UX work (lines 21 and 137–146). The user goal says a Defer/No-go must stop before feature-specific PRD and UX artifacts. The UX evaluator explicitly identified a small non-production C-01 usability prototype as the strongest contrary case but rejected it because the packet authorizes no prototype (`council/round1/2026-07-12_ux-accessibility-evaluation.md`, lines 171–175).

**Why it matters:** A paper description or verbal concept cannot validly support a 25% task-time or 20-point completion threshold. An interactive comparator would be a prototype/UX artifact and therefore cross the locked downstream gate.

**Failure mode:** B-00 either cannot collect the claimed comparative evidence, or a team quietly creates candidate-specific UX/prototype work under the label “research,” bypassing D-005 and the user’s stop rule.

**Recommendation:** Split B-00 into two explicitly gated steps. The currently permitted step may measure natural problem recurrence and current-surface baseline only. If that passes, return to the council for explicit authorization of a separate, bounded concept-comparison proof packet. Do not claim that current B-00 can pass meaningful-advantage, discoverability, comprehension, or accessibility gates.

#### 2. The session-or-episode threshold can turn prompted tasks into false evidence of a recurring problem

**Evidence:** Recommendation v1 permits “at least five comparable sessions or three unprompted natural episodes” (line 69). Round 2 repeats the `or` construction (`council/2026-07-13_round2-comparative-debate.md`, lines 121–125). The user-value evaluator records the stricter evidence model: run baseline task sessions **and** a four-week natural-episode diary, and call a job recurring only after at least three unprompted episodes across participants or distinct owner weeks (`council/round1/2026-07-12_user-value-engagement-evaluation.md`, lines 175–177 and 185–194).

**Why it matters:** Prompted task success can measure usability on a supplied task; it cannot establish that the task occurs naturally or often enough to deserve product investment.

**Failure mode:** Five sessions on a researcher-supplied task satisfy B-00, a target job is declared “recurring,” and a candidate re-enters council despite no natural demand.

**Recommendation:** Separate two evidence gates. Gate A, demonstrated problem, requires unprompted recurrence with consequence/severity across participants or distinct owner weeks. Gate B, comparative value, requires same-task current/minimum/candidate comparisons only after Gate A passes and separate prototype authorization exists. Neither substitutes for the other.

#### 3. The current product baseline is not readiness-gated before comparative research

**Evidence:** Recommendation v1 compares all concepts against current behavior (lines 56, 69–71, and 85–107). Round 2 explicitly states that current runtime/provider/index state is not freshly verified and can confound baseline tasks (`council/2026-07-13_round2-comparative-debate.md`, lines 110–116). Recommendation v1 does not carry a baseline-readiness check into B-00 boundaries, thresholds, or forced exit.

**Why it matters:** A degraded provider, stale index, disabled surface, or unhealthy runtime can make a concept look better than normal behavior—or make a real opportunity disappear.

**Failure mode:** The council attributes environment failure to a product gap and advances the wrong candidate, or rejects a useful opportunity using an invalid baseline.

**Recommendation:** Require a dated baseline-readiness record before sessions: current build/version, provider readiness, index generation/state, feature availability, representative fixture validity, and known degraded behavior. Abort or reschedule affected comparisons; do not score them.

#### 4. B-00 is preferred despite no evidence that research beats immediate no-go

**Evidence:** Recommendation v1 acknowledges B-00’s demonstrated-problem gate is Unknown and its advantage over immediate no-go is disputed/Unknown (line 13). Round 2 preserves one Gate-3 Fail and four Unknown judgments (lines 67–78 and 82–87). The recommendation nevertheless makes B-00 the preferred next posture, while leaving the research owner, recruitment feasibility, decision date, and value-of-information test unnamed (recommendation lines 50–81). It also says four weeks is the maximum but permits one additional named evidence gap (lines 60 and 73–81).

**Why it matters:** “Evidence is missing” does not itself prove that collecting more evidence is worth the delay and effort. A low-cost study can still become a repeating defer mechanism.

**Failure mode:** The four-week maximum becomes one more gap, then another; users receive no improvement, and the opportunity family never closes.

**Recommendation:** Make B-00 conditional, not automatically authorized. Before it starts, require a named owner, recruitable cohort or single-owner diary plan, approved privacy/accessibility protocol, baseline readiness, a written statement of which result would change the decision, a fixed readout date, and an immediate-no-go fallback. Any additional gap must be a new council authorization with its own deadline, never an automatic extension.

### P2 - Medium Risk

#### 1. B-00’s aggregate score includes arbitrary numeric values for Not-applicable criteria

**Evidence:** Round 2 states that scores are unweighted means across all 17 criteria (`council/2026-07-13_round2-comparative-debate.md`, lines 28–45). Each evaluator marks five B-00 feature criteria Not applicable—improvement, discoverability, performance, accessibility, and extensibility—but still assigns numeric scores, usually 2 or 3. Those arbitrary N/A numbers are included in B-00’s 17-criterion mean.

**Why it matters:** The displayed 3.11 B-00 council mean is arithmetically correct but not methodologically comparable with feature candidates. Different arbitrary N/A scores change its rank.

**Failure mode:** Readers treat B-00’s higher mean as quantitative selection evidence even though five of its dimensions are not applicable and gates, not scores, control the decision.

**Recommendation:** In v2, either omit a B-00 aggregate score or report an applicable-criteria mean with an explicit denominator and a warning that it is not peer-comparable. Preserve the full raw matrix. State that unanimity about B-00 is a qualitative next-action judgment, not a 17-score win.

#### 2. FCP-004’s direction is correct, but the supersession mechanism is incomplete

**Evidence:** Recommendation v1 says to change FCP-004 from “Proceed with reduced scope” to deferred/not active (lines 109–121). The historical PRD still says `Superseded by: None` and `Council outcome: Proceed with reduced scope` (`docs/wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md`, lines 8–19). The historical Feature Council decision log still lists FCP-004 as Proceed with reduced scope (`docs/wiki/Feature-Council-Decision-Log.md`, lines 32–40). UX and technical v2 also remain the latest revisions in that planning package.

**Why it matters:** Adding a new recommendation without reciprocal status notices leaves two apparently authoritative planning states.

**Failure mode:** A future reader follows the historical package and starts graph work despite the new defer decision.

**Recommendation:** Recommendation v2 must define an atomic publication set: preserve the historical text, add a dated superseded/deferred banner and reciprocal link on PRD/UX/technical pages, update the central decision log and tracker, retain the original safety constraints, and verify the live Wiki no longer presents FCP-004 as active implementation authority.

#### 3. Directional thresholds are too coarse to protect trust with the proposed sample

**Evidence:** Recommendation v1 proposes a 25% median task-time change or 20-point completion/correct-interpretation improvement with at least five sessions (lines 67–71). With five sessions, a 20-point change can be one participant. The user-value evaluation separately requires 100% provenance/origin correctness, no private telemetry, no withdrawn note influence, and no false causal/authoritative interpretation in the acceptance set (`council/round1/2026-07-12_user-value-engagement-evaluation.md`, lines 189–199). V1 does not carry those hard trust constraints into the shared directional threshold.

**Why it matters:** A tiny directional average can mask a trust-breaking error, especially for relationship/provenance claims.

**Failure mode:** One apparent completion improvement outweighs one materially misleading or privacy-unsafe result.

**Recommendation:** Label the sample as discovery-only and prohibit statistical or population claims. Define zero-tolerance provenance, consent, private-telemetry, false-causality, unrecoverable-intent-loss, and access-blocking failures as independent no-go guardrails; averages cannot offset them.

### P3 - Low Risk Or Polish

#### 1. The preserved B-00 Gate-3 disagreement is compressed too far in the recommendation

**Evidence:** Recommendation v1 calls the gate “disputed/Unknown” (line 13). Round 2 records the exact split: one evaluator marked Fail by design and four marked Unknown (`council/2026-07-13_round2-comparative-debate.md`, lines 67–78 and 82–87).

**Why it matters:** The exact split explains why B-00 is not a feature Go and why immediate no-go remains a live comparator.

**Failure mode:** Readers interpret “disputed/Unknown” as harmless wording rather than a preserved non-pass.

**Recommendation:** State `Fail (1/5), Unknown (4/5)` in recommendation v2 and explicitly say no gate is waived for B-00; it is a non-feature decision action requiring separate start conditions.

## What The Original Plan Or Work Gets Wrong

- It gets the **feature decision** mostly right: Defer/No-go is supported because all feature candidates have non-passing gates. This is not mere conservatism.
- It gets **B-00 execution readiness** wrong: evidence absence does not automatically justify more research, and the plan cannot perform its claimed concept comparison without crossing its prototype stop rule.
- It gets **problem evidence semantics** wrong by allowing prompted task sessions to substitute for naturally recurring demand.
- It gets the **score arithmetic** right but the B-00 aggregation method wrong because numeric N/A cells are averaged.
- It correctly finds that **Graphify is unnecessary** for production and that direct modes add no justified value. Sidecar/adapter uncertainty is correctly left untested rather than universally rejected.
- It correctly leaves current/minimum surfaces as live comparators. The evidence does not prove that C-01, C-02, or C-03 beats Related, Ask, citations/source opening, grouping pages, or Settings.
- It correctly treats relationship explanations, paths, privacy concentration, lifecycle, accessibility, operating cost, and rollback as non-passing for C-03.
- It correctly blocks charter, PRD, UX/prototype, and technical implementation work, but its B-00 concept comparison creates a loophole in that block.
- It points FCP-004 in the right direction, but “deferred/amended” must be implemented as explicit supersession across all historical entry points, not a single new statement.

## Missing Validation

- A B-00 pre-start value-of-information decision: named owner, recruitable cohort/diary owner, fixed readout date, exact decision-changing result, and immediate-no-go branch.
- Fresh current-baseline readiness: runtime version, provider state, index generation/readiness, enabled features, known degradation, and representative fixtures.
- Separate natural-recurrence and prompted-task instruments, with no substitution between them.
- Explicit authorization boundary for any concept stimulus or interactive prototype after a problem gate passes.
- A sampling/analysis note that prevents population claims from five sessions and defines how missing, repeated, or confounded observations are handled.
- Hard trust/privacy/accessibility guardrails that cannot be traded against task-time or completion averages.
- Recomputed score presentation that excludes or clearly isolates B-00 N/A criteria.
- An FCP-004 Wiki supersession checklist with reciprocal links and live verification.

## Revised Recommendations

1. Finalize the product decision as **Defer feature selection**: C-01 and C-02 remain deferred hypotheses; C-03 is no-go for current selection; no feature-specific downstream package is unlocked.
2. Keep Graphify raw runtime, MCP, viewer, installer/hook, fork, copy, and artifact adoption at no-go. Keep sidecar/adapter outside the case. Permit concept vocabulary only as neutral research input.
3. Recast B-00 as a **conditional evidence action**, not the automatic next step and not a selected candidate.
4. Permit only problem-frequency and current-baseline work in the first B-00 step. Require natural recurrence before any feature concept comparison.
5. If natural recurrence passes, require a new council authorization for the smallest candidate-specific concept/prototype comparator. That future packet must not unlock implementation.
6. If ownership, recruitment, privacy/accessibility protocol, baseline readiness, or decision-changing value is absent, choose immediate no-go/current behavior rather than extending Defer.
7. Report B-00 Gate 3 exactly as `Fail (1/5), Unknown (4/5)` and remove any implication that its score rank supplies evidence.
8. Publish FCP-004 as explicitly superseded/deferred across PRD, UX, technical, central decision log, tracker, and live Wiki while preserving the historical record and retained safety constraints.

## Go / No-Go Recommendation

**No-go:** any Graphify production adoption; any feature selection; any C-03/FCP-004 implementation; any charter, PRD, UX/prototype, or technical implementation plan; any execution of B-00 as currently written.

**Conditional go:** recommendation v2 may finalize **Defer** after every P1 finding is corrected and every P2 finding is resolved or explicitly carried with an owner and no-go condition. A revised, current-baseline-only B-00 discovery step may be recommended only after its pre-start conditions pass. It still does not authorize a feature or prototype.

## Plan Revision Inputs

### Required Deletions

- Delete the claim that one B-00 timebox can compare current behavior, minimum change, and a feature concept under the present no-prototype boundary.
- Delete the `five sessions OR three episodes` construction as a demonstrated-problem threshold.
- Delete any use of B-00’s 17-criterion mean as peer-comparable selection evidence.
- Delete wording that permits an unnamed “additional evidence gap” to extend the four-week maximum automatically.
- Delete any implication that writing one new FCP-004 status sentence is sufficient supersession.

### Required Additions

- Add an explicit two-step B-00 model: natural-problem/current-baseline discovery, then separately authorized candidate comparison only after recurrence passes.
- Add B-00 start conditions: named research owner, access/recruitment plan, privacy/accessibility approval, retention/deletion date, baseline readiness, fixed readout date, and decision-changing hypothesis.
- Add the exact B-00 Gate-3 split: Fail 1/5, Unknown 4/5.
- Add an immediate-no-go branch when B-00 start conditions or value-of-information do not pass.
- Add hard zero-tolerance trust/privacy/manual-intent guardrails independent of average outcome thresholds.
- Add a B-00 score-method note and applicable-denominator disclosure or omit the aggregate.
- Add an exact FCP-004 supersession/publication checklist and reciprocal-link requirement.
- Add explicit statements that Graphify is not necessary and current/minimum surfaces may be sufficient until comparative evidence proves otherwise.

### Required Acceptance Criteria Changes

- A prompted session can measure task behavior but can never pass demonstrated-problem frequency by itself.
- A recurring job requires predeclared unprompted episodes with consequence/severity across at least two participants or at least three distinct weeks for the actual single owner.
- No candidate concept is shown, designed, or tested until recurrence passes and a separate council authorization names the artifact and boundary.
- Every scored comparison uses a verified healthy current baseline; degraded or stale sessions are invalidated, not averaged.
- No result advances if provenance is mislabeled, withdrawn note influence remains, private telemetry leaks, false causality/authority appears, accessibility blocks completion, or manual intent is unrecoverably lost.
- B-00 results are discovery evidence only and make no population, adoption, or durable-retention claim.
- Recommendation v2 retains all five individual recommendations, exact gate disagreement, minority C-01 case, read-only C-02 contrary case, assumptions, risks, and confidence.
- FCP-004 is no longer presented as active in any current Wiki entry point after publication, while historical text remains discoverable and linked.

### Required Validation Changes

- Recompute and publish the 17-score table with B-00 N/A treatment disclosed.
- Verify all frozen packet hashes again before v2; restart the council round if any packet input changed materially.
- Run a pre-session baseline-readiness check and record confounds.
- Validate recurrence and comparative-task evidence as separate datasets with separate pass/fail rules.
- Review the B-00 protocol for privacy, accessibility, withdrawal, retention/deletion, and prohibited fields before collection.
- Verify the final FCP-004 status in a fresh Wiki clone and on live pages after publication.
- Run repository privacy/path checks on recommendation v2 and its Wiki derivatives.

### Required No-Go Gates

- No B-00 start without a named owner, recruitable evidence source, approved protocol, healthy baseline, and fixed readout date.
- No research extension from the four-week timebox without a new explicit council authorization; no second extension.
- No candidate re-entry based only on prompted sessions, stated enthusiasm, visual preference, technical feasibility, or Graphify capability.
- No concept/prototype comparison under the current Defer stop rule.
- No feature Go with any Fail or Unknown among the eight gates.
- No C-01 full explanation without faithful actual-contribution evidence.
- No C-02 mutation with any manual-intent, atomicity, idempotency, concurrency, recovery, or accessibility failure.
- No C-03 reopening without recurring relationship-inspection demand and material advantage over C-01, Related, selected Ask, grouping pages, and text lists.
- No Graphify runtime/MCP/viewer/installer/hook/fork/copy/raw-artifact adoption; no sidecar/adapter without a new product and architecture case.
- No final publication while FCP-004 still appears active in a current status entry point.

## Residual Risks

Even after revision, five sessions and three natural episodes provide only directional evidence; rare but high-severity jobs may be missed. Current users or the single owner may not represent broader future use. Privacy-safe outcome classes may reduce diagnostic detail. Existing-surface baselines can change during the timebox. A narrow C-01 cue can still create false authority; read-only C-02 cues can still stigmatize intentional organization; any C-03 relationship view retains sensitive-association and accessibility risk. Historical FCP-004 pages may remain discoverable through cached links after supersession. These residual risks reinforce Defer and a hard stop, not feature selection.
