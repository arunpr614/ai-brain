# Card Processing Workflow PRD v1 - Adversarial Review

**Created:** 2026-07-11 15:17:12 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/product/prd-v1.md` plus its objective, research, UX v1, technical v1, and prototype evidence
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/reviews/prd-v1-adversarial-review.md`

## Executive Verdict

**Conditional no-go for implementation planning and stakeholder approval.** The PRD is a credible discovery synthesis, but it is not internally settled enough to serve as the product contract for v2 technical planning. Material decisions about headline metrics, legacy enrollment scope, partial batch outcomes, archive effects, mobile discoverability, and quick-preview value either conflict with the companion artifacts or remain open while acceptance criteria already imply resolution. It may continue as an **Explored — not implemented** proposal only. No production work, migration, API, navigation change, feature flag, or release claim should proceed from v1.

## Evidence Inspected

- Original objective: `/Users/arun.prakash/.codex/attachments/514e46ef-5f1a-4e64-9a0d-8e33e8c20f2e/goal-objective.md`, especially lines 46-76, 97-200, 350-392, and 619-641.
- PRD v1: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/product/prd-v1.md`, lines 1-522.
- UX/UI v1: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/ux/ux-ui-v1.md`, especially lines 101-150, 184-219, 282-348, and 650-761.
- Technical plan v1: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/technical/technical-plan-v1.md`, especially lines 43-53, 178-219, 405-427, 532-568, and 621-630.
- Discovery evidence: `research/current-state-report.md`, `research/source-reconciliation.md`, `research/platform-data-workflow-assessment.md`, `research/growth-engagement-assessment.md`, `research/power-user-workflow-assessment.md`, `product/product-directions.md`, `product/metrics-framework.md`, and `technical/architecture-options.md` under the feature-council folder.
- Prototype source: `prototypes/src/App.jsx` and `prototypes/src/styles.css`; successful `npm run build` on 2026-07-11.
- Prototype screenshots: Direction B desktop/mobile Inbox and detail, Direction A desktop Board, Direction C desktop List, gallery, and error state under `prototypes/screenshots/`.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found. The artifact explicitly says **Explored — not implemented** and does not itself modify production behavior.

### P1 - High Risk

#### 1. The supposed product contract disagrees with UX and technical v1 on three release-shaping decisions

**Evidence:** PRD v1 leaves batch semantics to the technical plan at line 280, while UX v1 lines 191-193 and technical v1 lines 405-418 already require explicit partial results. PRD v1 lines 315-327 makes weekly Processed versus Added primary, while UX v1 lines 323-337 and the prototype source at `App.jsx:591-597` make Processed today primary. PRD v1 lines 180-185 describes a recent 30-day cohort without a 25-item cap, UX v1 lines 212-217 caps the choice at 25, and technical v1 lines 210-219 defines the frozen 30-day cohort without that cap.
**Why it matters:** These are not copy details. They determine user expectations, API behavior, enrollment volume, metrics computation, test fixtures, and prototype evaluation. A stakeholder cannot approve one coherent proposal while reading three different ones.
**Failure mode:** Product approves a weekly health model while UX ships a daily throughput cue; implementation builds partial batches while acceptance tests assume atomic behavior; a user consents to “recent” without knowing whether that means 25 or the entire 30-day cohort.
**Recommendation:** PRD v2 must own and state one decision for each topic. Recommended revision: explicit partial per-item batch outcomes; count-previewed 30-day cohort with an explicit cap and overflow explanation; and one headline metric hierarchy shared verbatim by PRD, UX, prototype, and technical plan.

#### 2. Mobile placement does not satisfy the objective's “comparable in importance to Library” requirement and has not been prototyped as claimed

**Evidence:** The objective requires a dedicated section comparable in importance to Library (`goal-objective.md:48-76`). PRD v1 lines 111-118 keeps Processing under More and relies on a Library summary. UX v1 lines 132-150 and 674 require that summary, yet the mobile prototype source only marks More as active (`prototypes/src/App.jsx:580-587`), and the captured Direction B mobile screen contains no Library summary or capture-confirmation entry.
**Why it matters:** An Inbox-first product fails if users cannot reliably find the Inbox. The proposal treats discoverability as a launch compromise but provides no prototype evidence for the compromise.
**Failure mode:** New captures accumulate in an invisible queue; users continue using Library exactly as before; engagement data then falsely suggests that the workflow itself lacks value.
**Recommendation:** PRD v2 must define a minimum discoverability contract and a decision gate. Prototype the Library summary, More entry, and “Saved to Inbox” feedback at 390×844; test comprehension before choosing whether Processing remains under More or receives primary navigation.

#### 3. Archive scope is asserted in acceptance criteria while still explicitly blocked and partly qualified

**Evidence:** PRD v1 lines 294-297 says archived sources remain in Library, search, Ask, Related, Needs Upgrade/Review, and export “with an Archived badge where practical.” AC-22 at lines 441-442 states this as settled behavior. Open question 4 at line 505 reopens Review eligibility, and technical v1 lines 621-629 says workflow-only archive scope and Review behavior require council approval before production work.
**Why it matters:** Archive semantics are a trust boundary. “Where practical” is not an acceptable contract for whether a saved source disappears, remains AI-retrievable, or appears in quality review.
**Failure mode:** A user archives a completed source expecting workflow-only hiding, but a downstream surface omits it or fails to disclose its archive state; the feature looks like deletion or inconsistent retrieval.
**Recommendation:** Replace the qualifier with an explicit downstream matrix for Library, exact search, semantic search, Ask, Related, Review/Needs Upgrade, detail, duplicate capture, export, and background workers. Mark every row Include/Exclude/Badge/Restore and require council approval before technical v2 can be implementation-ready.

### P2 - Medium Risk

#### 1. “Processed” becomes a one-time lifetime milestone and can stop reflecting a recurring backlog-processing habit

**Evidence:** PRD v1 lines 303-311 counts only the first effective deliberate Inbox exit per item lifetime; later return-and-exit cycles are merely diagnostic. The goal asks for today/week processing measures that help manage backlog (`goal-objective.md:148-170`).
**Why it matters:** The definition prevents churn inflation, but it also stops counting legitimate reprocessing. A frequently revisited knowledge source may require a new decision without contributing to the visible processed measure.
**Failure mode:** The owner performs meaningful work but the headline metric does not move, eroding trust in the metric or encouraging creation of new items instead of revisiting existing ones.
**Recommendation:** Keep first-ever Triaged as a non-gameable milestone, but define and prototype a secondary “Inbox decisions” or “effective exits” measure for recurring work. State clearly which one appears in today/week UI and why.

#### 2. Several acceptance criteria are assertions, not executable acceptance tests

**Evidence:** AC-05 says every path “proves” initialization; AC-13 says counts “cannot be confused”; AC-15 requires the “best valid anchor”; AC-27 says accessibility concerns “pass the review checklist” (`prd-v1.md:405-453`). None names fixtures, expected results, timing, viewport procedure, assistive technology, or objective pass/fail evidence.
**Why it matters:** Ambiguous criteria create false confidence and allow contradictory implementations to pass review.
**Failure mode:** A happy-path demo is labeled complete while duplicate capture, filtered counts, focus under virtualization, or conflict recovery remains broken.
**Recommendation:** Convert every material criterion into Given/When/Then evidence with named fixtures. Define exact count examples, version-conflict outcomes, viewport/zoom sizes, keyboard/screen-reader tasks, ingestion-path matrix rows, and performance budgets.

#### 3. The quick-preview recommendation outruns the evidence and risks a second item-detail surface

**Evidence:** PRD v1 lines 255-263 permits an optional quick preview but open question 2 at lines 502-504 admits its value is unproven. Current-state evidence says the canonical item experience is a full route (`research/current-state-report.md:42-47`). The working prototype's “Open full source” opens a modal with editable notes (`prototypes/src/App.jsx:734-760`), materially different from the PRD's read-only preview boundary.
**Why it matters:** A second quasi-detail surface duplicates behavior, complicates note safety, and makes return-state evaluation unreliable.
**Failure mode:** The prototype appears faster because it avoids real route navigation and note guards; production then incurs expensive state and accessibility work that the prototype never tested.
**Recommendation:** Treat quick preview as a hypothesis with a removal default. Compare “Inbox row → canonical route → return” against read-only preview on time-to-decision, confidence, and place preservation. Do not include editable notes or call a modal the canonical route.

### P3 - Low Risk Or Polish

#### 1. Naming remains deliberately open but the acceptance package lacks a concrete comprehension test

**Evidence:** PRD v1 lines 12-16 recommends Processing while asking the prototypes to compare Inbox naming; open question 1 at line 502 remains unresolved.
**Why it matters:** Processing is broad, while Inbox describes only the landing state. Either can work, but intuition alone will not resolve it.
**Failure mode:** Stakeholders debate labels without testing whether users predict the section's purpose and archive scope.
**Recommendation:** Add a five-second comprehension task using Processing, Inbox, and Queue labels with the same underlying screen; capture predicted purpose and expected contents before selecting v2 copy.

## What The Original Plan Or Work Gets Wrong

- It treats cross-artifact differences as open questions even after companion artifacts have made incompatible decisions.
- It claims a dedicated, important mobile section without demonstrating the proposed entry path.
- It makes archive preservation sound settled while retaining a council blocker and “where practical” language.
- It uses first-lifetime processing as both a trust-safe metric and a current-work metric without acknowledging the recurring-work blind spot.
- It labels broad statements as acceptance criteria without supplying observable evidence contracts.
- It assumes the quick preview can remain bounded, while the prototype already crossed that boundary into editable modal detail.

## Missing Validation

- A single cross-artifact decision table for metrics, enrollment cap, batch outcomes, archive matrix, naming, and mobile entry.
- Mobile discoverability test for Library summary, More entry, and capture feedback.
- Prototype evidence for canonical full-route detail and return-state preservation.
- Explicit downstream archive verification across search, Ask, Related, Review, export, duplicate capture, and workers.
- Recurring Inbox re-entry metric scenarios.
- Executable Given/When/Then acceptance evidence for ingestion, conflicts, Undo, counts, accessibility, and scale.
- Stakeholder comprehension evidence for Processing versus Inbox.

## Revised Recommendations

1. Freeze one decision ledger before writing PRD v2.
2. Adopt partial per-item batch outcomes and define exact success/conflict/failure UI.
3. Define one count-previewed recent-enrollment cohort and cap policy.
4. Approve a complete workflow-only archive matrix.
5. Prototype and test mobile discovery before declaring placement.
6. Use first Triaged for lifetime milestone integrity and a separately named effective Inbox-exit metric for recurring work.
7. Make the canonical route the default detail prototype; retain quick preview only if measured value exceeds complexity.
8. Rewrite acceptance criteria into executable evidence statements.
9. Keep every artifact explicitly **Explored — not implemented** and prohibit production changes during this phase.

## Go / No-Go Recommendation

**No-go for production implementation or approval of an implementation specification. Conditional go for v2 discovery work.** PRD v2 may proceed after all P1 findings have one recorded resolution and the companion UX/technical documents use the same decisions. No migration, API, feature flag, navigation change, or production application modification is authorized.

## Plan Revision Inputs

### Required Deletions

- Delete “where practical” from archive visibility behavior.
- Delete unresolved batch semantics from the PRD after v2 selects one contract.
- Delete any implication that the current mobile prototype validates discoverability.
- Delete editable notes from any surface described as quick preview.

### Required Additions

- Add a signed cross-artifact decision table.
- Add the complete downstream archive matrix.
- Add mobile entry and capture-feedback flows.
- Add recurring processing metric semantics.
- Add a quick-preview validation/removal gate.

### Required Acceptance Criteria Changes

- Make enrollment cohort and cap exact.
- Make partial-batch result and retry/Undo behavior exact.
- Require a demonstrated Library-to-Processing mobile entry.
- Require exact total-versus-matching count fixtures.
- Require canonical-route detail return with unsaved-note protection.
- Require archive behavior on every downstream surface.

### Required Validation Changes

- Run comprehension tests for Processing/Inbox/Queue.
- Run 390×844 mobile discovery and task completion checks.
- Use named ingestion, conflict, archive, re-entry, and metric fixtures.
- Compare canonical-route-only and quick-preview triage flows.

### Required No-Go Gates

- Any unresolved conflict between PRD v2, UX/UI v2, and technical plan v2.
- Any archive surface without explicit include/exclude behavior.
- Any claimed mobile placement without prototype evidence.
- Any production code, schema, migration, API, or flag change during exploration.

## Residual Risks

Even after revision, a lightweight four-state workflow can become perceived backlog debt, and an Inbox-first section can still duplicate Library behavior. The single-owner deployment reduces permission complexity but does not remove cross-tab conflict, migration, metric trust, or accessibility risk. Prototype evidence can lower these risks; it cannot prove production scale, data safety, or long-term habit value.
