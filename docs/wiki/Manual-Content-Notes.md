# Manual Content Notes

Purpose: Explain the private Markdown note attached to each saved library item.
Audience: AI agents, engineers, product collaborators, and operators maintaining item notes.
Verified against: original release `8654f293d0f8615617df883e4703c0ca098a6029` and global-default integration `01721d1c2bbb686b9768d38c688352f78933205f`.
Runtime evidence through: 2026-07-10 global-default production deployment, authenticated read-only setting/UI smoke, strict provider check, and scheduler/service health verification.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Product Contract

Every saved item can have one owner-authored **My notes** document. It is an attached layer, not another library item. Original material, AI digest, and My notes remain visibly and persistently separate.

The note uses canonical UTF-8 Markdown. The editor provides basic formatting controls, Write and safe Preview modes, explicit Save, autosave, offline-local recovery, conflict review, recent checkpoints, restore, clear, delete, recreate, and explicit note-only export. Opening an empty editor does not create a record.

## Data and No-Loss Model

Migration 022 adds separate note state, current note, revision, idempotency receipt, semantic job, provider-consent, and note FTS tables. An item-scoped epoch/generation record survives note deletion as a content-free tombstone so delayed offline drafts cannot silently recreate deleted text.

Each editor instance writes a monotonic IndexedDB journal before attempting a server save. The server uses compare-and-swap epoch/generation plus a mutation receipt. An exact retry is acknowledged only while the originally accepted state remains current; a later canonical change opens conflict review with both saved and local versions.

## Search, Ask, and Connections

Accepted note text enters a separate FTS index inside the save transaction. Search returns the parent item once, marks a note match explicitly, and uses a bounded plain-text snippet.

Migration 023 gives semantic chunks an explicit source kind: legacy saved context, original content, AI digest, or manual note. Ask prompts and streamed/persisted citations keep this provenance and source version. Related items compute one centroid per item/source and apply bounded manual-note influence; the release does not claim a persisted graph UI.

Manual notes are excluded from AI and connections until the per-note switch is enabled. Retrieval rechecks deletion, inclusion, epoch, generation, rollout flags, and provider permission before prompt construction and again before answer persistence.

Settings > My notes provides an owner-controlled **Include in AI & connections by default** preference. It applies only when a note is first saved or deliberately recreated; changing it never rewrites an existing note's per-note choice. The effective default remains off until every active note-consuming provider is eligible, while exact search continues independently.

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

Canonical implementation evidence lives in the repository under `docs/feature-council/F08-manual-content-notes/`. Public wiki publication intentionally summarizes the current product contract instead of copying private operational evidence or every internal review artifact.

See [Data Model](Data-Model), [Search, RAG, and Ask](Search-RAG-and-Ask), [Security, Privacy, and Redaction](Security-Privacy-and-Redaction), and [Deployment and Operations](Deployment-and-Operations).
