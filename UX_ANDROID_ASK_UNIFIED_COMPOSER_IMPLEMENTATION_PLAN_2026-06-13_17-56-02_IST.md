# Android Ask Unified Composer Implementation Plan

Created: 2026-06-13 17:56 IST
Design decision: Option C - Unified Ask Composer
Target Magic Patterns project: `AI Brain Android - High Fidelity`
Editor: https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r
Current inspected artifact: `16464dd2-f619-488b-b629-d7f7f8ef38bb`

## Objective

Implement the finalized Android Ask experience where the Ask composer is the primary action area and Capture becomes a contextual add-source action inside the composer.

The user should be able to try the full Ask interaction in the prototype:

- Tap the plus button inside the Ask composer.
- Add context through attach saved item, paste link, and write note flows.
- See selected/added context represented in the composer.
- Type a question.
- Tap the send icon.
- See the message posted, loading state, generated answer, citations, source warnings, and follow-up state.
- Navigate across Android screens without the center Capture FAB blocking primary controls.

## Current Problem

The current Android bottom navigation owns a global center Capture FAB:

- `components/MobileBottomNav.tsx` always renders a large centered `+` button linked to `/capture`.
- `pages/MobileAsk.tsx` renders a docked Ask composer above the bottom nav.
- On Ask, these two elements occupy the same visual territory.

This creates a hierarchy problem:

- The Capture FAB competes with the send button.
- The Ask textbox feels visually secondary.
- The bottom region is crowded.
- The user's primary task on Ask is unclear.

## UX Principle

On the Ask screen, the primary task is asking a question. Capture should be available, but only as a supporting action for adding context to the question.

Therefore:

- The send button is the primary action.
- The plus button inside the composer is the contextual add-source action.
- The global Capture FAB is suppressed on Ask.
- The global Capture FAB is also suppressed on Capture itself, because a floating button that links to the current route is redundant.

## Cross-Screen Capture Button Rule

### Screens where the center Capture FAB remains visible

Keep the current prominent center Capture FAB on screens where the user is browsing or managing saved content:

- Library
- Item detail
- Topic detail
- Collection detail
- Needs Upgrade
- More/settings where bottom nav is visible

Rationale: capture remains a global creation action when the user is browsing the app.

### Screens where the center Capture FAB is hidden or converted

Suppress the center floating Capture FAB on:

- Ask
- Capture
- Any future screen with a bottom composer or docked primary action

On these screens, show Capture as a normal bottom-nav item instead of a raised FAB.

Rationale: no bottom action should overlap or compete with the screen's primary input/action surface.

## Proposed Navigation Behavior

Update `MobileBottomNav` to become route-aware.

Rules:

- If route is `/ask`, render bottom nav with Library, Capture, Ask, More as normal tab items. No raised center FAB.
- If route is `/capture`, render bottom nav with Capture as the active normal tab. No raised center FAB.
- Otherwise, keep the current raised center Capture FAB pattern.
- Preserve current active states for Library, Ask, and More.
- Add an active state for Capture.

## Ask Screen Layout

### Default Ask screen

Top area:

- Title: `Ask`
- Conversation history button
- Scope chips:
  - `All saved items`
  - source/searchability status such as `42 searchable`

Content area:

- Empty-state card with a clear invitation to ask.
- Suggested questions.
- Existing scoped Ask warning if the current scope has limited sources.

Bottom composer:

- Docked above the bottom nav and safe area.
- Label: `Ask AI Brain`
- Left action: plus button for Add context.
- Center: text input.
- Right action: send icon.
- Bottom nav remains below the composer.

The composer must never overlap the nav, and the nav must never overlap the composer.

## Composer Interactions

### Tapping the text field

Expected state:

- Text field receives focus.
- Placeholder remains contextual:
  - Global Ask: `Ask within all saved items...`
  - Tag scope: `Ask within Tag: design...`
  - Topic scope: `Ask within Topic: transformer architecture...`
  - Selected items: `Ask within selected items...`
- Composer remains docked.
- Attached context chips stay visible above or inside the composer area.

Prototype behavior:

- Use visible focus state.
- Do not need to simulate a real keyboard unless Magic Patterns supports it cleanly.

### Tapping the plus button

Open an `Add context` bottom sheet.

Bottom sheet actions:

- Attach saved item
- Paste link
- Write note

Optional future action:

- Upload file, if we want parity with the Capture screen, but this can remain out of scope for this iteration unless it already fits cleanly.

The plus button is not a generic global capture button. It means: add context to this Ask conversation.

## Add Context Flow: Attach Saved Item

When the user taps `Attach saved item`:

Open a second bottom sheet or replace the sheet content with a saved-item picker.

Picker elements:

- Search field.
- List of saved items.
- Each item shows:
  - Title
  - Source type
  - Captured via
  - Quality badge
  - Searchable/readable status
- Checkbox or selected state.
- `Attach selected` action.

After attaching:

- Close the sheet.
- Show attached item chips above the composer.
- Composer placeholder updates to acknowledge context, for example `Ask about 2 attached items...`.
- Send uses attached items as the primary scope.

Edge states:

- If a selected item is metadata-only or needs upgrade, show a small amber warning chip: `Limited source`.
- Let the user remove attached items using an `x` on each chip.

## Add Context Flow: Paste Link

When the user taps `Paste link`:

Show a paste-link panel inside the bottom sheet.

Panel elements:

- URL input.
- `Save and attach` button.
- Secondary `Cancel`.

Prototype states to support:

- Empty state.
- Validating/saving state.
- Saved full-text result.
- Saved metadata-only result.
- Duplicate result.

After successful save:

- Attach the newly saved source to the current Ask composer.
- Show a chip such as `New source: transformer video`.
- Show quality status:
  - `Full text`
  - `Preview only`
  - `Metadata only`
- If limited, show warning: `Ask may be limited until full text is added`.

CTA after save:

- `Ask about this`
- `Open item`
- `Add text` for limited captures

The prototype can use mocked outcomes instead of real URL parsing.

## Add Context Flow: Write Note

When the user taps `Write note`:

Open a note composer in the bottom sheet.

Panel elements:

- Title field, optional.
- Note body field.
- `Save and attach` button.
- Secondary `Cancel`.

After saving:

- Create a mock manual note source.
- Attach it to the Ask composer.
- Show chip: `Note attached`.
- Composer remains ready for the user's question.

Empty note behavior:

- Disable save or show inline message: `Add note text first`.

## Send Button Interaction

### Send with empty input and no attached context

Expected behavior:

- Do not post a message.
- Show a small inline nudge near composer: `Type a question first`.
- Keep focus on the input.

### Send with empty input but attached context

Expected behavior:

- Do not auto-send.
- Show nudge: `Ask a question about the attached context`.

Reason: attachment alone should not create an AI answer because the user has not expressed intent.

### Send with typed question

Expected behavior:

1. User message appears in the conversation.
2. Composer clears.
3. A loading answer bubble appears:
   - `Searching your Brain...`
   - `Reading attached context...` if context exists.
4. Answer appears with:
   - Direct response.
   - Source/citation cards.
   - Quality warning if any included source is limited.
   - Follow-up suggestions.
5. Conversation history receives the new conversation.

Prototype answer content:

- Use deterministic mock answer text.
- Use existing sample sources from `data/sources.ts`.
- Use citation cards that navigate to item detail when tapped.

### Send with scoped Ask

If current URL has scope params:

- Preserve the scoped label.
- Answer should mention the scope label.
- Citations should use scoped items.
- If scope contains limited sources, keep the existing limited-source warning.

### Send with attached items

If the user attached items:

- Attached items override or narrow the scope for that message.
- Answer shows an `Attached context` section.
- Citations come from attached items first.

## Conversation History Interaction

Current Ask design says history exists but does not fully simulate it.

For this iteration:

- Keep the history button in the Ask header.
- Tapping history opens a bottom sheet.
- Show a short list of prior conversations.
- Tapping a conversation loads a mocked conversation state.
- The composer remains available.

This makes the Ask section more believable and helps validate bottom-sheet stacking with the composer.

## Visual And UI Decisions

### Composer

- Rounded pill or rounded rectangle with strong border and white background.
- Plus button on the left is secondary:
  - Light surface.
  - Icon-only.
  - Accessible label: `Add context`.
- Send button on the right is primary:
  - Dark filled circle.
  - Paper-plane/send icon.
  - Disabled or muted when input is empty.

### Attached context chips

- Show just above the composer.
- Use compact chips with remove controls.
- Limit visible chips to two, then show `+N`.
- Tapping attached context opens a sheet listing all attached sources.

### Bottom sheets

- Use rounded top corners.
- Keep title, short description, and action list.
- Keep close button in the header.
- Dim background.
- Sheet should not obscure the bottom nav in a confusing way; it can cover the nav while open.

### Empty and loading states

- Empty state should sit in the content area, not inside the composer.
- Loading state should appear as an AI message bubble or card.
- Do not use a full-screen loader.

## File-Level Implementation Plan

### 1. Create a new Magic Patterns draft artifact

Source artifact:

- `16464dd2-f619-488b-b629-d7f7f8ef38bb`

New artifact name:

- `Android unified Ask composer draft`

Rollback candidate:

- `16464dd2-f619-488b-b629-d7f7f8ef38bb`

### 2. Update `components/MobileBottomNav.tsx`

Changes:

- Add route-aware capture presentation.
- Hide raised Capture FAB on `/ask` and `/capture`.
- Render Capture as a normal tab item on those routes.
- Add active state for `/capture`.
- Preserve the raised FAB on Library, Item Detail, More, Needs Upgrade, Topic, and Collection.

### 3. Update `pages/MobileAsk.tsx`

Changes:

- Convert from mostly static answer view to interactive prototype state.
- Add state for:
  - input text
  - messages
  - loading
  - attached sources
  - active sheet
  - paste-link state
  - note draft
  - selected saved items
  - toast/nudge messages
- Add the unified composer.
- Add Add Context sheet.
- Add Attach Saved Item picker.
- Add Paste Link flow.
- Add Write Note flow.
- Add Send behavior and mocked answer output.
- Add History sheet.

### 4. Optional update to `pages/MobileCapture.tsx`

Only if needed after route-aware nav:

- Ensure Capture route uses normal active nav item and does not show a redundant raised FAB.
- Keep existing capture page actions unchanged.

### 5. App routing

Likely no route changes required.

Existing route:

- `/ask`

Optional query params should continue working:

- `scope`
- `tag`
- `topic`
- `collection`
- `items`

## QA Checklist

### Navigation and overlap

- Ask screen has no center Capture FAB.
- Ask composer is not blocked by bottom nav.
- Send button is fully visible.
- Plus button is fully visible.
- Capture page does not show a redundant center FAB.
- Library still shows the center Capture FAB.
- Item detail still shows the center Capture FAB unless Focus mode suppresses bottom nav.

### Plus button

- Tap plus.
- Add Context bottom sheet opens.
- Tap Attach saved item.
- Select item.
- Attach selected.
- Attached source chip appears.
- Remove attached source.
- Tap Paste link.
- Save mock link.
- Saved source attaches.
- Limited-source warning appears when applicable.
- Tap Write note.
- Save note.
- Note attaches.

### Send button

- Empty send shows nudge.
- Typed question posts a user message.
- Loading state appears.
- AI answer appears.
- Citations appear.
- Tapping citation opens item detail.
- Follow-up suggestions can populate the input or send a follow-up.

### Scoped Ask

- `/ask?scope=selected&items=...` keeps selected scope.
- `/ask?scope=tag&tag=...` keeps tag scope.
- `/ask?scope=topic&topic=...` keeps topic scope.
- `/ask?scope=collection&collection=...` keeps collection scope.
- Limited-source warnings still appear.

### Visual polish

- Composer has enough spacing above nav.
- Bottom sheets feel tappable on mobile.
- Text does not overlap or clip.
- Empty/loading/answer states fit within phone frame.
- There is no hidden horizontal scroll dependency.

## Publish Plan

After implementation:

1. Re-check Magic Patterns status.
2. Publish the new draft artifact if implementation compiles.
3. Confirm final active artifact ID.
4. Record version history.
5. Update `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md`.

## Expected Final Handoff

Final response should include:

- Magic Patterns changed: yes
- Published: yes, if requested during execution
- Editor URL
- New artifact ID
- Version label
- Rollback candidate
- Local files updated
- Preview status
