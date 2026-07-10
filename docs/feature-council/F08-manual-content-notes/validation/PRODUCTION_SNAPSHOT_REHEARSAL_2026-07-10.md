# F08 Production Snapshot Migration and Repair Rehearsal

**Date:** 2026-07-10  
**Scope:** Content-free validation on a WAL-safe byte-verified production backup  
**Production writes during rehearsal:** None  
**Verdict:** PASS

## Snapshot integrity

- Server-side SQLite `.backup` completed to a mode-0600 file in the existing production backup directory.
- The transferred snapshot was mode 0600, SHA-256 identical to the server backup, and `PRAGMA quick_check` returned `ok`.
- Baseline contained 122 saved items and 22 applied migration files through `020_recall_sync.sql`.
- The public report records only counts, rowids/audit identifiers, and integrity state; it contains no titles, bodies, note text, embeddings, credentials, or provider payloads.

## Pre-migration classification

| Class | Count |
|---|---:|
| Relational chunks | 0 |
| Bridge rows | 0 |
| vec0 rows | 44 |
| Mapped rows | 0 |
| vec0 without bridge | 44 |
| Foreign-key violations | 2 stale queue rows for the same deleted parent |
| Allocator | Not present before migration |

The two foreign-key violations were in `embedding_jobs` and `enrichment_jobs`. No content column was read or emitted.

## Migration result

- The real migration runner applied `021_restore_transcript_recovery_trigger.sql`, `022_item_notes.sql`, and `023_source_aware_chunks.sql`.
- Migration count became 25 through `023_source_aware_chunks.sql`.
- Migration 023 seeded the durable allocator to 45, beyond both bridge and vec0 high-water marks.
- A separate runner-shaped populated test proves a valid existing chunk/bridge/vector mapping survives 023; the runner disables foreign keys before the migration transaction and requires the pre/post violation manifest to remain identical.

## Approved repair

**Approved pre-repair audit ID:** `362a10a6e642abedfe937ed2ac5bbc24f5f552ad6eda220603f6b9471983e696`

The repair tool required all of the following: exact database path, audit report, matching audit ID, explicit backup confirmation, and an output report. It re-audited the database before writing and repaired only:

- 44 vec0 rows with no bridge;
- one orphan `embedding_jobs` row;
- one orphan `enrichment_jobs` row.

Queue-table repair is fixed-allowlist only. Unknown foreign-key violations fail closed. Post-audit runs inside the same transaction, so non-convergence rolls back the entire repair.

## Post-repair result

| Gate | Result |
|---|---:|
| SQLite integrity | `ok` |
| Foreign-key violations | 0 |
| Chunks / bridge / vectors / mapped | 0 / 0 / 0 / 0 |
| vec0 without bridge | 0 |
| Allocator next rowid | 45 |
| Safe to enable writers | Yes |

**Post-repair audit ID:** `233e85f3539ff3991dc6dd3c3b715ac1a6e1af7d4192dd76e974e22fb0eb5459`

## Production execution gate

The live release must repeat this sequence after flags-off deployment and startup migration:

1. Verify the fresh pre-deploy backup and service health.
2. Run the bundled read-only audit and compare the exact class/counts with this rehearsal.
3. Approve the live audit ID only if there are no unexplained differences.
4. Run the bundled repair with exact audit ID and backup confirmation.
5. Require integrity `ok`, zero foreign-key violations, zero vector anomalies, and safe allocator before enabling any manual-note writer/worker flag.

Any manifest drift is a no-go and requires a new read-only classification; the rehearsal audit ID must never be reused against a changed live database.
