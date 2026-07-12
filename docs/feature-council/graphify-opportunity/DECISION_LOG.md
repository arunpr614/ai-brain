# Graphify Opportunity — Decision Log

## D-001 — Gated discovery before feature design

- **Date:** 2026-07-12
- **Status:** Accepted
- **Decision:** Audit AI Brain and validate Graphify before selecting or designing a feature. A no-go or defer outcome is valid.
- **Rationale:** Graph visualization is not itself evidence of a durable AI Brain user problem.

## D-002 — Isolated documentation-only worktree

- **Date:** 2026-07-12
- **Status:** Accepted
- **Decision:** Base all work on verified `origin/main` SHA `8c1341100b174fe4ca518e6a745c30b9078df21c` using branch `codex/research-graphify-feature-council`.
- **Rationale:** Preserves unrelated checkouts and prevents production application changes.

## D-003 — No direct Graphify installation during initial research

- **Date:** 2026-07-12
- **Status:** Accepted for Stage 2
- **Decision:** Inspect source, tests, documentation, and safe fixtures first. A pinned isolated proof of concept requires a recorded material decision benefit.
- **Rationale:** Avoids undeclared dependencies and global configuration changes.

## D-004 — Approve one isolated synthetic Graphify proof of concept

- **Date:** 2026-07-12
- **Status:** Completed
- **Decision:** Run Graphify `0.9.13` from exact source SHA `eec7a0183847cbdc8a87d92b233759a5204b89fe` in a temporary virtual environment against a fictional three-file TypeScript memory-map fixture. Use `--code-only`, clear the process environment, install no skill or hooks, and retain no generated artifacts in the repository.
- **Rationale:** Directly tests whether Graphify's default local abstraction maps personal-memory concepts or only the fixture's software structure, which materially informs build-versus-integrate.
- **Result:** The local parser produced a useful code graph but not a personal-memory knowledge graph. Direct integration remains unproven for AI Brain's core user problem.

## D-005 — Major-artifact chain and stop-rule protocol

- **Date:** 2026-07-12
- **Status:** Accepted
- **Decision:** Every major artifact requires v1, a separate adversarial-review report, and v2 with every actionable finding resolved or explicitly carried. Opportunity work cannot start before audit/research v2. Feature-specific charter/PRD/UX/technical work cannot start unless recommendation v2 records a go and all eight gates pass.
- **Rationale:** Prevents review or decision gates from being bypassed by compressed status rows.

## D-006 — Blind Round 1 protocol

- **Date:** 2026-07-12
- **Status:** Accepted
- **Decision:** Round 1 uses one frozen shortlist-v2 packet and rubric with recorded SHA-256. Each evaluator owns a separate file, declares the packet hash and that no other evaluation was read, and submits before any conclusion is revealed. A material packet change invalidates all submissions and restarts the round. Every gate is Pass, Fail, or Unknown; Unknown is non-passing.
- **Rationale:** Preserves independence, exposes real disagreement, and prevents manufactured consensus.

## D-007 — Close isolated Graphify research environments

- **Date:** 2026-07-12
- **Status:** Completed
- **Decision:** After canonical research v1 synthesis, delete every temporary Graphify clone, isolated runtime, fictional fixture, generated graph/output, scan report, and local installer artifact created by the research lanes. Retain only repository Markdown evidence. Keep the clean Wiki baseline clone because it is required for the separately authorized publication workflow.
- **Verification:** No Graphify-named temporary path or Graphify process remained; no listener, hook, skill, or global configuration was created.
- **Rationale:** Satisfies the research cleanup boundary and prevents source-derived or dependency state from outliving the evaluation.

## D-008 — Defer Graphify-inspired feature selection

- **Date:** 2026-07-13
- **Status:** Accepted / final for this goal
- **Decision:** Select no feature. Defer C-01 Retrieval Evidence Upgrade and C-02 Organization Hygiene. Reject C-03/FCP-004 Relationship Inspection for current selection and mark the historical FCP-004 implementation posture deferred. Keep Graphify production modes at no-go.
- **Evidence:** Five blind evaluations at frozen packet SHA-256 `05048a7a000ede70034bd06e0de05c70d0216b076c1d86dc545b3027f4355512`; Round 2 comparative matrix; Round 3 adversarial review; recommendation v2.
- **Gate result:** No feature has eight Pass gates. Demonstrated problem, advantage, feasibility, privacy/security, measurable outcome, and rollback remain Unknown for every feature as applicable.
- **Downstream effect:** Stop charter, PRD, UX/prototype, and technical implementation plan. Continue only documentation/Wiki, validation, commit/push, review-only PR, and handoff.
- **B-00:** Conditional evidence action only. It requires a separate start decision and natural-recurrence Step A; no concept/prototype is authorized.
- **Rationale:** Technical adjacency, Graphify capability, and prior FCP-004 approval do not establish current user value. Defer/no-go preserves trust, privacy, accessibility, lifecycle, cost, and reversibility gates without manufacturing consensus.

## Post-freeze integrity note

`DECISION_LOG.md` was a Round 1 packet input and is intentionally updated only after final recommendation v2. The exact frozen bytes remain reproducible at repository commit `bad4fbd2af6a480aa8c208324bbb23e7234990a2`; the current post-decision file is expected to have a different hash.
