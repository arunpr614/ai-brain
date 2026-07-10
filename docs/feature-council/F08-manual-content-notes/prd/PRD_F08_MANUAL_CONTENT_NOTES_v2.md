# PRD v2 — Manual Content Notes

**Feature:** F08 attached manual notes
**Date:** 2026-07-10
**Status:** Final product requirements for implementation
**Decision:** GO for implementation behind disabled flags after source-baseline integration; production remains gated
**Supersedes:** `PRD_F08_MANUAL_CONTENT_NOTES_v1.md`
**Review inputs:** three-lens council, QA review, adversarial review, prototype/design QA, live read-only production/source attestation.

## 1. Goal

Every AI Brain library item gives its owner a durable **My notes** layer for personal interpretation. The note is separately stored from captured/original and AI-generated content, supports basic rich Markdown authoring on web and mobile, survives interruption and simultaneous tabs without silent loss, is immediately searchable after server save, and can improve Ask and connections with honest provenance and privacy controls.

## 2. User problem

Saving and summarizing content is not the same as learning from it. The current standalone Note capture makes another titled library item; it cannot hold “what I think about this item.” Without an attached layer, personal conclusions live elsewhere, cannot be found in the user's vocabulary, and cannot improve later questions or connections.

The release must solve the trust problem, not just place a text box:

- user writing cannot silently disappear through autosave, refresh, crash, offline use, retries, or two tabs;
- original content, AI digest, and personal interpretation cannot be misattributed;
- a canonical save cannot depend on an AI provider;
- “private” cannot conceal browser/server/backup/remote-provider boundaries;
- deletion and AI opt-out cannot be undone by a delayed offline mutation.

## 3. Target users

- Primary: the authenticated owner reviewing saved articles, videos, transcripts, links, PDFs, notes, and captures on desktop/mobile/Capacitor.
- Secondary: future single-owner AI Brain deployments with the same read–reflect–retrieve workflow and operators supporting bounded recovery.

## 4. Final product decisions

1. **Object:** one attached note per item in v1; no second `items` row, card, title, graph node, or enrichment job.
2. **Source of truth:** a defined safe Markdown/GFM subset, UTF-8, maximum 100 KiB after normalization. HTML/editor JSON is never canonical; excluded GFM features are not advertised as supported.
3. **Editor:** a controlled native textarea with selection-aware formatting toolbar and safe rendered Preview. This deliberately replaces v1's unresolved visual-contenteditable dependency. It preserves native IME, selection, accessibility, and exact Markdown without a lossy serializer. A WYSIWYG editor remains a measured follow-up.
4. **Save:** local durable journal first; serialized server autosave after 750 ms idle/5 s maximum; manual Save and `Cmd/Ctrl+S`; optimistic versions, idempotency, truthful status, explicit conflict resolution.
5. **Multi-tab recovery:** dirty local drafts are keyed by item **and editor instance**, not by item alone. Both drafts survive a crash until separately acknowledged/discarded/merged.
6. **Search:** exact FTS is current immediately after the latest server-accepted save. Local-only/offline text is not claimed to be library-searchable.
7. **Provenance:** semantic sources are `legacy_item_context`, `original_content`, `ai_summary`, or `manual_note`. Legacy mixed chunks are never labeled Original.
8. **Connections:** v1 ships note-aware Related with evaluated bounded influence. It emits a future graph-refresh contract but does not claim a persisted graph that the product does not yet have.
9. **AI/provider control:** exact search never needs remote permission. When any configured note-consuming provider is remote, note AI use is off until a one-time provider-named acknowledgement. Local-only providers may default on. The per-note toggle remains available.
10. **Private/export:** authenticated and excluded from share/export by default; not end-to-end encrypted. Explicit note export includes provenance and a warning.
11. **Recovery/retention:** a minimal recent-recovery sheet ships in v1; at most 25 checkpoints and 30 days. Backups age out under their own policy.
12. **Production baseline:** merge attested consolidated source snapshot `8178117` before implementation. Migrations start at 021. No index worker until the live vec0 anomaly is audited/repaired/reserved.

## 5. Scope

### Required v1 capability

- One separately stored My notes document for every existing item type.
- Desktop companion pane and sixth mobile `Notes` tab, preserving all current AI Memory item actions and navigation.
- Write/Preview modes, Markdown toolbar, shortcuts, safe paste/render, undo/redo through native editing history.
- Paragraphs, H2–H4, bold, italic, strikethrough, ordered/unordered/task lists, quote, inline/fenced code, links, horizontal rule.
- Per-editor local journal, server CAS/idempotency, autosave/manual save, offline replay, conflict merge/copy, cross-tab notifications, delete/opt-out tombstones.
- Visible and announced Loading, Empty, Saved locally, Unsaved, Saving, Saved, Offline, Save failed/Retry, Conflict, AI updating/ready/failed, quota/oversize, deleted owner, and session-expired states.
- Immediate note FTS and de-duplicated, provenance-labeled search result/snippet.
- Source-aware semantic chunks, Ask provenance/citations, evaluated Related weighting, and a non-blocking future graph event.
- Provider-named permission, per-note AI inclusion toggle, all note-bearing responses private/no-store.
- Clear, delete, recent recovery, explicit export, item-delete cascade, vector cleanup, content-free diagnostics, feature flags, backup/retention copy.
- WCAG-oriented keyboard/screen-reader/focus/touch/zoom/contrast/reduced-motion behavior and Capacitor/IME/background recovery.

### Deferred

- WYSIWYG/contenteditable editing, multiple named note documents, collaboration/CRDT, attachments/images, tables, math, embeds/HTML/CSS, templates, backlinks.
- Full offline library navigation or local search over unsynced drafts.
- A persisted graph UI/edge store. This release provides Related integration and a future contract only.
- User-tunable relevance weights and a full diff/history browser.
- Upgrading standalone Note capture to this editor adapter.

## 6. Journeys

### Read and write

1. Open an authenticated item and choose My notes/Notes.
2. A blank shell does not persist anything.
3. Type or apply toolbar formatting; the exact Markdown becomes durable in the current editor-instance journal before network save.
4. Preview renders supported formatting safely. Save state moves `Saved locally → Saving → Saved` only for the latest acknowledged generation.
5. Server acceptance updates FTS immediately; AI search converges independently.

### Crash/offline/two tabs

1. Tab A and Tab B edit the same item. Each has a unique durable dirty journal.
2. A crash/restart offers both recoverable drafts if neither was acknowledged/discarded.
3. Reconnect replays each against its original base. One may succeed; the other receives 409 and is never discarded.
4. Conflict review offers Saved version, This draft, and Copy both. `Keep mine` creates a new explicit mutation against the current version.

### Search/Ask/Related

1. A term in a server-accepted note returns its parent once as `Matched in My notes`.
2. Search navigation opens the note surface.
3. When AI use is permitted, latest-version `manual_note` chunks can be retrieved. Ask calls them `Your note`; original, AI digest, and legacy mixed context have different labels.
4. Related may change within evaluated bounds; no note node appears.

### Privacy, remote provider, clear/delete

1. Before first note text is sent to a remote provider, show provider name(s), purpose, and exact-search alternative. No transmission occurs until acknowledgement.
2. Turning off Include in AI & connections versions the state, blocks new calls, and removes note semantic artifacts; exact search remains.
3. Clearing creates an empty current version plus a pre-clear checkpoint and removes search/AI artifacts.
4. Delete confirms scope, purges content/artifacts, creates a content-free generation tombstone, and prevents delayed old drafts from recreating/transmitting text without explicit Recreate.
5. Recent recovery restores a checkpoint as a new version. Delete does not offer retained content; backup retention is disclosed separately.

## 7. Web/mobile behavior

### Desktop

- Extend the attested production two-column item detail; Original stays primary, AI digest/My notes share the companion area.
- `Write | Preview`, privacy/source label, status, Save, and overflow remain visible.
- Textarea is article-like but clearly an editor; toolbar applies Markdown to selection and restores focus/selection.

### Mobile/Capacitor

- Preserve `Original / Digest / Ask / Related / Details` and add `Notes`; preserve bottom navigation.
- Notes is single-column. Primary toolbar actions remain 44 px; secondary actions use an accessible overflow sheet.
- Save/status stay above the software keyboard/safe area. Backgrounding completes the local journal transaction and may attempt, but never assumes, keepalive server save.

## 8. Data and lifecycle requirements

- Canonical current row: Markdown, derived plain text/hash, content version, AI-inclusion version/state, indexed version, timestamps/save kind.
- Generation/tombstone state survives note deletion and rejects delayed bases.
- Revision checkpoints: previous state on manual Save, restore, pre-clear, and at most every five minutes of changed autosaves; prune to newest 25 and 30 days.
- Mutation receipts: same mutation+request returns accepted result; same ID/different request fails; bounded to seven days/newest 100; no note text.
- Local journal: composite `(item_id, editor_instance_id)`, monotonically ordered operations/draft snapshot, original base/generation, mutation ID, dirty/acknowledged state. Never replace another dirty instance.
- FTS indexes derived plain text. Semantic chunks carry source kind/version. Explicit vector cleanup precedes chunk deletion.
- All note-bearing surfaces use verified session and `Cache-Control: private, no-store, max-age=0` with appropriate dynamic/Vary behavior.

## 9. Failure-state contract

| Failure | Required outcome |
|---|---|
| Blank open/close | No durable/server/search/AI/card/node artifact. |
| Rapid input | Ordered local journal; one network write; coalesced latest generation. |
| IndexedDB slow/out-of-order | Writes serialized by editor instance; older sequence cannot replace newer. |
| IndexedDB denied/quota | Prominent “device recovery unavailable”; online manual/server save and Copy remain. |
| Refresh/crash/pagehide | Latest completed journal survives; network flush is best-effort only. |
| Two tabs/devices | No local draft overwrite; server CAS conflict; both texts recoverable. |
| Old save after delete/AI opt-out | Tombstone/version conflict; no recreation/provider call. |
| Network/provider outage | Local/server canonical save and FTS remain; AI status separately retryable. |
| Remote provider unacknowledged | No note provider call/chunk transmission. |
| Forged/expired auth/cross-origin | 401/403; no content/read/write. |
| Unsafe Markdown/paste/link | No raw HTML execution; supported protocols only. |
| 100 KiB exceeded | Local text remains copyable; server returns 413; warning before limit. |
| Owner item deleted | Preserve local draft for Copy; server 404; no orphan attachment. |
| Worker crash/stale/duplicate | Durable lease recovers; one claim wins; stale version cannot commit. |
| Delete/logout | Note content absent from server canonical/derived stores and note-bearing HTTP/Cache Storage surfaces on the current client; other offline clients reconcile to the tombstone and retain only copy-only drafts until the user discards them; backups disclosed. |

## 10. Acceptance criteria

### Core/editor

- [ ] One note per item, no mutation of source/AI fields, no second item/card/node.
- [ ] Every supported toolbar action produces deterministic canonical Markdown and Preview semantics; keyboard and native undo/redo work.
- [ ] Raw HTML/scripts/unsafe URLs never execute or survive as active content.
- [ ] 100 KiB byte limit, warning, over-limit Copy, and normalized Unicode/newlines are tested.

### Durability/concurrency

- [ ] Latest edit is locally durable before network save; IndexedDB writes are sequence-safe.
- [ ] Forced crash with two tabs preserves both dirty drafts independently.
- [ ] Autosave is 750 ms idle/5 s max with one in-flight write; stale responses cannot change current state.
- [ ] Retries are idempotent; cross-tab/device writes conflict explicitly; no silent last-write-wins.
- [ ] Delayed pre-delete/pre-opt-out mutations cannot recreate or retransmit note text.

### Search/AI/connections

- [ ] Latest server-accepted note is in FTS immediately; local-only wording does not promise global search.
- [ ] Parent item appears once with matched sources/snippet and note navigation.
- [ ] Semantic/citations distinguish `legacy_item_context`, Original, AI digest, and Your note; an AI-summary-only sentence is never labeled Original.
- [ ] Streamed and persisted citations retain source kind/version. Re-edited/pruned citations degrade to `Your note (version no longer available)` rather than Original; Delete purges item-chat turns derived from the deleted note as disclosed.
- [ ] No remote note call occurs before provider acknowledgement or while opted out.
- [ ] Stale/duplicate workers cannot publish; current-version semantic convergence target is 30 s healthy.
- [ ] Related passes the labeled relevance/length-adversary fixture and creates no graph/card duplication.

### Privacy/security/lifecycle

- [ ] Verified HMAC session and same-origin mutation guard all reads/writes/recovery/privacy/delete.
- [ ] Note/revision/conflict/search/Ask/related/export responses carrying note data are private/no-store and absent from cache after delete/logout.
- [ ] Structured logs/events/errors/URLs never contain note text/snippets/link destinations.
- [ ] Default share/export excludes note; explicit export is authenticated, labeled, private/no-store.
- [ ] Clear/delete/item-delete cleanup manifest accounts for current row, revisions, receipts/tombstone, jobs, FTS, chunks, bridge, vec0, note-derived chat turns, and current-client editor drafts. Other offline clients are reported `pending_offline_clients` until tombstone reconciliation; backup exceptions are disclosed.

### UX/accessibility

- [ ] Existing production desktop/mobile functionality remains reachable; mobile has six tabs and no horizontal overflow.
- [ ] All save/index/offline/error/conflict/privacy states are visible and announced truthfully.
- [ ] Keyboard, screen reader, focus, 44 px touch, 200% zoom/reflow, contrast, reduced motion, IME/paste/selection/virtual-keyboard/background tests pass.
- [ ] Implementation design QA compares matching state/viewports with prototype/production truth; prototype QA alone is not release proof.

### Release

- [ ] `8178117` is merged with main-derived work; integrated baseline checks/build/audit/Recall preflights pass before feature code.
- [ ] Integration-hardening migration 021 restores the transcript-recovery trigger lost by the 020 items rebuild; F08 migrations 022/023 pass fresh DB and latest production snapshot copy; history 018–020 and scheduler/runtime inventory are intact.
- [ ] Every vec0 row is classified; backup+report+approved repair/reservation+parity pass before indexing.
- [ ] Dry-run artifact sync has no unexplained removal; flags off is first rollback; no live down-migration.
- [ ] Synthetic production create/edit/search/Ask/Related/opt-out/delete/cleanup and health/Recall checks pass before real use.
- [ ] UI, write, and semantic-worker flags are independently default off; pre-start migration/vector gates pass because flags do not prevent startup schema application.

## 11. Analytics/operations

Content-free events: editor opened/first edit; local journal recovered/conflicted/discarded; save accepted/replayed/conflicted/failed; index queued/claimed/stale/done/failed; exact note hit/open; Ask Your-note citation; Related influence; provider permission; AI toggle; restore/clear/delete/prune.

Allowed dimensions: IDs, source kind, versions/generations, bytes, timing, save kind, attempts, provider identifier, permission state, artifact counts. No text, snippets, destinations, clipboard data, or content fingerprint outside internal mutation integrity.

Targets: zero silent loss/overwrite; save p95 <250 ms local/<750 ms through tunnel; FTS available on accepted transaction; healthy semantic convergence p95 <30 s; backlog warning oldest >5 min; zero unclassified/orphan growth; zero cached/logged note content.

## 12. Risks and no-go gates

Release is blocked by any:

- failed integrated production baseline or unexplained artifact deletion;
- unclassified/mismatched vec0/bridge row or failed snapshot-copy parity;
- one-key local draft behavior or failed two-tab crash recovery;
- ambiguous citation provenance;
- unauthorized/cross-origin access or note content in cache/log/default export;
- provider call before permission/after opt-out;
- stale worker commit or delete/opt-out resurrection;
- mobile feature regression, editor/a11y/IME failure, cleanup mismatch, missing backup/rollback evidence.

Residual risk remains: local browser/server storage is not end-to-end encrypted; retained backups delay physical erasure; approved external providers process selected note text; Related quality needs ongoing evaluation.

## 13. Final go/no-go

**GO** to integrate `8178117`, run the clean integrated baseline, and implement this v2 behind disabled UI/index flags.
**NO-GO** to enable semantic indexing until vector audit/repair passes.
**NO-GO** to production real-note use until every release acceptance criterion and no-go gate has evidence.

## 14. Open questions

No product decision is waiting on the user: v2 finalizes editor, size, privacy, provider, export, recovery, provenance, and connection scope. Remaining questions are evidence-driven implementation gates—exact merge conflict resolutions, the live 44-row vector classification/repair manifest, measured Related thresholds, and final production artifact deletion inventory. Those are resolved by tests/audits and block release if uncertain.
