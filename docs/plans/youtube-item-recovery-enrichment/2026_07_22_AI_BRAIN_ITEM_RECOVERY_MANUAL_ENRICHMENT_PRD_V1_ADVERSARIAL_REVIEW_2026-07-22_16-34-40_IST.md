# PRD V1 - Adversarial Review

**Created:** 2026-07-22 16:34:40 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v1.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-worktrees/youtube-item-recovery-enrichment-plan/docs/plans/youtube-item-recovery-enrichment/2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_PRD_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md`

## Executive Verdict

**No-go for implementation.** The PRD makes exact-scope authorization a P0 requirement but defines a POST that cannot carry or verify that scope. It also uses unsafe “nothing was sent” copy for a network-ambiguous queue request.

## Evidence Inspected

- PRD principles and requirements, especially lines 90-99 and ME-F04 through ME-F25.
- PRD API contract at lines 447-480.
- UX durable-state copy and implementation authorization algorithm.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. ME-F07 cannot be satisfied by the specified POST

**Evidence:** ME-F07 requires binding provider plan, purposes, limits, manifest, retention terms, and copy version. The POST at lines 465-475 contains only mutation ID, operation, content revision, source ID, provider-plan version, and two provider fingerprints.
**Why it matters:** The acceptance criterion claims a guarantee the product contract cannot produce.
**Failure mode:** Material policy or disclosure drift is accepted under the same provider identity.
**Recommendation:** Add a server-generated, expiring `authorizationScopeFingerprint` to status and POST, define its canonical fields in the PRD, persist it, and make absence/mismatch a typed `409 authorization_scope_changed` with zero work.

### P1 - High Risk

#### 1. Network failure copy makes an unprovable privacy claim

**Evidence:** The product state model includes queue request failure and the UX copy says “Nothing was sent.” The POST commits before returning `202`, and an interactive worker may claim immediately.
**Why it matters:** A dropped response does not prove that the transaction failed or that a provider was not called.
**Failure mode:** The user sees “nothing was sent” while enrichment is queued or already running.
**Recommendation:** Introduce `queue_receipt_unknown`/`reconciling` behavior. Reuse the mutation ID and query mutation/status truth before showing failure or enabling another action. Copy must say Brain is checking, not that no transfer occurred.

#### 2. Retry authorization expiry is not a complete product rule

**Evidence:** Lines 477-480 allow retry when material bindings are identical, but do not state whether an expired manifest, delete-by window, authorization scope, or copy version is reusable.
**Why it matters:** Equality to an old scope is not the same as current eligibility.
**Failure mode:** An index retry executes after the approved lab window or retention terms expire.
**Recommendation:** Require current policy eligibility plus an unexpired scope at every retry; otherwise return to review or remain blocked.

### P2 - Medium Risk

#### 1. The status response does not explicitly expose the command binding

**Evidence:** The status list mentions display metadata and provider fingerprints but the POST needs a source ID, expected revision, provider plan version, and new authorization-scope identity.
**Why it matters:** Ambiguous response shape encourages the client to reconstruct authority from page data.
**Failure mode:** The UI submits stale or mismatched values from separate fetches.
**Recommendation:** Define one command-ready `authorizationContext` object returned atomically by status, with display and opaque binding fields from the same snapshot.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The PRD's exact-consent promise is stronger than its API contract, and its error copy assumes transport failure equals server failure.

## Missing Validation

- Response-loss-after-commit test with an immediately claiming worker.
- Independent drift tests for manifest, expiry, retention, purpose, coverage, and copy version.
- Retry-after-policy-expiry test.

## Revised Recommendations

Make authorization context an atomic server snapshot, add scope identity/expiry, and replace false failed-start copy with reconciliation.

## Go / No-Go Recommendation

**No-go** until the API can satisfy ME-F07 and network ambiguity cannot produce a false privacy state.

## Plan Revision Inputs

### Required Deletions

- Delete unconditional “Nothing was sent” copy for an unknown POST outcome.

### Required Additions

- Atomic `authorizationContext` status object.
- Expiring authorization-scope fingerprint.
- Queue receipt reconciliation state and copy.
- Current-policy check for every retry.

### Required Acceptance Criteria Changes

- ME-F07 must enumerate and test every canonical scope field.
- Add a response-loss criterion proving one job and truthful UI.

### Required Validation Changes

- Inject transport loss after commit and before response delivery.

### Required No-Go Gates

- Block queueing when scope is absent, changed, or expired.
- Block “not sent” copy unless the server proves no effective receipt and no attempt.

## Residual Risks

The worker can advance quickly after a committed receipt; status polling and copy must remain truthful under that race.
