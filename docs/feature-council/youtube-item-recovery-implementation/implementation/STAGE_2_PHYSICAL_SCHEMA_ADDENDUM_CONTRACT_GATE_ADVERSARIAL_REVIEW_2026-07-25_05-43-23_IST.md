# Stage 2 Physical Schema Addendum Contract Gate - Adversarial Review

**Created:** 2026-07-25 05:43:23 IST  
**Reviewer stance:** Brutally honest adversarial review  
**Reviewed target:** `STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md` at SHA-256 `a694195243ba89cb4452c4dfe30e028da04fa60facf166d2c10ea716694bf12d` and `fixtures/stage2-acceptance-registry-v2.json` at SHA-256 `58edde8799fe54f1571b830dbf888a03c4d32c12e018de228e49a3f9260c430d`  
**Report path:** `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/docs/feature-council/youtube-item-recovery-implementation/implementation/STAGE_2_PHYSICAL_SCHEMA_ADDENDUM_CONTRACT_GATE_ADVERSARIAL_REVIEW_2026-07-25_05-43-23_IST.md`

## Executive Verdict

**NO-GO.** The exact reviewed contract hash must not authorize migration 028
authoring or disposable implementation. One P1 leaves the external federation
launcher—the authority for cross-host admission, deadlines, gate exit, and
scratch destruction—outside the frozen trust graph and durable evidence
chain. A P2 also makes fixed evidence roots non-rerunnable without an undefined
cleanup operation.

This is a contract-gate verdict only. It does not authorize a live lab,
non-disposable database work, production browser capture, or held-transcript
processing.

## Evidence Inspected

- Frozen addendum and registry bytes and their recomputed SHA-256 values.
- Current `origin/main` and local `main`, both
  `6784e0e85c50fd86e3353b54a8b1964f045b65b1`, plus verified ancestry to
  branch head `ff3a425630791d10cd36c9c71db90141b0128743`.
- Current migration frontier
  `src/db/migrations/027_notebooklm_url_sources.sql`, whose SHA-256 equals the
  contract's `a488c7e15c54d232ad16708541bbc4a6fea6c2645fd79a999f7c416a8e2603b6`.
- Immutable S27 verifier execution: PASS with 29 migrations, 70 tables, 82
  indexes, 34 triggers, 43 verified inputs, 32 Git blobs, six runtime
  capabilities, and 14 critical relations.
- Registry structural checks: 17 unique cases, exact 16-Linux/1-Darwin
  partition, 30 evidence fields, 145 unique fixed failpoints, 24 scrub
  failpoints, and exact compact failpoint-object digest
  `6b3aa6da2dd37dae9e5435426b2ca6937ac83fc9dffb3f75a6b20d858df0b12b`.
- Markdown-fence parity, JSON parsing, trailing-LF, control-byte,
  placeholder, trailing-whitespace, stale-string, and suspicious-secret
  scans.
- Three independent formal passes covering platform federation,
  capsule/verifier trust, transaction/recovery exactness, failure modes,
  data safety, security/privacy, observability, acceptance criteria, scope,
  deployment, rollback, and misleading success states.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. External launcher authority is neither frozen nor durably authenticated

**Classification:** Confirmed.

**Evidence:** The canonical S, D, and A schemas bind coordinators, gates,
validators, runtimes, and capsules but omit a federation-launcher source,
runtime identity, receipt-verification policy, or trust root:
`STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md:5234`,
`STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md:5277`, and
`STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md:5307`. The unbound launcher nevertheless
validates the capsule/launch envelope, arms the post-phase deadline, admits
gate completion, supplies the Darwin hashes to Linux, and destroys aggregate
scratch: lines 5484, 5711, 5804, 5820, and 5957.

The expectation is published before gate exit and therefore cannot bind the
later gate exit, EOF, descendant, pipe, deadline, and lock observations
(lines 5774-5818). `Hg_p` is an unkeyed hash of public marker bytes. Linux
aggregation receives bare archive/expectation/marker hashes (lines
5820-5849). Scratch destruction is represented by an unsigned Boolean ACK
(lines 5957-5968), and the final package marker is emitted before aggregate
exit while no post-exit launcher receipt is persisted (lines 6582-6591).
Registry lines 74 and 79 repeat the same assertions without origin
authentication.

**Why it matters:** Hashes prove byte identity, not which trusted process
observed external completion. Linux intentionally cannot rerun Darwin-only
behavior, so authenticated Darwin launcher evidence is the only way to close
that trust boundary.

**Failure mode:** A miswired or untrusted handoff can supply a self-consistent
archive, expectation, and computed gate-marker hash without proving the bound
Darwin launcher observed exit zero, both EOFs, zero descendants/pipes, lock
absence, or deadlines. Equivalent self-declaration exists for scratch
destruction and final aggregate completion.

**Recommendation:** Freeze a launcher-trust manifest and exact launcher source
in S/A and both capsules. Use a run-bound signature-verification root. After
each gate fully exits, no-replace publish a signed platform admission receipt
binding S/A/D, challenge/run, launcher context, phase/ACK, archive,
expectation, marker, deadline, streams, exit/EOF, descendants/pipes, and lock
absence. Verify both receipts on Linux and bind them into aggregate context
and catalog. Make scratch destruction a signed durable receipt, and make a
signed post-aggregate-exit package admission receipt—not the pre-exit
marker—the sole final PASS authority.

### P2 - Medium Risk

#### 1. Fixed evidence roots make deterministic reruns operationally incomplete

**Classification:** Confirmed.

**Evidence:** A freezes non-run-scoped platform and aggregate roots at
`STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md:5325`. Successful output is retained
(line 6544), while preexisting finals refuse and are not removable by a new
run (line 6760). Crash residue blocks restart pending a separately reviewed
cleanup operation that this contract does not define (lines 6773 and 6797).

**Why it matters:** Required drift rechecks and failed-run retries need a
deterministic fresh evidence namespace.

**Failure mode:** One successful or interrupted package permanently blocks a
later package at the same fixed roots even when it uses a fresh run ID.

**Recommendation:** Make all platform, aggregate, manifest, blob, and evidence
roots derive from the never-reused `package_run_id`, or provision fresh
disposable mounts with a frozen whole-mount disposal/quarantine protocol.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It names the launcher as trusted without making it part of the pre-run
  trust graph.
- It treats public hashes and Boolean ACKs as proof of external observations.
- It treats a pre-exit process marker as final package authority even though
  the acceptance conditions include post-marker exit and EOF.
- It freezes reusable logical roots while requiring no-replace publication
  and refusing cleanup of prior runs.

## Missing Validation

- Wrong launcher source/runtime/key and direct gate/aggregate invocation.
- Unsigned, wrong-key, replayed, cross-run, cross-platform, stale-challenge,
  and signature-malleability receipt vectors.
- Gate marker without post-exit receipt; receipt before EOF/lock absence.
- Scratch ACK without durable signed destruction evidence.
- Aggregate marker without post-exit package receipt.
- A second fresh package after a successful run and after every crash-residue
  shape.

## Revised Recommendations

1. Preserve this report and exact rejected hash.
2. Add an acyclic signed launcher-receipt layer:
   launcher trust -> S -> D -> A -> platform output -> signed platform
   admissions -> aggregate validation -> signed scratch receipt -> aggregate
   catalog/marker -> signed post-exit package admission.
3. Bind launcher code/runtime/capsule and live parent identity into gate and
   aggregate contexts.
4. Make output paths run-scoped.
5. Expand AC01 and registry serialization rules for every receipt, signature,
   replay, FD, deadline, and rerun boundary.
6. Recompute registry and contract hashes and repeat all focused and formal
   reviews on the new exact bytes.

## Go / No-Go Recommendation

**NO-GO.** Contract GO requires zero unresolved P0/P1 findings. The P1 above
must be closed and independently re-reviewed. The P2 should be fixed in the
same revision because run scoping is a narrow, deterministic correction.

## Plan Revision Inputs

### Required Deletions

- Bare gate-marker hashes as cross-host completion authority.
- Unsigned launcher Boolean ACKs as durable proof.
- Pre-exit package marker as final external PASS authority.
- Fixed cross-run evidence roots.

### Required Additions

- Canonical launcher-trust manifest, exact launcher inventory, and signature
  algorithm/key binding.
- Signed platform, scratch-destruction, and post-package completion receipts.
- Aggregate admission FDs/hashes and catalog receipt fields.
- Run-scoped platform and aggregate roots.

### Required Acceptance Criteria Changes

- Only a valid signed platform admission may authorize imported platform
  evidence.
- Only a valid signed scratch receipt may unlock catalog finalization.
- Only a valid signed post-exit package admission may constitute package PASS.
- A fresh run must coexist with retained prior evidence and must not require
  ad-hoc cleanup.

### Required Validation Changes

- Add forgery, key substitution, replay, stale run/challenge, cross-platform,
  truncation, trailing-byte, wrong-order, wrong-path/hash, early-publication,
  and post-exit omission vectors.
- Add exact candidate/final crash boundaries for each signed receipt.
- Add fresh-run-after-success and fresh-run-after-crash tests.

### Required No-Go Gates

- Launcher source/runtime/trust manifest not frozen in S/A/capsules.
- Any unsigned or wrong-key external completion claim.
- Darwin input admitted without a valid signed Darwin platform receipt.
- Scratch or package completion accepted without its post-condition receipt.
- Output root not bound to the fresh package run.

## Residual Risks

Even after receipt closure, the implementation remains unproven until both
platform packages, signature/key handling, aggregate replay, disposable
scratch destruction, all 17 cases, and forward recovery pass on exact
implementation hashes. No live lab or production authority follows from a
future Contract GO.
