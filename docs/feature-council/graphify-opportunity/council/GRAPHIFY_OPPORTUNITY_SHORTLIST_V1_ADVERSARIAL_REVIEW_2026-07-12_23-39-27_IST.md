# Graphify Opportunity Shortlist v1 — Adversarial Review

**Created:** 2026-07-12 23:39:27 IST  
**Reviewer stance:** Brutally honest adversarial review  
**Reviewed target:** `docs/feature-council/graphify-opportunity/council/2026-07-12_opportunity-shortlist_v1.md`  
**Report path:** `docs/feature-council/graphify-opportunity/council/GRAPHIFY_OPPORTUNITY_SHORTLIST_V1_ADVERSARIAL_REVIEW_2026-07-12_23-39-27_IST.md`

## Executive Verdict

**NO-GO for shortlist sign-off, ranking, or candidate selection. CONDITIONAL GO only for retaining these entries as unvalidated hypothesis prompts.**

The document correctly says that user value is Unknown and that no option is implementation-ready. It still fails as a fair decision instrument. B-00 is structurally disadvantaged, the three relationship options overlap each other and FCP-004, and the promised 17-criteria/eight-gate evaluation is neither defined nor applied. The option mix consequently risks producing a Graphify-shaped choice even though the controlling research requires neutral comparison with no feature, FCP-004 disposition, smaller existing-surface improvements, and simpler alternatives.

## Evidence Inspected

- `docs/feature-council/graphify-opportunity/council/2026-07-12_opportunity-shortlist_v1.md`
- Linked AI Brain audit v2 and its QA/evidence review
- Linked Graphify research note v2 and AI Brain-versus-Graphify comparison
- Linked semantic-event and graph-input lifecycle matrix
- Linked FCP-004 PRD, UX, and technical v2 pages

No external research, production probing, or target edits were performed.

## Findings

### P0 — Must Fix Before Execution Or Release

No P0 findings found. The shortlist does not authorize implementation, and its explicit Unknown/non-passing wording prevents immediate release harm if followed.

### P1 — High Risk

#### 1. The claimed 17-criteria/eight-gate evaluation is not executable

**Evidence:** The shortlist says every option must be independently evaluated against 17 criteria and eight gates, but supplies only eight high-level bullets and no 17-criterion definition, option-by-option matrix, evidence status, threshold, or owner (`2026-07-12_opportunity-shortlist_v1.md:498-511`). The linked research defines ten production-fit criteria and eight required gates (`../research/2026-07-12_graphify-research-note_v2.md:143-182`), not the claimed 17-criterion instrument.  
**Why it matters:** Reviewers cannot reproduce a decision or tell whether the same standard was applied to every option. “Unknown is non-passing” is ineffective when Unknowns are not recorded per gate.  
**Failure mode:** A visually attractive option advances on narrative enthusiasm while a less novel option is rejected on a risk that was never scored consistently.  
**Recommendation:** Put the exact 17 named criteria and all eight gates into v2. Add one row per option including B-00, with `Pass`, `Fail`, `Unknown`, or justified `N/A`, evidence, threshold, owner, and next validation. No ranking may occur while an applicable gate is Unknown.

#### 2. B-00 is named as mandatory but denied equal evaluation

**Evidence:** B-00 receives 13 lines and is explicitly “not counted among the four product opportunities” (`2026-07-12_opportunity-shortlist_v1.md:36-48`). O-01 through O-04 each receive the full concept, problem, users, value, journeys, data, privacy, feasibility, metrics, MVP, risks, complexity, and confidence template. The final table gives B-00 one row but no comparable adoption hypothesis, success metrics, validation cost, timebox, owner, or recommendation confidence (`:486-496`).  
**Why it matters:** Formatting is decision architecture. Four elaborated feature stories against one thin defer paragraph makes feature selection feel like progress and B-00 feel like absence, even though current user-value evidence is Unknown.  
**Failure mode:** Council selects the “best-developed” feature narrative rather than testing whether any new feature beats current behavior and the cost of learning.  
**Recommendation:** Make B-00 a fifth first-class option using the identical template. Define its discovery plan, evidence budget, timebox, learning metrics, opportunity-cost test, exit trigger, and owner. Include it in every criterion and gate row.

#### 3. O-01, O-02, and O-03 are not independent options; they split one relationship family and duplicate FCP-004

**Evidence:** O-01 calls itself an FCP-004 “predecessor/amendment” (`:153-155`); O-02 is the direct FCP-004 continuation/amendment (`:159-265`); O-03 is a narrow FCP-004 functional slice/amendment (`:373-375`). All reuse the same Related/owner-join/semantic-provenance substrate. FCP-004 already includes relationship provenance, an inspector/detail interaction, graph/list views, filtering, and semantic relationships (`../../../wiki/Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2.md:33-93`). The shortlist's deduplication paragraph distinguishes interaction scale but does not establish independent investment decisions (`:486-496`).  
**Why it matters:** Nested scopes should be compared within one option family after the user job is selected. Treating them as separate candidates vote-splits alternatives and gives relationship work three chances to beat B-00 and O-04.  
**Failure mode:** Council “chooses” O-01 or O-03 as novel work without explicitly narrowing, superseding, or rejecting FCP-004, then rediscovers the same provenance, lifecycle, accessibility, and projection requirements.  
**Recommendation:** Use a two-level decision tree. First compare independent jobs: defer/evidence gathering, improve an existing retrieval action, organization maintenance, and reaffirm/narrow/reject FCP-004. Only if the relationship-inspection job passes should O-01/O-02/O-03 be evaluated as mutually exclusive scope variants. For every surviving variant, state exactly which FCP-004 requirements are retained, removed, changed, or deferred.

#### 4. The document describes plausible problems and value, not demonstrated ones

**Evidence:** Each option uses declarative “User problem,” “Target users,” and “Proposed value” sections while its adoption and problem frequency remain Unknown (`:58-72,111-120`; `:165-179,219-230`; `:275-289,329-340`; `:385-399,439-449`). The shortlist itself admits that no analytics, interviews, task studies, adoption baseline, or problem-frequency evidence exists (`:13,36-46,498-511`).  
**Why it matters:** A well-written hypothesis can be mistaken for discovered demand. Success metrics without predeclared baselines, thresholds, sample strategy, or comparison design do not close the value gate.  
**Failure mode:** Technical feasibility or prior FCP approval becomes a proxy for user need, precisely what the controlling research forbids.  
**Recommendation:** Rename these sections “Problem hypothesis,” “Candidate user hypothesis,” and “Value hypothesis.” Add an evidence class and confidence to every claim. Before ranking, predeclare a validation method, baseline, minimum decision threshold, and simpler comparator for each option.

### P2 — Medium Risk

#### 1. The option portfolio remains Graphify-shaped despite neutral language

**Evidence:** Three of four product options are explain/inspect/path variants drawn from relationship-graph concepts; only O-04 is a non-connection alternative. The controlling research says Graphify concepts are non-exhaustive seeds and receive no preference over no feature, FCP-004 disposition, or smaller improvements to Related/search/Ask/topic/tag/collection/citation/source surfaces (`../research/2026-07-12_graphify-research-note_v2.md:160-169`).  
**Why it matters:** Bias can enter through option generation even when every individual option says “Graphify concept only.”  
**Failure mode:** Council concludes that users need a graph-adjacent feature because the shortlist mostly contains graph-adjacent features.  
**Recommendation:** Add a portfolio-balance test. Document the search space considered, rejection/deduplication reason for each family, and at least one first-class minimal existing-surface alternative for each asserted job before freezing v2.

#### 2. Simpler alternatives are mentioned as workarounds, not evaluated as candidates

**Evidence:** O-01 does not compare a full explanation panel with smaller Related evidence badges, source-kind labels, or a stale/index indicator (`:52-151`). O-03 notes that selected-item Ask may already satisfy the job but does not include an Ask/compare enhancement as a scored alternative (`:298-371`). O-04 acknowledges duplication with tag settings, Processing, and Needs Upgrade but does not compare improving those existing surfaces with a new queue (`:408-480`).  
**Why it matters:** A workaround is not the same as a minimum-change comparator. Without one, the shortlist overstates the need for new routes, state, instrumentation, and maintenance.  
**Failure mode:** The council funds a new surface when a label, filter, comparison view, or existing-workflow enhancement could validate the same problem faster and with less privacy risk.  
**Recommendation:** Add a “smallest viable alternative” and “why insufficient” section to every feature option, then score that alternative under the same gates.

#### 3. Trust, privacy, accessibility, and lifecycle are constraints, not option-specific pass conditions

**Evidence:** Shared constraints are strong (`:23-34`), and each option lists risks. But the shortlist does not define candidate-specific acceptance thresholds or evidence packets. O-01 cannot faithfully explain a centroid without matched contribution accounting (`:103-105,134-143`); O-02 lacks complete watermark/deletion/rebuild proof (`:207-213,243-253`); O-03 risks meaningless hub shortcuts and path semantics (`:321-363`); O-04 proposes merge/detach/undo interactions without a proved reversible mutation contract (`:427-472`).  
**Why it matters:** Generic safety prose is easy to carry forward while the hard failure threshold remains negotiable. Accessibility also needs task parity, not merely a text-first label.  
**Failure mode:** A prototype “passes” because it renders and has a list, while explanations are unfaithful, deleted relations linger, sensitive associations leak, keyboard/mobile tasks diverge, or cleanup actions damage manual intent.  
**Recommendation:** Add per-option no-go tests for provenance fidelity, consent revocation, deletion lag, stale/failure visibility, owner authorization, privacy-safe telemetry, keyboard/screen-reader/mobile task parity, rollback, and destructive-action preview/undo.

#### 4. Complexity labels are relative adjectives without comparable cost or ownership

**Evidence:** Options are labeled Medium, High, or Medium-to-high (`:145-151,255-261,365-371,474-480`) without common sizing assumptions, dependency map, operating cost, maintainer, or validation budget. B-00 has no comparable learning cost.  
**Why it matters:** Relative labels cannot support fair sequencing or an exit decision.  
**Failure mode:** “Medium” O-01 or O-04 expands into lifecycle, policy, telemetry, undo, migration, and ongoing quality work after selection.  
**Recommendation:** Add comparable discovery, prototype, implementation, operational, policy-review, and maintenance estimates with named owners and explicit uncertainty ranges.

### P3 — Low Risk Or Polish

#### 1. FCP-004 disposition language is not normalized

**Evidence:** The options use “predecessor,” “amendment,” “continuation,” “functional slice,” “distinct alternative,” “defer,” and “reject” without a single decision field (`:153-155,263-265,373-375,482-494`).  
**Why it matters:** The final record may not show whether FCP-004 remains binding, is narrowed, is superseded, or is rejected.  
**Failure mode:** Later work treats both the historical package and the selected option as active.  
**Recommendation:** Require one controlled disposition per option: `retain unchanged`, `narrow`, `amend`, `supersede`, `defer`, or `reject`, plus the exact retained and removed scope.

## What The Original Plan Or Work Gets Wrong

1. It equates narrative differentiation with option independence. Different UI scales do not make O-01/O-02/O-03 separate investment decisions.
2. It says B-00 is a real comparator while presenting it as a short preface rather than a scored option.
3. It cites 17 criteria and eight gates without embedding an auditable evaluation instrument.
4. It avoids explicit value overclaims in the summary but reintroduces them through declarative problem/value prose inside each option.
5. It treats current workarounds as sufficient comparison against new features, omitting minimum-change improvements to those same surfaces.
6. It uses Graphify neutrally at the implementation layer but still lets Graphify/FCP concepts dominate option generation.
7. It carries safety constraints but does not say what observed result fails an option.

## Missing Validation

- A five-option, same-schema evaluation including B-00.
- The exact 17 criteria, their definitions, evidence rules, and scoring semantics.
- A completed eight-gate matrix with no silent Unknown-to-Pass conversion.
- Direct problem-frequency evidence and a current-task baseline for each independent job.
- Comparative task tests against current Related, selected-item Ask, organization pages, and the smallest viable enhancement.
- O-01 explanation-fidelity proof using actual matched contributions rather than post-hoc centroid stories.
- O-02 complete owner/watermark/tombstone/rebuild/rollback proof on representative libraries.
- O-03 meaningful-path evaluation against selected-item Ask, including hub/cycle/no-path/adversarial fixtures.
- O-04 preview, idempotency, manual-intent preservation, undo, and recovery proof for every mutation class.
- Candidate-specific privacy, authorization, consent-revocation, diagnostic-leakage, accessibility-parity, mobile, scale, observability, maintenance, and exit evidence.

## Revised Recommendations

1. Reframe v2 as a decision tree, not five peer cards: first select or reject an independently demonstrated user job; only then compare scope variants within the relationship family.
2. Promote B-00 to a complete option with a bounded discovery plan and measurable exit trigger.
3. Consolidate O-01/O-02/O-03 under one FCP-004 relationship-inspection family until evidence proves that their jobs are independently frequent.
4. Add first-class minimum-change comparators: Related evidence badges/staleness, selected-item Ask/compare, and improvements to existing organization/settings/attention surfaces.
5. Replace declarative problem/value language with evidence-labeled hypotheses.
6. Attach the 17-criteria and eight-gate matrix, with B-00 and simpler alternatives scored identically.
7. Freeze ranking until every applicable value, trust, privacy, accessibility, lifecycle, scale, ownership, and exit gate has an evidence-backed result.

## Go / No-Go Recommendation

**NO-GO for Stage 3 shortlist approval, ranking, prototype commitment, or implementation selection.**

**GO only for a v2 revision and bounded discovery.** The current four options may remain as hypothesis inputs, but not as four independent council candidates. B-00 must remain the default while user problem, comparative advantage, and safety gates are Unknown.

## Plan Revision Inputs

### Required Deletions

- Delete the sentence that B-00 is not counted among product opportunities.
- Delete any implication that O-01/O-02/O-03 are independent peer investments before the relationship job passes.
- Delete declarative “User problem,” “Target users,” and “Proposed value” labels unless supported; replace them with explicitly labeled hypotheses.
- Delete Medium/High complexity labels unless the common estimation basis is supplied.

### Required Additions

- A first-class B-00 card using the identical option template.
- A hierarchy showing independent job families and nested scope variants.
- A controlled FCP-004 disposition and current-feature duplication field for every option.
- A minimum-change comparator for every feature option.
- The exact 17-criterion rubric and an option-by-option evidence matrix.
- The eight-gate matrix with status, evidence, threshold, owner, validation action, and decision date.
- Comparable discovery/build/operation/maintenance/exit cost and ownership.

### Required Acceptance Criteria Changes

- A shortlist option is independent only if it solves a distinct demonstrated job, has a distinct minimum-change comparator, and can be selected without implicitly selecting another option.
- B-00 passes the same completeness and scoring checks as every feature.
- Every user-value claim identifies evidence class and confidence.
- Every inferred relationship exposes origin, version, limitations, correction, consent, deletion, and stale state.
- Every visual or spatial task demonstrates equal completion through keyboard, screen reader, zoom/reflow, reduced motion, mobile, and nonvisual interaction.
- Every destructive organization action has preview, idempotency, undo/recovery, and manual-intent preservation.

### Required Validation Changes

- Predeclare the decision threshold and comparison method before collecting user evidence.
- Compare each option with B-00, current behavior, FCP-004 disposition, and its smallest viable alternative.
- Use representative, privacy-safe fixtures for explanation fidelity, sensitive associations, consent revocation, deletion, stale state, gap recovery, and rebuild failure.
- Test O-03 against selected-item Ask and require a useful no-path outcome.
- Test O-04 against improvements to current settings/Processing/Needs Upgrade surfaces.
- Record all 17 criteria and eight gates as Pass, Fail, Unknown, or justified N/A; retain raw evidence links.

### Required No-Go Gates

1. No ranking or selection while the frequent-user-problem gate is Unknown.
2. No option advances without measured advantage over B-00, current behavior, FCP-004 completion/narrowing, and its minimum-change alternative.
3. No O-01 advance if a faithful explanation cannot be reconstructed from actual contributing evidence or if note-derived influence cannot be removed immediately after consent change.
4. No O-02 advance until complete watermark/tombstone/rebuild/rollback behavior is proven; no canvas work before text/list task value and accessibility parity pass.
5. No O-03 advance if current selected-item Ask/compare performs equivalently, path rules prefer meaningless hubs, or semantic hops lack precision and lifecycle proof.
6. No O-04 advance if any mutation lacks preview, idempotency, undo/recovery, or preservation of explicit manual intent.
7. No option advances with Unknown owner authorization, association privacy, sensitive-topic handling, deletion, accessibility parity, representative scale, observability, maintenance ownership, or reversible exit.
8. No Graphify runtime, viewer, HTTP MCP, installer/hook, fork, copied implementation, or production artifact enters scope without a new independently justified council case.

## Residual Risks

Even after a fair v2, direct user evidence may still support defer. Relationship explanations and paths can remain misleading despite technical provenance; organization review can remain subjective despite undo; and accessibility parity can expose that a visual map adds no task value. These are legitimate rejection outcomes, not reasons to weaken the gates.
