# PRD-12 Android Unified Ask Composer Planning Package

Created: 2026-06-14 07:40 IST
Status: Planning-only, depends on PRD-09-FU
Feature classification: Missing
Primary paths: `src/app/ask/ask-client.tsx`, `src/components/ask-input.tsx`, `src/lib/ask/*`, `src/app/api/ask/route.ts`, shared mobile shell

## PRD v1

### User Goals

- Ask on Android without fighting the keyboard or bottom nav.
- Add context from saved items, pasted links, or notes.
- See attached context, scope, warnings, and citations clearly.
- Restore history from a bottom sheet.

### Scope

- Mobile Ask composer with label `Ask AI Memory`, plus/add context, text input, send icon, attached chips, empty-send nudges, and keyboard-safe layout.
- Add Context sheet with Attach saved item, Paste link, Write note.
- Attach saved item picker with search, quality badges, select/deselect, attach selected.
- History bottom sheet.
- Production behavior reuses PRD-09-FU effective scope.

### Web UX

- Web Ask can reuse chips/source picker primitives, but this PRD targets Android/mobile layout.

### Android UX

- Header with history button.
- Scope banner always visible.
- Attached chips above composer or in compact row.
- Composer remains tappable above keyboard and nav.
- Bottom nav hidden or pushed safely when keyboard preview/real keyboard is active.

### Interactions And States

- Open history sheet.
- Open Add Context sheet.
- Attach saved item.
- Paste link and attach after save.
- Write note and attach after save.
- Remove attached source.
- Empty-send nudge with no attachment.
- Empty-send nudge with attachment.
- Loading answer.
- Answer with citations.
- Provider-offline error.

### Edge Cases

- Empty send with no input.
- Empty send with attachments.
- Attached metadata-only source.
- No readable sources after high-quality filter.
- Provider offline.
- History thread with deleted attachment.

### Data Needs

- Depends on PRD-09-FU `AskEffectiveScope`, attached item IDs, high-quality-only flag, and durable scope metadata.
- No separate Android-native store is planned; Android consumes shared web state unless Arun approves native screens.

### Analytics / Events

Not applicable by default. If events are later approved, use local-only events for sheet opened, context attached, history restored, and empty-send nudges.

### Non-Goals

- No temporary fake capture success for pasted links.
- No native Android implementation outside the Capacitor/WebView surface.
- No scope/history schema work until PRD-09-FU decisions are closed.

### Acceptance Criteria

- Empty input shows `Type a question first`.
- Empty input with attachment shows `Ask a question about the attached context`.
- Attachments override route scope.
- Android history opens as a bottom sheet.
- Composer is not covered by nav or keyboard at compact/tall phone sizes.

### Open Questions

1. Are paste-link and write-note attachments saved permanently? Recommended yes via PRD-09-FU.
2. Should bottom nav hide while typing, or stay visible below a keyboard spacer?

## PRD v1 Adversarial Review

**Created:** 2026-06-14 07:40:58 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** PRD v1 section in this file
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/PRD-12-android-unified-ask-composer-package.md`

### Executive Verdict

Conditional no-go until PRD-09-FU resolves attachment persistence and scope semantics.

### Findings

P0:

1. Composer UI cannot be truthful without effective-scope model. Recommendation: block on PRD-09-FU contract.

P1:

1. Paste-link sheet can fake capture success if backend is not wired. Recommendation: call real capture API or label as unavailable.
2. Keyboard safety cannot be proven by DOM checks alone. Recommendation: require screenshots/canvas checks.

P2:

1. Attach saved item picker can load too many items. Recommendation: search and cap results.

### Go / No-Go Recommendation

Go only after PRD-09-FU is implemented or its interfaces are available.

## PRD v2

### Final Product Requirements

1. Composer consumes `AskEffectiveScope` from PRD-09-FU.
2. Add Context sheet includes:
   - Attach saved item
   - Paste link
   - Write note
3. Paste link and Write note create saved items before attaching unless Arun decides otherwise.
4. Attach picker caps results and shows quality/source metadata.
5. History bottom sheet restores conversation, scope, attachments, warnings, and citations.
6. Keyboard-safe behavior is a hard acceptance gate.
7. Bottom nav must not overlap composer; raised Capture is not shown on Ask.

## Implementation Plan v1

### Architecture

- Split mobile Ask composer into dedicated client components.
- Reuse shared attachment chips and source picker from PRD-09-FU.
- Add bottom-sheet primitives or reuse existing mobile sheet patterns.
- Keep desktop Ask layout stable.

### Affected Modules

- `src/app/ask/ask-client.tsx`
- `src/components/ask-input.tsx`
- new `src/components/mobile-ask-composer.tsx`
- new `src/components/mobile-ask-sheets.tsx`
- `src/components/sidebar.tsx`
- capture API clients for paste link/write note

### Tests

- Component/unit tests where practical for state machine.
- Browser mobile smoke at `390 x 844` and tall phone.
- Empty-send nudge checks.
- Attachment override smoke.

## Implementation Plan v1 Adversarial Review

### Executive Verdict

Conditional go. The plan needs a state machine and clear failure handling for sheet flows.

### Findings

P1:

1. Multiple sheets can create impossible states. Recommendation: centralize active sheet state.
2. Capture from Ask can fail and leave phantom attachments. Recommendation: attach only after saved item ID is confirmed.

P2:

1. Desktop/mobile code split may duplicate Ask logic. Recommendation: extract shared hooks for submit and scope.

### Go / No-Go Recommendation

Go after plan v2 defines state machine and failure states.

## Implementation Plan v2

### Revised Plan

1. Extract shared `useAskConversation` or equivalent state helper from `AskClient`.
2. Add mobile composer state:
   - `idle`
   - `focused`
   - `loading`
   - `addContext`
   - `attachPicker`
   - `pasteLink`
   - `writeNote`
   - `attachedSources`
   - `history`
3. Attach sources only after saved item IDs exist.
4. Keep sheet state single-valued and dismissible.
5. Use responsive branch in `AskClient` or a mobile component rendered inside it.
6. Add viewport QA with screenshots, including keyboard preview or simulated focused state.

### Required Tests And QA

- Empty send nudge without attachments.
- Empty send nudge with attachments.
- Attach saved item then send.
- Paste link failure does not attach phantom source.
- History restores attachment chips.
- Composer visible above nav/keyboard.

### Implementation Acceptance

- Android Ask feels intentionally mobile.
- Scope truth from PRD-09-FU is visible in every composer state.
- No raised Capture FAB appears on Ask.
