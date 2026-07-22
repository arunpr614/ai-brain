# Product Council V1 - Adversarial Review

**Created:** 2026-07-22 16:34:40 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `2026-07-22_ai_brain_item_recovery_manual_enrichment_product_council_v1.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-worktrees/youtube-item-recovery-enrichment-plan/docs/plans/youtube-item-recovery-enrichment/2026_07_22_AI_BRAIN_ITEM_RECOVERY_MANUAL_ENRICHMENT_PRODUCT_COUNCIL_V1_ADVERSARIAL_REVIEW_2026-07-22_16-34-40_IST.md`

## Executive Verdict

**No-go for implementation from V1.** The Council promises exact consent binding for retention, manifest, coverage, and copy version, but its command contract and receipt decision bind only source/revision and provider fingerprints. The missing authorization-scope identity is a trust blocker.

## Evidence Inspected

- V1 Council lines 79-114, 118-142, 182-239, and 241-273.
- V1 PRD API contract and V1 implementation request/receipt schemas.
- V1 desktop and mobile prototype screenshots.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The final click is not bound to the full disclosure it supposedly authorizes

**Evidence:** D3 at lines 81-88 says transcript, provider, model, destination, purpose, coverage, retention, manifest, and copy version invalidate readiness. D5 at lines 105-114 says the POST accepts only expected revision, source ID, provider-plan fingerprints, and mutation ID. D6 does not persist a composite disclosure identity.
**Why it matters:** The server can prove which providers were accepted, but not which limits, retention terms, manifest, exclusions, or consent copy the user saw.
**Failure mode:** Those terms change between status render and POST while the provider fingerprints remain stable; the server queues work under materially different terms.
**Recommendation:** Define a server-generated `authorizationScopeFingerprint` over every material disclosure field, policy/manifest identity and expiry, contract/copy versions, both provider fingerprints, source/revision/input identity, and purpose set. Return it from status, submit it on POST, persist it in receipts/jobs/attempts, and recheck it at authorization, claim, and apply.

### P1 - High Risk

#### 1. Route compatibility confidence is too narrow

**Evidence:** D5 states that no current source caller uses the route and therefore removes bodyless and `force=realtime` behavior.
**Why it matters:** A source-code search does not prove that external scripts, bookmarks, old deployed clients, or operator runbooks do not call it.
**Failure mode:** A legitimate old client receives a contract removal during rollout, or an unobserved bypass persists elsewhere.
**Recommendation:** Require repository, documentation, access-log, and deployed-client inventory; add a typed, observable fail-closed deprecation window without executing legacy work.

#### 2. Attempt-level authorization lineage is implicit

**Evidence:** D6 creates a receipt and D7 fences generations, but the Council does not explicitly require every enrichment and embedding attempt to carry the accepted authorization receipt and full authorization-scope fingerprint.
**Why it matters:** Job rows can be advanced or reused while historical attempts become hard to prove.
**Failure mode:** Operators cannot determine which exact consent terms governed a stale, retried, or partially successful provider call.
**Recommendation:** Make authorization lineage a first-class invariant for each attempt, including index-only retries.

### P2 - Medium Risk

#### 1. User-visible blocked states are under-specified in the Council state table

**Evidence:** The state sequence collapses provider missing, session expiry, policy expiry, manifest expiry, and feature denial into `blocked`, while the UX spec gives these different recovery actions.
**Why it matters:** Product semantics drive API status codes and support diagnosis.
**Failure mode:** The UI offers the wrong recovery action or generic copy for a recoverable session/provider problem.
**Recommendation:** Define typed blocked reasons and their allowed actions in the final Council artifact.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It treats provider-plan fingerprints as if they represent the complete informed-authorization context. They do not include retention, manifest, copy, coverage, or expiry terms.

## Missing Validation

- Mutation test changing each disclosure field independently while providers stay constant.
- Attempt-lineage audit for digest, embedding, retry, stale, and partial-success paths.
- Deployed legacy caller and access-log inventory.

## Revised Recommendations

Add an immutable authorization-scope identity, carry it through the full lifecycle, type blocked reasons, and make endpoint retirement evidence-based.

## Go / No-Go Recommendation

**No-go** until exact authorization scope and attempt lineage are explicit. Production remains separately no-go after these fixes.

## Plan Revision Inputs

### Required Deletions

- Remove language implying provider fingerprints alone bind every consent term.

### Required Additions

- Composite authorization-scope fingerprint and expiry.
- Receipt/job/attempt lineage requirements.
- Typed blocked-reason matrix.
- Full legacy caller evidence requirement.

### Required Acceptance Criteria Changes

- Prove that changing any material disclosure field invalidates the action and sends nothing.
- Prove every provider attempt maps to one accepted authorization scope.

### Required Validation Changes

- Add field-by-field scope drift tests at render, POST, claim, and apply.

### Required No-Go Gates

- No work may queue if the complete scope fingerprint is absent, expired, or changed.

## Residual Risks

A fingerprint proves equality, not comprehension. Copy still requires legal/privacy review and usability testing.
