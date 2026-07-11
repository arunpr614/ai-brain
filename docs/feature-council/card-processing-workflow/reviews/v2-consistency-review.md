# Card Processing Workflow v2 Cross-Artifact Consistency - Adversarial Review

**Created:** 2026-07-11 15:55:38 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v2, UX/UI v2, technical plan v2, decision log, current isolated prototype/design QA, and all three v1 adversarial reports in `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/reviews/v2-consistency-review.md`

## Post-review remediation disposition

The root owner preserved the independent review below as a point-in-time adversarial record, then applied and re-verified its publication gates. This addendum supersedes the unresolved wording in the original snapshot; it does not broaden the feature beyond **Explored — not implemented**.

| Original finding | Final disposition | Evidence |
|---|---|---|
| P1 Added semantics | **Resolved** | CPW-018, PRD v2, technical v2, and the metrics framework now define Added as genuinely new successful captures only; duplicate/repair, enrollment, re-entry/reprocess, and ordinary move-to-Inbox are excluded. |
| P1 exact mutation replay | **Resolved in the proposal** | Technical v2 defines an authenticated mutation-outcome read, immutable accepted receipt, current canonical snapshot/version, replay-after-later-mutation behavior, and never installs stale accepted-time state. Implementation tests remain a no-go gate. |
| P2 screenshot/copy drift | **Resolved** | Prototype rebuilt; weekly metrics and “Oldest current Inbox entry first” are present; A/B/C desktop/mobile, selected reference/comparison, and all retained trust-state captures were regenerated and visually inspected. |
| P2 Undo expiry | **Resolved in the proposal/prototype** | Decision, PRD, UX, and technical v2 align on 10 seconds, `undoEligibleUntil`, `410 undo_expired` plus current truth, expiry announcement, and no Undo-of-Undo. Prototype control expires at 10 seconds. |
| P2 mobile evidence | **Partially resolved, still gated** | Direction A mobile evidence was added; functional real Library/More unaided discovery remains explicitly required before implementation authorization. |
| P2 free-form metadata | **Resolved in the proposal** | `metadata_json` was removed. Only bounded typed `entry_episode_id` and allow-listed `reason_code` remain; unknown/over-length values are rejected and content-bearing values are prohibited. |
| P3 archive naming | **Resolved** | V2 artifacts standardize on `workflow_archived_at`; user copy remains “Archived from Processing.” |
| P3 note-return choices | **Resolved** | Prototype now offers Save and return / Discard draft / Keep editing, matching PRD and UX v2. |

**Final package verdict:** go for stakeholder exploration; no-go for implementation. Manual mobile discovery, AT, performance, migration, SQLite contention, production integrations, and downstream archive-matrix gates remain open.

## Independent snapshot verdict (before remediation)

**Conditional go for continued stakeholder exploration; no-go for implementation.** V2 closes the most dangerous v1 architecture defects: batch is honestly deferred, archive scope is explicit, canonical detail is route-based, current Inbox age has an authoritative projection, Undo-of-Undo is prohibited, legacy event population is removed from the boot migration, and degraded initialization fails Processing closed rather than silently losing new captures.

V2 is not fully cross-artifact consistent. The headline `Added` metric now mixes genuinely new captures with enrollment, reprocess, and ordinary move-to-Inbox episodes, which makes it churn-inflatable and changes the meaning of “Added” without a clear decision record. The technical replay contract also says an exact mutation replay returns the prior response, which can reinstall stale state after a later confirmed mutation. Those are P1 trust defects. The package may be shown as an explicitly unfinished exploration, but it must not be described as an implementation-ready specification.

No production code, schema, migration, API, route, feature flag, rollout, or merge is authorized by this review.

## Evidence Inspected

- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/product/prd-v2.md`, lines 1-407.
- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/ux/ux-ui-v2.md`, lines 1-255.
- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/technical/technical-plan-v2.md`, lines 1-455.
- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/decisions/decision-log.md`, lines 1-42.
- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-card-processing-workflow-20260711/docs/feature-council/card-processing-workflow/prototypes/design-qa.md`, lines 1-117.
- Current prototype source `prototypes/src/App.jsx`, `prototypes/src/styles.css`, five HTML entries, built assets, and README.
- Visual inspection of retained gallery, Direction B desktop/mobile Inbox, route detail, move-failure, conflict, selected-reference/comparison, Direction A desktop, and Direction C desktop/mobile screenshots.
- Original v1 reports: `reviews/prd-v1-adversarial-review.md`, `reviews/ux-ui-v1-adversarial-review.md`, and `reviews/technical-plan-v1-adversarial-review.md`.
- Original objective at `/Users/arun.prakash/.codex/attachments/514e46ef-5f1a-4e64-9a0d-8e33e8c20f2e/goal-objective.md`.
- Current repository evidence for insert/migration behavior at `src/db/items.ts:54-89` and `src/db/client.ts:31-72,98-150`; no production implementation was found in scope.

## Material V1 Finding Disposition

Status legend: **Resolved** means v2 makes one consistent decision; **Partial** means the claim is narrowed or improved but required evidence/semantics remain open; **Deferred** means the capability is explicitly removed from first-release scope and retained as a future gate.

| Source | Material v1 finding | V2 disposition | Evidence / remaining condition |
|---|---|---|---|
| PRD P1 | Metrics, enrollment, and batch contracts disagreed | **Partial** | Batch is deferred and recent enrollment is consistently 30 days capped at 25 (`decision-log.md:14,21`; `prd-v2.md:63-68,147-153`; `technical-plan-v2.md:190-192,239`). Metric hierarchy aligns, but `Added` semantics remain defective; see P1 finding 1. |
| PRD P1 | Mobile placement lacked comparable importance/evidence | **Partial** | More + Library summary + capture feedback and a >20% promotion gate now align (`decision-log.md:11`; `prd-v2.md:86-95`; `ux-ui-v2.md:30-36`). Prototype only places a “Library summary preview” inside Processing (`App.jsx:600`); actual discovery is not tested. |
| PRD P1 | Archive scope was both asserted and blocked | **Resolved** | Complete downstream matrix and exception no-go (`decision-log.md:18-19`; `prd-v2.md:112-135`; `technical-plan-v2.md:293-295`). |
| PRD P2 | First-lifetime Processed ignored recurring work | **Partial** | Episode-based Processed now counts legitimate re-entry once (`decision-log.md:26`; `prd-v2.md:243-248`; `technical-plan-v2.md:268-281`), but the paired Added measure is now churn-inflatable. |
| PRD P2 | Acceptance criteria were not executable | **Mostly resolved** | PRD v2 lines 332-355 supplies named Given/When fixtures and exact expected behavior. Metric AC 14 still says “exact” without publishing the numeric truth table. |
| PRD P2 | Quick preview risked a second detail surface | **Resolved** | Preview is read-only/removable and full detail uses a separate route simulation (`decision-log.md:20`; `prd-v2.md:174-180`; `ux-ui-v2.md:48-52,89-97`; `App.jsx:218-282`). |
| PRD P3 | Naming lacked a comprehension test | **Resolved as a gate** | Processing remains the recommendation; a five-second Processing/Inbox/Queue test is mandatory before authorization (`decision-log.md:10`; `prd-v2.md:93-95`). |
| UX P1 | Prototype omitted trust-critical states | **Partial, honestly scoped** | Local failure and 409 are now direct scenarios (`App.jsx:576-587,624-635,885-890`). Unknown outcome, deletion, and AI-topic-change remain explicit implementation gates (`ux-ui-v2.md:144-164`; `design-qa.md:103-107`). |
| UX P1 | Impossible matching/total counts | **Resolved in source; evidence stale** | Typed source counts are correct (`App.jsx:440-445,619-622,746-753`), but retained Direction B screenshots still show the pre-v2 persistent metric hierarchy; see P2 finding 1. |
| UX P1 | Editable modal was called canonical detail | **Resolved** | Modal removed; `item-detail.html` route simulation and draft guard added (`App.jsx:202-282`; `vite.config.mjs:8-14`). |
| UX P1 | Process next 3 was cosmetic | **Resolved for one-source loop** | Honest Process next, no preselection, and Leave advances (`App.jsx:403,528-534,589-596,757-795`). |
| UX P1 | Filter algebra/URL persistence not prototyped | **Partial, explicitly gated** | Prototype proves one value per facet plus cross-facet AND; multi-value OR, chips, and full filter URL restoration remain no-go work (`decision-log.md:30`; `ux-ui-v2.md:115-132`; `design-qa.md:103-107`). |
| UX P1 | Accessibility claims exceeded evidence | **Partial, correctly bounded** | Semantics, focus, targets, contrast, and route behavior improved; manual AT, zoom, switch, and virtualization remain production no-go gates (`ux-ui-v2.md:166-206`; `design-qa.md:63-69,103-107`). |
| UX P2 | A/B/C interactive directions were too similar | **Partial** | V2 acknowledges shared engine is prototype economy (`ux-ui-v2.md:12-20`), but the implementation still mostly varies default hierarchy, not full end-to-end behavior. |
| UX P2 | Reprocess collapsed two lifecycle decisions | **Resolved by explicit decision** | V2 intentionally chooses one atomic compound command with both facts preserved (`decision-log.md:18`; `prd-v2.md:112-118`; `technical-plan-v2.md:251`). |
| UX P2 | Mobile evidence did not prove complete tasks | **Partial** | Direction B/C mobile layouts and 44px/fixed-nav work are recorded; Direction A mobile evidence and real Library-to-Processing discovery are absent. |
| UX P3 | Gallery capture was misleading | **Resolved** | Stable viewport gallery retained and repaint limitations documented (`design-qa.md:101,108`). |
| Technical P1 | Current Inbox age had no source of truth | **Resolved** | `workflow_inbox_entered_at` and transition/Undo rules align (`decision-log.md:25`; `prd-v2.md:108-109,153,208-214`; `technical-plan-v2.md:72-84`). |
| Technical P1 | Trigger-disable fallback silently lost Inbox captures | **Resolved in plan** | Application transaction is primary, DB guard is secondary, Processing fails closed, readiness query blocks re-enable (`decision-log.md:29`; `technical-plan-v2.md:142-172,418-425`). |
| Technical P1 | Undo-of-Undo was undefined | **Resolved** | One-level Undo, Undo-origin rejection, ordinary redo, unique target (`decision-log.md:24`; `technical-plan-v2.md:104-111,253-266`). |
| Technical P1 | Legacy event backfill blocked first database open | **Resolved in plan** | Boot migration is bounded; baseline event population is resumable/optional and read enablement waits for readiness (`decision-log.md:28`; `technical-plan-v2.md:174-192`). |
| Technical P2 | Active index did not match dominant predicate | **Resolved as a benchmark proposal** | Partial indexes plus plan snapshots and 10k/50k fan-out gates (`technical-plan-v2.md:120-140`). |
| Technical P2 | Event UUID/provenance was not executable | **Resolved in plan** | Application UUID, raw-guard fallback, bounded mapping, collision tests (`technical-plan-v2.md:113-118,360-370`). |
| Technical P2 | Partial batch retry lacked receipts | **Deferred** | No first-release batch endpoint (`decision-log.md:21`; `prd-v2.md:63-66`; `technical-plan-v2.md:239`). Receipt contract is future work. |
| Technical P2 | Hard-delete changed metrics without a truth contract | **Resolved** | Retained-item semantics, cache invalidation, disclosure, and tests are explicit (`decision-log.md:27`; `prd-v2.md:248-250`; `technical-plan-v2.md:289-291`). |
| Technical P3 | Route notation/tooling gates drifted | **Resolved** | Bracket routes and M0 E2E/a11y approval (`technical-plan-v2.md:219-239,341-346,386-393`). |

## Cross-Artifact Consistency Checks

| Contract | Decision log | PRD v2 | UX/UI v2 / prototype | Technical v2 | Verdict |
|---|---|---|---|---|---|
| Metrics | Weekly Inbox health, episode Processed, Added, first completion (`CPW-018`) | Same hierarchy; Added includes enrolled episodes (`:231-250`) | UX source shows weekly hierarchy, but retained screenshots show Processed today | Added also includes reprocess/move-to-Inbox (`:268-281`) | **P1 semantic defect; evidence drift** |
| Enrollment | Dormant baseline; selected/recent 30d capped 25/all (`CPW-006`) | Exact count preview and enrollment-time entry (`:137-153`) | Same specification; onboarding is not direct prototype evidence | Frozen ID/hash and explicit confirmation (`:174-192`) | **Consistent; validation pending** |
| Batch | Deferred (`CPW-013`) | Removed from first release (`:63-66`) | No batch UI; explicitly scoped out | No batch endpoint (`:239`) | **Consistent** |
| Archive | Done-only separate lifecycle; restore Done; compound reprocess (`CPW-010/011`) | Full matrix (`:112-135`) | Same user behavior; prototype actions work | Processing-only filter and matrix regressions (`:251,293-295`) | **Behavior consistent; field name drift** |
| Mobile | More + Library summary/capture feedback; >20% promotion gate (`CPW-003`) | Same (`:86-95`) | IA preview in Processing; B/C mobile only | Discovery test/no-go (`:407,438`) | **Consistent as proposal; not validated** |
| Detail | Canonical full route, read-only optional preview (`CPW-012`) | Same plus draft guard/return (`:174-180`) | Route simulation exists; full filter/cursor return is explicitly unproven | Existing detail canonical (`:194-205,225-227`) | **Consistent; prototype proof bounded** |
| Undo | One-level, time-bounded, linked; no Undo-of-Undo (`CPW-016`) | Same (`:248,327,347`) | Prototype one-level Undo does not expire | Server eligibility; no duration specified (`:253-266`) | **Partial; exact expiry contract absent** |
| Current Inbox age | Dedicated projection (`CPW-017`) | Current-entry ordering/metric (`:109,153,208-214,235`) | UX says current-entry, but prototype says `Oldest captured first` (`App.jsx:763`) | Exact projection/Undo/index (`:72-84,120-140`) | **Specification consistent; prototype copy wrong** |
| Migration | Bounded boot schema + resumable event population (`CPW-020`) | Split-backfill mitigation (`:357-370`) | Not a UX behavior | Exact bounded/resumable readiness plan (`:174-192,386-425`) | **Consistent** |
| Degraded mode | App transaction primary; guard; fail Processing closed (`CPW-021`) | Same as capture trust requirement (`:137-153,332-355`) | Honest offline behavior only; no production claim | Integrity query and visible capture failure (`:142-172,418-425`) | **Consistent in plan** |
| Mutation replay | Version + mutation ID + current snapshot (`CPW-015`) | Unknown outcome must reconcile before retry (`:252-263`) | Conflict/failure fixtures only | Says return prior response on replay and lacks an explicit lookup contract (`:241-265`) | **P1 inconsistency** |

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found. The package remains explicitly **Explored — not implemented**, and no production implementation is represented as complete.

### P1 - High Risk

#### 1. “Added” is now a churn-inflatable episode count disguised as new capture volume

**Evidence:** PRD v2 defines Added as “new/enrolled Inbox-entry episodes” (`prd-v2.md:241-250`). Technical v2 expands it to initialized, enrolled, reprocessed, and move-to-Inbox episodes (`technical-plan-v2.md:268-281`). Decision CPW-018 and UX v2 present “Processed this week vs Added this week” without disclosing that a backward move or reprocess increments Added (`decision-log.md:26`; `ux-ui-v2.md:134-140`). The original v1 contract defined Added as a genuinely new item and excluded enrollment/re-entry.
**Why it matters:** “Added” conventionally means new capture volume. Counting ordinary returns, reprocesses, and enrollment under that label makes the headline manipulable and prevents users from distinguishing capture pressure from deliberate workflow re-entry.
**Failure mode:** Move one existing source to Inbox and out again: both Added and Processed rise. Re-enroll 25 old sources: Added spikes despite no new capture. The comparison appears healthy while the actual capture backlog may be unchanged.
**Recommendation:** Restore **Added = genuinely new initialized capture only**, with duplicate/repair/baseline/enrollment/re-entry excluded. If episode inflow is useful, create a separately labeled **Entered Inbox** metric with origin breakdown (new capture, enrolled legacy, reprocessed/returned) and never call it Added. Publish a numeric metric truth table in PRD/technical v2 and CPW-018.

#### 2. Exact mutation replay can return stale state and the outcome-query contract is missing

**Evidence:** CPW-015 requires current snapshot reconciliation (`decision-log.md:23`), and PRD v2 requires outcome lookup before retry (`prd-v2.md:252-263`). Technical v2 mutation step 3 says “return prior response for exact mutation-ID replay” (`technical-plan-v2.md:241-249`), while line 262 says to query mutation ID/status but the API section at lines 219-239 defines no mutation-outcome read endpoint or replay response containing current truth.
**Why it matters:** Idempotency proves whether an earlier intent committed; it does not mean the old accepted snapshot is still current.
**Failure mode:** Mutation A commits at version 8, mutation B later commits at version 9, then a lost-response retry of A receives the old version-8 response and the client renders/stores stale state over version 9.
**Recommendation:** Exact replay must return both the originally accepted event/version and the **current canonical projection/currentVersion**, with `replayed=true`. The client must install only current truth. Define either an authenticated `GET` outcome endpoint by mutation ID or explicitly use replay of the exact semantic request; specify 404/expired/foreign/mismatch behavior and test replay after later mutations.

### P2 - Medium Risk

#### 1. Design QA and retained screenshots do not correspond to the current v2 prototype contract

**Evidence:** Current source renders “Processed this week” and “8 added” (`App.jsx:730-736`), but `direction-b-inbox-desktop-1440x1024.png`, `direction-b-inbox-mobile-390x844.png`, `direction-b-inbox-reference-1487x1058.png`, and the comparison image visibly show “Processed today.” The screenshots predate the current `App.jsx`; design QA names those captures as final evidence (`design-qa.md:8-15`) and still declares passed (`:110-117`). Current source and built output also say `Oldest captured first` (`App.jsx:763`), contradicting CPW-008/017 and all v2 current-Inbox-entry ordering.
**Why it matters:** The source may be closer to v2, but stakeholder review and PR screenshots can still present the rejected v1 metric and wrong ordering. A passed QA report must identify the exact tested revision.
**Failure mode:** Stakeholders approve Processed today from screenshots while the written proposal says weekly; engineers copy captured-age ordering from the prototype; reviewers cannot reproduce the reported pass.
**Recommendation:** Rebuild, re-run the final interaction/console pass, recapture every retained v2 screenshot, update `Oldest current Inbox entry first`, and record a commit/hash or file checksum in design QA. Do not publish stale images in the PR.

#### 2. Time-bounded Undo is not an executable cross-artifact contract

**Evidence:** Decision CPW-016 and PRD AC-12 say time-bounded (`decision-log.md:24`; `prd-v2.md:347`). Technical v2 says server eligibility but gives no duration or expiry response (`technical-plan-v2.md:253-266`). UX v2 says Undo is visible “once” (`ux-ui-v2.md:63-75`) without an expiry. Prototype history persists until another action or Undo; no timer exists (`App.jsx:406,447-498,677-681`).
**Why it matters:** Client-only visibility, server reversibility, accessibility announcement, and conflict behavior must share one expiry rule.
**Failure mode:** UI hides Undo while the server still accepts it, or UI offers Undo after the server rejects it; assistive-technology users receive insufficient time; tests cannot define pass/fail.
**Recommendation:** Choose one minimum visible window and server expiry contract, include an `undoEligibleUntil` timestamp in success/replay responses, specify focus/announcement on expiry, and add prototype/test evidence. Preserve the no-Undo-of-Undo invariant.

#### 3. Mobile discovery remains an IA mock inside Processing rather than evidence that users can find Processing

**Evidence:** `App.jsx:600` renders “Library summary” only when the user is already on Direction B Processing. Mobile navigation buttons are visual-only and Processing remains represented as More (`App.jsx:719-727`). UX v2 accurately calls it an IA preview (`ux-ui-v2.md:30-36`), while PRD AC-16 requires finding Processing from Library/More (`prd-v2.md:351`). Design QA records B/C mobile but not Direction A mobile (`design-qa.md:14,63-69,71-84`).
**Why it matters:** Discoverability is the reason mobile navigation is allowed to differ from desktop. Showing the proposed entry after arrival cannot validate discovery.
**Failure mode:** The feature remains hidden under More; the Library summary looks understandable in isolation but is missed in the real Library layout.
**Recommendation:** Treat the >20% gate as open. Before implementation approval, prototype a real Library screen and functional More path, run unaided discovery tasks, and inspect Direction A at mobile to complete all-direction responsive evidence.

#### 4. Free-form `metadata_json` weakens the content-free event guarantee

**Evidence:** Technical v2 adds nullable `metadata_json` and allows bounded codes/episode identifiers while prohibiting content in prose (`technical-plan-v2.md:86-118`). PRD v2 treats content-free history as a product principle and privacy requirement (`prd-v2.md:33-44,289-305,353`). No exact schema, JSON CHECK, serializer allow-list, or payload-size bound is specified.
**Why it matters:** A generic JSON escape hatch is the easiest place for source titles, URLs, errors, or provider content to leak during debugging. Prose prohibition is not an enforcement mechanism.
**Failure mode:** An implementation writes a free-form error or UI context into metadata; workflow history becomes private-content-bearing and survives until hard delete.
**Recommendation:** Prefer explicit typed columns for episode ID and bounded reason code. If JSON remains, define a versioned allow-listed schema, byte cap, reject unknown keys, forbid free-form strings, and add property tests/log inspection before authorization.

### P3 - Low Risk Or Polish

#### 1. The archive column name is not consistent across the contract

**Evidence:** Decision CPW-010 and PRD v2 use `archived_at` (`decision-log.md:18`; `prd-v2.md:112-118`), while technical v2 proposes `workflow_archived_at` throughout (`technical-plan-v2.md:43-70,120-140,293-295`).
**Why it matters:** The names express different scope. The prefixed name better prevents future confusion with global content archive.
**Failure mode:** Acceptance tests, SQL, and documentation refer to different columns or imply global archive semantics.
**Recommendation:** Standardize on `workflow_archived_at` in all v2 artifacts while keeping user-facing copy “Archived from Processing.”

#### 2. The prototype's note-return guard omits the PRD's Save-on-exit option

**Evidence:** PRD AC-8 requires Save/Discard/Keep editing (`prd-v2.md:343`). UX v2 repeats that contract (`ux-ui-v2.md:89-97`). The route prompt offers only Keep editing and Discard (`App.jsx:241-277`); Save is available elsewhere but not in the attempted-return prompt.
**Why it matters:** It is a small but concrete mismatch in the claimed route/draft evidence.
**Failure mode:** A user must cancel return, find Save, and retry instead of completing the intended safe exit.
**Recommendation:** Either add Save and return to the prompt or change the acceptance contract to the actual existing notes behavior after verifying the current product.

## What The Original Plan Or Work Gets Wrong

- V2 says metric decisions are aligned while silently redefining Added from new capture volume to every eligible Inbox-entry episode.
- V2 preserves idempotency language but regresses the replay response from “accepted event plus current truth” to an unsafe old response.
- Design QA declares a final pass without tying the pass to the current source revision; retained screenshots show rejected v1 metrics.
- The prototype still communicates captured-age ordering after v2 made current Inbox-entry time a core decision.
- The documents call Undo time-bounded without defining the bound.
- The mobile summary is a presentation preview, not discoverability evidence.
- Privacy relies on prose around a generic JSON column rather than enforceable event shape.

## Missing Validation

- Numeric metric truth table for new capture, duplicate, enrollment, return to Inbox, reprocess, exit, Undo, completion, archive, and hard delete.
- Replay-after-later-mutation and mutation-outcome lookup contract/E2E.
- Fresh screenshots and QA revision identifier after the final source/build.
- Exact Undo eligibility duration, expiry response, announcement, and accessibility timing.
- Real Library/More unaided mobile discovery test and Direction A mobile evidence.
- Multi-value OR filters, chips, no-tag/no-topic, and filter URL restoration.
- Unknown-outcome, deleted, AI-topic-change, and Undo-conflict prototype/implementation fixtures.
- Manual NVDA, VoiceOver, TalkBack, switch, 200%/400% zoom, and virtualized-focus evidence.
- 10k/50k query, WAL/disk, migration interruption/resume, and single-writer contention measurements.
- Enforced allow-listed event metadata schema.

## Revised Recommendations

1. Restore Added to genuinely new captures; separately name Inbox-entry episode inflow.
2. Return original acceptance plus current truth for idempotent replay and define outcome lookup.
3. Re-run design QA against a fixed revision and replace stale screenshots.
4. Change prototype ordering copy to current Inbox-entry time.
5. Define exact Undo visibility/server eligibility and prototype expiry.
6. Keep mobile discovery, multi-value filtering, trust states, AT, scale, and migration rehearsals as explicit no-go gates.
7. Standardize `workflow_archived_at` across artifacts.
8. Replace generic workflow metadata JSON with typed/allow-listed bounded fields.
9. Continue to prohibit production changes until separate authorization.

## Go / No-Go Recommendation

**Exploration:** Conditional go. The package is useful for stakeholder comparison if every presentation clearly says **Explored — not implemented** and the P1 metric/replay defects are disclosed as unresolved, not represented as settled v2 decisions. Fresh prototype evidence should be produced before using screenshots for approval.

**Implementation:** No-go. In addition to the two P1 defects, the documented naming, mobile, quick-preview, enrollment-cap, metric-pressure, E2E/a11y tooling, archive-matrix approval, AT, performance, migration, and degraded-mode gates remain unsatisfied. No production code, schema, migration, API, flag, or rollout should begin from this package.

## Plan Revision Inputs

### Required Deletions

- Delete enrollment/reprocess/move-to-Inbox from the metric named Added.
- Delete “return prior response” from idempotent replay.
- Delete stale Processed-today screenshots from v2/PR evidence.
- Delete `Oldest captured first` from the selected Inbox prototype.
- Delete any claim that the current mobile preview proves discoverability.

### Required Additions

- Add separate Added and Inbox-entry episode definitions.
- Add original-acceptance plus current-snapshot replay fields and outcome endpoint/replay behavior.
- Add exact Undo expiry and `undoEligibleUntil` semantics.
- Add design-QA revision/checksum and fresh captures.
- Add real mobile Library/More discovery evidence.
- Add allow-listed event metadata enforcement.

### Required Acceptance Criteria Changes

- Make Added numeric expectations capture-only.
- Add replay after a later mutation and prove the client retains newest state.
- Add Undo expiry before/at/after boundary and assistive-technology timing.
- Require current-entry ordering copy and fixtures, not capture-age wording.
- Require functional Library/More discovery at 390×844 and 320px.
- Require screenshot/QA evidence to identify the exact tested revision.

### Required Validation Changes

- Re-run prototype build, console, interaction, visual, and screenshot QA after final edits.
- Add metric fixture SQL with exact numbers.
- Add mutation replay/lookup E2E.
- Add actual mobile discovery testing.
- Add metadata-schema rejection tests.
- Preserve every production-only no-go gate in the final traceability matrix.

### Required No-Go Gates

- Any headline metric whose event origins remain ambiguous or churn-inflatable.
- Any replay response that can return a stale projection as current truth.
- Any prototype screenshot that predates the source claimed by design QA.
- Any undefined Undo expiry.
- Any production implementation before stakeholder, archive, tooling, AT, scale, migration, and degraded-mode gates pass.

## Residual Risks

Even after these fixes, the feature may create perceived backlog debt, duplicate Library behavior, remain hard to discover on mobile, or fail under real SQLite writer contention. The optional quick preview may not earn its complexity. Pointer drag plus virtualization plus focus remains a high-risk integration. Those risks are acceptable only for continued exploration; they require measured usability, assistive-technology testing, production-size database rehearsal, and separate implementation authorization.
