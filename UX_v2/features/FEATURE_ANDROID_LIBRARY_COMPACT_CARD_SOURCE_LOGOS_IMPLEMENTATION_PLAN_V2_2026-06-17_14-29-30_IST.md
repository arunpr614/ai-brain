# Implementation Plan V2: Android Library Compact Card With Source Logos

Created: 2026-06-17 14:29:30 IST
Status: V2 ready for execution
PRD V2: `FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V2_2026-06-17_14-26-30_IST.md`
V1 plan: `FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_V1_2026-06-17_14-27-30_IST.md`
Adversarial review: `FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-17_14-28-30_IST.md`
Prior source plan: `../execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`

## Review Resolution

| Review issue | V2 response |
| --- | --- |
| Fixture/evidence too vague | Require fixture inventory and evidence paths in QA report. |
| Source logo sprawl risk | Use `src/components/source-logo.tsx`. |
| Warning suppression unspecified | Add `shouldShowMobileWarning` helper with known duplicate suppression only. |
| Desktop protection memory-based | Copy current desktop branch first, inspect desktop diff, and capture before/after evidence. |
| Checkbox dimensions loose | Use stable `w-8 min-w-8` slot and 18px to 20px checkbox. |

## Allowed Files

- `src/components/library-list.tsx`
- `src/components/item-enrichment-watch.tsx`
- `src/components/source-logo.tsx`
- `android/app/build.gradle` only if a fresh APK is built
- `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_QA_<timestamp>.md`

## Protected Files

Do not edit:

- `src/app/library/page.tsx`
- `src/components/mobile-library-filters.tsx`
- `src/components/sidebar.tsx`
- `src/app/search/page.tsx`
- filters, query behavior, sorting, counts, data fetching, bottom navigation, FAB

## Implementation Steps

1. Create `src/components/source-logo.tsx`.
   - Export `SourceLogo({ platform, type })`.
   - Use small local SVG/React components or lucide fallback icons.
   - Include provenance comments for brand-inspired local marks.
   - Logos are decorative with `aria-hidden="true"`.
   - Never fetch remote logo assets.

2. Extend `src/components/item-enrichment-watch.tsx`.
   - Add `compact = false`.
   - Pass `compact` to `EnrichingPill`.
   - Preserve default desktop behavior.

3. Prepare `src/components/library-list.tsx` helpers.
   - Import `SourceLogo`.
   - Add `isDuplicateMetadataWarning(code, quality)`.
   - Add `shouldShowMobileWarning(code, quality)` that suppresses only known metadata-only duplicates:
     - `youtube_antibot_metadata_only`
     - `youtube_transcript_fetch_metadata_only`
   - Unknown warnings remain visible.

4. Split card rendering inside each `li`.
   - Mobile body: `md:hidden`.
   - Desktop body: `hidden md:flex`.
   - Desktop body should be copied from current markup as closely as possible.

5. Mobile body layout.
   - Outer card uses same selected/unselected state tokens.
   - Checkbox label uses `w-8 min-w-8` and visible checkbox around `h-[18px] w-[18px]`.
   - Content Link uses `min-w-0 flex-1`.
   - Title uses `line-clamp-2 text-[15px] font-semibold leading-snug`.
   - No mobile title-row `SourceIcon`.
   - Metadata uses compact flex/wrap with max two visual lines.
   - Always show source logo + source text, quality, non-done enrichment state, and relative time.
   - Hide char count and verbose capture channel on mobile.
   - Show distinct warning only when `shouldShowMobileWarning` returns true.

6. Preserve interactions.
   - Checkbox click stops propagation.
   - Checkbox retains `aria-label`.
   - Card content still navigates to `/items/${it.id}`.
   - BulkBar still appears from zero selected state.
   - Ask selected still routes correctly.

7. Code gates.
   - `git diff --name-only`
   - `git diff --check`
   - `rg -n "<<<<<<<|=======|>>>>>>>" src/components`
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

8. Browser QA.
   - Desktop `/library` before/after notes at 1280/1440 widths.
   - Mobile `/library` at Android-like widths.
   - Zero-selected to one-selected to multi-selected BulkBar flow.
   - Card tap navigation.
   - Logo treatments for YouTube, LinkedIn, Substack, PDF, Note, generic.

9. Android QA.
   - Build/install Android debug APK after browser QA passes.
   - If shareable, bump version from current `1.0.6/code7` to next available.
   - Capture Android evidence for required fixtures.
   - Record APK path, checksum, install result, and rollback.

10. Documentation.
   - Create `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_QA_<timestamp>.md`.
   - Link the QA sub-agent strategy:
     `UX_v2/execution/qa/ANDROID_LIBRARY_COMPACT_CARD_QA_STRATEGY_AND_TEST_MATRIX_2026-06-17_14-24-48_IST.md`.
   - Update project tracker with evidence and status.
   - Append running log after milestone completion.

## No-Go Gates

- Protected files changed.
- Compact mobile title row includes a source icon.
- Logos replace text labels.
- Any source logo is loaded remotely.
- Metadata exceeds two visual lines for required long-title fixtures.
- Mobile selection cannot start from zero selected items.
- BulkBar or card navigation breaks.
- Desktop visual regression is found and not explicitly accepted.
- Android WebView/APK evidence is missing.
