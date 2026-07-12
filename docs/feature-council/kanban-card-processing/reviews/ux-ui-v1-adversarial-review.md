# Kanban Card Processing UX/UI v1 - Adversarial Review

**Created:** 2026-07-12 11:36:26 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/ux-ui-v1-adversarial-review.md`

## Executive Verdict

**No-go for implementation from UX/UI v1; conditional go for producing UX/UI v2.** The package covers many named states, but it is not yet an executable interaction contract. It claims implementation authority before the required v2 gate, inherits unresolved product findings, leaves the ten-second and rapid-action Undo model inaccessible and ambiguous, and does not define how non-status grouping, bounded pages, unloaded return anchors, mobile high-cardinality groups, or canonical-detail placement actually work. A faithful implementation could still lose place, expose inconsistent Board/List results, make Undo unreachable, or damage the existing mobile/detail experience.

## Evidence Inspected

- Execution goal: `/Users/arun.prakash/.codex/attachments/3a115369-f879-4661-8900-269defa7d59a/goal-objective.md`.
- Reviewed UX/UI v1, lines 1-692: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md`.
- PRD v1 and its adversarial review: `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/product/prd-v1.md` and `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/prd-v1-adversarial-review.md`.
- Approved baseline, current-state report, requirements extraction, source-conflict report, and design-state inventory under `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/`.
- Selected source package: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/ux/ux-ui-v2.md`, `reviews/ux-ui-v1-adversarial-review.md`, `reviews/accessibility-review.md`, `prototypes/design-qa.md`, `prototypes/AGENTS.md`, and `prototypes/handoff/AI_AGENT_HANDOFF.md`.
- Rendered Direction B evidence cited by the target, including desktop Inbox/Board/List/Archived/detail and mobile Board/List captures under `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/screenshots/`.
- Current product screenshots for Library and item detail/notes under `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/research/screenshots/current-product/`.
- Current application conventions in `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/src/components/sidebar.tsx:255`, `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/src/app/more/page.tsx:30`, `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/src/components/recall-manual-sync.tsx:295`, `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/src/styles/tokens.css:1`, and `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/package.json:162`.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. UX/UI v1 falsely authorizes implementation before the mandatory v2 authority gate

**Evidence:** The target calls itself `Implementation-authorized v1` and a `production implementation contract` at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:3` and `:15-17`. The execution goal requires adversarial review of each v1 artifact and requires v2 to incorporate or explicitly resolve findings before it becomes the implementation source of truth. The companion PRD has already received a no-go for the same authority error and unresolved taxonomy, daily-metric, archive, privacy, completion, Undo, and count issues at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/prd-v1-adversarial-review.md:8` and `:136`.
**Why it matters:** UI work can begin against a downstream contract whose parent product contract is explicitly no-go and expected to change.
**Failure mode:** Engineers implement weekly-only metrics, AI-topic-only filtering, archive behavior, counts, or Undo from v1; PRD/UX v2 later changes those contracts, leaving code and tests aligned to superseded requirements.
**Recommendation:** Reclassify UX/UI v1 as `Adversarial-review draft; not an implementation source of truth`. State that only reconciled PRD v2 + UX/UI v2 + technical-plan v2 authorize implementation, and add a tracker gate blocking schema/API/UI work until that reconciliation is recorded.

### P1 - High Risk

#### 1. The ten-second Undo contract remains inaccessible, and rapid actions have no deterministic ownership

**Evidence:** The package shows one visual notice, promises cross-view/detail availability, and removes it after ten seconds at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:368`; it never says whether a second confirmed action replaces the first, queues it, or leaves multiple server-eligible actions. It requires keyboard, screen-reader, and switch-control evidence at `:621` but provides no extension, adjustment, pause, or always-available equivalent reversal. The PRD adversarial review already identifies both gaps at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/reviews/prd-v1-adversarial-review.md:76`.
**Why it matters:** Ten seconds is easily consumed by speech, focus travel, switch scanning, cognitive processing, or view navigation. Ordinary reverse Move is not equivalent because it does not invalidate the original metric event or restore exact Inbox-entry facts.
**Failure mode:** A user hears the announcement but cannot reach Undo before expiry; a second action silently replaces the wrong recovery opportunity; a stale notice targets an action other than the one the server will undo.
**Recommendation:** UX v2 must define one explicit client scope (safest v1: most-recent eligible action per tab, replaced only on the next confirmed reversible action), visual replacement copy, focus behavior, same-item/different-item and multi-tab rules, and a conforming timing disposition. Prefer a materially longer/adjustable window or a persistent equivalent reversal that preserves exact projection and metric semantics; do not claim accessibility from expiry announcement alone.

#### 2. Non-status Board/List grouping is visually named but not defined as a deterministic data layout

**Evidence:** Group options include Primary User tag, Primary AI topic, capture age, and no grouping at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:282`, while Board structure and pagination are defined only as four workflow-status columns at `:196`. Neither the target nor current schema defines how a `Primary` tag/topic is chosen among multiple values, how `No ...` buckets work, group order, age buckets, tie-breaks, empty groups, or where `Load more {status}` lives when status is not the visible grouping. Current code has many-to-many tags/topics and no priority field (`/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/current-state-report.md:105`).
**Why it matters:** Board, List, count, cursor, and URL parity cannot be tested without one canonical group-membership and ordering algorithm.
**Failure mode:** Board and List assign the same source to different groups, duplicate a source across topics, omit it, or reorder it as additional per-status pages load; local group counts disagree with aggregate counts.
**Recommendation:** Add a complete group matrix: canonical primary-value rule or remove `Primary` options; explicit ungrouped bucket; bucket labels/order; source membership cardinality; sort tuple and stable ID tie-break; empty-group policy; per-group versus per-status pagination; and exact Board/List/filter/count parity fixtures. Do not allow client-side regrouping of partial status pages to masquerade as complete groups.

#### 3. Process next is persistent across views, but its cross-view and direct-selection behavior is undefined

**Evidence:** Process next is the only persistent primary action and precedes the view switcher at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:123`. Its behavior is specified only inside Inbox at `:168`. The target does not say what invoking it from Board, List, Archived, or a filtered view does; whether it switches to Inbox; which history/anchor it records; or how Archived-only filter matches are handled. It also says a row may be selected by `direct activation` at `:184` without defining a visible selection control, accessible name, selected state, or keyboard/touch behavior.
**Why it matters:** The core entry action can target content that is not present in the current DOM and can collide with dirty-note or view-return state.
**Failure mode:** Focus moves to a hidden/unmounted Inbox row, the action silently clears filters, Archived opens an apparently empty Inbox, or nested row activation conflicts with Open/Move controls.
**Recommendation:** Define one route-state transition for Process next from every view, including filter retention, view switch, URL/history update, loading/no-match state, announcement, and focus after the target page arrives. Add an explicit `Select {title} for processing` control or remove direct selection; do not make a row containing nested controls itself a vague clickable target.

#### 4. Pagination, virtualization, and return-focus rules assume targets exist without defining how they are loaded

**Evidence:** Board has independent bounded pages at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:203`, keyset rules appear at `:599`, and detail return promises exact originating focus at `:233` and `:441`. The package never specifies incremental loading, end-of-list, load-more failure/retry, an unloaded destination after Move/Undo, or how a return anchor beyond the first page is located and hydrated. Virtualization is merely `allowed` after gates, while acceptance asks for exact set semantics and focus through status boundaries at `:612`.
**Why it matters:** Stable IDs do not make an unloaded DOM node focusable. Return and mutation flows need a fetch/seek contract, not just fallback prose.
**Failure mode:** Back to Processing restores the wrong page, focus drops to a heading despite a valid source, Load more errors strand focus, or virtualization reports misleading position/set size.
**Recommendation:** Specify page-level pending/error/end states and focus for every view; define seek-by-anchor or cursor restoration, bounded retries, destination-page loading after Move/Undo, and when nearest-source fallback is permitted. Split acceptance into non-virtualized bounded-pagination evidence and a separate if-enabled virtualization gate with actual AT/focus traces.

#### 5. Canonical-detail integration is behaviorally careful but spatially unspecified against the real product

**Evidence:** The target says only `Add a compact Processing section` at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:233` and cites a custom two-column route simulation at `:89`. Current desktop detail already has a right metadata rail, and mobile detail uses route tabs with a full My notes editor (`/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/research/screenshots/current-product/card-detail-desktop-1440x1024.png` and `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/Kanban-designs/research/screenshots/current-product/card-notes-mobile-390x844.png`; `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/current-state-report.md:92`). The source simulation has a different page anatomy and editable note block. No exact insertion point/order is defined for desktop, mobile tabs, archived detail, notes-disabled state, or keyboard-open notes.
**Why it matters:** The highest-risk integration is remounting or crowding the existing note editor, especially on mobile behind fixed navigation.
**Failure mode:** Processing becomes a new detail tab that remounts My notes, pushes Save behind the bottom bar, duplicates Back behavior, or places workflow controls where they are absent on another detail tab.
**Recommendation:** Add desktop and mobile annotated wireframes based on current production detail, not the throwaway simulation. Define component ownership, insertion point on every route tab, sticky/non-sticky behavior, archived controls, notes flag states, keyboard-open layout, dirty-note guard entry, and proof that workflow mutation never remounts the note editor.

#### 6. Mobile Board converts arbitrary high-cardinality groups into an unbounded horizontal button strip

**Evidence:** Mobile Board shows one selected status/group and uses horizontally scrolling pressed buttons at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:496`. That is bounded for four statuses but not for User tags, AI topics, channels, or age groups. The package simultaneously requires no page-level horizontal scroll at 320px, 200%/400% reflow, switch control, and exact group access at `:506`, `:532`, and `:621`.
**Why it matters:** Dozens of taxonomy groups become a long serial scan for touch, keyboard, switch, and screen-reader users; zoom makes the strip worse.
**Failure mode:** Later groups are effectively undiscoverable, active state cannot be kept visible, and users traverse hundreds of buttons before reaching results.
**Recommendation:** Keep pressed buttons only for the four workflow statuses. For dynamic/high-cardinality groups use a labeled native select or accessible searchable dialog/list with counts, current value, no-results/loading/error states, and exact trigger return. Set a bounded rendering rule and test 50+ groups at 320px, 400% zoom, VoiceOver, TalkBack, and switch access.

### P2 - Medium Risk

#### 1. The Group & sort interaction depends on an application primitive that does not exist and leaves nested focus behavior ambiguous

**Evidence:** The target requires the application's popover/menu primitive and a nested single-choice list at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:308`. Current dependencies include Radix Dialog, Slot, Tooltip, and `cmdk`, but no Radix Popover/Dropdown/Select/Menu (`/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/package.json:162`); current code provides a Dialog precedent only (`/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/src/components/recall-manual-sync.tsx:295`). Escape behavior is defined for the parent but not for the child choice list, nor is focus return to the row after selection/cancel.
**Why it matters:** A custom nested popup is a predictable source of incomplete menu/radio semantics and mobile focus loss.
**Failure mode:** Escape closes both layers, focus returns behind the popover, or arrow keys operate the wrong composite widget.
**Recommendation:** Choose an existing, verified primitive before UX freeze. Prefer one dialog/popover containing two native fieldsets/radio groups over nested menus. Specify open/close/selection/cancel/outside-pointer/focus-return behavior and test it in both themes and at zoom.

#### 2. State coverage omits operational states users will hit during enrollment, paging, and connectivity recovery

**Evidence:** The state table at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:393` covers initial load and mutations but not offline with no cache, coming back online, incremental page loading/error/end, filter-metadata loading/error, legacy-enrollment preview/partial/resume/failure, or Undo replacement after a rapid action. Legacy enrollment itself is only three paragraphs at `:245`.
**Why it matters:** These states change available actions, counts, focus, and truth claims.
**Failure mode:** The app renders a false empty state offline, loses enrollment progress, or silently drops a failed later page while headings still claim the full group count.
**Recommendation:** Add a state/action/focus/announcement matrix for each omitted condition and require direct fixtures before implementation acceptance.

#### 3. Mobile discovery has requirements but no implementation-ready placement in the existing More and Library surfaces

**Evidence:** The target says `under More` and adds a Library summary at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:105`, but it does not place Processing within the current More hierarchy or define its icon/section/order/selected state. Current More is a routed page of grouped rows (`/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/src/app/more/page.tsx:30`), not a menu sheet, and current mobile navigation routes to `/more` (`/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/src/components/sidebar.tsx:255`). No current-product-based mobile wireframe shows the Library summary or post-capture confirmation. The `>20%` promotion rule lacks task wording, sample, or measurement timing.
**Why it matters:** Discoverability is an explicit rollout gate, and vague placement can make the feature look like Settings rather than a primary workflow.
**Failure mode:** Processing is buried below Preferences/Devices, the count is truncated, or moderated results cannot be interpreted consistently.
**Recommendation:** Specify the exact More section and row anatomy/order, Library summary location and empty/loading/error variants, capture confirmation duration/announcement/navigation, and a measurable discoverability protocol with sample and go/no-go threshold.

#### 4. Two cited visual-fidelity screenshots are not reliable reference evidence

**Evidence:** The target names the Board Group & sort and Archived captures as hierarchy evidence at `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/ux/ux-ui-v1.md:81`, but `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/screenshots/03-direction-b-board-group-sort-open-desktop-1440x1024.png` and `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-kanban-card-processing-20260712/docs/feature-council/kanban-card-processing/discovery/screenshots/12-direction-b-archived-desktop-1440x1024.png` contain large black/unchanged regions and omit much of the shell. The mobile captures still include prototype-only review/appearance controls and show bottom-nav overlap, which the target correctly says not to copy but does not replace with production-composition evidence.
**Why it matters:** Exact pixel/density instructions tied to corrupted or prototype-only evidence invite arbitrary interpretation.
**Failure mode:** Implementers match incomplete captures, retain excessive mobile header depth, or miss current app spacing and control hierarchy.
**Recommendation:** Replace malformed captures and add current-shell production comps for Inbox, Board, List, Archived, More entry, Library summary, and detail in Light/Dark at desktop, 390px, and 320px. Annotate which elements are authoritative versus explicitly removed.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It mistakes goal-level authorization to pursue the feature for authority to implement from a v1 artifact that must be adversarially revised.
- It treats naming every state as sufficient even when paging, enrollment, offline-no-cache, reconnection, and rapid Undo have no interaction contract.
- It assumes a stable item ID implies an available focus target across pagination and virtualization.
- It treats non-status grouping as a layout switch without defining primary taxonomy membership, group order, cursors, or counts.
- It carries a ten-second Undo requirement into accessibility acceptance without resolving the time-limit barrier.
- It uses a prototype detail route and incomplete screenshots as fidelity evidence while leaving current production placement undecided.
- It references an accessible popover/menu primitive absent from the current application.

## Missing Validation

- Rapid same-item/different-item and multi-tab Undo with keyboard, screen reader, and switch control.
- A timing-accessibility disposition proving extension/adjustment or an exact persistent equivalent.
- Board/List parity fixtures for every group/sort, multi-valued taxonomy, no-value buckets, partial pages, and taxonomy mutation.
- Process next from Inbox, Board, List, Archived, filtered-empty, offline, and stale-URL contexts.
- Incremental load/end/error, seek-to-anchor, unloaded destination, and virtualized/non-virtualized focus traces.
- Current-product-based mobile More, Library summary, capture feedback, and canonical-detail comps.
- 320px/400%/text-spacing tests with 50+ dynamic groups.
- Complete state fixtures for legacy enrollment, filter metadata, offline without cache, and reconnection.
- Light/Dark/forced-colors comparison of every state, not only normal Board/List examples.

## Revised Recommendations

1. Reclassify v1 as review-only and reconcile UX v2 only after PRD v2 resolves all prior product findings.
2. Freeze an accessible, deterministic Undo ownership and timing model before UI implementation.
3. Replace the loose grouping prose with a canonical group/pagination/count algorithm shared by Board and List.
4. Define Process next as a full route-state transition from every view and add an explicit selection control.
5. Add anchor seeking, incremental-page states, and conditional virtualization acceptance.
6. Produce current-product-based responsive comps for More, Library, Processing, Archived, and canonical detail.
7. Use bounded mobile controls for dynamic groups and one verified popup/dialog pattern.
8. Expand the state matrix and manual evidence plan before declaring UX v2 implementation-ready.

## Go / No-Go Recommendation

**No-go for implementing Processing UI from UX/UI v1. Conditional go for UX/UI v2 revision.** UX/UI v2 can become implementation input only after the P0 is removed, every P1 has an explicit product/technical disposition, the missing layouts and state contracts are added, and the revised package is reconciled with PRD v2 and technical-plan v2. Production remains no-go until recorded keyboard, AT, touch, zoom/reflow, theme, scale, failure, and live verification passes.

## Plan Revision Inputs

### Required Deletions

- Delete `Implementation-authorized v1` and `production implementation contract` from v1-derived authority language.
- Delete any implication that announcement alone makes a ten-second Undo accessible.
- Delete `Primary User tag` / `Primary AI topic` until a canonical primary rule exists, or rename to a defined grouping model.
- Delete the claim that the application already has a suitable popover/menu primitive.
- Delete malformed screenshots from authoritative visual evidence.

### Required Additions

- Add the v1 → adversarial review → reconciled v2 authority gate.
- Add rapid-action Undo ownership and timing-accessibility disposition.
- Add exact group membership/order/count/cursor/pagination rules.
- Add cross-view Process next and explicit row-selection behavior.
- Add page-seek, incremental load, unloaded destination, and conditional virtualization contracts.
- Add current-production desktop/mobile detail placement and More/Library entry comps.
- Add dynamic-group mobile selection and the omitted state matrix.

### Required Acceptance Criteria Changes

- Require exact same-item/different-item/multi-tab Undo and timed AT evidence.
- Require Board/List result, order, local count, aggregate count, URL, and cursor parity for every group/sort/filter combination.
- Require Process next from every view and no-match/offline/stale-state path.
- Require return to an anchor beyond page one and Move/Undo to an unloaded destination.
- Split virtualization-if-used from bounded-pagination-without-virtualization evidence.
- Require More/Library discovery and full mobile task completion at 320 and 390 CSS px.
- Require canonical-detail workflow actions without note editor remount or draft loss.
- Require both themes, forced colors, text spacing, 200%/400% zoom, NVDA, VoiceOver, TalkBack, and switch control for normal and trust-critical states.

### Required Validation Changes

- Compare revised screens directly with both selected Direction B and current production app anatomy.
- Use contradictory capture/current-entry fixtures for Inbox ordering and Process next from every surface.
- Test high-cardinality/multi-valued group data and later-page mutations.
- Record active-element and live-region traces for every removal, return, retry, reconciliation, and expiry path.
- Exercise enrollment interruption/resume, offline-no-cache/reconnection, filter metadata failure, and load-more failure.
- Replace static target-size claims with measured bounds and focused-last-action evidence under fixed navigation and keyboard-open states.

### Required No-Go Gates

- Any implementation begins before reconciled PRD/UX/technical v2 authority.
- Undo scope is ambiguous or the timed action lacks an accessible disposition.
- Board/List grouping or counts differ under multi-valued taxonomy or partial pages.
- Process next can target hidden/unloaded content without a defined view/focus transition.
- A valid return/destination anchor cannot be loaded and focused deterministically.
- Workflow integration remounts, saves, clears, or obscures My notes.
- Mobile dynamic groups become an unbounded button strip or any task is obscured/sub-44px.
- Any state/theme/AT/zoom gate is claimed from specification or screenshot evidence alone.

## Residual Risks

Even after revision, the feature can still create backlog pressure, mobile More discoverability may fail, and workflow-only archive may surprise users because content remains available elsewhere. Optional drag plus per-status pagination plus virtualization remains disproportionately risky and should stay disabled unless it demonstrates clear value after all non-drag behavior ships. The current production dataset is small, so synthetic 10k/50k and high-cardinality taxonomy evidence will remain necessary even if current dogfood looks smooth.
