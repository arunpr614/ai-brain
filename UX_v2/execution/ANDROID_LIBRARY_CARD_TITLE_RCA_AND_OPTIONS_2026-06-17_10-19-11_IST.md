# Android Library Card Title UX RCA And Options

Created: 2026-06-17 10:19:11 IST
Scope: Android Library item cards in the AI Memory WebView
Status: RCA plus throwaway prototype options. No production code changed.
Prototype: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/prototypes/android-library-card-options-2026-06-17_10-19-11_IST.html`

## Executive Summary

The Android Library cards are becoming gigantic because the current production card layout uses a desktop-like row structure on a narrow mobile viewport. The title is rendered at 18px with a loose 1.55 line-height and no line clamp. At the same time, the row reserves horizontal space for a 44px checkbox target, a source icon, gaps, and an always-visible enrichment status pill. That leaves the title with a very narrow column, so long titles wrap almost word-by-word and stretch the card vertically.

Recommended direction: **Option A - Compact Magic Patterns-Aligned Card**. It matches the Magic Patterns mobile source most closely: 15px title, `line-clamp-2`, status/meta below the title, selection controls only when selecting, and compact chips. It keeps the card feel while fixing the height explosion.

## Evidence Inspected

### Screenshots

- `/Users/arun.prakash/Downloads/WhatsApp Unknown 2026-06-17 at 10.13.14/WhatsApp Image 2026-06-17 at 10.12.25 (1).jpeg`
  - 738x1600 JPEG.
  - Shows first Library card expanding to a tall block.
  - Title wraps into short one/two-word lines.
  - `enrichment failed` pill sits on the same top row and takes horizontal space.
  - Bottom nav/FAB begins covering the next card because cards are too tall.

- `/Users/arun.prakash/Downloads/WhatsApp Unknown 2026-06-17 at 10.13.14/WhatsApp Image 2026-06-17 at 10.12.25.jpeg`
  - 738x1600 JPEG.
  - Shows a long article title wrapping into many vertical lines.
  - Card height becomes the dominant UI element, hurting scanability.

### Production Code

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx:201`
  - Card uses `flex items-start gap-3 ... p-4`.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx:207`
  - Checkbox label reserves `h-11 w-11` on mobile.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx:223`
  - Main card link uses `flex min-w-0 flex-1 items-start gap-3`.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx:231`
  - Title and enrichment status sit in `flex items-start justify-between gap-3`.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx:232`
  - Title uses `break-words text-[18px] font-medium leading-[1.55]`, with no clamp.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx:235`
  - Enrichment pill is `shrink-0`, so it protects itself and forces the title to absorb width loss.
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/src/components/library-list.tsx:242`
  - Metadata is a wrapping flex row, adding more height after the title.

### Magic Patterns Mobile Comparator

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/pages/MobileLibrary.tsx:97`
  - Magic Patterns mobile Library uses `text-[15px] font-semibold leading-snug line-clamp-2` for titles.
  - Selection controls appear only in select mode.
  - Badges and metadata sit below the title, not in the title row.

## Root Cause

### Primary Cause

The title is starved of horizontal width.

On mobile, the row spends width on:

- checkbox target;
- source icon;
- card gaps;
- right-side enrichment status pill;
- padding.

The title gets the leftover width. Because the enrichment pill is `shrink-0`, the title is forced to wrap instead of the pill moving below it. Long titles then stack vertically.

### Secondary Causes

1. **Title typography is too large for mobile list density.**
   `text-[18px]` plus `leading-[1.55]` creates roughly 28px per line. Ten wrapped lines become a very tall card.

2. **No title clamp exists.**
   The production title renders the full title in the Library list. The item detail page can carry the full title; the Library should optimize for scanning.

3. **Selection affordance is always width-reserved on small screens.**
   The code keeps checkbox space visible on small screens. That preserves tap access, but it makes the non-selection browsing state too narrow.

4. **Status hierarchy is too loud.**
   `enrichment failed`, quality badge, and warning text can all appear on the same item. This makes status compete with the title.

5. **The bottom nav/FAB makes tall cards feel worse.**
   Once a card becomes tall, the next card is partially obscured by the raised Capture action, increasing the feeling that the list is hard to scan.

## UX Goals

- Keep Library cards scannable on Android.
- Preserve enough information to decide whether to open an item.
- Keep quality/status visible without letting it dominate title layout.
- Preserve selection and bulk actions without making the default browse state cramped.
- Align with the Magic Patterns mobile direction.
- Avoid hiding critical states such as `enrichment failed`; demote them to the right hierarchy.

## Prototype Options

The prototype file contains all options on one page:

`/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/execution/prototypes/android-library-card-options-2026-06-17_10-19-11_IST.html`

### Option A - Compact Magic Patterns-Aligned Card

Summary:

- Title: 15px, semibold, `line-clamp-2`, tighter line-height.
- Title gets full content width.
- Quality and warning chips move below title.
- Enrichment status moves below title as a compact chip.
- Checkbox appears only in select mode or after long-press/select.
- Card remains a card, but height stays stable.

Why this is recommended:

- Closest to Magic Patterns mobile source.
- Best balance of readability and density.
- Reduces card height without losing important state.
- Simple implementation in existing `LibraryList`.

Tradeoffs:

- Full long title is no longer visible in the list.
- Needs title tooltip/detail page/open item for full title.

### Option B - Status-First Two-Tier Card

Summary:

- Top row shows source type and enrichment status.
- Title gets a separate full-width row below.
- Title clamps to two lines.
- Metadata is grouped into one compact line.

Why it could work:

- Keeps `enrichment failed` visible without stealing title width.
- Good for a repair-oriented workflow where failure status matters.

Tradeoffs:

- More status-heavy than Option A.
- Slightly less like Magic Patterns mobile.

### Option C - Dense Inbox Row

Summary:

- Converts cards into denser list rows.
- Title clamps to two lines.
- Status becomes a small inline indicator.
- Metadata is one line.
- Best for high-volume scanning.

Why it could work:

- Maximum density.
- The user can see more items above the bottom nav.

Tradeoffs:

- Less premium/card-like.
- Bigger visual departure from the current app and Magic Patterns card direction.

## Recommended Choice

Choose **Option A** for implementation.

Reasoning:

- It fixes the root cause directly: title width and unconstrained wrapping.
- It follows the Magic Patterns mobile card pattern.
- It avoids an over-correction into a dense inbox UI.
- It can be implemented with low blast radius in `LibraryList`.

## Implementation Notes For Option A

Suggested production changes:

1. Add a mobile-specific row layout in `LibraryList`.
2. On mobile default browse state, hide checkbox width unless:
   - one or more items are selected;
   - the row is in select mode;
   - the user long-presses/opens bulk selection mode.
3. Change title class from:

```tsx
break-words text-[18px] font-medium leading-[1.55]
```

to a mobile-first class similar to:

```tsx
line-clamp-2 text-[15px] font-semibold leading-snug md:text-[18px] md:leading-[1.45]
```

4. Move `ItemEnrichmentWatch` below the title on mobile.
5. Keep desktop layout closer to the existing row if desired.
6. Group status chips in this order:
   - source/quality;
   - enrichment;
   - warning, only if different from quality.
7. Reduce duplicated messaging:
   - avoid showing `Metadata only`, `metadata only`, and `enrichment failed` with equal emphasis.
8. Ensure the whole card remains tappable.
9. Keep 44px touch targets for selection when selection mode is active.
10. Add regression fixture with very long titles and failure badges.

## Acceptance Criteria

- Long title cards do not exceed roughly 140px height in default mobile Library browse state.
- Title is clamped to two lines in the list.
- Full title remains available on item detail.
- `enrichment failed` remains visible but does not occupy title-row width.
- Quality state remains visible.
- Metadata wraps gracefully without pushing cards into huge blocks.
- Bottom nav/FAB does not cover meaningful content at rest.
- Android screenshot evidence includes:
  - long YouTube title;
  - long article title;
  - enrichment failed;
  - metadata-only warning;
  - full-text item;
  - selected/bulk state.

## No-Go Gates

- Do not simply shrink the title font without fixing row structure.
- Do not hide enrichment failure entirely.
- Do not remove selection affordance without a replacement select mode.
- Do not claim Android fix from desktop browser evidence only.
- Do not implement Option C without explicit approval because it changes the Library feel more substantially.

## Next Step

Review the prototype options and pick one direction. Recommended: Option A.
