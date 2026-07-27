# D-021 Adversarial-Review Session Findings

## Status and evidence boundary

| Field | Value |
|---|---|
| Reviewed artifact | `source-reconciliation/SQLITE_WAL_RESET_ADVISORY_ADDENDUM_2026-07-27.md` |
| Reviewed worktree SHA-256 | `b8d38446b7a40b0e60536a899abd31f0afdc9946367433618a9220fdc482878b` |
| Review method | Independent, read-only adversarial review during the 2026-07-27 implementation session |
| Session verdict | **NO-GO** |
| P0 findings | 0 |
| P1 findings | 4 |
| Formal accepted gate artifact | None |
| Authority created by this document | None |

This file makes the session findings durable for a successor. It does **not**
convert them into an accepted formal review, approve D-021, approve SQLite
3.49.2, close the WAL-reset gate, authorize migration 028, or create Stage 2
Implementation GO.

The referenced D-021 addendum was untracked at review time. If its bytes change,
the hash above identifies only the reviewed historical revision and a fresh
review is required.

## Narrow source facts used by the review

The local source reported:

```json
{
  "betterSqlite3": "11.10.0",
  "sqliteVersion": "3.49.2",
  "sqliteSourceId": "2025-05-07 10:39:52 17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1"
}
```

Official SQLite material says the WAL-reset defect likely affects versions
3.7.0 through 3.51.2, is fixed in 3.51.3 and later, and has official 3.50.7 and
3.44.6 backports. The review used these primary sources:

- [SQLite WAL-reset advisory](https://www.sqlite.org/wal.html#the_wal_reset_bug)
- [SQLite WAL format](https://www.sqlite.org/walformat.html)
- [SQLite transaction behavior](https://www.sqlite.org/lang_transaction.html)

The current 3.49.2 source falls within the documented affected range. That is a
source-suitability blocker; it is **not** proof that the defect occurred in AI
Brain.

The repository also contains a singleton application connection in WAL mode,
`wal_checkpoint(TRUNCATE)` behavior, and a separate NotebookLM retention
executable on a one-minute timer. This makes multi-process concurrency
plausible. It does not establish that the race occurred.

## P1-1: mutable decision path lacks exact-hash governance

### Finding

D-021 was represented by a mutable, untracked path. The addendum, tracker,
traceability matrix, and future review were not bound to one accepted exact
hash. A later edit could therefore change the decision bytes without invalidating
the apparent gate.

### Required closure

1. Revise D-021 to its final candidate.
2. Compute the exact SHA-256.
3. Pin that hash in:
   - an immutable external decision-seal manifest;
   - `DECISION_LOG.md`;
   - `IMPLEMENTATION_TRACKER.md`;
   - `REQUIREMENT_TRACEABILITY.md`;
   - the formal adversarial-review artifact.
   Do not require D-021 to contain its own raw-file SHA-256. If an internal
   identity field is desired, define and test an explicit canonicalization rule
   that excludes the seal field.
4. Add an executable negative verifier that rejects:
   - a missing decision;
   - a hash mismatch;
   - a mutable or substituted source;
   - a tracker/review pin that disagrees with the accepted decision.
5. Re-run the review against the pinned bytes.

## P1-2: the sequential proof exception does not prove closed isolation

### Finding

The addendum proposed a sequential exception for disposable proof behavior, but
the boundary was described too loosely. Sequential execution alone does not
prove that another process, inherited descriptor, forked database actor, or
mutable filesystem object cannot overlap or retain the database.

### Required closure

The executable proof and its receipt must establish all of the following:

- a freshly created owner-only private root;
- no root replacement;
- no symlink or hard-link substitution;
- no database or root file descriptor inherited by a child;
- no database-opening worker or forked actor;
- a zero-argument or equally closed native entrypoint;
- no retained descendant or detached process group;
- a sole-connection window for every database-affecting phase;
- exact source, native-module, worker, and controller hashes;
- negative fixtures for every isolation claim;
- a machine-checkable inventory proving that all possible actors are covered.

The proof must fail closed if it cannot establish the entire boundary.

## P1-3: the recovery claim conflates two different crash profiles

### Finding

A generic rule that SQLite recovery must occur before WAL removal is incorrect
for the durable-create profile. In that profile the database is durably created
but SQLite is never opened, so there is no WAL state to recover.

The held-writer profile is different: it intentionally stops while
`BEGIN IMMEDIATE` is held and may leave SQLite state requiring recovery through
a fresh SQLite connection.

### Required closure

For `crash-after-durable-create` and
`recover-after-durable-create`, require:

- `sidecarsAbsentBeforeCleanup: true`;
- `walRecoveryRequired: false`;
- no claim that SQLite recovery ran;
- proof that the zero-byte database and private root are cleaned only after the
  exact expected state is validated.

For `crash-while-begin-immediate-held` and
`recover-after-begin-immediate-held`, require:

- the stopped writer is conclusively gone;
- a separate fresh process opens the database through SQLite;
- SQLite recovery completes;
- integrity checks pass;
- the fresh connection closes;
- WAL and shared-memory sidecar absence is then proved;
- a fresh writer can acquire the required transaction;
- rollback/cleanup leaves the expected empty private root.

The aggregate controller must validate the two receipt schemas separately.

## P1-4: the decision is not wired into migration or release enforcement

### Finding

The D-021 remediation was documentation-only. It did not make an affected,
unknown, or mismatched source refuse service before a Stage 28 handle or
migration. It also did not bind activation and rollback to source provenance or
assign the current Stage 27 operational posture to a distinct owner and
decision.

### Required closure

- Select and freeze one supported fixed source.
- Refuse affected, unknown, or mismatched sources before:
  - creating any Stage 28 database handle;
  - running migration 028;
  - enabling a Stage 2 activation path.
- Verify the same provenance on rollback and recovery.
- Generate and validate an actor inventory and package scan.
- Add negative tests for absent, substituted, downgraded, or mismatched sources.
- Preserve production denial if any check fails.
- Create a separate explicit owner/decision for the current Stage 27 operational
  posture; D-021 cannot silently authorize it.

## P2 findings

### P2-1: select one exact official source

Do not freeze “3.51.3 or later” or another floating range. Select one particular
official source and record at least:

- exact version;
- `sqlite_source_id()`;
- official download or source URL;
- retrieval date;
- immutable local evidence location;
- archive/source SHA-256;
- build flags and ABI where relevant;
- package/native-module provenance.

### P2-2: make actor closure executable

The actor inventory must be generated from or checked against the executable
package and startup wiring. Add pairwise tests for actors whose lifetimes,
checkpoint behavior, shutdown behavior, or retained descriptors could overlap.
A prose list alone is insufficient.

### P2-3: preserve advisory provenance

Record the advisory retrieval date, exact official URL, an immutable local copy
or source snapshot, and its hash. A floating web reference is useful context but
is not a frozen release gate.

## Correct claims while D-021 remains unresolved

Permitted:

- The current source is SQLite 3.49.2 with the recorded source ID.
- Official SQLite documentation places 3.49.2 inside the likely affected range.
- The repository has plausible multi-process actors.
- D-021 is an unaccepted remediation proposal.
- Migration 028 and Stage 2 implementation remain blocked.

Not permitted:

- The WAL-reset defect occurred in AI Brain.
- The sequential proof is isolated merely because its calls are ordered.
- Every retained WAL must be recovered in the durable-create profile.
- Current SQLite 3.49.2 is an accepted Stage 2 source.
- D-021 is approved, remediated, or formally reviewed.
- Migration 028 is safe, exists, ran, or is authorized.
- The current crash/recovery slice has integrated or hosted evidence.

## Required next review packet

Before requesting a new formal adversarial gate, assemble:

1. the final D-021 candidate and exact hash;
2. a frozen selected SQLite source/provenance record;
3. the executable source-refusal gate and negative tests;
4. the generated database-actor/checkpoint inventory;
5. actor-pair and retained-descriptor evidence;
6. exact controller, worker, native-module, source-manifest, and receipt hashes;
7. separate durable-create and held-writer receipts;
8. hostile isolation fixtures;
9. migration/startup/activation/rollback refusal evidence;
10. the current Stage 27 operational-owner decision;
11. synchronized tracker, traceability, risk, and decision-log entries;
12. commands, environment, toolchain, counts, and raw outputs for the exact
    review bytes.

The reviewer must start from the exact hash set and independently check both
happy paths and negative boundaries. Any P0/P1 finding keeps D-021 at NO-GO.
