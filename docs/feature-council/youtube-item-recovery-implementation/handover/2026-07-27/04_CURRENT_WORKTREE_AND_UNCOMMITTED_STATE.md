# Current Worktree and Uncommitted State

## Worktree identity at handover start

| Field | Value |
|---|---|
| Repository root | Resolve with `git rev-parse --show-toplevel` |
| Git root | same dynamically resolved repository root |
| Branch | `feat/youtube-item-recovery-enrichment` |
| HEAD | `4786b079e88cc01ec8e9c300faa93e3832ae2678` |
| Upstream branch | `origin/feat/youtube-item-recovery-enrichment` at the same SHA |
| `origin/main` | `6784e0e85c50fd86e3353b54a8b1964f045b65b1` |
| Origin | `https://github.com/arunpr614/ai-brain.git` |
| Draft PR | #57, open/draft/mergeable at the snapshot |

The worktree was already dirty when this handover package began. The handover Markdown files are additional untracked files and must not obscure the pre-existing implementation diff described below.

## Absolute preservation boundary

The unrelated untracked nested checkout/worktree reported by `git status` and
nested-repository inspection belongs to another project lane. Its local name is
intentionally omitted from this publication-safe package.

Do not:

- edit, move, rename, stage, remove, clean, archive, or format it;
- run a recursive command that descends into it;
- treat errors originating inside it as branch-owned without a clean-scope recheck; or
- include it in any commit from this branch.

Never run `git add .`, `git add -A`, `git clean`, or a repository-wide formatter from this dirty parent.

## Pre-handover modified tracked files

### CI and test routing

| File | Intent | Current caveat |
|---|---|---|
| `.github/workflows/product-ci.yml` | Add a separate hosted Stage 2 crash/restart job and require it from `verify` | Has never run on a pushed commit; do not claim hosted proof |
| `package.json` | Add `test:stage2-native:crash-restart` | Command exists but its matching tests do not yet |
| `scripts/run-product-test-suite.mjs` | Split native nominal and crash/restart routing | Crash pattern is `^crash/restart:`; current test file still has skipped `GAP(P1)` names |
| `src/lib/runtime/product-test-suite.test.ts` | Update suite inventory and CLI expectations | Targeted router tests passed before handover; full final validation still required |
| `docs/agent-docs/command-safety-registry.md` | Classify the new command as W1 | Documentation CI has not seen the uncommitted command |

The crash suite must have a guard proving at least one intended test was selected and executed. A zero-match or all-skipped invocation must not satisfy the hosted job.

### Stage 2 public receipt/types

| File | Intent | Current caveat |
|---|---|---|
| `src/db/stage2/file-factory.ts` | Add crash/restart scenario constants, two nominal fsync trace entries, build/native/aggregate receipt types | The durable native receipt changed after this edit and now also returns `sidecarsAbsentBeforeCleanup=true` and `walRecoveryRequired=false`; reconcile the crash/recovery types and validators |
| `scripts/run-youtube-stage2-file-factory-proof-worker.mjs` | Align the nominal expected trace with both fsync events | Reconciled and locally rerun; current SHA `e274ab7179a1c29118b358edf19fa2eb2bd1defc062302f5916dac3e23e2ba74` |
| `src/db/stage2/file-factory-proof.test.ts` | Pin the independent digest of the current 265-entry trace | Reconciled and locally rerun; current SHA `44dba3abd568cd4d409918dd167bfc2fde815bc443853596a66d919d6d78eb9e` |

The existing nominal trace constant already includes:

1. `database.create.fsync`;
2. `directory.create.fsync`.

Both nominal consumers now match the 265-entry trace at SHA-256
`1bca0c280eef643bf7b286973a70d59eed1cc08650f20791315b5b107b9cdbc7`.
The 2026-07-27 17:11 IST rerun of
`npm run test:stage2-native:nominal` passed 30, failed zero, and retained the
three explicit gap skips.

### SQLite D-021 routing

| File | Intent | Current caveat |
|---|---|---|
| `docs/feature-council/youtube-item-recovery-implementation/source-reconciliation/SQLITE_WAL_RESET_ADVISORY_ADDENDUM_2026-07-27.md` | Record the affected SQLite 3.49.2 source and re-entry gate | First adversarial review returned four P1 findings; current hash is not accepted |
| `SOURCE_RECONCILIATION.md` | Add conflict #13 and stop condition | Must be revised after the addendum is corrected and hash-bound |
| `DECISION_LOG.md` | Add D-021 | Current entry references a mutable, unaccepted addendum |
| `RISK_REGISTER.md` | Add R-035 | Correctly keeps the affected source as an open P1 |
| `IMPLEMENTATION_TRACKER.md` | Record D-021 and current Stage 2 frontier | Must distinguish the direct native profile evidence from an accepted controller proof |
| `REQUIREMENT_TRACEABILITY.md` | Add cross-cutting WAL-reset gate | Must later point to executable gate/test artifacts, not prose only |

Do not commit D-021 as accepted. Correct it, generate executable enforcement, obtain a fresh exact-hash review, and then pin the accepted hash through every routing document.

### Native file-factory implementation

| File | State | Current SHA-256 |
|---|---|---|
| `native/brain-s28-file-factory/src/brain_s28_file_factory.cpp` | Native profile code present; session-derived direct evidence only; integration and acceptance pending | `5d9ee11ea7cf657635e8500ee3723a8126ba03a3d8f8b5422cec58929911df9f` |
| `native/brain-s28-file-factory/file-factory-source-manifest.json` | Nominal source binding updated | `f6eaa1a45dfbc109606d189841b4e8af1972478baaf6da4f3c7ec76fdda2001b` |

The native source adds:

- durable database-file and root fsync in the nominal path;
- four mutually exclusive compile-time profiles;
- fixed crash exits 86 and 87;
- a zero-byte main-only durable-create recovery path;
- a fresh-process held-writer SQLite recovery path;
- identity-safe native-owned leaf deletion; and
- exact content-free receipts with all readiness/release authorities false.

The native specialist reported direct validation of all four profiles during
the session. That observation was not persisted as integrated controller/test
evidence. The separate nominal repository suite is now green after the trace
consumer repair, but it does not validate those four crash/recovery profiles.

## Pre-handover untracked implementation files

| File | State |
|---|---|
| `native/brain-s28-file-factory/file-factory-crash-recovery-source-manifest.json` | Profile/source manifest present; integration and acceptance pending; current SHA `9dd35f94a4a0676196d4942818a85c5b7aea06c60388814b7befd372345a0407` |
| `scripts/build-youtube-stage2-file-factory-crash-recovery.mjs` | Candidate deterministic profile builder; syntax/direct session checks only; integration and acceptance pending; current SHA `172a02763130d123094f025cff87e37a02b21ece31cc64d4f7b76643df37ee2c` |
| `scripts/youtube-stage2-file-factory-crash-recovery-worker-core.mjs` | Partial controller-side worker core; syntax checked only |
| `scripts/run-youtube-stage2-file-factory-crash-worker.mjs` | Partial crash worker; syntax checked only |
| `scripts/run-youtube-stage2-file-factory-recovery-worker.mjs` | Partial recovery worker; syntax checked only |

The three controller-side worker files were drafted immediately before the goal changed to handover documentation. They are not accepted implementation. Specifically:

- no TypeScript parent controller exists;
- no observer/transport/root-race test fixtures exist;
- no tests import or execute these workers;
- no receipt validator binds their exact shape;
- no source manifest currently binds all three worker bytes;
- no clean-scope lint/typecheck has covered them;
- no native crash suite has executed them;
- no hostile root, unknown-leaf, wrong-exit, signal, output, held-pipe, timeout, group-descendant, or replacement test has covered them; and
- no adversarial review has evaluated them.

Treat them as a draft to inspect, revise, or replace—not as a contract.

## Files not yet created

The interrupted implementation plan expected at least:

- `src/db/stage2/file-factory-crash-recovery-proof.ts`;
- controller receipt validators;
- test-only observer/root/transport fixtures as required;
- real `crash/restart:` tests in `src/db/stage2/file-factory-proof.test.ts`; and
- an exact-hash adversarial review artifact for the integrated proof.

None exists at this snapshot.

## Known current test state

### Pushed clean head

Head `4786b07` has green exact-head Product CI and Agent documentation CI. That evidence applies to the committed nominal implementation only.

### Dirty worktree

After the native fsync trace change, the current evidence is:

- direct nominal native invocation was green;
- all four direct crash/recovery profiles were green;
- the proof worker and independent test digest now bind the exact 265-entry
  trace;
- the persisted 2026-07-27 17:11 IST
  `npm run test:stage2-native:nominal` rerun passed 30, failed zero, and skipped
  three;
- the two P1 test entries remain skipped;
- the P2 synthetic fault-injection entry remains skipped; and
- the new crash/restart suite has not produced valid integrated evidence.

The new local 30/0/3 result covers the current nominal bytes only; do not cite
the pushed hosted 30/0/3 result as proof of current uncommitted bytes.
Do not cite the direct specialist observations as an integrated or persisted
crash/restart gate.

## Safe ownership and staging model

Work in focused groups:

1. **Native/profile group:** four native/builder/manifest paths.
2. **Controller/test group:** worker core, crash/recovery workers, future controller, tests, and TypeScript receipt types.
3. **CI/router group:** workflow, package, router, router tests, command registry.
4. **D-021 group:** addendum and its five routing documents plus future executable gates/review.
5. **Handover group:** this handover folder, its stable index, its verifier, and
   the append-only running-log pointer; never the local-only review report.

Inspect and stage explicit paths only. Before any commit:

```bash
git status --short
git diff --check
git diff --name-status
git diff --cached --name-status
```

Never combine a reviewed exact-hash slice with unrelated mutable docs or partial controller files merely to make the tree look clean.

## Recommended immediate disposition

1. Preserve this exact dirty state until the successor has read the handover.
2. Reconfirm the current trace hash and nominal 30/0/3 result if any trace byte
   drifts.
3. Inspect and harden the three partial worker files.
4. Implement the missing parent controller and negative fixtures.
5. Replace only the two P1 skips; keep the P2 skip and residual claim explicit.
6. Run local nominal and crash suites.
7. Obtain a zero-P0/P1 pre-push source/local-evidence review.
8. Only if current explicit mutation authority exists, commit and push the
   integrated crash-proof slice on the exact reviewed bytes.
9. Inspect hosted logs on that exact commit and obtain a separate zero-P0/P1
   post-hosted exact-commit evidence review; a green wrapper alone is invalid.
10. Keep D-021 and migration 028 in a separate blocked lane.
