# Recall First Apply Readiness Freshness Countdown Execution Report

Created: 2026-06-24 20:34 IST
Owner: Codex
Status: Done for offline scope; no live apply was run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Make the first capped apply readiness gate show how much of the proof freshness window remains before a write approval can safely use the current private dry-run and backup proof, and fail closed when proof is too close to expiry.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Change Summary

- Updated `scripts/check-recall-first-apply-readiness.mjs` to report no-secret proof freshness metadata.
- Added a default 5-minute minimum freshness floor before first capped apply readiness can pass.
- Updated `scripts/smoke-recall-first-apply-readiness.mjs` to require the freshness countdown fields and prove near-expiry proof fails.
- Updated `scripts/recall-first-capped-apply.sh` to pass the minimum freshness floor into the readiness gate; operators can override it with `BRAIN_RECALL_FIRST_APPLY_MIN_FRESHNESS_REMAINING_MINUTES`.

## Output Contract

The readiness gate now includes these fields:

- dry-run report proof:
  - `details.proofFreshness.mtimeIso`
  - `details.proofFreshness.ageMinutes`
  - `details.proofFreshness.maxAgeMinutes`
  - `details.proofFreshness.freshnessRemainingMinutes`
  - `details.proofFreshness.futureSkewMinutes`
- backup proof:
  - `ageMinutes`
  - `maxAgeMinutes`
  - `freshnessRemainingMinutes`
  - `futureSkewMinutes`
- readiness limits:
  - `minFreshnessRemainingMinutes`

The fields report only file timing and policy windows. They do not print Recall content or private sample values.

The gate returns `DO_NOT_APPLY` with `proof_expiring_soon` if dry-run or backup proof has less than the configured minimum freshness remaining.

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-first-apply-readiness.mjs
node --check scripts/smoke-recall-first-apply-readiness.mjs
npm run smoke:recall-first-apply-readiness
npm run check:recall-first-apply-readiness
npm run smoke:recall-first-capped-apply
```

The real no-write readiness gate returned `PASS_FIRST_CAPPED_APPLY_READINESS_GATE`, reported `minFreshnessRemainingMinutes: 5`, and reported the current backup proof as the tighter remaining window. Fixture smoke proved near-expiry backup proof fails before apply. Explicit Arun approval is still required before any first capped apply.

## Current Production State

No production apply, production deploy, or scheduler enablement was performed.

If `freshnessRemainingMinutes` drops below `minFreshnessRemainingMinutes` before approval, refresh the private dry-run proof and/or private backup proof, then rerun `npm run check:recall-first-apply-readiness`.
