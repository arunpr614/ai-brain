# Stage 2 Contract, Crash Recovery, and SQLite WAL Gate

## Stage 2 is the current frontier

Stage 2 owns the additive data and transactional foundation that later Chrome, recovery, and enrichment work depends on. It must establish:

- safe additive migration 028;
- item-instance and content-revision fencing;
- transcript source/segment persistence;
- exact active-source constraints;
- durable intents, grants, receipts, holds, runs, jobs, and attempts;
- atomic attachment and recovery resolution;
- stale claim/dispatch/apply fences;
- retention and deletion behavior;
- old/new binary-schema compatibility; and
- exact package/runtime readiness.

None of those implementation claims follows merely from the accepted contract.

## Frozen physical-schema contract

### Exact accepted bytes

| Artifact | Accepted SHA-256 |
|---|---|
| `implementation/STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md` | `d1eef042423d7d2d3413637f62bd8ed5842b64846db6f656a0b8e1cb7e5eed48` |
| `implementation/fixtures/stage2-acceptance-registry-v2.json` | `7b022d82e855891eb1a818df9c09ab070586c13beea7acf6a8c003d845be9f45` |
| `implementation/fixtures/stage2-contract-static-authority-index-v1.json` | `e691edfd0edcade37d439906f3b97dee9a3b05d57baae995ae23fb0254bbfd5d` |
| `implementation/fixtures/verify-stage2-contract-static-authority-index.mjs` | `133d55fae063244e7c6d413c64acbe88ebf0d1e83736296d9a00ca00de2e68a6` |

The four accepted artifacts are content-hash frozen. Do not edit them in place.
Git records ordinary tracked mode `100644`; any local `0444` mode is only a
best-effort guard and a fresh-checkout `0644` mode is not tampering. The exact
hashes and verifier are authoritative. Any proposed contract change requires a
new explicitly versioned addendum and complete review.

### Contract GO versus Implementation GO

Contract GO means:

- the contract is sufficiently specified to implement in disposable/private environments;
- acceptance cases and authority boundaries are frozen; and
- exact-byte drift invalidates the review.

Contract GO does not mean:

- migration 028 may be applied;
- S28 runtime/package readiness exists;
- the current SQLite source is supported;
- the Chrome or processing features exist;
- a live lab canary may run;
- production feature enablement is permitted; or
- merge/deployment/release is approved.

Implementation GO requires actual migration, runtime, package, compatibility, acceptance, security, and adversarial evidence with zero unresolved P0/P1.

## Why the stopped-writer route exists

The accepted contract requires strong evidence around process death, transaction ownership, recovery, cleanup, and ordinary startup before migration 028. The work proceeded in bounded layers:

1. memory-only native feasibility;
2. nominal private file-backed factory;
3. abrupt-stop/fresh-process recovery;
4. later migration/package/runtime evidence.

Layer 1 and the nominal part of layer 2 are accepted only within their stated bounds. The two missing P1 oracles were:

- child exits immediately after durable private database creation; and
- child exits while `BEGIN IMMEDIATE` is demonstrably held.

## Native crash/recovery profiles present in the worktree

The current native source uses four mutually exclusive compile-time profiles:

| Profile | Scenario | Mode | Expected result |
|---|---|---|---|
| `crash-after-durable-create` | `durable-create` | crash | `_exit(86)` after exclusive create, identity validation, file fsync, and root fsync |
| `recover-after-durable-create` | `durable-create` | recovery | exact zero-byte main-only validation and identity-safe cleanup |
| `crash-while-begin-immediate-held` | `begin-immediate-held` | crash | `_exit(87)` with a demonstrated write transaction |
| `recover-after-begin-immediate-held` | `begin-immediate-held` | recovery | fresh SQLite recovery, `quick_check(1)`, new writer acquire/rollback, clean close, and cleanup |

Every profile is compiled into a deterministic addon with the single frozen zero-argument export `runDisposableFileFactoryMatrix`. There is no runtime profile, path, database, descriptor, SQL, compiler, migration, lab, release, or production input.

Direct profile results cited below are session-derived specialist observations,
not a persisted integrated controller/test gate. The current worktree still
needs exact-byte local, hosted, and adversarial evidence.

### Durable-create semantics

The durable-create crash happens before SQLite opens the database. Its recovery path:

- proves the private root contains exactly `factory.sqlite3`;
- proves the main file is an owner-only, single-link, zero-byte regular file;
- proves `sidecarsAbsentBeforeCleanup=true`;
- records `walRecoveryRequired=false`;
- does not call SQLite or claim SQLite recovery;
- unlinks the exact retained object through native identity-safe quarantine/removal;
- proves the retained descriptor has link count zero;
- fsyncs the root; and
- returns with an empty root.

This distinction was added after the D-021 reviewer correctly rejected a generic “SQLite recovery before WAL removal” claim for this scenario.

### Held-writer semantics

The held-writer crash:

- creates and durably configures a SQLite 3.49.2 WAL database;
- begins `BEGIN IMMEDIATE`;
- proves default-deny authorizer restoration;
- proves no prepared statement remains;
- proves autocommit is off and transaction state is write;
- revalidates canonical owned residue; and
- exits 87 without orderly SQLite close.

The recovery profile:

- starts in a genuinely fresh process;
- opens the existing main/WAL state through the pinned SQLite source;
- runs `PRAGMA quick_check(1)` and requires `ok`;
- acquires and finalizes a fresh `BEGIN IMMEDIATE`;
- proves write transaction state;
- rolls back and finalizes;
- proves autocommit and transaction-state restoration;
- closes SQLite cleanly;
- requires sidecars absent only after the SQLite close/recovery path;
- identity-safely removes the main file; and
- fsyncs an empty root.

If reproduced through the complete integrated controller and hostile-boundary
suite, this would prove only the named sequential abrupt-stop/restart oracle.
The present direct specialist observation alone does not establish that gate.

## Required parent/controller protocol

The missing controller must enforce all of the following:

1. Accept exactly one of two closed scenario values:
   - `after-durable-database-create`;
   - `while-begin-immediate-held`.
2. Reject production and all other input before creating a root.
3. Run only on the pinned Darwin arm64, Node 22.22.3, ABI 127 host slice used by the nominal proof.
4. Create a fresh `0700` root directly beneath `/private/tmp` and retain parent/root descriptors and identities.
5. Fsync the parent after root creation.
6. Spawn a detached crash worker with:
   - same private root as `cwd`;
   - no inherited root/database descriptor;
   - no database path or runtime profile input;
   - fixed minimal environment;
   - stdout/stderr pipes plus a dedicated provenance pipe.
7. Build the crash profile twice, validate all source/build/module hashes, load only the single zero-argument export, and remove both build trees before the native call.
8. Close the provenance pipe before native `_exit`.
9. Observe the child through `close`, requiring:
   - exact exit 86 or 87;
   - null signal;
   - zero stdout/stderr;
   - canonical provenance and EOF;
   - no timeout, overflow, or held pipe; and
   - the entire detached process group absent before recovery.
10. Revalidate the exact root identity and inspect residue:
    - durable: exact zero-byte main only;
    - held: main plus zero or more canonical `-wal`, `-shm`, or `-journal` leaves;
    - no symlink, hard link, quarantine leaf, build leaf, or unknown entry.
11. Open and retain safe descriptors to each residue object.
12. Spawn a separate fresh recovery worker with the same root and no caller authority.
13. Build/validate/remove two deterministic recovery addons before the native call.
14. Validate the exact scenario-specific native receipt.
15. Require the recovery process group absent.
16. Prove every retained residue descriptor now has link count zero and still identifies the same object.
17. Require the private root empty.
18. Permit the parent to remove only the empty root, fsync the parent, prove absence, and close descriptors.
19. Compare pre/post private-root and build snapshots.
20. Return one deeply frozen content-free receipt with every migration, S28, lab, release, implementation, and production authority false.

### Receipt isolation facts

At minimum, bind:

- owner-only canonical private root;
- no symlink/hard-link residue;
- zero-argument native entrypoint;
- no root descriptor or database path delivered to either child;
- no Node worker/fork database actor;
- crash process group absent before recovery;
- recovery process group absent before cleanup;
- no concurrent harness database owner before or during recovery;
- no harness checkpoint;
- source, manifest, builder, worker, controller, module, compiler, ABI, and build-input hashes;
- retained descriptor unlink evidence;
- private-root/build snapshot restoration; and
- `walResetDefectCoverageClaimed=false`.

Do not claim hostile same-UID race coverage unless it is actually implemented and tested.

## Current controller integration defects

At handover:

- `src/db/stage2/file-factory-crash-recovery-proof.ts` does not exist;
- `file-factory-proof.test.ts` contains zero test names matching `^crash/restart:`;
- both P1 entries remain `test.skip`;
- the new crash suite route is vacuous;
- the recovery worker's durable exact-key validator still expects the old five-key oracle and would reject the native receipt's new `sidecarsAbsentBeforeCleanup` and `walRecoveryRequired` keys;
- the nominal trace mismatch has been repaired and the current nominal suite
  passes 30/0/3, but that suite deliberately leaves both P1 crash/restart cases
  and the P2 synthetic-fault case skipped;
- no negative transport/root/process-group fixture exists; and
- no integrated local, hosted, or adversarial evidence exists.

The three newly drafted worker scripts are syntax-valid but otherwise unverified.

## SQLite WAL-reset source conflict

### Confirmed source facts

- `package-lock.json` pins `better-sqlite3` 11.10.0.
- The installed/native source reports SQLite 3.49.2.
- Source ID: `2025-05-07 10:39:52 17144570b0d96ae63cd6f3edca39e27ebd74925252bbaf6723bcb2f6b4861fb1`.
- Official SQLite guidance identifies 3.7.0 through 3.51.2 as affected.
- The published fixed line is 3.51.3+, with official backports at 3.50.7 and 3.44.6.

This is a source-selection P1. It is not proof of an AI Brain incident.

### Plausible multi-process topology

Current source includes:

- a per-process singleton application connection in WAL mode;
- explicit `wal_checkpoint(TRUNCATE)` behavior;
- a separate NotebookLM retention one-shot process that opens the configured database; and
- a timer that can start the retention process every minute.

A process-local singleton does not prove a single database actor.

### Narrow sequential exception

The two crash/restart fixtures may run on the pinned 3.49.2 source only when:

- the database is private and disposable;
- the prior process group is fully absent;
- the harness starts no concurrent SQLite actor/thread;
- the harness performs no checkpoint;
- recovery is a fresh process;
- durable-create makes no WAL-recovery claim;
- held-writer uses SQLite recovery before any claim that sidecars are absent;
- every authority flag remains false; and
- the receipt says the run does not cover the upstream defect.

Passing this exception does not unblock migration 028.

## D-021 first adversarial review

The current uncommitted addendum hashes to:

`b8d38446b7a40b0e60536a899abd31f0afdc9946367433618a9220fdc482878b`

The first review returned NO-GO with four P1s:

1. The addendum is mutable rather than exact-hash governed.
2. Its sequential exception does not define or test a closed isolation contract.
3. Its generic recovery wording is false/ambiguous for zero-byte durable-create.
4. Its source-remediation rule is not enforced by migration admission or release activation, and current non-S28 production posture is undefined.

See [D-021 session findings](13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md).

## Remediation required before migration 028

1. Choose one specific official fixed source, not a floating “later” range.
2. Bind version, source ID, amalgamation/header hashes, package tarball integrity, lockfile, compile options, compiler, Node ABI/headers, addon hashes, and release artifact.
3. Inventory every source-version-sensitive normative behavior in the frozen
   contract and registry. At minimum include:
   - the WAL-open/checkpoint/action trace at physical-contract lines 3076-3085;
   - ordered authorizer, virtual-table, and shadow-table callbacks at lines
     4443-4449; and
   - `sqlite-vec`, `trusted_schema`, and delete-feasibility behavior at lines
     4514-4521.
4. Execute a candidate-versus-3.49.2 semantic compatibility matrix that records
   the expected and observed callback/action/order/WAL/checkpoint/virtual-table
   behavior and the exact test for every row. Hash pinning alone cannot pass.
5. If any normative behavior differs, reject that source or create a new
   versioned source-compatibility addendum, regenerate the dependent
   registry/index/verifier and hashes, and obtain fresh Contract GO. Never edit
   the frozen package in place.
6. Update every 3.49.2-bound manifest, validator, expected source ID, package descriptor, rollback matrix, and activation verifier.
7. Generate a machine-checkable inventory of every application, worker, timer, CLI, migration, retention, backup, diagnostic, release, and rollback actor that can open the logical database.
8. Classify read/write/checkpoint/last-close behavior and require registry/barrier participation.
9. Add deterministic cross-process tests for automatic checkpoint, explicit checkpoint, restart/truncate, writer overlap, crash boundaries, and last close.
10. Refuse affected or mismatched sources before any S28 handle or migration transition.
11. Refuse activation/rollback when source/package/build/release provenance differs.
12. Record the current non-S28 production posture and obtain a separate operational owner decision if affected-runtime deployment remains permitted.
13. Revise and exact-hash pin D-021 through the decision log, tracker, traceability, risk register, source reconciliation, verifier, and review.
14. Obtain a fresh adversarial GO with zero P0/P1.

Until all fourteen are proven, migration 028, S28 readiness, and affected
production foundations remain NO-GO.
