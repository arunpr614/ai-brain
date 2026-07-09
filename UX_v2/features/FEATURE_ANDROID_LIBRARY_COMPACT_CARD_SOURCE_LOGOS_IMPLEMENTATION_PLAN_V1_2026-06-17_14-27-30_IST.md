# Implementation Plan V1: Android Library Compact Card With Source Logos

Created: 2026-06-17 14:27:30 IST
Status: V1, pending adversarial review
PRD target: `FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V1_2026-06-17_14-24-30_IST.md`
Prior source plan: `../execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

## Source Evidence

- `src/components/library-list.tsx` currently renders one shared card body for mobile and desktop.
- The checkbox slot is `h-11 w-11`.
- A `SourceIcon` appears beside the title.
- Title uses `break-words text-[18px] font-medium leading-[1.55]` with no clamp.
- `ItemEnrichmentWatch` appears in the title row and cannot pass compact mode yet.
- Metadata row includes source label, capture channel, quality, relative time, char count, and warning.
- `src/components/enriching-pill.tsx` already supports `compact`.

## Allowed Files

- `src/components/library-list.tsx`
- `src/components/item-enrichment-watch.tsx`
- `src/components/source-logo.tsx` if separating logo code is cleaner
- `android/app/build.gradle` only if a fresh APK artifact is built

## Protected Files

- `src/app/library/page.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/sidebar.tsx`
- `src/app/search/page.tsx`
- filter option definitions and query behavior
- bottom navigation/FAB code
- data fetching, sorting, filtering, counts, and database query logic

## Steps

1. Add local `SourceLogo` React SVG handling with decorative `aria-hidden` output and readable adjacent text.
2. Extend `ItemEnrichmentWatch` with `compact?: boolean` and pass it to `EnrichingPill`.
3. In `LibraryList`, render separate mobile and desktop card bodies inside each `li`.
4. Keep desktop body as close as possible to the current markup.
5. Build mobile body with compact visible checkbox, two-line title, no title-row source icon, source logo plus text metadata, compact enrichment, quality, relative time, and priority overflow rules.
6. Preserve card navigation and checkbox propagation behavior.
7. Run code gates: lint, typecheck, test, build.
8. Capture browser desktop and Android-width evidence.
9. Build/install Android debug APK only after browser evidence passes.
10. Capture Android evidence for long title, logo mapping, selected state, and BulkBar.
11. Create `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_QA_<timestamp>.md`.

## Acceptance Gates

- No protected files changed.
- Mobile title is two-line clamped.
- Mobile title row has no source icon.
- Source logos are local/bundled and keep text labels.
- Metadata does not wrap beyond two visual lines for required long-title fixtures.
- Desktop before/after evidence shows no unapproved regression.
- Android evidence is mandatory before marking complete.
