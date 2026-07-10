# Android Library Filter Collapse Options

Created: 2026-06-13 17:25 IST
Prototype: `UX_ANDROID_LIBRARY_FILTER_COLLAPSE_OPTIONS_PROTOTYPE_2026-06-13_17-25-54_IST.html`

## Problem

The current Android Library filter block is discoverable, but it occupies too much of the first mobile viewport. On a phone, the user sees the page title, search, four primary filters, and a More filters row before getting to saved items. This makes the Library feel like a filter form first and a content library second.

## UX Goal

Keep filters easy to find while letting the Library list reclaim vertical space quickly. The user should be able to:

- See the current filter state.
- Open the full filter controls intentionally.
- Dismiss or collapse filters when they are not needed.
- Reach saved items without scrolling past a large control block every time.

## Option A: Expandable Filter Tray

Default state:

- Search remains visible.
- A compact row shows `All`, `Filters`, and the item count.
- Tapping `Filters` expands the filter tray inline.

Strengths:

- Keeps filters visible and understandable.
- Simple mental model.
- Good for first-time users.

Risks:

- Expanded state still consumes vertical space.
- If the user leaves it expanded, the problem returns.

## Option B: Compact Status + Bottom Sheet

Default state:

- Search remains visible.
- Current active filters are shown as compact pills.
- A filter icon or `Change` pill opens a bottom sheet with all filter choices.

Strengths:

- Best use of phone real estate.
- Matches Android/mobile behavior for secondary controls.
- Easy to scale to more filters later: source type, quality, availability, tags, date.
- Filter state remains visible without showing the entire control set.

Risks:

- Filter selection is one tap deeper.
- Needs clear active filter summary so users know filtering is applied.

## Option C: Auto-Hide On Scroll

Default state:

- Filters are visible initially.
- When the user scrolls, filters collapse into a floating `Filters` handle.

Strengths:

- Gives first-time discoverability and content-first browsing.
- Feels smart once tuned well.

Risks:

- More stateful behavior to design and QA.
- Can feel jumpy if collapse timing is too aggressive.
- Less deterministic than an explicit bottom sheet.

## Recommendation

Use Option B for the high-fidelity Android design.

It is the cleanest mobile pattern because the Library should prioritize content, not controls. The top area should show title, search, current filter state, and a single filter entry point. The full filter UI belongs in a bottom sheet.

Suggested final behavior:

- Default top area: `Library`, search, active filter pills, filter icon.
- If no filters are active: show `All items` plus `Filter`.
- If filters are active: show one or two active pills, then `+N`.
- Tapping the filter icon opens the bottom sheet.
- Bottom sheet groups filters by `Quality`, `Source type`, and `Availability`.
- Bottom sheet has `Apply` and `Reset` actions if multi-select filters are introduced later.
- For the current single-filter model, tapping a filter applies it immediately and dismisses the sheet.

## Implementation Notes For Magic Patterns

- Replace the always-visible primary filter grid in `pages/MobileLibrary.tsx`.
- Keep search visible.
- Add a compact filter summary row below search.
- Move all filter choices into a bottom sheet.
- Avoid hidden horizontal scrolling.
- Preserve the existing `More filters` behavior, but move it from a full-width block to a compact icon or pill.
