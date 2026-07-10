# Android Ask Composer And Capture FAB Options

Created: 2026-06-13 17:42 IST
Prototype: `UX_ANDROID_ASK_COMPOSER_FAB_OVERLAP_OPTIONS_PROTOTYPE_2026-06-13_17-42-34_IST.html`

## Problem

The Android Ask screen currently lets the bottom Capture floating action button overlap the Ask composer area. This weakens the screen hierarchy:

- The Ask text box is visually blocked.
- The send action competes with the Capture action.
- The bottom area feels crowded.
- The user has to visually parse whether the primary action is capture or ask.

On the Ask screen, the primary job is asking a question. Capture should remain available, but it should not sit on top of the composer.

## Option A: Route-Aware FAB Hidden

Behavior:

- Hide the large center Capture FAB while the user is on Ask.
- Keep Capture as a normal bottom navigation item.
- Keep the Ask composer docked above the bottom nav.

Strengths:

- Smallest design change.
- Strongly improves composer visibility.
- Removes overlap completely.

Risks:

- Capture becomes less prominent on Ask.
- If Capture is meant to be globally emphasized everywhere, this creates an exception.

## Option B: Secondary Capture Chip

Behavior:

- Replace the large center FAB with a small `Capture or add source` chip above the composer.
- Keep the Ask textbox and send button in a normal composer dock.
- Tapping the chip opens a small capture/add-source sheet.

Strengths:

- Capture remains visibly available.
- Avoids blocking the composer.
- Good transition from the current FAB-heavy design.

Risks:

- Still creates two bottom action zones.
- The lower area remains more crowded than necessary.

## Option C: Unified Ask Composer

Behavior:

- Remove the global Capture FAB from the Ask screen.
- Add a small plus/attach action inside the composer.
- The right side of the composer remains the send button.
- Tapping the plus opens `Add context`: attach saved item, paste link, write note.

Strengths:

- Best hierarchy: ask/send is primary.
- Capture becomes contextual to asking.
- The user can add sources without leaving Ask.
- No overlap and no competing bottom floating button.
- Scales well to scoped Ask, selected items, and conversation-specific source attachment.

Risks:

- Requires a route-aware rule for the global Capture FAB.
- The plus icon inside the composer needs a tooltip/accessibility label and clear bottom sheet title.

## Recommendation

Use Option C for the high-fidelity Android design.

The Ask screen should be composer-first. Capture should become an `Add context` affordance inside the composer because the user is not just capturing generally; they are adding material to ask about. This aligns the interaction with the user's mental model:

- Type a question.
- Attach or capture source if needed.
- Send.

## Implementation Notes For Magic Patterns

- Update Android Ask screen only.
- Hide or suppress the large center Capture FAB on the Ask route.
- Keep the bottom nav visible.
- Add a composer dock above the bottom nav with:
  - Left attach/capture button.
  - Text input.
  - Right send button.
- Attach/capture button opens a bottom sheet with:
  - Attach saved item.
  - Paste link.
  - Write note.
- The composer must sit above the bottom nav safe area and never overlap with navigation.
- Send button should remain the strongest visual action in the composer.
