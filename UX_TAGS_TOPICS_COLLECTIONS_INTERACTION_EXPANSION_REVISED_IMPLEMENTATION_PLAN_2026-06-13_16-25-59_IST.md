# UX Tags, Topics, and Collections Interaction Expansion Revised Implementation Plan

Created: 2026-06-13 16:25:59 IST
Project: AI Brain Phase 2 redesign
Scope: Web and Android high-fidelity Magic Patterns UX updates for Tags, Included topics, Collections, and related Ask scopes.
Status: Executed as Magic Patterns draft artifacts on 2026-06-13 16:43 IST. Not published.
Source plan: `UX_TAGS_TOPICS_COLLECTIONS_INTERACTION_EXPANSION_PLAN_2026-06-13_16-08-07_IST.md`
Adversarial review addressed: `UX_TAGS_TOPICS_COLLECTIONS_INTERACTION_EXPANSION_PLAN_ADVERSARIAL_REVIEW_2026-06-13_16-22-20_IST.md`

## 1. Executive Decision

Proceed only as a guarded high-fidelity design update. This pass should make Tags, Included topics, and Collections feel like three distinct rediscovery paths without implying that every AI, extraction, confidence, or scoped retrieval capability is production-ready.

The revised interaction model remains:

```text
Item detail -> Tag -> Tagged Library view
Item detail -> Included topic -> Topic exploration view
Item detail -> Collection -> Collection detail view
```

But execution must now follow three non-negotiable rules:

1. Preserve the active privacy-honesty drafts before changing Magic Patterns.
2. Keep AI-generated organization honest as designed sample behavior, not a live product claim.
3. Do not enable any visible action unless the prototype shows a clear result state.

## 2. Adversarial Review Response

| Review issue | Plan change |
|---|---|
| Active privacy drafts can be overwritten | Added artifact safety gates, exact active draft IDs, rollback IDs, and publish rules. |
| AI generation and semantic understanding are overclaimed | Added prototype-honesty rules and safer UI language for sample AI suggestions, evidence, and scopes. |
| Ask scope lacks source-quality rules | Added Ask scope contracts with item counts, weak-source warnings, evidence behavior, and empty states. |
| Entity identity is too loose | Added entity model tables for Tags, Included topics, and Collections. |
| Editing flows lack guardrails | Added duplicate prevention, undo, local/global action separation, and destructive-action confirmation. |
| Android back-stack is underspecified | Added Android navigation matrix. |
| Validation misses visual and regression checks | Added screenshot/manual inspection, privacy regression, focus-mode regression, accessibility, and parity checks. |
| First pass is too broad | Split execution into two design passes plus validation and publish phases. |
| AI/topic distinction is too subtle | Added explicit provenance copy and differentiated card language. |
| Example labels are too technical | Replaced technical examples with user-language examples. |

## 3. Current Magic Patterns Artifact Safety

### Web high-fidelity project

- Editor URL: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`
- Editor ID: `fhbeo46qahq5fkjfseckxx`
- Expected active draft before execution: `d7e38db8-0d7b-4b10-b8cd-e804eaea3937`
- Current privacy honesty draft: `d7e38db8-0d7b-4b10-b8cd-e804eaea3937`
- Rollback candidate for this work: `d7e38db8-0d7b-4b10-b8cd-e804eaea3937`
- Previous stable published artifact: `2c667814-3105-4f66-8025-def3d47e7272`

### Android high-fidelity project

- Editor URL: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Editor ID: `d5w3fb6rzxdeht7urnye5r`
- Expected active draft before execution: `7713c1fc-d1d1-415c-893e-994b1a152450`
- Current privacy honesty draft: `7713c1fc-d1d1-415c-893e-994b1a152450`
- Rollback candidate for this work: `7713c1fc-d1d1-415c-893e-994b1a152450`
- Previous stable published artifact: `f4d1c09c-b941-481f-8fa1-fa095febe25b`

### Artifact safety gates

Do not execute Magic Patterns changes unless:

- Magic Patterns status confirms both projects are idle.
- Web active artifact is `d7e38db8-0d7b-4b10-b8cd-e804eaea3937`, unless the user explicitly chooses a different base.
- Android active artifact is `7713c1fc-d1d1-415c-893e-994b1a152450`, unless the user explicitly chooses a different base.
- The new work branches from the active privacy-honesty drafts.
- The privacy correction remains present after the update:
  - Web does not claim end-to-end encryption is available.
  - Web sidebar footer still says privacy controls are coming soon.
  - Android Data & privacy controls remain disabled and clearly marked coming soon.
- No publish occurs unless the user explicitly asks to publish.

## 4. Prototype Honesty Rules

This is a high-fidelity design prototype, not a production implementation. The UI must avoid implying unavailable capabilities.

### Safe language

Use:

- `Suggested by Brain`
- `Detected in this item`
- `Example evidence`
- `Designed scope`
- `Items in this prototype`
- `This view shows how the interaction should work`

Avoid:

- `Automatically generated from your full library` unless confirmed.
- `High confidence` unless confidence scoring exists.
- `Brain found this across all items` unless the data supports it.
- Any wording that implies live topic extraction, live evidence scoring, or production scoped retrieval.

### Sample data rule

Use deterministic prototype data. If a screen shows AI tags, included topics, snippets, or Ask responses, the design should read as an interaction example rather than a verified backend result.

## 5. Entity Model

### Tags

| Field | UX requirement |
|---|---|
| `id` | Stable internal ID, not visible to users. |
| `displayLabel` | User-facing label, for example `research methods`, `saved talks`, `reading list`. |
| `slug` | Route-safe value for prototype navigation. |
| `provenance` | `Suggested by Brain`, `Added by you`, or `Suggested by Brain, kept by you`. |
| `editable` | Yes. User can add or remove a tag from an item. |
| `scope` | Personal organization and retrieval. |
| `route` | Web: `/library?tag=research-methods`; Android: tagged Library state. |

### Included Topics

| Field | UX requirement |
|---|---|
| `id` | Stable topic ID for prototype routes. |
| `displayLabel` | Concept label, for example `Attention mechanisms`, `Offline reading`, `Capture quality`. |
| `slug` | Route-safe value for topic detail. |
| `provenance` | `Detected in this item`. |
| `editable` | No direct manual editing on item detail. |
| `scope` | Semantic exploration and related-item discovery. |
| `route` | Web: `/topics/attention-mechanisms`; Android: Topic detail state. |

### Collections

| Field | UX requirement |
|---|---|
| `id` | Stable collection ID. |
| `displayLabel` | User-facing name, for example `Product research`, `Weekend reading`, `AI talks`. |
| `slug` | Route-safe value for collection detail. |
| `provenance` | `Created by you` for this pass. |
| `editable` | Yes. User can add/remove items, rename, and later delete with confirmation. |
| `scope` | Saved grouping or project space. |
| `route` | Web: `/collections/product-research`; Android: Collection detail state. |

## 6. Product Rules

### Tags

- Tags are user-editable labels for personal organization.
- Brain may suggest initial tags in the prototype, but the UI must not imply live generation unless confirmed.
- Clicking or tapping a tag opens a Library view filtered to that tag.
- `Add tag` opens an editor, not a silent mutation.
- Removing a tag from one item is local to that item.
- Renaming, merging, or deleting a tag is a global management action and should not be part of the first-pass item-detail flow.

### Included topics

- Included topics are Brain-detected concepts shown as semantic discovery entry points.
- Topics are not manually added from item detail.
- Tapping or clicking a topic opens Topic exploration.
- Topic exploration can include example evidence, but evidence must be labeled as prototype/sample unless real extraction is confirmed.
- `Create tag from topic` turns a detected concept into a user-managed tag.

### Collections

- Collections are user-managed spaces.
- A saved item can belong to zero, one, or many collections.
- Clicking or tapping a collection pill opens Collection detail.
- `Add to collection` opens a picker with existing collections and create-new behavior.
- Removing an item from a collection is local to that item or collection.
- Deleting a collection is global and requires confirmation; this is out of scope for the first design pass unless represented as a disabled or confirmation-only state.

## 7. Web UX Requirements

### Item detail right rail

Keep Tags, Included topics, and Collections as separate cards.

Tags card:

- Header: `Tags`
- Helper copy: `Tags can be edited and used to find related saved items.`
- Pills:
  - Suggested tag: `[Suggested by Brain] research methods`
  - User tag: `reading list`
- Primary action: `Add tag`
- Primary pill action: open tagged Library.
- Secondary edit state: remove from this item, add existing tag, create tag.

Included topics card:

- Header: `Included topics`
- Badge: `Detected in this item`
- Helper copy: `Topics help explore concepts covered by this item.`
- Pills: `Attention mechanisms`, `Offline reading`, `Capture quality`
- Primary pill action: open Topic exploration.
- No add action.

Collections card:

- Header: `Collections`
- Helper copy: `Collections are saved spaces you manage.`
- Existing collection pills with folder icon.
- Empty state: `Not in a collection yet.`
- Primary action: `Add to collection`.
- Primary pill action: open Collection detail.

### Tag-filtered Library

Required elements:

- Context header: `Tag: research methods`
- Item count.
- Provenance summary: `Suggested on 3 items · added by you on 2 items`
- Active filter chip.
- Actions:
  - `Ask this tag`
  - `Manage tag`
  - `Clear filter`
- Source-quality summary when relevant:
  - `2 items have full text`
  - `1 item is metadata only`

### Topic exploration

Required elements:

- Header: topic name.
- Badge: `Detected topic`
- Copy: `This prototype shows how topic exploration will work.`
- Current item evidence section:
  - Example snippet.
  - Source item title.
  - `Open item`.
- Related saved items.
- Related topics.
- Actions:
  - `Ask this topic`
  - `Create tag from topic`
  - `Add matching items to collection`

### Collection detail

Required elements:

- Collection title.
- Description.
- Item count.
- Badge: `Created by you`.
- Actions:
  - `Ask collection`
  - `Add items`
  - `Rename`
- Search within collection.
- Sort controls.
- Item list.
- Empty state:
  - `No items in this collection yet.`
  - `Add items from Library or from an item detail page.`

## 8. Android UX Requirements

### Item detail Details tab

Use separate sections for:

- Source and capture.
- Tags.
- Included topics.
- Collections.

Tags:

- Tappable chips.
- `Add tag` opens bottom sheet.
- Provenance shown in the bottom sheet, not only as a tiny chip marker.

Included topics:

- Tappable chips.
- Header includes `Detected in this item`.
- No add control.

Collections:

- Tappable collection rows or chips with folder icon.
- `Add to collection` opens bottom sheet.

### Android destination behavior

| Origin | Tap target | Destination | Bottom nav | Top bar | Back behavior |
|---|---|---|---|---|---|
| Item detail | Tag | Tagged Library state | Visible | `Tag` + label | Back returns to item detail. |
| Item detail | Topic | Topic detail | Hidden or neutral detail mode | Topic label | Back returns to item detail. |
| Item detail | Collection | Collection detail | Visible if treated as Library destination | Collection label | Back returns to item detail. |
| Library row | Tag | Tagged Library state | Visible | `Tag` + label | Back returns to previous Library state. |
| Ask citation | Topic | Topic detail | Hidden or neutral detail mode | Topic label | Back returns to Ask citation context. |
| Offline item detail | Tag/topic/collection | Cached destination if data exists | Visible only for cached Library states | Offline status visible | Back returns to item detail. Editing is disabled. |

### Android bottom sheets

Add tag sheet:

- Search existing tags.
- Suggested tags.
- Create new tag.
- Existing attached tags with remove controls.
- Duplicate warning if label already exists.
- Sticky `Done`.

Add to collection sheet:

- Search collections.
- Existing collections with checkboxes.
- Create new collection row.
- Apply/cancel actions.
- Offline state: `Reconnect to update collections.`

## 9. Ask Scope Contracts

Every scoped Ask entry point must carry a visible scope card near the composer.

| Scope | Required scope copy | Required evidence behavior | Weak-source behavior |
|---|---|---|---|
| Tag | `Asking across items tagged research methods` | Citations come from tagged items only in the prototype. | Show `Some tagged items may not have readable text` when applicable. |
| Topic | `Asking across items with topic Attention mechanisms` | Citations come from topic-matched sample items. | Show `Topic results depend on readable saved content`. |
| Collection | `Asking inside Product research` | Citations come from items in the collection. | Show count of full-text versus limited items. |

Required Ask elements:

- Scope name.
- Included item count.
- Limited item count if any.
- `View sources` or equivalent source list.
- Citation chips with source title and quality state.
- Empty state when no readable items are available:
  - `There is not enough readable text in this scope yet.`
  - Primary action: `Add full text` or `Open matching items`.

## 10. Editing Guardrails

### Local actions

These affect only the current item:

- Add tag to this item.
- Remove tag from this item.
- Add item to collection.
- Remove item from collection.

UX requirements:

- Show undo toast after removal.
- Do not require confirmation for local removal.
- Label local actions clearly: `Remove from this item`.

### Global actions

These affect many items or the structure itself:

- Rename tag.
- Merge tag.
- Delete tag.
- Rename collection.
- Delete collection.

UX requirements:

- Keep global actions out of the item-detail default card.
- Put them in `Manage tag` or collection overflow.
- Require confirmation for delete.
- Show affected item count before destructive action.

### Duplicate handling

- Normalize tag and collection names for duplicate checks.
- If a user types an existing tag, show `Already exists. Add existing tag instead?`
- If a user creates a collection with a similar name, show the existing match before creating.

## 11. Edge States

| State | Web behavior | Android behavior |
|---|---|---|
| No tags | Show `No tags yet` and `Add tag`. | Show empty row and `Add tag` button. |
| Only suggested tags | Show provenance: `Suggested by Brain`. | Show provenance in tag sheet. |
| No topics | Show `Topics appear after Brain can read the content`. | Same copy in Details tab. |
| Metadata-only item | Topics card says readable text is needed; tags and collections still work. | Topics section disabled with explanation. |
| Preview-only item | Show partial-content warning before topic exploration. | Show partial-content warning in Topic detail. |
| Needs upgrade | Show `Add full text` near topics and Ask scope. | Show repair action before scoped Ask. |
| Offline | Read cached organization if available; disable edits. | Show `Reconnect to update organization`. |
| Duplicate tag | Offer existing tag instead of creating duplicate. | Same in bottom sheet. |
| Deleted collection | Remove pill and show undo/notice. | Return to previous screen with notice if currently inside deleted collection. |
| Renamed tag | Keep old link stable in prototype or show redirected label. | Back stack keeps current destination and updates title. |

## 12. Visual And Accessibility Requirements

Visual distinction:

- Tags: neutral chip style, editable-language helper copy.
- Included topics: semantic chip style, `Detected in this item` badge, no add control.
- Collections: folder icon and collection-card treatment.

Accessibility:

- Clickable pills must be real buttons or links.
- Web keyboard:
  - `Enter` opens destination.
  - `Esc` closes editors, popovers, and modals.
  - Focus trap for modals.
- Android:
  - Tap targets should be comfortably sized.
  - Bottom sheets need clear close controls.
  - No required action depends on long-press.
- Do not rely on color alone to show ownership or object type.

## 13. Execution Plan

### Phase 0 - Preflight and safety

1. Read the Magic Patterns review skill before any Magic Patterns work.
2. Confirm web and Android project status are idle.
3. Confirm active artifacts match the privacy-honesty drafts:
   - Web: `d7e38db8-0d7b-4b10-b8cd-e804eaea3937`
   - Android: `7713c1fc-d1d1-415c-893e-994b1a152450`
4. Read the target files before editing.
5. Create new draft artifacts from the active privacy-honesty drafts.
6. Record new artifact IDs and rollback candidates in `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md`.

### Phase 1 - Destination shells and item-detail cards

Web:

1. Update `DesktopItemDetail` right rail cards for Tags, Included topics, and Collections.
2. Add click/tap behavior for tag, topic, and collection pills.
3. Add destination shells:
   - Tagged Library context.
   - Topic exploration.
   - Collection detail.
4. Add empty states for no tags, no topics, and no collections.
5. Preserve Focus mode behavior and keep organization cards out of Focus mode.

Android:

1. Update `MobileItemDetail` Details tab sections.
2. Add tappable tag/topic/collection elements.
3. Add destination states for tagged Library, Topic detail, and Collection detail.
4. Implement the Android navigation matrix.
5. Preserve bottom navigation rules and Focus mode.

Phase 1 no-go gates:

- Topic pills cannot be clickable without Topic detail.
- Collection pills cannot be clickable without Collection detail.
- Tags, topics, and collections cannot be collapsed into one metadata card.
- Privacy-honesty corrections must remain visible.

### Phase 2 - Editors, pickers, and guardrails

Web:

1. Add `Add tag` editor.
2. Add duplicate tag handling.
3. Add `Add to collection` picker.
4. Add create-new collection state.
5. Add undo toasts for local removal.
6. Add disabled or confirmation-backed global actions where represented.

Android:

1. Add `Add tag` bottom sheet.
2. Add `Add to collection` bottom sheet.
3. Add duplicate detection and offline-disabled states.
4. Add local removal undo states.
5. Avoid global destructive actions unless confirmation is represented.

Phase 2 no-go gates:

- No enabled action can be dead.
- Local and global actions must be visually and verbally distinct.
- Duplicate create flows must show an existing-match state.
- Offline editing must be disabled with explanation.

### Phase 3 - Scoped Ask states

Web:

1. Add `Ask this tag`, `Ask this topic`, and `Ask collection` entry points.
2. Add scope card in Ask composer.
3. Add item counts, limited-source warnings, and citation/source-quality examples.
4. Add empty readable-content state.

Android:

1. Add scoped Ask entry points from tag, topic, and collection destinations.
2. Show scope card near composer.
3. Show source list or citation sheet with quality state.
4. Preserve Ask history behavior.

Phase 3 no-go gates:

- Scoped Ask cannot hide weak, metadata-only, or preview-only limitations.
- Citations must stay within the shown scope in the prototype.
- Empty scopes must not show confident answers.

### Phase 4 - Validation and review package update

1. Confirm Magic Patterns status is idle after edits.
2. Review desktop screenshots manually:
   - Item detail cards.
   - Tagged Library.
   - Topic exploration.
   - Collection detail.
   - Add tag editor.
   - Add to collection picker.
   - Scoped Ask.
3. Review Android screenshots manually:
   - Details tab.
   - Add tag sheet.
   - Add to collection sheet.
   - Topic detail.
   - Collection detail.
   - Scoped Ask.
4. Run a dead-control audit for all primary and secondary actions.
5. Check web keyboard traversal and focus rings.
6. Check Android tap targets, sheet close affordances, text overflow, and system-back behavior.
7. Confirm privacy-honesty wording remains corrected.
8. Confirm Focus mode remains unchanged.
9. Update `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md` with draft IDs, status, rollback IDs, QA notes, and publish status.

### Phase 5 - Publish only if requested

Do not publish automatically.

If the user asks to publish:

1. Confirm final active artifact IDs.
2. Confirm projects are idle.
3. Publish web artifact.
4. Publish Android artifact.
5. Check version history.
6. Update the review package with published versions.
7. Report editor links, artifact IDs, rollback candidates, and preview availability.

## 14. Revised Acceptance Criteria

### Web

- Tags, Included topics, and Collections are separate cards.
- Tag pills open tagged Library.
- `Add tag` opens an editor with duplicate handling.
- Topic pills open Topic exploration.
- Topic exploration clearly says it is detected/sample prototype behavior where needed.
- Collection pills open Collection detail.
- `Add to collection` opens a picker with existing and create-new states.
- Scoped Ask shows scope, included item count, limited-source warning, and citation/source-quality behavior.
- Privacy-honesty corrections remain visible.
- Focus mode is not changed by this work.

### Android

- Details tab includes distinct Tags, Included topics, and Collections sections.
- Tag taps open tagged Library with predictable back behavior.
- `Add tag` opens bottom sheet with duplicate and offline states.
- Topic taps open Topic detail.
- Collection taps open Collection detail.
- `Add to collection` opens bottom sheet.
- Android navigation follows the back-stack matrix.
- Scoped Ask includes scope and source-quality context.
- Privacy-honesty corrections remain visible.
- Focus mode is not changed by this work.

### Shared

- No visible enabled action is dead.
- User-generated versus Brain-suggested organization is understandable.
- Tags, topics, and collections have distinct meanings and visual treatments.
- Metadata-only, preview-only, needs-upgrade, empty, duplicate, and offline states are represented.
- Web and Android feature parity is documented even where layout differs.

## 15. Final No-Go Gates

Do not execute if:

- Magic Patterns active artifacts are not the expected privacy-honesty drafts and the user has not explicitly chosen another base.
- The update cannot preserve the privacy correction.
- The plan cannot create a new draft artifact before editing.

Do not publish if:

- Any enabled action lacks a visible result state.
- Ask scope hides source-quality or weak-capture limits.
- Tags, topics, and collections are visually distinct but behaviorally ambiguous.
- Android back behavior is broken from item detail, Library, Ask citation, or offline states.
- Focus mode regresses.
- Data & privacy honesty regresses.

## 16. Recommended Execution Order

1. Web Phase 1.
2. Android Phase 1.
3. Validate parity for destination shells.
4. Web Phase 2.
5. Android Phase 2.
6. Web and Android Phase 3 scoped Ask.
7. Full validation and review-package update.
8. Wait for explicit publish instruction.

This sequencing reduces the chance that Magic Patterns creates attractive but shallow screens with dead actions.

## 17. Execution Result

Executed on 2026-06-13 16:43 IST as draft artifacts only.

Web:

- Editor: `https://www.magicpatterns.com/c/fhbeo46qahq5fkjfseckxx`
- Draft artifact: `f3312489-9172-4c3f-bcf8-2352ece9d417`
- Version label: `v11`
- Rollback candidate: `d7e38db8-0d7b-4b10-b8cd-e804eaea3937`
- Files written: `data/sources.ts`, `App.tsx`, `pages/DesktopItemDetail.tsx`, `pages/DesktopLibrary.tsx`, `pages/DesktopTopic.tsx`, `pages/DesktopCollection.tsx`, `pages/DesktopAsk.tsx`

Android:

- Editor: `https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r`
- Draft artifact: `1a6c252a-0110-4aa2-95bc-91442590d996`
- Version label: `v9`
- Rollback candidate: `7713c1fc-d1d1-415c-893e-994b1a152450`
- Files written: `data/sources.ts`, `App.tsx`, `pages/MobileItemDetail.tsx`, `pages/MobileLibrary.tsx`, `pages/MobileTopic.tsx`, `pages/MobileCollection.tsx`, `pages/MobileAsk.tsx`

Validation notes:

- Magic Patterns status confirmed both draft artifacts are active and not generating after edits.
- Privacy-honesty wording remains in the branched drafts: no end-to-end encryption success claim, roadmap controls are disabled, and settings copy says privacy controls are coming soon.
- Focus mode was preserved as a separate reading state and organization cards remain outside Focus mode.
- Publish was intentionally skipped because no publish instruction was given for this execution step.
