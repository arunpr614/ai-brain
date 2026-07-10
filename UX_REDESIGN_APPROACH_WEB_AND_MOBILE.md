# AI Brain Web And Mobile Redesign Approach

Created: 2026-06-11
Purpose: Design strategy and operating approach for redesigning the AI Brain web and Android experiences.
Status: Product/design report. Not an implementation plan.

## Executive Position

The redesign should treat AI Brain as a personal memory system, not an AI chatbot and not a generic bookmark manager.

The product's center of gravity should be:

```text
Saved source -> source quality -> repair path -> reading -> source-grounded reuse
```

The web experience should become the primary thinking and management workbench. The Android experience should become the fast capture, quick lookup, and offline reading companion. They should share the same product language and state model, but they should not use the same layout model.

The most important design problem is not visual polish. It is making the user trust what Brain has captured, understand what is missing, and know what to do next.

## Working Design Brief

Product:

- AI Brain, a personal source-grounded knowledge and memory system.

Surfaces:

- Web app.
- Android APK / mobile web shell.
- Browser extension and Telegram capture as supporting capture surfaces.

Primary redesign goal:

- Make capture, source quality, repair, reading, and Ask feel like one coherent cross-platform system.

Secondary goal:

- Establish a visual direction that feels calm, private, editorial, and durable without turning the product into a heavy dashboard.

Interactivity target for prototypes:

- Start with static/clickable throwaway HTML prototypes.
- Prioritize realistic data, states, and transitions over production-quality implementation.
- Move to higher-fidelity interaction only after the information architecture and state language are approved.

## Core Product Thesis

AI Brain wins when it can answer five questions clearly:

1. Did Brain save this?
2. What exactly did Brain save?
3. Is this source strong enough to trust in search or Ask?
4. If not, what can I do in under 30 seconds?
5. When Brain answers, what evidence did it use?

Every major redesign decision should be tested against these questions.

## The Design Spine

The redesign should be organized around a loop:

```text
Capture -> Confirm -> Review -> Repair -> Read -> Ask -> Revisit
```

Each step has a distinct user need:

| Step | User need | Design responsibility |
|---|---|---|
| Capture | Save without breaking flow | Fast entry, low friction, no overpromising |
| Confirm | Know what happened | Clear saved state and quality result |
| Review | See weak or incomplete items | Needs Upgrade queue and filters |
| Repair | Improve weak captures | Paste transcript/text, retry, mark good enough |
| Read | Consume original source | Editorial item detail and focus mode |
| Ask | Reuse knowledge with evidence | Scope control, citation quality, source panel |
| Revisit | Return later | Search, related items, collections, review |

This loop should drive both web and Android.

## Platform Roles

## Web Role: The Workbench

The web app should be where the user does the deeper work:

- Browse and triage the library.
- Repair weak captures.
- Read long-form sources.
- Ask scoped questions.
- Select multiple items and work across them.
- Manage tags, collections, devices, providers, exports, and backups.
- Review source quality and trust states.

The web UI can carry more density, richer filters, split panels, and long-form reading layouts.

## Android Role: The Companion

The Android experience should be optimized for four postures:

1. Capture in motion.
2. Check whether something saved correctly.
3. Read an item later, including offline.
4. Ask a quick source-grounded question.

Android should not feel like a compressed desktop app. It should feel like the same Brain adapted to phone moments:

- Quick share-sheet capture.
- Bottom navigation.
- One-handed actions.
- Large tap targets.
- Clear offline/unreachable states.
- Mobile item detail with tabs instead of a dense side rail.

## Cross-Platform Rule

Same concepts, different posture.

Web and Android should share:

- Source quality vocabulary.
- Capture acknowledgement patterns.
- Item card anatomy.
- Ask scope model.
- Citation language.
- Repair outcomes.
- Trust and privacy copy.

They should not necessarily share:

- Navigation depth.
- Layout density.
- Right-rail behavior.
- Filter placement.
- Bulk management affordances.
- Settings complexity.

## Recommended Information Architecture

## Web IA

Recommended primary navigation:

1. Library
2. Needs Upgrade
3. Ask
4. Capture
5. Settings

Future features such as GenPages, Review, Flow, Graph, and SRS should not sit as disabled primary navigation items until their workflows are real enough to prototype. They can be represented in a roadmap note, command palette, or future section if needed.

### Library

Purpose:

- The calm archive of saved sources.

Main jobs:

- Scan recent saves.
- Search.
- Filter by source type and quality.
- Open items.
- Select multiple items.
- Ask selected.
- Organize with tags/collections.

Recommended default:

- Recent saved sources, grouped or sorted by capture date.
- Prominent but restrained quality filter.
- "Needs Upgrade" count visible but not alarming.

### Needs Upgrade

Purpose:

- The maintenance queue for weak or incomplete captures.

This should feel like "complete these captures" rather than "fix system errors."

Included states:

- Metadata-only YouTube/Shorts.
- LinkedIn metadata-only or partial captures.
- Substack preview-only.
- Items with missing summaries.
- Items not yet searchable.
- Duplicate candidates.
- Failed but saved captures.

Core actions:

- Add transcript or notes.
- Paste full post/article text.
- Retry extraction.
- Open original source.
- Mark as good enough.
- Delete.
- Merge duplicate.

### Ask

Purpose:

- Evidence-backed conversation with the saved library.

Ask should not be the home screen. It should be a work surface that always makes scope visible.

Required scope controls:

- All sources.
- This item.
- Selected items.
- Tag or collection.
- Source type.
- Date range.
- High-quality sources only.

Required answer support:

- Retrieval scope summary.
- Citation chips.
- Expandable source evidence.
- Weak-source warnings.
- Jump to passage.
- Stop generating.

### Capture

Purpose:

- Manual and web-based capture.

Capture should support:

- URL.
- PDF.
- Note.
- Paste article/newsletter.
- Paste transcript or notes into an existing weak item.

Core copy rule:

- Say what was saved, not what the system hoped to save.

Examples:

- "Saved full text."
- "Saved metadata only. Add transcript to make this useful in Ask."
- "Saved preview. Paste full article if you want complete recall."
- "Updated existing item."

### Settings

Purpose:

- Trust, devices, data, and operational controls.

Recommended sections:

- Account/access.
- Device pairing.
- Offline sync.
- Providers and model health.
- Backup/export.
- Tags and collections.
- Appearance.
- Data and privacy.

Settings should use truthful hosted-app language. Avoid old local-only promises unless the specific flow is actually local.

## Android IA

Recommended bottom navigation:

1. Library
2. Capture
3. Ask
4. More

The "More" area can include Settings, Needs Upgrade, device status, offline sync, and exports.

Alternative if weak-capture repair becomes a daily behavior:

1. Library
2. Review
3. Capture
4. Ask

I would not start here unless you expect to repair captures frequently on phone. On mobile, "Review" can become work the user avoids if it feels like chores.

### Android Library

Purpose:

- Quick lookup and continuation.

Recommended structure:

- Search at top.
- Recent items.
- Saved for offline.
- Needs Upgrade summary row.
- Source type filters in a horizontal control.
- Quality labels on cards, but less dense than web.

### Android Capture

Purpose:

- Fast manual capture and share-sheet landing.

The capture screen should be optimized around the source entering from Android share:

1. User shares URL/text/file into Brain.
2. Brain saves immediately.
3. Brain shows a bottom sheet:
   - Saved status.
   - Source quality.
   - One next action.
4. User can dismiss, open item, add text, or ask.

The capture result should never trap the user in a long processing screen.

### Android Item Detail

Purpose:

- Read, inspect, and act on a saved source.

Recommended mobile layout:

- Header with title, platform, quality.
- Tab or segmented control:
  - Original
  - Digest
  - Ask
  - Related
- Repair prompt appears above tabs only when the item is weak.
- Offline status appears near title or in a compact status bar.

Avoid putting every desktop side-panel module into a single long mobile page.

### Android Ask

Purpose:

- Quick source-grounded questions.

Recommended defaults:

- Ask all high-quality sources by default.
- When launched from item detail, scope to that item.
- When launched from Library selection, scope to selected items.
- Show a compact scope pill above the input.

### Android Offline

Offline is not just a backend feature; it is a trust state.

Required mobile states:

- Available offline.
- Not available offline.
- Syncing for offline.
- Server unreachable.
- Captured offline, will sync later.
- Item available but Ask unavailable.

The user should always understand what can still be done without connection.

## Visual Direction Strategy

Do not choose the final theme from prose. Evaluate visual direction through the same concrete screens.

Recommended visual exploration set:

### Direction 1: Structured Calm V2

What it is:

- Evolves the current indigo, Inter, Charter, Radix Slate direction.

Best for:

- Lowest adoption risk.
- Preserving continuity with current design docs.
- Making the app feel polished without changing personality too much.

Risks:

- Could still feel like a conventional SaaS dashboard if not pushed editorially enough.

### Direction 2: Private Archive

What it is:

- More editorial, warmer neutral, restrained green or blue-green accents, stronger long-form reading cues.

Best for:

- Making AI Brain feel like a personal library and thinking space.
- Supporting source reading and memory.

Risks:

- If too bookish, Ask and operational repair flows may feel underpowered.

### Direction 3: Focus Workbench

What it is:

- Cleaner, slightly denser, stronger controls, more explicit state system.

Best for:

- Power use, capture review, scoped Ask, and large library management.

Risks:

- Could become too utilitarian and lose the calm reading soul.

## Recommended Visual Testing Screens

Each visual direction should be tested against the same screens:

1. Desktop Library with mixed source quality.
2. Desktop Needs Upgrade queue.
3. Desktop Item Detail with weak capture repair.
4. Desktop Ask with citations and scope.
5. Android share capture result.
6. Android item detail offline state.

No theme should be approved until it works across both reading and maintenance states.

## Redesign Process

## Phase 1: Lock Product Frame

Goal:

- Decide what the product is trying to feel like before drawing screens.

Decisions:

- Is AI Brain primarily "private library", "AI memory", or "thinking workbench"?
- Is the home screen Library or a hybrid Home?
- How visible should weak-capture maintenance be?
- Is Android primarily capture-first or reading-first?

Deliverables:

- One-page product frame.
- Navigation principles.
- Quality vocabulary.
- Platform role statement.

Recommended output:

- Update the design report pack after your decisions.

## Phase 2: IA And Journey Wireframes

Goal:

- Make the product structure obvious before visual styling.

Work:

- Web IA map.
- Android IA map.
- Capture-to-repair journey.
- Ask scope journey.
- Offline mobile journey.
- Settings/trust journey.

Deliverables:

- Low-fidelity wireframes.
- State diagrams.
- Screen inventory.
- Cross-platform interaction matrix.

Design rule:

- If a weak source is visible, the next action must also be visible.

## Phase 3: Throwaway Prototype 1 - Web Capture Quality Loop

Goal:

- Validate the most important product loop.

Prototype screens:

- Library.
- Needs Upgrade.
- Weak item detail.
- Upgrade form.
- Upgrade success.
- Ask selected from Library.

Prototype behavior:

- Static/clickable.
- Realistic fake data.
- Quality labels and platform examples.
- Click through from weak row to repair to success.

Why first:

- This is the highest-leverage product risk. If this loop feels good, the rest of the product has a spine.

## Phase 4: Throwaway Prototype 2 - Source-Grounded Ask

Goal:

- Make Ask feel trustworthy instead of generic.

Prototype screens:

- Ask all.
- Ask selected.
- Ask this item.
- Citation expansion.
- Weak-source warning.
- Source evidence panel.

Prototype behavior:

- The user can change scope.
- The answer visibly cites sources.
- Citations show quality and jump target.

Key design question:

- Should weak sources be included by default with warnings, excluded by default, or controlled by a scope toggle?

## Phase 5: Throwaway Prototype 3 - Android Companion

Goal:

- Redesign mobile around phone-native moments.

Prototype screens:

- Android Library.
- Share-sheet capture result.
- Capture weak result.
- Item detail with tabs.
- Offline item.
- Ask from item.
- Server unreachable state.

Prototype behavior:

- Tap through the share result.
- Open a weak capture.
- Add text.
- See offline/read state.

Key design question:

- Is Android a daily reader or mostly a capture tool?

## Phase 6: Visual Direction Exploration

Goal:

- Choose the visual language using evidence from actual product states.

Work:

- Create three visual directions.
- Apply each to the six test screens.
- Compare readability, density, trust, emotional tone, and mobile fit.

Decision criteria:

- Does the Library feel calm but useful?
- Does Needs Upgrade feel actionable without feeling broken?
- Does Item Detail feel like a reading surface?
- Does Ask feel evidence-backed?
- Does Android feel native enough?
- Does the visual system age well as the library grows?

## Phase 7: Final Design System Direction

Goal:

- Convert the chosen direction into a reusable design language.

Deliverables:

- Color tokens.
- Type scale.
- Spacing scale.
- Radius/border/shadow rules.
- Source quality badges.
- Item cards.
- Citation chips.
- Scope selector.
- Repair prompt.
- Empty/loading/offline/error states.
- Mobile navigation and tabs.

Important:

- The design system should be built from product states, not abstract components first.

## Phase 8: Final Prototype Package

Goal:

- Create a coherent redesign package for review before production implementation.

Deliverables:

- Web clickable prototype.
- Android clickable prototype.
- Screen-by-screen rationale.
- Design requirement updates.
- State matrix.
- Copy dictionary.
- Open questions list.
- Implementation handoff notes later, only when design is approved.

## Web Screen Approach

## 1. Library

Design intent:

- Calm, searchable source archive.

Recommended layout:

- Left navigation.
- Main library list/grid.
- Top search and filter area.
- Quality segmented control.
- Optional right contextual panel only when useful.

Important states:

- Empty library.
- Recent captures.
- Search results.
- Needs Upgrade filter.
- Bulk selected.
- Offline/cached.
- Loading/enriching.

Design notes:

- Do not make every item a large content card by default. AI Brain needs scanning density.
- Use compact rows or medium-density cards with source icon, title, source type, quality, date, and one next action.
- Quality should be legible but not visually louder than the source title.

## 2. Needs Upgrade

Design intent:

- Calm repair queue.

Recommended layout:

- Explain the queue in one sentence.
- Group by reason:
  - Needs transcript.
  - Needs pasted article/post text.
  - Preview only.
  - Needs retry.
  - Duplicate candidate.
- Each row has one primary action.

Tone:

- "Needs text to be useful in Ask."
- "Saved preview only."
- "Transcript unavailable. Add notes or transcript."

Avoid:

- "Extraction failed."
- "metadata_only."
- "Provider error."
- "Embedding missing."

## 3. Item Detail

Design intent:

- Reading first, trust always visible.

Recommended desktop layout:

- Main column: original content.
- Right rail: source quality, digest, key quotes, related, tags, collections, actions.
- Sticky mini header for title/source/actions.

When item is weak:

- Show a high-priority repair prompt above the content.
- Keep the original content/metadata visible.
- Explain what will improve after adding text.

When item is strong:

- Keep diagnostics compact.
- Let the reading surface breathe.

Recommended mobile layout:

- Title and quality summary.
- Tabs:
  - Original
  - Digest
  - Ask
  - Related
- Repair prompt only when needed.

## 4. Ask

Design intent:

- Evidence-backed synthesis, not generic chat.

Recommended layout:

- Scope selector at top.
- Chat input and response.
- Source evidence panel on desktop.
- Citation chips inline.
- Retrieval/source summary near answer.

Recommended mobile:

- Scope pill above input.
- Citations expand into bottom sheet.
- Source evidence as a full-screen drill-in.

Key interaction:

- "Ask selected" from Library should open Ask with selected scope already set.

## 5. Capture

Design intent:

- Fast save with honest result.

Recommended layout:

- Capture modes as tabs or segmented controls.
- URL/PDF/Note/Paste.
- Recent capture result panel.
- If weak, show next action.

Important:

- Capture should not feel like a form submission that either succeeds or fails. It should feel like save plus enrichment.

## 6. Settings

Design intent:

- Trust center.

Settings should make AI Brain feel owned, portable, and understandable.

Recommended groups:

- Devices.
- Offline.
- Backup/export.
- Providers.
- Appearance.
- Data/privacy.
- Tags/collections.

## Android Screen Approach

## 1. Mobile Home / Library

Design intent:

- The phone opens into usefulness, not admin.

Recommended first screen:

- Search.
- Recent saves.
- Continue reading.
- Needs Upgrade summary.
- Offline saved items.

If Android is capture-first:

- Put Capture as the center action.

If Android is reading-first:

- Put Continue Reading above recent saves.

## 2. Share-Sheet Capture Result

Design intent:

- Let the user save and leave quickly.

Recommended bottom-sheet structure:

- Title/source icon.
- Saved status.
- Quality result.
- One recommended next action.
- Secondary actions:
  - Open item.
  - Add text.
  - Ask.
  - Done.

Examples:

- "Saved full transcript."
- "Saved metadata only. Add transcript later."
- "Saved preview. Paste full article when ready."

## 3. Mobile Weak Capture Repair

Design intent:

- Make repair possible on phone without feeling like document editing.

Recommended pattern:

- Short explanation.
- Large paste field.
- Source link.
- Save/update button.
- Confirmation that existing item was updated.

Avoid:

- Complex metadata fields.
- Admin-like diagnostics.
- Multi-step setup.

## 4. Mobile Item Detail

Design intent:

- A readable saved source with simple actions.

Recommended pattern:

- Compact source header.
- Tabs.
- Sticky bottom action for Ask or Continue.
- Offline state in the header.

## 5. Mobile Ask

Design intent:

- Quick, scoped, confidence-building.

Recommended pattern:

- Scope pill.
- Large input.
- Response.
- Citation chips.
- Citation bottom sheet.

## 6. Mobile Offline

Design intent:

- No mysterious dead ends.

Recommended copy examples:

- "Available offline."
- "This item is saved on this device."
- "Ask needs connection."
- "Server unreachable. You can still read offline items."
- "Capture saved on phone. It will sync when Brain is reachable."

## State Language System

The redesign needs a simple state vocabulary.

## Source Quality

User-facing labels:

- Full text
- Transcript
- Preview only
- Metadata only
- User-provided text
- Offline copy
- Failed

## Processing State

User-facing labels:

- Saved
- Enriching
- Searchable
- Needs upgrade
- Retrying
- Updated
- Syncing
- Offline

## Ask Scope

User-facing labels:

- All sources
- High-quality sources
- This item
- Selected items
- This collection
- This tag
- Date range

## Design Questions For Arun

These are the questions I would ask before moving from approach into prototypes.

1. What should AI Brain feel like first: private library, thinking workbench, or AI memory?
2. Should the web app open to Library, a Home dashboard, or a Needs Upgrade/Inbox view?
3. Should Needs Upgrade be a primary nav item or a Library filter?
4. Is Android mainly for capture, daily reading, or both equally?
5. Should weak sources be included in Ask by default with warnings, or excluded unless the user opts in?
6. Do you prefer the current Structured Calm indigo direction, the green/editorial direction, or a new third direction?
7. Should future features like GenPages, Review, Flow, and Graph remain visible in navigation, or disappear until they are usable?
8. How much operational truth do you want visible in Settings: minimal user-friendly trust copy, or a more transparent power-user view?
9. Should AI Brain optimize for speed of capture even if quality is weak, or interrupt more often to request better source text?
10. What is the first prototype you want to react to: web Library/Needs Upgrade, web Ask, or Android share/offline?

## My Recommended Answers

If I were making the first-pass product calls, I would choose:

1. Feel: private library plus thinking workbench.
2. Web first screen: Library.
3. Needs Upgrade: primary nav on web, summary/filter on mobile.
4. Android: capture-first plus offline reading, not full admin.
5. Ask: include weak sources only with clear warning and a quality toggle.
6. Visual direction: test Structured Calm V2 against Private Archive before deciding.
7. Future nav: remove disabled primary nav items from the next redesign.
8. Settings: user-friendly trust copy by default, power details behind disclosure.
9. Capture: save first, never block, but make weak quality impossible to miss after saving.
10. First prototype: web Library + Needs Upgrade + weak item repair.

## Prototype Roadmap

## Prototype 1: Web Source Quality Loop

Screens:

- Library.
- Needs Upgrade.
- Weak item detail.
- Upgrade form.
- Upgrade success.

Questions answered:

- Does source quality make sense?
- Is repair obvious?
- Does the product feel helpful rather than broken?

## Prototype 2: Web Ask With Evidence

Screens:

- Ask all.
- Ask selected.
- Ask this item.
- Citation expansion.
- Weak-source warning.

Questions answered:

- Does Ask feel trustworthy?
- Is scope clear?
- Can the user verify answers quickly?

## Prototype 3: Android Capture And Offline

Screens:

- Library/home.
- Share-sheet capture result.
- Weak capture repair.
- Item detail tabs.
- Offline item.
- Server unreachable.

Questions answered:

- Does Android feel phone-native?
- Is offline understandable?
- Can capture succeed without interrupting flow?

## Prototype 4: Visual Direction Comparison

Screens:

- Same critical screens across two or three visual directions.

Questions answered:

- Which visual system supports the product best?
- Which direction feels durable across web and mobile?
- Which direction makes trust states readable without visual noise?

## Design Review Criteria

Use this checklist when reviewing prototypes.

Product clarity:

- Can the user tell what the product is for within 10 seconds?
- Does the source object feel more important than chat?
- Are future features kept from overwhelming current workflows?

Trust:

- Is source quality visible?
- Are weak captures honest but not alarming?
- Can the user repair weak items?
- Are AI answers visibly grounded in sources?

Usability:

- Can common actions be completed quickly?
- Are mobile actions reachable with one hand?
- Is the web experience dense enough for real use?
- Are empty, loading, offline, and error states designed?

Reading:

- Is the item detail page comfortable for long-form content?
- Does the AI digest support rather than replace the source?
- Are citations and highlights easy to navigate?

Cross-platform coherence:

- Do web and Android use the same language?
- Does each platform respect its own posture?
- Can the user understand what happened across capture surfaces?

## What Not To Do Yet

Avoid these until the source-quality loop is solid:

- Full graph exploration.
- GenPages as a primary nav item.
- Flow as a central feature.
- Heavy gamified review/SRS.
- A Notion-style editor.
- A dashboard-first home packed with metrics.
- A purely chat-first redesign.
- A wholesale visual token swap without screen-level comparison.

## Immediate Next Step

The best next move is to create a disposable web prototype for:

1. Library.
2. Needs Upgrade.
3. Weak item detail.
4. Upgrade success.
5. Ask selected entry point.

Use realistic examples:

- YouTube transcript captured.
- YouTube metadata-only.
- LinkedIn metadata-only.
- Substack preview-only.
- PDF full text.
- Manual note.

Once that loop feels right, design Android around the same states instead of trying to redesign every screen at once.

## Final Recommendation

Design AI Brain around trust, not magic.

The redesign should make the user feel:

- "My sources are safe."
- "Brain is honest about what it captured."
- "Weak items are fixable."
- "Reading still matters."
- "AI answers are grounded in evidence."
- "My phone and web app are the same Brain, used in different moments."

If the next prototypes deliver that feeling, the later features - GenPages, Review, Flow, Graph, and broader agent access - will have a much stronger foundation.
