# F08 Manual Content Notes — UX/UI Design V1

Date: 2026-07-10
Status: council v1
Visual reference: `reference_08_add_content_note_editor.png`
Production UI baseline: commit `4d97c45` (`src/app/items/[id]/page.tsx`, `src/components/sidebar.tsx`, `src/styles/tokens.css`)

## Direction

Add one private manual-note document to every library item. The note is a separate, user-authored knowledge layer: it is never labeled as AI-generated, never merged into the captured source, and remains independently searchable, embeddable, exportable, and revisioned. V1 supports one note document per item; the data model should allow multiple documents later without changing the editor contract.

The key layout principle is “read beside write.” Desktop preserves the production two-column item detail: original content remains in the reading column while a 390–440px companion editor opens on the right. Mobile extends the production `Original / Digest / Ask / Related / Details` tab strip with a sixth `Notes` tab and preserves the production bottom navigation.

## User flow

1. User opens any authenticated library item.
2. Desktop: select `My notes` in the right companion panel. Mobile: select `Notes` in the item-detail tab strip.
3. If no meaningful content exists, show an empty editor without creating a normal library card or search result.
4. First meaningful edit creates a versioned draft. The local draft is written immediately; server autosave begins after 700–1000ms of inactivity.
5. User formats in visual mode or switches to Markdown source. Both modes operate on the same document.
6. Autosave communicates `Saving…`, then `Saved just now`. `Save` is always available as an explicit confidence action; `Cmd/Ctrl+S` invokes it.
7. On offline or server failure, the user keeps editing. Local preservation is explicit, retryable, and never represented as server-synced.
8. On a version conflict, syncing pauses and the user chooses between clearly timestamped versions; the unchosen version remains in revision history.
9. Leaving a truly blank note discards the ephemeral draft. A meaningful note remains attached to the item and participates in search/AI mapping under a `manual_note` provenance type.

## Information architecture

```text
Authenticated item detail
├── Original source (immutable captured layer)
├── AI digest (generated layer, visibly labeled)
├── Ask / Related / Details (existing production capabilities)
└── Manual notes (private user-authored layer)
    ├── Visual editor
    ├── Markdown source
    ├── Save/sync status
    ├── Revision/conflict recovery
    └── Export as Markdown
```

Do not create a second top-level library item for an attached note. Search results may surface a matching manual-note excerpt but must link back to the owning item and display a `Manual note` provenance label.

## Key screens and states

### Desktop open state

- Production `AI Memory` shell and authenticated item detail remain visible.
- Original content uses the existing Charter reading column (`68ch`).
- Right companion surface contains `AI digest / My notes`; opening notes keeps the source in view.
- Editor header shows `Private manual note`, document label, save state, and manual Save.
- Toolbar and editor stay vertically stable; only the document canvas scrolls.

### Mobile open state

- Production mobile tab strip becomes `Original / Digest / Ask / Related / Details / Notes`.
- Notes fill the item-content region while the existing bottom navigation remains present.
- Common formatting actions fit in one row: heading, bold, italic, bullets, numbered list. Quote, link, undo, and redo move to an overflow action on production implementation if the row cannot retain 44px targets.
- Save stays visible in the editor header above the software keyboard.

### Empty

- Placeholder: `Write what you want to remember…`.
- Secondary hint: `Markdown shortcuts supported`.
- No persistent item, search row, embedding, or revision is created until meaningful content or explicit Save.

### Saving / saved

- `Saving…` with non-blocking progress icon; typing remains enabled.
- `Saved just now` with success icon after the server acknowledges the current version.
- Manual Save confirms with one short status toast; it does not duplicate the note or revision.

### Offline / failed

- Offline: `You’re offline — changes are stored on this device and will sync when you reconnect.`
- Server failure: `Your latest changes aren’t synced. Nothing was lost.` plus `Retry`.
- Never show `Saved` for local-only persistence.

### Conflict

- Inline banner explains that another device changed the note.
- `Review` opens a modal/bottom sheet with `This device` and `Cloud version`, timestamps, and explicit actions.
- No automatic last-write-wins. The unchosen version remains recoverable for the revision-retention period.

### Loading / permission / deleted owner

- Loading uses a toolbar and three-line skeleton; do not show editable blank content before the note query resolves.
- An expired session follows existing `verifySessionCookie` behavior and returns through `/unlock?next=…` to the same item and Notes state.
- If the owning item was deleted elsewhere, preserve the local draft and offer `Copy note` / `Return to Library`; do not silently orphan it.

## Interaction specification

### Visual editor and Markdown

- Visual mode is default. Supported blocks: paragraph, H2/H3, unordered/ordered list, blockquote, link, inline bold/italic/code, and fenced code block.
- Toolbar formatting applies to selection; with a collapsed cursor, bold/italic/code set the typing mark and block commands transform the current block.
- Markdown shortcuts activate after Space at the start of a block (`##`, `###`, `-`, `1.`, `>`, triple backticks). Backspace immediately after conversion restores the literal characters.
- Markdown source mode exposes canonical Markdown, not HTML. Switching modes is lossless for supported syntax and preserves selection where feasible.
- Paste defaults to semantic text/blocks. Sanitization removes executable markup and remote event handlers. Pasting Markdown offers `Keep formatting` only when detection confidence is high.
- Undo/redo history is shared across toolbar and keyboard actions within the session.

### Autosave contract

- Write local draft immediately on every edit.
- Debounce server autosave 700–1000ms after the last edit; flush on blur, tab switch, app background, and explicit Save.
- Send `note_id`, `base_version`, client mutation ID, and normalized document. Retry with the same mutation ID for idempotency.
- Save acknowledgement must match the latest client version before showing `Saved`.
- A stale response cannot overwrite newer local content.
- Save is disabled only while the same version is in flight; editing never blocks.

## Accessibility and keyboard

- Use semantic headings, `role=toolbar`, labeled icon buttons, tooltips, `aria-pressed` for active marks, and `aria-live=polite` for save status.
- Save errors and conflicts use `role=alert`; focus moves to the conflict dialog heading, remains trapped, and returns to `Review` on close.
- All desktop controls are keyboard reachable. Do not steal normal browser/editor selection shortcuts.
- Shortcuts: `Cmd/Ctrl+S` save, `Cmd/Ctrl+B` bold, `Cmd/Ctrl+I` italic, `Cmd/Ctrl+K` link when editor focused, `Cmd/Ctrl+Shift+7` ordered list, `Cmd/Ctrl+Shift+8` bullets, `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` redo, `Esc` close menu/dialog.
- Minimum mobile target 44×44px; desktop icon targets minimum 32×32px with 2px focus ring using `--action-primary-focus`.
- Text reflows at 200% zoom; no page-level horizontal scrolling. Respect reduced motion and preserve native caret/selection contrast.

## Responsive behavior

- `>= 1024px`: production sidebar + reading column + 390–440px notes companion.
- `768–1023px`: collapse the sidebar where supported; notes companion may use a right sheet up to 440px while preserving at least 48ch of the source.
- `< 768px`: use the six item-detail tabs. Notes become a single-column editor; production bottom nav remains. Toolbar collapses secondary tools into overflow before shrinking touch targets.
- Software keyboard must not cover Save or conflict actions. Use visual viewport/safe-area insets and keep the editor canvas independently scrollable.

## Trust, privacy, and provenance

- Manual notes are `Private` by default and inherit the owner/session boundary of the item.
- AI may use the note for search and mapping only under an explicit `manual_note` source label. Citations must distinguish `Original`, `AI digest`, and `Manual note`.
- Share/export excludes manual notes by default. Adding them requires an explicit checkbox and preview.
- Avoid “AI-generated” styling or sparkle icons inside manual notes.
- Deleting/discarding must address draft, document, revisions, chunks, embeddings, and graph edges per the PRD artifact manifest.

## Mapping to production components and tokens

| Proposed surface | Existing source to extend | Required tokens / contract |
|---|---|---|
| Authenticated item state | `src/app/items/[id]/page.tsx` at `4d97c45`; preserve `verifySessionCookie` and `next` query | Existing private-shell/session behavior |
| Desktop reading context | Existing `lg:grid-cols-[minmax(0,68ch)_360px]` and `.article` | `--font-article`, `--text-primary`, `--border` |
| Mobile IA | `MobileItemDetailTabs`, `ITEM_TABS`, `itemTabHref` | `--control-selected-bg/fg/border`; retain query preservation |
| Shell/nav | `src/components/sidebar.tsx` and route-aware mobile nav | `--surface`, `--action-primary-*`, `--control-selected-*` |
| Notes companion | Compose existing bordered surface patterns; use Radix `Dialog`/future `Sheet` primitive rather than one-off modal | `--surface-raised`, `--border`, `--radius-lg`, `--shadow-lg` |
| Toolbar | Lucide 2px icons already used by production | `--text-secondary`, `--surface`, `--duration-fast`, labeled tooltips |
| Save action | Existing filled-action contract | `--action-primary-bg`, `--action-primary-bg-hover`, `--action-primary-fg`, `--action-primary-focus` |
| Save semantics | Existing semantic colors | `--success`, `--warning`, `--danger`; color is never the only signal |
| Tags/search provenance | Existing `TagEditor`, search result and citation patterns | New `Manual note` label; do not reuse AI sparkle styling |

## Prototype scope

The self-contained prototype demonstrates desktop and 390×844 mobile layouts, visual/Markdown mode switching, formatting toolbar, manual Save, local autosave, offline and failure banners, conflict comparison, existing item tabs, and the production bottom navigation. It does not implement backend persistence, authentication, full Markdown parsing, search indexing, or multi-device transport.

Prototype: `../prototype/`
Desktop capture: `../prototype/desktop-editor.png`
Mobile capture: `../prototype/mobile-editor.png`
