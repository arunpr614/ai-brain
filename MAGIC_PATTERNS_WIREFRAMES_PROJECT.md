# Magic Patterns Wireframes Project

Created: 2026-06-11 21:31 IST
Purpose: Low-fidelity wireframe project for the AI Brain web and Android redesign.

## Magic Patterns Links

- Editor: https://www.magicpatterns.com/c/ab5mjebwjwf7xvh8veffs2
- Preview: https://project-ai-brain-redesign-wireframes-web-and-android-988.magicpatterns.app
- Editor ID: `ab5mjebwjwf7xvh8veffs2`

## Current Status

Magic Patterns project creation succeeded.

At the last check, Magic Patterns was still generating the first active artifact:

- `isGenerating`: true
- Active artifact: not available yet
- Available files: not available yet
- Preview readiness: generating

This is normal for a new prompt-generated Magic Patterns project. The editor link can be opened while generation finishes.

## Wireframe Scope

The project was created as a grayscale, low-fidelity wireframe set. It intentionally avoids final branding, polished color, production implementation, and private source data.

## Product Frame Used

AI Brain is treated as a personal source-grounded knowledge and memory system.

The redesign is organized around:

```text
Saved source -> source quality -> repair path -> reading -> source-grounded reuse
```

Platform roles:

- Web: deeper workbench for Library, Needs Upgrade, item reading, source repair, scoped Ask, and settings.
- Android: fast capture, quick lookup, offline reading, and simple source repair.

## Requested Web Wireframes

1. Desktop Library
   - Left navigation: Library, Needs Upgrade, Ask, Capture, Settings.
   - Search.
   - Source-type filters.
   - Quality filters: All, Needs Upgrade, Full Text, Metadata Only, Preview Only.
   - Mixed fake items: YouTube transcript, YouTube metadata-only, LinkedIn metadata-only, Substack preview-only, PDF full text, manual note.
   - Bulk selection and Ask selected action.

2. Desktop Needs Upgrade Queue
   - Groups for Needs transcript, Needs pasted text, Preview only, Retry extraction.
   - Row actions: Add transcript, Paste text, Retry, Mark good enough, Delete.

3. Desktop Weak Item Detail
   - Reading-first layout.
   - Main content column.
   - Right rail for source quality, summary, tags, related items, and Ask this item.
   - Repair prompt for metadata-only item.
   - Add transcript/notes form.

4. Desktop Upgrade Success
   - Confirmation that existing item was updated.
   - Quality changed to User-provided text or Transcript.
   - Refreshing/enriching state.

5. Desktop Ask
   - Scope selector.
   - Sample answer with citation chips.
   - Source evidence side panel.
   - Warning when weak sources are included.

## Requested Android Wireframes

1. Mobile Library/Home
   - Bottom navigation: Library, Capture, Ask, More.
   - Search.
   - Recent items.
   - Continue reading.
   - Offline saved items.
   - Compact Needs Upgrade summary.

2. Android Share Capture Result
   - Bottom-sheet style confirmation.
   - Saved status.
   - Source quality result.
   - One recommended next action.
   - Actions: Done, Open item, Add text, Ask.

3. Mobile Weak Capture Repair
   - Short explanation.
   - Large paste field.
   - Save update action.
   - Open source link.
   - Existing-item update confirmation.

4. Mobile Item Detail
   - Title.
   - Source quality.
   - Offline state.
   - Tabs: Original, Digest, Ask, Related.
   - Repair prompt only when weak.

5. Mobile Offline / Server Unreachable
   - Offline item readable.
   - Ask disabled when connection is needed.
   - Plain copy: "Server unreachable. You can still read offline items."

## Interaction Scope

Requested clickable paths:

- Library weak item opens Weak Item Detail.
- Needs Upgrade row opens Weak Item Detail.
- Add transcript leads to Upgrade Success.
- Ask selected leads to Ask with selected scope.
- Android share result can open item or add text.

## Copy Rules

Use user-facing labels:

- Full text
- Transcript
- Preview only
- Metadata only
- Needs upgrade
- Saved
- Enriching
- Updated

Avoid technical labels:

- RAG
- embeddings
- chunks
- provider
- pipeline

## Follow-Up

When generation finishes, review the Magic Patterns output against this checklist:

- Does Library make source quality visible without becoming noisy?
- Does Needs Upgrade feel like a helpful queue rather than an error dashboard?
- Does the weak item repair path feel obvious?
- Does Ask make scope and evidence visible?
- Does Android feel phone-native rather than like a squeezed desktop app?
- Are offline and unreachable states clear?

## Iteration: Entry Detail Wireframes

Updated: 2026-06-11 21:48 IST
Request ID: `bcf331ce-d3d3-45c0-bd5d-edfbc8b20c97`
Active artifact after generation: `10a6e4f1-d6df-4151-b597-f040f39ab21c`

Magic Patterns was asked to expand the clicked-entry detail experience.

Added or enhanced states:

- Desktop Entry Detail - Full Text Article
- Desktop Entry Detail - Metadata Only / Needs Upgrade
- Desktop Entry Detail - Transcript Added / Enriching
- Desktop Entry Detail - Ask This Item drawer or panel
- Desktop Entry Detail - Citation Jump state
- Mobile Entry Detail - Full Text
- Mobile Entry Detail - Needs Upgrade
- Mobile Entry Detail - Details tab

Elements requested for the entry detail anatomy:

- Back to Library
- Source type
- Source title
- Open source action
- Captured date
- Source quality badge
- Searchable/processing state
- Main reading column
- Article body or transcript/body placeholder
- Highlighted citation passage
- Focus mode affordance
- Source Quality panel
- AI digest/summary
- Key quotes
- Tags
- Collections
- Related items
- Ask this item
- Export Markdown
- Delete
- Repair prompt for weak items
- Add transcript/notes
- Retry extraction
- Mark good enough
- Offline availability

Generated files inspected:

- `pages/DesktopItemDetail.tsx`
- `pages/MobileItemDetail.tsx`
- `pages/DesktopAsk.tsx`
- `data/sources.ts`
- `App.tsx`

Review focus for this iteration:

- Is the clicked-entry screen a reading surface first?
- Are source quality and repair actions clear without feeling like backend diagnostics?
- Does a weak item still show useful metadata rather than an empty page?
- Is the mobile detail structure simple enough for phone use?
- Does item-scoped Ask feel connected to the source rather than generic chat?

## Iteration: Capture Source Provenance

Updated: 2026-06-11 21:57 IST
Request ID: `46ac34c3-ac79-459d-8607-a83c898087f5`
Active artifact after generation: `aeafdb74-d56c-4da1-a31c-f601721cf1bb`

Design correction:

The item page must distinguish between the original content source and the way the item entered AI Brain.

Required model:

- Source platform: what the saved content is or where it came from originally.
- Captured via: the intake path that brought it into Brain.

Examples added to the wireframe data:

- YouTube captured via Telegram
- YouTube captured via Android share
- LinkedIn captured via Chrome extension
- Substack captured via Web capture
- PDF captured via PDF upload
- Manual note captured via Web note

Generated areas inspected:

- `data/sources.ts`
- `pages/DesktopLibrary.tsx`
- `pages/DesktopItemDetail.tsx`
- `pages/MobileItemDetail.tsx`

Design result:

- Library rows now include compact "Via ..." provenance when space allows.
- Desktop item detail header now shows source platform and captured-via information together.
- Desktop weak-item repair copy now references the capture path, such as "captured via Android share."
- Desktop right rail now includes Source & Capture Details / Provenance fields.
- Mobile item detail header now includes a compact captured-via line.
- Mobile Details tab now includes Source platform, Captured via, Captured date, Quality, Searchable, Offline, and Last updated.

Design rule:

Every item detail page should answer both:

1. What is this source?
2. How did it get into Brain?

## Iteration: Collapsible Desktop Navigation

Updated: 2026-06-11 21:59 IST
Request ID: `624ea106-cc36-430b-ac92-8e0d47bba8f2`
Active artifact after generation: `8a7301f3-0f27-4935-a0d5-3372d32fe5f7`

Design correction:

The desktop left navigation should not permanently consume horizontal space. Users need orientation when browsing, but item reading and Ask benefit from more working area.

Requested behavior:

- Expanded state keeps full labels, active page, app name, and Needs Upgrade count.
- Collapsed state becomes a narrow icon-only rail.
- Content area reclaims horizontal space when collapsed.
- Toggle is visible and quiet: Collapse nav / Expand nav.
- Active state remains visible in collapsed mode.
- Needs Upgrade count remains visible in collapsed mode.
- Settings remains reachable.
- Mobile keeps bottom navigation; no collapsible left nav on mobile.

Generated areas inspected:

- `components/DesktopLayout.tsx`
- `App.tsx`
- `pages/DesktopItemDetail.tsx`

Design result:

- Shared desktop layout now supports expand/collapse.
- Collapsed rail uses icons for Library, Needs Upgrade, Ask, Capture, and Settings.
- Collapsed nav includes accessible labels/titles.
- Item detail defaults to collapsed navigation so the reading surface gets more room.
- The item-level "Back to Library" action remains separate from sidebar collapse.

Design rule:

Desktop navigation should support orientation when expanded and focused work when collapsed.

## Iteration: Web And Android Login / Unlock

Updated: 2026-06-11 22:03 IST
Request ID: `7cfa5871-64fa-4867-a3c2-b8e84070d8e2`
Active artifact after generation: `4367129c-7ff9-459c-b4e6-a76ff2ca7bc9`

Design addition:

Add login and unlock wireframes for web and Android. The access experience should feel like opening a private personal Brain, not signing into a generic SaaS account.

Requested web states:

- Web Login / Unlock
- Web First Run / Setup PIN
- Web Device Pairing
- Incorrect PIN
- Unlocking
- Session expired
- Read-only offline cache fallback

Requested Android states:

- Android Login / Unlock
- PIN keypad
- Optional device unlock
- Android First-Time Pairing
- Scan QR from web
- Enter pairing code
- Pairing unreachable
- Pairing success
- Session expired / reconnect
- Read offline items fallback

Generated areas inspected:

- `App.tsx`
- `pages/DesktopLogin.tsx`
- `pages/MobileLogin.tsx`

Design result:

- Web now has a `/login` route with unlock, setup, and pair-device review states.
- Android now has a `/m/login` route with unlock, first-time pairing, unreachable, connected, and expired-session states.
- The platform switcher includes a review link to Login / Unlock.
- Unlock success routes to Library on web and mobile Library on Android.
- Pairing success routes to mobile Library.
- Copy uses user-facing language: PIN, recovery code, pair device, unlock, offline items, connected device.

Design rule:

Access should feel like unlocking a private personal memory system. Android first-run should make pairing visible and understandable before the user reaches the Library.

## Iteration: Android Library And Item Detail Flow

Updated: 2026-06-11 22:07 IST
Request ID: `a5ee405e-8138-437c-a312-9aed51d23d63`
Active artifact after generation: `3a5eaa30-f1fa-4f1a-b5a7-b914568e6569`

Design correction:

The Android Library should not duplicate capture entry points. The floating plus in the bottom navigation is the primary capture action, so the large rectangular "Paste a link to capture" button was removed.

Additional correction:

The Android Library should not show "Continue reading" yet. That is a future concept unless reading-position tracking is actually designed and implemented. The current mobile Library should use supportable sections.

Generated areas inspected:

- `pages/MobileLibrary.tsx`
- `pages/MobileItemDetail.tsx`
- `pages/MobileAsk.tsx`
- `pages/MobileRepair.tsx`
- `components/MobileBottomNav.tsx`

Design result:

- Android Library now starts with Library title, search, and compact filters.
- Android Library filters include All, Needs Upgrade, Offline, and Full text.
- The large top capture rectangle is removed.
- Continue Reading is removed.
- Capture remains available through the floating plus button in the bottom navigation.
- Every recent item card is tappable.
- Offline item cards are tappable.
- Needs Upgrade summary opens a weak item detail.

Android item detail now includes:

- Back to Library
- Source title
- Source platform badge
- Source quality badge
- Captured via
- Captured time/date
- Offline availability
- Open source action
- Tabs: Original, Digest, Ask, Related, Details
- Weak-item repair banner
- Add text action
- Open source action
- Mark good enough action
- Useful metadata for weak items
- Full text/transcript reading body
- Highlighted citation passage placeholder
- PDF-specific original tab
- Manual-note-specific original tab
- Digest summary, key takeaways, and key quotes
- Item-scoped Ask with citations
- Related items with reason snippets
- Details tab with source/capture provenance, searchable state, offline state, tags, collections, export, and delete

Design rule:

On Android, Library is for browse/search and item selection. Capture belongs to the floating plus. Tapping an item should open a complete mobile item detail experience, not a thin preview.

## Iteration: Ask Conversation History

Updated: 2026-06-11 22:12 IST
Request ID: `426d0a21-3ab6-4f49-9285-e00b8e84ba85`
Active artifact after generation: `1dba28c1-9f20-4f83-94be-264220f8807d`

Design addition:

Ask now has recoverable conversation history. Past conversations are treated as saved, source-scoped threads rather than disposable chat messages.

Generated areas inspected:

- `data/conversations.ts`
- `pages/DesktopAsk.tsx`
- `pages/MobileAsk.tsx`
- `pages/MobileItemDetail.tsx`

Design result:

- Added fake conversation history data with title, last question, updated time, grouping, scope, source count, pinned state, and weak-source warning.
- Desktop Ask now includes a local Ask History rail inside the Ask surface.
- Desktop history includes New conversation, search conversations, grouped rows, active state, scope pills, source count, weak-source warning, and row actions for Rename, Pin/Unpin, and Delete.
- Desktop selected conversation shows title, scope, updated time, message history, citation chips, source evidence, and Continue this conversation input.
- Desktop has a New conversation empty state.
- Mobile Ask now includes a History button in the header.
- Mobile Ask history opens as a bottom drawer with search, New conversation, grouped conversation rows, scope pills, source count, current state, weak-source warnings, and row action placeholder.
- Mobile Ask conversation view shows title, scope pill, message history, citations, source summary, and Continue this conversation input.
- Mobile item detail Ask tab now includes Previous conversations for this item and View item Ask history.

Design rule:

Ask history must show scope. A past answer is only trustworthy if the user can tell what sources it was grounded in.

## Iteration: Collapsible Ask History Rail

Updated: 2026-06-11
Request ID: `9c7deabc-0887-491e-9640-0c0cef2cbf37`
Active artifact after generation: `beee43ca-812a-422d-ad84-9efb4e874ec9`

Design addition:

The desktop Ask history rail is now collapsible and expandable, similar to the main left navigation pattern.

Generated areas inspected:

- `pages/DesktopAsk.tsx`
- `pages/MobileAsk.tsx`
- `components/DesktopLayout.tsx`
- `data/conversations.ts`

Design result:

- Desktop Ask history has an expanded state with header, New conversation action, search, grouped conversation rows, scope chips, source count, updated time, weak-source warning, and row actions.
- Desktop Ask history has a collapsed state with a narrow rail, expand control, history icon, New conversation icon, and recent conversation indicators.
- Collapsing the Ask history rail gives the main Ask conversation area more horizontal room.
- The selected conversation state is preserved.
- The collapse/expand control uses a chevron-style panel icon and accessible label.
- Android Ask history remains a bottom drawer/sheet and was not changed into a desktop side rail.

Design rule:

Ask history is useful context, but it should not permanently consume workspace width. Expanded mode is for finding past conversations; collapsed mode is for focused reading and answering.

## Iteration: Ask History Secondary Navigation Refinement

Updated: 2026-06-13
Request ID: `9e3e5a82-5ff8-4c8e-88cb-c20fa8fd8630`
Active artifact after generation: `bfa3f42d-1f74-4beb-b395-c951d4de5a60`

Design refinement:

The desktop Ask history rail is now more explicitly represented as a second, independent left-side sub-navigation.

Generated areas inspected:

- `pages/DesktopAsk.tsx`
- `pages/MobileAsk.tsx`
- `components/DesktopLayout.tsx`

Design result:

- The global app navigation remains independently collapsible.
- The Ask history sub-navigation appears immediately to the right of the global app navigation on the Ask screen.
- The Ask history rail is labelled as a secondary Ask sub-navigation so reviewers do not confuse it with the global nav.
- The expanded Ask history rail includes title, New conversation, search, grouped history rows, scope chip, source count, updated time, weak-source warning, and overflow action.
- The collapsed Ask history rail uses a narrow icon-only layout with expand control, History icon, New conversation icon, recent conversation indicators, and weak-source marker.
- A reviewer toggle labelled Ask history: Expanded / Collapsed was added to make both states visible and testable in static review.
- Collapsing the Ask history sub-navigation visibly gives the Ask conversation workspace more horizontal room.
- Android Ask history remains a bottom drawer/sheet.

Design rule:

Desktop Ask has two separate collapsible navigation layers: the global app nav and the Ask history sub-nav. They should behave independently and communicate different levels of navigation.

## Iteration: Included Topics On Item Detail

Updated: 2026-06-13
Request ID: `62f9bb08-3133-4d92-92fa-ee1904a9cd05`
Active artifact after generation: `1a37ffe7-839f-44f0-b5da-22d7ed2cfe70`

Design addition:

Saved item detail now includes an AI-generated "Included topics" section in addition to user-managed Tags.

Generated areas inspected:

- `data/sources.ts`
- `pages/DesktopItemDetail.tsx`
- `pages/MobileItemDetail.tsx`

Design result:

- Fake source data now includes `includedTopics` for each sample item.
- Desktop item detail right rail now includes "Included topics" under Tags and before Collections.
- Android item detail now includes "Included topics" in the Details tab near Tags and Collections.
- Topic pills are clickable and route toward Library with a topic filter/search affordance.
- Included topics are labelled as AI detected / auto-detected from the item.
- Weak or metadata-only items show a muted state explaining that topics will improve after full text or transcript is added.
- Included topics do not include a default "+ Add" action, keeping them distinct from user-managed tags.

Design rule:

Tags are user organization. Included topics are AI understanding of what the item covers. Topics should help users rediscover related material and understand what is inside an item without rereading the whole source.

## Iteration: Split Tags, Included Topics, And Collections Cards

Updated: 2026-06-13
Request ID: `567ac50f-e4fa-4f78-993a-9ff41127977f`
Active artifact after generation: `5c0a29b5-4a45-4e0e-bd74-5a2b60239d8e`

Design refinement:

Tags, Included topics, and Collections are now separated into their own cards/boxes instead of being grouped inside one combined organization block.

Generated areas inspected:

- `pages/DesktopItemDetail.tsx`
- `pages/MobileItemDetail.tsx`

Design result:

- Desktop item detail right rail now has separate cards for Tags, Included topics, and Collections.
- Android item detail Details tab now has separate cards for Tags, Included topics, and Collections.
- Tags remains user-managed and keeps the add-tag affordance.
- Included topics remains AI-detected with helper copy and clickable topic pills.
- Collections is its own grouping/saved-set module with its own add-to-collection affordance.

Design rule:

These three concepts are adjacent but not identical. Separate cards make the item metadata easier to scan and prevent AI-detected topics from feeling like user-managed tags.

## Debug Fix: Android Library Item Detail Not Loading

Updated: 2026-06-13
Initial broken artifact: `5c0a29b5-4a45-4e0e-bd74-5a2b60239d8e`
Shared component restore artifact: `d7021713-043a-46ea-a9f6-765e9c370d3e`
Final active artifact after fix: `accf3e98-6453-4e6a-b097-5c3cee36b9cb`
Rollback candidate before fix: `5c0a29b5-4a45-4e0e-bd74-5a2b60239d8e`

Issue:

In Android mode, tapping a Library item changed the URL to `/m/item/:id`, but the item detail screen failed to load.

Root causes found:

- Several shared UI primitive files were empty in the active Magic Patterns artifact: `Button`, `Badge`, `Input`, `Card`, `Tabs`, `Drawer`, `Select`, `Checkbox`, and `Separator`.
- `pages/MobileItemDetail.tsx` used `<Card>` and `<CardContent>` inside the Related tab but did not import them.

Fix applied:

- Restored the missing shared UI primitive components.
- Added the missing `Card` and `CardContent` import to `pages/MobileItemDetail.tsx`.
- Preserved the latest item detail metadata structure, including separate Tags, Included topics, and Collections cards.

Verification:

- Published preview loaded successfully.
- Tested Android flow in the Magic Patterns preview:
  - switched to Android,
  - tapped the first Library item,
  - confirmed URL changed to `/m/item/1`,
  - confirmed item detail title rendered,
  - opened Details tab,
  - confirmed Tags, Included topics, and Collections cards were visible.
