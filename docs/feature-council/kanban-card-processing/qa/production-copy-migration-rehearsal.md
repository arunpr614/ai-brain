# Kanban Card Processing — isolated current-production-copy rehearsal

**Date:** 2026-07-12
**Verdict:** **Pass** for migration, transactional interruption, lock recovery, enrollment resume, raw old-runtime initialization, backup/restore, and explicit schema-025 known-good compatibility.
**Production impact:** Production content/schema/service were not changed. One SQLite online backup was copied through an owner-only temporary path and the remote temporary path was removed. Final production recheck remained service active, 129 items, 26 migrations through 024, quick check `ok`, and zero FK violations.

## Bound baseline

The rehearsal source was an online SQLite backup of the database selected by production `BRAIN_DB_PATH`; no item content was printed or placed in repository artifacts.

| Signal | Value |
|---|---:|
| Baseline bytes | 7,520,256 |
| Baseline SHA-256 | `d3ece41f65a9966c39101666841b5735054299fa6832992307ae58f63c75b767` |
| Retained items | 129 |
| Applied migrations | 26 |
| Latest migration | `024_recall_manual_sync.sql` |
| Quick check | `ok` |
| FK violations | 0 |

## Production-ledger drift discovered and resolved

The current production ledger contained historical `018_topics.sql`, while latest main packaged the later equivalent `017_topics.sql` but not the historical filename. Strict artifact/readiness verification correctly treated this as incompatible.

The exact historical `018_topics.sql` bytes were recovered from Git commit `3bead0c`; SHA-256 is `e6185834406c6da4596d4af514cf9c97737b125ba8554fe0012506e3e1b377cf`. The idempotent migration is restored to current main alongside `017_topics.sql`. Candidate/fresh runtimes package both names, and the known-good workflow restores the same content-hashed identity before building the old application. Decision KCP-040 records the resolution.

## Normal migration and audit

The copy was migrated by the real strict readiness command with dark flags, owner timezone, exact origin, and a dedicated synthetic rehearsal HMAC.

| Result | Value |
|---|---:|
| Command wall time | 383 ms |
| Applied migrations after | 27 |
| Applied hashes missing | 0 |
| Dormant legacy rows | 129 |
| Enrolled rows immediately after migration | 0 |
| Missing initialization | 0 |
| Candidate DB bytes | 7,626,752 |
| Residual WAL after process close | 0 |
| Strict audit/checkpoint | green / ready |
| Migration/config failures | none |
| Quick/FK | `ok` / 0 |

Migration 025 did not flood Inbox or create historical events/receipts.

## Forced transaction interruption and resume

On a fresh baseline copy, migration 025 ran inside `BEGIN IMMEDIATE` and was deliberately aborted before commit. Closing the connection rolled the transaction back completely:

- exit status was nonzero;
- zero workflow columns remained;
- zero workflow tables remained;
- no 025 ledger row existed;
- quick check remained `ok` and FK violations remained zero.

The real readiness audit then applied 025 normally, recorded its hash, and returned quick/FK `ok`/0.

## Lock contention and recovery

A separate process held `BEGIN IMMEDIATE` for seven seconds while the real audit attempted migration:

- the audit failed closed after approximately 5,615 ms, matching the bounded busy timeout;
- no 025 ledger row or workflow column was partially committed;
- after lock release, the same command applied hashed 025 and returned quick/FK `ok`/0.

## Enrollment interruption and resume

An All preview froze the exact 129 dormant rows. After confirmation, the first process enrolled 40 rows and was terminated before its scheduled continuation. A new process called the real startup resume hook:

| Signal | Value |
|---|---:|
| Frozen | 129 |
| Interrupted processed | 40 |
| Jobs resumed | 1 |
| Final state | completed |
| Final processed/enrolled | 129 / 129 |
| Already enrolled / deleted | 0 / 0 |

No duplicate enrollment occurred.

## Raw old-runtime guard and cleanup

A synthetic direct old-shape `items` INSERT produced:

- `inbox`, workflow version 1;
- non-null enrollment and last-event projection;
- exactly one `raw_initialized` event;
- exactly one `raw_initialize` accepted receipt.

The normal application hard-delete path then removed the synthetic item plus its enrichment/workflow dependents. Remaining synthetic item/event/receipt/enrichment rows were zero and FK violations were zero.

One discarded exploratory CLI deletion was attempted before using the application delete path; SQLite CLI connections default to `foreign_keys=OFF`, so it left a synthetic enrichment child in the isolated copy. The child was identified, removed, and the copy returned to FK-clean state before final evidence. This does not affect production, and confirms that destructive operator smoke must use the application delete path or explicitly enable SQLite foreign keys.

## Backup and restore equality

After the resumed enrollment and synthetic cleanup, SQLite `.backup` produced a 7,868,416-byte mode-0600 rehearsal backup with SHA-256 `803fc45ea14a312b4cdd0d4cbf30092a7c45061f6bf36055cb0c7619f10a4fa8`. A separate restore copy passed quick/FK `ok`/0 and matched the source logical counts exactly:

`items:events:receipts:enrollment_jobs:migrations = 129:129:130:1:27`

The extra content-free receipt is the enrollment-job confirmation receipt.

## Known-good schema-025 compatibility

The rehearsed known-good manifest contains 26 exact migrations through 024, including restored historical `018_topics.sql`; the migrated copy contains those 26 plus 025.

- recorded hash mismatches: none;
- unknown to known-good: exactly `025_item_workflow.sql`;
- rollback without the explicit schema-025 guard: rejected;
- rollback with `BRAIN_ALLOW_SCHEMA_025_ROLLBACK=1`: accepted.

The old-runtime raw-insert guard remains in the database, so captures written by known-good code after rollback still initialize Processing identity safely while Processing flags remain off.

## Final production recheck

After remote temporary cleanup:

```json
{"service":"active","quick":"ok","foreignKeys":0,"items":129,"migrations":26,"lastMigration":"024_recall_manual_sync.sql"}
```

This closes the isolated production-copy rehearsal gate. Linux known-good/candidate artifact attestation, installed switch transaction, and authenticated rollback health remain protected-main/production gates.
