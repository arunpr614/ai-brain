# PRD v1 — Manual Content Notes

**Feature:** F08 attached manual notes
**Date:** 2026-07-10
**Status:** v1 for QA and adversarial review
**Decision:** Conditional GO
**Source inputs:** supplied F08 PRD/reference screenshot, current repository, live production read-only audit, Product/AI/PM council, UX council, technical architecture.

## 1. Goal

Let a person review any saved library item, compare the original material and AI-generated digest, and capture their own durable private interpretation in the same item. The note must be separately authored and stored, pleasant to format on web and mobile, recoverable through interruption, immediately searchable, and safely usable as a provenance-aware signal for AI answers and connections.

## 2. User problem

AI Brain can save and summarize information, but it does not attach the user's evolving interpretation to that information. The current standalone Note capture creates another library item and requires a title; it cannot serve as “my thinking about this existing item.” Users therefore keep annotations elsewhere, cannot search in their own vocabulary, and cannot make Ask/related/graph behavior reflect conclusions they personally reached.

The trust problem is as important as the editor problem: background saving must not silently lose text, user opinion must not masquerade as source fact, private text must not leak through cached pages or sharing, and AI-provider failure must never block a save.

## 3. Target users

### Primary

- The owner of the current single-user AI Brain deployment reviewing saved articles, videos, transcripts, links, PDFs, and captures.
- A power user who revisits items on desktop and mobile and expects personal vocabulary to improve later retrieval.

### Secondary

- Future AI Brain users with the same read–reflect–retrieve workflow.
- Support/operator workflows that need bounded revision recovery and content-free diagnostics.

## 4. Product principles

1. **Distinct authorship:** Original, AI-generated, and My notes are visibly and technically separate.
2. **No-loss before convenience:** Local durability, versioning, and recovery precede decorative editor capability.
3. **Save is independent of AI:** Canonical text and exact search succeed without an embedding or LLM provider.
4. **Provenance everywhere:** Search, citations, related signals, export, and diagnostics identify their source.
5. **Private by default:** Notes are authenticated and excluded from share/export surfaces unless explicitly included.
6. **One item, one node:** The annotation enriches its parent; it does not create a duplicate card or graph node.

## 5. Scope

### P0 — required for v1

- One attached note per existing item, stored independently from `items.body`, AI summary, quotes, tags, and category.
- A responsive “My notes” surface on item detail for desktop, mobile web, and the Capacitor shell.
- Canonical GitHub-flavored Markdown with paragraphs, bold, italic, strikethrough, H2–H4 headings, ordered/unordered/task lists, quote, inline/fenced code, link, horizontal rule, undo/redo, and common keyboard shortcuts.
- Clear edit/preview behavior, formatting toolbar, paste handling, and safe Markdown rendering without raw HTML execution.
- Manual Save plus autosave after 750 ms idle and at most five seconds during continuous typing.
- Local write-ahead draft recovery for an already-loaded editor, one serialized network save, optimistic version checks, idempotent retry, and explicit merge choices on conflict.
- Visible/announced states: Loading, Not saved yet, Saved locally, Unsaved, Saving, Saved with time, Offline—saved on this device, Save failed/Retry, Conflict, AI search updating, and AI search unavailable.
- Synchronous exact note search returning the parent item once, labeled “Matched in My notes” with a safe snippet.
- Asynchronous semantic indexing with `manual_note` provenance, Ask citation labels/navigation, related-item influence, and a future graph-refresh hook.
- Per-note “Include in AI & connections” control. Off retains canonical note and exact search while removing/omitting note embeddings and remote AI use.
- Delete, clear/recovery checkpoint, bounded revisions, export/share rules, backup disclosure, content-free observability, accessibility, rollout flags, and cleanup evidence.
- HMAC-verified session authorization, same-origin mutation checks, request limits, safe URL protocols, `no-store` note APIs, and no note text in server-rendered cached item HTML.

### P1 — after measured use

- Rich revision-history browser beyond essential restore.
- Reuse the editor for standalone Note capture through a different persistence adapter.
- User-tunable relative weight for personal notes in related/graph ranking.
- Multiple named note documents per item, backlinks, templates, attachments/images, tables, math, and collaborative editing.

### Non-goals

- Replacing original content or AI-generated summary.
- Creating a hidden or visible second item/card for the attached note.
- Full Notion-style blocks, arbitrary HTML/CSS, iframe/embed execution, Mermaid execution, or file upload.
- Full offline navigation/sync of the whole library.
- Real-time multi-user collaboration or CRDT infrastructure.
- Claiming end-to-end or application-level encryption in v1.
- Triggering source summarization, tagging, quote extraction, or the general enrichment pipeline on each note save.

## 6. User journeys

### Journey A — Read, reflect, save

1. User opens an existing item.
2. Desktop shows Original content in the primary pane and a sticky secondary pane where “My notes” sits beside the AI digest; mobile exposes “My notes” without removing existing item tabs.
3. User opens an empty note; no database row or library card is created yet.
4. User types and formats a takeaway. Each change becomes locally durable, then autosaves in the background.
5. Save status changes from Saved locally/Unsaved to Saving to Saved. Manual Save flushes immediately and is keyboard-accessible.
6. Exact search is current immediately. Semantic status converges separately.

### Journey B — Mobile interruption and recovery

1. User writes while connectivity is weak.
2. The editor confirms “Offline — saved on this device”; it never claims a server save.
3. The app/tab closes or reloads.
4. On reopening the loaded/cached editor, the local draft is offered/restored and replayed against its original server version when online.
5. If another device changed the note, replay stops at Conflict and presents keep-server, keep-local-with-confirmation, or copy/merge choices.

### Journey C — Search in personal language

1. User searches a phrase that exists only in My notes.
2. The parent item appears once with “Matched in My notes” and a safe snippet.
3. Opening the result focuses/navigates to My notes.
4. A hybrid match in original and note shows combined source badges without duplicate items.

### Journey D — Ask and connect

1. User asks a question whose answer uses their note.
2. Retrieval carries `manual_note` provenance.
3. The prompt distinguishes source content from personal interpretation; the citation says “Your note on …”.
4. The citation returns to My notes, not a fabricated source quote.
5. Related items may change through a bounded note signal; the parent item remains the only node.

### Journey E — privacy control, clear, delete, export

1. User turns off “Include in AI & connections.” Exact search remains; note vectors/chunks are removed asynchronously and no note text is sent to AI providers thereafter.
2. Clearing all text saves an empty current state and a pre-clear checkpoint, removing search/index artifacts.
3. Delete My note requires confirmation and purges canonical note, revisions, jobs, FTS, chunks/vectors, and local draft; the item and AI digest remain.
4. Default sharing/export excludes My notes. An explicit include-notes export includes Markdown with clear authorship and a privacy warning.
5. Copy explains that retained backups age out under backup policy rather than falsely promising immediate physical erasure from every snapshot.

## 7. Web and mobile behavior

### Desktop

- Preserve the current production two-column item layout and styling.
- The original content remains the reading anchor.
- The sticky secondary pane exposes AI digest and My notes as clear peers with authorship labels, not a merged document.
- Save state and manual Save stay visible while editing; toolbar may wrap but must not push the status off-screen.
- Preview/read mode uses existing typography, spacing, green accent, surfaces, and focus treatment.

### Mobile / Capacitor

- Preserve all existing production tabs (Original, Digest, Ask, Related, Details). Add My notes as an additional reachable tab in the same horizontally scrollable/overflow-safe navigation; do not replace or hide features.
- Sticky top action/status and toolbar must respect safe areas, virtual keyboard, selection handles, and a 44×44 CSS-pixel minimum target.
- Save status must remain perceivable in text or an accessible live region; an icon alone is insufficient.
- Navigation with an unsent network save relies on the local draft guarantee and may attempt a keepalive flush.

## 8. Data needs and lifecycle

- `item_notes`: one-to-one canonical Markdown/plain-text projection, content hash, version, AI inclusion flag, indexed version, timestamps, save kind.
- Bounded `item_note_revisions`: checkpointed recovery, at most 25 and at most 30 days.
- `item_note_mutations`: content-free idempotency receipts, bounded to seven days/newest 100.
- `item_notes_fts`: immediate exact search over derived plain text.
- `note_index_jobs`: one coalescing target version per note; no job per keystroke.
- Source-aware chunks with `source_kind='item'|'manual_note'` and source version; preserve rowid/vector mapping.
- Client IndexedDB draft keyed by item, containing content, base version, mutation ID, hash, dirty state, and timestamp.
- Cascading parent-item deletion removes note and derived artifacts, including vec0 rows through an explicit helper.

Notes are private application data stored in the browser profile, cleartext local/server SQLite and local snapshots, encrypted off-site backups, and—when AI inclusion is on—may be sent to the configured embedding/Ask provider. UI and docs must state these boundaries.

## 9. Edge cases and failure states

| Case | Expected behavior |
|---|---|
| Open then close blank note | No server row, search hit, card, chunk, graph node, or event containing content. |
| Markdown markers only | Autosave does not create a row; explicit manual Save may persist an empty attached row. |
| Rapid continuous typing | Local draft each change; one network request in flight; latest content coalesced; max five-second server interval. |
| Refresh/back/pagehide during save | Local draft survives; keepalive may run; UI never assumes the network attempt succeeded. |
| Double click/retry/late response | Same mutation replays once; no duplicate revision/version; stale response cannot overwrite current UI. |
| Two tabs/devices edit | Compare-and-swap returns 409; no silent last-write-wins; explicit resolution. |
| Network/provider unavailable | Canonical save and FTS still work; semantic status is separate and retryable. |
| IndexedDB unavailable/quota full | Warning before relying on autosave; manual server save remains available when online. |
| Forged/expired cookie | 401; no note content returned or modified. |
| Cross-site mutation | 403; missing browser mutation Origin rejected. |
| Oversized input | 413 before expensive parsing; draft remains local and user can reduce it. |
| Unsafe raw HTML/link/paste | Raw HTML not executed; unsupported protocols removed/rejected; paste becomes supported Markdown/text. |
| Item deleted during edit | Save returns 404; local draft is retained for copy/export until user discards it. |
| AI inclusion toggled off | FTS stays current; semantic artifacts are removed; provider is not called for note content. |
| Note cleared/deleted | Search/AI/related artifacts converge to absence; cleanup counts prove all derived rows removed. |
| Backup retention | Deletion UI accurately discloses delayed disappearance from retained snapshots. |

## 10. Acceptance criteria

### Storage and authorship

- [ ] Every existing item can have at most one attached manual note.
- [ ] Saving it does not alter original body/title, AI summary/quotes/tags/category, or create another `items` row.
- [ ] UI, API, search, Ask, export, and graph-adjacent data preserve source provenance.

### Editing and no-loss save

- [ ] All P0 Markdown constructs work by toolbar and keyboard where applicable and round-trip without semantic loss.
- [ ] Raw HTML/scripts never execute; links use an allowlist and safe external attributes.
- [ ] Each edit is locally durable within 250 ms target; autosave idles at 750 ms with five-second max wait; only one save is in flight.
- [ ] Manual Save immediately flushes the latest local content and reports a truthful state.
- [ ] Retry, refresh, back, tab close, offline, and rapid typing tests produce zero silent loss or duplicate versions.
- [ ] Stale simultaneous edits produce a 409 and user-visible resolution, never silent overwrite.

### Search, AI, and connections

- [ ] A note-only exact term returns its parent immediately after accepted save, once, with a note label/snippet.
- [ ] Note chunks are indexed asynchronously at the latest accepted version; stale jobs cannot replace newer data.
- [ ] Ask receives/cites note chunks as personal notes; `include in AI` off prevents semantic/remote use while preserving FTS.
- [ ] Related weighting is bounded and tested; no second node/card is created; future graph refresh failure never fails a save.

### Privacy, security, and deletion

- [ ] All note reads/writes verify HMAC session; mutations verify same origin; content responses are `no-store`.
- [ ] No note body is present in cached item HTML/RSC, URL, structured logs, analytics, or error text.
- [ ] Default share/export excludes notes; explicit inclusion is labeled and tested.
- [ ] Clear/delete/item-delete remove the correct FTS, jobs, chunks, bridge, vectors, and local draft with a manifest; retention exceptions are disclosed.

### UX, accessibility, and performance

- [ ] Existing desktop/mobile item functions remain available; mobile gains My notes without losing Original/Digest/Ask/Related/Details.
- [ ] All states are visible and announced; toolbar/editor/save/conflict/delete are keyboard and screen-reader usable; focus is restored correctly.
- [ ] Android/Capacitor IME, paste, selection, keyboard, safe areas, and interruption tests pass.
- [ ] Save API p95 is <250 ms locally and <750 ms through the tunnel; semantic convergence is <30 s with a healthy provider; editor bundle/interaction meets the approved budget.

### Release

- [ ] Migrations begin at 021 and pass fresh DB plus a copy of the latest production snapshot with integrity, foreign-key, mapped-vector, and retrieval-parity checks.
- [ ] Deployed Recall source/migrations/scheduler files are preserved and the `rsync --delete` dry-run has no unexplained removals.
- [ ] Existing orphan-looking vector rows are classified and repaired/reserved before note indexing.
- [ ] Backup, feature flags, synthetic smoke, cleanup, health, rollback, and post-deploy evidence pass before real-note enablement.

## 11. Analytics and observability

Content-free local/operational events:

- `note.editor.opened`, `note.first_meaningful_edit`, `note.manual_save`, `note.auto_save`;
- `note.save.accepted|replayed|conflict|failed`;
- `note.local_draft.recovered|replay_started|replay_conflict`;
- `note.index.queued|started|stale_target|done|failed`;
- `note.search.hit`, `note.ask.cited`, `note.related.influenced`;
- `note.ai_inclusion.changed`, `note.clear`, `note.delete.done`, `note.revision.restored|pruned`.

Allowed dimensions include item ID, versions, bytes, latency, save kind, attempts, provider name, result source, and artifact counts. Never emit Markdown/plain text, snippets, hashes usable as content fingerprints outside necessary internal mutation validation, or link destinations.

Initial outcomes: zero silent-loss/conflict-overwrite incidents; ≥95% accepted save success excluding offline; ≥99% note FTS availability immediately; ≥95% semantic convergence within 30 s when healthy; adoption/retention measured only after trust gates pass.

## 12. Risks and open questions for adversarial review

1. Is Lexical justified for this bounded release, or does a controlled Markdown textarea + toolbar/preview produce a safer first version on Capacitor?
2. Should AI inclusion default on as explicitly requested, or require per-note opt-in because configured providers may be remote?
3. Is 200 KB a responsible cap for mobile/browser/editor behavior, or should v1 use the existing 100 KB capture precedent?
4. Should the revision browser ship in v1, or should checkpoints initially be support/recovery-only with a simple restore surface?
5. Is default export exclusion plus an explicit include option sufficient for all current export/share paths?
6. What measured weighting prevents a long personal note from dominating related/graph results?
7. Which commit exactly produced the live artifact, and must any work beyond `4d97c45` also be integrated before release?
8. Are the 44 production vector rows provably orphaned, and what audited repair preserves any valid mapping?

## 13. Go/no-go

**GO** to v1 review and implementation behind disabled flags after the deployed-source and migration baselines are reconciled.
**NO-GO** to production enablement while any session-verification, data-loss, cache/privacy, orphan-vector, migration-parity, Recall-preservation, mobile-regression, unsafe-rendering, or cleanup gate remains open.
