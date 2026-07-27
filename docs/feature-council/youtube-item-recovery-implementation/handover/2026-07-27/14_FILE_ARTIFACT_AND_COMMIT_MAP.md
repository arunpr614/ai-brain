# File, Artifact, and Commit Map

## Purpose and evidence boundary

This document maps the repository snapshot, accepted artifacts, unfinished
local files, and expected successor-owned files at the handover boundary. It is
a read-only inventory of observed bytes and intended roles. It does not stage,
commit, push, merge, migrate, deploy, enable, or release anything.

The hashes below are SHA-256 values captured at the stated snapshot unless a
row is explicitly labeled as a pushed commit or accepted frozen artifact. They
are not a substitute for the package's current-state record or a fresh
verification run. The uncommitted implementation hashes are evidence for this
snapshot only; editing any listed file changes the hash and requires a fresh
inventory.

## Repository, branch, and pull-request snapshot

Read-only repository audit snapshot: **2026-07-27 14:02:17 IST**.

| Field                                 | Observed value                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Repository root                       | Resolve at use time with `PROJECT_ROOT="$(git rev-parse --show-toplevel)"`; every filesystem path in this map is repository-relative. |
| Remote                                | `https://github.com/arunpr614/ai-brain.git`                                                                                           |
| Branch                                | `feat/youtube-item-recovery-enrichment`                                                                                               |
| Current local and pushed feature head | `4786b079e88cc01ec8e9c300faa93e3832ae2678`                                                                                            |
| Current `origin/main`                 | `6784e0e85c50fd86e3353b54a8b1964f045b65b1`                                                                                            |
| Actual merge base with `origin/main`  | `6784e0e85c50fd86e3353b54a8b1964f045b65b1`                                                                                            |
| Ahead/behind `origin/main`            | 22 ahead, 0 behind                                                                                                                    |
| Ahead/behind feature remote           | 0 ahead, 0 behind                                                                                                                     |
| Pushed feature diff                   | 214 files, 75,704 insertions, 2,171 deletions                                                                                         |
| Pull request                          | [Draft PR #57](https://github.com/arunpr614/ai-brain/pull/57)                                                                         |
| PR state                              | Open, draft, mergeable state `CLEAN`                                                                                                  |
| PR head                               | `4786b079e88cc01ec8e9c300faa93e3832ae2678`                                                                                            |
| Reviews at snapshot                   | None                                                                                                                                  |
| Strict required check                 | `verify`                                                                                                                              |

The pull request and hosted checks describe only pushed head
`4786b079e88cc01ec8e9c300faa93e3832ae2678`. They do not validate any dirty
worktree byte listed later in this document. The PR body was also stale at the
snapshot boundary: it still described hosted macOS evidence as pending.

## Pushed feature commit map

These are the complete 22 commits from the actual merge base through the pushed
feature head, in chronological order.

|   # | Commit                                     | Subject                                                   | Primary role                                                                                                                                 |
| --: | ------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | `e97a1b5df8bd0fff5440cab8b467e2558fb2fa19` | `docs(youtube): freeze Stage 0 reconciliation contracts`  | Freezes source inventory, hash manifest, dependency graph, migration collision disposition, transfer decision, and Stage 0 review evidence.  |
|   2 | `013e3bc5aaf4206d23a1a94518809a3f11acc084` | `feat(youtube): add Stage 1 authority foundations`        | Adds non-enabling authority, schema-capability, hold, origin, deployment, capture-policy, and containment foundations.                       |
|   3 | `66d1cce5f1b980f03e3fdcbccad8ec01ec77748c` | `feat(youtube): contain claimants and reserve dispatches` | Contains existing workers, scripts, enrichers, and claimant paths; reserves new dispatch identities without enabling recovery.               |
|   4 | `f8717c008560a8d6f84203f0b10bfbadffe669ae` | `fix(youtube): redact private processing diagnostics`     | Removes private processing detail from client/error/status surfaces and adds regression tests.                                               |
|   5 | `93a9073bfced13bf516e18d1b05ea508693c7288` | `build(youtube): attest rollback compatibility`           | Adds release-artifact and rollback-compatibility checks for Stage 1 containment.                                                             |
|   6 | `bd0fb7b8f8d3b8ff6e7143582935bee88e72c2da` | `docs(youtube): record Stage 1 formal GO evidence`        | Records the Stage 1 reviews, decisions, authority matrix, security/privacy review, risks, tracker status, and running-log evidence.          |
|   7 | `ff3a425630791d10cd36c9c71db90141b0128743` | `fix(youtube): integrate audited schema 027 frontier`     | Reconciles the Stage 1 containment implementation with the audited migration-027 frontier on current main.                                   |
|   8 | `fc000535040f13316cef72ab5d68cbc088a2cc1b` | `docs(youtube): freeze Stage 2 physical contract`         | Commits the accepted Stage 2 physical-schema contract, registry, static authority evidence, retained reviews, and fixtures.                  |
|   9 | `e731182ef2dd92f292e7ba7ea4ff1c068f740f10` | `feat(youtube): add Stage 2 fingerprint framing`          | Adds deterministic Stage 2 fingerprint framing and tests.                                                                                    |
|  10 | `c722b3d4fc607cee770e89f33bbfcdcb5d9b0ed9` | `feat(youtube): gate Stage 2 migration startup`           | Adds pre-startup migration admission and refusal tests without authoring migration 028.                                                      |
|  11 | `26245cbdb037d005c7c7ee4f5321c8a01ec3c60d` | `feat(youtube): add bounded item instance allocator`      | Adds the bounded, no-history item-instance allocation primitive and tests.                                                                   |
|  12 | `3e8e56bd7ff8fde871b36b9f71ee87933dd28e09` | `test(youtube): add Stage 2 evidence protocol primitives` | Adds deterministic evidence envelope/protocol primitives and their tests.                                                                    |
|  13 | `5be5985ade30f019ff44bdfb8fcf01f147518d2c` | `test(youtube): prove disposable native bridge route`     | Adds the initial memory-only, disposable native bridge build/probe/controller/test route.                                                    |
|  14 | `aa4baa335df34802adbcb9b0d1b41a59c9f83bb6` | `docs(youtube): record Stage 2 foundation wave`           | Records the bounded Stage 2 foundation wave in the tracker and running log.                                                                  |
|  15 | `60de5be628cd12fa7d75459b9bc9ca00f952e0b7` | `test(youtube): add deny-only Stage 2 scope policy`       | Adds a deny-only policy that keeps the disposable evidence route out of broader authority and packaging.                                     |
|  16 | `fb1517a1b82e7eac493890f44afb86267d986e71` | `docs(youtube): record Stage 2 scope primitive`           | Records the deny-only scope primitive and its bounded status.                                                                                |
|  17 | `d885007f3fe6e534b38e27903ebcc45d874b7a50` | `fix(youtube): seal Stage 2 native bridge evidence`       | Hardens and exact-hash seals the memory-only native route, adds its proof worker, and records the bounded final gate.                        |
|  18 | `9567d8fb0ae74aa1518840099a4783e56eef879b` | `docs(youtube): log native route gate`                    | Appends the bounded native-route gate result to the running log.                                                                             |
|  19 | `6e61eee5ce9b2b5295ecfefdcedfb4293935a743` | `test(youtube): add nominal file factory CI proof`        | Adds the disposable file-backed factory, nominal proof/controller/tests, product-suite routing, CI job, and adversarial nominal gate report. |
|  20 | `39bfad9ba39eed165ecd77f86554c293dc53344f` | `fix(youtube): restore clean CI typecheck`                | Repairs test setup/type errors exposed by the nominal factory wave.                                                                          |
|  21 | `1fb822670d64dfdcc78fbdeadf5387c16f1e59b0` | `docs(youtube): classify implementation CI artifacts`     | Registers the new product-CI commands and feature-council artifact classification.                                                           |
|  22 | `4786b079e88cc01ec8e9c300faa93e3832ae2678` | `docs(youtube): record nominal CI gate`                   | Records the pushed nominal local/hosted gate evidence in the running log.                                                                    |

No later implementation commit exists at this handover boundary.

## Dirty tracked implementation state

There were no staged files. After the nominal consumer remediation and before
the still-pending final append-only running-log entry, the dirty
implementation/control delta was **15 tracked files, 849 insertions, and 45
deletions** relative to pushed head. The latest live log entry at this snapshot
remains the 2026-07-27 12:43 IST nominal milestone. A future final log append
belongs to the sanitized handover group and is intentionally excluded from this
implementation/control count; publication remains unproven until that
structured entry exists and publication mode passes. Roles describe intent
observed in the diff, not a passing or accepted state.

| Current SHA-256                                                    | Path                                                                                    | Current role and caution                                                                                                                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `3b88a71e60a98fccca12b83b11c64267c61896ba5854231e8014ff9972254152` | `.github/workflows/product-ci.yml`                                                      | Routes a crash/restart CI suite. It must not be treated as effective while zero test names match the intended prefix and no selection-count sentinel exists.                     |
| `48bc6344e1a134ef1760183a15becce9269404e7b3842b765cff91d7ad880c93` | `docs/agent-docs/command-safety-registry.md`                                            | Classifies the proposed crash/recovery commands. Documentation classification does not make their proof complete.                                                                |
| `5c472d8aa67b4fb30a53fde84e1777cfb4e7623c2db4ffc6d29c2d922d7f236c` | `docs/feature-council/youtube-item-recovery-implementation/DECISION_LOG.md`             | Records current Stage 2 decisions, including the D-021 SQLite source conflict.                                                                                                   |
| `86e349a96323d106b5ac4dcdebd08e9e07b42aa4c235b118e9eaed54c7ab3b71` | `docs/feature-council/youtube-item-recovery-implementation/IMPLEMENTATION_TRACKER.md`   | Tracks nominal factory completion, abrupt-restart work, and the D-021 blocker.                                                                                                   |
| `4516db6c0fc614af880f1e27eb6d8955750e14c8a54e088e7aae884ad9611d28` | `docs/feature-council/youtube-item-recovery-implementation/REQUIREMENT_TRACEABILITY.md` | Maps requirements and acceptance controls to current evidence and gaps.                                                                                                          |
| `142a7f4c15361f2dbab2b47ce4edf4db8e8ac1c2f3e3d2966a4a73b17c0a6a7f` | `docs/feature-council/youtube-item-recovery-implementation/RISK_REGISTER.md`            | Records abrupt-restart, WAL-reset, source-provenance, and authorization risks.                                                                                                   |
| `498d12b54025eb94a06453db28fbcb037846ec1dab950db16cc6a270cb39e444` | `docs/feature-council/youtube-item-recovery-implementation/SOURCE_RECONCILIATION.md`    | Updates the living source reconciliation with the SQLite WAL-reset conflict while keeping D-021 unaccepted pending formal owner action.                                          |
| `f6eaa1a45dfbc109606d189841b4e8af1972478baaf6da4f3c7ec76fdda2001b` | `native/brain-s28-file-factory/file-factory-source-manifest.json`                       | Binds the modified native file-factory inputs. This is a dirty-worktree hash, not the pushed manifest hash.                                                                      |
| `5d9ee11ea7cf657635e8500ee3723a8126ba03a3d8f8b5422cec58929911df9f` | `native/brain-s28-file-factory/src/brain_s28_file_factory.cpp`                          | Adds durable-create/fsync behavior and native crash/recovery profiles. It has only bounded direct session evidence, not integrated proof.                                        |
| `3c10cc3fe7733b65261115da8458facf250b4f456733b3bc268524d254370169` | `package.json`                                                                          | Adds proposed product-suite entry points for crash/restart verification.                                                                                                         |
| `0355d4ab7d1d10ff93d623b0ffad34d745b1251ba80258d4660d1342680117f3` | `scripts/run-product-test-suite.mjs`                                                    | Adds crash-suite selection/routing. It currently lacks a nonzero selected-test assertion.                                                                                        |
| `e274ab7179a1c29118b358edf19fa2eb2bd1defc062302f5916dac3e23e2ba74` | `scripts/run-youtube-stage2-file-factory-proof-worker.mjs`                              | Reconciles the nominal worker with both fsync trace events; current local nominal rerun passed 30/0/3.                                                                           |
| `44dba3abd568cd4d409918dd167bfc2fde815bc443853596a66d919d6d78eb9e` | `src/db/stage2/file-factory-proof.test.ts`                                              | Pins the independent digest of the current 265-entry trace; current local nominal rerun passed 30/0/3.                                                                           |
| `316690483b5c0c4e98f98a66553e213c5ce1dffb215d6f365bbbc3144244b8da` | `src/db/stage2/file-factory.ts`                                                         | Extends operation traces and crash-restart receipt/types. Nominal trace consumers are reconciled; crash/recovery validators are not yet reconciled with all worker receipt keys. |
| `71a391289000646f7fb1e97918ce44b0672c7bc91ebe3455ea919f8b4b2c6cb5` | `src/lib/runtime/product-test-suite.test.ts`                                            | Extends product-suite inventory/routing assertions for the proposed crash suite.                                                                                                 |

The pushed-versus-current drift is material. In particular:

- native C++ changed from pushed `76f157bf…` to current `5d9ee11e…`;
- the base file-factory manifest changed from pushed `70fd3962…` to current
  `f6eaa1a4…`; and
- `src/db/stage2/file-factory.ts` changed from pushed `9980265f…` to current
  `31669048…`.

Hosted evidence at `4786b079…` cannot be transferred to those current bytes.

## Untracked feature implementation state

The following **six non-handover feature files** were untracked at the
snapshot.

| Current SHA-256                                                    | Path                                                                                                                               | Intended role and current boundary                                                                                                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `b8d38446b7a40b0e60536a899abd31f0afdc9946367433618a9220fdc482878b` | `docs/feature-council/youtube-item-recovery-implementation/source-reconciliation/SQLITE_WAL_RESET_ADVISORY_ADDENDUM_2026-07-27.md` | Draft D-021 SQLite source advisory. Its first adversarial review is NO-GO with four P1 findings; this hash is not accepted.                                           |
| `9dd35f94a4a0676196d4942818a85c5b7aea06c60388814b7befd372345a0407` | `native/brain-s28-file-factory/file-factory-crash-recovery-source-manifest.json`                                                   | Candidate input binding for the proposed disposable crash/recovery build profiles; incomplete until controller, validator, and test evidence agree.                   |
| `172a02763130d123094f025cff87e37a02b21ece31cc64d4f7b76643df37ee2c` | `scripts/build-youtube-stage2-file-factory-crash-recovery.mjs`                                                                     | Candidate bounded crash/recovery builder; it is not complete or accepted until the parent controller and deterministic integrated tests pass against its exact bytes. |
| `faf7394397de3c922a92467c10c342ae5e6f91ffa7caf30a13efb38acc1c504b` | `scripts/run-youtube-stage2-file-factory-crash-worker.mjs`                                                                         | Runs the child that deliberately terminates at a frozen crash coordinate.                                                                                             |
| `1b8d6fa66c55f40d67c6f721a6383e8082139b93c31b11426a4bcf07b86efd91` | `scripts/run-youtube-stage2-file-factory-recovery-worker.mjs`                                                                      | Runs the fresh recovery child and emits a content-free receipt. Its exact-key validator currently conflicts with the expanded native receipt.                         |
| `879531cfbc98352bfcf04131f23172c9da5d7b3d77fd64a916c0a4b2f4c75e44` | `scripts/youtube-stage2-file-factory-crash-recovery-worker-core.mjs`                                                               | Shared worker validation, build, cleanup, and receipt logic.                                                                                                          |

Direct specialist-session runs observed both native crash/recovery pairs as
green, with the expected exit codes and empty cleanup roots. The builder,
workers, and planned controller remain candidate/incomplete artifacts: that
session evidence was not an integrated controller/test/CI run and does not cure
the missing controller, validator mismatch, skipped tests, or vacuous suite
selection.

## Frozen memory-only native-route prerequisites

`MEMORY_ONLY_NATIVE_ROUTE_PREREQUISITE_HASHES` in
`src/db/stage2/file-factory.ts` and the independent proof test bind these nine
pre-existing files. “Memory-only” names the disposable route; it does not mean
the values came from conversational memory. Each value below was also
recomputed directly from the current repository file.

| Hash name         | SHA-256                                                            | Bound path                                                  |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `sourceManifest`  | `50db75350d3fba0bb5c2661481c216769d6cebcc87ee7e76c4f30705c5486ee0` | `native/brain-s28-bridge/bridge-source-manifest.json`       |
| `bridgeSource`    | `fde48c0ae02591c7b9f51ea8042ef247a70f20d60cc0ebb9a0452baf9ef4ac43` | `native/brain-s28-bridge/src/brain_s28_bridge.cpp`          |
| `bridgeHeader`    | `31f50b68119724917aad4134164d23deed028a878782ebf4dea06cf2fb2550c8` | `native/brain-s28-bridge/src/brain_s28_bridge.hpp`          |
| `buildScript`     | `fe999b9e17e449289f5ccc3cdcd367a47934437e096f712d73e0cc32ac16df1b` | `scripts/build-youtube-stage2-native-bridge.mjs`            |
| `probeCli`        | `2d5ef8857505d4cb4d2debcb9bebd564dd3f88c8a3e058090cb5b1bd2e8a785a` | `scripts/probe-youtube-stage2-native-bridge.mjs`            |
| `proofWorker`     | `74f5e4dbb9613c52f2668cbc8e803624fa6e9a3a04f4792baab6a191c836b316` | `scripts/run-youtube-stage2-native-bridge-proof-worker.mjs` |
| `publicTypes`     | `4f6cd925ee90b9cea61f08c3a29437b36802e8f281a30eefe777bf3a7aa02cdb` | `src/db/stage2/native-bridge.ts`                            |
| `proofController` | `da5f68468828af15cf0598fa7508108fe8cc91da30e1b74154a65022850ff120` | `src/db/stage2/native-bridge-proof.ts`                      |
| `proofTests`      | `78ede99752b948fa247f6b6b60ca6bd78948c730d11eec3fbdb51a7fba40a6bc` | `src/db/stage2/native-bridge-proof.test.ts`                 |

Changing any prerequisite invalidates the pinned native-route proof and requires
a fresh exact-hash review. These hashes do not grant migration, S28, lab,
release, or production authority.

## Accepted Stage 2 contract package

The following four artifacts were recomputed at the handover boundary and are
the exact accepted **Contract GO** package by content hash.

| Accepted SHA-256                                                   | Read-only artifact                                                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `d1eef042423d7d2d3413637f62bd8ed5842b64846db6f656a0b8e1cb7e5eed48` | `docs/feature-council/youtube-item-recovery-implementation/implementation/STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md`                        |
| `7b022d82e855891eb1a818df9c09ab070586c13beea7acf6a8c003d845be9f45` | `docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-acceptance-registry-v2.json`                |
| `e691edfd0edcade37d439906f3b97dee9a3b05d57baae995ae23fb0254bbfd5d` | `docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/stage2-contract-static-authority-index-v1.json`    |
| `133d55fae063244e7c6d413c64acbe88ebf0d1e83736296d9a00ca00de2e68a6` | `docs/feature-council/youtube-item-recovery-implementation/implementation/fixtures/verify-stage2-contract-static-authority-index.mjs` |

Do not edit these artifacts in place. Contract GO authorizes implementation
only in disposable/private conditions under the frozen contract. It is not
Implementation GO and grants no migration, browser, lab, provider, merge,
deployment, release, or production authority.

Local mode `0444`, when present, is only a best-effort accidental-edit guard.
Git does not durably preserve the read-only permission bits. The durable
identity controls are the SHA-256 values above, the committed Git blobs, and
the registry/index/verifier chain. Recompute and compare those controls before
use; never infer integrity from `chmod` alone.

## Source-control and governance document map

### Tracked, unchanged historical/frozen evidence

These files are important inputs but are not all current-state summaries. Their
unchanged hashes establish which historical bytes the branch carries.

| Current SHA-256                                                    | Path                                                                                                       | Scope                                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `7cd45f7b5ab7c05cf898f192886a058063ce4ff1facea42c82a1ac5be5370ffd` | `docs/feature-council/youtube-item-recovery-implementation/SOURCE_INVENTORY.md`                            | Stage 0 source inventory; historical/frozen.                                                         |
| `de664947e6a66de7d70fb30d0fcc0311fcc69a63f58f56d616124b4de5756005` | `docs/feature-council/youtube-item-recovery-implementation/source-reconciliation/SOURCE_HASH_MANIFEST.md`  | 140-path source hash manifest; historical/frozen and revalidated with zero missing/mismatched paths. |
| `bc8fba53d63004870627907d79ff29073e1a39f28b60ea0d40547e7324cd1190` | `docs/feature-council/youtube-item-recovery-implementation/DEPENDENCY_GRAPH.md`                            | Original stage dependency/order model; historical/frozen.                                            |
| `676b737e5bd92606528a463ec5c57ac7a13e43c0dfd4d8e22ecd32e0071bc88a` | `docs/feature-council/youtube-item-recovery-implementation/IMPLEMENTATION_BASELINE.md`                     | Frozen implementation baseline and authority boundary.                                               |
| `05d3dab36e3754656f0155b4b2684f3452f0f19fd95d0ed7e1edda049ba173f7` | `docs/feature-council/youtube-item-recovery-implementation/MIGRATION_COLLISION_RESOLUTION.md`              | Historical resolution of the former 026 collision and coordinated 027–030 sequence.                  |
| `8312ede5401cecd88edc8804947e5146e0b22e07a5ddd75fe0160d41366cd047` | `docs/feature-council/youtube-item-recovery-implementation/decisions/TWO_CHANNEL_TRANSFER_ADDENDUM.md`     | Frozen two-channel transfer decision.                                                                |
| `143efe7232cb0a3c1496a7bd1d995ea372910a9093a28bdc2ca64a37559bf43c` | `docs/feature-council/youtube-item-recovery-implementation/implementation/CALLER_CONTAINMENT_INVENTORY.md` | Stage 1 caller/worker containment inventory.                                                         |
| `f37da978e812d33de1e7efa8b5574b567ffe5bf5198020d1f3f715342ce822b1` | `docs/feature-council/youtube-item-recovery-implementation/implementation/RELEASE_AUTHORITY_MATRIX.md`     | Stage 1 release-authority matrix; denial remains binding.                                            |
| `5698ea30b0bf08e76e944e17e7e25299565553bbaa9f7b998e6c6db784fcdabd` | `docs/feature-council/youtube-item-recovery-implementation/implementation/SECURITY_PRIVACY_REVIEW.md`      | Completed Stage 1 review only; it is not a final feature security/privacy review.                    |

### Living documents modified in the worktree

The current-state governance set is:

- `DECISION_LOG.md`;
- `IMPLEMENTATION_TRACKER.md`;
- `REQUIREMENT_TRACEABILITY.md`;
- `RISK_REGISTER.md`; and
- `SOURCE_RECONCILIATION.md`.

Their exact current hashes appear in the 15-file dirty table above. They contain
newer state than the historical/frozen Stage 0 documents, but they are still
uncommitted and must be reviewed together with their implementation bytes.

The D-021 advisory is a separate untracked draft at
`b8d38446b7a40b0e60536a899abd31f0afdc9946367433618a9220fdc482878b`.
The handover persists its review findings elsewhere, but neither inclusion in
this inventory nor documentation of the NO-GO verdict turns D-021 into an
accepted gate.

### Feature-council corpus count before this handover

Before the local `handover/2026-07-27/` package was added, the
`youtube-item-recovery-implementation` corpus contained:

- exactly **70 tracked files**; and
- exactly **one untracked feature-council file**, the D-021 advisory.

The handover Markdown files are a separate local documentation package. They
must not be counted backward into the 70-file pre-handover baseline.

## Missing, candidate, and future artifact map

| Missing or future artifact                                                                                                             | Intended role                                                                                                                                                                                     | Gate before creation or acceptance                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/stage2/file-factory-crash-recovery-proof.ts`                                                                                   | Missing candidate parent controller for private root creation, child spawn/exit proof, fresh recovery, exact receipt validation, cleanup, timeout, and negative fixtures.                         | It remains incomplete until exact keys/traces reconcile and deterministic local tests pass.                                                                                                                             |
| Changes to `src/db/stage2/file-factory-proof.test.ts`                                                                                  | Replace the two P1 skips with real `crash/restart:` tests and add hostile controller/receipt/cleanup fixtures.                                                                                    | The suite must select a nonzero count, execute both profiles, and report zero skips.                                                                                                                                    |
| Crash-suite selection sentinel                                                                                                         | Causes `stage2-native-crash-restart` to fail if no intended test is selected or if an intended test is skipped.                                                                                   | Required before CI routing can be evidence.                                                                                                                                                                             |
| `docs/feature-council/youtube-item-recovery-implementation/source-reconciliation/SQLITE_FIXED_SOURCE_SEMANTIC_COMPATIBILITY_MATRIX.md` | Records candidate-fixed-source observations against the frozen SQLite 3.49.2-sensitive WAL/checkpoint trace, callback ordering, `sqlite-vec`, `trusted_schema`, and delete-feasibility semantics. | Every row must bind expected behavior, observation, named test, command, source/build hashes, and result. Normative drift requires a versioned addendum plus regenerated registry/index/verifier and fresh Contract GO. |
| `docs/feature-council/youtube-item-recovery-implementation/handover/INDEX.md`                                                          | Stable repository-relative reader anchor to the dated package, sealed manifest hash, verifier, current gate, and latest accepted review.                                                          | Public-safe bytes, a valid dated manifest, and verifier success.                                                                                                                                                        |
| `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/GOVERNING_GOAL_PUBLIC_SNAPSHOT.md`                      | Portable, privacy-scrubbed operational snapshot of the governing goal and authorization boundaries.                                                                                               | Must preserve denials and precedence without embedding machine-local source paths or private identifiers.                                                                                                               |
| `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/CURRENT_STATE.md`                                       | Canonical mutable snapshot for head, dirty-state classes, evidence freshness, active gates, and mutation authority.                                                                               | Refresh immediately before sealing; duplicated facts elsewhere defer to this file.                                                                                                                                      |
| `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/ADVERSARIAL_REVIEW_DISPOSITION.md`                      | Maps every review finding to remediation evidence and residual status without publishing the private raw review artifact.                                                                         | Zero unresolved P0/P1 for acceptance; privacy scan must pass.                                                                                                                                                           |
| `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/COLD_START_READER_TEST.md`                              | Records an independent, no-history reader test of the exact package bytes and any resulting fixes.                                                                                                | Run after payload stabilization; rerun if reader-facing payload changes.                                                                                                                                                |
| `scripts/verify-youtube-item-recovery-handover.mjs`                                                                                    | Verifies package membership, hashes, line counts, links, required controls, stable index anchoring, and privacy policy in local/publication modes.                                                | Both modes must fail closed on missing/mismatched bytes; publication mode must also require Git-durable and public-safe state.                                                                                          |
| `src/db/migrations/028_youtube_browser_transcript.sql`                                                                                 | Additive YouTube browser-transcript foundation under the accepted Stage 2 contract.                                                                                                               | Do not author/apply until abrupt-restart proof is accepted and D-021 source remediation has zero P0/P1.                                                                                                                 |
| Migration-028 setup/tests and generated schema manifest                                                                                | Prove clean install, upgrade, old/new binary compatibility, schema names/counts, rollback/forward recovery, and contract parity.                                                                  | Must bind exact migration/parser/package hashes; no production database.                                                                                                                                                |
| Stage 2 runtime/package implementation and AC01–AC17 evidence                                                                          | Implements the frozen S28 contract and produces actual platform/package evidence.                                                                                                                 | Separate Implementation GO with zero P0/P1; current Contract GO is insufficient.                                                                                                                                        |
| `029_manual_transcript_enrichment_expand.sql`                                                                                          | Future expansion step for held manual enrichment.                                                                                                                                                 | Only after 028 and its runtime foundation are accepted.                                                                                                                                                                 |
| `030_manual_transcript_enrichment_contract.sql`                                                                                        | Future contract/finalization step for manual enrichment.                                                                                                                                          | Only after 029 compatibility and product semantics are proven.                                                                                                                                                          |
| Existing Chrome-companion extension changes                                                                                            | Adds explicit inspect/recover/link-save actions using the already researched least-privilege architecture.                                                                                        | Stage 2 accepted first; no persistent YouTube permission, cookies, or silent capture. Exact paths must be discovered from current extension sources rather than invented.                                               |
| Exact-item recovery implementation                                                                                                     | Binds a visible transcript to the exact item/revision and attaches it only after explicit consent.                                                                                                | Chrome/data foundations, stale-revision fences, privacy, security, UX, and QA gates.                                                                                                                                    |
| Metadata-only link-save implementation                                                                                                 | Saves only the true link-only metadata route.                                                                                                                                                     | Must remain separate from transcript capture and respect explicit release authority.                                                                                                                                    |
| Held manual-enrichment implementation                                                                                                  | Manually processes only the exact already attached held transcript/revision.                                                                                                                      | Recovery/data foundations and explicit user action; production processing remains denied.                                                                                                                               |
| UX and accessibility implementation                                                                                                    | Final states, error handling, consent, progress, accessibility, and negative-state behavior.                                                                                                      | Feature implementation plus approved UX evidence.                                                                                                                                                                       |
| `QA_REPORT.md`                                                                                                                         | Consolidated test matrix and exact evidence register.                                                                                                                                             | Real local/hosted runs only; no inherited claims.                                                                                                                                                                       |
| `LAB_CANARY_REPORT.md`                                                                                                                 | Records an authorized synthetic/private live-lab canary.                                                                                                                                          | Create as an execution report only if the complete external authorization packet exists; otherwise record the lab as blocked.                                                                                           |
| `PRODUCTION_NEGATIVE_VERIFICATION.md`                                                                                                  | Proves production browser capture and held-transcript processing remain disabled/denied.                                                                                                          | Required before any release claim.                                                                                                                                                                                      |
| `RELEASE_PLAN.md`                                                                                                                      | Exact staged release gates, authority, rollback triggers, and monitoring.                                                                                                                         | Implementation GO and explicit release authorization.                                                                                                                                                                   |
| `ROLLBACK_PLAN.md`                                                                                                                     | Compatible rollback and forward-recovery procedures bound to package/schema states.                                                                                                               | Rehearsed evidence before release.                                                                                                                                                                                      |
| `WIKI_UPDATE_SUMMARY.md`                                                                                                               | Truthful, privacy-safe Wiki delta and evidence links.                                                                                                                                             | Update only after accepted state exists; do not publish private paths or unsupported readiness claims.                                                                                                                  |
| `FINAL_IMPLEMENTATION_REPORT.md`                                                                                                       | Final scope, artifact hashes, tests, gates, residual risks, and authorization state.                                                                                                              | Only after the complete feature and evidence package actually exist.                                                                                                                                                    |

None of the future artifacts above exists or is accepted merely because it is
named in this map.

## Candidate commit allowlists and activation controls

These groups are exact candidate path allowlists, not staging commands and not
mutation authority. A group may be placed in the index for commit only after
all applicable gates pass. Group E has one narrower pre-commit exception: after
local verification and a zero-P0/P1 exact-byte review, its exact allowlist may
be staged solely to run publication mode. No commit or remote write is
authorized unless that staged set then passes publication mode.

The pre-staging requirements are:

1. an active authority source explicitly permits the exact mutation, branch,
   remote, and publication scope, and that authority is recorded in the
   canonical current-state artifact and the verifier-bound final log block;
2. every candidate path exists, its diff has been reviewed, and every required
   pre-staging gate for the group has passed;
3. the candidate allowlist is updated before use if a required fixture or
   control has a new path; and
4. the unrelated nested checkout and every other out-of-scope path remain
   untouched and outside the index.

Never use a workspace-wide add, recursive glob, or inferred path set. If the
authority or exact path set is ambiguous, stop without mutating the index.

### Group A: crash/restart implementation and tests

Candidate allowlist:

- `native/brain-s28-file-factory/file-factory-source-manifest.json`
- `native/brain-s28-file-factory/file-factory-crash-recovery-source-manifest.json`
- `native/brain-s28-file-factory/src/brain_s28_file_factory.cpp`
- `scripts/build-youtube-stage2-file-factory-crash-recovery.mjs`
- `scripts/run-youtube-stage2-file-factory-crash-worker.mjs`
- `scripts/run-youtube-stage2-file-factory-recovery-worker.mjs`
- `scripts/run-youtube-stage2-file-factory-proof-worker.mjs`
- `scripts/youtube-stage2-file-factory-crash-recovery-worker-core.mjs`
- `src/db/stage2/file-factory.ts`
- `src/db/stage2/file-factory-crash-recovery-proof.ts`
- `src/db/stage2/file-factory-proof.test.ts`

This group remains inactive while the controller is missing, crash/recovery
validators disagree, tests are skipped, or hostile-boundary fixtures are absent. The
builder and controller are candidates, not complete deliverables, until the
integrated deterministic proof passes against their exact hashes. Any new
fixture path must be added explicitly to this allowlist and reviewed before the
group can activate.

### Group B: product-suite router and hosted-CI integration

Candidate allowlist:

- `.github/workflows/product-ci.yml`
- `docs/agent-docs/command-safety-registry.md`
- `package.json`
- `scripts/run-product-test-suite.mjs`
- `src/lib/runtime/product-test-suite.test.ts`

This group remains separate from Group A and inactive until matching tests
exist, the selected-test count is nonzero, intended skips are zero, and the
router fails closed on a vacuous selection.

### Group C: D-021 source and semantic controls

Current exact documentation-control candidate allowlist:

- `docs/feature-council/youtube-item-recovery-implementation/source-reconciliation/SQLITE_WAL_RESET_ADVISORY_ADDENDUM_2026-07-27.md`
- `docs/feature-council/youtube-item-recovery-implementation/source-reconciliation/SQLITE_FIXED_SOURCE_SEMANTIC_COMPATIBILITY_MATRIX.md`

This two-path list is not a complete D-021 closure commit. It remains inactive
until the chosen fixed source/package/build paths, executable provenance
refusal gate, actor/checkpoint inventory, negative verifier/tests, owner
decision, immutable decision seal, and formal exact-hash review have known
repository-relative paths and are added to a reviewed revision of this
allowlist. The current advisory remains NO-GO, and migration 028 remains
blocked. Any normative semantic drift requires a versioned compatibility
addendum plus regenerated registry/index/verifier and fresh Contract GO; the
frozen contract package must not be edited in place.

### Group D: post-hosted governance evidence

Candidate allowlist:

- `docs/feature-council/youtube-item-recovery-implementation/DECISION_LOG.md`
- `docs/feature-council/youtube-item-recovery-implementation/IMPLEMENTATION_TRACKER.md`
- `docs/feature-council/youtube-item-recovery-implementation/REQUIREMENT_TRACEABILITY.md`
- `docs/feature-council/youtube-item-recovery-implementation/RISK_REGISTER.md`
- `docs/feature-council/youtube-item-recovery-implementation/SOURCE_RECONCILIATION.md`
- `RUNNING_LOG.md`

This group records exact pushed-commit and hosted-run evidence after Groups A,
B, or C are committed and checked. It must not predict a hosted result, inherit
evidence from an earlier SHA, or describe a pre-push review as final. A
mandatory post-hosted adversarial review must inspect the exact pushed commit,
required job names/IDs, selection counts, skip counts, logs, and required
cases before these documents make an accepted or publication-ready claim.

### Group E: sanitized handover package and verifier

Candidate allowlist:

- `docs/feature-council/youtube-item-recovery-implementation/handover/INDEX.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/README.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/GOVERNING_GOAL_PUBLIC_SNAPSHOT.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/CURRENT_STATE.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/01_GOAL_SCOPE_AND_AUTHORITY.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/02_REFERENCE_EVIDENCE_INVENTORY.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/03_WORK_COMPLETED_AND_DELIVERED.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/06_ARCHITECTURE_AND_DATA_FLOW.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/07_REQUIREMENTS_AND_VERIFICATION_STATUS.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/08_EXECUTION_PLAYBOOK.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/09_DECISIONS_RISKS_BLOCKERS_AND_STOP_CONDITIONS.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/10_GIT_PR_CI_TESTS_AND_COMMANDS.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/11_DOCUMENTATION_WIKI_LAB_AND_RELEASE.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/12_SUCCESSOR_COMPLETION_CHECKLIST.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/14_FILE_ARTIFACT_AND_COMMIT_MAP.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/ADVERSARIAL_REVIEW_DISPOSITION.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/COLD_START_READER_TEST.md`
- `docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/HANDOVER_MANIFEST.md`
- `RUNNING_LOG.md`
- `scripts/verify-youtube-item-recovery-handover.mjs`

Before this group can activate, the exact payload must pass the cold-start
reader test, the manifest and stable index must bind the final bytes, and both
the dedicated public-privacy scan and a fresh adversarial review must report
zero P0/P1. Those gates authorize only the strict log append and exact Group E
staging for publication verification. Publication mode must enumerate the exact
dated directory, require every allowlisted path and no other staged path
including deletions, enforce every configured `origin` fetch and push
destination plus public repository visibility, and validate a structured
latest running-log record bound to the manifest hash, verifier hash, locally
present final review artifact/report digest, `GO`, and zero P0/P1. That unique
block must also bind the exact index hash and the current Group E
repository/branch/action/scope/exclusion authority attestation; the referenced
report must contain matching exact-byte review fields. The staged log must be a
strict byte-prefix append of `HEAD`, and the complete appended suffix must pass
privacy scanning. At minimum the privacy gate must reject machine-local home
paths, private email addresses, attachment roots, device/storage names, quoted
or unquoted prefixed, generic, snake-case, kebab-case, or camelCase credential
assignments including bounded whitespace or punctuation separator runs and
non-BMP separators; fixed-width or code-point serialized escapes; JavaScript
backslash line continuations; or string/static-template bracket-key forms;
line or block comments around static bracket keys; YAML flow, nested-flow,
list-flow, or explicit mapping keys; JavaScript private fields and the complete
compound-assignment operator family; closed JavaScript comments between a key
and its assignment operator;
punctuation-leading values; serialized whitespace around JSON/YAML delimiters
and values; and private raw-review identifiers.
The verifier's own source privacy check may exclude only the validated,
ordered privacy-definition factory and credential-scanner factory. It must
scan every top-level byte before, between, and after those two complete
function ranges. Boundaries are derived from each live factory's unique exact
runtime source. Header-only lookalikes cannot move a boundary; duplicate
full-source lookalikes, missing or renamed identities, noncanonical identities,
and reordered ranges fail closed. Each complete runtime source must also match
its literal top-level SHA-256 pin stored outside both excluded ranges.
Factory-only and pin-only tamper probes fail; changing both the source and pin
changes the externally bound verifier digest and requires a fresh exact-byte
review. This exact pin plus that external review is the primary integrity
boundary for aliasing, mutator APIs, and other general JavaScript semantics.

A content-aware lexical scan remains defense-in-depth, not a complete semantic
analyzer. It removes data-only comments, quoted literal contents, and regex
bodies while preserving executable syntax. Sensitive direct, dotted, private,
compound, method/accessor, normalized, or escape-decoded keys fail that scan,
including quoted object/class keys and single or concatenated static bracket
keys. Literal and regex-closing delimiters distinguish division from later
regex operands; balanced control, block, catch, and declaration contexts retain
valid regex statements. Concise-arrow assignments have no prose-context
exemption, executable template interpolation fails, and credential-shaped probe
strings remain inert data.
Credential inspection must parse the complete assigned scalar, including
serialized sensitive-key escapes and line continuations; YAML tags and
anchors; single-quoted, double-quoted, or plain YAML values across valid
continuation lines; YAML doubled-apostrophe, flow mappings, explicit mappings,
JavaScript backslash, private-field, compound-assignment, and comment forms;
literal/folded
block headers with properties or comments; complete block content bounded by
mapping indentation including repeated list markers; and TOML triple-quoted
content with escaped delimiters. Ambiguous single quotes are evaluated under
both YAML and JavaScript grammars, and any credential-bearing closed candidate
fails. A placeholder, supported documentation path, or variable/environment
reference is safe only when the entire assigned scalar matches that form. For
single- or double-quoted JavaScript scalars, triple-quoted scalars, and
JavaScript templates, a complete safe reference is accepted only after
explicit same-line or cross-line continuation analysis. The
terminator scanner skips line and block comments, records actual line breaks,
accepts only EOF, scalar delimiters, or a YAML comment, and rejects operators,
tags, calls, indexes, properties, ternaries, assertions, comparisons, or other
continuations. An unquoted variable or environment reference is accepted only
through a terminated safe prefix with no indented YAML continuation; fallback,
concatenation, comment-delayed continuation, or a later credential assignment
fails. Every nonempty direct/raw credential scalar fails regardless of length.
An empty literal template or a literal template whose complete scalar is an
exact safe reference or explicit placeholder may pass only after the same
termination analysis. Every other nonempty literal template fails regardless
of length; every escaped, interpolated, unclosed, or otherwise complex
credential template fails closed without custom interpolation parsing.
Must-match probes append credential material after
short, angle, word, documentation, quoted, template, and multiline-block safe
prefixes, including explicit block-indentation forms; exact benign quoted,
block, nested/repeated-list sibling, empty-sibling, post-delimiter-comment,
YAML trailing-comment, literal-template, environment-template, and reference
forms remain must-not-match probes.
Static-bracket scanning has no fixed source-span or key-length fail-open cutoff.
It must consume the complete candidate while structurally skipping whitespace
plus line or block comments around the key and closing bracket, copy only the
key into the offset-preserving normalized view, and reject long values across
single, double, or static-template quotes, LF/CRLF, and root or chained access.
YAML normalization must begin at a block, flow-field, or explicit-mapping
boundary and canonicalize only the complete sensitive key. Tags, verbatim
tags, anchors, comments, blank lines, CRLF, list nesting, and multiline
explicit keys are structural syntax rather than key content. A sensitive word
embedded in Markdown prose is not reinterpreted as an assignment. Exact
content-free external-management descriptions may be safe only as complete
scalar matches; appended material must fail.
Manifest, stable-index, final-review, and authority bindings must be parsed
from visible Markdown after fail-closed HTML-comment removal. A true value or
machine block that exists only in a comment cannot satisfy a gate; the
manifest/index rows and structured start/end records must be unique and exact.
Publication must run on the exact attached authorized branch; a detached
`HEAD` fails closed. A local raw review report is required as pre-publication
evidence, must remain absent from the Git index, and is not part of this public
allowlist. Commit, push, and draft-PR update remain blocked until publication
mode passes on that identical staged set.

Passing a pre-push source review permits no final publication claim. After an
authorized push, exact-SHA hosted checks and a post-hosted adversarial review
must pass before the package is described as accepted, final, verified-public,
or publication-ready.

### Mandatory staged-index byte validation

After an authorized operator stages one candidate group, but before a commit:

1. compare the sorted output of `git diff --cached --name-only` byte-for-byte
   with that group's activated allowlist; any extra or missing path is a stop;
2. inspect `git diff --cached --binary -- <each exact allowlisted path>`;
3. for every regular file, compare `git show ":<path>" | shasum -a 256` with
   `shasum -a 256 "<path>"` and with the reviewed expected hash;
4. run `git diff --cached --check`; and
5. repeat the privacy scan and handover verifier against indexed bytes for
   Group E.

Do not commit if the index differs from the reviewed worktree bytes, expected
hashes, or exact allowlist. Reconciliation requires fresh explicit authority;
this map does not authorize changing or clearing index entries.

### Mandatory unrelated-checkout exclusion

An unrelated nested clean checkout is visible to the outer repository as an
untracked directory. Its machine-local name is intentionally omitted from this
public package. Resolve it locally from repository status, then treat that exact
directory prefix as excluded: do not edit, move, format, stage, remove, clean,
or commit it. The staged path-set comparison above must prove that no indexed
path begins with the resolved excluded prefix.

No staging, commit, push, PR update, merge, migration, deployment, Wiki
publication, lab execution, or release was performed while creating this map.

## Handover package file map

The dated Markdown package is under
`docs/feature-council/youtube-item-recovery-implementation/handover/2026-07-27/`.
The stable reader anchor is
`docs/feature-council/youtube-item-recovery-implementation/handover/INDEX.md`,
and the repository-level verifier is
`scripts/verify-youtube-item-recovery-handover.mjs`. This table defines each
payload role; presence in the map is not evidence that its required validation
has passed.

| File                                                 | Role                                                                                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                          | Entry point, current gate summary, read order, authority/freshness rules, fast restart, and claims explicitly not made.                                         |
| `GOVERNING_GOAL_PUBLIC_SNAPSHOT.md`                  | Portable, privacy-scrubbed snapshot of the operational goal, precedence, scope, denials, and mutation boundaries.                                               |
| `CURRENT_STATE.md`                                   | Canonical mutable repository/PR/evidence/gate snapshot to which duplicated current-state claims defer.                                                          |
| `01_GOAL_SCOPE_AND_AUTHORITY.md`                     | Governing feature goal, exact-item recovery, held manual enrichment, link-only separation, environments, stage boundaries, and authorization rules.             |
| `02_REFERENCE_EVIDENCE_INVENTORY.md`                 | Source hierarchy, PR/review packages, exact hashes, direct code evidence, and provenance caveats.                                                               |
| `03_WORK_COMPLETED_AND_DELIVERED.md`                 | Completed Stage 0/1/2 work, pushed commits and CI evidence, dirty native-session evidence, and work not done.                                                   |
| `04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md`       | Dirty-file inventory, modified/untracked grouping, current contradictions, missing controller/tests, and preservation rules.                                    |
| `05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md`       | Frozen Contract GO bytes, crash profiles/protocol, abrupt-restart gaps, D-021 WAL blocker, and remediation sequence.                                            |
| `06_ARCHITECTURE_AND_DATA_FLOW.md`                   | Current and target architecture, authority flow, exact-item/revision binding, and data-flow diagrams.                                                           |
| `07_REQUIREMENTS_AND_VERIFICATION_STATUS.md`         | Milestone, acceptance-case, requirement, and test-evidence status without inherited claims.                                                                     |
| `08_EXECUTION_PLAYBOOK.md`                           | Cold-start continuation sequence from crash proof through D-021, migration 028, feature stages, lab, release, and final audit.                                  |
| `09_DECISIONS_RISKS_BLOCKERS_AND_STOP_CONDITIONS.md` | D-001 through D-021 summary, active P1 blockers, risks, no-go conditions, and mandatory stops.                                                                  |
| `10_GIT_PR_CI_TESTS_AND_COMMANDS.md`                 | Safe state/audit commands, pushed PR/CI evidence, local verification, hosted gates, and staging cautions.                                                       |
| `11_DOCUMENTATION_WIKI_LAB_AND_RELEASE.md`           | Required QA/lab/release/rollback/final reports, Wiki boundary, running-log status, and release-negative requirements.                                           |
| `12_SUCCESSOR_COMPLETION_CHECKLIST.md`               | First-30-minute restart checklist, ordered technical completion gates, external inputs, and definition of done.                                                 |
| `13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md`     | Durable record of the session-derived D-021 NO-GO findings without converting them into an accepted formal review.                                              |
| `14_FILE_ARTIFACT_AND_COMMIT_MAP.md`                 | This exact repository, commit, hash, file-role, future-artifact, preservation, and explicit staging map.                                                        |
| `ADVERSARIAL_REVIEW_DISPOSITION.md`                  | Public-safe finding-by-finding remediation register and residual gate status; the private raw review stays outside the package.                                 |
| `COLD_START_READER_TEST.md`                          | Reproducible independent-reader prompt, exact input boundary, findings, fixes, and rerun result.                                                                |
| `HANDOVER_MANIFEST.md`                               | Integrity seal for the other 19 dated Markdown payload files, including exact SHA-256 values and line counts. The manifest intentionally excludes its own hash. |

The stable `handover/INDEX.md` must pin the dated manifest hash and verifier
entry point. The verifier must validate package membership, payload hashes,
line counts, internal links, the stable anchor, required controls, and privacy
policy. File modes such as local `0444` are not durable evidence; committed Git
blobs, hashes, the manifest/index chain, and successful verification are.

The handover package is documentation only. Its existence does not change any
implementation or release gate.
