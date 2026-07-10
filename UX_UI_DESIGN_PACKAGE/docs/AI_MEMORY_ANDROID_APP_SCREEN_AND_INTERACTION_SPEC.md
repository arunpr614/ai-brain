# AI Memory Android App Screen And Interaction Spec

Created: 2026-06-13 21:57 IST

## Android Role

The Android app is the quick capture, lookup, offline read, repair, and lightweight Ask companion. It should feel native to phone use, not like a squeezed desktop layout.

## Global Shell

Required:

- Mobile frame or native Android shell.
- Bottom navigation.
- Primary tabs: Library, Capture, Ask, More.
- Route-aware Capture presentation.

Capture navigation rule:

- `/ask`: Capture appears as a normal bottom tab, no raised FAB.
- `/capture`: Capture appears as a normal active bottom tab, no raised FAB.
- Library and content browsing routes: raised center Capture FAB remains.

## Login, Unlock, Pairing

Required states:

- Login.
- Unlock.
- PIN keypad.
- First-time pairing.
- Pairing code.
- Pairing success.
- Unreachable/server down.
- Offline fallback.
- Session expired.

Use the AI Memory logo on entry surfaces.

## Library

Required:

- Search.
- Compact active filter status.
- Small filter button.
- Dismissible bottom sheet for filters.
- Recent item list.
- Select mode.
- Needs Upgrade entry.

Filter UX:

- Do not show a large permanent filter grid at the top.
- Show current filter compactly.
- Filter bottom sheet groups quality/access and source type.
- User can dismiss or reset filters.

Item row must show:

- Title.
- Source platform.
- Captured via.
- Source quality.
- Offline state when relevant.
- Limited warning if relevant.

Selection behavior:

- Long press or selection control enters select mode.
- Selected count appears.
- Ask selected opens scoped Ask.

## Capture

Capture screen actions:

- Save URL.
- Write note.
- Upload PDF.
- Paste text.
- Quick paste input.

Capture result states:

- Saved successfully.
- Saved partially.
- Updated existing.
- Duplicate candidate.
- Saved with issues.

Each state must show:

- Status.
- Quality badge.
- Source platform.
- Captured via.
- Clear next action.

## Share Capture

Represent the Android share-sheet capture path:

- Incoming shared source.
- Processing.
- Success.
- Partial capture.
- Duplicate.
- Needs upgrade.

## Item Detail

Android item detail uses tabs:

- Original.
- Digest.
- Ask.
- Related.
- Details.

Original tab:

- Readable content.
- Expand to focus/read mode when content is readable.
- Repair CTA when content is not readable.

Digest tab:

- AI summary.
- Key bullets.
- Source-quality warning when needed.

Ask tab:

- Opens scoped Ask for this item.
- Must communicate scope clearly.

Details tab cards:

- Source and capture.
- Tags.
- Included topics.
- Collections.
- Offline/searchable status.
- Actions.

Focus/read mode:

- Full-screen reading mode.
- Bottom nav hidden.
- Tabs hidden.
- Visible close button.
- Source trust strip.
- Metadata-only and needs-upgrade items show repair CTAs instead of empty read mode.

## Tags, Included Topics, Collections

Tags:

- Clickable pills.
- User can add/remove tags.
- Click opens filtered Library.

Included topics:

- AI-detected.
- Clickable pills.
- No Add action.
- Click opens topic detail.

Collections:

- Separate section.
- Add/remove item from collections.
- Click opens collection detail.

## Ask

Android Ask uses the unified composer.

Required:

- Header.
- History button.
- Scope banner.
- Conversation area.
- Attached source chips.
- Composer label: Ask AI Memory.
- Add context plus button inside composer.
- Text input.
- Send icon.
- Keyboard placeholder state.
- Bottom nav hidden or pushed below keyboard placeholder.

Add context sheet:

- Attach saved item.
- Paste link.
- Write note.

Attach saved item:

- Search.
- List saved items.
- Quality badges.
- Select/deselect.
- Attach selected.

Paste link:

- Simulated capture result label if backend is not real.
- Empty state.
- Saving state.
- Full text.
- Metadata only with warning.
- Duplicate with attach existing or keep both.

Write note:

- Empty disabled state.
- Save and attach.

Send behavior:

- Empty input: show `Type a question first`.
- Empty input with attachment: show `Ask a question about the attached context`.
- Typed input: user bubble, loading state, answer, citations.
- Attached context overrides route scope visibly.
- Citations come from effective scope.

History:

- Opens as bottom sheet.
- Restores messages, scope, attachments, citations, and warnings.

## More And Settings

More screen includes:

- Account/device.
- Capture settings.
- Data and privacy.
- Offline/server state.

Privacy:

- End-to-end encryption is not active.
- Data/privacy controls that do not exist are disabled.
- Label unavailable features as `Coming soon`.
