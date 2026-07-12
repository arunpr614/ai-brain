# Kanban Card Processing — implementation report

**Implementation date:** 2026-07-12
**Authority:** `product/prd-v2.md`, `ux/ux-ui-v2.md`, `technical/technical-plan-v2.md`
**Deployed application:** `8c1341100b174fe4ca518e6a745c30b9078df21c`
**Status:** Implemented, merged through PRs #25–#28 and direct-Library follow-up PR #31, deployed with schema 025 and all three Processing stages enabled, and live-verified. Documentation publication is recorded separately.

## Delivered product surface

AI Brain now has a private `/processing` workspace with four top-level views:

- **Inbox** for deterministic oldest-current-entry processing;
- **Board** for bounded server-grouped workload review;
- **List** for a compact sortable view;
- **Archived** for explicit Restore and Reprocess journeys.

The surface includes exact four-state totals and matching counts, Processed/Completed Today, Processed/Added/Completed week-to-date, User tag and AI Topic filters, approved group/sort options, bounded Load more behavior, card detail links, native Move/Archive/Restore/Reprocess controls, and a 30-second tab-scoped Undo with permanent reversal paths.

Processing is integrated with desktop navigation, mobile More, Library summary, command palette, capture feedback, and the existing item-detail/notes experience. Selecting up to 100 Library sources exposes a direct **Add to Inbox** action with stable request recovery, exact result accounting, idempotent replay, pending-state protection, and scoped summary refresh. The notes editor remains an independent state owner and is not remounted or submitted by workflow actions.

## Data and domain implementation

Migration `025_item_workflow.sql` adds:

- a validated current workflow projection on `items`;
- immutable terminal mutation receipts;
- append-only workflow events;
- one Undo slot per actor tab;
- frozen/resumable legacy-enrollment jobs;
- owner timezone preferences;
- a singleton readiness checkpoint and workflow/taxonomy epochs;
- partial indexes for Inbox, status, Done, archive, active capture channel, and active capture age;
- raw-insert initialization and projection/history integrity triggers.

Historical rows remain dormant after migration. Genuine new captures created through `insertCaptured` atomically commit the item, Inbox projection, initialization receipt, and initialization event. The raw-insert guard gives an old runtime the same safe initialization property after migration 025. Content repair, transcript recovery, enrichment, embedding, indexing, taxonomy, notes, duplicate handling, and existing Library membership preserve workflow identity.

Exact selected enrollment accepts a selected-only stable request ID and creates its frozen preview atomically. Confirmation classifies each submitted ID as eligible, already enrolled, missing, or deleted; concurrent enrollment resolves as already present. Durable replay returns the same completed job, while a request-ID fingerprint mismatch is rejected. Client recovery looks up the exact job after an uncertain start or confirmation response and rejects any terminal result that does not account for the full submitted set.

Migration execution now records SHA-256 values in `_migrations`. Existing filename-only rows receive a one-time hash baseline after the verified backup; every newly applied migration records its hash in the same transaction as the schema change. Release verification binds the manifest to the migrations inside the runtime and rejects a recorded hash mismatch.

`src/db/item-workflow.ts` implements optimistic compare-and-swap transitions, replay fingerprints, durable terminal outcomes, current-truth replay, exact prior-fact Undo, and affected-item assertions. Current Done time remains separate from the first effective lifetime Done event used by completion metrics.

## Read and API implementation

The query layer provides:

- exact page-independent totals and matching counts;
- HMAC-signed, filter/epoch/scope-bound keyset cursors;
- four independent status groups and bounded non-status group descriptors/items;
- User-tag OR and AI-Topic OR, with cross-facet AND and unassigned sentinels;
- owner-local Today/Monday-week windows using Temporal without rewriting UTC events;
- current Inbox ordering by `workflow_inbox_entered_at ASC, id ASC`.

Private routes are under `/api/processing/**` and `/api/items/[id]/workflow/**`. Every route requires a valid handler session; bearer-only and bearer-plus-invalid-cookie requests remain unauthorized. Responses are allow-listed JSON with `private, no-store`, `Vary: Cookie`, and `nosniff` on success and error paths. Writes require the exact configured HTTPS origin, enforce a streaming 16 KiB body limit, validate bounded Zod contracts, and use a per-valid-session rolling write rate limit before durable work.

## Runtime gates and operations

Three independent default-off flags control reads, writes, and navigation. Effective access also requires a fresh green database checkpoint. Deep checks run outside request paths at deploy/startup and every six hours; request gates perform one bounded singleton lookup.

Production audit additionally requires:

- a valid effective IANA owner timezone;
- a dedicated 64-hex-character Processing HMAC secret;
- an exact public HTTPS origin;
- valid read/write/navigation flag ordering;
- exact packaged/applied migration hashes.

The immutable release path packages standalone runtime files, public/static assets, allow-listed operator tools, native dependency versions, runtime ABI, exact file hashes, and migration hashes. Deployable artifacts are produced only from protected main, receive GitHub build-provenance attestations, and are checked against repository/workflow/ref/source identity before transfer. Activation uses a canonical database path identity, verified SQLite backup, unprivileged bounded extraction, immutable release directories, atomic current-link switching, complete system-state snapshots, and automatic rollback on any post-cutover failure.

## Local verification snapshot

The integrated candidate has passed:

- TypeScript and ESLint;
- all 894 tests across 95 suites, including direct selected enrollment/recovery, streaming-limit, write-rate-limit, migration-hash, and production-configuration assertions;
- production Next.js build (with only the pre-existing `unpdf` `import.meta` warning);
- documentation privacy/structure/coverage checks;
- processing-readiness and immutable-artifact smoke suites;
- deterministic 10k/50k performance budgets;
- desktop/mobile visual comparison and the corrected 320/390 px four-tab layout.

The authoritative final counts and commands belong in `qa/verification-report.md`. Production-copy migration/rollback rehearsal, protected artifact attestations, immutable cutover, read/write/navigation observation windows, live API/domain lifecycle, authenticated deployed browser tasks for the original workflow, direct-Library local responsive interaction, and production selected-enrollment behavior have passed. Repository documentation and GitHub Wiki publication are recorded separately.

## Scope explicitly not added

The implementation does not add drag-and-drop, bulk workflow-state mutations, manual rank, project dates, assignees, sprints, WIP limits, collaboration, offline mutation queues, quick preview, a global archive, or a replacement AI taxonomy.
