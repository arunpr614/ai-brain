# UX Item Detail Focus Read Mode Implementation Plan

Created: 2026-06-13
Project: AI Brain Phase 2 redesign
Scope: Design interaction plan for the expand button on item detail reading content across web and Android.
Status: Design implementation plan, not production code.

## 1. Problem Statement

In the current high-fidelity item detail screen, the reading/content card includes an expand icon. The affordance suggests a larger reading experience, but clicking it does not currently do anything.

This creates a UX break because:

- The control is visually prominent and looks actionable.
- The item detail page is meant to be reading-first.
- Focus mode has already been identified in the design requirements, but the interaction has not been specified.
- Long-form sources need a less cluttered reading state than the standard item detail layout with right-side metadata.

## 2. Design Goal

When the user clicks the expand button on an item detail content card, AI Brain should enter a focused reading mode.

Focus mode should:

- Prioritize the original saved content.
- Reduce navigation, metadata, and secondary panels.
- Preserve source trust signals without letting them dominate the reading surface.
- Make exit obvious.
- Work consistently across web and Android while respecting each platform's navigation patterns.

## 3. Product Principle

Focus mode is not a new content object and not a separate reader product.

It is a temporary item-detail state:

```text
Library item detail -> Focus read mode -> return to the same item detail
```

The mode should help the user read, skim, and trust the source. It should not introduce unrelated productivity features, recommendations, or a new home surface.

## 4. Trigger And Entry Points

### Primary Trigger

The expand icon inside the main content card opens focus mode.

Current screenshot location:

- Web item detail.
- Main reading card.
- Top-right corner of the content body card.

Recommended label:

- Tooltip / accessibility label: `Open focus mode`
- Android content description: `Open focus reading mode`

### Secondary Entry Points

Optional later entry points:

- Keyboard shortcut on web: `F`
- Item detail overflow menu: `Open focus mode`
- Android item detail overflow menu: `Focus read`

These should be secondary only. The visible expand button remains the primary entry.

## 5. Web Focus Mode UX

### 5.1 Layout

On web, focus mode should become a full-canvas reading state.

Recommended structure:

```text
Top focus toolbar
Centered reading column
Optional collapsed utility rail
```

The standard item detail right rail should be hidden by default.

The reading column should use:

- 65-72 character line length.
- Larger article body text than Library rows.
- Comfortable paragraph spacing.
- Editorial typography consistent with the design system.
- Enough top/bottom padding for long reading sessions.

### 5.2 Top Toolbar

The focus toolbar should be minimal and sticky.

Required elements:

- Close/collapse button.
- Item title, truncated if needed.
- Source quality badge, for example `Transcript`, `Full text`, `Preview only`.
- `Open source` action.

Optional elements:

- Text size control.
- Theme control: default, warm, dark.
- Ask this item.
- More menu with Export Markdown, Copy link, Delete.

Do not show the full Library navigation or full right rail in focus mode.

### 5.3 Source Trust Context

Focus mode must not hide all provenance. The user should still know what they are reading.

Keep a compact trust strip near the top:

```text
YouTube - Captured via Telegram - Captured Jun 10 - Searchable
```

If the content is weak:

- Show `Metadata only`, `Preview only`, or `Needs upgrade`.
- Add a calm warning banner only when the missing content affects the reading experience.
- Provide one repair action, for example `Add transcript` or `Paste full text`.

### 5.4 Utility Panel

The metadata and AI side content should become an on-demand utility panel.

Recommended control:

- A small `Details` or `Digest` button in the top toolbar.

Panel content:

- Source and capture details.
- AI Digest.
- Tags.
- Included topics.
- Collections.
- Related items.

Important: tags, included topics, and collections should remain separate sections, matching the current product rule.

### 5.5 Exit Behavior

Supported exit actions:

- Click close/collapse button.
- Press `Esc`.
- Press `F` again if keyboard shortcut is enabled.
- Browser back if focus mode is represented in the URL.

On exit:

- Return to the same item detail.
- Preserve the source item.
- Preserve the selected tab/section.
- Preserve scroll position within the item detail where feasible.

### 5.6 URL / State Recommendation

For the prototype, use a route or query state so the mode is easy to review:

```text
/item/:id?mode=focus
```

Benefits:

- Browser back exits focus mode naturally.
- Reviewers can deep-link into the focus state.
- The state is easier to represent in Magic Patterns.

This should not imply persistent reading-position tracking.

## 6. Android Focus Mode UX

### 6.1 Platform Pattern

On Android, focus mode should feel like a native full-screen reading screen, not a squeezed desktop panel.

Recommended behavior:

- Open as a full-screen destination from item detail.
- Hide bottom navigation.
- Hide item detail tabs while in focus mode.
- Use Android back to exit.
- Keep a compact top app bar.

### 6.2 Android Top App Bar

Required elements:

- Back/close button.
- Truncated title.
- Source quality chip.
- Overflow menu.

Overflow menu options:

- Open source.
- Ask this item.
- Text settings.
- Source details.
- Export/share, if represented in the prototype.

### 6.3 Android Reading Surface

Reading surface requirements:

- Single column.
- Comfortable horizontal padding.
- 17-18px body text equivalent.
- Section headings should remain scannable.
- Long content should scroll vertically.
- Avoid side-by-side panels.

### 6.4 Android Details Access

Metadata and digest should appear as bottom sheets, not side panels.

Recommended sheets:

- Source details sheet.
- AI Digest sheet.
- Text settings sheet.

Tags, included topics, and collections can live inside the Source details sheet or a separate Details sheet, but they should remain visually separated.

### 6.5 Android Exit Behavior

Supported exit actions:

- Android system back.
- Top-left close/back button.
- Optional swipe-down gesture only if it does not conflict with scrolling.

On exit:

- Return to item detail.
- Restore the previous item detail tab.
- Do not take the user back to Library unless they were already one level above item detail.

## 7. Content Type Variants

Focus mode should handle all item detail variants.

### Full Text Article / Substack

Default focus mode:

- Article title.
- Source trust strip.
- Body content.
- Section headings.
- Optional digest/details panel.

### YouTube Transcript

Transcript focus mode:

- Transcript title.
- Source trust strip.
- Timestamped transcript segments if available.
- Optional transcript search later.
- Open source action stays visible because video context may matter.

### PDF

Preferred prototype approach:

- Parsed text reading mode with page markers.

Optional later approach:

- PDF page view with zoom and page thumbnails.

For this design phase, avoid overbuilding a full PDF viewer unless the user explicitly asks for document-reader depth.

### Manual Note

Focus mode should feel like a clean note reader:

- Title.
- Body.
- Created/captured date.
- Tags/topics/collections available through details.

### Metadata Only / Needs Upgrade

If no readable body exists:

- Do not open an empty full-screen reader.
- Either disable the expand button with tooltip `No readable text yet`, or open a focus-mode empty state that explains what is missing.

Recommended behavior:

- Open a weak-content focus state only if there is at least some preview or metadata worth reading.
- Otherwise, replace the expand action with `Add text` or `Add transcript`.

### Preview Only

Focus mode can open with the available preview text.

Show a compact banner:

```text
Preview only. Add full text to make this item fully searchable.
```

Primary action:

- `Add full text`

Secondary action:

- `Open source`

## 8. Interaction States

### Web States

Required:

- Default item detail with expand affordance.
- Focus mode entered.
- Focus mode with details panel opened.
- Focus mode with text settings opened.
- Weak/preview-only focus state.
- Exit back to item detail.

Nice to have:

- Keyboard shortcut hint in tooltip.
- Reading progress indicator.
- Citation passage highlight state.

### Android States

Required:

- Item detail Original tab with expand affordance.
- Full-screen focus mode.
- Source details bottom sheet.
- Text settings bottom sheet.
- Weak/preview-only focus state.
- Android back exits focus mode.

Nice to have:

- Reading progress indicator.
- Ask this item from overflow.
- Source/digest quick chips below top app bar.

## 9. Text Settings

Text settings are useful but should stay lightweight.

Recommended settings:

- Text size: small, default, large.
- Theme: default, warm, dark.

Do not add font family, margin width, highlight color, notes, or reading goals in the first version.

If text settings are included in Magic Patterns:

- Web: popover from toolbar.
- Android: bottom sheet.

## 10. Accessibility Requirements

Required:

- Expand button must have a visible focus state.
- Expand button must have a readable accessible label.
- Close button must be first or last predictable control in focus mode.
- `Esc` exits on web.
- Android system back exits focus mode.
- Focus should move into the focus-mode toolbar when opened.
- Focus should return to the expand button when closed.
- Body text should support comfortable zoom / dynamic type.
- Color theme changes must preserve contrast.

## 11. Motion And Transition

Use restrained motion.

Recommended:

- Web: content card expands into full-canvas focus mode with a fast fade/scale transition.
- Android: full-screen destination slide transition.

Avoid:

- Dramatic page flips.
- Decorative animations.
- Motion that changes reading position unexpectedly.

## 12. What This Is Not

This feature should not include:

- Persistent Continue Reading.
- Reading streaks.
- Highlighting and annotation.
- Full PDF viewer controls.
- AI rewrite/regenerate tools.
- New recommendation surfaces.

Persistent reading position can be added later, but it should be designed separately because it changes Library, Android home, and item history behavior.

## 13. Magic Patterns Implementation Plan

### Phase 1: Web High-Fidelity Design Update

Target project:

- Web high-fidelity Magic Patterns project: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`

Update:

- Add focus mode interaction from the item detail expand button.
- Add a full-screen focus mode state.
- Add details panel interaction.
- Add text settings popover if time allows.
- Add weak/preview-only focus state.

Expected files to inspect/edit in Magic Patterns:

- `pages/DesktopItemDetail.tsx`
- `components/DesktopLayout.tsx` if global chrome must be hidden.
- `data/sources.ts` only if source fixture needs a clearer focus-mode example.
- `App.tsx` if a route/query state is needed.

### Phase 2: Android High-Fidelity Design Update

Target project:

- Android high-fidelity Magic Patterns project: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`

Update:

- Add focus mode interaction from Android item detail Original tab.
- Add full-screen Android reading state.
- Add source details bottom sheet.
- Add text settings bottom sheet if time allows.
- Add weak/preview-only focus state.

Expected files to inspect/edit in Magic Patterns:

- `pages/MobileItemDetail.tsx`
- `App.tsx` if a route/state is needed.
- Shared data fixtures if Android uses the same source model.

### Phase 3: Cross-Platform Parity Review

Check:

- Same trigger concept.
- Same source trust model.
- Same weak-source handling.
- Same exit behavior.
- Platform-native layout differences.
- No reintroduction of unsupported Continue Reading.

### Phase 4: Design QA

Review scenarios:

- Full-text item opens focus mode.
- Transcript item opens focus mode.
- Preview-only item opens focus mode with warning.
- Metadata-only item does not lead to an empty reader.
- Web `Esc` exits focus mode.
- Android back exits focus mode.
- Details panel/sheet does not overpower reading.
- Text remains readable on smaller laptop and mobile widths.

## 14. Acceptance Criteria

Web:

- Clicking the expand button on item detail opens focus mode.
- Focus mode hides the right rail by default.
- Reading content is centered and comfortable.
- Source provenance remains visible in compact form.
- Close/collapse returns to the same item detail.
- Weak content states explain what is missing and offer a repair path.

Android:

- Tapping expand opens a full-screen reading mode.
- Bottom navigation and item tabs are hidden while reading.
- Android back exits focus mode.
- Source/details content appears in bottom sheets.
- Weak content states do not feel like broken pages.

Shared:

- Focus mode preserves the distinction between source platform and captured via.
- Tags, included topics, and collections remain separate.
- No persistent Continue Reading claim is introduced.
- The expand affordance is no longer decorative.

## 15. Open Design Questions

1. Should text settings be included in the first high-fidelity pass, or only shown as a future toolbar affordance?
2. Should focus mode be represented as a URL/query state on web, or as a modal-like overlay in the prototype?
3. For metadata-only items, should the expand button disappear, be disabled, or become a repair CTA?
4. Should Ask this item be visible in the focus toolbar, or hidden in the overflow/details panel to keep reading calmer?
5. Should Android use a close `X` or back arrow in the focus top app bar?

## 16. Recommended First Pass

For the next Magic Patterns iteration, implement the smallest complete design:

- Web full-screen focus mode from expand.
- Android full-screen focus mode from expand.
- Compact provenance strip.
- Close/back behavior.
- Details panel on web.
- Details bottom sheet on Android.
- Weak/preview state.

Defer:

- Persistent reading position.
- Advanced PDF controls.
- Highlighting and annotation.
- Full text-settings customization beyond a simple visual affordance.
