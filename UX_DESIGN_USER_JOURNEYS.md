# AI Brain User Journeys

Created: 2026-06-11
Purpose: Journey maps and service blueprint notes for redesign.

## Primary User Jobs

1. Save something valuable without breaking flow.
2. Understand whether Brain saved enough source content.
3. Repair weak captures.
4. Read and annotate/source-navigate later.
5. Ask questions and trust the answer.
6. Use mobile as a capture/read companion.
7. Revisit important material without turning the product into a gamified chore.

## Journey 1: First Run And Device Pairing

### Scenario

Arun opens AI Brain on web or Android and needs to trust that this is his personal Brain.

### Current Touchpoints

- Setup PIN.
- Unlock.
- Settings -> Device Pairing.
- APK setup route.
- Token rotation.
- Cloud/tunnel production origin.

### Journey

| Stage | User goal | System behavior | Design need |
|---|---|---|---|
| Setup | Start safely | Creates PIN/session | Simple, truthful setup copy |
| Pair Android | Connect phone | Shows QR/token flow | Explain device pairing without network jargon |
| Confirm connected | Know it worked | APK opens Library | Success state and device name/status |
| Recover | Fix stale token | Rotate/re-pair | Clear "re-pair" path |

### Pain Points

- Earlier docs contained local-only trust language that is no longer fully true.
- Device pairing can feel operational rather than product-like.

### Redesign Opportunities

- Add "Where your data lives" trust card.
- Add connected device list.
- Add plain-language provider/tunnel status.

## Journey 2: Fast Capture From Web Or Telegram

### Scenario

Arun finds a YouTube, LinkedIn, Substack, article, PDF, or note and wants it in Brain.

### Current Touchpoints

- Web Capture page.
- Telegram capture.
- Android share-sheet.
- Chrome extension/context menu.
- URL/PDF/note API routes.

### Journey

| Stage | User action | System behavior | Desired feeling |
|---|---|---|---|
| Discover | Finds source | None yet | Stay in flow |
| Send/save | Shares URL/text/file | Saves item quickly | "It is safely in Brain" |
| Extract | Attempts source extraction | Full text, transcript, preview, or metadata | "Brain is honest about what it got" |
| Enrich | Async summary/index/tags | Processing state | "I can move on" |
| Confirm | Receives acknowledgement | Shows item link and quality | "I know what happened" |

### Pain Points

- Weak saves are technically handled but need clearer user affordances.
- Telegram copy is a major design surface.
- Generic capture copy may overpromise extraction quality.

### Redesign Opportunities

- Standardize capture acknowledgement patterns.
- Add "saved but weak" state with one next action.
- Distinguish "failed to save" from "saved metadata only."

## Journey 3: Weak Capture Repair

### Scenario

YouTube transcript is blocked, LinkedIn only saves metadata, or Substack returns preview content.

### Desired Journey

| Stage | User goal | System behavior | UI requirement |
|---|---|---|---|
| Notice | Find weak saves | Needs Upgrade filter/inbox | Weak captures are visible |
| Understand | Know why weak | Platform-specific explanation | Plain language, no enum talk |
| Repair | Add useful text | Paste transcript/post/article body | One clear upgrade form |
| Protect | Avoid duplicates/stale state | Updates existing item and resets derived data | Success state confirms updated existing item |
| Reuse | Ask/search now use new text | Re-enrichment/indexing refreshes | Show "refreshing" state |

### Emotional Arc

- Before: "Did Brain actually save anything useful?"
- During: "I know exactly what is missing."
- After: "This item is now reliable memory."

### Design Requirements

- Needs Upgrade should be a primary work queue.
- Item detail upgrade form should be available for eligible weak captures.
- Upgrade should not feel like editing a database row; it should feel like completing a capture.

## Journey 4: Library Triage And Organization

### Scenario

Arun opens Brain to scan what he has captured and clean up the library.

### Current Touchpoints

- Library list.
- Search.
- Bulk selection.
- Tags/collections.
- Quality labels.

### Journey

| Stage | User goal | Current support | Redesign requirement |
|---|---|---|---|
| Scan | See recent saves | Chronological list | Better source/quality hierarchy |
| Filter | Find weak or source-specific items | Quality labels, limited filters | Segmented quality/source controls |
| Organize | Tag/collect/delete | Bulk bar | Add "Ask selected" and export later |
| Decide | Keep or repair | Hints on detail | Add row-level weak action |

### Pain Points

- Quality labels exist but review workflow is not yet complete.
- Bulk actions are useful but currently organization-only.

### Redesign Opportunities

- Add a Library header that can switch between Browse and Review modes.
- Add multi-select Ask from selected items.
- Treat weak captures as a queue, not merely row metadata.

## Journey 5: Reading A Saved Item

### Scenario

Arun opens a saved item to read, understand, and possibly ask about it.

### Current Touchpoints

- Item detail.
- Source content.
- Capture diagnostics.
- Summary/key quotes.
- Tags/collections.
- Related items.
- Ask this item.
- Markdown export.

### Journey

| Stage | User goal | System behavior | Design need |
|---|---|---|---|
| Orient | What is this? | Title, platform, source, quality | High-signal metadata |
| Read | Consume source | Article body/transcript/text | Editorial layout |
| Understand | Get summary/quotes | AI digest panel | Helpful but subordinate |
| Connect | See related items | Related panel | Explain why related later |
| Act | Ask/export/tag/repair | Actions in footer/right panel | Contextual action grouping |

### Pain Points

- The right rail can become a stack of operational panels.
- Capture diagnostics are important but can overwhelm reading if not grouped well.

### Redesign Opportunities

- Move capture diagnostics into a compact, expandable "Source quality" panel.
- Put repair action high only when item is weak.
- Add passage navigation for citations/highlights.
- Add focus mode.

## Journey 6: Ask With Source Grounding

### Scenario

Arun asks Brain a question over the library or one item.

### Current Touchpoints

- Ask page.
- Per-item Ask.
- Streaming response.
- Citation chips.
- Retrieved chunks list.
- Highlighted cited chunk on item page.

### Journey

| Stage | User goal | System behavior | Design requirement |
|---|---|---|---|
| Scope | Decide what Brain should use | Global or item scope today | Add selected/source/date/quality scope |
| Ask | Enter question | Streams answer | Input should show active scope |
| Verify | Inspect evidence | Citation chips and retrieved chunks | Expand citations with quality/source |
| Continue | Ask follow-up | Chat turn persists visually | Thread state should be clearer |
| Navigate | Read source passage | Citation link opens item highlight | Passage landing should feel intentional |

### Pain Points

- Current Ask scope is underpowered for a growing library.
- Citation chips are functional but not expressive enough.

### Redesign Opportunities

- Add "Ask from..." scope selector.
- Add source panel with quality labels and source snippets.
- Add weak-source warning in answers.
- Add "upgrade source" from a weak citation.

## Journey 7: Android Share And Offline Read

### Scenario

Arun uses phone as capture device and reading companion.

### Current Touchpoints

- Android APK/WebView.
- Share target.
- Bottom nav.
- Offline shell/outbox.
- Library offline-from-DB plan.

### Journey

| Stage | User goal | System behavior | Design requirement |
|---|---|---|---|
| Share | Send source from phone | Opens Brain capture/share path | Minimal confirmation |
| Save offline | Capture when network weak | Outbox/queued behavior | Queue state must be visible |
| Read offline | Open saved item on device | Planned IndexedDB read replica | Clear synced/offline status |
| Reconnect | Sync queued/cached data | Delta pull/outbox sync | Quiet sync feedback |

### Pain Points

- Current Android UX inherits web layout.
- Offline item reads are planned but not fully designed.

### Redesign Opportunities

- Mobile-first capture sheet.
- Offline library sync status in Settings.
- "Available offline" indicator.
- Clear unreachable state that does not imply data loss.

## Journey 8: Future Weekly Review

### Scenario

Instead of full SRS, Brain quietly helps Arun revisit meaningful material.

### Proposed Journey

| Stage | User goal | Brain behavior | UI pattern |
|---|---|---|---|
| Open weekly review | See what matters | Shows new captures, weak items, older resurfaced items | Calm digest |
| Triage | Decide next action | Review, upgrade, archive, ask | Card list |
| Explore | Connect ideas | Suggested connections | "Ask about these" |
| Close loop | Mark done | Saves reviewed state | Gentle completion |

### Design Recommendation

Prototype weekly review before full SRS. Full review cards should wait until source quality and selected/highlighted passages are reliable.

## Service Blueprint: Capture To Ask

```text
User          Share / paste / upload
UI            Capture acknowledgement + quality label
Capture       Platform router -> adapter -> saved item
Storage       Item + artifacts + provenance
Async         Enrich + chunk + embed + tag
Library       Browse / filter / needs upgrade
Repair        User adds transcript/post/newsletter text
Storage       Existing item updated + stale derived state reset
Ask           Retrieval uses refreshed source chunks
Evidence      Citation links back to exact passage
```

## Design Principles From The Journeys

- Every weak state needs a next action.
- Every AI answer needs evidence.
- Every repair should update the same item, not create a duplicate.
- Every mobile/offline state should distinguish "not synced yet" from "server unreachable."
- Every future generative feature should build on trusted sources, not bypass them.
