# Note Focus Mode — Implementation Summary

Date: 2026-07-10
Status: Local release candidate

## Outcome

Note Focus Mode expands the existing My notes editor into a distraction-free, full-viewport writing surface without creating a second editor, route, data model, or save path. Ordinary Notes remains the default.

## Main implementation

- `src/app/items/[id]/page.tsx` now mounts one shared responsive `ManualNoteEditor`, canonicalizes note-focus URLs on the server, preserves source-reading Focus precedence, and gates Focus through `NOTE_FOCUS_MODE_ENABLED`.
- `src/components/item-companion-tabs.tsx` keeps Notes and Digest mounted in persistent ARIA tab panels and implements Arrow/Home/End keyboard behavior.
- `src/components/manual-note-editor.tsx` promotes the same section in place, supplies dialog semantics, sticky trust chrome, narrow reflow, IME-aware Escape, focus containment, session-expiry recovery, and truly non-durable navigation protection.
- `src/lib/notes/focus-history.ts` owns content-free URL/history-state operations.
- `src/lib/notes/focus-isolation.ts` transactionally applies and exactly restores `inert`, `aria-hidden`, scroll locking, and activity markers.
- `src/lib/notes/use-note-focus-session.ts` owns entry/exit/Back/Forward/direct-load state, focus restoration, and current caret/selection/scroll snapshots.
- `src/lib/notes/navigation-safety.ts` identifies the only unsafe navigation case: device-journal failure plus content ahead of the acknowledged server value.
- `src/components/command-palette.tsx` suppresses Cmd/Ctrl+K in Focus and respects unsafe-navigation confirmation.
- `scripts/deploy.sh` requires an explicit first-enable acknowledgement for the Focus flag.

## No-change boundaries

- No schema, note API, Markdown model, autosave timing, journal format, note indexing, AI provider, consent, search, Related, or graph changes.
- **Include in AI & connections by default** remains in Settings and continues to apply only to new/recreated notes after provider eligibility.
- No external analytics were added.

## Tests added

- Persistent Notes DOM and keyboard tab behavior.
- Focus flag parsing/default.
- URL/history state privacy, preservation, collision, invalid, disabled, and source-precedence behavior.
- Isolation exact restore and partial-failure rollback.
- Unsafe navigation classification.
- Same-textarea Focus session, current view snapshots, background isolation, and invalid-marker normalization.

## Measured result

- Desktop editor: 318px normal → 816px focused (2.57× wider).
- 320×800: zero document/dialog horizontal overflow; 44×44 toolbar targets; 320px focused editor; Exit/Copy/Save visible.
- Production-build Focus/Back/Forward: one textarea, identical content, zero note GET/PUT requests.
- Direct focused refresh: one expected note GET, one textarea, Saved state, content restored.
