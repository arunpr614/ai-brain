# YouTube Stage 2 Disposable File Factory Nominal CI Gate - Adversarial Review

**Created:** 2026-07-27 12:08:23 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** Current uncommitted disposable file-factory slice, portable/native test routing, and Product CI changes on `feat/youtube-item-recovery-enrichment` at `9567d8fb0ae74aa1518840099a4783e56eef879b`
**Report path:** /Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/ReviewReport/YOUTUBE_STAGE_2_DISPOSABLE_FILE_FACTORY_NOMINAL_CI_GATE_ADVERSARIAL_REVIEW_2026-07-27_12-08-23_IST.md

## Executive Verdict

Conditional GO to commit and push the bounded nominal proof for an actual hosted `macos-26` run. NO-GO for stopped-writer readiness, migration 028, release authority, lab enablement, or production authority.

No concrete P0 remains in the reviewed bytes. The hosted-evidence gate remains open until the exact `Stage 2 native nominal proof` job passes. Two explicit P1 crash/restart gaps and one P2 synthetic-fault gap remain; the current evidence must not be described as zero-gap failure-path coverage.

## Evidence Inspected

- Current branch/worktree state and the exact untracked native, builder, worker, controller, type, fixture, and test files.
- `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/.github/workflows/product-ci.yml`
- `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/package.json`
- `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/scripts/run-product-test-suite.mjs`
- `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/src/lib/runtime/product-test-suite.test.ts`
- Strict targeted TypeScript: exit 0.
- Portable product tests: 1,251 passed, 0 failed, 0 skipped.
- Portable coverage run: 1,251 passed, 0 failed, 0 skipped.
- Routed local native run: 30 passed, 0 failed, 3 explicitly skipped.
- Routing tests: 2 passed, 0 failed.
- `actionlint` 1.7.12, workflow YAML parsing, package JSON parsing, JavaScript syntax, and `git diff --check`: exit 0.
- Official Node 22.22.3 Darwin ARM archive SHA-256 and extracted `node.h` / `node_version.h` hashes.
- Current GitHub-hosted runner documentation and `macos-26` ARM image inventory.
- Independent read-only adversarial review and runner-profile verification.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found in the current reviewed bytes.

Three earlier P0 findings were fixed before this report:

1. Linux `npm test` no longer executes Darwin-only proof files. The exact portable/native partition is enforced by `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/scripts/run-product-test-suite.mjs:15`.
2. The required `verify` job uses `always()` and explicitly rejects every dependency result except `success`, preventing a skipped failed dependency from appearing merge-safe at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/.github/workflows/product-ci.yml:72`.
3. The macOS install step puts the exact Node 22.22.3 binary first on lifecycle-script `PATH`, then attests executable, version, and ABI before `npm ci` at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/.github/workflows/product-ci.yml:56`.

### P1 - High Risk

#### 1. Abrupt exit after private database creation has no restart cleanup oracle

**Evidence:** The gap is explicitly skipped at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/src/db/stage2/file-factory-proof.test.ts:1852`. Native failure cleanup closes handles but does not establish safe restart recovery and deletion of owned residue at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/native/brain-s28-file-factory/src/brain_s28_file_factory.cpp:2024`. Parent cleanup accepts only an empty retained root at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/src/db/stage2/file-factory-proof.ts:726`.
**Why it matters:** A process can terminate between durable file creation and nominal native cleanup.
**Failure mode:** Owned `factory.sqlite3` or sidecar residue survives; the parent refuses to remove the non-empty root, and no restart path proves identity-safe recovery or deletion.
**Recommendation:** Add a compile-time or otherwise closed crash coordinate in the real native path, force process exit immediately after durable file creation, and run a separate restart recovery oracle that proves exact identity, lock release, integrity, close, quarantine/unlink, directory fsync, and nonrecursive root removal.

#### 2. Abrupt exit while `BEGIN IMMEDIATE` is held has no restart cleanup oracle

**Evidence:** The gap is explicitly skipped at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/src/db/stage2/file-factory-proof.test.ts:1857`.
**Why it matters:** This is the failure point most likely to leave WAL state and a misleading assumption about stopped writers.
**Failure mode:** The process exits with an active write transaction; restart behavior, lock release, database integrity, WAL handling, and owned-file cleanup remain unproved.
**Recommendation:** Add an exact native crash coordinate after successful `BEGIN IMMEDIATE`, then prove from a fresh process that the writer is gone, recovery is safe, the database is internally consistent, and every exact owned file is durably removed without recursive or path-only deletion.

### P2 - Medium Risk

#### 1. Additional native prepare/finalize fault paths are not injected

**Evidence:** The gap is explicitly skipped at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/src/db/stage2/file-factory-proof.test.ts:1862`.
**Why it matters:** Actual AUTH, BUSY, and close-BUSY coverage does not cover every prepare/finalize failure boundary.
**Failure mode:** A future native lifecycle regression can pass the nominal suite while mishandling a different SQLite failure.
**Recommendation:** Add a closed fault-injection build/profile with exact counters and teardown receipts, or preserve the explicit false coverage flag and carry the gap without making broader claims.

#### 2. Hosted runner compatibility is not yet observed

**Evidence:** The workflow selects and attests `/Library/Developer/CommandLineTools` and the exact compiler string, but no run exists for the current unpushed bytes. GitHub's mutable image inventory publishes CLT 26.6 and Clang 21.0.0 but not the complete `clang-2100.1.1.101` suffix.
**Why it matters:** Static workflow review cannot prove the live runner's exact toolchain behavior or the full native job.
**Failure mode:** The job fails closed during compiler preflight, install, build, or proof execution.
**Recommendation:** Commit and push the bounded slice, require the hosted job, inspect the `Set up job` image identity and every preflight, and do not promote the evidence until the job passes.

#### 3. Compiler provenance is path/version based and has a local TOCTOU window

**Evidence:** The builder hashes the native source at `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/scripts/build-youtube-stage2-file-factory.mjs:387` and reads it later for compilation at line 439. Compiler identity is attested by exact path and version string rather than binary hash.
**Why it matters:** A same-user local mutation between attestation and compiler read is outside the current closure.
**Failure mode:** A hostile local process can race a source or toolchain input while retaining the expected pathname/version surface.
**Recommendation:** Treat this as nonproduction nominal evidence only. For a later release-grade artifact, bind open descriptors or immutable copied inputs, hash compiler binaries and transitive inputs where feasible, and compile from the attested snapshot.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The earlier work treated a successful local Darwin suite as sufficient to add the file-factory test to the default product test glob. That would fail the existing Ubuntu product CI before any release gate could run. It also used broad proof terminology despite three explicit missing failure-path cases. The current routing and nominal naming correct those overclaims, but they do not close the underlying P1 gaps.

## Missing Validation

- A successful hosted `macos-26` run on the exact pushed commit.
- Abrupt exit immediately after durable private-file creation.
- Abrupt exit while `BEGIN IMMEDIATE` is held.
- Fresh-process writer-lock release, recovery, integrity, and exact cleanup after both crashes.
- Additional synthetic prepare/finalize fault injection.
- Release-grade compiler and transitive toolchain provenance.
- A clean-checkout full `typecheck` and `lint` result. The current local root contains the unrelated nested `Phase4.1-AIModelConfig/` checkout, which root-wide tools scan; that unrelated checkout must remain untouched.

## Revised Recommendations

1. Commit only the honestly bounded nominal file-factory and CI-routing slice.
2. Push it to run the exact hosted macOS job; treat any non-success result as a hard gate.
3. Keep `readinessClaim`, `migration028Authority`, `productionAuthority`, `s28ReadinessProven`, and `implementationGoProven` false.
4. Implement the two P1 crash/restart scenarios before migration 028 or stopped-writer promotion.
5. Preserve the P2 fault gap explicitly unless a closed injection harness is implemented.
6. Re-run this adversarial gate after crash/restart coverage and after hosted CI evidence exist.

## Go / No-Go Recommendation

- **GO:** Commit/push the bounded nominal slice and execute hosted CI.
- **NO-GO:** Claiming hosted compatibility until the live macOS job passes.
- **NO-GO:** Advancing migration 028, stopped-writer readiness, lab authority, release authority, or production authority while either P1 remains open.

## Plan Revision Inputs

### Required Deletions

- Delete any language implying the current suite proves all failure paths, stopped-writer readiness, migration authority, or production readiness.

### Required Additions

- Add two exact crash coordinates and a fresh-process restart cleanup oracle.
- Add hosted `macos-26` evidence tied to the exact commit and runner image.
- Add the explicit nominal/failure-path distinction to implementation traceability and the risk register.

### Required Acceptance Criteria Changes

- Nominal success requires portable tests, both local native suites, exact content-free evidence, and hosted native success.
- Stopped-writer readiness additionally requires both crash/restart scenarios with durable, identity-safe cleanup.
- Migration 028 remains blocked until every P1 is resolved and independently re-reviewed.

### Required Validation Changes

- Run the native job on the hosted ARM runner after every relevant native, builder, worker, controller, test-router, package, or workflow change.
- Verify the actual runner image identity and exact compiler preflight from job logs.
- Prove no retained private root, database, WAL, SHM, journal, quarantine leaf, build directory, worker, or compiler process remains after every scenario.

### Required No-Go Gates

- Any hosted native job result other than `success`.
- Any non-empty retained root after successful proof execution.
- Any unresolved P1 crash/restart gap.
- Any attempt to turn nominal evidence into migration, lab, release, or production authority.
- Any production feature enablement of browser transcript capture or manual held-transcript enrichment.

## Residual Risks

Even after the current P0 fixes, `macos-26` is a mutable weekly image, compiler provenance is not binary-hash complete, and arbitrary pre-JavaScript Node diagnostics remain outside the content-free supported invocation contract. These risks are acceptable only for the current explicitly nonproduction nominal gate; they are not release provenance.
