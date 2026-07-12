# Graphify Feature Council — Project Management Assessment

**Assessment date:** 2026-07-12  
**AI Brain baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Graphify research baseline:** `eec7a0183847cbdc8a87d92b233759a5204b89fe`, package/release `0.9.13`, default branch `v8`  
**Assessment scope:** sequencing, ownership, milestone gates, council discipline, logging, Wiki, and review-only delivery; no production implementation

## Executive status

**Overall:** Amber — evidence collection is productive and the top-level stop rule is sound, but the control plane is stale and not detailed enough to run the remaining artifact/review/council chain without interpretation.

Confirmed current state:

- The dedicated branch and baseline are recorded in `MASTER_EXECUTION_INDEX.md:3-5,32-38` and `DECISION_LOG.md:D-002`.
- The five assigned AI Brain audit v1/source artifacts exist under `audit/`; their control documents still say “in progress” (`MASTER_EXECUTION_INDEX.md:19-30`; `TRACKER.md:7`; `council/2026-07-12_agent-assignment-register.md:20-29`).
- Graphify product/capability/claims source notes and the synthetic POC exist. Security/privacy, license/dependency, and technical-risk notes are not yet present because the technical/risk stream remains active.
- The POC has a recorded decision and result (`DECISION_LOG.md:D-004`) and a publication-safe report, but temporary source/environment/fixture/output were only “scheduled for removal,” not confirmed removed (`research/2026-07-12_graphify-synthetic-poc.md:99-101`).
- The operating charter correctly requires eight pass gates, four rounds, independent Round 1, preserved minority opinions, and a no-go/defer stop (`council/2026-07-12_council-operating-charter.md:7-20,22-38,48-50`).
- Protected AI Brain baseline CI is green and recorded in `SOURCE_INVENTORY.md:7-11`; production runtime is intentionally not freshly verified for this research goal.
- Git state is documentation-only for this goal: `RUNNING_LOG.md` is modified and `docs/feature-council/graphify-opportunity/` is untracked. No production application file is in scope.

The immediate critical path is: finish the technical/security/license evidence stream → synthesize canonical audit/research v1 artifacts → adversarial review and v2 → reviewed shortlist v2 → sealed blind Round 1 → comparative matrix and recommendation draft → Round 3 adversarial review → Round 4 recommendation v2. Only a recorded **go** may unlock charter/PRD/UX/technical work.

## Milestone and critical-path assessment

| Seq. | Milestone | Actual status | Required exit gate | Owner | Critical-path note |
|---:|---|---|---|---|---|
| 0 | Worktree/baseline/controls | Complete but controls need refresh | Baseline SHA/date, branch, ownership, append-only log, initial risks/decisions linked | Coordinator + project manager | Do not reopen unless baseline changes |
| 1A | AI Brain audit v1 package | Source package complete | Five audit files present, baseline/citations/privacy/CI limitations explicit, package named as v1 | Audit specialist; coordinator accepts | Tracker/index/register must change from In progress to Complete |
| 1B | Graphify product/capability source notes | Complete | Exact SHA/version, source/test/doc/website labels, limitations and open questions | Product researcher | These are inputs, not the canonical research-note v1 |
| 1C | Graphify architecture/security/license source notes | In progress | Architecture, security/privacy, license/dependency, technical risk, external calls, test/security caveats, adoption/exit evidence | Technical/risk specialist | Current blocking dependency for research synthesis |
| 1D | Synthetic POC closeout | Evidence complete; cleanup pending | Decision value recorded, no retained process/hook, temporary clone/env/fixture/output deleted, cleanup recorded | Technical/risk specialist + coordinator | Must close before final delivery; should close after synthesis no longer needs files |
| 2A | Canonical AI Brain audit v1 | Needs explicit coordinator packaging | Stable entry artifact links the five source notes and states scope/status | Coordinator | Avoid five uncoordinated files becoming five separate major review chains unless deliberately chosen |
| 2B | Canonical Graphify research note v1 | Pending | Synthesis covers product, architecture, capability, security/privacy, license/dependency, AI Brain comparison, POC; stable `Research-note.md` links it | Coordinator after 1B/1C | Cannot begin final synthesis until technical/risk outputs land |
| 3A | Audit adversarial review → v2 | Pending, reviewer not assigned | Adversarial-review skill report; every actionable item resolved or carried into v2/risk/blocker | Adversarial reviewer → coordinator v2 | May run in parallel with 3B |
| 3B | Research adversarial review → v2 | Pending, reviewer not assigned | Same chain; marketing/security/license/version conflicts explicitly tested | Adversarial reviewer → coordinator v2 | May run in parallel with 3A |
| 4 | Opportunity shortlist v1/review/v2 | Pending; tracker currently collapses chain | Three to five distinct briefs, every required field, audit/research v2 citations; adversarial report; frozen v2 packet | Coordinator/product council + adversarial reviewer | Council must evaluate only the frozen v2 packet |
| 5 | Round 1 independent evaluations | Pending and not operationalized | All evaluators receive identical frozen packet; separate submissions; blindness declaration; evidence/assumptions/confidence/recommendation/gate failures; submission manifest complete | Independent specialists | No Round 2 synthesis before every required submission is locked |
| 6 | Round 2 comparative debate | Pending | Required 17-criterion matrix, common rubric, score differences explained, disagreements retained; recommendation v1 drafted | Coordinator/council | Do not average away veto/gate failures |
| 7 | Round 3 challenge | Pending | Adversarial review of recommendation v1 covers all required challenge questions and each gate | Adversarial reviewer | This report should serve the mandatory recommendation adversarial-review artifact |
| 8 | Round 4 council decision/recommendation v2 | Pending | Go/defer/no-go; eight gates Pass/Fail/Unknown with evidence; minority views, assumptions, risk/confidence; all Round 3 findings resolved/carried | Coordinator/council | Unknown or failed gate cannot yield go |
| 9A | No-go/defer branch | Gated | Decision record, final audit/research/council package, Wiki, delivery; no feature charter/PRD/UX/technical plan | Coordinator | Valid shorter path |
| 9B | Go branch: feature charter | Gated | Recommendation v2 says go; decision log accepted; council-approved charter with MVP/non-goals/success/risks | Council; coordinator sole editor | Downstream owner assignment happens only here |
| 10 | PRD v1/review/v2 | Gated | New product manager; required content; adversarial report; v2 labeled exactly “Proposed — not implemented; awaiting stakeholder approval” | Product manager + adversarial reviewer | Specialist owns v1/v2; reviewer owns report |
| 11 | UX/UI + prototype v1/review/v2 | Gated | Starts only from PRD v2; new UX designer; two runnable prototype versions; accessibility and desktop/mobile/state evidence | UX designer + adversarial reviewer | Prototype v2 and package v2 must align |
| 12 | Technical plan v1/review/v2 | Gated | Starts only from PRD v2 **and UX v2**; exact requirement/interaction trace; review and v2 | Technical architect + adversarial reviewer | Final consistency gate across PRD/UX/technical v2 |
| 13 | Wiki package/publication | Pending; permission unverified | Publication-safe current/proposed classification, current SHA/date, privacy/link/structure checks, concurrency-safe Wiki push, fresh-clone/live verification | Coordinator + QA | Verify access early; publish only finalized facts/proposal status |
| 14 | Repository delivery | Pending | Diff scope, artifact reachability, prototype visual checks if go, tests/docs/link/privacy checks, focused commit, push, review-only PR, final report and running-log handoff | Coordinator | Do not merge or deploy production feature |

## Missing or underspecified required work

### P0 — Must fix before the council can start

1. **The two canonical v1 artifacts are not defined.** The goal names “AI Brain feature audit v1” and “Graphify research note v1” as major artifacts. The repository currently has five audit files and several Graphify source notes, while `Research-note.md:8-15` remains a placeholder. The coordinator must name the canonical v1 synthesis files and decide whether the supporting files are annexes covered by one package review.
2. **No adversarial reviewer assignment exists yet.** `TRACKER.md:9` and the assignment register’s “Future assignments” mention the role but do not name owned review files or timing. This blocks both v2 source-of-truth packages.
3. **Opportunity shortlist and council recommendation lack explicit v1/review/v2 rows.** The goal’s artifact workflow lists both as major artifacts; `TRACKER.md:10-11` currently compresses each into one row.
4. **Round 1 blindness is a principle, not an executable protocol.** The charter says specialists must not see others’ conclusions (`council/2026-07-12_council-operating-charter.md:24-26`), but there is no frozen candidate hash, evaluator roster, separate file ownership, submission manifest, blindness declaration, or restart rule if the packet changes.
5. **The specialist council roster is not scheduled.** The assignment register ends with generic future roles (`council/2026-07-12_agent-assignment-register.md:53-59`). At minimum, independent Round 1 perspectives must cover user value/engagement, memory/knowledge/trust, platform/data/architecture, security/privacy/licensing, and UX/accessibility. Combining perspectives in source research does not satisfy independent council evaluation.
6. **Gate evidence format is missing.** Round 4 needs a table for every candidate and all eight gates with `Pass`, `Fail`, or `Unknown`, citations, and remediation. Treat `Unknown` as non-passing.

### P1 — Must fix before downstream design or delivery

7. **File ownership conflicts are latent.** `MASTER_EXECUTION_INDEX.md` says the coordinator owns final synthesis; the tracker says the coordinator owns final v2 artifacts; downstream stages require new specialist owners. Clarify that each specialist exclusively owns its v1 and v2 files, the reviewer owns the review report, and the coordinator owns cross-artifact synthesis/shared controls—unless a stage explicitly assigns v2 synthesis to the coordinator after the source owner releases the lock.
8. **Feature charter approval is not tied to a decision-log entry.** Add an exit condition: recommendation v2 = go, all gates pass, and a named accepted decision record exists.
9. **Wiki access/concurrency is still “to be verified.”** This is not a current blocker, but leaving it to the end creates avoidable critical-path risk. Verify read/write permission and record the publication workflow before PRD/UX work.
10. **Direct user-problem evidence is weak.** The audit identifies current jobs and gaps, but no fresh user research, product analytics, or frequency evidence has been collected. A candidate must not receive a “demonstrated user problem” pass from technical adjacency alone. Record evidence limitations; if existing owner feedback/history is insufficient, the correct outcome is defer or a bounded validation proposal.
11. **POC cleanup is not complete.** `graphify-synthetic-poc.md:99-101` confirms no process/hook and no tracked files, but temporary material remains scheduled for deletion. Close and log it.
12. **Final prototype and publication verification are not decomposed.** The tracker has one Wiki row and one delivery row, but the definition of done requires local prototype execution, desktop/mobile visual inspection, accessibility alternatives, gallery/review guide, link/privacy checks, normal Wiki history, fresh-clone/live verification, and a review-only PR.

### P2 — Control-quality improvements

13. `SOURCE_INVENTORY.md:9,17-20` is stale: targeted AI Brain history and Graphify product/docs/site/release/issues work are no longer simply pending/in progress.
14. `MASTER_EXECUTION_INDEX.md:21-30`, `TRACKER.md:6-10`, `Research-note.md:8-15`, and the assignment register statuses do not reflect completed source work or D-004 POC completion.
15. The latest Graphify running-log entry records only initialization. The completed audit wave, product research, POC decision, version-line conflict, CI/security caveat, and PM assessment are milestone/source-conflict triggers and should be appended now by the coordinator.
16. No explicit final consistency review ensures PRD v2, UX v2, prototype v2, and technical plan v2 use the same feature name, scope, edge/provenance/confidence contract, analytics, accessibility, rollout, and non-goals.

## Proposed shared-file changes for the coordinator

This assessment does not edit shared files. The coordinator should apply these changes in priority order.

### 1. `TRACKER.md`

- Mark AI Brain audit v1/source package **Complete** and Graphify product research source notes **Complete**; keep technical/security/license stream **In progress**.
- Split “Audit/research adversarial reviews and v2” into four rows: audit review, audit v2, research review, research v2.
- Split Opportunity shortlist into `v1`, `adversarial review`, `v2/frozen candidate packet`.
- Add Round 1, Round 2, Round 3, and Round 4 as separate rows with non-bypassable exit gates.
- Split council recommendation into `v1 after Round 2`, `Round 3 adversarial review`, and `v2/decision at Round 4`.
- Change downstream statuses to `Blocked by decision`, not merely `Gated`, and name the unlocking decision ID once created.
- Split Wiki work into package, validation, publication, and fresh-clone/live verification.
- Split delivery into final consistency/diff, prototype visual check if applicable, repository checks, commit/push, review-only PR, and final handoff.
- Replace “Current blockers: None” with the active dependency list below; classify Wiki permission and user-problem evidence as risks until they become blockers.

### 2. `MASTER_EXECUTION_INDEX.md`

- Link every existing audit/research/POC/council artifact, including this assessment; replace plain “in progress” labels with exact state.
- Add explicit v1 → review → v2 chains as three adjacent links for every major artifact.
- Add a stage-gate section showing the current allowed next action and the actions prohibited until decision.
- Require every final artifact to be reachable from this index before delivery.
- Keep `Explored / Proposed — not implemented` visible at the top and next to any selected-feature package.

### 3. `DECISION_LOG.md`

- Add **D-005: Artifact-chain and stop-rule protocol** — no major v2 without its review; no shortlist before audit/research v2; no charter/downstream work without recommendation v2 = go and eight passing gates.
- Add **D-006: Blind Round 1 protocol** — frozen candidate packet hash, identical rubric, no cross-reading or result sharing, declarations, manifest, and full restart if the packet materially changes.
- Amend or follow D-004 with cleanup disposition once temporary material is deleted; do not silently change the completed decision text.
- Add the final opportunity decision only during Round 4; do not pre-author a positive direction in shared controls.

### 4. `RISK_REGISTER.md`

- Update R-002 and R-007 with completed audit/discrepancy evidence but keep them open until candidate comparison/Wiki correction closes them.
- Add **R-012 (High): insufficient direct evidence of problem frequency/value**; mitigation: explicit evidence ledger, no pass from technical adjacency, defer if unproven.
- Add **R-013 (High): artifact or council gate bypass through compressed tracker rows**; mitigation: expanded non-bypassable rows and decision IDs.
- Add **R-014 (Medium): Wiki permission/concurrent update blocks or overwrites publication**; mitigation: early permission probe, fresh fetch, no force push, compare base, post-push clone/live check.
- Add **R-015 (Medium): shared artifact ownership collision**; mitigation: one owner per file and formal lock release before reviewer/v2 edits.
- Add **R-016 (High): proposed graph is published as implemented/live**; mitigation: mandatory classification in PRD, prototypes, index, Wiki, and PR.
- Add **R-017 (Medium): temporary POC artifacts outlive research**; mitigation: delete and record cleanup before final review.

### 5. `SOURCE_INVENTORY.md` and `Research-note.md`

- Mark AI Brain targeted history and Wiki/CI audit evidence complete with links to the five audit files.
- Mark Graphify product/capability/claims research and POC complete; keep security/privacy and license/dependency streams in progress until their owned artifacts land.
- Record upstream/local test distinctions and the Graphify version-line warning exactly once, then link rather than duplicate.
- Convert `Research-note.md` into the stable index for finalized audit v2, Graphify research v2, capability comparison, council recommendation v2, and any gated package.

### 6. Agent assignment register

- Mark the audit and product research assignments complete; set this project-management assessment complete.
- Preserve the technical/risk agent as in progress until all four promised source-note families exist.
- Add exact adversarial-review filenames and ownership.
- Add a Round 1 evaluator roster with one separate file per evaluator and blindness declaration.
- For a go decision only, add new product-manager, UX-designer, and technical-architect assignments. Each owns v1 and v2 in its directory; reviewer owns review; coordinator owns shared links and final consistency.

### 7. `RUNNING_LOG.md`

Append, do not edit, a new milestone entry now covering the completed audit/source research, D-004 POC, version/security conflicts, current blockers, files created, exact baselines, CI/test evidence, and next critical action. Do not wait until final handoff.

## Blocker, dependency, and owner list

| ID | Type | Condition | Owner | Unblock/close evidence |
|---|---|---|---|---|
| B-01 | Active dependency | Security/privacy, license/dependency, and technical-risk source notes not yet delivered | Graphify technical/risk specialist | All assigned artifacts present, cited, validated, and owner reports completion |
| B-02 | Active dependency | Canonical audit/research synthesis and adversarial reviewer not assigned | Coordinator | Named v1 synthesis files, reviewer assignment, review filenames, and tracker rows |
| B-03 | Gate risk | Demonstrated user-problem/frequency evidence may be insufficient | Product council + coordinator | Evidence ledger passes gate or decision is defer/no-go/validation POC |
| B-04 | Delivery risk | Wiki write permission/concurrency workflow unverified | Coordinator | Read/write probe, recorded base, no-force process, rollback/verification plan |
| B-05 | Cleanup dependency | Temporary Graphify POC material not confirmed deleted | Technical/risk specialist + coordinator | Cleanup command/result recorded; no retained process/hook/source/env/fixture/output |
| B-06 | Process dependency | Round 1 evaluator roster/frozen packet/manifest absent | Project manager + coordinator | D-006 accepted and Round 1 files assigned before invitations |

None currently requires user input. B-03 can legitimately lead to defer; B-04 becomes an external blocker only if the verified account cannot push the Wiki.

## Council-session plan

### Pre-council freeze

1. Finalize audit v2 and Graphify research v2 after their reviews.
2. Produce shortlist v1 with three to five materially distinct opportunities and every required opportunity-brief field.
3. Adversarially review shortlist v1; resolve/carry findings into shortlist v2.
4. Freeze shortlist v2 and common scoring rubric; record file SHA-256, candidate IDs/names, criterion definitions, and gate definitions in a submission manifest.

### Round 1 — blind independent evaluation

- Required independent perspectives: user value/engagement; memory/knowledge/trust; platform/data/architecture; security/privacy/licensing; UX/accessibility.
- Give each evaluator only the same frozen packet, source indexes, rubric, and its own destination file.
- Explicitly prohibit reading other Round 1 files or receiving intermediate conclusions.
- Each file must declare the packet hash, no other evaluation read, evidence, assumptions, criterion scores, confidence, recommendation, each gate status, and minority concerns.
- The coordinator must not publish or summarize any Round 1 conclusion until all required submissions are complete.
- If the candidate packet materially changes, invalidate every submission and rerun Round 1; do not patch scores selectively.

### Round 2 — comparative debate

- Reveal all recorded evaluations simultaneously.
- Build the 17-criterion matrix required by the goal: user value, problem frequency, product fit, improvement, discoverability, trust, technical feasibility, data readiness, privacy/security, performance, accessibility, implementation cost, maintenance cost, dependency risk, measurable success, reversibility, and extensibility.
- Record score rationales, not only totals. A low score or gate veto must remain visible.
- Create council recommendation v1 from the evidence and disagreements; it is a draft, not the decision.

### Round 3 — challenge/adversarial review

- Run the adversarial-review skill against recommendation v1.
- Answer every required challenge: real problem, Graphify necessity, duplication, simpler alternative, novelty versus durable value, relationship understandability/trust, misleading inference, privacy, operational and maintenance cost.
- Test all eight gates and call out any `Unknown`. Save a separate review report.

### Round 4 — decision

- Resolve or explicitly carry every Round 3 finding into recommendation v2.
- Record go/defer/no-go, gate table, disagreements, minority opinions, assumptions, risks, confidence, and decision owner/date.
- A candidate advances only if all eight gates are `Pass`. `Unknown`, missing evidence, or “pass with unowned remediation” is non-passing.
- Add the accepted decision to `DECISION_LOG.md`; only then change downstream tracker rows.

## Running-log triggers and cadence

The goal requires entries after the first hour, each major milestone, important decisions, major source conflicts, blockers/scope changes, final review, and handoff. Apply these concrete triggers:

| Trigger | Entry timing/content |
|---|---|
| Current evidence wave | **Append now:** audit source package, product research, POC/D-004, version-line and security-scan conflicts, PM assessment, current dependencies |
| Technical/risk stream complete | Append exact artifacts, license/security conclusions, tests, cleanup state, blockers |
| Audit/research v2 milestone | Append review dispositions, unresolved findings, approved sources for shortlist |
| Shortlist v2 freeze | Append candidate IDs, packet hash, rubric, Round 1 roster; do not include evaluator conclusions |
| Round 1 complete | Append submission manifest and blindness compliance; reveal only after all records are locked |
| Round 2/3 | Append matrix/debate disagreements, then adversarial findings and changed risks |
| Round 4 | Append decision, gate results, minority opinions, stop/go branch, decision-log ID |
| PRD/UX/technical v2, if go | One entry per major v2 milestone with review resolution and next gate |
| Blocker/scope change/source conflict | Append immediately; never rewrite older claims |
| Wiki publication | Append source package, Wiki base/commit, privacy/structure/link checks, fresh clone/live verification |
| Final review/handoff | Append diff/tests/visual checks, commit/push/PR, remaining risks, exact resume point |

## Delivery and definition-of-done checklist

### Always required

- [ ] Every required role has a recorded assignment, output, evidence requirement, and exclusive file ownership.
- [ ] Audit and research each have v1, adversarial review, and v2 linked from the master index and stable research entry point.
- [ ] Shortlist and recommendation each have explicit v1/review/v2 chains.
- [ ] Round 1 blindness and packet integrity are documented; all disagreements/minority opinions remain visible.
- [ ] Final decision has eight-gate evidence; no downstream work exists on defer/no-go.
- [ ] Every open review finding is resolved or carried into risk/blocker/open-question sections.
- [ ] Temporary POC environments, clones, fixtures, outputs, and processes are removed; no global install/hook/config exists.
- [ ] No production application code, dependency, merge, or deployment is included.
- [ ] All artifacts avoid secrets, private data, absolute local paths, and unsupported live claims.
- [ ] Master index reaches every artifact; internal links and stable entry-point links pass.
- [ ] Final diff excludes unrelated/user changes; working tree/branch/base are recorded.
- [ ] Applicable type/lint/test/build/docs/privacy/link checks pass or exact limitations are documented.
- [ ] Wiki pages retain `Explored / Proposed — not implemented`, current SHA/date, risks, open questions, and changelog.
- [ ] Wiki publication uses normal history: fresh fetch/base check, no force push, post-push fresh clone, byte/reachability/privacy checks, and live rendered verification.
- [ ] Focused commits are pushed and a **review-only** PR is opened with all required summaries/links; PR is not merged by this goal.
- [ ] Final report links worktree/branch, commits, PR, Wiki commit/pages, prototypes if any, and all major artifacts.
- [ ] Running log contains final review and handoff entries.

### Additional only on a go decision

- [ ] Feature charter is council-approved and tied to the accepted decision.
- [ ] PRD v2 carries the exact proposal classification and all required states/data/provenance/confidence/privacy/accessibility/analytics/acceptance criteria.
- [ ] UX v2 and prototype v2 reflect PRD v2 and include meaningful interaction, fictional data, desktop/mobile, loading/empty/error/partial/large-graph behavior, keyboard, reduced motion, and a non-visual list/table/path/explanation alternative.
- [ ] Prototype gallery/review guide exists; prototypes run locally without production changes or unnecessary external dependencies.
- [ ] Prototype v1 and v2 are opened and visually inspected at required desktop/mobile sizes; screenshots or review evidence are publication-safe.
- [ ] Technical plan v2 exactly matches PRD/UX v2 for scope, data/node/edge/provenance/confidence, APIs, lifecycle/deletion, performance, security, accessibility, tests, rollout/rollback, flag, dependency/license, observability, cost, and exit strategy.
- [ ] Final consistency matrix shows no contradiction among charter, PRD v2, UX v2, prototype v2, and technical plan v2.

## Coordinator handoff — prioritized actions

1. **Finish B-01 and close POC cleanup.** Accept the technical/security/license outputs; remove temporary POC material after synthesis; record completion.
2. **Refresh shared truth immediately.** Update tracker/index/source/risk/assignment statuses and append the current running-log milestone. The controls are already behind the artifacts.
3. **Name the canonical v1 packages and reviewer.** Create/assign audit and Graphify research v1 synthesis plus their separate adversarial-review reports and v2 outputs.
4. **Expand non-bypassable artifact/council rows.** Add D-005/D-006, v1/review/v2 rows, Round 1–4 exits, and explicit decision IDs.
5. **Do not start shortlist from incomplete or unreviewed source notes.** Wait for audit/research v2.
6. **Before Round 1, freeze and hash shortlist v2 and issue separate blind assignments.** No conclusions should be shared until the manifest is complete.
7. **Probe Wiki permission/concurrency early.** A read-only clone has been verified; establish write path without publishing unfinished material.
8. **At Round 4, enforce `Unknown = non-pass`.** Choose defer/no-go if user value, privacy, licensing, or exit evidence does not clear.
9. **On no-go/defer, stop downstream work. On go, assign new stage specialists sequentially.** Do not pre-create feature-specific PRD/UX/technical artifacts.
10. **Finish with reproducible publication and review-only delivery.** Validate artifacts/prototypes/Wiki/diff, update the log, push focused commits, and open—not merge—the PR.
