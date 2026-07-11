# Recall manual sync PRD v1 - Adversarial Review

**Created:** 2026-07-11 14:35:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `docs/feature-council/recall-manual-sync/prd-v1.md`
**Report path:** `docs/feature-council/recall-manual-sync/prd-v1-adversarial-review.md`

## Executive Verdict

**Conditional no-go for implementation.** The product semantics are substantially correct, but v1 still contradicts the supplied API contract, does not separate PR-delivery gates from production-enablement proof, and contains retry/cooldown and automatic-overlap ambiguities that could produce misleading UI or an unverifiable definition of done.

## Evidence Inspected

- `prd-v1.md`, `decision-log.md`, `discovery-report.md`, `source-and-design-assessment.md`
- Supplied PRD requirements as summarized in the discovery/council artifacts
- `src/lib/recall/sync-runner.ts`, `src/db/recall-sync.ts`, `scripts/recall-scheduled-apply.sh`
- Existing service/timer and rendered design evidence

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 finding in the product intent itself.

### P1 - High Risk

#### 1. The PRD changes the supplied deduplication response contract without user value

**Evidence:** `prd-v1.md:121-128` and AC 9 at `prd-v1.md:193` choose `200` for an active dedupe, while the supplied PRD’s primary flow defines accepted new or existing requests as `202`.
**Why it matters:** Two success codes add client/test branches and create source-of-truth drift without changing user behavior.
**Failure mode:** A retry path treats `200` as ordinary status rather than accepted active work, or implementation/review disagrees over which contract is normative.
**Recommendation:** Use `202` for both new and deduplicated active requests and retain `deduplicated` in the body.

#### 2. Delivery acceptance and production-enablement proof are conflated

**Evidence:** Production is explicitly out of scope (`prd-v1.md:43-49`), but AC 23 requires credential-boundary verification (`prd-v1.md:207`) and AC 24 mixes local/host/manual gates (`prd-v1.md:208`).
**Why it matters:** The goal forbids production deployment but the PRD can be read to make host proof mandatory for a review-ready PR.
**Failure mode:** The branch is falsely declared incomplete despite complete review-ready implementation, or a reviewer weakens credential proof to close the goal.
**Recommendation:** Split acceptance into review-ready gates (code/unit/static/fixture proof) and a separately authorized production-enable gate (host identity/credential/unit proof). Feature flag and new units remain off until the latter.

#### 3. Cooldown contradicts immediate retry language

**Evidence:** A five-minute cooldown follows every terminal request (`prd-v1.md:124`), while failure journeys say deliberate retry is safe after cooldown/readiness (`prd-v1.md:98-104`) and several state labels imply **Try again**.
**Why it matters:** The product cannot simultaneously offer an enabled retry and reject it for five minutes.
**Failure mode:** Users click an apparently available retry and receive 429; screen-reader/action copy lies about availability.
**Recommendation:** Make failure/partial/blocked actions display the server countdown until cooldown expires; only then show enabled **Try again**. Consider exempting pre-start expired/blocked requests only if the supplied PRD permits it.

#### 4. Automatic/manual collision behavior is under-specified at the request boundary

**Evidence:** Automatic-running disables manual action (`prd-v1.md:90-93`), yet an already accepted manual request remains queued; background rules say manual waits (`prd-v1.md:130-136`).
**Why it matters:** GET/POST behavior when automatic work begins between dialog open and POST is not normative.
**Failure mode:** POST returns conflict, creates a queued request, or silently deduplicates depending on timing, causing inconsistent UI and tests.
**Recommendation:** State that POST may durably queue behind automatic work if confirmation raced with its start; GET disables new starts once automatic activity is known.

### P2 - Medium Risk

#### 1. “Start within seconds” has no measurable acceptance bound

**Evidence:** The supplied goal requires healthy starts within seconds, but v1 only specifies path activation and a 60-second fallback (`prd-v1.md:127`).
**Recommendation:** Add a healthy-path target such as worker claim within 10 seconds, with fallback recovery within 75 seconds and source-safe latency evidence.

#### 2. Never-synced wording conflicts across artifacts

**Evidence:** v1 selects **Not yet synced** (`prd-v1.md:72`), while the UX working notes and supplied designs also use “Never.”
**Recommendation:** Make **Not yet synced** normative everywhere and remove alternate public copy from v2 artifacts/prototype.

### P3 - Low Risk Or Polish

#### 1. Acceptance criteria are broad bundles

AC 18, 20, 21, and 24 combine many independently fail-able checks. Split them in QA traceability even if the PRD keeps grouped product criteria.

## What The Original Plan Or Work Gets Wrong

It treats a response-code change as a resolved decision despite no product benefit, and treats host-only security proof as both outside scope and required completion. It also assumes the cooldown/action matrix will reconcile itself in implementation.

## Missing Validation

- Race: automatic execution starts after dialog opens but before POST commits.
- Healthy path claim-latency target.
- Explicit review-ready versus enablement-gate traceability.
- Action/countdown behavior for every terminal state during cooldown.

## Revised Recommendations

Use one `202` accepted contract, split delivery and enablement gates, make cooldown actions truthful, define automatic-race queuing, and add measurable activation latency.

## Go / No-Go Recommendation

**No-go until PRD v2 addresses every P1.** Implementation may start after those revisions; production enablement remains a separate no-go until host credential/identity/unit proof passes.

## Plan Revision Inputs

### Required Deletions

- Delete `200` as the deduplicated-active POST success code.
- Delete any enabled **Try again** implication during cooldown.

### Required Additions

- Review-ready versus production-enable gate sections.
- Automatic-start/POST race behavior.
- Healthy and fallback claim-latency targets.

### Required Acceptance Criteria Changes

- AC 9: `202` for new and deduplicated active requests.
- AC 23: static/local proof for PR; host proof under separate enablement gate.
- Split state coverage, accessibility, and privacy bundles in QA traceability.

### Required Validation Changes

- Add automatic-race POST test and latency measurement.
- Add cooldown action/countdown tests for blocked/error/partial.

### Required No-Go Gates

- No implementation before normative API/cooldown/race contract.
- No enablement before host credential boundary and unit readiness proof.

## Residual Risks

Even after revision, service crash recovery and full-wrapper truth remain engineering risks governed by technical plan v2.
