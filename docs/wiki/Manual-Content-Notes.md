# Manual Content Notes

Purpose: Explain the private Markdown note attached to each saved library item.
Audience: AI agents, engineers, product collaborators, and operators maintaining item notes.
Verified against: current main `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`, original release `8654f293d0f8615617df883e4703c0ca098a6029`, global-default integration `01721d1c2bbb686b9768d38c688352f78933205f`, and Note Focus production main `6858529ef179a51442d319c6c58e5ace79757619`.
Runtime evidence through: 2026-07-10 Note Focus guarded deployment, deep-link hotfix, deliberate enablement, authenticated read-only Notes/Focus/default-setting smoke, strict provider check, and scheduler/service health verification.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

**Status:** Feature-flagged and enabled in the verified release · **Confidence:** High · **Target user:** the single owner writing private context on an existing item

## Product Contract

Every saved item can have one owner-authored **My notes** document. It is an attached layer, not another library item. Original material, AI digest, and My notes remain visibly and persistently separate.

The user journey is item detail → My notes → empty editor or recovered draft → Write/Preview → local journal → autosave/manual save → optional versions/export/AI policy/Focus. Loading reconciles server and local journal state; success shows canonical generation/save state; network, session, journal and optimistic-conflict failures remain recoverable without silently replacing either version.

The note uses canonical UTF-8 Markdown. The editor provides basic formatting controls, Write and safe Preview modes, explicit Save, autosave, offline-local recovery, conflict review, recent checkpoints, restore, clear, delete, recreate, and explicit note-only export. Opening an empty editor does not create a record.

## Focus Mode

The ordinary item experience remains the default. When the rollout flag is enabled, **My notes** exposes a named **Focus** control that expands the already-mounted editor into an opaque full-viewport writing surface. It does not open browser fullscreen, navigate through the app router, mount a second editor, or create a new persistence path.

Focus keeps Exit, item identity, privacy copy, Write/Preview, Markdown formatting, save status and byte count, Copy, and Save reachable. Routine AI-policy, version, export, clear, and delete management returns after exit. The same content controller, journal, save queue, and Write textarea remain alive across Focus, Escape, Back, Forward, and supported responsive changes.

The content-free URL marker is `tab=notes&note_mode=focus`. Browser Back exits and Forward re-enters an owned Focus history entry. Direct load and refresh reconcile the normal saved note and local recovery journal before editing. Invalid or disabled markers normalize away, and the existing source-reading `mode=focus` view takes precedence.

While focused, the editor section has dialog semantics and an item-aware accessible name. Background branches become inert and `aria-hidden`, focus stays contained, and exact prior accessibility state is restored on exit. At narrow widths, Exit/title and status/Copy/Save remain persistent while mode and formatting controls scroll with the canvas.

`NOTE_FOCUS_MODE_ENABLED` controls only Focus presentation/history. The single responsive Notes host is a structural correction and requires the previous known-good artifact for emergency rollback.

## Data and No-Loss Model

The architecture/runtime flow is mounted editor → browser journal → authenticated note API → compare-and-swap repository/revisions/FTS → optional consent-gated note-index worker → Search/Ask/Related.

Migration 022 adds separate note state, current note, revision, idempotency receipt, semantic job, provider-consent, and note FTS tables. An item-scoped epoch/generation record survives note deletion as a content-free tombstone so delayed offline drafts cannot silently recreate deleted text.

Each editor instance writes a monotonic IndexedDB journal before attempting a server save. The server uses compare-and-swap epoch/generation plus a mutation receipt. An exact retry is acknowledged only while the originally accepted state remains current; a later canonical change opens conflict review with both saved and local versions.

## Search, Ask, and Connections

Accepted note text enters a separate FTS index inside the save transaction. Search returns the parent item once, marks a note match explicitly, and uses a bounded plain-text snippet.

Migration 023 gives semantic chunks an explicit source kind: legacy saved context, original content, AI digest, or manual note. Ask prompts and streamed/persisted citations keep this provenance and source version. Related items compute one centroid per item/source and apply bounded manual-note influence; the release does not claim a persisted graph UI.

Manual notes are excluded from AI and connections until the per-note switch is enabled. Retrieval rechecks deletion, inclusion, epoch, generation, rollout flags, and provider permission before prompt construction and again before answer persistence.

Settings > My notes provides an owner-controlled **Include in AI & connections by default** preference. It applies only when a note is first saved or deliberately recreated; changing it never rewrites an existing note's per-note choice. The effective default remains off until every active note-consuming provider is eligible, while exact search continues independently.

Focus Mode does not change this preference. The per-note management switch is intentionally hidden during focused writing and returns unchanged after exit.

## Privacy Boundary

My notes are private application data, not end-to-end encrypted data. They are stored in the browser profile, server SQLite, and retained backups. Default library export excludes them. An explicit note export is authenticated and labeled.

Note-bearing APIs are authenticated, dynamic, private/no-store, cookie-varying, and protected against cross-origin mutation. Raw note text is not placed in diagnostic reports or citation sidecars.

Only loopback Ollama is treated as local. Any other configured destination requires a named acknowledgement tied to provider, normalized destination, purpose, and effective model before note text may be embedded or used by Ask. Revocation blocks retrieval synchronously and queues physical semantic cleanup.

Provider revocation also clears the global new-note AI default. A stale stored preference cannot bypass provider eligibility during note creation.

## Deletion and Cleanup

Note Delete removes the current note, recent revisions, FTS projection, and persisted assistant answers proven to cite that manual note. It leaves the content-free tombstone and queues semantic purge. Ordinary item Delete removes vector rows before relational cascades erase their bridge, then removes note-derived assistant answers and the parent item.

Backups follow their separate retention policy, which is disclosed in the product. Already-started remote provider requests cannot be recalled, but a deletion or opt-out during generation prevents the derived answer from being persisted afterward.

## Rollout and Recovery

UI, write, and semantic-worker flags are independently default off. Semantic processing requires all three flags at claim, provider call, purge, and commit. Startup migrations run even when the feature is disabled.

The production safety sequence is conceptual: verified SQLite backup, flags-off deployment, startup migration, content-free vector/foreign-key audit, exact-manifest repair with atomic post-audit, synthetic lifecycle smoke, then staged enablement. Any unexplained audit drift or unsafe allocator is a no-go. Rollback begins with flags off; schema down-migration is not supported.

## Verification

Release evidence includes 785 passing tests, typecheck, lint, production build, dependency audit, interactive desktop/mobile autosave-search-conflict-preview checks, implementation adversarial review with every P0/P1 closed, and a byte-verified production-snapshot rehearsal. The guarded live rollout then passed verified backup, migrations through 023, exact content-free audit/repair, note save, exact search, remote semantic indexing, Related, Ask with manual-note citation provenance, opt-out, semantic purge, provider revocation, note/item deletion, and zero-leftover cleanup. The final production audit reports SQLite integrity OK, zero foreign-key/vector anomalies, and a safe monotonic allocator.

The global-default follow-on passes 796 tests, client consent/cancellation interaction coverage, full type/lint/build checks, adversarial closure, documentation privacy/structure validation, and a zero-vulnerability production dependency audit. PR #12 merged to `main`, and the guarded production release passed verified backup, full release gates, authenticated health, strict Anthropic/Gemini checks, route/UI presence, and Recall timer preservation. The global preference remains off; existing provider approvals were preserved without modification.

The Note Focus follow-on passes 814 tests across 92 suites, production-build desktop/mobile/history/network/accessibility checks, both rollback rehearsals, and a zero-vulnerability production dependency audit. PR #15 delivered the feature package. The first flag-off production smoke caught signed-out query loss before enablement; PR #16 fixed the auth redirect and added regression coverage. Final production main `6858529` runs with Focus enabled and passes authenticated ordinary Notes, Focus control/route, canonicalization, source-reading precedence, AI-default presence, health, strict providers, webhook boundary, service, and Recall timer checks. No note content or privacy setting was mutated by the release smoke.

Exact suites include item-note repository/route tests; note flags, journal, save queue, provider-policy, formatting/Markdown/navigation tests; note-index worker tests; AI-default API/component tests; and Focus history/isolation/session tests. Configuration is documented in [Configuration Reference](Configuration-Reference). Related explored ideas—richer history/diff, backlinks, annotations, synthesis, learning and append-to-existing-note clients—remain in [Ideas and Exploration](Ideas-and-Exploration-Catalog). Pinned evidence: [current notes source](https://github.com/arunpr614/ai-brain/tree/23868faf13c8e3d0821715e6f5d0e3d2af1e1a34/src/lib/notes).

Canonical implementation evidence lives in the repository under `docs/feature-council/F08-manual-content-notes/`. Public wiki publication intentionally summarizes the current product contract instead of copying private operational evidence or every internal review artifact.

See [Data Model](Data-Model), [Search, RAG, and Ask](Search-RAG-and-Ask), [Security, Privacy, and Redaction](Security-Privacy-and-Redaction), and [Deployment and Operations](Deployment-and-Operations).
