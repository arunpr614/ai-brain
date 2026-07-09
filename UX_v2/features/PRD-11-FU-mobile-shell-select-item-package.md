# PRD-11-FU Mobile Shell, Select Mode, And Item Detail Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only, scope decision needed
Feature classification: Partial/Missing
Primary paths: `src/components/sidebar.tsx`, `src/components/library-list.tsx`, `src/components/mobile-library-filters.tsx`, `src/app/items/[id]/page.tsx`, `src/app/more/page.tsx`

## PRD v1

### User Goals

- Navigate AI Memory comfortably on a phone.
- Select Library items without hover-only controls.
- Read item details through a mobile-native layout.
- Enter focus mode without bottom nav or tab interference.

### Scope

- Finish PRD-11-SHELL verification for bottom nav and route-aware Capture.
- Add long-press or clear select-mode affordance on mobile Library.
- Decide and, if approved, implement Android item detail tabs: Original, Digest, Ask, Related, Details.
- Confirm focus/read mode hides mobile secondary UI.

### Web UX

- Desktop behavior should not regress.
- Web item detail remains right rail on desktop.

### Android UX

- Bottom nav has Library, Capture, Ask, More.
- Capture is raised on browsing/content routes and normal on Ask/Capture.
- Library selection works with explicit checkboxes and long press or accessible menu.
- Item detail uses tabs if approved; otherwise document as separate PRD.
- Focus mode hides tabs/bottom nav and keeps close/exit visible.

### Interactions And States

- Library selected count.
- Ask selected from mobile.
- Cancel select mode.
- More route with Needs Upgrade badge.
- Item tabs.
- Weak item repair cue in Original/Focus.

### Edge Cases

- More route capture FAB behavior.
- Bottom nav overlapping bulk toolbar.
- Long press conflicts with link navigation.
- Small phone width with long item titles.
- Item detail with no summary/topics/collections.

### Data Needs

- No new durable data is required for shell verification or basic select-mode polish.
- If Android item tabs are approved, data needs remain read-only from existing item, topic, collection, related-item, and chat data.
- Any new persisted mobile preference, such as last-opened item tab, is out of scope unless explicitly approved.

### Analytics / Events

Not applicable by default. No product analytics should be added for this mobile-shell polish unless Arun separately approves local-only events.

### Non-Goals

- No native Android screen rewrite.
- No changes to Ask retrieval, capture contracts, or repair semantics.
- No Android item tab implementation unless D-005 is explicitly closed in scope.

### Acceptance Criteria

- PRD-11-SHELL smoke passes before new work.
- Mobile select mode is keyboard/screen-reader accessible.
- Capture FAB never overlaps Ask composer.
- Focus mode hides bottom nav.
- If tabs are deferred, tracker marks them as separate missing feature.

### Open Questions

1. Should Android item tabs be included here or split into PRD-17?
2. Should More count as a content route with raised Capture?

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-11-FU-mobile-shell-select-item-package.md`

### Executive Verdict

Conditional no-go. The PRD bundles verification, select mode, and item tabs; that can become too broad for one mobile slice.

### Findings

P0:

1. PRD-11-SHELL verification is a blocker. Do not add new mobile code before proving current nav behavior.

P1:

1. Android item tabs are a full information-architecture change. Recommendation: split unless Arun explicitly wants it in this slice.
2. Long press is not accessible alone. Recommendation: provide explicit select controls.

P2:

1. More route capture behavior is undecided. Recommendation: make route policy explicit.

P3:

1. YouTube-specific item layout is not covered. Recommendation: treat it as mobile item-detail acceptance, not bespoke player unless decided.

### Go / No-Go Recommendation

No-go until PRD-11-SHELL verification is complete and item tabs scope is decided.

## PRD v2

### Final Product Requirements

1. First complete PRD-11-SHELL smoke exactly as described in the handover.
2. Mobile select mode must work through visible controls; long press may be an enhancement.
3. Bottom bulk bar must sit above bottom nav and not block Capture.
4. Route policy:
   - Ask/Capture: normal Capture tab, no raised FAB.
   - Library/item/topic/collection/Needs Upgrade/Search: raised Capture.
   - More: needs user decision; default recommendation is normal tab to avoid settings clutter.
5. Android item tabs are included only if Arun confirms. Default recommendation: split into separate implementation slice after PRD-12/13.
6. Focus mode must hide bottom nav for readable focus surfaces.

## Implementation Plan v1

### Architecture

- Verify current mobile shell without code changes.
- Refine mobile selection controls in `library-list.tsx`.
- Adjust route policy in `sidebar.tsx` only after decision.
- If item tabs are approved, create mobile-only item detail component while preserving desktop layout.

### Tests

- Browser mobile smoke for Library, Ask, Capture, More, item detail, focus.
- Accessibility check for select controls.
- No desktop sidebar regression.

### Milestones

1. Verification and code review doc for PRD-11-SHELL.
2. Select-mode polish.
3. Route policy adjustment if needed.
4. Optional item tabs or split PRD.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional go for verification/select-mode only. No-go for item tabs unless split.

### Findings

P0: No P0 findings found after verification is made first.

P1:

1. Mobile item tabs can touch a large item-detail file and cause regressions. Recommendation: isolate into a mobile component or separate PRD.
2. Route policy change can hide Capture on More unexpectedly. Recommendation: document expected behavior in smoke tests.

P2:

1. Bulk bar overlap needs visual screenshots, not DOM-only checks.

### Go / No-Go Recommendation

Go for narrow verification and select-mode polish; split item tabs if scope expands.

## Implementation Plan v2

### Revised Plan

1. No code changes until PRD-11-SHELL smoke is complete.
2. Add or refine visible mobile select controls in `LibraryList`; keep long press optional.
3. Keep existing desktop hover behavior.
4. Update bottom bulk bar spacing to respect bottom nav and safe area.
5. If More route decision is "normal tab", update route policy and smoke.
6. Create a separate PRD for Android item tabs unless Arun explicitly folds it into this package.

### Required Evidence

- Browser screenshots or DOM/screenshot checks for mobile Library, Ask, Capture, More.
- Mobile selected state and bulk bar screenshot.
- Focus mode screenshot showing no bottom nav.
- Desktop sidebar smoke unchanged.

### Implementation Acceptance

- Mobile selection is discoverable and accessible.
- No overlap between bottom nav, raised Capture, composer, or bulk bar.
- Item tabs are either implemented with evidence or explicitly tracked as a separate missing feature.
