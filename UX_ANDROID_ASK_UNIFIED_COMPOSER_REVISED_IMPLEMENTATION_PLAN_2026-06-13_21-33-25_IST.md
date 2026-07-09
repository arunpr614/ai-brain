# Android Ask Unified Composer Revised Implementation Plan

Created: 2026-06-13 21:33 IST
Revision target: `UX_ANDROID_ASK_UNIFIED_COMPOSER_IMPLEMENTATION_PLAN_2026-06-13_17-56-02_IST.md`
Adversarial review addressed: `UX_ANDROID_ASK_UNIFIED_COMPOSER_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-13_18-01-14_IST.md`
Design decision: Option C - Unified Ask Composer
Target Magic Patterns project: `AI Brain Android - High Fidelity`
Editor: https://www.magicpatterns.com/c/d5w3fb6rzxdeht7urnye5r
Current inspected artifact: `16464dd2-f619-488b-b629-d7f7f8ef38bb`

## Executive Change From Original Plan

The original plan correctly chose Option C, but it attempted to implement too much at once and did not define the highest-risk mobile states tightly enough. This revised plan turns the work into an acceptance-gated prototype implementation with explicit scope rules, sheet state rules, keyboard/safe-area validation, route-aware navigation behavior, and publish no-go gates.

The revised implementation still aims to produce a rich Magic Patterns prototype, but it no longer treats compile success as enough to publish.

## Product Objective

Make the Android Ask screen composer-first:

- The Ask textbox and send action must be visually primary.
- The large center Capture FAB must not overlap or compete with Ask.
- Capture becomes contextual `Add context` inside the Ask composer.
- Users can test plus-button, send-button, attached-source, citation, history, and keyboard-placeholder states in detail.
- The global Capture FAB remains available on browsing screens where it does not compete with a composer.

## Non-Negotiable UX Rules

1. Ask screen must never show the raised center Capture FAB.
2. Capture screen must never show a redundant raised Capture FAB linking to itself.
3. Ask composer must remain visible in:
   - idle state
   - text-focused state
   - keyboard-placeholder state
   - answer state
   - attached-context state
4. Add-context sheets may cover the bottom nav while open, but must have clear close/back/cancel recovery.
5. Citations must match the visible active source scope.
6. Limited-source warnings must match the sources actually being used.
7. Prototype-only capture/link/note outcomes must be visibly described as simulated or prototype states.

## Implementation Strategy

Implement in two acceptance-gated stages inside one Magic Patterns draft artifact, then publish only after both gates pass.

### Stage 1: Structural Fix And Core Ask Loop

Goal:

- Remove the overlap permanently.
- Build the unified composer.
- Implement typed question, send, loading, answer, citation, empty-input nudge, and keyboard-placeholder states.

Files:

- `components/MobileBottomNav.tsx`
- `pages/MobileAsk.tsx`

Exit criteria:

- Ask has no raised Capture FAB.
- Capture has no raised Capture FAB.
- Library still has raised Capture FAB.
- Composer is visible and unobstructed in idle and keyboard-placeholder states.
- Send happy path works with deterministic mock answer and citations.

### Stage 2: Add Context, History, And Scope Integrity

Goal:

- Implement Add Context flows in a controlled single-sheet state machine.
- Restore conversation history with visible scope/source context.
- Verify scoped Ask and attached context precedence.

Files:

- `pages/MobileAsk.tsx`
- Optional: `data/conversations.ts` only if needed for existing sample conversation reuse.

Exit criteria:

- Plus opens Add Context sheet.
- Attach saved item, Paste link, and Write note flows are testable.
- Attached chips appear, can be removed, and affect visible active scope.
- Citations come from the active scope.
- History sheet restores conversation messages, scope, attached sources, and warnings.

## Route-Aware Capture Navigation Contract

Replace ad hoc route-specific behavior with a nav presentation helper.

### Nav Presentation Variants

Use a helper conceptually equivalent to:

```ts
type CaptureNavVariant = 'fab' | 'standard'
```

Rules:

- `fab`: raised center Capture FAB.
- `standard`: Capture is a normal bottom-nav tab, no raised FAB.

### Routes Using `standard`

Use normal Capture tab, no raised FAB:

- `/ask`
- `/capture`

Any future route with a bottom composer or docked primary action should also use `standard`.

### Routes Using `fab`

Keep raised center Capture FAB:

- `/library`
- `/item/:id`
- `/topic/:topicSlug`
- `/collection/:collectionSlug`
- `/needs-upgrade`
- `/more`

### Acceptance Criteria

- `/ask`: Capture appears as a normal tab; Ask tab active; no raised FAB.
- `/capture`: Capture appears as a normal active tab; no raised FAB.
- `/library`: raised Capture FAB remains.
- `/item/:id`: raised Capture FAB remains when bottom nav is visible.
- `/topic/:topicSlug`: raised Capture FAB remains.
- `/collection/:collectionSlug`: raised Capture FAB remains.
- `/needs-upgrade`: raised Capture FAB remains.
- `/more`: raised Capture FAB remains.

## Active Scope Model

The Ask screen must always show what source set will be used.

### Source Scope Types

1. Route scope
   - `All saved items`
   - `Tag: <name>`
   - `Topic: <name>`
   - `Collection: <name>`
   - `Selected items`

2. Attached context
   - One or more explicitly attached saved items, pasted links, or notes.

3. Effective scope
   - The actual source set used for the next answer.

### Precedence Rule

Attached context overrides route scope for the next message when attached context exists.

Visible copy:

- No attached context: `Scope: All saved items`
- Route scope only: `Scope: Topic: transformer architecture`
- Attached context present: `Using attached context`
- Attached context plus route scope: `Using attached context instead of Topic: transformer architecture`

Rationale:

- This avoids silent scope changes.
- It keeps the user's mental model clear.
- It lets attachments act as explicit source narrowing.

### Citation Rule

Answer citations must come from the effective scope:

- If attached context exists, citations come from attached sources first.
- If no attached context exists, citations come from route scope.
- If effective scope includes limited sources, the answer shows a warning before or inside citations.

## Ask Screen State Matrix

All states below must be reachable or visually represented in the prototype before publishing.

| State | Trigger | Required UI |
| --- | --- | --- |
| Idle | Open `/ask` | Header, scope chips, empty state, suggestions, composer, standard bottom nav |
| Input focused | Tap text field | Visible focus state, composer still above nav |
| Keyboard placeholder | Tap text field or test control | Simulated keyboard area, composer above keyboard, nav hidden or visually pushed below placeholder |
| Empty send nudge | Tap send with empty input | Inline nudge: `Type a question first` |
| Attached-empty send nudge | Tap send with attachments but no question | Inline nudge: `Ask a question about the attached context` |
| Loading answer | Tap send with question | User bubble, AI loading bubble, composer cleared |
| Answer with citations | Loading completes | Answer card, citations matching effective scope, warnings if limited |
| Add Context sheet | Tap plus | Single bottom sheet with Attach saved item, Paste link, Write note |
| Attach picker | Tap Attach saved item | Search, source rows, quality badges, selected state, attach action |
| Paste link empty | Tap Paste link | URL input, disabled save until text exists |
| Paste link saving | Save link | Simulated saving state |
| Paste link success | Saving completes | Simulated saved-source result, attach chip |
| Paste link limited | Choose limited prototype outcome | Metadata/preview warning, attach chip, Add text CTA |
| Paste link duplicate | Choose duplicate prototype outcome | Duplicate result with merge/keep-both prototype choices |
| Write note empty | Tap Write note | Note input, disabled save |
| Write note saved | Save note | Note chip attached |
| Attached sources | Attach one or more items | Chips above composer, remove affordance, `+N` if more than two |
| Attached sources sheet | Tap `+N` or chip group | Sheet listing all attached sources |
| History sheet | Tap history | Prior conversation list with scope/source metadata |
| Loaded history | Tap prior conversation | Restored messages, scope label, attachments, citations, warnings |

## Single-Sheet State Machine

Use one modal surface controlled by a single `activeSheet` state.

Allowed values:

- `null`
- `addContext`
- `attachPicker`
- `pasteLink`
- `writeNote`
- `attachedSources`
- `history`

### Sheet Navigation Rules

- Plus button opens `addContext`.
- `Attach saved item` moves from `addContext` to `attachPicker`.
- `Paste link` moves from `addContext` to `pasteLink`.
- `Write note` moves from `addContext` to `writeNote`.
- Tapping attached chip group opens `attachedSources`.
- Tapping history opens `history`.
- Close button always sets `activeSheet` to `null`.
- Sheet backdrop tap sets `activeSheet` to `null`.
- In nested states, a back action returns to `addContext`.
- Unsaved text in paste/note panels shows a simple confirmation row or keeps data until the sheet is closed.

No second stacked sheet should be used.

## Composer Anatomy

The user referred to the `Ask AI Brain` button. In this design, `Ask AI Brain` is not a button; it is the composer label.

Composer elements:

- Label: `Ask AI Brain`
- Left button: `Add context`
- Text field: question input
- Right button: `Send question`
- Optional attached-source chip row above the input
- Optional nudge row below or above the composer

### Accessibility Labels

Add explicit labels:

- `Open conversation history`
- `Add context`
- `Send question`
- `Remove attached source`
- `Close sheet`
- `Back to context options`
- `Attach selected sources`
- `Save and attach link`
- `Save and attach note`

Disabled send state:

- If input is empty, keep button visible but muted.
- Tapping muted send shows nudge rather than silently doing nothing.

## Add Context Flows

### Attach Saved Item

Sheet content:

- Back button to `addContext`.
- Title: `Attach saved item`
- Search field.
- Source list.
- Each row:
  - title
  - source type
  - captured via
  - quality badge
  - searchable/readable indicator
  - checkbox/selected state
- Footer action: `Attach selected`

After attach:

- Sheet closes.
- Chips appear above composer.
- Effective scope changes to attached context.
- If any attached source is limited, show amber warning chip.

Acceptance:

- Selecting and deselecting works.
- Attach button is disabled until at least one item is selected.
- Attached source can be removed from the chip row.
- Citations from the next answer come from attached items.

### Paste Link

Sheet content:

- Back button to `addContext`.
- Title: `Paste link`
- Prototype label: `Simulated capture result`
- URL input.
- Optional prototype outcome selector:
  - Full text
  - Metadata only
  - Duplicate
- `Save and attach` button.

States:

- Empty: save disabled.
- Saving: show `Saving and reading source...`.
- Full text result: attach new source with `Full text` badge.
- Metadata-only result: attach new source with warning and `Add text` CTA.
- Duplicate result: show duplicate banner with `Attach existing` and `Keep both`.

After save:

- New source appears as attached chip.
- Effective scope changes to attached context.
- Answer citations can include the simulated source.

### Write Note

Sheet content:

- Back button to `addContext`.
- Title: `Write note`
- Prototype label: `Simulated note save`
- Optional title input.
- Note body input.
- `Save and attach` button.

States:

- Empty: save disabled.
- Valid note: save enabled.
- Saved: note chip appears.

After save:

- New manual note appears as attached chip.
- Effective scope changes to attached context.

## Send Interaction

### Empty Input

Trigger:

- User taps send with no question.

Behavior:

- Do not create message.
- Show nudge: `Type a question first`.
- Keep composer visible.

### Empty Input With Attached Context

Trigger:

- User attached context but did not type a question.

Behavior:

- Do not create message.
- Show nudge: `Ask a question about the attached context`.
- Keep attached chips visible.

### Typed Question

Trigger:

- User types a question and taps send.

Behavior:

1. Add user message bubble.
2. Clear input.
3. Keep attached chips visible until answer appears.
4. Show AI loading bubble:
   - `Searching your Brain...` if route scope only.
   - `Reading attached context...` if attached context exists.
5. Replace loading bubble with deterministic mock answer.
6. Show citations from effective scope.
7. Show warning if citations include limited sources.
8. Show follow-up suggestions.
9. Add conversation to history with scope and attachment metadata.

### Follow-Up Suggestions

Each suggestion should either:

- Fill the input without sending, or
- Send as a follow-up if clearly styled as an action.

For this prototype, use fill-input behavior to avoid accidental message creation.

## Conversation History

History must not be a static list that loses context.

### History Item Payload

Each mocked history item should include:

- title
- timestamp text
- scope label
- attached source labels, if any
- message preview
- citation count
- limited-source warning flag

### Loading A Conversation

When user taps a history item:

- Sheet closes.
- Conversation messages appear.
- Scope banner updates.
- Attached context chips restore if the conversation used them.
- Citations and warnings restore.
- Composer remains usable for follow-up.

If full restoration is not implemented, the history sheet must be labeled `Static preview` and should not pretend to load a conversation.

## Keyboard And Safe-Area Design State

Magic Patterns may not simulate a real Android keyboard, so create an explicit keyboard-placeholder state in the prototype.

Implementation options:

- Add a temporary in-prototype toggle or state button inside the Ask screen only, styled as a normal prototype control if needed.
- Or focus the input and show a mock keyboard panel.

Required visual behavior:

- Composer sits above keyboard placeholder.
- Bottom nav is hidden behind or below keyboard placeholder.
- Plus button remains visible.
- Send button remains visible.
- Attached chips remain visible or collapse into a compact row.
- No text overlaps the keyboard placeholder.

No publish if this state cannot be demonstrated.

## Prototype Copy Guardrails

Use explicit prototype language for simulated backend outcomes:

- `Simulated capture result`
- `Prototype duplicate check`
- `Prototype note saved`

Do not imply that real URL parsing, duplicate detection, or note persistence has been implemented in production.

## File-Level Plan

### 1. Magic Patterns Preflight

- Check design status for editor `d5w3fb6rzxdeht7urnye5r`.
- Confirm `isGenerating` is false.
- Confirm active artifact ID.
- Read files before editing:
  - `components/MobileBottomNav.tsx`
  - `pages/MobileAsk.tsx`
  - `pages/MobileCapture.tsx` if needed
  - `data/sources.ts` if citation/source helpers need confirmation
  - `data/conversations.ts` if history sample data is reused

### 2. Create New Draft Artifact

Source artifact:

- Current active artifact at execution time, expected `16464dd2-f619-488b-b629-d7f7f8ef38bb`.

Draft name:

- `Android unified Ask composer revised draft`

Rollback candidate:

- Source active artifact used for branch.

### 3. Update `components/MobileBottomNav.tsx`

Required changes:

- Add route-aware capture nav variant helper.
- Standard variant for `/ask` and `/capture`.
- FAB variant for browsing/content routes.
- Active styling for Capture tab.
- Avoid using broad pathname matching that accidentally hides FAB on unrelated paths.

Acceptance:

- Standard Capture tab works on Ask and Capture.
- Raised Capture FAB remains on Library and content browsing routes.

### 4. Update `pages/MobileAsk.tsx`

Required state:

- `input`
- `messages`
- `isLoading`
- `attachedSources`
- `activeSheet`
- `selectedAttachIds`
- `pasteLinkValue`
- `pasteOutcome`
- `pasteStatus`
- `noteTitle`
- `noteBody`
- `nudge`
- `keyboardPreview`
- `loadedConversationId`

Required UI sections:

- Header with title, history button, scope chips.
- Effective-scope banner.
- Conversation/empty content area.
- Warning region for limited sources.
- Attached-source chip row.
- Unified composer.
- Single bottom sheet renderer.
- Keyboard-placeholder renderer.

Required interactions:

- Plus opens Add Context.
- Attach saved item selects and attaches sources.
- Paste link simulates save and attaches result.
- Write note simulates note save and attaches result.
- Send handles empty, loading, answer, citations.
- History opens and restores conversation state.
- Citation opens item detail.
- Follow-up suggestion fills input.

### 5. Optional `data/conversations.ts`

Use only if existing data can support realistic history restoration without broad rewrites.

If not used:

- Keep history mock data local to `MobileAsk.tsx`.

### 6. No Required App Routing Change

Keep existing route:

- `/ask`

Existing query params must continue working:

- `scope`
- `tag`
- `topic`
- `collection`
- `items`

## QA And Validation Checklist

### Visual State Checks

Must inspect these states before publish:

- Ask idle.
- Ask input focused.
- Ask keyboard-placeholder.
- Add Context sheet.
- Attach saved item picker.
- Paste link empty.
- Paste link saving.
- Paste link full-text success.
- Paste link metadata-only warning.
- Paste link duplicate state.
- Write note empty.
- Write note saved.
- Attached-source chips.
- Empty send nudge.
- Loading answer.
- Answer with citations.
- History sheet.
- Loaded history conversation.

### Route Checks

Must inspect:

- `/ask`
- `/capture`
- `/library`
- `/item/1`
- `/topic/<sample-topic>`
- `/collection/<sample-collection>`
- `/needs-upgrade`
- `/more`

### Scope/Citation Checks

Must confirm:

- Global Ask citations come from global sample scope.
- Tag scoped Ask citations come from tag-matching sources.
- Topic scoped Ask citations come from topic-matching sources.
- Collection scoped Ask citations come from collection sources.
- Selected-items Ask citations come from selected items.
- Attached context overrides route scope visibly.
- Warnings appear when effective scope includes limited sources.

### Interaction Checks

Must confirm:

- Send button visible and tappable.
- Plus button visible and tappable.
- Remove chip visible and tappable.
- Close sheet works.
- Back within sheet works.
- Empty send nudge works.
- Paste/note disabled states work.
- History does not trap the user.

## Publish No-Go Gates

Do not publish if any of these occur:

- Composer overlaps bottom nav.
- Composer overlaps keyboard-placeholder.
- Send button is clipped or blocked.
- Plus button is clipped or blocked.
- Attached chips obscure the input or send button.
- Any route loses intended Capture access.
- Ask or Capture shows the raised Capture FAB.
- Library/content routes lose the raised Capture FAB.
- Bottom sheet cannot be closed.
- Nested sheet state traps the user.
- Citations do not match visible effective scope.
- Limited-source warnings do not match cited/attached sources.
- Prototype simulated capture results look like real backend success.

## Publish Plan

Only after QA:

1. Re-check Magic Patterns status.
2. Publish the revised draft artifact.
3. Re-check Magic Patterns status after publish.
4. Record version history.
5. Update `HIGH_FIDELITY_MAGIC_PATTERNS_REVIEW_PACKAGE.md`.
6. Report:
   - Magic Patterns changed
   - Published
   - Editor URL
   - New artifact ID
   - Version label
   - Rollback candidate
   - Preview status
   - Local files updated

## Acceptance Summary

The revised plan is executable only if the implementation proves the bottom area is stable across idle, sheet-open, keyboard-placeholder, and answer states. The final design should make one thing obvious: on Ask, the user asks first, and capture is supporting context.
