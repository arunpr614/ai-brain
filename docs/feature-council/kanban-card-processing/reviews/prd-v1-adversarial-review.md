# Kanban Card Processing PRD v1 - Adversarial Review

**Created:** 2026-07-12 11:22:24 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/prd-v1-adversarial-review.md`

## Executive Verdict

**No-go for implementation from PRD v1; conditional go for producing PRD v2.** The document is unusually detailed, but it overclaims implementation authority before the mandated v2 gate, silently resolves two goal-level requirements (daily metrics and AI-generated category filtering), still lacks an executable downstream archive matrix, and does not fully protect private Processing reads at the product-contract level. These gaps can produce the wrong feature, false release confidence, or private-data exposure even if the implementation faithfully follows v1. PRD v2 may proceed only after every P0/P1 finding is incorporated or explicitly resolved with evidence.

## Evidence Inspected

- Execution goal: `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md`, especially lines 29-72, 200-209, 241-317, and 334-380.
- Reviewed PRD: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md`, lines 1-521.
- Approved requirements baseline: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/approved-requirements-baseline.md`, lines 1-297.
- Current-main discovery: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/current-state-report.md`, lines 1-249.
- Relevant code map: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/relevant-code-map.md`, lines 1-191.
- Decision log: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/decisions/decision-log.md`, lines 1-74.
- Production/read-only baseline: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/qa/baseline-verification.md`, lines 1-65.
- Initial migration assessment: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/technical/initial-data-migration-assessment.md`, lines 1-301.
- Prior reviewed source package: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/product/prd-v2.md`, `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/ux/ux-ui-v2.md`, `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/technical/technical-plan-v2.md`, and its review/traceability artifacts.
- Repository state: `feat/kanban-card-processing` at `5b92e68`, tracking `origin/main`; the feature-council artifacts are currently untracked and `RUNNING_LOG.md` is modified.
- Required adversarial-review report template and path script; the script supplied the report timestamp, while the execution goal's required stable filename overrides its timestamped-path suggestion.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. PRD v1 falsely declares itself implementation-authorized before the required v2 authority gate

**Evidence:** The PRD labels itself `Implementation authorized` and calls itself the `implementation-authorized v1 product contract` at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:3` and `:12`. The execution goal requires a v1 adversarial review, requires PRD v2 to incorporate or explicitly resolve every material finding, and states that PRD v2 becomes the implementation source of truth at `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md:334-378`.
**Why it matters:** This is the controlling process boundary, not editorial wording. Engineers can reasonably start schema/API/UI work from a document that explicitly says it is authorized, bypassing the review and v2 reconciliation the goal mandates.
**Failure mode:** Implementation begins against v1; later v2 changes filtering, metrics, privacy, archive, or acceptance behavior; code and tests then embody the superseded contract and create expensive rework or an invalid release claim.
**Recommendation:** Change v1 status to `Adversarial-review draft; not an implementation source of truth`. State that only PRD v2, after disposition of this report and consistency review with UX/technical v2, authorizes implementation. Add a hard tracker gate prohibiting feature code/schema/API work until that status changes.

### P1 - High Risk

#### 1. Two goal-level requirements are silently reinterpreted instead of being recorded as source conflicts

**Evidence:** The goal requires filtering by `AI-generated category tags` and daily plus weekly processing metrics at `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md:47-53`, and separately requires explicit definitions for processed/completed today and this week at `:291-317`. Current code has three distinct AI concepts—auto tags, topics, and `items.category`—at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/current-state-report.md:105-114`. The PRD chooses AI topics only at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:235-244`, and makes Today merely transient or optional secondary Activity at `:255-275`; its conflict table at `:18-29` records neither divergence. No standalone source-conflict report exists under the feature's discovery folder despite the required artifact at goal lines 200-207.
**Why it matters:** Implementing AI topics can be functionally different from implementing generated tags or the single AI category. Omitting a required Today surface can also satisfy the PRD while failing the stated outcome. The goal expressly prohibits silently ignoring or reinterpreting a requirement at lines 59-72.
**Failure mode:** The shipped filter excludes the taxonomy users expected, or the release has only weekly values while being declared compliant with a daily-and-weekly requirement. Traceability still appears green because v1 rewrote the requirement before assigning acceptance evidence.
**Recommendation:** Add explicit conflict records for (a) AI-generated category tags versus auto tags versus AI topics versus `items.category`, and (b) daily versus weekly persistent metrics. Select one taxonomy with source evidence and name excluded taxonomies. Either require an exact Today surface for Processed and Completed or document the authoritative evidence that permits deferral. Create the missing standalone source-conflict artifact and trace each resolution into PRD v2 acceptance criteria.

#### 2. The archive contract still invokes a nonexistent “full downstream matrix”

**Evidence:** The PRD lists surfaces in prose and says to show an archive badge `Where surfaced` at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:287-297`. Acceptance criterion 17 nevertheless requires that the `full downstream matrix passes` at `:454`, but the PRD contains no Include/Exclude/Badge/Mutation matrix. Current-state evidence says archive must not hide items from Library, detail, search, Ask, Related, Review/Needs Upgrade, export, duplicate detection, or workers at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/current-state-report.md:116-120`.
**Why it matters:** Archive is a user-trust and data-visibility boundary. A prose list does not settle which surfaces must show a badge, which queries must remain untouched, or what exact restore/reprocess behavior each surface exposes.
**Failure mode:** An archived item silently disappears from Ask/search/Review, or remains visible without disclosure in one surface; alternatively, engineering adds workflow joins across unrelated queries merely to satisfy an undefined badge expectation, expanding regression and performance risk.
**Recommendation:** Add an authoritative row-by-row matrix for Library, detail/notes, exact search, semantic search, Ask/citations, Related, Needs Upgrade, Attention Review/SRS, duplicate matching, export, enrichment/index/quality workers, backups, and hard delete. For each row define inclusion, badge/metadata, allowed actions, query-change expectation, and regression evidence. Delete `Where surfaced` and make the acceptance criterion name every matrix row.

#### 3. Private Processing reads lack an explicit authentication and cache-isolation contract

**Evidence:** The PRD's read contract only bounds fields at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:319-321`. It specifies credential/session and exact-origin validation only for writes at `:323-325`; security acceptance at `:466` does not require private/no-store/Vary behavior. Current code makes future `/api/items/...` paths reachable through bearer-prefix routing unless the handler enforces its intended credential policy at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/current-state-report.md:122-142`. The strongest current private-data precedent explicitly uses session verification plus private/no-store and cookie-varying responses at `:99-103`; the code map repeats that precedent at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/relevant-code-map.md:123-137`.
**Why it matters:** Titles, excerpts, taxonomy IDs, workflow state, archive state, and metrics remain private behavioral/content metadata even when full bodies and notes are excluded. Relying on proxy defaults or framework cache inference is not a product security contract.
**Failure mode:** A bearer-authenticated client unintentionally gains item-workflow reads, or a personalized GET is cached/reused across auth state. A test suite passes unauthorized writes while never testing read credential boundaries or cache headers.
**Recommendation:** Require session-only or explicitly enumerated credential policy for every read, mutation lookup, enrollment, and item-workflow endpoint. Require `Cache-Control: private, no-store`, appropriate cookie variation, no shared cache, bounds/rate limits, and private error bodies. Add acceptance cases for unauthenticated session, valid bearer on session-only endpoints, cache headers, ID enumeration, stale/deleted item, oversized filters/cursors, and response-field allow-list inspection.

#### 4. Done ordering is specified, but the completion projection transition is not

**Evidence:** The PRD says Workflow default orders Done by latest effective completion at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:212-220`, while the headline Completed metric counts first lifetime Done entry at `:263-275`. Its data requirements merely name a `completion` field at `:309-317`. The migration assessment still leaves the field's first/current semantics to a future decision at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/technical/initial-data-migration-assessment.md:49-61` and `:218-229`.
**Why it matters:** First-lifetime completion for metrics and latest effective completion for current Done ordering are both reasonable, but they are different facts. The projection must define what happens on Done → To Do → Done, Undo into/out of Done, archive/restore, and legacy enrollment.
**Failure mode:** Recompleted items sort by their first Done timestamp, Undo leaves a stale completion value, or the same field is reused for headline metrics and current ordering, causing metric or UI drift.
**Recommendation:** Define separate canonical semantics: event history owns first effective lifetime completion; the projection owns latest effective current Done-entry timestamp for ordering. Specify every transition/Undo restoration rule, nullability outside Done, archive/restore behavior, indexes, and fixtures. Rename the projection field if needed to prevent first-versus-latest misuse.

### P2 - Medium Risk

#### 1. The production evidence statement is stale and weakens migration/release decisions

**Evidence:** PRD v1 says no production database, host, or live runtime was inspected at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:14-16`. A later read-only production baseline confirms an active service, healthy loopback response, 7,520,256-byte SQLite database, 129 retained items, 26 applied migration files, clean quick/foreign-key checks, and about 30 GB free at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/qa/baseline-verification.md:41-65`.
**Why it matters:** The PRD's evidence boundary is no longer true. Actual production scale should inform enrollment rehearsal and migration risk without replacing synthetic 10k/50k scale gates.
**Failure mode:** Reviewers treat production shape as wholly unknown, repeat unsafe checks, or miss a mismatch between synthetic assumptions and the real deployment.
**Recommendation:** Update the authority/evidence section with the read-only production facts and their limits. Preserve the statement that no content or feature behavior was inspected and that deployment/live verification remains outstanding.

#### 2. “One-level Undo” is ambiguous when multiple items are mutated within ten seconds

**Evidence:** PRD v1 requires one-level Undo across Processing views/detail at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:341-350`, but does not define whether a second confirmed action replaces the first UI opportunity, whether both server targets remain eligible, or how same-item versus different-item actions interact. The event model permits one unique Undo target per event at `:315-317`, which does not resolve the client/product scope.
**Why it matters:** Rapid processing is a primary journey. “One level” can mean one global action, one per item, or one per tab; each produces different UI and API behavior.
**Failure mode:** The UI offers Undo for action A after action B, server accepts both on different items, or one surface silently replaces another surface's recovery control. Tests cover one action and miss the race.
**Recommendation:** Define the scope explicitly. A safe v1 default is one most-recent eligible action per tab, replaced on the next confirmed reversible action, while server CAS still prevents stale overwrite. Add same-item/different-item rapid-action, navigation, expiry, replay, and multi-tab fixtures.

#### 3. The exact ten-second Undo limit has no timing-accessibility disposition

**Evidence:** The PRD makes server eligibility exactly ten seconds at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:341-350`, while simultaneously requiring WCAG 2.2 AA, screen-reader/switch-control verification, and timed expiry announcement at `:385-397` and acceptance criterion 28 at `:465`. Neither v1 nor the baseline records why the time limit is essential, adjustable, extendable, or functionally replaceable after expiry.
**Why it matters:** A short-lived recovery control disproportionately affects keyboard, switch, screen-reader, cognitive, and motor users. Announcement alone does not establish that the timed action is operable.
**Failure mode:** The server contract passes exact-boundary tests while users cannot reach or activate Undo in time, creating a formal accessibility no-go late in release.
**Recommendation:** Require an accessibility disposition before freezing the ten-second contract. Either provide a conforming extension/adjustment mechanism, lengthen the server window with approved evidence, or prove that an always-available equivalent reversal preserves the same state/metric semantics. Add timed keyboard, screen-reader, and switch-control evidence rather than testing announcement only.

#### 4. Acceptance criteria do not directly prove every workflow-state count or conditional virtualization scope

**Evidence:** The goal requires current counts for each workflow state at `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md:304-315`. PRD v1 describes per-status counts at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md:199-205`, but acceptance criterion 12 only generically checks `matching and total typed values` at `:449`; it never names Inbox/To Do/In Progress/Done filtered and unfiltered truth. The PRD makes virtualization conditional at `:365-373`, yet accessibility criterion 28 requires virtualized tasks without an `if implemented` condition at `:465`.
**Why it matters:** Generic count evidence can pass while one column count is wrong, pagination-derived, or filter-inflated. Unconditional virtualization evidence can also force unnecessary scope or create an impossible criterion for a non-virtualized bounded implementation.
**Failure mode:** A Board with correct Inbox total but wrong To Do/Done counts ships; or QA reports criterion 28 blocked despite a deliberately non-virtualized, bounded DOM.
**Recommendation:** Add exact four-state count fixtures across no filters, tag-only, topic-only, combined, no-tag/no-topic, archive, and multi-page data. Make virtualization gates conditional: if used, require focus/AT/DOM evidence; if not used, require bounded pagination/DOM evidence and prove scale budgets without it.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It confuses authorization to pursue the persistent goal with authorization to implement from a v1 artifact that the goal explicitly requires reviewers to challenge and v2 to supersede.
- It treats AI topics as an uncontroversial interpretation of AI-generated category tags even though current code has distinct auto tags, topics, and category concepts.
- It de-emphasizes Today without recording a conflict against the goal's explicit daily metric language.
- It claims an archive matrix acceptance gate without supplying a matrix.
- It treats bounded DTO fields as sufficient privacy protection without fixing read credential and cache behavior.
- It names a completion projection without deciding first-lifetime versus latest-effective semantics.
- It overstates the lack of production evidence after safe read-only production checks were completed.
- It uses broad acceptance language where exact count, rapid-Undo, timed-accessibility, and conditional-virtualization fixtures are required.

## Missing Validation

- A standalone source-conflict report covering the execution goal, approved design facts, reviewed source package, current code, Wiki, and current production baseline.
- A taxonomy decision fixture proving exactly which AI-generated concept users filter and why the other generated concepts are excluded.
- Exact Today and week-to-date UI/metric fixtures for Processed and Completed, or an explicit approved deferral of daily display.
- A complete downstream archive Include/Exclude/Badge/Action/query-change matrix.
- Read authentication, bearer-boundary, private/no-store, cookie-variation, response allow-list, enumeration, and abuse evidence.
- Projection/event truth tables for first completion, latest current Done entry, reopen, recompletion, archive/restore, and Undo.
- Rapid multi-item and multi-tab Undo behavior within one eligibility window.
- A timing-accessibility disposition and manual evidence for the expiring Undo control.
- Four-status count truth across filter combinations, pagination, archive, and taxonomy mutation.
- Explicit conditional evidence paths for virtualized and non-virtualized large-backlog implementations.

## Revised Recommendations

1. Reclassify v1 as review-only and block implementation until v2 disposition is complete.
2. Create the missing source-conflict report and add explicit daily-metric and AI-taxonomy decisions.
3. Add a full archive downstream matrix with executable row-level acceptance evidence.
4. Make every Processing endpoint's credential, cache, payload, bounds, and rate-limit contract explicit.
5. Separate first-lifetime completion metrics from latest-effective Done ordering in product language and fixtures.
6. Update v2 with the existing read-only production facts while preserving synthetic scale and live-verification gates.
7. Define one-level Undo scope and resolve the ten-second timing accessibility risk before UX/technical v2 freeze.
8. Rewrite count and virtualization acceptance criteria into exact conditional fixtures.

## Go / No-Go Recommendation

**No-go for schema, API, UI, migration, or release work based on PRD v1. Conditional go for PRD v2 revision.** PRD v2 may become the implementation source of truth only when the P0 is removed, all P1 findings have explicit dispositions, every P2 acceptance gap has an owner/evidence path, and PRD v2 is reconciled with UX/UI v2 and technical-plan v2.

## Plan Revision Inputs

### Required Deletions

- Delete `Implementation authorized` and `implementation-authorized v1 product contract` from v1-derived authority language.
- Delete `Where surfaced` from archive behavior.
- Delete any implication that AI topics automatically mean AI-generated category tags.
- Delete the stale claim that no production database/host evidence was inspected.
- Delete unconditional virtualized-accessibility evidence when virtualization is not selected.

### Required Additions

- Add an explicit v1 → review → v2 authority gate.
- Add source-conflict entries for AI taxonomy and daily metrics plus a standalone conflict report.
- Add the complete archive downstream matrix.
- Add read credential/cache/privacy/rate-limit contracts.
- Add first-lifetime versus latest-effective completion semantics.
- Add rapid-action Undo scope and timing-accessibility disposition.
- Add dated read-only production baseline facts and limitations.

### Required Acceptance Criteria Changes

- Require exact taxonomy fixtures for the selected AI facet and negative fixtures for excluded AI concepts.
- Require Processed today/week and Completed today/week presentation/truth, or cite an explicit approved scope decision.
- Replace `full downstream matrix passes` with named row-by-row archive assertions.
- Add unauthorized read, valid-bearer-on-session-only, cache-header, field-allow-list, and abuse assertions.
- Add Done → reopen → Done, archive/restore, and Undo completion-order/metric fixtures.
- Add one-tab/multi-tab rapid Undo fixtures and timed assistive-technology evidence.
- Add filtered/unfiltered four-status count fixtures independent of page length.
- Split large-backlog accessibility acceptance into virtualized-if-used and bounded-non-virtualized branches.

### Required Validation Changes

- Run source traceability from every goal outcome through conflict resolution, PRD v2 requirement, implementation evidence, and release evidence.
- Validate the selected AI taxonomy against real schema IDs and UI labels.
- Validate Today/Monday/DST/timezone behavior with both numeric truth and displayed copy.
- Inspect every archive matrix surface without changing unrelated retrieval behavior.
- Verify all Processing responses are private, bounded, authenticated as intended, and content-safe.
- Run completion/Undo property fixtures and rapid-action concurrency tests.
- Conduct timed keyboard, screen-reader, and switch-control Undo tasks.
- Record exact four-state count SQL truth and 10k/50k pagination/DOM evidence.

### Required No-Go Gates

- Any implementation begins before PRD v2 is accepted as the source of truth.
- AI-generated filter taxonomy remains ambiguous or differs across PRD, UX, technical plan, and acceptance evidence.
- Daily metric scope is silently omitted or still contradicts the execution goal.
- Any archive surface lacks an explicit matrix disposition and regression result.
- Any private read lacks explicit credential and cache isolation or exposes fields outside the allow-list.
- Completion projection and first-lifetime metric semantics remain conflated.
- Exact Undo behavior is untestable for rapid actions or fails timing accessibility review.
- Any workflow-state count derives from loaded rows or lacks filter/page-independent proof.
- Production enablement occurs without migration/readiness, backup/known-good artifact, rollback, security, accessibility, performance, and live-smoke evidence.

## Residual Risks

Even after these revisions, SQLite remains a single-writer deployment; CAS protects semantic correctness but does not eliminate lock/availability risk. The workflow can still create perceived backlog pressure, mobile discoverability can fail, and workflow-only archive can surprise users because content remains retrievable elsewhere. Optional drag plus virtualization plus focus remains a high-risk combination and should stay disabled unless it earns its complexity. The current production library is small (129 retained items), so synthetic 10k/50k testing will remain necessary to prove bounded behavior rather than predict current load.
