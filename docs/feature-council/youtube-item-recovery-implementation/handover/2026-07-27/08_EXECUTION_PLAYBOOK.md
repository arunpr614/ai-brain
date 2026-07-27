# Continuation Execution Playbook

## Operating principle

Advance the real end state in dependency order. Do not optimize for an easy green subset, treat skipped/zero-match tests as evidence, or reinterpret a bounded prerequisite as feature/release readiness.

Maintain two independent lanes until both are accepted:

1. **Crash/restart prerequisite lane:** may continue under the narrow sequential disposable exception.
2. **SQLite source/migration lane:** remains blocked until D-021, fixed-source provenance, actor closure, and executable gates are accepted.

Do not start migration 028 because the crash lane becomes green.

## Phase 0: establish the exact starting state

### Read

1. This handover package.
2. The repo-relative
   [governing-goal public snapshot](GOVERNING_GOAL_PUBLIC_SNAPSHOT.md).
3. The latest `RUNNING_LOG.md` entry.
4. Current `git status`, diff, and recent log.
5. Current PR #57 metadata and exact-head checks.
6. The frozen Stage 2 addendum sections relevant to the next change.
7. D-021 and its session findings.

### Commands

```bash
PROJECT="$(git rev-parse --show-toplevel)"
cd "$PROJECT"

# Refresh server-side state before relying on cached remote-tracking refs.
git ls-remote origin \
  refs/heads/main \
  refs/heads/feat/youtube-item-recovery-enrichment
gh pr view 57 --repo arunpr614/ai-brain \
  --json state,isDraft,headRefOid,mergeable,mergeStateStatus,url
gh pr checks 57 --repo arunpr614/ai-brain

git status --short --branch
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git remote get-url origin
git diff --stat
git diff --name-status
git diff --check
git log --oneline --decorate -n 30
```

### Stop conditions

Stop and reconcile before editing if:

- project root, branch, remote, HEAD, or upstream differs unexpectedly;
- the unrelated nested checkout reported by the initial state audit is
  missing/moved/modified by this lane;
- a new user change overlaps an intended file;
- frozen Stage 2 hashes drift; local read-only modes are best-effort only;
- origin/main adds a migration or changes the source/runtime frontier; or
- PR/CI/review state materially changed.

## Phase 1: finish the abrupt-stop/fresh-restart prerequisite

### 1.1 Preserve the reconciled nominal trace

The review-item remediation aligned both nominal consumers with the current
durability steps:

- `database.create.fsync`;
- `directory.create.fsync`.

Authoritative current state:

- `src/db/stage2/file-factory.ts` contains both;
- current native source emits both;
- `scripts/run-youtube-stage2-file-factory-proof-worker.mjs` contains both; and
- `src/db/stage2/file-factory-proof.test.ts` independently pins the current
  operation-trace digest.

The current 265-entry trace canonically hashes to
`1bca0c280eef643bf7b286973a70d59eed1cc08650f20791315b5b107b9cdbc7`
using `SHA256(JSON.stringify(trace) + "\n")`. Regenerate the digest only after
the final trace bytes stabilize; do not copy this dated value after further
trace edits.

At 2026-07-27 17:11 IST,
`npm run test:stage2-native:nominal` passed 30, failed zero, and retained the
three explicit gap skips. If any trace byte changes, regenerate and review both
consumer bindings and rerun the nominal suite before touching crash tests.

### 1.2 Audit the three partial worker files

Inspect:

- `scripts/youtube-stage2-file-factory-crash-recovery-worker-core.mjs`;
- `scripts/run-youtube-stage2-file-factory-crash-worker.mjs`;
- `scripts/run-youtube-stage2-file-factory-recovery-worker.mjs`.

At minimum fix:

- durable native receipt validator must accept and require:
  - `exactZeroByteMainOnly=true`;
  - `sidecarsAbsentBeforeCleanup=true`;
  - `walRecoveryRequired=false`;
  - identity-safe cleanup fields;
- exact build/result/manifest key and hash validation;
- all relevant worker/core bytes included in provenance;
- no dynamic path/database/profile/compiler/SQL authority;
- fixed content-free error behavior;
- exact output caps and canonical JSON framing;
- build trees removed before native invocation;
- no returned path/descriptor/process ID; and
- all authority flags false.

Consider replacing the drafts if a smaller, clearer implementation better satisfies the contract. Do not preserve a draft merely because it exists.

### 1.3 Implement the missing parent controller

Create `src/db/stage2/file-factory-crash-recovery-proof.ts` or the exact reviewed successor. Implement the protocol in [Stage 2 crash recovery](05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md#required-parentcontroller-protocol).

Required controller responsibilities:

- closed scenario input;
- production/input refusal before root creation;
- pinned host/source checks;
- private root and retained identities;
- detached process observers;
- dedicated provenance pipe;
- exact exit/signal/output/timeout/overflow/held-pipe/group checks;
- residue shape and descriptor retention;
- fresh recovery process;
- scenario-specific receipt validation;
- native-owned leaf cleanup;
- parent empty-root-only removal;
- parent fsync;
- snapshot restoration;
- deep-frozen, content-free, non-authorizing receipt; and
- sanitized fixed public failures.

### 1.4 Add negative fixtures

The adversarial gate should have executable counterexamples for:

- invalid/missing/extra scenario input before root creation;
- production `NODE_ENV`;
- ambient path/database/module/compiler overrides;
- wrong crash exit;
- signal;
- stdout/stderr output;
- provenance truncation/trailing bytes/noncanonical JSON;
- output cap equality/+1;
- timeout;
- held pipe;
- surviving process-group descendant;
- root identity replacement;
- symlink/hard-link residue;
- unknown/quarantine/build leaf;
- residue mode/owner/link/size drift;
- recovery wrong profile/scenario/receipt;
- retained descriptor object mismatch;
- parent cleanup refusal when root is nonempty/replaced; and
- concurrent proof isolation.

Use closed enum fixtures. Do not accept a caller path, descriptor, PID, timeout, callback, command, environment, or cleanup target.

### 1.5 Replace only the two P1 skips

In `src/db/stage2/file-factory-proof.test.ts`:

- replace the durable-create P1 skip with a test name beginning `crash/restart:`;
- replace the held-writer P1 skip with a test name beginning `crash/restart:`;
- retain the P2 synthetic prepare/finalize fault skip unless that P2 is genuinely implemented;
- preserve nominal `adversarialCoverage.abruptExitRestart=false`; and
- validate the separate crash/restart receipt rather than mutating nominal evidence.

Add a suite-selection sentinel so `stage2-native-crash-restart` fails when zero intended tests execute or when they are skipped.

### 1.6 Local verification

Run in increasing scope:

```bash
node --check scripts/build-youtube-stage2-file-factory-crash-recovery.mjs
node --check scripts/youtube-stage2-file-factory-crash-recovery-worker-core.mjs
node --check scripts/run-youtube-stage2-file-factory-crash-worker.mjs
node --check scripts/run-youtube-stage2-file-factory-recovery-worker.mjs

npm run test:stage2-native:nominal
npm run test:stage2-native:crash-restart
node scripts/run-product-test-suite.mjs inventory
```

Then run:

- targeted strict TypeScript;
- scoped no-ignore lint;
- JSON/YAML parsing;
- workflow syntax/actionlint when available;
- product-test router tests;
- command/documentation checks;
- exact source/manifest hashes;
- old nine memory-only prerequisite hashes;
- `git diff --check`;
- credential-signature and secret scans; and
- private-temp/process residue scans.

Use a pristine worktree or exact exclusion for broad lint/typecheck. Record scope honestly.

### 1.7 Pre-push source and local-evidence adversarial gate

Use the adversarial-review skill on exact stable bytes. Require:

- reality/failure/data/deployment/observability/acceptance/scope/security passes;
- exact reviewed hashes;
- reproducible commands and results;
- no P0/P1;
- explicit bounded GO;
- all P2/P3 residuals in the risk register; and
- no migration/S28/lab/release/production authority.

Any material edit after review invalidates the verdict.

### 1.8 Commit, push, and hosted CI

Local technical GO is not mutation authority. Continue only when current
explicit authority records the repository, branch, permitted actions, and exact
slice. Otherwise stop at `ready but not authorized`.

When both the local review gate and the separately evidenced mutation-authority
gate are GO:

1. stage explicit crash-slice paths;
2. inspect the full staged diff and prove exclusion of unrelated nested/untracked
   paths, D-021 cross-lane files, private identifiers, content fixtures, and
   unexpected files;
3. commit a focused slice;
4. push the feature branch;
5. wait for:
   - Stage 2 native nominal job;
   - separate Stage 2 crash/restart job;
   - strict `verify`;
   - Agent documentation;
6. inspect logs/counts, not just green conclusions;
7. require the same exact commit for every claimed check;
8. preserve the complete hosted logs and counts; and
9. do not call the pre-push verdict final.

Do not merge or deploy.

### 1.9 Mandatory post-hosted exact-commit evidence review

After hosted jobs finish, run a separate adversarial evidence review that binds:

- the exact pushed commit and reviewed source hash set;
- workflow, run, and job IDs plus durable URLs;
- exact commands and platform/toolchain;
- selected, passed, failed, and skipped counts;
- both named required crash/restart scenarios;
- log evidence proving they executed rather than a green wrapper around zero
  tests; and
- strict `verify` and Agent-documentation results on the same commit.

Require two selected required crash cases, two passes, zero required skips, and
zero failures. Hosted absence, supersession, a different SHA, or missing logs is
NO-GO. Any material byte or contract drift returns to section 1.7. Only after
this post-hosted review is zero-P0/P1 may tracker/risk/traceability/review
artifacts and the append-only running log claim the hosted gate.

## Phase 2: resolve D-021 and SQLite source provenance

This is a separate P1 lane.

### 2.1 Correct the addendum

Revise D-021 to:

- distinguish durable-create no-WAL semantics from held-writer SQLite recovery;
- define a closed isolation contract and negative tests;
- select one particular official fixed source;
- define a machine-checkable actor/checkpoint closure;
- specify executable migration admission, package, activation, and rollback gates;
- state current non-S28 production posture and decision owner;
- bind official advisory retrieval URL/date/evidence;
- exact-hash govern the final addendum; and
- refuse hash drift through a verifier.

### 2.2 Select and freeze a fixed source

Choose one exact official SQLite release/source:

- 3.51.3 or a later specific reviewed release; or
- exact official 3.50.7/3.44.6 backport.

“Latest” is not a source decision.

Bind:

- version and source ID;
- amalgamation/header hashes;
- package tarball integrity and lockfile;
- compile defines/options;
- compiler and Node ABI/headers;
- all native module hashes;
- package/release manifest;
- deployment activation target; and
- rollback compatibility.

Do not invent a 3.49.2 backport.

### 2.3 Prove frozen-contract semantic compatibility

Hash and source provenance are necessary but insufficient. Inventory every
source-version-sensitive normative behavior in the frozen contract/registry and
execute a candidate-versus-3.49.2 matrix. At minimum cover:

- WAL-open/checkpoint/action trace behavior at physical-contract lines
  3076-3085;
- ordered authorizer, virtual-table, and shadow-table callbacks at lines
  4443-4449; and
- `sqlite-vec`, `trusted_schema`, and delete-feasibility behavior at lines
  4514-4521.

For every row record the exact expected behavior, candidate observation, named
test, command, source/build hashes, and result. If any normative behavior
differs, reject the source or create a new versioned source-compatibility
addendum, regenerate the dependent registry/index/verifier and hashes, and
obtain fresh Contract GO before migration 028. Never edit the frozen package in
place.

### 2.4 Generate the actor/checkpoint inventory

Enumerate every same-database opener:

- app runtime;
- migration runner;
- transcript/recovery workers;
- enrichment/batch/embedding/note workers;
- retention timer/process;
- backup/restore;
- deploy/activation/rollback;
- CLIs and diagnostics;
- test or maintenance scripts;
- old/current/transition binaries; and
- any direct native SQLite module.

For each, record:

- executable/package identity;
- read/write/checkpoint/last-close capability;
- process/thread topology;
- connection profile and source provenance;
- startup/shutdown/crash behavior;
- registry/barrier participation;
- release/rollback status; and
- deterministic actor-pair tests.

### 2.5 Implement executable enforcement

Before any S28 handle or migration transition:

- refuse affected/mismatched SQLite source;
- verify exact package/build/release provenance;
- refuse an unregistered actor;
- serialize checkpoint and writer authority across processes;
- control restart/truncate and last-close behavior; and
- bind the active release artifact.

Activation and rollback must independently recheck the same facts.

### 2.6 Test and re-review

Required tests include:

- affected-source refusal;
- fixed-source positive;
- source-version semantic matrix covering every frozen normative locator;
- source/package/compiler/module/release cross-hash;
- automatic checkpoint threshold versus writer;
- explicit checkpoint versus writer;
- app versus retention and every other actor pair;
- crash around writer acquire/commit/checkpoint start/checkpoint completion/restart/last close;
- old/new binary-schema/source matrix;
- repository and packaged-artifact inventory; and
- exact negative hash/source/actor drift.

Obtain a fresh D-021 exact-hash review with zero P0/P1. Pin that hash through every routing document and verifier.

## Phase 3: implement migration 028 and complete Stage 2

Only after Phases 1 and 2 are independently GO:

1. Re-fetch protected main/open PR migration state.
2. Confirm 028 remains the next collision-free identifier.
3. Generate SQL directly from the frozen physical contract; do not hand-simplify the contract.
4. Freeze migration filename, SHA, generated statement/failpoint manifest, and S28 descriptor.
5. Implement sealed S28 connection/package authority using the fixed source.
6. Implement preflight, migration, backfill, rebuild, triggers/indexes/checks, attestation, and rollback restrictions.
7. Implement transaction contracts for:
   - fixture attachment;
   - automatic recovery success;
   - stale-result/hold fences;
   - reservation/lease/sweep;
   - deletion and cleanup.
8. Implement exact old/new binary-schema-source matrix.
9. Run AC01–AC17 through the accepted registry/evidence envelope.
10. Complete authoritative S2-AC-15 repository/package scope scanning.
11. Run full local/hosted security, privacy, package, migration, and release-artifact checks.
12. Obtain Stage 2 Implementation GO with zero P0/P1.

Do not claim the existing contract registry is executed evidence.

## Phase 4: Chrome companion foundations

After Stage 2 Implementation GO:

1. Re-audit the current existing extension.
2. Freeze manifest permission diff, minimum Chrome, origins, extension identity handling, extractor/contract versions, and affected files.
3. Extend the existing companion.
4. Implement exact-tab side-panel lifecycle.
5. Implement content-free server-side `authorize inspect` through the service
   worker and require its success before any extractor/DOM read.
6. Implement the pure bounded extractor and explicit user Inspect action.
7. Implement local review and explicit **Add**.
8. Implement the complete D-008 two-channel transfer.
9. Prove no transcript enters worker/storage/Brain-or-other-page DOM/URL/logs.
10. Cover full renderer/lifecycle/substitution/network fixture matrix, including
    zero DOM reads for every authorize-inspect refusal or drift case.
11. Build and test a packaged local extension.
12. Inventory exact production source, files, modules, and sourcemaps and prove
    zero recovery destination, recovery panel, transcript extractor,
    upload-grant, or recovery-handoff code. Runtime denial alone is insufficient.
13. Run Chrome extraction adversarial review; close P0/P1.

No live YouTube access is required or permitted for this phase.

## Phase 5: exact-item recovery and link-only

Implement:

- item-level recovery eligibility/action;
- exact expiring intent;
- handoff and return-to-item;
- grant and atomic attachment;
- honest missing/conflict/held status;
- response-loss idempotency;
- one-active-source behavior;
- true link-only route and all zero-work exclusions; and
- production denial.

Run auth/origin/version/body-read, atomicity, concurrency, different-content, stale-worker, deletion, and UX truth tests. Review with zero P0/P1.

## Phase 6: migration 029 expand, then held manual enrichment

Before any manual-enrichment route, UI, worker, provider dispatch, or feature
claim:

1. re-fetch the protected-main and open-PR migration frontier;
2. apply the shift-together rule if 028/029/030 moved;
3. freeze `029_manual_transcript_enrichment_expand.sql`, its hash, schema
   descriptor, dual-read/dual-write plan, and compatibility manifest;
4. prove clean/upgrade/idempotent/failure-atomic application;
5. prove old, transition, and new binary behavior on S28 and S29;
6. prove dual-write, backfill, read parity, worker hold fences, provider-usage
   totals, status projection, deletion, and rollback behavior; and
7. obtain migration-029 acceptance with zero P0/P1.

Implement:

- held projection and plan preview;
- four version/fingerprint domains;
- separate authorization;
- idempotent run/job;
- exact claim/dispatch/apply gates;
- digest and current-space index stages;
- distinct retryable, terminal, and outcome-unknown digest/index states;
- automatic digest retry under the same accepted authority with a new attempt
  and claim token, capped at three attempts;
- explicit digest retry with a new mutation identifier only under unchanged
  current unexpired input/context;
- index-only retry with a new index generation, exact current digest reuse, and
  zero digest-provider calls;
- provider drift and source replacement;
- stale-result rejection;
- deletion/retention cleanup;
- privacy-safe provider aliases/diagnostics; and
- production denial.

Use provider fakes/spies only until the external processing packet exists. Review with zero P0/P1.

## Phase 7: migration 030 contract/cutover, UX, full QA, and release-negative

1. Prove S29 dual-read/dual-write and backfill parity.
2. Drain incompatible work and prove cutover readiness.
3. Make release tooling block every incompatible rollback binary.
4. Freeze and apply `030_manual_transcript_enrichment_contract.sql`.
5. Run the complete old/transition/new binary matrix on S28/S29/S30 and the
   post-contract schema/data/deletion/rollback-refusal suite.
6. Obtain migration-030 contract/cutover acceptance with zero P0/P1. Stage 7
   cannot complete before this gate.
7. Implement final desktop/mobile state parity.
8. Verify keyboard, focus, screen-reader, zoom, contrast, and reduced motion.
9. Run full formatting/lint/typecheck/unit/integration/build/environment/docs/migration/extension/accessibility/security/privacy/secret/dependency/release checks.
10. Run production-shaped disposable rehearsal and rollback rehearsal.
11. Produce QA, security/privacy, production-negative, release, rollback, Wiki summary, and final report artifacts.
12. Update Wiki with exact delivered/blocked language.
13. Append running-log milestones.
14. Obtain full QA and production-release-readiness adversarial reviews.

## Live lab gate

Do not perform a live canary until all external packet items are explicit and reviewed:

- target-specific platform-policy decision;
- authorized standard watch targets/sample;
- separate lab deployment/extension identities;
- separate credentials/database/data root;
- private manifests outside Git;
- retention/deletion owner/deadline;
- provider terms and processing decision;
- kill switch/monitoring/rollback;
- successful synthetic and packaged tests; and
- tested cleanup.

If the packet remains absent, complete every safe local step and issue a blocked lab report. Do not browse a live target.

## Production release gate

Before any production action, re-decide exact permitted scope:

- containment;
- backward-compatible foundations;
- link-only;
- browser capture;
- held manual processing.

Treat the last two as denied unless a new explicit reviewed decision supersedes the no-go. Merging code or setting configuration is not that decision.

## Running-log discipline

After each milestone, dependency/migration decision, major test, adversarial review, PR/CI event, lab event, release event, or final handoff:

1. read `RUNNING_LOG.md` header and latest entry;
2. append only;
3. never rewrite prior bytes;
4. record exact branch/commit, changed files, commands/counts, reviews, blockers, next actions, authority, and no-go claims; and
5. verify the old prefix remains byte-identical.

## Completion audit

Before marking the parent implementation goal complete:

- enumerate every named requirement/deliverable/gate;
- map each to authoritative current evidence;
- distinguish proven, contradicted, incomplete, weak, and missing;
- inspect exact current files, commands, CI, PR, Wiki, deployment, and lab state;
- resolve every P0/P1;
- require accepted migration 029 before manual behavior and accepted migration
  030 before Stage 7 completion;
- require authorize-inspect before any transcript DOM read and prove production
  bundle capability absence;
- require both pre-push and post-hosted exact-commit reviews when hosted evidence
  is part of the gate;
- require the fixed-SQLite semantic compatibility matrix or a versioned
  compatibility addendum with fresh Contract GO;
- require retry-state transition and attempt/generation evidence;
- do not use a narrow test for a broad claim; and
- require no remaining required work.

If evidence is weak or missing, continue. Do not redefine completion around the work already present.
