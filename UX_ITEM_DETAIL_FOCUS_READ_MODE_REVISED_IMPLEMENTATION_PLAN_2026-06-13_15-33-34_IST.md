# UX Item Detail Focus Mode Revised Implementation Plan

Created: 2026-06-13 15:33:34 IST
Project: AI Brain Phase 2 redesign
Supersedes: `UX_ITEM_DETAIL_FOCUS_READ_MODE_IMPLEMENTATION_PLAN.md`
Addresses: `UX_ITEM_DETAIL_FOCUS_READ_MODE_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-13_15-29-46_IST.md`
Scope: High-fidelity Magic Patterns interaction design for the item-detail expand affordance on web and Android.
Status: Executed and published to Magic Patterns on 2026-06-13 15:53 IST.

## 1. Executive Decision

The item-detail expand affordance will become `Focus mode`.

Canonical naming:

- Feature name: `Focus mode`
- Entry label: `Open focus mode`
- Exit label: `Exit focus mode`

First-pass goal:

```text
Open -> Read with less chrome -> Keep source trust visible -> Exit safely
```

This first pass deliberately excludes persistent Continue Reading, advanced text settings, annotation, full PDF viewer controls, and recommendation surfaces.

## 2. Decisions Locked From The Adversarial Review

The adversarial review identified that the original plan was not safe to execute because too many implementation decisions were still open. This revised plan locks them.

| Area | Decision |
|---|---|
| Web state model | Use `/item/:id?mode=focus`. Browser back exits focus mode. |
| Android prototype state model | Use an explicit full-screen focus state inside the Magic Patterns Android prototype. A visible back/close control exits it. |
| Production Android behavior | Treat Android system back as a future production requirement, not a Magic Patterns proof unless the prototype can simulate it. |
| Web focus-mode canon | Match existing canon: collapse global chrome, hide right rail, center a 72ch reading column, show a top progress bar. |
| Weak-content rule | If readable body or preview exists, focus mode opens with a warning. If no readable body exists, replace expand with the relevant repair CTA. |
| Text settings | Deferred from first pass. Do not show text settings as a required state. |
| Utility content | First pass includes only Source and capture details plus AI Digest. Tags, Included topics, Collections, and Related items stay in normal item detail. |
| Magic Patterns workflow | Create new artifacts before edits, track rollback IDs, publish only when explicitly requested, then update review package. |

## 3. Problem

The current high-fidelity item detail screen shows an expand icon in the main reading card. It looks actionable, but it has no interaction.

That creates a trust break:

- The screen promises a reading enhancement but does nothing.
- The item detail page is supposed to be reading-first.
- Existing product docs already define focus mode as a core consumption feature.
- Long-form reading is crowded by the default metadata rail.

## 4. Product Principle

Focus mode is a temporary reading state for the current item. It is not a new content object, not a separate reader product, and not a new Library destination.

```text
Library -> Item detail -> Focus mode -> same item detail
```

The mode should make saved content easier to read while preserving just enough provenance to keep the user confident about the source.

## 5. Web State Model

### 5.1 Route

Use a query-state route:

```text
/item/:id?mode=focus
```

Required behavior:

- Clicking the expand icon sets `mode=focus`.
- Browser back removes `mode=focus` and returns to item detail.
- `Esc` removes `mode=focus`.
- Closing from the toolbar removes `mode=focus`.
- Refreshing the URL while in focus mode keeps the focus state.

### 5.2 Web Layout

Use the existing focus-mode canon rather than inventing a separate full-screen product surface.

When focus mode opens:

- Global left navigation collapses to icon-only state if present.
- Item detail right rail is hidden.
- Reading column becomes centered at 65-72ch.
- Body typography uses the editorial reading style already defined for item detail.
- A 2px top progress bar appears.
- The page keeps a minimal top toolbar.

This is a focused reader, not a modal. It should feel like the item detail page breathing out.

### 5.3 Web Toolbar

Required toolbar elements:

- `Exit focus mode` icon button.
- Truncated item title.
- Source quality badge, for example `Transcript`, `Full text`, or `Preview only`.
- Compact `Open source` action.
- `Details` button.

Not in first pass:

- Text size controls.
- Theme controls.
- Ask this item in the toolbar.
- Delete/export actions in the toolbar.

Those can remain on the normal item detail page.

### 5.4 Web Trust Strip

Show a compact provenance strip below the toolbar or above the content:

```text
YouTube - Captured via Telegram - Captured Jun 10, 2:14 PM - Searchable
```

Required fields:

- Source platform.
- Captured via.
- Captured date/time.
- Searchable/offline state when available.

This preserves the product rule that source platform and captured via are different fields.

### 5.5 Web Details Panel

First-pass details panel content:

- Source and capture details.
- AI Digest.

Do not include in focus-mode details first pass:

- Tags.
- Included topics.
- Collections.
- Related items.

Reason: focus mode should reduce metadata overload. These sections remain available in the standard item detail right rail, where they are already separated into their own cards.

## 6. Android Prototype State Model

### 6.1 Magic Patterns Prototype Behavior

For the Android high-fidelity Magic Patterns project, focus mode should be implemented as an explicit full-screen state from `MobileItemDetail`.

Required prototype behavior:

- Tapping expand opens the focus state.
- Bottom navigation is hidden while in focus mode.
- Item detail tabs are hidden while in focus mode.
- A visible top-left back/close button exits focus mode.
- The prototype must not claim hardware back support unless that behavior is actually represented.

### 6.2 Production Android Behavior

For the real Android/Capacitor app later:

- Android system back should exit focus mode first.
- If focus mode is already closed, Android back should follow the normal item detail navigation stack.
- This production behavior should be specified separately when implementation moves beyond Magic Patterns.

### 6.3 Android Layout

Focus mode on Android is a full-screen reading state:

- Compact top app bar.
- Single-column reading surface.
- No bottom navigation.
- No item detail tabs.
- Vertical scroll only.
- Comfortable reading padding.
- Body text equivalent to 17-18px.

### 6.4 Android Top App Bar

Required elements:

- Back/close button labelled `Exit focus mode`.
- Truncated item title.
- Source quality chip.
- Overflow menu with `Open source` and `Source details`.

Not in first pass:

- Text settings bottom sheet.
- Ask this item.
- Export/share.

### 6.5 Android Details Sheet

The first-pass details bottom sheet includes:

- Source and capture details.
- AI Digest.

Do not include Tags, Included topics, Collections, or Related items in focus mode for the first pass.

## 7. Weak Content Rule

This rule must be implemented before any Magic Patterns design update.

| Item condition | Expand affordance behavior | Focus-mode behavior |
|---|---|---|
| Full text available | Show `Open focus mode` | Opens normal focus mode |
| Transcript available | Show `Open focus mode` | Opens transcript focus mode |
| Preview text available | Show `Open focus mode` | Opens focus mode with preview warning |
| Metadata only, no readable body | Replace expand with repair CTA | Does not open focus mode |
| Needs upgrade, extraction failed, no readable body | Replace expand with retry/add-text CTA | Does not open focus mode |
| Manual note with body | Show `Open focus mode` | Opens note focus mode |
| PDF with extracted text | Show `Open focus mode` | Opens parsed-text focus mode |
| PDF without extracted text | Replace expand with repair/retry CTA | Does not open focus mode |

### 7.1 Exact Weak-State Copy

Preview-only focus banner:

```text
Preview only. You can read the saved preview, but Ask may miss details until full text is added.
```

Primary action:

```text
Add full text
```

Metadata-only no-body CTA:

```text
Add text to read this item
```

Helper copy:

```text
Brain saved the source details, but there is no readable body yet.
```

YouTube transcript-missing CTA:

```text
Add transcript
```

Helper copy:

```text
Brain has the video details, but no transcript was captured.
```

Extraction-failed CTA:

```text
Retry extraction
```

Helper copy:

```text
Brain could not extract readable text from this item.
```

PDF text-missing CTA:

```text
Retry text extraction
```

Helper copy:

```text
This PDF is saved, but readable text is not available yet.
```

## 8. Content Variants

### 8.1 Full Text Article / Substack

Focus mode shows:

- Title.
- Compact trust strip.
- Article body.
- Section headings.
- Optional Source details / AI Digest panel or sheet.

### 8.2 YouTube Transcript

Focus mode shows:

- Video title.
- Compact trust strip.
- Transcript body.
- Timestamped transcript segments if available in the design fixture.
- `Open source` remains visible.

### 8.3 PDF

First pass:

- Parsed text reader with page markers.

Out of scope:

- Zoom.
- Page thumbnails.
- Full PDF viewer controls.

### 8.4 Manual Note

Focus mode shows:

- Note title.
- Note body.
- Created/captured date.
- Optional Source details / AI Digest panel or sheet.

### 8.5 Preview Only

Focus mode opens because there is something readable.

Required:

- Preview-only banner.
- Preview content.
- `Add full text`.
- `Open source`.

### 8.6 Metadata Only / Needs Upgrade With No Body

Focus mode does not open.

Required:

- Replace expand affordance with the correct repair CTA.
- Do not show a decorative disabled expand icon.
- Do not open an empty reader.

## 9. Accessibility Requirements

Web:

- Expand control has accessible label `Open focus mode`.
- Exit control has accessible label `Exit focus mode`.
- Keyboard focus moves to the focus toolbar when focus mode opens.
- Pressing `Esc` exits focus mode.
- Browser back exits focus mode when opened through `?mode=focus`.
- Focus returns to the original expand control or repair CTA when focus mode closes.
- Focus ring remains visible on all toolbar controls.

Android prototype:

- Expand control has content description `Open focus mode`.
- Top-left close/back control has content description `Exit focus mode`.
- Focus mode has a visible exit path.
- No required interaction depends only on system hardware back in the prototype.

Shared:

- Body text remains readable at small laptop and mobile widths.
- Source quality badge contrast passes normal state requirements.
- Warning banners must be readable and not depend on color alone.

## 10. Scroll And Reading Position Rules

This feature does not introduce persistent Continue Reading.

First-pass scroll behavior:

- Opening focus mode from the item detail expand button starts at the top of the readable body.
- Exiting focus mode restores the item detail context around the reading card.
- If launched from a future citation/highlight jump, focus mode may open at that passage, but that is out of scope for this pass.
- Focus mode may show a visual reading progress bar during the current session only.

Do not persist reading position across app sessions.

## 11. Motion

Web:

- Fast fade/resize into collapsed-chrome reader.
- Avoid motion that changes scroll position unexpectedly.

Android:

- Full-screen state transition can slide in.
- Avoid swipe-down-to-close in first pass because it may conflict with vertical reading scroll.

## 12. Magic Patterns Operating Checklist

Use this checklist for both web and Android.

Before editing:

- Call `get_design_status`.
- Confirm `isGenerating=false`.
- Capture active artifact ID as rollback candidate.
- Call `get_artifact` if files or artifact list are needed.
- Create a new artifact before file edits.
- Read every file that will be replaced.

During editing:

- Replace complete files only.
- Keep edits scoped to item detail, layout wrapper only if needed, and fixture data only if needed.
- Do not alter unrelated Library, Ask, Capture, Settings, or login flows.

After editing:

- Call `get_design_status`.
- Record new artifact ID.
- Record files read and written.
- Publish only if the latest user request explicitly asks to publish.
- If published, verify the active artifact ID.
- Update `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md` with artifact IDs, publish state, rollback candidate, and QA notes.

## 13. Web Magic Patterns Implementation Plan

Target:

- Web high-fidelity project: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`

Current known active artifact before this plan:

- `dd5eb357-5f7b-4433-9816-527bff9a0e3e`

Expected files to inspect:

- `pages/DesktopItemDetail.tsx`
- `components/DesktopLayout.tsx`
- `App.tsx`
- `data/sources.ts`

Expected design work:

1. Add `?mode=focus` handling for item detail.
2. Connect the expand button to `Open focus mode`.
3. Render collapsed-chrome focus view when `mode=focus`.
4. Hide item detail right rail in focus mode.
5. Add top progress bar.
6. Add compact trust strip.
7. Add first-pass `Details` panel with Source and capture details plus AI Digest only.
8. Add weak-content CTA substitution where no readable body exists.
9. Add `Esc`, close button, and browser-back behavior in the prototype where feasible.

## 14. Android Magic Patterns Implementation Plan

Target:

- Android high-fidelity project: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`

Current known active artifact before this plan:

- `301bfd78-c23b-4b11-b8ff-27ed3c425699`

Expected files to inspect:

- `pages/MobileItemDetail.tsx`
- `components/MobileFrame.tsx`
- `components/MobileBottomNav.tsx`
- `App.tsx`
- `data/sources.ts`

Expected design work:

1. Add explicit full-screen focus state inside the Android prototype.
2. Connect the item detail expand button to that state.
3. Hide bottom navigation and item detail tabs in focus mode.
4. Add compact top app bar with `Exit focus mode`.
5. Add source quality chip and compact trust strip.
6. Add Source details / AI Digest bottom sheet.
7. Add weak-content CTA substitution where no readable body exists.
8. Ensure visible close/back exits the prototype focus state.

## 15. First-Pass Scope

In scope:

- Web focus mode from expand.
- Android focus mode from expand.
- Compact trust strip.
- Source quality badge.
- Source details / AI Digest details surface.
- Weak-content repair CTA substitution.
- Web `Esc` exit.
- Web browser-back exit through `?mode=focus`.
- Android visible back/close exit.
- Reading progress indicator on web.

Out of scope:

- Persistent Continue Reading.
- Text settings.
- Dark/warm reader themes.
- Highlighting and annotation.
- Ask this item inside focus toolbar.
- Advanced PDF viewer controls.
- Full details migration into focus mode.
- Hardware-back proof in Magic Patterns unless the prototype can directly demonstrate it.

## 16. Acceptance Criteria

### Web

- Clicking expand on a full-text item opens `/item/:id?mode=focus`.
- Browser back exits focus mode and returns to the same item detail.
- Pressing `Esc` exits focus mode.
- Closing focus mode returns focus to the expand control when feasible.
- Global chrome is collapsed or minimized, not fully redesigned.
- Right rail is hidden while in focus mode.
- Reading column is centered at 65-72ch.
- Compact trust strip shows source platform and captured via as separate values.
- Details panel contains only Source and capture details plus AI Digest.
- Metadata-only no-body items show repair CTA instead of expand.
- Preview-only items open focus mode with preview warning and `Add full text`.

### Android Prototype

- Tapping expand opens a full-screen focus state.
- Bottom navigation is hidden in focus mode.
- Item detail tabs are hidden in focus mode.
- Top app bar has visible `Exit focus mode` control.
- Visible exit returns to the same item detail.
- Source details / AI Digest appear in a bottom sheet.
- Metadata-only no-body items show repair CTA instead of expand.
- Preview-only items open focus mode with warning and `Add full text`.

### Shared

- The interaction is no longer decorative.
- Source platform and captured via remain separate.
- Focus mode does not introduce persistent Continue Reading.
- Tags, Included topics, Collections, and Related items remain separate on normal item detail and are not bundled into first-pass focus details.

## 17. Validation Plan

Validate these item types:

- Full text article.
- YouTube transcript.
- Preview-only article.
- Metadata-only item with no body.
- Needs-upgrade item with failed extraction.
- PDF with extracted text.
- Manual note.

Validate these interactions:

- Web expand enters focus mode.
- Web close exits focus mode.
- Web `Esc` exits focus mode.
- Web browser back exits focus mode.
- Android expand enters focus mode.
- Android visible back/close exits focus mode.
- Android details bottom sheet opens and closes.
- Repair CTA appears instead of expand when no readable body exists.

Validate these viewports:

- Web small laptop width.
- Web desktop width.
- Android mobile frame width.

Validate Magic Patterns state:

- Active artifact recorded before edit.
- New artifact recorded after edit.
- Files read/written recorded.
- Publish status recorded.
- Rollback candidate recorded.

## 18. No-Go Gates

Do not execute Magic Patterns changes if:

- Web route/state model is changed away from `?mode=focus` without updating this plan.
- Android prototype behavior is described as hardware-back support without a visible prototype path.
- Weak-content behavior is not implemented deterministically.
- Text settings are reintroduced as required first-pass scope.
- Magic Patterns is generating.
- Rollback artifact ID is not captured before edits.
- Files to be replaced have not been read first.

Do not mark the work complete unless:

- Focus mode can be entered and exited on both web and Android.
- Weak/no-body items do not open empty readers.
- The review package is updated with the final artifact IDs and publish state.

## 19. Revision Coverage Matrix

| Adversarial finding | Resolution in this revised plan |
|---|---|
| State model unresolved | Web uses `?mode=focus`; Android uses explicit prototype focus state. |
| Conflict with focus-mode canon | Web matches collapsed-chrome canon and documents it. |
| Weak-content ambiguity | Weak-content behavior table and exact copy added. |
| Android native/prototype confusion | Prototype and production Android behavior separated. |
| Text settings required/optional/deferred conflict | Text settings removed from first-pass scope. |
| Missing accessibility criteria | Web, Android, and shared accessibility requirements added. |
| Missing scroll behavior | Session-only scroll rules added; persistent position excluded. |
| Missing Magic Patterns rollback/publish boundary | Operating checklist and no-go gates added. |
| Utility panel too broad | First-pass details reduced to Source/capture details and AI Digest. |
| Naming inconsistency | Canonical feature and action labels locked. |
| Weak-state copy missing | Exact copy added for preview, metadata-only, transcript missing, extraction failed, and PDF text missing. |
