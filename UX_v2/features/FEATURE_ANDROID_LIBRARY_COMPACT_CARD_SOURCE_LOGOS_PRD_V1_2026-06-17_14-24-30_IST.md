# Feature PRD V1: Android Library Compact Card With Source Logos

Created: 2026-06-17 14:24:30 IST
Owner: Codex Product Manager lane
Status: V1, pending adversarial review
Feature slice: Android/mobile Library card compaction and tiny source logos

## Summary

Android Library cards must stop growing into very tall blocks when titles are long. Implement the selected Option A compact card treatment for mobile/Android only, preserving the existing desktop Library card and leaving filters, search, header, action buttons, bottom nav, data fetching, and query behavior untouched. Compact cards must show tiny source logos for YouTube, LinkedIn, and Substack with readable text labels, plus generic local fallbacks for other sources.

## Problem

Long titles currently wrap almost word-by-word on Android because the mobile card uses a desktop-like row: checkbox width, a title-row source icon, gaps, a large `18px` title, loose line-height, and a non-shrinking enrichment pill all compete for horizontal space. This makes the Library hard to scan and breaks the Magic Patterns mobile density.

## Goals

- Mobile/Android Library cards stay compact with two-line clamped titles.
- Source identity appears in compact mobile metadata as logo plus readable text.
- Mobile selection remains visible and usable from zero selected items.
- Desktop card layout remains visually unchanged unless any change is explicitly documented.
- Android WebView/APK evidence confirms the fix in the environment where the bug was reported.

## Non-Goals

- Redesigning filters, search, header, Capture button, bottom nav, FAB, or broader Library page layout.
- Changing data fetching, sorting, filtering, counts, database queries, or item detail navigation.
- Hiding selection behind a new long-press/select-mode interaction.
- Adding source logos to desktop cards or filters.
- Loading source logos from remote CDNs or third-party runtime URLs.

## Requirements

### Compact Mobile Card

1. Render a mobile compact branch below `md`.
2. Render a separate desktop branch at `md` and above that preserves current behavior.
3. Clamp mobile title to two lines with compact typography.
4. Remove source icon from the mobile title row.
5. Show source logo plus source text in the mobile metadata row.
6. Show quality badge, enrichment status when not done, and relative time.
7. Hide character count and verbose capture channel by default on narrow mobile.
8. Suppress warnings that duplicate the quality/enrichment state.
9. Keep card content tappable and navigable to item detail.

### Source Logo Mapping

- YouTube: `source_platform` of `youtube` or `youtube_short`, or `source_type` of `youtube`.
- LinkedIn: `source_platform` of `linkedin`.
- Substack: `source_platform` of `substack`.
- PDF: generic local document mark with `PDF`.
- Note: generic local note mark with `Note`.
- Other URL/article/unknown: generic local globe/source mark with the existing platform label.

### Selection

- Checkbox remains visible on mobile.
- Checkbox slot is compact, around 30px to 34px wide.
- Checkbox click stops propagation.
- `aria-label={`Select ${it.title}`}` is preserved.
- BulkBar appears and Ask selected remains usable.

## Acceptance Criteria

- Production code changes stay within `src/components/library-list.tsx`, `src/components/item-enrichment-watch.tsx`, optional `src/components/source-logo.tsx`, and optional `android/app/build.gradle` only if a fresh APK is built.
- `src/app/library/page.tsx` and `src/components/mobile-library-filters.tsx` remain unchanged.
- Long mobile title cards are clamped to two title lines.
- Compact mobile title row has no source icon.
- Compact mobile metadata has source logo plus readable source text.
- No compact mobile card shows both title-row source icon and metadata source logo.
- YouTube, LinkedIn, and Substack logos are local/bundled, not runtime remote assets.
- Mobile selection can begin from zero selected items.
- BulkBar works with one and multiple selected items.
- Desktop `/library` before/after evidence shows no unapproved regression.
- Android WebView/APK screenshots show long YouTube/article titles, YouTube/LinkedIn/Substack/generic source treatment, selected state, and BulkBar.

## Risks

- Shared `LibraryList` powers both desktop web and Android WebView, so mobile fixes can accidentally alter desktop.
- Source logo work can create brand/provenance or accessibility issues if text labels are removed.
- Browser responsive screenshots can miss Android WebView rendering and native packaging behavior.
- Metadata can still overflow if too many tokens remain visible.

## Rollout

Ship web source after code gates and browser QA pass. Build and install a fresh private debug APK only after browser validation is acceptable; if the APK is shared, bump version from the current known `1.0.6/code7` to the next available version/code and document checksum and rollback.
