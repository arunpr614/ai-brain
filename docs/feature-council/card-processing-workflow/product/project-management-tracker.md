# Card Processing Workflow — Project Management Tracker

**Program type:** discovery, product definition, architecture planning, and throwaway prototype validation
**Updated:** 2026-07-11 IST
**Repository:** `arunpr614/ai-brain`
**Branch:** `concept/card-processing-workflow`
**Baseline:** `1cb5d36`; `origin/main` is an ancestor; worktree was clean when this tracker was created
**Accountable role:** Feature Council Coordinator
**Current phase:** M1 — evidence-backed discovery
**Release status:** Not implemented; not a production release candidate

## 1. Operating contract

This council will define and validate a dedicated workflow for processing captured cards through **Inbox → To Do → In Progress → Done**, with archive handled as a separate lifecycle concern unless repository evidence justifies another model. Workflow status, user tags, AI-generated category tags, and archive state must remain distinct in every artifact.

The council is authorized to research, write specifications, compare directions, and create high-fidelity throwaway HTML prototypes. It is not authorized to change the production application, production schema, production data, deployment configuration, or APK. A prototype is review evidence, not shipped behavior.

The governing feature brief is `/Users/arun.prakash/.codex/attachments/514e46ef-5f1a-4e64-9a0d-8e33e8c20f2e/goal-objective.md`. Repository rules are in `AGENTS.md`. Current behavior must be supported by code or documentation evidence, not memory.

## 2. Evidence baseline

| Evidence | Why it matters | Required use |
|---|---|---|
| `AGENTS.md` | Repository-specific constraints | Apply throughout; no APK work is in scope |
| `RUNNING_LOG.md` | Current repository state and handoff convention | Coordinator appends milestone snapshots; artifact authors do not race-edit it |
| `docs/feature-council/PROJECT_TRACKER.md` | Established milestone/risk/log convention | Reuse evidence-based exit gates and hourly/milestone logging |
| `docs/feature-council/note-focus-mode/PROJECT_TRACKER.md` | Recent feature-council gate precedent | Reuse explicit non-negotiable gates and role ownership |
| `docs/feature-council/note-focus-mode/DECISION_LOG.md` | Decision-record precedent | Record decisions with stable IDs, rationale, and consequences |
| `src/db/migrations/001_initial_schema.sql` and `src/db/migrations/020_recall_sync.sql` | Current item/tag schema | Prove whether workflow/archive fields exist before proposing migration strategy |
| `src/db/items.ts` | Current Library query/filter behavior | Preserve or deliberately revise pagination, filtering, and item access contracts |
| `src/db/tags.ts` | Manual/auto tag distinction | Prevent workflow state from being modeled as a tag |
| `src/app/library/page.tsx` and `src/components/library-list.tsx` | Existing Library experience | Define parity, differences, shared detail behavior, counts, and filter semantics |
| `src/components/sidebar.tsx` and `src/components/sidebar-routing.ts` | Current navigation architecture | Support naming and placement recommendation |
| `src/app/capture-actions.ts`, `src/components/share-handler.tsx`, and ingestion modules | Capture entry points | Establish complete Inbox-default coverage and duplicate/error behavior |
| `src/app/items/[id]/page.tsx` and `src/components/manual-note-editor.tsx` | Existing detail/notes/trust behavior | Preserve card-detail, note durability, failure, and return-state expectations |

Evidence citations in council artifacts must use repository-relative paths and, where a conclusion depends on code, a symbol or line reference. Claims about absent behavior require a documented search scope.

## 3. Roles and decision rights

| Role | Accountable for | Decision right | Required handoff |
|---|---|---|---|
| Feature Council Coordinator | Scope, sequencing, integration, conflict resolution, status, final handoff | Accepts gates and owns the canonical tracker/log state | Integrated package, gate record, final status |
| Expert Project Manager | Milestones, dependencies, risks, blockers, artifact completeness, definition of done | Escalates scope/gate failures; does not choose product behavior alone | This tracker and status recommendations |
| Product Lead | User problem, naming/navigation, workflow semantics, archive policy, metrics, rollout/backfill hypotheses | Recommends product direction; proposes product decisions | Product brief, alternatives, recommendation |
| UX/UI Lead | Kanban/list interactions, responsive behavior, detail continuity, accessibility, failure/empty/loading states | Recommends interaction model within product contract | UX directions, high-fidelity prototype, UX rationale |
| Technical Architect | Data model, APIs, transitions, concurrency, ordering, migration/backfill, analytics feasibility | Can block infeasible or unsafe contracts | Architecture options and implementation plan only |
| Repository Researcher | Current code, wiki, prior artifacts, ingestion paths, analytics/design conventions | Certifies evidence coverage; cannot infer desired behavior from current code | Source inventory and current-state audit |
| Prototype Owner | Builds disposable HTML demonstrations from accepted direction | Chooses prototype mechanics, not production architecture | Runnable HTML, viewport/state index, usage note |
| Accessibility/QA Reviewer | Keyboard alternatives, semantics, responsive/reflow, state and acceptance coverage | Can fail G4/G5 for inaccessible or untestable behavior | Review matrix with pass/fail/evidence |
| Adversarial Reviewer | Finds contradictions, data-loss paths, unsupported claims, and scope creep | Can fail G5 for unresolved P0/P1 findings | Prioritized review and dispositions |
| User/Feature Sponsor | Reviews the recommended package | Approves exploration outcome; implementation remains a separate authorization | Review feedback or explicit acceptance |

### RACI shorthand

- **A (accountable):** Feature Council Coordinator for every milestone and the final package.
- **R (responsible):** the role named as owner in the milestone/artifact tables.
- **C (consulted):** Product, UX, Technical, and QA must cross-review any contract that affects their lane.
- **I (informed):** all council roles through the tracker, decision records, and milestone running-log entries.
- No contributor may mark their own cross-functional gate accepted without the named reviewer evidence.

## 4. Milestone plan

Statuses are `Not started`, `In progress`, `Blocked`, `Ready for review`, or `Complete`. `Complete` requires the listed exit evidence, not merely a drafted file.

| ID | Milestone | Owner (R) | Depends on | Exit condition | Status |
|---|---|---|---|---|---|
| M0 | Isolated source baseline | Coordinator + Repository Researcher | None | Origin, clean worktree, branch, latest-main ancestry, repository rules, project/wiki roots recorded; no production edits | Complete |
| M1 | Current-state and evidence audit | Repository Researcher | M0 | Code, docs, wiki, Library, capture/ingestion, detail, tags/categories, search/filter, navigation, schema, archive, analytics, responsive patterns, and prior artifacts are cited; evidence gaps are explicit | In progress |
| M2 | Product and UX direction exploration | Product Lead + UX/UI Lead | M1 | At least three materially distinct directions cover naming/navigation, Inbox, workflow, Kanban/list, filters, metrics, completion/archive, detail, trust, mobile, and accessibility; evaluation criteria are weighted and explicit | Not started |
| M3 | Technical options and feasibility | Technical Architect | M1, candidate directions from M2 | At least two viable data/lifecycle approaches compare migration/backfill, ordering, concurrency, API, failure, analytics, scale, rollback, and restoration; unsafe options are rejected with reasons | Not started |
| M4 | Council convergence and v1 contract | Coordinator + Product Lead | M2, M3 | One recommendation and one fallback are selected; open questions are classified; product, UX, and technical v1 artifacts agree on terms, states, actions, counts, filters, metrics, archive, and detail behavior | Not started |
| M5 | High-fidelity throwaway prototypes | UX/UI Lead + Prototype Owner | M4 | Desktop and mobile prototypes demonstrate Kanban/list switching, state changes plus non-drag alternative, combined filters, counts/metrics, detail/notes continuity, archive/restore, and loading/empty/error/conflict behavior; prototype disclaimer is visible | Not started |
| M6 | Structured validation and adversarial review | Accessibility/QA + Adversarial Reviewer | M4, M5 | Scenario, responsive, keyboard, screen-reader-structure, failure, consistency, and prototype QA completed; every P0/P1 finding has a recorded disposition and owner | Not started |
| M7 | V2 recommendation and implementation-ready plan | Coordinator + Product + UX + Technical | M6 | V2 artifacts resolve accepted findings; acceptance criteria and phased implementation/test/rollout plan are traceable; no production code is changed | Not started |
| M8 | Discovery closeout and sponsor handoff | Coordinator | M7 | Artifact links resolve, decisions and risks are current, exact DoD is checked, running log is appended, final report states “exploration only / not implemented,” and sponsor review package is ready | Not started |

### Milestone sequencing rule

Research may proceed in parallel by lane, and M2/M3 may overlap after the relevant M1 evidence is available. No prototype may become the recommended direction before G3. No v2 or closeout may bypass review dispositions. No implementation, migration, deployment, or production mutation is a milestone in this council.

## 5. Dependency register

| ID | Dependency | Needed by | Owner | Ready when | If late |
|---|---|---|---|---|---|
| DEP-01 | Verified current repository baseline | All | Coordinator | M0 evidence is recorded and tree remains free of unintended production edits | Stop and reconcile worktree; do not overwrite other work |
| DEP-02 | Current code and repository-doc audit | M2–M4 | Repository Researcher | Evidence covers every source area named in the objective | Mark affected conclusions as hypotheses; G1 cannot pass |
| DEP-03 | Existing wiki and prior feature-council audit | M2, M4 | Repository Researcher | Applicable pages/artifacts are inventoried with freshness/conflict notes | Do not treat repository docs as a complete cross-system record |
| DEP-04 | Stable product vocabulary | M3–M7 | Product Lead | Workflow state, processing event, completion, archive, restore, tag, and AI category each have one definition | Technical/UX work may explore but cannot freeze contracts |
| DEP-05 | Capture-path inventory | M3, M7 | Repository Researcher + Technical | Every create/ingestion route has a proposed Inbox-default rule and exception policy | Backfill/default proposal remains incomplete |
| DEP-06 | Archive and migration hypothesis | M4–M7 | Product + Technical | Preservation/restoration/history behavior and existing-card treatment are decided | Block recommendation; data-loss risk remains P0 |
| DEP-07 | View/filter/count contract | M5–M7 | Product + UX + Technical | Filter algebra, count scope, persistence, pagination/virtualization, and view parity agree | Prototype must label unresolved behavior rather than imply it |
| DEP-08 | Prototype state fixtures | M5–M6 | UX + Prototype Owner | Representative normal, empty, filtered, large-backlog, failed, conflict, and archive states exist without private data | G4 fails; visual review is not representative |
| DEP-09 | Review capacity and disposition owners | M6–M8 | Coordinator | QA and adversarial reviewers are assigned and findings have owners/due milestone | Do not self-certify closeout |

## 6. Blockers and escalation

### Current blockers

None recorded as of 2026-07-11. M1 evidence collection is active. Unknowns are not blockers until they prevent a milestone exit.

### Blocker threshold

Record an item as a blocker when it prevents a gate, threatens content/history loss, makes a core requirement infeasible, creates an unresolvable cross-artifact contradiction, or requires authority outside this discovery scope. Every blocker must include:

- `BLK-###`, date/time IST, reporter, affected milestone and gate;
- evidence and impact, not only a symptom;
- owner, safe next action, and resolution condition;
- whether work can continue in another lane;
- linked decision/risk if applicable.

P0 blockers stop all dependent work. P1 blockers stop the affected gate. P2/P3 issues stay in the risk/finding register unless they meet the threshold above. The Coordinator updates status within the same work period and escalates only sponsor-authority or scope-expansion decisions; routine product ambiguity is handled as a documented hypothesis.

## 7. Risk register

Likelihood and impact use `Low / Medium / High`. Priority is `P0` (existential/data loss), `P1` (gate/recommendation integrity), `P2` (quality/efficiency), or `P3` (polish).

| ID | Risk | L | I | Pri | Owner | Mitigation / trigger | Contingency |
|---|---|---:|---:|---:|---|---|---|
| R-01 | Workflow status is conflated with manual or AI tags | M | H | P0 | Product + Technical | Explicit four-concept model in every contract; schema and tag evidence review | Reject the affected direction and revise model before G3 |
| R-02 | Archive design destroys status/history or makes restoration ambiguous | M | H | P0 | Product + Technical | Compare separate lifecycle attribute vs terminal status; specify restore target and audit history | Block G3/G6; prefer reversible separate archive state |
| R-03 | Existing-card backfill causes a misleading or overwhelming Inbox | H | H | P1 | Product | Quantify options and test staged/no-backfill/first-seen alternatives | Recommend explicit migration choice with safe opt-in or phased behavior |
| R-04 | One or more capture/ingestion paths bypass Inbox defaults | H | H | P1 | Research + Technical | Inventory web, share, Telegram, Recall/import, note/PDF, and duplicate paths | Gate implementation plan on a path-by-path matrix |
| R-05 | “Processed” metrics become vanity or contradict event semantics | H | M | P1 | Product | Define event, time zone, undo/reversal, archive inclusion, and today/week boundaries | Remove ambiguous metric from v1 recommendation |
| R-06 | Optimistic move/archive loses intent under failure or concurrent updates | M | H | P0 | Technical + UX | Define version/conflict contract, retry/rollback/undo behavior, visible pending/error states | Require pessimistic fallback or explicit reconciliation before implementation |
| R-07 | Drag-and-drop excludes keyboard, touch, or assistive-technology users | H | H | P1 | UX + Accessibility | First-class move action/menu, focus behavior, announcements, target sizes, and mobile pattern | Fail G4/G5 until a complete non-drag path exists |
| R-08 | Kanban becomes unusable for large backlogs or narrow screens | H | M | P1 | UX + Technical | Define mobile default, column counts, pagination/virtualization, scroll/state preservation | Use list-first mobile or scoped column view in recommended v1 |
| R-09 | Library and Workflow duplicate or diverge in filters/detail behavior | M | H | P1 | Product + UX | Explicit relationship matrix and shared-behavior inventory | Narrow workflow actions; reuse existing detail/filter conventions where safe |
| R-10 | Prototype is mistaken for implemented or production-ready behavior | M | H | P1 | Coordinator + Prototype Owner | Persistent throwaway disclaimer and final “not implemented” statement; no production imports | Remove misleading claims and fail closeout until corrected |
| R-11 | Scope expands into assignees, due dates, sprints, dependencies, or team PM | M | M | P1 | PM + Product | Maintain non-goals; require evidence and sponsor authorization for expansion | Park ideas in future considerations without prototype investment |
| R-12 | Wiki/repository evidence is stale or conflicts with current code | H | M | P1 | Repository Researcher | Code is current-behavior source of truth; annotate freshness and conflicts | Preserve both claims, prefer code, create decision/open question |
| R-13 | Multiple authors overwrite tracker, decision, or running-log state | M | M | P1 | Coordinator | One canonical owner per shared artifact; append-only decisions/log; authors return log-ready summaries | Restore from Git, reconcile openly, and re-run link/consistency review |
| R-14 | Filtered counts or metrics silently mix filtered and total populations | H | M | P1 | Product + UX + Technical | Label and specify count scope for columns, backlog, and metrics | Default to visibly filtered counts plus separately labeled totals if justified |
| R-15 | Archive/search/Library behavior hides content unexpectedly | M | H | P1 | Product + Technical | Specify inclusion in Library, search, Ask, metrics, export, and archive view | Block G3 until discoverability and restoration are unambiguous |
| R-16 | Notes or board position are lost when opening/returning from detail | M | H | P1 | UX + Technical | Define route/drawer choice, save contract, scroll/filter/column preservation | Use existing detail route with explicit restoration state until safer option is proven |

Risk owners review the register at every gate. Any increased P0/P1 risk must be logged in the same work period and linked to a finding or decision.

## 8. Decision-record discipline

The canonical council decision register is `docs/feature-council/card-processing-workflow/decisions/decision-log.md`; if individual records are used, the register must link them and remains the index.

### Record format

Every decision uses a stable ID `CPW-DR-###` and contains:

1. title and status: `Proposed`, `Accepted`, `Rejected`, `Deferred`, or `Superseded`;
2. decision owner, consulted roles, decision date IST, and target milestone;
3. question/context and cited evidence;
4. at least two credible options, or a note explaining why only one is viable;
5. decision and rationale tied to evaluation criteria;
6. consequences, risks, accessibility/data implications, and implementation assumptions;
7. validation evidence and unresolved follow-ups;
8. supersedes/superseded-by links and an explicit reopen trigger.

### Required decision topics

- name, navigation placement, and relationship to Library;
- workflow-state definitions, allowed backward/forward transitions, undo, and bypass rules;
- treatment of every new-card path and existing-card migration/backfill;
- archive model, archive eligibility, restore target, and cross-product visibility;
- ordering/prioritization, concurrency/versioning, optimistic failure, and offline policy;
- Kanban/list parity, view/filter/scroll persistence, scale strategy, and mobile default;
- combined manual-tag/AI-category filter algebra and count semantics;
- exact definitions for “processed,” “completed,” today/week, and reversals;
- card-detail presentation and return-state/note-durability contract;
- analytics/privacy boundary and recommended rollout/rollback strategy.

No artifact may silently override an accepted decision. Proposed changes must add a new record that supersedes the old one. Rejected and deferred options stay in the register so the council does not relitigate them without a reopen trigger.

## 9. Artifact tracker

Paths are canonical targets; if an author selects a more specific filename, the Coordinator updates this table and all inbound links before the next gate. `Draft` means present but not gate-accepted.

| ID | Artifact | Canonical path | Owner | Depends on | Gate | Status |
|---|---|---|---|---|---|---|
| A-00 | Project management tracker | `product/project-management-tracker.md` | Expert Project Manager | M0 | G0 | Complete |
| A-01 | Repository and current-state audit | `research/current-state-audit.md` | Repository Researcher | M0 | G1 | Not started |
| A-02 | Wiki/prior-artifact/source inventory | `research/source-inventory.md` | Repository Researcher | M0 | G1 | Not started |
| A-03 | Problem framing, users, jobs, and success criteria | `product/product-brief.md` | Product Lead | A-01, A-02 | G2 | Not started |
| A-04 | Direction comparison and recommendation | `product/direction-comparison.md` | Product + UX | A-03 | G2/G3 | Not started |
| A-05 | UX directions and interaction contract | `ux/ux-directions.md` | UX/UI Lead | A-01, A-03 | G2/G3 | Not started |
| A-06 | Architecture options and feasibility | `technical/architecture-options.md` | Technical Architect | A-01, A-03 | G3 | Not started |
| A-07 | Canonical decision register | `decisions/decision-log.md` | Coordinator | A-04–A-06 | G3–G6 | Not started |
| A-08 | Integrated product requirements v1 | `product/product-requirements-v1.md` | Product + Coordinator | A-04–A-07 | G3 | Not started |
| A-09 | Integrated UX specification v1 | `ux/ux-specification-v1.md` | UX/UI Lead | A-04–A-08 | G3 | Not started |
| A-10 | Technical plan v1 | `technical/technical-plan-v1.md` | Technical Architect | A-04–A-09 | G3 | Not started |
| A-11 | Throwaway prototype index | `prototypes/index.html` | Prototype Owner | A-08–A-10 | G4 | Not started |
| A-12 | Prototype state/viewport coverage notes | `prototypes/README.md` | Prototype Owner + QA | A-11 | G4 | Not started |
| A-13 | Accessibility and scenario QA | `reviews/qa-review.md` | Accessibility/QA | A-08–A-12 | G5 | Not started |
| A-14 | Adversarial review | `reviews/adversarial-review.md` | Adversarial Reviewer | A-08–A-13 | G5 | Not started |
| A-15 | Review finding dispositions | `reviews/review-disposition.md` | Coordinator + finding owners | A-13, A-14 | G5 | Not started |
| A-16 | Product/UX/technical v2 package | `product/final-recommendation.md` plus linked `ux/` and `technical/` v2 artifacts | Coordinator + lane leads | A-15 | G6 | Not started |
| A-17 | Final discovery handoff | `FINAL_HANDOFF.md` | Coordinator | A-00–A-16 | G6 | Not started |

Artifact authors must not mark `Complete` themselves when a cross-functional gate is required. The Coordinator marks completion after verifying the path, content, review evidence, and inbound links.

## 10. Review gates

| Gate | Timing | Required reviewers | Pass evidence | Hard fail conditions |
|---|---|---|---|---|
| G0 — Isolation and scope | End M0 | Coordinator + PM | Correct origin/branch/latest-main ancestry, clean baseline, rules read, target directory only | Dirty/incorrect base, unrelated work at risk, or production change in scope |
| G1 — Evidence sufficiency | End M1 | Research + Product + Technical | Objective evidence areas covered, code/docs/wiki conflicts noted, gaps and assumptions labeled | Desired behavior presented as current; missing ingestion/schema/navigation evidence |
| G2 — Direction quality | End M2 | Product + UX + PM | Three materially distinct options, explicit criteria/trade-offs, no premature winner, core questions covered | Cosmetic variants only; scope creep into generic team PM; accessibility/mobile omitted |
| G3 — Council convergence | End M4 | Product + UX + Technical + Coordinator | Accepted decisions and v1 artifacts use one vocabulary and agree on every shared behavior | Status/tag/archive conflation; undefined migration, metrics, failure, restore, or count semantics |
| G4 — Prototype readiness | End M5 | UX + Accessibility/QA + Product | Desktop/mobile, Kanban/list, non-drag movement, filters/counts, detail/notes, archive, and trust states demonstrated | Prototype disclaimer absent; keyboard path missing; static happy path presented as complete |
| G5 — Validation and adversarial | End M6 | QA + Adversarial Reviewer + lane owners | Traceable scenario matrix; all P0/P1 findings fixed, accepted with rationale, or block closeout | Self-review only; unsupported implementation claims; unresolved P0/P1 contradiction/data-loss path |
| G6 — Final handoff | End M8 | Coordinator + PM; sponsor receives package | V2 consistency, links, decisions, risks, DoD, log, and “not implemented” status verified | Production files changed; broken canonical links; decision/finding drift; incomplete DoD |

Gate outcomes are `PASS`, `PASS WITH FOLLOW-UPS`, or `FAIL`. P0/P1 findings cannot be deferred under `PASS WITH FOLLOW-UPS`. Record the gate, timestamp, reviewers, evidence links, exceptions, and next milestone in the review disposition or final handoff.

## 11. Running-log cadence and ownership

`RUNNING_LOG.md` is append-only and has one writer: the Feature Council Coordinator. This artifact does not update it. Other roles submit concise log-ready bullets to the Coordinator to avoid concurrent edits.

Append a new timestamped IST entry:

- after M0 and after every later milestone reaches a gate outcome;
- after one hour of active council work since the last entry, even if a milestone remains open;
- immediately when a P0/P1 blocker appears, clears, or materially changes;
- when an accepted decision materially changes scope, data behavior, or the recommended direction;
- before a session/handoff ends if another agent needs a reliable continuation state;
- at final discovery closeout.

Each entry must include, as applicable: `Planned since last entry`, `Done`, `Cross-lane notes`, `Learned`, `Deployed / Released`, `Documents created or updated this period`, `Verification`, `Current remaining to-do`, `Open questions / decisions needed`, `Session self-critique`, `Action items for the next agent`, and `State snapshot`.

For this council, `Deployed / Released` must say **None — discovery/prototype only** unless the user separately authorizes a later implementation goal. The state snapshot must identify the baseline/branch, current milestone/gate, blockers, accepted decisions, highest risks, and next action. Never rewrite past entries to make current state appear cleaner.

## 12. Exact definition of done

The discovery council is done only when every applicable item below is checked by the Coordinator. `N/A` requires a written reason and reviewer acceptance; silence is not `N/A`.

### Baseline and evidence

- [ ] DOD-01 Origin is `arunpr614/ai-brain`, the dedicated branch/worktree baseline is recorded, and unrelated user changes are preserved.
- [ ] DOD-02 `AGENTS.md`, the goal objective, repository docs, current `RUNNING_LOG.md`, and relevant feature-council precedents were reviewed.
- [ ] DOD-03 Current code evidence covers Library, every known card creation/ingestion path, card detail/notes, tags and AI categories, search/filtering, navigation, schemas, archive behavior, analytics, and responsive/design patterns.
- [ ] DOD-04 Wiki and prior-plan/prototype evidence is inventoried, freshness is recorded, and conflicts with code are explicit.
- [ ] DOD-05 Every current-state claim and every claimed absence has a cited path/search scope; assumptions and unknowns are labeled.

### Product direction

- [ ] DOD-06 At least three materially distinct product/UX directions were evaluated against explicit weighted criteria.
- [ ] DOD-07 The selected name, navigation placement, importance, and relationship to Library are decided.
- [ ] DOD-08 Inbox default behavior is specified for every create/ingestion path, duplicates, bypass, returns, and failures.
- [ ] DOD-09 Existing-card treatment is decided with migration/backfill trade-offs and a safe rollout hypothesis.
- [ ] DOD-10 Inbox, To Do, In Progress, and Done each have precise entry/exit semantics and permitted forward/backward transitions.
- [ ] DOD-11 Workflow status, manual tags, AI category tags, and archive state are modeled and described as separate concepts.
- [ ] DOD-12 Completion, archive eligibility, auto-vs-manual archive, batch behavior, undo, restore, restore target, and active/archive visibility are decided.
- [ ] DOD-13 “Processed,” “completed,” today, and week are event/time-zone/reversal precise; every recommended metric has an operational user value.
- [ ] DOD-14 Explicit non-goals prevent expansion into assignees, due dates, sprints, team dependencies, or generic project management.

### Interaction and experience

- [ ] DOD-15 Kanban and list views have action parity, a view-preference rule, and filter/scroll/selection preservation rules.
- [ ] DOD-16 Drag-and-drop has a complete accessible alternative, keyboard behavior, focus management, announcements, touch targets, and error recovery.
- [ ] DOD-17 Manual-tag and AI-category filters have defined AND/OR algebra, empty/untagged behavior, persistence, active-state communication, and clear/reset behavior.
- [ ] DOD-18 Column counts, Inbox backlog, and summary metrics state whether they reflect filtered or total cards and cannot be mistaken for one another.
- [ ] DOD-19 Large-backlog pagination/virtualization and the mobile board/list pattern are decided, including narrow viewport and zoom behavior.
- [ ] DOD-20 Card-detail presentation, status changes, note editing/durability, return behavior, filters, column position, and scroll restoration are specified.
- [ ] DOD-21 Loading, empty, partial, offline, deleted/inaccessible, stale-AI-tag, move failure, archive failure, undo failure, and concurrent-conflict states are designed.
- [ ] DOD-22 Archived-card discovery, viewing, restoring, search/Library/Ask/export inclusion, and metric inclusion are unambiguous.

### Technical and delivery planning

- [ ] DOD-23 At least two technical lifecycle/data-model options were compared, with a reasoned recommendation that preserves history and restoration.
- [ ] DOD-24 The plan specifies schema/migration/backfill, API contracts, authorization, ordering, idempotency, concurrency/versioning, optimistic reconciliation, and offline boundaries.
- [ ] DOD-25 Analytics events/count queries follow the decided product definitions and do not capture private card or note content.
- [ ] DOD-26 Performance budgets and scale assumptions cover board/list queries, counts, filters, pagination/virtualization, and multi-device freshness.
- [ ] DOD-27 A phased future implementation/test/rollout/rollback plan exists, but no production code, schema, data, deployment, or APK was modified in this goal.
- [ ] DOD-28 Acceptance criteria trace from the objective through product, UX, technical, prototype, and review artifacts.

### Prototype and review

- [ ] DOD-29 High-fidelity throwaway HTML prototypes cover supported desktop and mobile viewports and the critical normal/error/empty/conflict/archive states.
- [ ] DOD-30 Prototypes demonstrate Kanban/list switching, card movement and non-drag movement, combined filters, counts/metrics, detail/notes continuity, archive, and restore.
- [ ] DOD-31 Every prototype visibly states that it is disposable exploration, not production behavior or implementation architecture.
- [ ] DOD-32 Prototype files open without broken local references, avoid private/real user content, and have a documented state/viewport index.
- [ ] DOD-33 Accessibility/scenario QA and adversarial review were completed by roles other than the primary artifact author.
- [ ] DOD-34 Every P0/P1 finding is fixed or blocks closeout; every P2/P3 finding has an explicit disposition, owner, and reopen/next-step condition.

### Governance and closeout

- [ ] DOD-35 Required decisions use `CPW-DR-###`, link evidence, preserve rejected/deferred options, and agree with final artifacts.
- [ ] DOD-36 The milestone, dependency, blocker, risk, and artifact trackers reflect final reality; no item is marked complete without its exit evidence.
- [ ] DOD-37 All canonical artifact links resolve and terminology is consistent across product, UX, technical, prototype, review, and handoff documents.
- [ ] DOD-38 The Coordinator appended all due milestone/hourly/blocker entries to `RUNNING_LOG.md`, including a final state snapshot.
- [ ] DOD-39 Final handoff summarizes recommendation, fallback, evidence, accepted decisions, unresolved risks, validation limits, and the exact next authorization needed.
- [ ] DOD-40 Final handoff states prominently: **Exploration and prototype only; the Card Processing Workflow is not implemented or released.**

## 13. Immediate next actions

1. Repository Researcher completes A-01/A-02 and proposes G1 evidence gaps.
2. Product and UX begin alternatives only for evidence-complete areas; unresolved areas remain labeled hypotheses.
3. Technical Architect inventories lifecycle/schema and ingestion-path constraints in parallel.
4. Coordinator reconciles canonical artifact names, creates the decision register, and records the first milestone update in `RUNNING_LOG.md` without allowing other contributors to edit it concurrently.

The first decision gate may not select a preferred UI until current behavior, ingestion coverage, and lifecycle evidence are sufficient to distinguish a compelling prototype from a safe, coherent product direction.
