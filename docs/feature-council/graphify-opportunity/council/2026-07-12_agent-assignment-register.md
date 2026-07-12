# Graphify Opportunity Council — Agent Assignment Register

## Coordinator agent

- **Scope:** Overall goal, worktree safety, delegation, artifact consistency, shared control files, decision resolution, final synthesis, Wiki, and delivery.
- **Questions:** Are sources current? Are claims properly labeled? Have gates and stop rules been enforced? Are artifacts consistent and publication-safe?
- **Expected output:** Integrated v1/review/v2 chains, council decision, final index, validated Wiki, and review-only pull request.
- **Evidence:** Git state, source inventory, reviewer reports, link and visual checks.
- **File ownership:** Shared control files and final synthesis artifacts only.

## Expert project manager

- **Scope:** Agenda, tracker quality, milestones, owners, blockers, decision discipline, council sessions, and running-log cadence.
- **Questions:** Is work correctly sequenced? Are owners and exits unambiguous? Are blockers and unresolved findings carried forward?
- **Expected output:** Project-management review and maintained operational controls.
- **Evidence:** Tracker, index, risk/decision logs, artifact status, agent reports.
- **File ownership:** A dedicated project-management assessment; shared-file changes applied by the coordinator.
- **Status:** Complete — `council/2026-07-12_project-management-assessment.md`.

## AI Brain audit specialist

- **Roles:** Product Manager — User Value and Engagement; Product Manager — AI Memory and Knowledge Management; QA/evidence reviewer for Stage 1.
- **Scope:** Current implemented-feature inventory and Wiki/code reconciliation.
- **Questions:** What is implemented? What knowledge/relationship primitives exist? What is duplicated or missing? Which claims lack code evidence?
- **Expected output:** Audit v1, traceability, architecture, relationship-capability, and discrepancy reports.
- **Evidence:** Current code, tests, schemas, config, repository docs, Wiki, and targeted history at the recorded baseline.
- **Destination:** `audit/`.
- **File ownership:** All five assigned Stage 1 files; no shared files.
- **Status:** Complete.

## Graphify product and knowledge-graph researcher

- **Role:** Expert project and knowledge-graph researcher.
- **Scope:** Product capability, graph behavior, target users, inputs/outputs, evidence, and claim validation.
- **Questions:** What does Graphify verifiably do? Which capabilities are claimed only? What are its product boundaries and limitations?
- **Expected output:** Product source note, capability inventory, and claims/evidence map.
- **Evidence:** Source, tests, docs, examples, releases/issues, and official website at exact SHA/date.
- **Destination:** `research/`.
- **File ownership:** Files prefixed `graphify-product-` and `graphify-capability-`.
- **Status:** Complete.

## Graphify technical/risk specialist

- **Roles:** Technical architect; Product Manager — Platform, Data, and Privacy; Security and privacy reviewer; Open-source and licensing reviewer.
- **Scope:** Architecture, model/external-service boundaries, threat model, dependency/license viability, adoption and exit strategy.
- **Questions:** How is Graphify built? What leaves the machine? What can fail or leak? Can AI Brain safely depend on or reuse it?
- **Expected output:** Architecture, security/privacy, licensing/dependency, and technical-risk source notes.
- **Evidence:** Source/tests/manifests/license/releases/issues at exact SHA/date.
- **Destination:** `research/`.
- **File ownership:** Files prefixed `graphify-architecture-`, `graphify-security-`, `graphify-license-`, and `graphify-technical-risk-`.
- **Status:** Complete.

## Adversarial reviewer — audit package

- **Role:** Independent adversarial reviewer using the `adversarial-review` skill.
- **Scope:** Challenge AI Brain audit v1 reality, staleness, status boundaries, omissions, test evidence, privacy, and fitness as council input.
- **Questions:** Are any capabilities overstated as reachable/live? Does the audit distinguish joins/similarity from a graph? Are Wiki corrections and validation limitations supported?
- **Expected output:** Timestamped review report beside `audit/2026-07-12_ai-brain-feature-audit_v1.md` with P0–P3 findings and exact v2 inputs.
- **Evidence:** Audit package, current code/tests/config/Wiki/CI, source inventory, goal gates.
- **File ownership:** Generated audit review report only.
- **Status:** Complete — `audit/AI_BRAIN_FEATURE_AUDIT_V1_ADVERSARIAL_REVIEW_2026-07-12_22-48-54_IST.md`.

## Adversarial reviewer — Graphify research package

- **Role:** Independent adversarial reviewer using the `adversarial-review` skill.
- **Scope:** Challenge canonical Graphify research v1, source claims, tests/security distinctions, license/dependency boundaries, POCs, AI Brain fit, and council readiness.
- **Questions:** Is direct-integration rejection supported? Are concept-reuse claims pre-deciding the feature? Are risk, maintenance, accessibility, and user-value Unknowns visible?
- **Expected output:** Timestamped review report beside `research/2026-07-12_graphify-research-note_v1.md` with P0–P3 findings and exact v2 inputs.
- **Evidence:** All Graphify source notes, POCs, comparison, exact source/test/CI/issues, audit v2, risks, and goal gates.
- **File ownership:** Generated Graphify research review report only.
- **Status:** Complete — `research/GRAPHIFY_RESEARCH_NOTE_V1_ADVERSARIAL_REVIEW_2026-07-12_23-05-43_IST.md`.

## QA/evidence reviewer — AI Brain audit v2

- **Role:** Independent QA and evidence reviewer.
- **Scope:** Verify that audit v2 closes the audit-v1 review findings, that coverage and lifecycle sidecars support the claims, and that the package is fit as technical/historical council input.
- **Questions:** Are omissions closed with evidence? Are status/value/runtime axes preserved? Do source paths and closure counts reconcile? Does any remaining issue block opportunity ideation?
- **Expected output:** `reviews/2026-07-12_ai-brain-audit-v2-qa-evidence-review.md` with pass/fail/unknown findings and an explicit readiness verdict.
- **Evidence:** Audit v1/review/v2, traceability, lifecycle matrix, surface closure ledger, source inventory, current code/Wiki/CI evidence.
- **File ownership:** The named review file only.
- **Status:** Complete — recheck appended to `reviews/2026-07-12_ai-brain-audit-v2-qa-evidence-review.md`; bounded-input verdict Pass, implementation/runtime/user-value Unknown/non-passing.

## Future assignments

- Opportunity-shortlist adversarial reviewer:
  - **Role:** Independent adversarial reviewer using the `adversarial-review` skill.
  - **Scope:** Challenge shortlist v1 for problem evidence, option independence, FCP-004 duplication, current-feature overlap, Graphify anchoring, simpler alternatives, trust/privacy/accessibility, metrics, feasibility, and selection readiness.
  - **Questions:** Are all four options meaningfully different and complete? Is the no-feature baseline fair? Does any brief smuggle in unavailable inputs, unsupported value, or a preferred outcome? What exact changes are required before packet freeze?
  - **Expected output:** Timestamped review report beside `council/2026-07-12_opportunity-shortlist_v1.md`, with P0–P3 findings, revised recommendations, acceptance criteria, and no-go gates.
  - **Evidence:** Shortlist v1, audit/research v2, QA review, FCP-004 package, lifecycle matrix, shared risks/decisions, and the user's 17 criteria/eight gates.
  - **Destination:** `council/` beside the target.
  - **File ownership:** Generated shortlist review report only; never edit shortlist v1/v2 or shared controls.
  - **Status:** Complete — `council/GRAPHIFY_OPPORTUNITY_SHORTLIST_V1_ADVERSARIAL_REVIEW_2026-07-12_23-39-27_IST.md`.
- Blind Round 1 roster — frozen packet `05048a7a000ede70034bd06e0de05c70d0216b076c1d86dc545b3027f4355512`. Every evaluator reads only manifest-listed files, applies the common 17-criterion/eight-gate rubric to B-00/C-01/C-02/C-03, declares blindness, and owns only the named file:
  - **User value and engagement:** Scope problem frequency, adoption, discoverability, measurable task/outcome value, and B-00 opportunity cost. Questions: which job is real/frequent; what beats current/minimal behavior; what evidence changes the decision? Output `council/round1/2026-07-12_user-value-engagement-evaluation.md`.
  - **Memory, knowledge, and trust:** Scope recall/sense-making, provenance, relationship meaning, correction, confidence, false authority, and manual intent. Questions: which option improves knowledge work; can evidence/path claims be understood and trusted? Output `council/round1/2026-07-12_memory-knowledge-trust-evaluation.md`.
  - **Platform, data, and architecture:** Scope data readiness, lifecycle, scale, feasibility, costs, observability, rollback, and extensibility. Questions: which MVP is credible in current stack; which assumptions are unavailable or unsafe? Output `council/round1/2026-07-12_platform-data-architecture-evaluation.md`.
  - **Security, privacy, and licensing:** Scope auth/owner boundary, consent, association privacy, telemetry, egress, dependencies/licenses/supply chain, deletion, and exit. Questions: which option can meet privacy/security/license gates; what is an absolute no-go? Output `council/round1/2026-07-12_security-privacy-licensing-evaluation.md`.
  - **UX and accessibility:** Scope entry/discoverability, task model, comprehension, empty/error/stale/no-path, keyboard/screen reader/zoom/reflow/reduced motion/mobile parity, and current-surface alternatives. Questions: which option helps a task without novelty; can it be accessible and simpler? Output `council/round1/2026-07-12_ux-accessibility-evaluation.md`.
- Round 3 recommendation adversarial reviewer:
  - **Role:** Independent adversarial reviewer using the `adversarial-review` skill.
  - **Scope:** Challenge recommendation v1, Round 2 synthesis, gate logic, B-00 evidence thresholds, defer/no-go boundary, FCP-004 disposition, minority case, stop rules, and downstream lock.
  - **Questions:** Is defer supported or merely conservative? Is Graphify necessary? Do current/minimum features suffice? Are relationship semantics understandable and trustworthy? Could privacy/operating cost outweigh value? Are score aggregation, disagreement, Unknown handling, and FCP-004 status accurate? What exact corrections are required for final v2?
  - **Expected output:** Timestamped adversarial review beside `decisions/2026-07-13_council-recommendation_v1.md`, with P0–P3 findings, missing validation, revised recommendation, gate challenge, v2 inputs, acceptance, and no-go gates.
  - **Evidence:** Recommendation v1, Round 2 debate, five Round 1 submissions, frozen packet, user brief, risks/decisions, and prior FCP-004 package.
  - **Destination:** `decisions/` beside the target.
  - **File ownership:** Generated review report only; do not edit recommendation v1/v2 or shared controls.
  - **Status:** Complete — `decisions/COUNCIL_RECOMMENDATION_V1_ADVERSARIAL_REVIEW_2026-07-13_00-43-03_IST.md`.
- Expert product manager: after an approved charter only.
- Expert UX/UI designer: after PRD v2 only.
- Expert technical architect: after UX/UI v2 only.
