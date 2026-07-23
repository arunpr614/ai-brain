# YouTube Item Recovery Stage 1 Final Gate - Adversarial Review

**Created:** 2026-07-23 11:26:51 IST  
**Reviewer stance:** Brutally honest adversarial review  
**Reviewed target:** Frozen base `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8` through the current Stage 1 worktree  
**Report path:** `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/docs/feature-council/youtube-item-recovery-implementation/YOUTUBE_ITEM_RECOVERY_STAGE_1_FINAL_GATE_ADVERSARIAL_REVIEW_2026-07-23_11-26-51_IST.md`

## Executive Verdict

**NO-GO.** No P0 finding was found, but one P1 rollback-safety defect blocks Stage 1 release and merge promotion. Current-binary containment is strong; the supported rollback path can erase the new unresolved batch reservation and permit the same private body to be submitted again.

## Evidence Inspected

- Full changed-file scope from frozen base `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8` through the 118-path worktree.
- D-014 through D-018, release authority, caller inventory, risk register, and Stage 1 scope enforcement.
- Enrichment batch submission/polling, manual enrichment route, scheduled enrichment worker, item upgrades, transcript worker/job repository, capture artifacts, release tooling, status/UI redaction, and their tests.
- Stage 1 scope check, 36-case scope suite, 178 focused containment/recovery tests, and `git diff --check`.
- Frozen-base versions of the manual `/enrich` and item-upgrade paths used by an operational rollback.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Rollback can erase an unresolved batch reservation and resend private content

**Evidence:** The new binary persists `opaque-reservation-v1:*` before provider contact in `src/lib/queue/enrichment-batch.ts`, then deliberately retains it when provider acceptance is ambiguous. The frozen rollback binary does not recognize that marker: its realtime and queued `/enrich` paths and `src/db/item-upgrades.ts` clear `batch_id`. No release preflight currently blocks an older runtime while such a marker exists.  
**Why it matters:** This is the exact accepted-but-lost-response case D-018 and R-031 were introduced to contain.  
**Failure mode:** New binary reserves and dispatches; provider accepts but the response is lost; incident response rolls back to `f905f6a...`; an old route or upgrade clears the marker; the body becomes eligible for a second submission. No database corruption is required.  
**Recommendation:** Block every reservation-unaware target artifact whenever the live database contains an unresolved marker, or provide a reservation-aware rollback artifact. Add a mixed-binary release-tooling test proving the supported rollback cannot clear or resend the body.

### P2 - Medium Risk

#### 1. Current-binary quarantine depends on item/job state coherence

**Evidence:** The marker is documented as authoritative, but `/enrich` checks it only for `enrichment_state='batched'`; scheduled enrichment ignores `items.batch_id`; batch submit selects and overwrites pending rows without requiring `batch_id IS NULL`.  
**Why it matters:** A drifted or manually repaired state can defeat the marker even under the current binary.  
**Failure mode:** A row with an unresolved marker and `pending`, `running`, `done`, or `error` state is cleared or submitted by another claimant. Normal reservation creation is atomic, so this requires state drift or corruption.  
**Recommendation:** Treat the marker as authoritative independent of state, exclude it at every enrichment selection/claim/dispatch boundary, and add drift-state tests.

#### 2. Transcript success apply and job finalization have a crash window

**Evidence:** The transcript worker fetches the source, commits the item upgrade, and only then finalizes the job in a separate transaction. Stale-claim recovery can requeue a process that crashes between those commits; artifacts use fresh IDs.  
**Why it matters:** A normal process crash can repeat a YouTube request, body reset, and artifact write.  
**Failure mode:** Upgrade commits; process exits before finalization; stale sweep requeues; the next attempt repeats source work and writes another upgrade/artifact.  
**Recommendation:** In the Stage 2 data foundation, atomically bind successful apply, immutable recovery receipt, and job finalization, or make retry reconcile the durable apply before any new source request.

### P3 - Low Risk Or Polish

#### 1. Item-page formatting churn obscures the narrow D-017 review

**Evidence:** The raw page diff is 298 additions and 174 deletions. Normalizing both sides reduces the semantic change to provider-label allowlisting, removal of attempt error rendering, fixed terminal copy, and a test-only component seam. The complete current file is hash-pinned.  
**Why it matters:** Large formatting-only churn makes a narrow privacy exception harder to audit.  
**Failure mode:** A reviewer misses an unrelated semantic edit inside mechanical reformatting. No hidden expansion was found in this review.  
**Recommendation:** Minimize/split the formatting change or retain normalized-diff evidence. Update D-017 to name provider-label normalization and attempt error-code removal explicitly.

## What The Original Plan Or Work Gets Wrong

- D-018 considered current-binary claim, poll, reset, and ambiguous-response behavior but omitted the supported older-binary rollback path.
- R-031's “Stage 1 remediated” status is premature until rollback refusal is proven.
- Stage 1 documentation understates the existing transcript apply/finalize crash window.

## Missing Validation

- Mixed-binary rollback with an unresolved reservation created by the new binary.
- Reservation marker combined with drifted `pending`, `running`, `done`, and `error` states across manual, scheduled, and batch claimants.
- Deterministic crash immediately after transcript body apply and before job finalization.
- Retained normalized-diff evidence for the D-017 page change.

## Revised Recommendations

1. Add an artifact-declared reservation-awareness capability and make the immutable compatibility checker inspect the live database before switching to an unaware target.
2. Recheck compatibility with writers stopped immediately before every symlink switch and automatic restoration.
3. Make marker presence authoritative across the current manual, scheduled, and batch paths.
4. Carry transcript apply/finalize atomicity into the Stage 2 receipt/revision foundation and block Stage 2 completion until its crash barrier passes.
5. Re-run the focused suites, full suite, release-artifact smoke, and an independent focused recheck.

## Go / No-Go Recommendation

**NO-GO for production release or merge promotion.** Current-binary development and CI may continue only to remediate the P1. Browser capture, migration 027, Chrome implementation, held manual enrichment, live lab work, and production enablement remain separately blocked.

## Plan Revision Inputs

### Required Deletions

- Remove the claim that R-031 is fully remediated before rollback compatibility is proven.

### Required Additions

- Add target-artifact reservation-awareness metadata and live unresolved-marker rollback inspection.
- Add a Stage 2 atomic transcript recovery apply/finalize receipt requirement.

### Required Acceptance Criteria Changes

- Stage 1 passes only when the supported release tool refuses a reservation-unaware target while any unresolved marker exists.
- Marker protection must be independent of the current enrichment state.

### Required Validation Changes

- Add mixed-binary, state-drift, and transcript crash-barrier cases.

### Required No-Go Gates

- Any unresolved reservation plus a reservation-unaware target artifact blocks activation and automatic rollback.
- Any P0/P1 recheck finding blocks Stage 1 closure.

## Residual Risks

- Transcript success apply/finalization remains non-atomic until Stage 2 implements and tests its durable receipt/reconciliation boundary.
- Operational safety still assumes releases are switched through the attested immutable toolset; bypassing it is unsupported and must remain documented as an operator no-go.
- Browser capture and manual processing remain unauthorized in production regardless of Stage 1 remediation.
