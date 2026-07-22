# Implementation Plan V1 - Adversarial Review

**Created:** 2026-07-22 16:34:40 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v1.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-worktrees/youtube-item-recovery-enrichment-plan/docs/plans/youtube-item-recovery-enrichment/2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md`

## Executive Verdict

**No-go for implementation.** The concurrency fencing is materially stronger than the current system, but the plan persists and verifies provider fingerprints rather than the full accepted disclosure. It also leaves a migration architecture choice unresolved and weakens audit lineage on attempts.

## Evidence Inspected

- Migration 027 sections 6.4-6.10.
- Provider plan and HTTP contracts in sections 7-9.
- Claim/apply, embedding, deletion, test, rollout, and rollback sections.
- PRD ME-F07 and Council D3 authorization terms.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The persisted authorization identity excludes material consent terms

**Evidence:** Receipt columns at lines 158-179 include provider plan version and provider fingerprints but no manifest/copy/retention/coverage/purpose scope identity or expiry. The request fingerprint at lines 433-435 excludes those fields. Provider fingerprint tuples at lines 294-330 identify routing and model contracts, not the complete disclosure.
**Why it matters:** Authorization, claim, and apply can all agree on providers while executing under terms the user did not see.
**Failure mode:** Manifest or retention copy changes without changing provider/model; the old action still queues and attempts cannot prove the accepted terms.
**Recommendation:** Add `authorization_scope_fingerprint`, `authorization_scope_version`, and `authorization_expires_at` to receipt, enrichment job, embedding job, and both attempt tables. Define one canonical server-side scope containing source/revision/input, both provider fingerprints, purposes, digest/index contracts and coverage, retention/delete-by terms, manifest identity/expiry, environment policy, and consent-copy version. Recompute at POST, claim, retry, and apply.

### P1 - High Risk

#### 1. Migration 027 still contains an architecture fork

**Evidence:** Section 6.9 says migration 027 must either create `provider_usage` or expand `llm_usage`, then merely marks one “Preferred.”
**Why it matters:** A final implementation plan cannot estimate, test, roll back, or sequence a schema it has not selected.
**Failure mode:** Different PRs implement incompatible usage models or omit embedding/OpenRouter/Gemini accounting.
**Recommendation:** Lock V2 to a generalized `provider_usage` table and specify compatibility view, data copy verification, constraints, ownership, and rollback.

#### 2. Attempt rows do not explicitly preserve complete authorization lineage

**Evidence:** Section 6.6 enumerates job/generation/revision/source/provider/input fields but not `authorization_mutation_id` or full scope fingerprint. “Sibling” embedding attempts are not concretely specified.
**Why it matters:** Current job rows are reused across generations; attempts are the durable historical evidence.
**Failure mode:** A stale or retried provider call cannot be tied unambiguously to the exact accepted receipt and disclosure.
**Recommendation:** Specify both attempt schemas in full and require immutable receipt ID, scope fingerprint, provider fingerprint, generation, claim token hash, and outcome.

#### 3. Response-loss reconciliation is absent from the worker/API race plan

**Evidence:** POST commits then returns `202`; interactive claims are enabled separately, but the plan does not define mutation-status reconciliation when the response is lost.
**Why it matters:** The UI cannot safely infer whether work started.
**Failure mode:** A retry UI or “nothing sent” message appears while the original job runs.
**Recommendation:** Add mutation receipt lookup to status, require same-mutation replay/reconciliation, and test response loss while claim starts immediately.

### P2 - Medium Risk

#### 1. Upstream migration 026 is described but not pinned to an implementable contract

**Evidence:** Section 4 lists required capabilities and a future hash check but does not identify a final migration filename/hash, source commit, or compatibility fixture because the dependency is not yet implemented.
**Why it matters:** 027 cannot be authored reliably against a moving schema.
**Failure mode:** The preflight rejects the real 026 or, worse, accepts a partial lookalike.
**Recommendation:** Keep PR-0 as a hard stop and require a recorded 026 commit, migration hash, schema snapshot, and passing upstream gate report before PR-1 begins.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It equates a provider routing fingerprint with a complete authorization scope, leaves provider usage undecided, and assumes request idempotency alone resolves transport ambiguity.

## Missing Validation

- Field-by-field authorization-scope drift at POST, claim, retry, and apply.
- Response loss after commit with concurrent worker claim.
- Full attempt-lineage integrity checks.
- Locked provider-usage migration rehearsal.

## Revised Recommendations

Make authorization scope a persisted, expiring domain identity; fully specify attempt schemas; lock `provider_usage`; and make upstream 026 a pinned artifact gate.

## Go / No-Go Recommendation

**No-go** for PR-1 or later until P0 scope binding is specified and PR-0 pins the upstream foundation.

## Plan Revision Inputs

### Required Deletions

- Delete the two-option provider usage migration.
- Delete any implication that provider fingerprints alone authorize processing.

### Required Additions

- Scope fingerprint/version/expiry columns and canonicalization.
- Complete enrichment and embedding attempt schemas.
- Mutation receipt reconciliation contract.
- Pinned migration 026 dependency evidence.

### Required Acceptance Criteria Changes

- Every attempt must join to one accepted unexpired authorization scope.
- Response loss must produce one job and a reconciled UI.

### Required Validation Changes

- Add drift, transport-loss, lineage, and fixed-schema migration tests.

### Required No-Go Gates

- PR-1 blocked until 026 SHA/hash/schema are final.
- Claims blocked when authorization scope is absent, changed, or expired.

## Residual Risks

SQLite migration and queue-state complexity remain high; staged rollout and forward-only rollback are still required after these fixes.
