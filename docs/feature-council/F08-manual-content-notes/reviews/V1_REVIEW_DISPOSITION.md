# V1 Review Disposition

**Date:** 2026-07-10
**Inputs:** `QA_REVIEW_v1.md` and timestamped v1 adversarial review
**Outcome:** all specification P0s resolved in PRD/UX/Technical v2; executable gates remain intentionally open until implementation/release evidence exists.

## P0 dispositions

| Finding | Disposition in v2 | Evidence/gate |
|---|---|---|
| Stale/deployed baseline | Accepted. `8178117` is the attested consolidated content baseline; 4d is not sufficient. The merge exposed 020 dropping the 017 transcript trigger, so isolated integration migration 021 restores/backfills it before F08 migrations 022/023. | Production source attestation; merge + migration regression + integrated baseline + full artifact/dry-run gate |
| 0 chunks / 44 vec rows | Accepted. Report-only rowid-set audit, backup, manifest repair/reservation, durable allocator, snapshot rehearsal precede worker. | MIG-02/MIG-03 and first-allocation evidence |
| AI opt-out asynchronous leak | Accepted. Policy is its own generation; retrieval, Ask, Related, worker pre-call/pre-commit synchronously join/check current policy. Async deletion is cleanup only. | AI-02/AI-03/provider-spy tests |
| Mutation ID lifecycle | Accepted. Payload-specific immutable save envelopes; exact retry keeps ID; any changed queued payload gets new ID; acknowledgements match envelope. | SAVE-02/03/04 fake-timer and reload tests |
| Losing conflict version not actually recoverable | Accepted. Server revisions contain server states only; local losing draft remains an editor-instance conflict/copy record until acknowledged/discarded/retention. | SAVE-05/06 forced restart tests |
| Delete resurrection | Accepted. Content-free item-scoped epoch/tombstone persists until parent deletion; explicit Recreate advances epoch. | DEL-01 delayed null/update/job/offline tests |
| Privacy/provider/export defaults | Accepted/final. Private is authenticated/non-shared, not encrypted. Remote use requires provider-named acknowledgement; all exports default notes off; explicit inclusion is labeled/no-store. | PRIV-01/02/03 and provider-spy tests |
| One item-keyed local draft | Accepted. Composite item+editor-instance journal, monotonic sequence, both dirty drafts preserved. | Two-tab forced-crash test |

## P1 dispositions

| Finding | Disposition in v2 |
|---|---|
| Two-way schema contradicts three-way provenance | Four sources: legacy mixed, original, AI digest, manual note. Legacy never labeled Original. |
| Persisted citation/version behavior absent | Streamed/stored citation carries source/version; missing version degrades truthfully. Delete purges note-derived item-chat turns as disclosed. |
| Prototype “passed” overclaims production | UX v2 labels it prototype visual/interaction evidence only; separate implementation design QA is release-blocking. |
| Offline client local-draft deletion impossible | Cleanup distinguishes current-client removed, offline clients pending reconciliation/copy-only, and backup-retained. |
| Non-executable acceptance wording | QA's 36-test matrix is adopted; v2 adds golden Markdown, relevance, cache, mobile, performance, worker, and artifact oracles. |
| Graph hook overclaim | Release claims evaluated note-aware Related plus event contract only; no persisted graph. |
| Editor/size open | Final: native textarea+toolbar+Preview and 100 KiB normalized UTF-8. |
| Flags do not protect startup migration | Final: independent UI/write/worker flags; pre-start backup/snapshot/vector/artifact gate protects migrations. |
| Worker lifecycle unspecified | Leased, supervised, concurrency-one, stale recovery, shutdown, flag/version/policy checks. |
| no-store too narrow | One private/no-store policy covers note, revision, conflict, search, Ask, related diagnostics, and explicit export. |
| Delete/opt-out delayed replay | Persistent epoch tombstone and versioned policy; old drafts become copy-only. |
| Related quality not measurable | Per-source centroid/capped weights plus labeled top-k and note-length adversary fixture. |

## P2/P3 dispositions

- Format is called a defined Markdown/GFM subset, not all GFM.
- Local durability target is p95 ≤50 ms with a warning if not complete by 250 ms; autosave is exactly 750 ms idle/5 s maximum.
- UI terms: My notes, mobile Notes, Your note citations, manual_note internal, Saved version in conflicts.
- Minimal recent recovery ships; advanced diff/history is deferred.
- Production uses actual visual viewport/safe areas rather than prototype height caps.
- Prototype dependencies/build/browser/a11y/artifact hashes must be reproduced as validation, not inferred from screenshots.
- Named autonomous DRIs are recorded in Technical v2; Arun remains accountable product owner under the explicit objective, Codex owns engineering/security/integration/release evidence.

## Remaining executable no-go gates

Specification resolution is not test evidence. Production remains blocked until:

1. `8178117` merge/integrated baseline passes.
2. Production artifact and migration inventory plus rsync dry-run pass.
3. Snapshot migration/vector audit/repair and rollback rehearsal pass.
4. Security/privacy/no-loss/editor/mobile/a11y/search/AI/Related matrices pass.
5. Synthetic production full lifecycle and cleanup pass with health/Recall unchanged.
