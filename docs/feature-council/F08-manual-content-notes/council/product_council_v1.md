# F08 Manual Content Notes — Product Council v1

**Council date:** 2026-07-10
**Feature evaluated:** A private, user-authored note attached to every existing library item, stored separately from source content and AI output, editable with Markdown affordances, manually and automatically saved, and included in search, AI retrieval, and connection/graph signals.
**Council lenses:** PM 1 — Growth/Engagement; PM 2 — Platform/Data; PM 3 — Power User/Workflow.
**Recommendation:** **Conditional GO for a bounded attached-note release; NO-GO on implementing the supplied F08 PRD unchanged.**

## Executive Decision

The council supports this feature because it closes the most important gap between *saving information* and *making it personally useful*. The durable value is not the editor itself. It is the loop created when the user's interpretation becomes retrievable, can influence AI answers, and can improve related-item connections.

The supplied F08 PRD V2 is not an implementation-ready specification for this request. Its primary object is a new standalone note/card with an ephemeral-draft lifecycle, Home blank-card validation, and a large adjacent-control quarantine. The requested AI Brain feature is an annotation document owned by an existing item. It should not create another library card, require another title, or be conflated with AI Brain's already-shipped standalone `source_type = 'note'` capture flow.

The council resolves the feature as follows:

1. One Markdown-backed manual note document per library item in v1.
2. The note is a separate persisted entity and never overwrites captured body, title, summary, or auto-tags.
3. A visible toolbar, Markdown shortcuts, manual Save, debounced autosave, explicit save state, and draft recovery are launch requirements.
4. Exact search, semantic retrieval, Ask, and related-item signals include the note by default, but every result/citation must preserve provenance as **My note** versus **Original** versus **AI summary**.
5. The item remains the graph node. Manual-note semantics may change edge strength or create an edge, but v1 does not create a second “note node” for each item.
6. Private notes are excluded from public/share surfaces by default. Export inclusion must be an explicit product decision and clearly labeled.
7. Production rollout is blocked until autosave integrity, stale-index behavior, mobile failure recovery, Markdown safety, and remote-AI disclosure are testable and pass.

## Agenda

1. Confirm the user problem and the product object being created.
2. Compare the supplied F08 PRD with AI Brain's current behavior and architecture.
3. Evaluate value, adoption, and retention through the Growth/Engagement lens.
4. Evaluate data ownership, search, AI retrieval, and graph behavior through the Platform/Data lens.
5. Evaluate real daily usage, no-loss guarantees, and trust through the Power User/Workflow lens.
6. Resolve disagreements on editor model, note cardinality, autosave, AI inclusion, export, and graph semantics.
7. Recommend v1 scope, milestones, owners, analytics, acceptance-criteria additions, blockers, and go/no-go gates.

## Evidence From the Current Product

The council used the current worktree, project documents, implementation, and supplied F08 PRD/screenshot as evidence. The consequential findings are:

- AI Brain already has **standalone manual notes**. `src/db/items.ts:77-79` creates a normal item with `source_type = 'note'`; `src/app/capture/tabs.tsx:150-205` requires a title and body and exposes only a manual save; `src/app/actions.ts:11-31` validates and creates that item. This is not the requested attached note.
- The core `items` table has captured `body` and AI `summary` fields but no separate per-item user-note entity (`src/db/migrations/001_initial_schema.sql:15-31`). The item detail page renders the original body and AI summary separately but has no user-note editor (`src/app/items/[id]/page.tsx:122-231`, `313-360`).
- Exact search indexes only item title and body (`src/db/migrations/002_fts5.sql:7-31`). Adding UI without extending the index would violate the stated search value.
- Semantic retrieval currently embeds a one-time composite of item title, summary, and body, then short-circuits if chunks already exist (`src/lib/embed/pipeline.ts:44-79`). Existing-note edits therefore need an explicit, idempotent invalidation/re-embedding path; they cannot rely on the current new-item trigger.
- Related items are based on the centroid of the current item's chunks (`src/lib/related/index.ts:1-15`, `39-100`). Naively appending manual notes to the item body would erase provenance and unpredictably move the centroid.
- Ask retrieval/citations currently expose item and chunk identity but no source origin such as captured content, AI output, or user note (`src/lib/retrieve/index.ts:24-35`; `src/app/api/ask/route.ts:112-117`). Provenance must be added before notes become AI evidence.
- The item view currently renders captured body as pre-wrapped text, not rendered/sanitized Markdown (`src/app/items/[id]/page.tsx:183`). `package.json:43-69` includes no rich Markdown editor or Markdown renderer dependency. Editor selection and safe rendering are real implementation work, not a styling-only change.
- The design system already anticipates a `markdown-editor` surface and highlight-to-annotate behavior (`DESIGN.md:446-452`; `DESIGN_SYSTEM.md:310-315`). The attached-note direction is consistent with the declared product design, while the supplied F08 screenshot's full standalone workspace is not a required pattern.
- The Android APK is a live WebView of the server and explicitly has no offline copy of the app (`README.md:55-61`). “Autosave” cannot honestly imply durable offline editing unless a local draft layer is added or the UI clearly distinguishes **Saved**, **Saving**, and **Not saved — offline**.
- Current item and library Markdown exports include original content and, in the library export, AI summary, but have no private-note inclusion policy (`src/app/api/items/[id]/export.md/route.ts:27-44`; `src/app/api/library/export.zip/route.ts:25-51`).
- SQLite backup snapshots will naturally contain a new note table if it is in the same database (`src/lib/backup.ts:1-11`, `44-51`), but deletion/retention and exported-copy expectations still need definition.
- There is no general product-analytics implementation in current application code. Any measurement proposal must be local, content-free, and explicit rather than assuming third-party telemetry.

### Supplied PRD Fit Assessment

The supplied F08 PRD V2 contributes useful requirements for meaningful-content thresholds, idempotent autosave, visible save state, retry, revision retention, cleanup evidence, and privacy-safe validation. Those ideas should be retained.

Its core flow should not be retained for this feature:

- “Open Add Content > Note” creates a new draft; the requested entry point is an existing item.
- Its primary failure is a blank Home card; an attached blank note should never create any new card.
- Its title/body/tag eligibility rules describe a standalone item. An attached note inherits item identity and needs no second title.
- Its Share/Chat/Quiz/Connections quarantine is specific to the reference product's workspace. AI Brain should instead validate its actual item-detail, Ask, export, search, related-items, and Android surfaces.
- Its artifact manifest names notebook blocks and unrelated generated artifacts that do not match AI Brain's current tables. Validation should use AI Brain's note row, note revisions, FTS rows, note chunks/vectors, jobs, and derived relationship state.

## Council Lens 1 — Growth/Engagement

**Named position:** PM 1 — Growth/Engagement recommends **GO**, provided the first-run experience makes the action lightweight and later retrieval visibly proves value.

### User Value

The feature changes an item from “something I saved” into “something I processed.” The highest-value outcome is a durable separation of three voices:

- what the source said;
- what AI inferred;
- what I thought, decided, questioned, or want to do.

That distinction creates ownership. AI summaries accelerate consumption, but user-authored notes create investment and memory. The product should reinforce that ownership by labeling the section **My notes**, not simply **Notes**, and by keeping it visually distinct from **AI summary**.

### Target Behaviors

1. Add a takeaway immediately after reading an item or its summary.
2. Return later to refine the note without recreating context.
3. Find the item through the user's own vocabulary, even when that vocabulary never appeared in the source.
4. Ask “What did I think about…?” and receive an answer grounded in manual notes.
5. Discover a connection between two sources because the user's notes framed them with the same concept.

### Adoption Loop

`Capture → Review source/summary → Add personal note → See Saved → Later search in my own words → Reopen item → Add/refine note`

The activation moment is not editor open or autosave success. It is the first successful **retrieval of a saved personal thought**. The UI should therefore label search matches (“Matched in My note”) and AI citations (“My note on [item]”) so the user understands why writing a note paid off.

### Retention Loops

- **Personal vocabulary loop:** each note adds terms and framing the source lacks, improving future retrieval.
- **Accumulating context loop:** revisiting an item and extending the note makes the library more useful over time instead of becoming a capture graveyard.
- **Discovery loop:** manual-note concepts improve related items, leading to another item view and another note.
- **Reflection loop:** Ask surfaces what the user previously believed, exposing evolution or contradiction and inviting note revision.

### Growth Risks

- A large always-open editor can make every item feel like homework and depress reading completion.
- A toolbar with too many controls can turn a personal note into a document-production task.
- Autosave without visible retrieval payoff creates invisible infrastructure, not engagement.
- If note terms change related items without explanation, users may perceive recommendations as random rather than personalized.

### Growth Recommendation

Use progressive disclosure: show a compact **Add your note** affordance beneath or immediately after the source/summary relationship, then expand into the editor. Once a note exists, show its first few lines and last-saved state. Do not add a separate library card, capture count, or notification simply because a note was edited.

## Council Lens 2 — Platform/Data

**Named position:** PM 2 — Platform/Data recommends **CONDITIONAL GO**. UI-only delivery is a no-go; separate storage, provenance, and deterministic derived-data refresh are part of the product contract.

### Data Ownership Decision

The canonical manual note must be stored separately from:

- `items.body` (captured/original content),
- `items.summary` and quotes (AI-generated output),
- standalone `source_type = 'note'` items.

Recommended v1 product model:

- zero or one canonical manual-note document per item;
- a stable note ID and one-to-one item relationship;
- Markdown source as the portable canonical body;
- monotonic revision/version number;
- created/updated timestamps;
- optional revision snapshots retained according to a declared policy;
- deletion cascades when the parent item is deleted;
- no normal row for an untouched/whitespace-only note.

This preserves source truth, makes updates cheap, supports export policy, and allows derived indexes to identify exactly what changed.

### Search Implications

Exact search must index manual-note text without pretending it is original item text. Search results should remain item-level, but include:

- `matched_in = manual_note | original | title | ai_summary`;
- a note-derived snippet when the match is in the note;
- a **My note** label;
- stable ranking rules.

Council ranking intent:

1. exact title match;
2. exact manual-note phrase match;
3. exact original-body match;
4. semantic matches, fused with exact ranks.

This is a product hypothesis, not a permanent scoring truth. It prioritizes the user's deliberate language while preventing a short note from overpowering every relevant source. Ranking telemetry should measure result opens by origin so weights can be adjusted.

### AI/RAG Implications

Manual-note chunks must carry source provenance through retrieval, prompting, streamed retrieval frames, persisted citations, and item-page highlighting. The model prompt should distinguish the blocks explicitly:

- **Original source** — may support claims about what the source says.
- **My note** — supports claims about the user's interpretation, memory, plan, or opinion.
- **AI summary** — a derived aid, not independent evidence.

An answer must not present a user's speculation as a fact stated by the source. “Your note says…” is acceptable; “The article proves…” is not if only the manual note supports it.

Manual-note saves should not rerun source enrichment or overwrite AI summary, category, quotes, or auto-tags. They should enqueue only note-specific derived work: search indexing, note chunking/embedding, and relationship recomputation. The save transaction and derived jobs need idempotency by `note_id + revision`, so an older worker cannot publish embeddings after a newer revision has saved.

### Graph and Related-Item Implications

The v1 graph object remains the library item. A manual note is a semantic signal attached to that item, not a new node. Creating note nodes would double the visual graph, expose implementation detail, and split item context.

Recommended relationship behavior is provenance-aware late fusion rather than concatenating note text into the source body:

- preserve an original-content similarity signal;
- compute a manual-note similarity signal separately;
- combine those with shared tags/collections under declared weights;
- expose the reason when possible, for example “Connected by your notes: activation friction.”

If only note similarity creates the relationship, label the edge/reason as note-derived. A note edit must eventually refresh related items; until refresh completes, the UI should not claim connections are current. A small “Updating connections…” status is preferable to silently stale output.

### Privacy and Provider Boundary

“Private” cannot mean only “not publicly shared.” On mobile, requests transit Cloudflare's edge according to `README.md:158-167`, and the repository supports configurable non-local AI providers. The product must disclose that a manual note included in Ask may be sent to the configured AI provider.

Council minimum:

- no automatic enrichment/model call merely because the user typed or autosaved;
- local search works without sending note content to an LLM;
- AI inclusion is default to satisfy the feature goal, but the configured-provider boundary is visible;
- notes are excluded from future public share links by default;
- telemetry never records note text, snippets, queries, or rendered HTML.

A per-note “Exclude from AI” control is desirable P1. A global provider/privacy disclosure is a v1 trust gate if a remote model can receive retrieved content.

## Council Lens 3 — Power User/Workflow

**Named position:** PM 3 — Power User/Workflow recommends **GO only with a no-loss editing contract**. A feature that occasionally loses text is worse than no feature because it destroys trust in the whole library.

### Daily Workflows

#### Workflow A — Read, compare, capture a takeaway

1. Open an existing article, PDF, video, Telegram item, or standalone note.
2. Read original content and AI summary.
3. Open **My notes** without navigating away.
4. Write headings, bullets, numbered steps, emphasis, a quote, links, or code.
5. Observe **Saving… → Saved just now**.
6. Continue reading; the note remains available when returning.

#### Workflow B — Quick mobile thought

1. Open an item from Android.
2. Add a short thought with the software keyboard.
3. Background the app or lose network.
4. Return and see either a confirmed saved version or an honest recoverable unsaved draft—never a silent empty editor.

#### Workflow C — Search in personal vocabulary

1. Search for a term used only in a manual note.
2. Receive the parent item with a **Matched in My note** snippet.
3. Open directly at the note match or expanded note section.

#### Workflow D — Ask and connect

1. Ask “What did I think were the main risks in these proposals?”
2. Receive note-grounded answers labeled as the user's notes.
3. Follow a note-derived related item and understand why it is connected.

#### Workflow E — Refine over time

1. Open the same item in a later session.
2. Edit the existing note rather than creating a duplicate.
3. Save with keyboard shortcut or explicit button.
4. If another tab has a newer revision, receive a conflict/reload choice instead of overwriting silently.

#### Workflow F — Delete or export deliberately

1. Clear/delete a manual note without deleting the item, or delete the item and all attached note artifacts.
2. Export the item/library with a clearly stated include/exclude policy for private notes.

### Editing Contract

The v1 editor should be Markdown-backed and approachable:

- toolbar: heading, bold, italic, unordered list, ordered list, link, quote, inline/fenced code, undo, redo;
- Markdown keyboard syntax and `Cmd/Ctrl+B`, `Cmd/Ctrl+I`, `Cmd/Ctrl+K`, `Cmd/Ctrl+S`;
- consistent behavior for paste, multiline selection, list continuation, and indentation;
- source preserved as portable Markdown;
- sanitized preview/rendering—no raw script/event-handler execution;
- desktop and mobile layouts with at least 44px effective touch targets on mobile;
- no required note title, because the parent item supplies identity.

A full Notion-style block editor, slash-command system, tables, attachments, comments, and collaboration are not required to achieve this contract.

### Autosave Contract

- Create nothing for untouched or whitespace-only content.
- Start autosave after meaningful input with a short debounce; do not save every keystroke.
- Serialize or version requests so an older response cannot overwrite newer content.
- Manual Save flushes the latest editor state and coexists safely with an in-flight autosave.
- Show one of: **Not saved yet**, **Unsaved changes**, **Saving…**, **Saved [time]**, **Save failed — retry**, **Offline — stored on this device** only if a local draft truly exists.
- Navigation, refresh, backgrounding, and process interruption must be covered by recovery tests.
- Preserve a recoverable local draft when the server is unreachable; do not label it Saved until the server confirms persistence.
- A stale-tab save must detect revision mismatch and offer **Reload latest**, **Keep my version as copy**, or a simple conflict-safe equivalent.

### Trust Edge Cases

| Edge case | Required user-trust behavior |
|---|---|
| User opens editor and leaves | No note row, no new card, no “Untitled” artifact. |
| User clears the note to whitespace | Confirm whether this deletes the note; do not leave an invisible indexed document. |
| Autosave and manual Save overlap | Latest revision wins deterministically; no duplicate revisions or lost characters. |
| Slow response arrives out of order | Server rejects/stales old revision; UI never moves from newer to older content. |
| Network disappears mid-edit | Text remains visible/recoverable; status says it is not server-saved. |
| App backgrounds on Android | Resume restores draft and states whether it synced. |
| Two tabs edit the same note | Detect conflict; no silent last-writer overwrite. |
| Markdown contains HTML/script | Store safely; preview sanitizes or disables unsafe HTML. |
| Large paste | Enforce a documented limit with pre-save warning; never truncate silently. |
| Search index/embedding lags | Canonical note is saved; derived state shows pending/error and retries idempotently. |
| AI cites the note | Citation says **My note**, not only the parent source title. |
| User writes an opinion contrary to source | AI preserves distinction; graph may connect by theme but does not treat opinion as source fact. |
| Parent item is deleted | Note, revisions, FTS rows, chunks/vectors, and relationship artifacts are removed or intentionally retained under a stated policy. |
| Note is deleted but item retained | Original content, summary, tags, and source embeddings remain intact. |
| Export/share is invoked | Private-note inclusion is explicit and defaults conservatively. |
| Backup is restored | Canonical note and revision/index recovery behavior are documented and testable. |

## Prioritized Use Cases

| Priority | Use case | User outcome | Council rationale |
|---|---|---|---|
| P0 | Add/edit one note on any existing item | Captures personal interpretation beside source and AI summary | Core user request |
| P0 | Manual and automatic save with recovery | No thought is silently lost | Trust prerequisite |
| P0 | Exact search finds note-only terms | User retrieves items in their own language | First visible payoff |
| P0 | Ask uses and labels manual-note evidence | AI understands the user's interpretation without confusing it with source truth | Core AI value and safety |
| P0 | Note edits update semantic/related signals | Personal concepts improve item connections | Core graph requirement |
| P0 | Mobile editing and failure states | Feature works in the shipped Android access model | Platform parity |
| P0 | Separate delete/export/privacy rules | User controls private thought independently of captured content | Trust prerequisite |
| P1 | Revision-history UI | User can inspect/restore older thought | Useful after usage proves revision value |
| P1 | Highlight-to-note with source anchors | Faster close reading and traceability | Design-system-aligned expansion |
| P1 | Multiple named notes per item | Supports research dossiers and perspectives | Adds hierarchy/search complexity |
| P1 | Note templates, backlinks, wikilinks | Power workflow acceleration | Not needed for core loop |
| P2 | Attachments, tables, slash commands, collaborative editing | Full document workspace | Outside single-user attached-note goal |

## Disagreements and Resolutions

### 1. Standalone note versus attached note

- **Growth/Engagement:** Reusing the existing note capture flow could ship faster and expose a familiar editor.
- **Platform/Data:** Reuse would create duplicate item identity, make search results ambiguous, and risk AI treating the note as another source.
- **Power User/Workflow:** Users expect their annotations inside the item they reviewed, not as a second card to find and manage.
- **Resolution:** Attached note is a separate child entity. Existing standalone note capture remains unchanged.

### 2. Rich text versus raw Markdown

- **Growth/Engagement:** A raw Markdown textarea raises activation friction.
- **Platform/Data:** Markdown is portable, diffable, exportable, and safer as a canonical form than proprietary editor JSON.
- **Power User/Workflow:** Keyboard users want Markdown syntax; non-experts need visible formatting controls.
- **Resolution:** Markdown-backed editor with toolbar, shortcuts, and preview/visual feedback. Do not require users to memorize syntax and do not adopt an opaque block schema in v1.

### 3. One note versus multiple notes per item

- **Growth/Engagement:** One note keeps the affordance obvious and the loop fast.
- **Platform/Data:** Multiple notes multiply indexing, graph, ordering, and deletion semantics before a need is proven.
- **Power User/Workflow:** Multiple notes may eventually be useful for sessions or perspectives.
- **Resolution:** One canonical note document per item in v1; headings and sections provide internal structure. Preserve a stable note ID so multiple-note support can be added later without redefining the current note.

### 4. Ship editor first, AI/graph later versus end-to-end launch

- **Growth/Engagement:** A fast editor + exact search release could establish behavior sooner.
- **Platform/Data:** The user explicitly asked for search and AI/graph usage; shipping a UI without data integration creates a misleading promise.
- **Power User/Workflow:** Exact search is immediately useful, while semantic refresh can be asynchronous if honestly surfaced.
- **Resolution:** Build in milestones, but do not call the feature complete until exact search, provenance-aware AI retrieval, and relationship refresh work. An internal feature flag may expose earlier milestones for validation.

### 5. Default AI inclusion versus privacy opt-in

- **Growth/Engagement:** Default inclusion is required for an immediate retrieval payoff.
- **Platform/Data:** Remote configured providers may receive sensitive personal text.
- **Power User/Workflow:** Users need predictability more than another per-note switch.
- **Resolution:** Include by default in search and configured AI workflows, never auto-send merely on save, clearly disclose the provider boundary, exclude from public share by default, and add per-note AI exclusion as P1 unless the security/privacy review makes it a launch requirement.

### 6. Source-body concatenation versus separate semantic signals

- **Growth/Engagement:** Concatenation is invisible to users and may ship quickly.
- **Platform/Data:** It destroys provenance, forces source re-enrichment patterns, and makes graph movement unexplainable.
- **Power User/Workflow:** Users need “why connected?” and “where did AI get this?” answers.
- **Resolution:** Separate canonical storage and separate/provenance-tagged derived chunks; fuse item-level results late.

## Scope Recommendation

### P0 — Required for v1

- **My notes** section on every existing item type.
- One canonical Markdown note per item; no second title or card.
- Separate persistence and item-level CRUD.
- Toolbar and shortcuts for headings, bold, italic, bullets, numbered lists, links, quote, code, undo/redo.
- Manual Save plus debounced, versioned autosave.
- Visible save/failure/offline/recovery states and recoverable client draft.
- Conservative revision retention or at minimum one recoverable prior durable version; policy must be explicit.
- Exact search with note snippet and **Matched in My note** provenance.
- Semantic retrieval and Ask citation provenance.
- Note-aware related-item/graph signal refresh without making notes separate nodes.
- Mobile-responsive editing, keyboard/back-navigation behavior, accessibility labels, focus handling, and touch targets.
- Safe Markdown preview/rendering and content-length policy.
- Independent note deletion, parent-item cascade, backup/restore behavior, and derived-artifact cleanup.
- Explicit export/share behavior and configured-AI privacy disclosure.
- Local, content-free analytics and operational failure counters.

### P1 — Follow-up after measured use

- Version-history browser and one-click restore.
- Per-note **Exclude from AI** control.
- Highlight-to-note anchors and deep links.
- Multiple named notes, templates, backlinks, or wikilinks.
- Search filters for **My notes only** and advanced ranking controls.
- Edge explanations with extracted shared concepts if v1 only labels note-derived versus source-derived.
- True offline editing/sync if Android usage shows demand beyond recoverable drafts.

### Explicit Non-goals for v1

- Replacing the existing standalone note capture flow.
- Editing captured original body or AI summary in the manual-note editor.
- Real-time collaboration, sharing notes publicly, comments, mentions, or permissions.
- Notion-style arbitrary block databases, embedded media uploads, tables, slash-command ecosystems, or plugins.
- Creating graph nodes for individual notes.
- Automatically summarizing, rewriting, tagging, or “improving” the user's note on save.
- Full offline library replication to Android.

## Milestones and Exit Gates

| Milestone | Outcome | Exit gate |
|---|---|---|
| M0 — Product contract | PRD/UX/technical plan align on attached versus standalone note, privacy, export, provenance, revision policy, and save states | Decision log signed by Product, Engineering, AI/Data, UX, QA, Security/Privacy |
| M1 — Canonical data foundation | Separate note/revision persistence, CRUD, cascade, migrations, and local backup behavior | Migration/rollback tests; blank note creates no row; original/AI fields unchanged |
| M2 — No-loss editor | Markdown toolbar/shortcuts, manual save, autosave, recovery, conflicts, mobile and accessibility states | Race/offline/navigation matrix passes; no silent loss or stale overwrite |
| M3 — Exact retrieval | FTS update and item-level search provenance/snippets | Note-only term finds correct item; note deletion removes match; ranking contract testable |
| M4 — AI and semantic retrieval | Provenance-tagged chunks, idempotent revision jobs, Ask prompts/citations | Newest revision is retrieved; old revision cannot reappear; citations say **My note** |
| M5 — Connections and trust surfaces | Related-item refresh, edge reason class, export/share/privacy/delete behavior | Note changes affect relationships predictably; cleanup manifest complete; no default private-note leak |
| M6 — Controlled rollout | Seed/test account validation on desktop and Android, local analytics, rollback readiness | All no-go gates pass; no P0 failure in soak; named release owner signs off |

## Decision Log

| ID | Decision | Status | Rationale |
|---|---|---|---|
| PC-F08-01 | Implement an attached per-item note, not a new note card | Decided | Matches requested workflow and avoids duplicating current standalone notes |
| PC-F08-02 | Store note separately from captured and AI-generated fields | Decided | Preserves source truth, privacy policy, and provenance |
| PC-F08-03 | One canonical note per item for v1 | Decided | Lowest-friction model; headings handle internal structure |
| PC-F08-04 | Canonical format is Markdown with a rich toolbar/shortcuts | Decided | Portable, power-user friendly, approachable |
| PC-F08-05 | Manual Save and versioned autosave both ship | Decided | Explicit control plus no-loss protection |
| PC-F08-06 | Search/AI/graph include notes with provenance | Decided | Required value without confusing user thought with source evidence |
| PC-F08-07 | Item remains graph node; note is a relationship signal | Decided | Prevents node explosion and preserves library mental model |
| PC-F08-08 | No model call is triggered solely by typing/autosave | Decided | Cost, privacy, latency, and trust |
| PC-F08-09 | Public sharing excludes notes by default | Decided | “Private manual notes” is the user expectation |
| PC-F08-10 | Export inclusion policy must be explicit before launch | Open product choice | Portability favors inclusion; privacy favors conservative default |
| PC-F08-11 | Revision retention baseline | Open product/legal choice | Supplied PRD proposes last 25 or 30 days; local storage and restore UX need agreement |
| PC-F08-12 | Per-note AI exclusion ships in v1 or P1 | Open security/privacy choice | Depends on configured remote-provider threat model |
| PC-F08-13 | Exact search ranking weights | Hypothesis | Must be evaluated with result-open behavior, not treated as permanent |

## Owners and Accountability

No individual owner names were supplied. Assigning named people is a release prerequisite; the following role ownership is the minimum operating model.

| Workstream | Accountable owner | Required contribution |
|---|---|---|
| Feature scope and decisions | Product DRI / Coordinator — **name TBD** | Own PRD, priorities, export/privacy choices, go/no-go |
| Editor interaction and responsive UX | UX/UI DRI — **name TBD** | Desktop/mobile states, toolbar behavior, accessibility, conflict/recovery UX |
| Persistence/autosave/API | Application Engineering DRI — **name TBD** | Schema, revisions, concurrency, recovery, deletion, migrations |
| Search/indexing/derived jobs | Search/Data DRI — **name TBD** | FTS, job idempotency, ranking, stale-state handling |
| AI retrieval and graph semantics | AI/RAG DRI — **name TBD** | Provenance, prompts, citations, embeddings, relation fusion |
| Security/privacy | Security/Privacy reviewer — **name TBD** | Markdown sanitization, provider disclosure, export/share policy |
| Test and release quality | QA DRI — **name TBD** | Race matrix, mobile matrix, cleanup manifest, rollback validation |
| Production release | Release/Operations DRI — **name TBD** | Backup, migration, deployment, monitoring, rollback |

## Blockers and Dependencies

### Launch blockers

1. **No approved attached-note product contract.** The supplied PRD describes the wrong core object and cannot be the acceptance source of truth.
2. **No named DRIs.** Product, Engineering, AI/Data, UX, QA, Security/Privacy, and Release owners are TBD.
3. **No provenance field in current retrieval/citation contract.** AI inclusion before this is unsafe and confusing.
4. **Current embedding path is create-once.** It needs note-revision invalidation/idempotency before edited notes can reliably affect semantic search or related items.
5. **No current rich Markdown editor/rendering stack.** The team must select a maintained, accessible approach and prove sanitization and mobile behavior.
6. **Android is not offline-first.** The team must choose recoverable local drafts plus honest status, or explicitly narrow v1 autosave expectations.
7. **Export/share policy is undecided.** Private text must not silently enter public/share artifacts.
8. **Remote-provider privacy boundary is not represented in note UX.** AI use of sensitive notes needs disclosure and a confirmed policy.
9. **No product analytics foundation.** Minimal local event storage/counters are needed to evaluate adoption and reliability without capturing content.

### Dependencies that should not block internal development

- Future graph visualization: the current related-items panel can validate note-derived relationship behavior first.
- Full revision-history UI: retention and internal recovery can ship before a history browser if the policy is declared.
- Full Android offline library: a local editor-draft mechanism is sufficient for v1 if honestly labeled and tested.

## Analytics and Success Measures

Because AI Brain is personal/local-first and has no general analytics layer, measurement should be stored locally and contain no note body, query, title, URL, snippet, or rendered content. Event payloads should use IDs, timestamps, revision numbers, durations, counts, status/error codes, surface, and device class only.

### Local events

- `manual_note_editor_opened`
- `manual_note_first_input`
- `manual_note_autosave_started`
- `manual_note_save_succeeded` with `save_mode = auto | manual`
- `manual_note_save_failed` with normalized error code
- `manual_note_draft_recovered`
- `manual_note_conflict_detected`
- `manual_note_deleted`
- `manual_note_search_impression`
- `manual_note_search_result_opened`
- `manual_note_retrieved_for_ask`
- `manual_note_citation_opened`
- `manual_note_relationship_refresh_succeeded | failed`
- `manual_note_export_included | excluded`

### Outcome metrics

| Metric | Definition | Why it matters |
|---|---|---|
| Note activation | Distinct items with a first non-empty note / distinct item-detail views | Measures whether the affordance becomes real behavior |
| Time to first personal note | Time from item capture or first detail view to first successful note save | Tests whether the workflow is discoverable/lightweight |
| Retrieval payoff | Note-origin search result opens / note-origin search impressions | Measures whether notes improve finding information |
| AI payoff | Ask sessions with a manual-note citation followed by citation open or item revisit | Measures whether AI use is valuable and trusted |
| Repeat editing | Notes edited on two or more distinct days / notes created | Proxy for evolving knowledge rather than one-off capture |
| Personalization loop | Item opens from note-derived related-item suggestions / note-bearing item views | Tests the connection loop |
| Save reliability | Successful saves / save attempts; split auto/manual and platform | Launch health metric |
| Recovery rate | Recovered drafts / interrupted unsynced sessions | Validates no-loss design |
| Conflict rate | Conflict detections / editing sessions | Indicates multi-tab risk and model adequacy |
| Stale-derived SLA | Time from canonical save to FTS and semantic/relationship readiness | Makes eventual consistency measurable |

### Initial success thresholds

For this single-user product, thresholds are reliability gates more than statistical growth targets:

- zero confirmed silent-loss incidents in controlled race/offline/navigation testing;
- zero stale-revision retrieval after a newer revision's derived job completes;
- 100% note-only exact-search test retrieval on supported text/tokenization fixtures;
- 100% note-origin AI citations visibly labeled **My note**;
- no manual note included in a public/share artifact by default;
- derived-work failures are observable and retryable, not silent.

Adoption/retention targets should be set after a baseline period; inventing percentage goals before there is event data would create false precision.

## Acceptance Criteria Gaps in the Supplied PRD

The next PRD must add testable criteria for all of the following:

### Product object and navigation

- Existing item is the parent and no new library card is created.
- Every supported item type can have the same note behavior.
- Note identity/cardinality, blank-state behavior, and inherited item title are explicit.
- Item-detail placement and direct opening from search/Ask citations are defined.

### Storage and lifecycle

- Manual note is separate from body, summary, quotes, category, and tags.
- Create/read/update/delete, timestamps, revision/version checks, retention, restore, and item-delete cascade are defined.
- Whitespace-only, clear-to-empty, huge paste, Unicode, emoji, code fences, links, and malformed Markdown behavior are defined.
- Migration, rollback, backup, restore, and cleanup manifest cover note rows, revisions, FTS, chunks/vectors, jobs, and relationship state.

### Editor and autosave

- Exact formatting controls, shortcuts, paste behavior, selection behavior, undo/redo, preview/rendering, sanitization, and content limit are listed.
- Debounce, in-flight serialization, idempotency key/revision, manual-save flush, retry, offline draft, navigation, refresh, Android background, and multi-tab conflict behavior are acceptance-tested.
- Every visible save state and accessible announcement is specified.

### Search

- Exact note-only term retrieval, snippets, labels, filters, ranking, deletion, updates, and stale-index bounds are defined.
- Search result opens the correct item and makes the note match discoverable.

### AI and graph

- Manual-note versus original versus AI-summary provenance flows through chunks, retrieve, prompts, SSE frames, stored citations, and UI.
- AI wording rules prevent user opinions from being represented as source facts.
- Newest-revision idempotency and old-vector cleanup are tested.
- Graph/related-item weighting, refresh timing, reason labels, note deletion, and no-note fallback are defined.
- Notes do not trigger automatic source enrichment or remote AI calls on save.

### Privacy, export, and security

- “Private” is defined for local DB, backups, Cloudflare transit, configured remote providers, export, share, logs, and analytics.
- Public/share default and explicit export inclusion behavior are defined.
- Markdown XSS, unsafe links, pasted HTML, secrets in logs, request size, authorization, and CSRF/origin behavior are tested.

### Platform and accessibility

- Desktop, tablet, and Android layout; 44px touch targets; software keyboard; safe-area; system back; focus restoration; screen-reader labels; status announcements; heading hierarchy; and reduced motion are defined.
- Offline/unreachable server behavior is honest about which copy is durable.

### Observability and rollout

- Local events/counters, save and derived-job errors, stale-state monitoring, feature flag, seed-account validation, production migration gate, rollback, and deletion cleanup evidence are specified.

## Go / No-Go Recommendation

### GO

Proceed to PRD v1/v2, UX, technical design, and implementation for the bounded attached-note feature described in this council memo. The feature is strategically coherent with AI Brain, has clear daily value, strengthens retrieval and connection loops, and builds on existing item-detail, FTS, RAG, related-items, SQLite, backup, and design-system foundations.

### NO-GO

Do not:

- implement the supplied standalone-note PRD as-is;
- append the manual note to `items.body` or `items.summary`;
- ship an editor-only version as “complete” without exact search and a declared AI/graph rollout path;
- expose manual notes to Ask without provenance-labeled citations;
- claim autosave is safe without race, failure, navigation, and Android-background validation;
- send notes to a model simply on save;
- include notes in public/share artifacts by default;
- release to production before named DRIs sign the P0 gates.

### Final Council Call

**Conditional GO: 3–0 across the three named PM lenses, with different gating concerns.**

- **Growth/Engagement:** GO — personal retrieval is a strong adoption/retention loop.
- **Platform/Data:** CONDITIONAL GO — separate storage, provenance, revisioned derived work, and privacy boundaries are mandatory.
- **Power User/Workflow:** CONDITIONAL GO — no-loss editing, mobile recovery, conflict handling, and visible save truth are mandatory.

The feature should move forward once M0 resolves open decisions PC-F08-10 through PC-F08-12 and assigns named DRIs. Production remains a no-go until M1–M6 exit gates pass.
