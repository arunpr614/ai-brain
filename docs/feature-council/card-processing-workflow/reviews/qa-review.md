# Card Processing Workflow — QA Review

**Role:** Independent QA/Reviewer
**Review date:** 2026-07-11
**Baseline:** `1cb5d36f37611e60442b4f2c4433b45455273500`
**Classification:** **Explored — not implemented**
**Review target:** research package, product/UX/technical v1 artifacts, isolated three-direction prototype, screenshots, and current worktree diff

## Verdict

**GO for continued stakeholder exploration; NO-GO for discovery closeout at this review cutoff.**

The package convincingly frames a processing problem rather than a card-display feature. It separates workflow status, manual tags, AI topics, and archive; chooses a defensible Inbox-first direction; covers every known ingestion path in the technical plan; defines meaningful first-event metrics; and keeps project-management scope out.

The selected prototype demonstrates the central happy path, but it does not yet meet its own v1 review contract. Five P1 gaps block a claim that Direction B has complete prototype evidence: matching and Inbox totals are misleading at default, promised trust/failure fixtures are absent, batch behavior is not reviewable, an unsaved note draft can be dismissed without protection, and mobile row actions are below the documented touch-target minimum. These can be resolved in the prototype or explicitly removed from the prototype acceptance contract; they cannot be silently called complete.

## Evidence reviewed

- Original goal objective, including the definition of done.
- All files in `research/`, `product/`, `ux/`, `technical/`, and `reviews/` present at this cutoff.
- Gallery and all three direction entry pages in `prototypes/`.
- Prototype implementation in `prototypes/src/App.jsx` and `prototypes/src/styles.css`.
- All 16 screenshot files then present in `prototypes/screenshots/`, including gallery, three desktop directions, three mobile directions, Direction B detail, five state captures, and the reference comparison.
- Current Git status/diff scope and ignore behavior.

This QA lane did not use standalone Playwright. It ran safe static/build checks and inspected the supplied visual evidence. Browser interaction and console evidence must be recorded by the coordinator's in-app Browser/design-QA pass.

## Validation evidence

| Check | Result | Evidence / limit |
|---|---|---|
| Isolated production build | **Pass** | `npm run build` completed successfully on 2026-07-11: 1,577 modules transformed; gallery plus `direction-a.html`, `direction-b.html`, and `direction-c.html` emitted. |
| Runtime regression during review | **Resolved** | A transient missing `useEffect` import was caught after dialog focus work. The import was added and the build passed again. Runtime dialog verification remains part of the coordinator Browser gate. |
| Local Markdown link targets | **Pass at cutoff** | A recursive check found no missing local targets among Markdown links then present. Anchors and future v2/wiki additions still need final validation. |
| Prototype asset references | **Pass statically** | HTML inputs, logo, concept images, shared source entry, and Vite multi-page configuration are present. |
| Production-code isolation | **Pass at cutoff** | Current changes were limited to `RUNNING_LOG.md` and the new feature-council documentation/prototype tree; no production application, schema, migration, API, or feature-flag file was modified. |
| Generated dependency hygiene | **Pass after correction** | `prototypes/.gitignore` now excludes `.npm-cache/`, `dist/`, and `node_modules/`; a direct ignore check confirms `.npm-cache/` is excluded. Final staging should still verify no cache/build output is tracked. |
| Automated prototype tests | **Not available** | Prototype package exposes only `dev`, `build`, and `preview`; there is no lint, unit, interaction, or accessibility test script. This is acceptable for a throwaway prototype only if manual evidence is complete. |
| Browser console | **Pending external evidence** | No console-log artifact existed in the reviewed tree. A clean in-app Browser error/warning capture for gallery, all directions, detail, and state modes is a closeout gate. |

## Findings

### P0 — none outstanding

No production-data, destructive, or un-runnable-prototype blocker remained in the files at this review cutoff. The transient dialog import regression was fixed before this report and is retained above as validation history.

### P1 — closeout blockers

#### QA-P1-01 — Matching and Inbox totals are not comparable

`Prototype` passes `filtered.length` to `FilterBar`. That value includes every matching active status and the archived fixture, while the adjacent value is the unfiltered active Inbox total. The default Direction B screenshot therefore says **12 matching · 5 total in Inbox** while the Inbox list itself has 5 rows. This fails PRD AC-13 and the objective's requirement that filters and counts be understandable.

**Required disposition:** Compute and label a view/scope-specific matching value. For Inbox, both values must use Inbox scope (`5 matching · 5 total in Inbox` at default). For Board/List/Archived, label the active/archive scope separately from total Inbox health. Re-capture affected evidence.

#### QA-P1-02 — Trust and mutation-failure states are specified but not reviewable

The state selector exposes Normal, Loading, Load error, Offline, Empty Inbox, and Filtered empty. It does not expose mutation pending, local action failure/Retry, sent-outcome-unknown, conflict reconciliation, deleted/inaccessible, AI-topic membership change, or Undo conflict. UX/UI v1 explicitly requires directly reviewable states for these, and PRD AC-17/19/30 relies on them.

**Required disposition:** Add isolated fixtures for the promised critical states, with safe source-local rollback/reconciliation and visible focus/announcement behavior, or narrow v2 prototype acceptance and mark each omitted state as specification-only with a concrete pre-implementation validation gate. Conflict and local-action failure should remain P1 gates because they test the core trust thesis.

#### QA-P1-03 — Batch semantics cannot be evaluated

PRD v1 includes bounded batch move/archive, AC-10 requires Board/List batch parity, UX/UI v1 requires visible selection and a batch preview, and the technical plan recommends explicit per-item partial outcomes. The prototype has no checkboxes, selection toolbar, eligibility preview, partial result, or partial Undo. Direction C is described as having a strong batch posture without demonstrating it.

**Required disposition:** Add a minimal visible-selection fixture that demonstrates mixed archive eligibility and explicit partial outcomes on desktop and mobile, or remove batch from the proposed first-release scope in PRD/UX/technical v2. Do not retain it as accepted scope while leaving its central safety decision untestable.

#### QA-P1-04 — Unsaved notes can be discarded by dialog dismissal

The detail prototype tracks `saved=false`, but Close, Escape, and backdrop click all call `onClose` without a guard or recovery. The UI simultaneously claims workflow changes do not clear the note. This fails the note-safety trust requirement and accessibility scenario A11Y-11.

**Required disposition:** When a draft is unsaved, block dismissal with an accessible Save / Discard / Keep editing decision or preserve the draft for recovery. Verify Close, Escape, backdrop, status move, archive, and return-focus paths.

#### QA-P1-05 — Mobile primary row actions miss the 44px acceptance gate

At `max-width: 767px`, `.card-actions button` and `.card-actions select` are 36px high. These are the primary no-drag Move/Open controls in Inbox, Board, and List. Several other dialog and filter controls remain 38–40px. This contradicts PRD AC-27 and UX/UI v1's explicit 44×44 mobile target.

**Required disposition:** Raise every mobile task control's hit area to at least 44×44 CSS pixels, then verify at 390×844 with focus visible and the fixed bottom navigation not covering actions.

### P2 — material follow-ups

#### QA-P2-01 — Filter algebra is only partially demonstrated

One single-select User tag and one single-select AI topic demonstrate AND-across facets, but not OR-within a facet, active chips, removal of one facet value, or No user tags / No AI topics. This is partial evidence for PRD AC-12.

**Disposition:** Add multi-select/chips or explicitly narrow the prototype learning claim; keep the full OR-within/AND-across contract in v2 and implementation tests.

#### QA-P2-02 — View/detail state is memory-only, not addressable or restorable

Views, scenarios, filters, selection, and detail use component state only. They do not survive refresh, Back/Forward, direct linking, or a detail-return URL. UX/UI v1 promises directly addressable states and place preservation.

**Disposition:** Add query/hash state to Direction B or label this as a prototype limitation and retain URL normalization/anchor restoration as a mandatory future implementation spike.

#### QA-P2-03 — Tabs use incomplete ARIA patterns

View and mobile-status controls declare `role="tab"` but do not implement arrow-key navigation, roving tab index, `aria-controls`, or associated tabpanels. The current pattern mixes tab semantics with button-driven conditional views.

**Disposition:** Either complete the tab pattern or use ordinary route/toggle buttons with `aria-pressed` and clear headings. Verify focus after a view switch.

#### QA-P2-04 — Scenario fidelity is internally inconsistent

Loading and load-error modes leave numeric metrics visible instead of placeholders/em dashes. “Empty Inbox” hides every active status while still showing Inbox now = 5, and can render an empty Board/List rather than only an empty Inbox. This weakens state-review evidence.

**Disposition:** Make scenario data and labels truthful per view; distinguish no Inbox items from no active workflow items.

#### QA-P2-05 — “Process next 3” does not represent a three-source session

The control selects the first Inbox item and switches to Inbox, but it does not bound, count, advance, or complete a three-source session. The visible label overstates the interaction.

**Disposition:** Implement a small three-item session fixture or rename the control to “Process next”.

#### QA-P2-06 — Screenshot evidence names do not match captured pixel widths

Most desktop files named `1440x1024` are 1404×1024 JPEG payloads; the `1487x1058` reference screenshot is 1404×1058. The mobile 390×844 files match their names. This does not invalidate the visual direction, but it prevents exact-viewport evidence claims.

**Disposition:** Record the in-app Browser viewport and actual screenshot pixel size separately; recapture at exact dimensions if the final QA claim says exact 1440×1024.

#### QA-P2-07 — UX v1's extended responsive matrix is not evidenced

Visual evidence exists at desktop and 390×844 mobile for all directions, but not at 1280×800, 1024×768, 360×800, 412×915, 200% zoom, 400% reflow, or text-spacing/large-text settings.

**Disposition:** Treat 1440/390 as the discovery minimum and record the extended matrix as a pre-implementation accessibility gate, or add representative captures before claiming UX v1 review acceptance.

### P3 — polish and evidence quality

#### QA-P3-01 — “Leave in Inbox” is a silent no-op

The Quick preview button intentionally changes no state but provides no acknowledgement or move-to-next behavior. It is unclear whether the source was deliberately reviewed.

**Disposition:** Announce “Left in Inbox” and define whether the triage cursor advances; do not count the action as processed.

#### QA-P3-02 — Large-backlog behavior is specified but not simulated

Technical v1 has concrete cursor, virtualization, and performance budgets, but the prototype uses twelve in-memory cards with no pagination/loading-more affordance.

**Disposition:** Add a bounded visual fixture or retain scale as an explicit implementation spike; do not infer usability at 10k/50k from this prototype.

#### QA-P3-03 — No automated a11y/contrast evidence is attached

Focus styling, reduced-motion CSS, semantic lists, a live region, and the improved dialog focus trap are positive. However, there is no attached automated scan, measured contrast table, or assistive-technology run.

**Disposition:** Record manual keyboard/zoom/screen-reader limits honestly; run automated checks only after the direct dependency/tooling decision.

## Objective coverage matrix

Legend: **Pass** = demonstrated in artifact/prototype evidence; **Partial** = specified but incomplete or not fully demonstrated; **Missing** = no reviewable evidence; **Spec-only** = credible plan exists but throwaway prototype does not prove behavior.

| Required flow/state/fixture | Artifact coverage | Prototype evidence | Result | Gap / condition |
|---|---|---|---|---|
| Three meaningfully different directions | `product-directions.md`, `ux-ui-v1.md` | Gallery plus A/B/C pages and images | **Pass** | Weighted 70/94/79 decision is clear. |
| Inbox-first processing loop | PRD §8–10; UX core flow 1 | Direction B Inbox + Quick preview | **Pass** | Central workflow is understandable. |
| Inbox / To Do / In Progress / Done meanings | PRD workflow model; technical lifecycle | Visible labels and cross-state controls | **Pass** | Backward movement available through selects. |
| Board/List switching | PRD AC-09/10 | Shared view tabs in all directions | **Pass** | State preservation is not proved. |
| Pointer drag across columns | UX Board move; technical status-only drag | Desktop Board draggable cards/drop columns | **Pass** | Cancellation/focus not evidenced. |
| Non-drag movement | Accessibility input; PRD AC-11 | Native status selects in Inbox/Board/List/detail | **Pass** | Mobile target size blocks acceptance. |
| User-tag filtering | PRD filtering | User tags select | **Partial** | One value only; no OR-within or untagged. |
| AI-category/topic filtering | Reconciliation; PRD filtering | Separate AI topics select | **Partial** | Correct separation, incomplete algebra. |
| Combine and clear filters | UX filter contract | Both selects + conditional Clear all | **Partial** | AND-across shown; chips/individual removal absent. |
| Matching vs total counts | Metrics framework; PRD AC-13 | Summary + column counts | **Fail** | Default values compare different scopes (QA-P1-01). |
| Open source/card | PRD detail behavior | Quick preview and dialog | **Pass** | Prototype dialog stands in for canonical route. |
| View/edit notes | PRD notes contract | Fictional note textarea/save | **Partial** | Unsaved dismissal safety fails (QA-P1-04). |
| Change status from detail | PRD AC-16 | Detail status select | **Pass** | No failure/conflict fixture. |
| Daily/weekly metrics | Metrics framework | Inbox now, processed today/week, completed week | **Pass** | Static fixture; definitions live in docs. |
| Archive Done | PRD archive contract | Done-only Archive controls | **Pass** | No action-failure fixture. |
| View Archived | PRD AC-21/22 | Archived view with fictional source | **Pass** | Separate workflow-only copy is clear. |
| Restore to Done / Reprocess Inbox | PRD archive contract | Both Archived actions | **Pass** | Correct semantic distinction. |
| Undo | PRD/technical Undo contract | One-level in-memory Undo toast | **Partial** | No expiry, conflict, partial batch, or durable version proof expected in static prototype. |
| Loading | UX state spec | Skeleton scenario + capture | **Partial** | Metrics remain live; no announcement evidence. |
| True empty | UX state spec | Empty scenario + capture | **Partial** | Scope/metric contradiction. |
| Filtered empty | UX state spec | Dedicated scenario + Clear all + capture | **Pass** | Total Inbox copy remains visible. |
| Initial load error | UX state spec | Alert + Retry + capture | **Partial** | Metrics should be unknown, not live. |
| Offline | UX state spec | Banner + disabled workflow controls + capture | **Pass** | Tooltips/reasons and note recovery not fully tested. |
| Mutation pending/local failure | UX state spec | None | **Missing** | QA-P1-02. |
| Unknown outcome/conflict | UX/technical trust contract | None | **Missing** | QA-P1-02. |
| Deleted/AI-topic change/Undo conflict | UX state spec | None | **Missing** | QA-P1-02. |
| Batch move/archive/partial result | PRD §13; technical batch API | None | **Missing** | QA-P1-03. |
| Existing-card enrollment/onboarding | PRD migration; technical enrollment | None | **Spec-only** | No first-use fixture. |
| Desktop navigation | PRD IA | Sidebar in all desktop captures | **Pass** | Direction A labels sidebar Processing rather than Workflow; acceptable comparison shell. |
| Mobile navigation | PRD IA | Fixed bottom nav; More active for Direction B | **Partial** | Library Inbox summary entry not demonstrated. |
| Mobile Board | UX mobile Board | One-status-at-a-time tabs and A mobile capture | **Pass** | No horizontal four-column board. |
| Mobile core flow at 390×844 | PRD AC-26 | A/B/C 390×844 captures | **Partial** | Move target sizes and unsaved-note flow block acceptance. |
| 1440×1024 desktop | UX required viewport | Desktop captures | **Partial** | Captured payload is generally 1404×1024. |
| 1280/1024/360/412 + zoom/reflow | UX required matrix | None | **Missing** | QA-P2-07. |
| Large backlog pagination/virtualization | Technical §§9,14 | Twelve in-memory fixtures | **Spec-only** | No prototype evidence. |
| Multi-tab/device concurrency | Technical §§10–13 | None | **Spec-only** | CAS/idempotency test plan is credible. |
| Fictional/static data only | Prototype source/README | Twelve clearly fictional sources; no API calls | **Pass** | No private content observed. |
| Persistent non-production marker | PRD AC-28 | Gallery and every direction shell | **Pass** | Clearly says Explored — not implemented. |

## Product/technical release-risk assessment

| Council question | QA assessment |
|---|---|
| Solves processing versus display | **Yes, at proposal level.** Inbox-first next-decision flow is meaningfully different from a board-only display. |
| Status/archive meanings | **Yes.** Definitions and transitions are unambiguous; archive is separate, Done-only, workflow-scoped, and reversible. |
| Every ingestion path defaults to Inbox | **Yes in plan, not implemented.** Section 8 of technical v1 enumerates web, APIs, Android/extension, Telegram, Recall, duplicates, transcripts, repair, workers, and raw insert proof. |
| Existing-card migration safety | **Credible proposal.** Dormant Inbox/version-0 baseline plus explicit selected/recent/all enrollment avoids silent backlog and metric pollution. It remains a high-risk migration needing backup rehearsal. |
| Metric precision | **Strong.** First effective Inbox exit and first Done entry, linked Undo, owner timezone/Monday week, and origin exclusions are sufficiently precise. |
| Board/List parity | **Partial prototype, strong spec.** Open/Move/archive work; batch, failure, persistence, and large-scale parity are unproved. |
| Drag accessibility | **Partial.** Native Move select reaches the same status mutation, but mobile hit targets and complete tab/focus/manual assistive-tech evidence remain open. |
| Mobile usability | **Promising but not accepted.** One-status Board is correct; fixed nav and primary hierarchy look usable; touch targets and batch/detail-note flows block full acceptance. |
| Filters/counts | **Not accepted.** Taxonomy separation is good, but count scope is misleading and algebra is incomplete in the prototype. |
| Archive/restore safety | **Yes in model; happy path only in prototype.** Failure/conflict and batch safety remain unproved. |
| History supports metrics | **Yes in plan.** Append-only content-free events plus version and Undo linkage cover first milestones and reversals. |
| Large backlogs | **Plan only.** Keyset pagination, indexes, virtualization, and budgets exist; no production fixture or prototype scale proof exists. |
| Failure/conflict preserves trust | **Well specified, not demonstrated.** This is a P1 evidence gap. |
| Architecture fit | **Credible with high-risk gates.** Workflow attaches to `items`, not SRS `cards`; central insert trigger, event volume, query plans, and rollback rehearsal require proof before authorization. |
| Scope drift to project management | **No current drift.** No assignees, due dates, sprints, dependencies, WIP limits, reminders, or collaboration entered v1. |

## Go / no-go gates

### To finish this discovery goal

1. Resolve every QA P1 in prototype/v2 or explicitly remove the affected requirement from recommended v1 with rationale.
2. Record dispositions for every P2/P3, including owner and next validation trigger.
3. Complete adversarial reviews and publish mutually consistent PRD v2, UX/UI v2, and technical-plan v2.
4. Attach clean in-app Browser console evidence and manual interaction evidence for gallery, A/B/C, detail, filters, movement, archive/restore/Undo, and all retained state fixtures.
5. Re-run build, local-link, ignored-output, and final-diff checks after all review edits.
6. Verify canonical wiki updates remain classified **Explored — not implemented** and contain no local/private paths.

### Before any implementation authorization

- Approve archive visibility, partial batch semantics, User tags/AI topics terminology, owner timezone UX, and mobile entry.
- Rehearse the migration on a production-size backup and prove trigger compatibility with FTS/enrichment/vector/chunk behavior.
- Pass CAS/idempotency/Undo/unknown-outcome/concurrent-tab tests.
- Meet query/count/metrics performance budgets at 10k/50k scale.
- Pass keyboard, screen-reader, reduced-motion, 200%/400% reflow, text-spacing, contrast, and mobile touch-target gates.

No finding in this review authorizes production code, schema, migration, API, feature-flag, rollout, or release work.

## Post-fix verification and disposition — 2026-07-11

This section preserves the original review and records an independent check of the subsequent prototype and v2 package. It does not retroactively erase the findings above.

### Post-fix outcome

**All five original P1 findings are resolved for discovery/stakeholder-review closeout.** No new P0 or P1 was found in this post-fix pass.

The package may advance from the original **NO-GO for discovery closeout** to **GO for discovery closeout**, subject to the coordinator's final wiki/link/diff/commit/push/PR checks. This remains a **NO-GO for production implementation or release**: migration rehearsal, every-ingestion-path proof, CAS/idempotency/unknown-outcome tests, scale budgets, multi-value filter proof, and the full accessibility/manual matrix remain explicit pre-authorization gates.

### P1 disposition verification

| Original finding | Disposition | Independent evidence | Result |
|---|---|---|---|
| QA-P1-01 — incompatible matching/Inbox counts | `viewMatching` is now scoped to Inbox, active Board/List, or Archived; `FilterBar` receives a typed `scope`. Empty/loading/error values are truthful. PRD v2 AC 6 formalizes the exact count fixture. | `prototypes/src/App.jsx` computes `viewMatching`/`viewScope` and renders `{matching} sources match {scope} · {total} total sources in Inbox`; the refreshed Direction B screenshot visibly shows `5 sources match in Inbox · 5 total sources in Inbox`. | **Resolved** |
| QA-P1-02 — trust/failure states not reviewable | The retained prototype contract now directly exposes local move failure and 409 conflict, in addition to loading/error/offline/empty/filtered-empty. Unknown outcome, deleted/inaccessible, AI-topic change, and Undo-conflict remain specified no-go fixtures and are explicitly not claimed as prototype proof. | Scenario selector contains Move failure and Version conflict; `MutationFailure` provides source-local unchanged-state copy and Retry; `ConflictState` states the authoritative current status and that intent was not applied. UX/UI v2 §10 and design QA §Residual validation limits record the narrower evidence boundary. | **Resolved for discovery scope** |
| QA-P1-03 — batch semantics untestable | Batch move/archive has been removed from recommended first-release scope rather than accepted without evidence. | PRD v2 §4 removes batch; UX/UI v2 states no batch selection; technical v2 rejects first-release batch endpoints and states no batch mutation endpoint; CPW-013 defers it until a separate partial-outcome/receipt prototype. The technical plan's “bounded batch size” in §7 is migration-job chunking, not a product mutation batch. | **Resolved by scope removal** |
| QA-P1-04 — unsaved notes silently discarded | Selected Direction B now uses a route-based detail simulation. In-product return is guarded by Keep editing / Discard draft, and browser unload receives a native guard. Workflow controls remain independent from note-save state. | `ItemDetailPage` uses `beforeunload`, `requestReturn`, and an unsaved-note prompt; `item-detail.html` is a fifth build entry. Design QA records edit/save/protect/discard/return interaction verification. | **Resolved** |
| QA-P1-05 — mobile task controls below 44px | Mobile CSS raises every button/select/primary link and all card actions to at least 44px, with fixed-navigation focus clearance. | At `max-width: 767px`, `:where(button, select, .primary-link)` and `.card-actions` use `min-height: 44px`; mobile Board status buttons use 48px. UX/UI v2 and PRD v2 retain 44×44 as an implementation gate. | **Resolved for prototype** |

### Material P2/P3 disposition changes

| Original item | Post-fix state |
|---|---|
| Filter algebra | Prototype proves one value per facet, AND-across, Clear all, and typed counts. OR-within multi-select, unlabeled values, active chips, and stable-ID URL normalization remain explicitly unproved production gates; no v2 artifact overclaims them. |
| Addressability/return | Direction B detail is a real isolated route entry and preserves direction/view/source return. Full filter/cursor URL normalization remains an implementation gate. |
| Incomplete ARIA tabs | Resolved by replacing tab roles with ordinary buttons using `aria-pressed`. |
| Scenario fidelity | Loading/error metrics render unavailable values; Empty Inbox sets Inbox total to zero while other active statuses remain available. |
| `Process next 3` | Resolved by renaming to honest `Process next`; Leave in Inbox now advances without creating a processed event. |
| Screenshot dimensions | Design QA records configured CSS viewport separately from emitted browser-capture pixels; filenames remain discovery labels, not pixel-identity claims. |
| Extended viewport/AT matrix | Still open and correctly classified as a production no-go gate. |
| Large backlog | Still plan-only with keyset/virtualization/query budgets and 10k/50k proof required before authorization. |
| Automated/manual accessibility | Design QA verifies prototype semantics/focus/contrast improvements, but the independent accessibility review remains a fail/no-go record until manual NVDA, VoiceOver, TalkBack, switch, zoom/reflow, text-spacing, and virtualization testing passes. |

One non-blocking screenshot-quality issue remains: `screenshots/direction-b-state-move-failure-1440x1024.png` contains a large partially repainted black region above the reviewed failure state. The state itself is legible, and design QA documents this in-app Browser capture limitation, but this file should not be used as stakeholder-facing PR imagery unless recaptured or clearly labeled as unstable evidence.

### Post-fix mechanical validation

| Check | Post-fix result |
|---|---|
| Isolated build | **Pass.** `npm run build` transformed 1,578 modules and emitted gallery, A, B, C, and `item-detail.html`. |
| Static source/asset coverage | **Pass.** Five HTML entries, shared application source, logo, three concept images, and refreshed state/detail evidence are present. |
| Ignore hygiene | **Pass.** `.npm-cache/`, `dist/`, and `node_modules/` are ignored; no such generated path appears in untracked output. |
| Production isolation | **Pass at this cutoff.** Git changes remain `RUNNING_LOG.md` plus the feature-council documentation/prototype tree; no production application, migration, schema, API, or flag file is changed. |
| Browser console evidence | **Pass by recorded design-QA evidence.** `prototypes/design-qa.md` records 0 errors and 0 warnings for gallery, A/B/C, detail, mutations, notes, filters, archive/recovery, and retained state scenarios. This static QA lane did not independently drive a second browser session. |
| Local Markdown targets | **Partial at this exact cutoff.** After this matrix and the canonical wiki page were created, the checker found one remaining future target referenced by the package README: `reviews/v2-consistency-review.md`. Re-run after the coordinator finishes that parallel review; an unresolved target blocks final commit, not the five P1 dispositions. |

### Final QA boundary

The current prototype and v2 package are coherent evidence for a review-only concept proposal. They are not evidence that the production data model, APIs, capture defaults, concurrency, metrics, accessibility, scale, migration, or archive integrations work. Those remain future, separately authorized engineering gates documented in PRD v2 AC 2, 3, 7, 11–18 and technical plan v2 §§5–21.
