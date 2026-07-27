# Successor Completion Checklist

## Purpose

This is the operational checklist for the next AI agent. It is intentionally
stricter than a normal feature checklist because the worktree contains:

- accepted, immutable contract evidence;
- a clean pushed implementation frontier;
- partially integrated, uncommitted crash/recovery work;
- an unresolved SQLite source-provenance gate;
- an unrelated nested checkout that must be preserved;
- release boundaries that code completion cannot override.

A checked box must mean that the named evidence exists for the exact bytes under
review. Do not check a box because an earlier revision, a direct specialist run,
or a nearby component passed.

## First 30 minutes

### 0–5 minutes: establish identity and preservation boundaries

- [ ] Set `PROJECT="$(git rev-parse --show-toplevel)"`, confirm it is the
      intended AI Brain `Phase4` repository, and work only under `"$PROJECT"`.
- [ ] Confirm the current branch, HEAD, upstream, remote, and merge base.
- [ ] Confirm whether the snapshot still matches
      `feat/youtube-item-recovery-enrichment@4786b079e88cc01ec8e9c300faa93e3832ae2678`.
- [ ] Run `git status --short --branch` before editing.
- [ ] Inspect `git worktree list --porcelain`.
- [ ] Identify the unrelated nested checkout reported by the current state
      audit and confirm it remains separate, clean, and untouched; do not encode
      a machine-specific checkout name into a public handoff.
- [ ] Record any drift from the state in
      [04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md](04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md).
- [ ] Do not run `git add .`, `git add -A`, a recursive formatter, or a cleanup
      command.

### 5–15 minutes: restore the authority model

- [ ] Read [README.md](README.md).
- [ ] Read [01_GOAL_SCOPE_AND_AUTHORITY.md](01_GOAL_SCOPE_AND_AUTHORITY.md).
- [ ] Read
      [04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md](04_CURRENT_WORKTREE_AND_UNCOMMITTED_STATE.md).
- [ ] Read
      [05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md](05_STAGE2_CONTRACT_CRASH_RECOVERY_AND_WAL.md).
- [ ] Read [08_EXECUTION_PLAYBOOK.md](08_EXECUTION_PLAYBOOK.md).
- [ ] Read
      [09_DECISIONS_RISKS_BLOCKERS_AND_STOP_CONDITIONS.md](09_DECISIONS_RISKS_BLOCKERS_AND_STOP_CONDITIONS.md).
- [ ] Read
      [13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md](13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md).
- [ ] Read
      [GOVERNING_GOAL_PUBLIC_SNAPSHOT.md](GOVERNING_GOAL_PUBLIC_SNAPSHOT.md);
      use its recorded original-source hash for provenance without depending on
      a machine-local attachment.
- [ ] Reconcile current `origin/main`; current repository truth outranks a
      historical planning snapshot.
- [ ] Preserve the permanent current denials on production transcript capture
      and production manual processing.

### 15–30 minutes: audit the exact implementation frontier

- [ ] Re-hash every modified and untracked implementation file listed in
      [14_FILE_ARTIFACT_AND_COMMIT_MAP.md](14_FILE_ARTIFACT_AND_COMMIT_MAP.md).
- [ ] Confirm there are no staged files unless the user explicitly created that
      state after this handover.
- [ ] Record current explicit authority separately for each possible commit,
      push, PR mutation, Wiki write, merge, deployment, migration application,
      release, or enablement action; technical GO does not grant mutation
      authority.
- [ ] Confirm the two stopped-writer tests are still skipped, or record the exact
      replacement evidence.
- [ ] Confirm whether
      `src/db/stage2/file-factory-crash-recovery-proof.ts` still does not exist.
- [ ] Count tests selected by the crash/restart route; zero selected tests is a
      failing gate, not success.
- [ ] Compare the native receipt shapes with both nominal and recovery-worker
      exact validators.
- [ ] Read every implementation, worker, test, receipt, manifest, and evidence
      file used for a conclusion through EOF; record exact line or byte counts
      and recompute required hashes rather than relying on truncated previews.
- [ ] Verify the frozen Stage 2 contract hash before touching dependent code.
      Treat a local read-only/chmod mode as best-effort evidence only; the
      durable controls are the exact hash plus reviewed Git/registry/index/
      verifier anchors.
- [ ] Refresh draft PR #57 and exact-head CI state read-only before relying on
      hosted evidence.
- [ ] Write a dated restart note that distinguishes pushed evidence, current
      worktree evidence, and session-only observations.

## Workstream A: finish the stopped-writer prerequisite

### Reconcile current partial work

- [ ] Preserve the four native crash/recovery profiles:
      `crash-after-durable-create`,
      `recover-after-durable-create`,
      `crash-while-begin-immediate-held`, and
      `recover-after-begin-immediate-held`.
- [ ] Reconcile the current nominal trace with the exact validator, including
      `database.create.fsync` and `directory.create.fsync`.
- [ ] Independently regenerate the canonical worker operation trace and update
      the separate test-pinned digest only after the trace bytes stabilize;
      prove both consumers match rather than copying one stale constant into
      the other.
- [ ] Reconcile durable-recovery receipt keys, including
      `sidecarsAbsentBeforeCleanup` and `walRecoveryRequired`.
- [ ] Make the durable-create profile state explicitly that no SQLite recovery
      was required.
- [ ] Make the held-writer recovery profile open through SQLite, complete
      recovery, run integrity checks, close, and only then prove sidecar absence.
- [ ] Regenerate every affected source-manifest hash after any C++, builder, or
      worker change.

### Implement the missing trusted controller

- [ ] Add `src/db/stage2/file-factory-crash-recovery-proof.ts`.
- [ ] Use a newly created owner-only private root for every proof.
- [ ] Reject root replacement, symlinks, hard links, unexpected leaves, and
      unsafe ownership or modes.
- [ ] Spawn the exact worker with a bounded argument and environment contract.
- [ ] Enforce expected exit code or signal, timeout, zero stdout/stderr, and
      process-group/descendant termination.
- [ ] Ensure no database/root descriptor is inherited by the child.
- [ ] Bind the native module and source hashes into the aggregate evidence.
- [ ] Use a separate fresh recovery process after the stopped writer is gone.
- [ ] Validate the exact receipt schema, provenance, database identity, cleanup,
      and empty-root end state.
- [ ] Delete the proof root only after validation; fail closed if cleanup or
      isolation proof is incomplete.

### Replace the two skipped P1 tests

- [ ] Replace the abrupt-exit-after-file-creation skip with an executed test.
- [ ] Replace the abrupt-exit-during-`BEGIN IMMEDIATE` skip with an executed
      test.
- [ ] Give both tests names matched by the crash/restart selector.
- [ ] Add an executed-test-count assertion to the route.
- [ ] Fail the route if selection is zero or if any required test is skipped.

### Add hostile-boundary fixtures

- [ ] Wrong exit code.
- [ ] Unexpected signal or missing expected signal.
- [ ] Non-empty stdout or stderr.
- [ ] Malformed, extra-key, missing-key, or mismatched receipt.
- [ ] Timeout and hung child.
- [ ] Descendant or process-group retention.
- [ ] Retained provenance pipe or inherited descriptor.
- [ ] Root replacement.
- [ ] Unknown, quarantine, or build leaf.
- [ ] Symlink and hard-link residue.
- [ ] Retained-descriptor unlink behavior.
- [ ] Database identity or native/source-hash mismatch.
- [ ] Failed cleanup and non-empty private root.

### Obtain exact-byte evidence

- [ ] Run syntax, JSON, YAML, frozen-hash, and residue checks.
- [ ] Run the nominal native suite against current bytes.
- [ ] Run the crash/restart suite and record a non-zero selected count.
- [ ] Run the portable suite, clean-scope TypeScript check, and lint.
- [ ] Persist commands, toolchain, counts, hashes, and outputs.
- [ ] Obtain a zero-P0/P1 pre-push source/local-evidence adversarial review for
      the exact reviewed hash set.
- [ ] Resolve every P0/P1 or record a precise NO-GO.
- [ ] If authorized to push, verify hosted macOS evidence on the exact pushed
      SHA; local success does not substitute for it.
- [ ] After hosted jobs complete, obtain a distinct mandatory post-hosted
      exact-commit evidence review binding source hashes, run/job URLs,
      toolchain, complete logs, selected/pass/fail/skip counts, and both named
      required crash/restart cases. Do not call the pre-push review final.

## Workstream B: resolve D-021 before migration 028

### Freeze a corrected advisory decision

- [ ] Revise the D-021 addendum to close all four P1 findings in
      [13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md](13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md).
- [ ] Select one specific fixed SQLite source rather than a floating version
      range.
- [ ] Record version, `sqlite_source_id()`, source URL, retrieval date,
      immutable local evidence location, and SHA-256.
- [ ] Pin the final D-021 hash in an immutable external decision-seal manifest,
      the decision log, implementation tracker, traceability matrix, and
      accepted review artifact. Do not require the raw file to contain its own
      raw-file hash.
- [ ] Add a negative verifier that rejects any hash drift.
- [ ] Run a fixed-source semantic compatibility matrix against every normative
      SQLite assumption in the frozen Stage 2 contract. If any behavior differs,
      stop and create a versioned addendum plus new registry, index, verifier,
      and Contract GO; never silently reinterpret the frozen contract.

### Prove actor and checkpoint closure

- [ ] Generate a machine-checkable inventory of every database-opening actor,
      executable, worker, child process, timer, and checkpoint caller.
- [ ] Include the application connection and NotebookLM retention executable.
- [ ] Test relevant actor pairs, startup order, shutdown order, and retained WAL
      state.
- [ ] Prove the sequential proof exception uses a private owner-only root.
- [ ] Prove no child inherits a database/root descriptor.
- [ ] Prove no worker or forked database actor overlaps the proof.
- [ ] Bind actor inventory and package contents to exact hashes.

### Wire executable refusal

- [ ] Refuse an affected, unknown, or mismatched SQLite source before any Stage
      28 database handle or migration.
- [ ] Verify source provenance at activation, startup, and rollback.
- [ ] Prove mismatch and tamper paths fail closed.
- [ ] Establish the separate operational owner and decision for the current
      Stage 27 database posture.
- [ ] Obtain a new independent adversarial review.
- [ ] Do not create or run migration 028 until this gate is accepted.

## Workstream C: complete Stage 2

- [ ] Confirm D-021 is accepted and the stopped-writer prerequisite has current
      exact-byte evidence.
- [ ] Reconcile the full Stage 2 implementation with the frozen contract.
- [ ] Create and validate migration 028 only after its prerequisites pass.
- [ ] Keep migrations 029 and 030 as later held-manual-enrichment evolutions;
      do not fold them into Stage 2 completion.
- [ ] Run migration upgrade, rollback, crash/restart, partial-state,
      compatibility, and provenance tests.
- [ ] Preserve Stage 1 containment and rollback compatibility.
- [ ] Prove startup refusal for contract, source, fingerprint, and ownership
      mismatch.
- [ ] Update AC01–AC17 with direct evidence.
- [ ] Obtain formal adversarial Implementation GO for the exact Stage 2 bytes.

## Workstream D: implement Stages 3–7 in order

### Stage 3: extension foundations

- [ ] Extend the existing Manifest V3 companion; do not create a second
      extension.
- [ ] Keep only reviewed tab-scoped `sidePanel`, `activeTab`, and `scripting`
      authority.
- [ ] Add no persistent YouTube host permission and no static YouTube content
      script.
- [ ] Implement explicit lifecycle invalidation without relying on
      `sidePanel.onClosed`.
- [ ] Validate local fixture behavior with zero network access.

### Stage 4: exact-item recovery and link-only

- [ ] Bind recovery intent to one exact item instance.
- [ ] Require separate `Inspect` and `Add` actions.
- [ ] Before any transcript DOM read, obtain the D-008 content-free server-side
      `authorize-inspect` decision bound to the exact intent/item; prove every
      denial, expiry, mismatch, and drift case results in zero DOM reads.
- [ ] Extract only user-visible transcript DOM after explicit disclosure and a
      successful `authorize-inspect` decision.
- [ ] Use the accepted two-channel authorization/upload contract.
- [ ] Enforce digest, one-time grant, expiry, replay, stale-intent, and target
      checks.
- [ ] Fail closed; never fall back to another item, another URL, Markdown, or
      clipboard transfer.
- [ ] Keep link-only save metadata-only and independently consented.
- [ ] Prove the production extension/server/worker bundles, module graph,
      dynamic chunks, and source maps contain no transcript-DOM-read, capture,
      upload, held-processing, or provider-dispatch capability while the
      production denial remains binding.

### Stage 5: held manual enrichment

- [ ] Freeze, apply, verify, and accept migration 029 before any held-manual
      behavior is implemented or exercised.
- [ ] Project browser transcript items into the held state without automatic
      embedding, chunking, indexing, summarization, or provider calls.
- [ ] Require explicit `Review & Process` and exact plan authorization.
- [ ] Bind plan fingerprint, content digest, item identity, provider/model,
      prompt, expiry, and one-time use.
- [ ] Implement reserve/process/apply as separate bounded transitions.
- [ ] Model retryable, terminal, and outcome-unknown states separately; use
      distinct attempt and generation identities, reconcile uncertain dispatch
      before retry, and never blindly redispatch or apply a stale generation.
- [ ] Ensure stale, failed, deleted, or expired work cannot apply.
- [ ] Preserve deletion and retention semantics.

### Stage 6: UX and accessibility

- [ ] Implement all states from the final V2 UX packages.
- [ ] Test keyboard operation, focus order, focus restoration, live regions,
      reduced motion, contrast, truncation, error recovery, and narrow layouts.
- [ ] Use local reviewed assets only.

### Stage 7: full QA and documentation

- [ ] After transition parity, drain, rollback blocking, and compatibility
      evidence pass, freeze/apply/verify/accept migration 030 contract/cutover;
      Stage 7 cannot complete before this gate.
- [ ] Complete every repository, migration, browser, backend, processing,
      accessibility, security, privacy, and negative-release gate in
      [07_REQUIREMENTS_AND_VERIFICATION_STATUS.md](07_REQUIREMENTS_AND_VERIFICATION_STATUS.md).
- [ ] Produce the required documents listed in
      [11_DOCUMENTATION_WIKI_LAB_AND_RELEASE.md](11_DOCUMENTATION_WIKI_LAB_AND_RELEASE.md).
- [ ] Append the running log only after reading its latest entry.
- [ ] In the final append-only entry, link the stable
      [handover index](../INDEX.md), exact
      [handover manifest](HANDOVER_MANIFEST.md) hash, final review artifact and
      [finding disposition](ADVERSARIAL_REVIEW_DISPOSITION.md), plus the exact
      reviewed commit or local hash set. Label prior tracker/log evidence
      `last-covered` when dirty post-HEAD bytes remain.
- [ ] Refresh PR text so it describes the exact pushed SHA and actual evidence.

## External live-lab gate

Do not interpret implementation completion as live-lab authority.

- [ ] Receive explicit external authorization.
- [ ] Receive the lab origin and identity.
- [ ] Receive lab-only credentials through an approved secret path.
- [ ] Receive a lab database/data root with no production fallback.
- [ ] Receive owned or consented media and approved fixtures.
- [ ] Verify feature and network allowlists fail closed.
- [ ] Verify production origin, credentials, database, and data root are denied.
- [ ] Run only the approved bounded canary.
- [ ] Record the exact build, configuration hashes, actions, expected/actual
      results, cleanup, and negative-production evidence.
- [ ] Stop immediately on identity, origin, target, data-root, permission,
      extraction, or cleanup mismatch.

If authorization or any required input is absent, write a blocked/no-run report.
Do not fabricate `LAB_CANARY_REPORT.md`.

## Production release gate

The current governing decision is production NO-GO for transcript capture and
manual processing.

- [ ] A new explicit authority decision supersedes the current production
      denial.
- [ ] Release and rollback plans are approved.
- [ ] Production-negative verification is still valid until the new decision is
      effective.
- [ ] No migration, flag, route, permission, background actor, or extension
      package silently enables the denied features.
- [ ] Production package, source, module, dynamic-chunk, and source-map
      inventories prove the denied capture and held-processing capabilities are
      absent, not merely disabled.
- [ ] Deployment, release, feature enablement, extension publication, Wiki
      publication, and merge are each separately authorized and evidenced.

Without every applicable item, the correct status remains: production feature
enablement denied.

## Final definition of done

The successor may call the implementation objective complete only when:

- [ ] Every acceptance criterion has exact implementation and test evidence.
- [ ] Every applicable P0/P1 review finding is closed. If a finding remains
      preserved as NO-GO, the implementation objective remains incomplete even
      though the handoff may be truthful and complete.
- [ ] Current source/configuration evidence matches all status claims.
- [ ] Tracker and prior running-log claims are labeled `last-covered` or stale
      whenever they do not include dirty post-HEAD bytes.
- [ ] Stage order and dependency gates were respected.
- [ ] No current evidence is attributed to earlier or different bytes.
- [ ] Local fixtures, hosted CI, lab evidence, and production evidence are
      described as distinct evidence classes.
- [ ] All required Markdown artifacts exist, are internally linked, and contain
      no secrets or private transcript content.
- [ ] The running log, trackers, traceability matrix, decision log, risk
      register, PR description, and Wiki summary agree.
- [ ] The unrelated nested checkout and unrelated user changes remain untouched.
- [ ] The stable handover index resolves to the exact manifest and final review
      evidence.
- [ ] Technical GO and current explicit mutation authority are recorded as
      separate facts.
- [ ] Any commit, push, PR mutation, merge, deployment, release, publication,
      live access, or production write has explicit authority and direct
      evidence.
- [ ] A final read-only state audit finds no unsupported claim.

If any checkbox cannot be proved, leave it unchecked and state the blocker.
