# UX/UI Design Package v2 — Manual Content Notes

**Date:** 2026-07-10
**Status:** Final implementation design
**Supersedes:** `UX_F08_MANUAL_CONTENT_NOTES_v1.md`
**Visual truth:** attested consolidated production snapshot `8178117`, the existing AI Memory tokens/components/assets, and the v1 prototype.
**Adversarial change:** production v1 uses a native Markdown Write surface plus safe Preview, not an unresolved visual-contenteditable dependency.

## 1. Direction

My notes is a calm private companion to the current item. The design preserves the production reading experience, puts personal authorship beside—not inside—the AI digest, and makes durability more legible than formatting. “Saved” always means the latest generation reached the server; “Saved locally” means only this device/editor copy is durable; “AI ready” is a separate state.

The v1 prototype remains the layout/visual reference. Its WYSIWYG-like canvas is revised for production into `Write | Preview`:

- Write is a native multiline textarea with selection-aware Markdown toolbar.
- Preview renders the same canonical Markdown with production article styles.
- This change protects native mobile IME/selection/undo and eliminates hidden conversion state while retaining one-click rich formatting and a polished rendered view.

## 2. Navigation and layout

### Desktop ≥1024 px

- Preserve production sidebar, header, item actions, original-content reading column, and sticky right companion.
- Right companion tabs: `AI digest | My notes`.
- My notes header: private/user-authored label, current save status, Save, overflow.
- Secondary row: `Write | Preview` and, when relevant, `AI ready / Updating / Needs attention`.
- Sticky formatting toolbar; independently scrolling textarea/preview; no page-level horizontal overflow.

### Tablet 768–1023 px

- Follow production sidebar collapse.
- Notes may be a right sheet ≤440 px if at least 48ch of source remains; otherwise use the mobile tab treatment.

### Mobile <768 px / Capacitor

- Preserve `Original / Digest / Ask / Related / Details`; append `Notes` as the sixth scroll-safe tab and retain selected-tab query behavior.
- Preserve production bottom navigation and item context.
- Single-column Notes view with sticky header/status/Save and toolbar above the software keyboard/safe area.
- Show heading, bold, italic, bullets, numbers as primary 44 px actions; task/quote/code/link/rule/undo/redo in a labeled overflow sheet before reducing target size.

## 3. Primary flow

1. Open item → My notes/Notes.
2. Reconcile server state and all dirty local editor-instance drafts before exposing an editable blank.
3. No note: show placeholder `Write what you want to remember…` and `Markdown shortcuts are supported.` No server/card/search/AI artifact exists.
4. On input, status becomes `Saved locally` only after ordered device-journal acknowledgement.
5. Autosave/manual Save → `Saving…` → `Saved just now` only if the latest server generation is acknowledged.
6. Preview never triggers save or changes canonical text.
7. Search/AI status updates independently.

## 4. Toolbar and writing interaction

- Controls: paragraph/heading menu (H2–H4), bold, italic, strikethrough, bullets, numbered/task list, quote, inline/fenced code, link, horizontal rule, undo, redo.
- Selection commands wrap/transform selected text; collapsed commands insert syntactically complete markers/placeholders and select the editable portion.
- List/quote/heading actions operate on each selected line. Toggle action removes matching syntax when unambiguous.
- Link dialog asks for text and URL, validates allowed protocol, and returns focus/selection.
- Native undo/redo and IME composition remain authoritative. Toolbar operations use `setRangeText`/selection restoration so they join predictable edit history.
- Preview external links are safe and clearly external; raw HTML is displayed as inert text/omitted, never executed.
- Byte counter/warning appears at 90 KiB; 100 KiB prevents server save but keeps device text editable/copyable/exportable.

## 5. State/copy matrix

| State | Visible copy | Behavior |
|---|---|---|
| Loading | Skeleton and `Loading your note…` for assistive tech | Editor disabled until reconciliation |
| Empty | `Write what you want to remember…` | No persistence until meaningful edit/manual Save |
| Local durable | `Saved locally` | Network save pending/offline |
| Dirty before local ack | `Saving on this device…` | Do not navigate-claim safety yet |
| Saving server | `Saving…` | Editing remains enabled; one request only |
| Saved server | `Saved just now` / timestamp | Latest generation accepted |
| AI updating | `Saved · Updating AI search…` | No block to editing/search |
| AI ready | `Saved · AI ready` | Provider/index current |
| Offline | `Offline — changes are saved on this device and will sync when you reconnect.` | Continue; Copy available |
| Device storage failure | `Device recovery is unavailable. Save online or copy your note before leaving.` | Alert; Save/Copy |
| Server failure | `Latest changes aren't synced. Your device copy is safe.` | Retry/Copy |
| Conflict | `Another saved version exists. Both copies are safe.` | Review |
| Remote AI permission | `Allow <provider> to use My notes for AI answers and connections?` | Exact search stays available; explicit Allow/Not now |
| AI failure | `Your note is saved and searchable. AI connections couldn't update.` | Retry later |
| Deleted owner | `This library item no longer exists. Your device draft is still available to copy.` | Copy / Library |
| Over limit | `This note is over the 100 KiB sync limit.` | Reduce/Copy/Export |

Status changes use text plus icon/color and an `aria-live=polite` region; errors/conflicts use one assertive alert, not repeated keystroke announcements.

## 6. Multiple local drafts and conflict UX

If more than one dirty editor-instance draft exists after crash/reopen:

- show `We found 2 unsynced drafts for this note` before normal editing;
- list device/browser session label and relative timestamp without exposing content until expanded;
- actions per draft: `Open`, `Copy`, `Discard` (confirm), with no “newest wins” shortcut;
- opening one never deletes another.

Server conflict Review uses dialog/desktop sheet/mobile bottom sheet:

- columns/cards `This draft` and `Saved version`, timestamps, byte counts;
- actions `Use saved version`, `Keep this draft`, `Copy both`;
- `Keep this draft` confirms and saves against the displayed current base;
- both remain locally recoverable until acknowledgement/explicit discard.

Delete/AI-opt-out received from another tab turns an old draft into copy-only Conflict. It cannot silently recreate or transmit content.

## 7. Privacy, AI, export, recovery

- Header says `Private · written by you`, never AI sparkle/generative styling.
- Overflow: `Include in AI & connections`, `Recent versions`, `Export My notes (.md)`, `Clear note`, `Delete My notes`.
- When a configured provider is remote and not acknowledged, first enablement names it and explains: canonical note/exact search stay in AI Brain; allowing sends relevant text for embeddings/answers/connections. `Not now` is equal-weight and leaves AI off.
- Per-note toggle copy distinguishes exact search from AI/connection use and shows removal pending/complete.
- Recent versions is a minimal list (manual, before clear, restored, periodic) with timestamp and Preview/Restore. Restore makes a new current version.
- Clear leaves an empty attached state and recoverable pre-clear checkpoint. Delete purges note/revisions/semantic artifacts and explains retained-backup policy; delayed dirty drafts become copy-only.
- Default item/library export/share excludes notes. Explicit note export is a separate authenticated action/checkbox with preview and `Written by you` provenance.

## 8. Search/Ask/Related UX

- Search result parent appears once. Source chips follow exact copy:
  - `Title`, `Original`, `AI digest`, `My notes`, `Saved item context` for legacy mixed semantic context.
- Note-only result says `Matched in My notes` and shows a sanitized text snippet; selecting focuses Notes and, where feasible, the matched text.
- Ask citation labels:
  - `Original source`, `AI digest`, `Your note`, or `Saved item context` (legacy; never Original).
- Your-note citation opens My notes in Preview near the cited passage. It does not highlight source content.
- Related may show `Connected through your notes` only when the diagnostic signal proves that source influenced ranking; no separate note card/node is rendered.

## 9. Accessibility

- Native labeled textarea, visible instructions outside placeholder, semantic Preview headings/lists/code/quotes.
- Tablist/tabs, toolbar, toggle buttons with `aria-pressed`, named icons/tooltips, labeled overflow/dialog/sheet.
- Keyboard: `Cmd/Ctrl+S`, B/I/K, list shortcuts, native undo/redo, Escape close. Do not override composition or standard selection shortcuts.
- Toolbar restores textarea selection/focus. Dialog focus is trapped/restored; destructive control is not default focus.
- 44×44 px mobile and ≥32 px desktop controls, 2 px production focus ring, 200% reflow, high-contrast/caret/selection, reduced motion.
- Preview/Write switch announces mode; save/index changes are not conflated. Conflict comparison is fully keyboard/screen-reader navigable.

## 10. Visual QA contract

The prototype's `final result: passed` means **prototype visual/interaction QA only**. Production release requires:

1. matching state and viewport captures at 1440×900 and 390×844;
2. production reference + implementation screenshot combined in one comparison input;
3. desktop companion, mobile six-tab/no-overflow, toolbar, Write, Preview, status, offline/error/conflict/provider/recovery/delete states;
4. recorded visible mismatches and iteration fixes;
5. final implementation result, console errors, keyboard/a11y checks, and browser cache inspection.

Prototype evidence remains at `../prototype/`, including desktop/mobile/comparison screenshots and design QA.

## 11. UX acceptance

- [ ] Production layout/tokens/assets/navigation are extended, not replaced.
- [ ] Write/Preview and every toolbar/shortcut preserve exact canonical Markdown and native mobile input.
- [ ] Save wording distinguishes local, server, and AI state.
- [ ] Two dirty local drafts and all conflict choices remain independently recoverable.
- [ ] Remote provider acknowledgement is provider-named and occurs before transmission.
- [ ] Search/citations use the exact provenance copy and never label mixed/AI text Original.
- [ ] Clear/Delete/AI opt-out/recovery/export copy matches actual retention and delayed-retry behavior.
- [ ] All listed empty/loading/success/offline/error/conflict/quota/oversize/deleted-owner states are implemented and accessible.
- [ ] Existing five mobile item tabs plus Notes and bottom navigation remain reachable with no horizontal page overflow.
- [ ] Implementation design QA—not prototype QA—passes before release.
