# Feature PRD v1: Android Library Compact Card Layout

**Created:** 2026-06-17 14:25:28 IST
**Project folder:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
**Branch observed:** `codex/ai-brain-ux-v2-execution`
**Feature owner:** PM sub-agent draft for Arun/Main Codex review
**Status:** Draft for adversarial review
**Recommended launch tier:** Tier 4 equivalent - private/internal UX improvement; no public GTM motion.
**Related plan:** `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

## 1. Purpose

Make Android/mobile Library cards scannable when saved item titles are long. The current shared Library card lets long titles expand into oversized blocks, especially when the checkbox, source icon, enrichment pill, and metadata compete for narrow mobile width. This feature introduces the compact Option A mobile card layout while preserving desktop Library behavior.

This PRD covers the card layout and selection behavior. Source logos are specified in a companion PRD because they have separate asset/provenance and accessibility requirements.

## 2. Source Evidence

| Source | Evidence used |
| --- | --- |
| Handover | `AI_MEMORY_ANDROID_LIBRARY_COMPACT_CARD_HANDOVER_2026-06-17_14-05-19_IST.md` states the compact-card issue is not implemented and V2 is the only executable plan. |
| V2 implementation plan | Requires mobile/desktop card branches, title clamp, protected desktop, visible compact checkbox, metadata priority rules, and Android evidence. |
| Running log entries #130-#136 | Record RCA, Option A selection, source-logo addendum, adversarial review, V2 plan, and handover. No production code changed. |
| Current code | `src/components/library-list.tsx` uses one shared row with `h-11 w-11` checkbox, title-row `SourceIcon`, `text-[18px]`, loose line height, no clamp, title-row enrichment pill, and wrapping metadata. |
| Magic Patterns mobile snapshot | `ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT.../source/pages/MobileLibrary.tsx` uses compact title treatment: `text-[15px] font-semibold leading-snug line-clamp-2`. |

## 3. User Outcomes

| User outcome | Required behavior |
| --- | --- |
| Scan Library quickly on Android | Cards stay compact enough that multiple items are visible, even with long YouTube/article titles. |
| Understand the saved item | Title remains readable and is clamped to two lines rather than wrapping word-by-word. |
| Keep selection usable | A user starting from zero selected items can select one or more cards and trigger existing BulkBar actions. |
| Avoid web regressions | Desktop Library cards remain visually close to current behavior and keep existing richer metadata. |

## 4. Product Decisions

| Decision ID | Decision | Status |
| --- | --- | --- |
| CCL-001 | Use Option A compact card layout for mobile/Android. | Approved in source docs. |
| CCL-002 | Implement separate mobile and desktop card bodies inside `LibraryList`. | Required by V2 to reduce desktop blast radius. |
| CCL-003 | Keep mobile checkbox visible in default browsing state. | Required. Do not introduce hidden select mode or long-press selection in this slice. |
| CCL-004 | Keep this feature card-only. | Required. Filters, search, header, action buttons, bottom navigation, and query behavior are protected. |
| CCL-005 | Android evidence is mandatory before done. | Required because the bug was reported in Android screenshots. |

## 5. Functional Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| CCL-R1 | Add a mobile compact card body below `md`. | P0 | Each Library item renders a `md:hidden` card body on mobile widths. |
| CCL-R2 | Preserve current desktop card body at `md` and above. | P0 | Desktop uses a `hidden md:flex` body and keeps current title/icon/enrichment/metadata placement unless an approved exception is documented. |
| CCL-R3 | Clamp compact mobile title to two lines. | P0 | Mobile title uses two-line clamp, approximately `15px`, semibold, snug line height, and does not expand the card vertically beyond the target range for required fixtures. |
| CCL-R4 | Remove source icon from the mobile title row. | P0 | Compact mobile title row contains title text only, plus no title-row `SourceIcon` and no title-row enrichment pill. |
| CCL-R5 | Keep mobile selection visible and compact. | P0 | Checkbox slot is around 30px-34px wide, checkbox is visible around 18px-20px, `aria-label` remains `Select <title>`, and clicks do not navigate. |
| CCL-R6 | Preserve card navigation. | P0 | Tapping the content area opens `/items/<id>` and checkbox interaction does not trigger navigation. |
| CCL-R7 | Prioritize mobile metadata. | P0 | Mobile metadata always includes source identity, quality, active enrichment state when not done, and relative time; it hides char count and verbose capture channel by default. |
| CCL-R8 | Suppress duplicate warning noise. | P1 | Warnings that duplicate `Metadata only` or enrichment failure do not add a redundant token in compact mobile metadata. Distinct warnings still show. |
| CCL-R9 | Preserve BulkBar flows. | P0 | From zero selected items on mobile, user can select one item, select a second item, see BulkBar, clear selection, and use Ask selected. |
| CCL-R10 | Keep protected surfaces unchanged. | P0 | No edits to `src/app/library/page.tsx`, `src/components/mobile-library-filters.tsx`, `src/components/sidebar.tsx`, `src/app/search/page.tsx`, filter options, filter query behavior, bottom nav/FAB, or data fetching. |

## 6. Non-Goals

- No redesign of Library filters, search, page header, Capture button, Ask actions, bottom navigation, or broader page layout.
- No desktop card redesign.
- No long-press/select-mode interaction.
- No change to item sorting, filtering, counts, database queries, or enrichment behavior.
- No APK build/version bump unless implementation and QA pass and Arun requests a new private sideload artifact.
- No public/store Android distribution.

## 7. Dependencies

| Dependency | Why it matters |
| --- | --- |
| `src/components/library-list.tsx` | Primary implementation surface for mobile/desktop card bodies and selection state. |
| `src/components/item-enrichment-watch.tsx` | May need compact pass-through so mobile metadata can render compact enrichment pills. |
| `src/components/enriching-pill.tsx` | Already supports `compact`; should not need broad changes. |
| Companion source-logo PRD | Source identity appears in the compact metadata row; logo asset details are owned there. |
| QA fixture data | Required to validate long titles, quality states, warning states, selected state, and BulkBar. |
| Android WebView/APK access | Required to prove the fix in the environment where the issue was observed. |

## 8. Edge Cases

- Extremely long titles without natural spaces must not overflow horizontally.
- Long titles plus enrichment error plus metadata-only quality must not create a tall multi-row metadata block.
- Empty or unknown source labels must remain readable and must not collapse the metadata row.
- `total_chars` present should not appear on narrow mobile by default.
- Extraction warnings that add distinct information should still be discoverable.
- Multiple selected cards should keep selected styling on both mobile and desktop bodies.
- BulkBar must not overlap the compact cards or bottom nav in normal Android viewport sizes.
- Desktop hover-only checkbox reveal should remain unchanged where currently supported.

## 9. Telemetry, Observability, and QA Expectations

No new product analytics are required for this private UX slice. QA evidence is the telemetry substitute.

Required QA:

| Gate | Required evidence |
| --- | --- |
| Static checks | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; document exact failures if pre-existing. |
| Browser desktop | Before/after screenshot or observation for `/library`; no unapproved desktop layout change. |
| Browser mobile | Android-like viewport showing long-title card, selected state, BulkBar, and no bottom-nav overlap. |
| Android WebView/APK | Device/emulator screenshots showing long YouTube title, long article title, selection, and BulkBar. Browser mobile evidence alone is not enough. |
| Card measurements | First long-title card title is two lines max; total card height target is 110px-150px unless a fixture-specific exception is documented. |
| Console/network | No new browser console errors on `/library`; no unexpected network calls for card rendering. |
| Evidence report | Create a QA/evidence markdown under `UX_v2/execution/` with observations, screenshots, commands, and any residual risk. |

## 10. Rollout and Release Criteria

This feature can move from PRD review to implementation only after:

1. PRD v1 is adversarially reviewed.
2. P0/P1 PRD findings are resolved in PRD v2 or explicitly accepted by Arun.
3. Implementation uses the V2 plan, not the superseded V1 plan.

This feature can be marked locally complete only when:

1. All P0 requirements pass.
2. Protected files remain unchanged.
3. Desktop and mobile browser evidence exists.
4. Android WebView/APK evidence exists.
5. QA/evidence report exists.

This feature can be included in a fresh private APK only when:

1. Implementation QA passes.
2. Android version/code is bumped before sharing if a new APK is built.
3. Install notes include artifact path, checksum, version, and rollback posture.

## 11. No-Go Conditions

- Mobile title row still includes a source icon.
- Mobile card still expands into tall blocks for required long-title fixtures.
- Mobile selection cannot start from zero selected items.
- BulkBar or Ask selected breaks.
- Card tap navigation breaks.
- Metadata wraps beyond two visual lines for required fixtures.
- Desktop Library has unreviewed visual changes.
- Any protected Library/search/filter/navigation file is modified without explicit approval.
- Completion is claimed with browser evidence only and no Android WebView/APK evidence.

## 12. Open Questions for Review

1. Should the card-height target be a hard acceptance gate or a guidance range with documented exceptions for warning-heavy items?
2. Should extraction warnings be available via tooltip/expanded detail on mobile when suppressed from metadata?
3. Should `via Android/Telegram/Web` remain available in item detail if hidden from compact cards?
4. Should desktop eventually receive compact source logos, or is this intentionally mobile-only for now?
