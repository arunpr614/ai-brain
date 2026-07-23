# YouTube Item Recovery Migration Collision Resolution

**Decision date:** 2026-07-23 (Asia/Kolkata)
**Source baseline:** `origin/main@f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`
**Current migration frontier:** `026_notebooklm_export.sql`
**Decision:** allocate the browser-transcript foundation to nominal `027`, manual-enrichment expand to nominal `028`, and deferred contract/cleanup to nominal `029`

## Decision summary

The DOM-capture plan's proposed `026_youtube_browser_transcript.sql` cannot be implemented under that name. Current protected `main` already contains the applied-release migration `026_notebooklm_export.sql`:

| Evidence | Value |
|---|---|
| Filename | `src/db/migrations/026_notebooklm_export.sql` |
| Git blob | `84d96b2cc5a5f442f8f5931915d6bb7908f6fda4` |
| SHA-256 | `1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f` |
| Schema effect | Adds seven NotebookLM connector/export/control/event tables, their constraints/indexes, and one runtime-control singleton; it does not add browser-transcript state |
| Present on final main | Yes |
| Present on merged #42, #48, and #50 heads | Yes, byte-identical migration tree |

At the final snapshot there are 28 SQL migration files, the maximum numeric prefix is `026`, and no pending PR inspected introduced a migration file. Therefore the next safe new prefix is `027`.

This is a numbering resolution, not a declaration that the migration implementation gate has passed. The actual `027_youtube_browser_transcript.sql` content, SHA-256, Git blob, schema snapshot, preflight results, binary/schema results, and adversarial review remain to be produced and frozen.

## Migration-runner semantics

Current [`src/db/client.ts`](../../../src/db/client.ts) establishes these rules:

1. SQL files are sorted lexicographically; the `NNN_` convention is expected to make that numeric order.
2. `_migrations.name` is the durable unique identity. The numeric prefix alone is not the ledger key.
3. Every newly applied file stores its SHA-256 in the same transaction as its schema changes.
4. A changed hash for an already applied filename refuses startup.
5. Older filename-only ledger rows are assigned their current source hash before later migrations apply.
6. A migration failure prevents startup; foreign-key-sensitive table rebuilds preserve the pre-existing foreign-key violation manifest.

The runtime migration loop does not reject an applied filename that is absent from an older package; it simply does not iterate that file. Release activation is stricter. [`scripts/check-release-migration-compatibility.mjs`](../../../scripts/check-release-migration-compatibility.mjs) compares the live ledger to the packaged manifest and rejects unknown files unless they are explicitly audited additive rollback migrations with exact hashes and state-specific safety checks.

Current source already audits both `025_item_workflow.sql` and `026_notebooklm_export.sql`. The DOM plan's statement that release tooling special-cases only 025 is stale under the governing source precedence. No rule exists for 027, and none should be added until old-binary compatibility and pristine-state rollback safety are proven.

## Current-main migration inventory

The following SHA-256 values are from the exact 28-file migration tree on `main@f905f6a1`. The SHA-256 of this displayed, basename-only, sorted `hash  filename` manifest is `34968918d6be44f52bb96b4404d9236e342a413733b0c84375855e02a5e2d60a`.

```text
1bcd7e62f449f067f5cf3be3021a71179dac810d8b02663006b373fc0888a19e  001_initial_schema.sql
a182c994f5978d84c277b99158eb20640655fb3a11fbde04b28bfe6411bc0fb8  002_fts5.sql
aaad83664f03f595991aa0eb08940a448a06987e9f751b1f19036b2212d6f640  003_enrichment_queue.sql
9444fa6d25f5bf5efb62920a6856af765ff31e3cbe5ff350a261f6e4f09e9de6  004_items_add_quotes.sql
8b14cf82441412f1d7d9f80e2b0cfac7a2aff5213221646de18d893d8ab6984a  005_vector_index.sql
4f74f1b9279dd2d087156fe01ea74b4a510cb5763d8ce887bb332134dc3a9088  006_embedding_jobs.sql
37969802fcefe5473d5274e3ff8cb539bfc79437a50b178b877957ffd483ea2a  007_youtube_duration.sql
3f1dae867d694cae2202ed56d1341380e0269e96bfd29eedefbdd4f85c9801ee  008_batch_id.sql
2a81426c3e3598a3ef56b85d7f4ef8f516d7ef8383e09395a1de4610542d7905  009_telegram_source_type.sql
531f689151ac8260a8d03a8571a76435423a4b29ec1527e5d59809e185e3dd95  010_device_pairing_codes.sql
059668590795880a846be45bc6ec9f02093a3ffaf8253064c52fd79b045d9640  011_telegram_updates.sql
d82d062ef8ee862cede5e44e118c6680cc46a1807f68b4e74a33e36014c943af  012_capture_source.sql
111b80ad0c8f7ab4b10ff677152490d4d1a67a2f773b646eb02562c2bebef29a  013_capture_quality.sql
980655a2093af476175f42f083fa90193b5070289afedd1b8604e887cb485b61  014_capture_artifacts.sql
08e9126700e42ff73c8437dc79e88d3e61cbdd319e5f82fd8ab5e1e596e6eb74  015_capture_metadata_cache.sql
d3581fc47b5aca2b1e2e6fd94d226aa38894b368680302783ed114a0aa7ecf6b  016_capture_artifacts_hardening.sql
af47ed0bc0da8550382f6cde7193ab3959a163378611291dae40fa66bf61b2c6  017_topics.sql
cc12728f1ecac7f58ece34ae957813653e63365330919fe3c8b8e0d3a6c1d1f7  017_transcript_recovery.sql
e6185834406c6da4596d4af514cf9c97737b125ba8554fe0012506e3e1b377cf  018_topics.sql
96d3fddf114ad0bbe5da61fe81116f6495b398d30ea2e8076d3a5899b188c99b  018_transcript_policy_sources.sql
d35257a78eaf5c0a16cbb0e394ef4966854abc11059a088032a63198d0437aa3  019_transcript_segments.sql
353b31cfbac6e2191226ba24ed8dc6ac2d4d01480bea59008563a334e1302dac  020_recall_sync.sql
057af8740a6a5fa6f1aba5b83da33365e9843de8444537ae87bbb7707a9336f7  021_restore_transcript_recovery_trigger.sql
9d4487d2ee0289e4aa6ef07bd1fb6cd5febb0c5cd229c327d2814179f9592619  022_item_notes.sql
306d4d243573b977d3b706d92a78e21c2cd1b06b332e30883946b267323242a3  023_source_aware_chunks.sql
7872a07af79caca6c67b8da7ef49d565e595b2621f8cbcc6cd19ce76674e221a  024_recall_manual_sync.sql
7537dd6d345b1c517802c957fd9dbe24b263818ca44aac5148492198806b42e3  025_item_workflow.sql
1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f  026_notebooklm_export.sql
```

### Schema-effect inventory

| Migration | Principal schema effect |
|---|---|
| 001 | Initial settings, items, chunks, collections, tags, cards, chat, and constrained `llm_usage` tables |
| 002 | Item FTS5 index, backfill, and synchronization triggers |
| 003 | Enrichment queue table, claim index, insert enqueue trigger, and backfill |
| 004 | Nullable item quotes field |
| 005 | Vector virtual table and chunk-to-rowid bridge |
| 006 | Embedding job queue, indexes, trigger, and backfill |
| 007 | YouTube duration field |
| 008 | Rebuilds items/enrichment jobs to add batch state and IDs while restoring indexes/triggers |
| 009 | Rebuilds items to admit Telegram source type and restores indexes/triggers |
| 010 | Temporary device-pairing code table and expiry/use indexes |
| 011 | Telegram update ingestion state and uniqueness/claim indexes |
| 012 | Item capture-source column and index |
| 013 | Capture-quality, platform, extraction, published, thumbnail, and description metadata plus backfills/indexes |
| 014 | Capture-artifact provenance table and indexes |
| 015 | Capture metadata cache and lookup index |
| 016 | Capture-artifact path/truncation/write-status hardening |
| 017 topics | Topic and item-topic tables/indexes |
| 017 recovery | Transcript recovery jobs, attempts, enqueue trigger, and weak-capture backfill |
| 018 topics | Byte-equivalent topic DDL to 017 apart from its comment; idempotent legacy duplicate |
| 018 policy/sources | Capture policy decisions and transcript source provenance tables/indexes |
| 019 | Ordered transcript segment persistence and indexes |
| 020 | Items rebuild for Recall plus Recall item/run/state tables and restored triggers/indexes |
| 021 | Restores the YouTube transcript-recovery trigger after the 020 rebuild |
| 022 | Item notes, revisions, mutation receipts, note indexing, provider consents, and FTS triggers |
| 023 | Source-aware chunks rebuild, vector rowid sequence, and semantic events |
| 024 | Recall manual-sync executions/requests and correlations |
| 025 | Item workflow fields, receipts, events, undo/enrollment, preferences/runtime state, triggers, and indexes |
| 026 | NotebookLM connector pairing, connector/target state, operational/runtime control, export requests/events, and indexes |

## Legacy prefix collisions

The current tree already has two historical numeric-prefix collisions:

```text
017_topics.sql
017_transcript_recovery.sql

018_topics.sql
018_transcript_policy_sources.sql
```

The runner safely distinguishes them because their full filenames are unique. They are nevertheless violations of the intended one-prefix-per-migration convention and must not become precedent.

Resolution:

1. Do not rename, delete, edit, or consolidate these applied files. A rename would create a new ledger identity, could reapply DDL on deployed databases, and would break hash/manifest compatibility.
2. Freeze these exact two prefix groups as a grandfathered allowlist.
3. Add a migration-prefix uniqueness check before 027 merges. It must fail every future duplicate prefix and fail if either legacy group changes membership.
4. Continue to verify full filename and SHA-256 as the durable identity.
5. Document fresh-install ordering: `017_topics`, `017_transcript_recovery`, `018_topics`, `018_transcript_policy_sources` under lexical sort.

The goal's “no two migrations claim the same identifier” gate is satisfied prospectively by forbidding any new duplicate. Eliminating already-applied legacy duplicates would require a separately reviewed ledger-normalization program and is not safe as part of this feature.

## New migration allocation

| Nominal filename | Purpose | Allocation state |
|---|---|---|
| `027_youtube_browser_transcript.sql` | Browser-source/policy literals, monotonic item revision, durable hashed intents/upload grants, one-active-source constraint, immutable extension receipts, source/body processing holds, claim/revision fences, trigger/backfill exclusions | Next free slot; content/hash not yet frozen |
| `028_manual_transcript_enrichment_expand.sql` | Additive authorization, receipt, run, attempt, provider-usage, generation, lease, and dual-write compatibility shape | Depends on frozen 027; content/hash not yet frozen |
| `029_manual_transcript_enrichment_contract.sql` | Deferred strict rebuild/removal of legacy fields, states, triggers, and compatibility surfaces | Reserved nominally; must not ship until rollback binaries are blocked |

### Shift-together rule

Immediately before creating a migration branch:

1. compute the maximum prefix across current protected `main` and every pending PR that adds or renames an SQL migration;
2. allocate the browser foundation to `max + 1`;
3. allocate the unshipped manual expand and contract steps consecutively after it;
4. if an unrelated migration lands before any of these files ships, shift every unshipped filename and all tests/docs together;
5. once a migration is merged or applied, its full filename and hash are immutable—recompute only the remaining unshipped identifiers.

Thus `027`/`028`/`029` are correct for `main@f905f6a1`, but they are not globally reserved forever.

## Required 027 schema contract

The implementation must preserve all existing rows and literals while adding:

- `browser_visible_transcript` to capture method/source-kind constraints;
- `processing_mode = not_applicable | hold` on policy decisions;
- `items.content_revision INTEGER NOT NULL DEFAULT 1` and a monotonic body-change trigger;
- expected-content-revision and claim identity on transcript, enrichment, embedding, recovery, and other body-derived asynchronous writers;
- a partial unique index enforcing one `status='active'` transcript source per item;
- immutable `extension_capture_requests` receipts;
- durable, content-free, hashed-handle exact-item intents with user/item/revision/video/extension/contract binding, claim/inspect/expiry/revocation/consumption facts, and item-deletion cascade;
- durable one-time upload grants containing only a token hash and immutable intent/request/body-digest/byte-count/cue-count/approved-extension-origin/version/expiry/revocation/consumption binding; no transcript, URL, page title, bearer, or raw grant;
- restart-safe receipt reconciliation and uniqueness that atomically consumes the current intent/grant with the terminal attachment receipt;
- exact-item/source/policy `content_processing_holds` with held/released shape constraints;
- link-only exclusion in `items_enqueue_youtube_transcript_recovery` and every application backfill;
- item/source/revision/claim/cleanup indexes and deterministic deletion cascades.

027 cannot silently auto-supersede duplicate active sources or infer provenance for transcript-bearing items. Its preflight must stop for an explicit cleanup decision.

The browser-transcript hold is source/body-processing scoped. It blocks transcript recovery, generic body enrichment, batch, original-body embedding, interactive digest/index before separate authorization, and any claimant whose input separation is unproven. It does not silently disable a pre-existing independently authorized note whose indexing input is provably limited to the note and title. Recovery-created optional notes remain `include_in_ai=false`, and `manual-transcript-lab` starts no note-index worker.

True link-only release depends on this migration's durable method literal plus SQL-trigger, application-backfill, and standalone-backfill exclusions. Link-only cannot ship in parallel with an unfrozen 027 because schema 021 otherwise enqueues weak YouTube rows.

## Freeze record required before merge

Populate this table only after the SQL is implemented and independently reviewed:

| Field | Required frozen value |
|---|---|
| Source base | Exact protected-main SHA |
| Filename | Final allocated filename |
| Git blob | Exact blob SHA |
| SQL SHA-256 | Exact 64-hex hash |
| Migration manifest hash | Sorted complete manifest hash |
| Pre-schema snapshot hash | Canonical relevant `sqlite_schema`, PRAGMA, row-count, and non-content data manifest |
| Post-schema snapshot hash | Canonical expected schema manifest |
| Prior binary | Exact release artifact/app SHA used for rollback rehearsal |
| Test evidence | Clean, upgrade, intermediate, mixed binary/schema, failure atomicity, restore, and production-negative reports |
| Review | Independent migration adversarial-review path and go/no-go decision |

Suggested canonical schema extraction for a disposable database:

```sql
SELECT type, name, tbl_name, COALESCE(sql, '')
FROM sqlite_schema
WHERE name NOT LIKE 'sqlite_%'
ORDER BY type, name, tbl_name;
```

Also record `PRAGMA table_info`, `foreign_key_list`, `index_list`, `index_info`, `foreign_key_check`, and `integrity_check` for each affected table. Hash the normalized output; do not rely on a migration number alone.

## Preflight and failure atomicity

Before 027 on any nonempty database:

1. require the exact 026 filename and SHA-256 above;
2. inventory every policy method, source kind/status, retention class, job state, and migration-ledger row;
3. stop if any item has multiple active transcript sources;
4. stop if a transcript-bearing item lacks source provenance or requires implicit authority inference;
5. capture row counts, stable non-content hashes, indexes, triggers, and the foreign-key manifest;
6. verify a fresh backup and rehearse on a disposable production-shaped copy;
7. disable capture, enrichment, batch, embedding, and recovery writers during rehearsal/cutover;
8. prove a failed preflight or SQL statement leaves neither partial schema objects nor a 027 ledger entry.

## Binary/schema compatibility matrix

Definitions:

- **B26**: current production-capable binary at the f905 baseline, packaged through schema 026.
- **B27**: containment/browser-foundation binary that understands schema 026 and 027 while all browser features remain off in production.
- **B28**: manual-enrichment transition binary that dual-reads/writes the additive 028 shape.
- **B29**: post-cutover binary that alone may apply/use the deferred 029 contract shape.
- **S25/S26/S27/S28/S29**: databases whose latest applied migration is that version.

| Case | Binary + starting schema | Required result |
|---|---|---|
| Current control | B26 + S26 | Boot and full existing suite pass; establishes the control snapshot |
| Clean install | B27 + empty DB | Apply 001 through 027 once in lexical order; exact ledger hashes; no unexpected rows/jobs/holds; integrity/FK checks pass |
| Two-step historical upgrade | B27 + S25 | Apply exact 026 then exact 027; preserve all S25 data and prove both ledger hashes |
| Current production upgrade | B27 + production-shaped S26 | Preflight, backup, apply 027 once, preserve row counts/hashes/FK manifest, keep all new features disabled |
| Legacy ledger upgrade | B27 + S26 with pre-hash `_migrations` rows | Baseline exact old hashes, then apply 027; any mismatch fails before feature startup |
| Historical literal matrix | B27 + S26 fixtures containing every valid method/source/status/retention/job literal | Preserve old values; accept only reviewed new values; reject unknowns |
| Unsafe source preflight | B27 + S26 with duplicate active sources or unprovable provenance | Fail closed with no partial schema and no 027 ledger row |
| New binary / old schema | B27 + S26 at process start | Migration completes before any route/retention/recovery/enrichment/embed worker starts; failure refuses startup |
| Idempotent current | B27 + S27 | No DDL replay; exact hash accepted; production-negative and ordinary-workflow tests pass |
| Old binary / expanded pristine schema | B26 + pristine S27 | Direct boot/read test may pass only as evidence; release activation must remain blocked for unknown 027 until an audited compatibility rule exists |
| Old binary / expanded used schema | B26 + S27 with any browser source, receipt, hold, new literal, or revision-fenced in-flight work | Hard fail; binary rollback is unsafe and must be rejected |
| Additive manual expand | B28 + S27 | Apply 028 once, retain legacy columns/states/triggers, initialize nullable/defaulted shape, keep execution off |
| Prior containment binary / S28 | B27 + pristine S28 | Must be explicitly rehearsed; may be supported only if B27 safely ignores additive objects and no new-state writes occurred |
| Transition current | B28 + S28 | Dual-read/write parity, worker hold fences, provider-usage totals, status projection, and deletion tests pass |
| Contract cutover | B29 + S28 | Apply 029 only after drain/parity/rollback-block gates; post-contract suite passes |
| Any pre-contract binary / S29 | B26, B27, or B28 + S29 | Release tooling must reject before startup; no binary rollback |
| Restore rehearsal | B27 + restored pre-027 backup | Restore only for proven migration corruption and before accepting new-schema writes; verify hashes/FK/integrity and quantify unrelated-data loss window |

Required fixture variants include pristine and populated NotebookLM 026 state, every historical transcript literal, link-only items, one and duplicate active sources, held/released rows, every queue state, in-flight claims, deletion during claim, stale revisions, null legacy hashes, and a controlled pre-existing foreign-key manifest.

## Rollback decision

Normal rollback is forward containment:

1. keep schema 027/028 applied;
2. disable UI write and execution flags;
3. reject browser routes before request-body processing;
4. stop workers from claiming held or unauthorized work;
5. repair forward on a feature-aware binary.

Do not down-migrate. Do not restore a database for an application defect. Database restore is reserved for independently proven migration corruption and requires an operator decision because it can discard unrelated newer data.

B26 rollback from S27 is blocked by default. A future audited exception requires all of the following:

- exact 027 hash in release tooling;
- a proven old-binary boot against a pristine post-027 snapshot;
- a safety evaluator that rejects any browser source, receipt, hold, new literal, revision-dependent job, or unresolved new-schema work;
- passing production-negative and ordinary-workflow tests;
- an adversarial review approving the specific prior release artifact.

Because 027 rebuilds constrained tables/triggers and introduces unconditional worker safety semantics, it must not be added to `AUDITED_ADDITIVE_ROLLBACK_MIGRATIONS` based only on successful DDL or a smoke boot.

## Reproducible evidence commands

```bash
PROJECT='/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4'
BASE='f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8'

gh api "repos/arunpr614/ai-brain/git/trees/$BASE?recursive=1" \
  --jq '.tree[] | select(.path|test("^src/db/migrations/[0-9]{3}_.+[.]sql$")) | [.path,.sha] | @tsv'

git -C "$PROJECT" ls-tree -r --name-only "$BASE" -- src/db/migrations \
  | sed -n 's#^src/db/migrations/\([0-9][0-9][0-9]\)_.*[.]sql$#\1#p' \
  | sort | uniq -d

git -C "$PROJECT" ls-tree -r --name-only "$BASE" -- src/db/migrations \
  | awk '/[.]sql$/{count++} END{print count}'

find "$PROJECT/src/db/migrations" -maxdepth 1 -type f -name '*.sql' -print0 \
  | sort -z | xargs -0 -n1 shasum -a 256

shasum -a 256 "$PROJECT/src/db/migrations/026_notebooklm_export.sql"

for pr_number in $(gh pr list --repo arunpr614/ai-brain --state open --limit 100 --json number --jq '.[].number'); do
  gh api --paginate "repos/arunpr614/ai-brain/pulls/$pr_number/files" \
    --jq '.[] | select(.filename | startswith("src/db/migrations/")) | {filename,status,sha}'
done
```

Observed results at the freeze:

- SQL file count: `28`;
- maximum prefix: `026`;
- duplicate prefixes: `017`, `018` only, with the exact grandfathered memberships above;
- 026 Git blob: `84d96b2cc5a5f442f8f5931915d6bb7908f6fda4`;
- 026 SHA-256: `1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f`;
- no inspected open PR added, removed, or renamed a migration;
- current main and final #42/#48/#50 migration trees: identical.

## Gate status

**Numbering decision: GO.** Use 027/028/029 on the frozen f905 frontier, subject to the shift-together recheck.

**Migration implementation: NO-GO pending evidence.** No SQL for 027 exists yet, so its hash, schema snapshot, compatibility, rollback safety, and adversarial approval cannot be claimed. Do not advance to browser capture or manual enrichment enablement until those artifacts are complete.
