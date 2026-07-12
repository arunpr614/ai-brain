# Graphify Opportunity — Tracker

| Stage | Owner | Status | Evidence / exit gate |
|---|---|---|---|
| Worktree and baseline | Coordinator | Complete | Clean worktree from verified `origin/main` SHA |
| Shared controls and logging | Coordinator / project manager | In progress | Index, tracker, decision log, source inventory, risk register, running log |
| AI Brain live-feature audit v1 | AI Brain audit specialist | Complete | Five evidence artifacts; protected CI and Wiki baseline verified |
| Graphify source research | Research specialists | Complete | Product/capability/claims plus architecture/security/license/risk notes; all-extras tests and POCs recorded |
| Canonical Graphify research note v1 | Coordinator | Complete | Product, technical, risk, license, POC, and AI Brain comparison synthesized |
| AI Brain audit adversarial review | Adversarial reviewer | Complete | Skill report beside canonical audit v1 |
| AI Brain audit v2 | Coordinator | Complete | Prior FCP-004 delta, semantic-event/lifecycle, multi-axis status, security, and closure ledger added |
| Graphify research adversarial review | Adversarial reviewer | Complete | Skill report beside canonical research v1; three P1s and scoped P2/P3 inputs recorded |
| Graphify research note v2 | Coordinator | Complete | FCP-004 reconciliation, mode matrix, neutral option frame, scoped risk evidence, and review closure ledger |
| AI Brain audit v2 QA/evidence review | Independent QA reviewer | Complete | Recheck passed audit as bounded technical/historical council input; implementation/runtime/user-value remain Unknown/non-passing |
| Opportunity shortlist v1 | Product council / coordinator | Complete | Four distinct briefs plus no-feature baseline; required fields and FCP-004 deduplication included |
| Opportunity-shortlist adversarial review | Adversarial reviewer | Complete | Skill report required a first-class defer option, independent job families, exact rubric/gates, minimum-change comparators, and hypotheses |
| Opportunity shortlist v2 | Coordinator | Complete | B-00 plus C-01–C-03 independent decisions; C-03 variants nested; all findings resolved |
| Frozen Round 1 packet | Coordinator | Complete | 14-file manifest; common rubric; combined SHA-256 `05048a7a…5512` |
| Round 1 — blind independent evaluations | Five independent perspectives | Complete | Five separate hash-valid declarations/submissions; no conclusion sharing |
| Round 2 — comparative debate | Council / coordinator | Complete | 17-criterion score matrix, eight-gate consensus, disagreements, minority cases, and validations preserved |
| Council recommendation v1 | Coordinator | Complete | Defer; B-00 bounded evidence posture; C-01/C-02 defer; C-03 current no-go |
| Round 3 — recommendation adversarial review | Adversarial reviewer | Complete | Four P1 and scoped P2/P3 corrections required for a decision-safe Defer |
| Round 4 — recommendation v2 / final decision | Council / coordinator | Complete | **Defer feature selection**; exact gates/Unknowns preserved; B-00 conditional and two-step |
| Selected-feature charter | Council | Stopped by Defer | No candidate has eight Pass gates |
| PRD v1/review/v2 | New product manager / adversarial reviewer | Stopped by Defer | Not authorized |
| UX and prototypes v1/review/v2 | New UX designer / adversarial reviewer | Stopped by Defer | Not authorized; candidate comparison requires a future separate council decision |
| Technical plan v1/review/v2 | New technical architect / adversarial reviewer | Stopped by Defer | Not authorized |
| Final cross-artifact consistency review | Coordinator / QA | In progress | Audit/research/candidates/decision/Wiki/status/stop rules agree |
| Wiki publication package | Coordinator / QA | Pending | Publication-safe current/proposed classification and changelog |
| Wiki validation/publication/verification | Coordinator / QA | Pending | Privacy/link/structure, fresh base, normal push, fresh clone/live pages |
| Repository validation and diff review | Coordinator / QA | Pending | Artifact reachability, privacy, links, checks, visuals if go, unrelated changes excluded |
| Commit and push | Coordinator | Pending | Focused commits on dedicated branch |
| Review-only PR and final handoff | Coordinator | Pending | PR opened, not merged; final index/log/report complete |

## Agent file ownership

- Coordinator: shared control files, cross-artifact synthesis, Wiki package, and delivery. A stage-specific specialist owns its v1/v2 files when explicitly assigned.
- AI Brain audit specialist: `audit/` only during the first research wave.
- Graphify product/knowledge-graph researcher: `research/` files prefixed `graphify-product-` or `graphify-capability-`.
- Graphify technical/security/licensing researcher: `research/` files prefixed `graphify-architecture-`, `graphify-security-`, or `graphify-license-`.
- Adversarial reviewer: only the generated review report; never the target or its v2.
- No two agents may edit the same artifact simultaneously.

## Current blockers

No unavoidable external blocker. Direct user-problem frequency evidence is limited and may legitimately force defer. Temporary Graphify research state is cleaned under D-007. The local worktree showed an unresolved dependency-import failure, but exact-baseline protected CI is authoritative. Wiki read access and repository admin access are verified; concurrency-safe write/push will be exercised only with finalized pages.
