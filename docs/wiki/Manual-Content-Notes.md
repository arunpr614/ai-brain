# Manual Content Notes

Purpose: Explain the private Markdown note attached to each saved library item.
Audience: AI agents, engineers, product collaborators, and operators maintaining item notes.
Verified against: `4403a487ba137bc080ec6070021aeafa1ec3dad4` and integrated baseline `a50ba828cded2442e8cb417693a40d81b45446f8`.
Runtime evidence through: 2026-07-10 release-candidate validation; production enablement was not yet claimed at this review point.
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

## Privacy Boundary

My notes are private application data, not end-to-end encrypted data. They are stored in the browser profile, server SQLite, and retained backups. Default library export excludes them. An explicit note export is authenticated and labeled.

Note-bearing APIs are authenticated, dynamic, private/no-store, cookie-varying, and protected against cross-origin mutation. Raw note text is not placed in diagnostic reports or citation sidecars.

Only loopback Ollama is treated as local. Any other configured destination requires a named acknowledgement tied to provider, normalized destination, purpose, and effective model before note text may be embedded or used by Ask. Revocation blocks retrieval synchronously and queues physical semantic cleanup.

## Deletion and Cleanup

Note Delete removes the current note, recent revisions, FTS projection, and persisted assistant answers proven to cite that manual note. It leaves the content-free tombstone and queues semantic purge. Ordinary item Delete removes vector rows before relational cascades erase their bridge, then removes note-derived assistant answers and the parent item.

Backups follow their separate retention policy, which is disclosed in the product. Already-started remote provider requests cannot be recalled, but a deletion or opt-out during generation prevents the derived answer from being persisted afterward.

## Rollout and Recovery

UI, write, and semantic-worker flags are independently default off. Semantic processing requires all three flags at claim, provider call, purge, and commit. Startup migrations run even when the feature is disabled.

The production safety sequence is conceptual: verified SQLite backup, flags-off deployment, startup migration, content-free vector/foreign-key audit, exact-manifest repair with atomic post-audit, synthetic lifecycle smoke, then staged enablement. Any unexplained audit drift or unsafe allocator is a no-go. Rollback begins with flags off; schema down-migration is not supported.

## Verification

Release-candidate evidence includes 785 passing tests, typecheck, lint, production build, dependency audit, interactive desktop/mobile autosave-search-conflict-preview checks, implementation adversarial review with every P0/P1 closed, and a byte-verified production-snapshot rehearsal ending with SQLite integrity OK, zero foreign-key/vector anomalies, and a safe allocator.

Canonical implementation evidence lives in the repository under `docs/feature-council/F08-manual-content-notes/`. Public wiki publication intentionally summarizes the current product contract instead of copying private operational evidence or every internal review artifact.

See [Data Model](Data-Model), [Search, RAG, and Ask](Search-RAG-and-Ask), [Security, Privacy, and Redaction](Security-Privacy-and-Redaction), and [Deployment and Operations](Deployment-and-Operations).
