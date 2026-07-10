# Recall First-Apply Status Completed Gate Reconciliation - 2026-06-27 02:08 IST

## Purpose

Fix the operator-facing confusion where `npm run recall:first-apply:status` could still report stale pre-apply blockers after the first capped Recall -> AI Brain apply had already completed and passed post-apply review.

## Root Cause

`recall:daily-sync:completion-status` already treated the private first-apply report as durable historical evidence, but `recall:first-apply:status` still evaluated only the old pre-apply key/proof/readiness gates. After the successful first apply, dry-run and backup proof can naturally become stale, so the first-apply status helper could incorrectly send operators back to a completed phase.

## Implementation

- `scripts/check-recall-first-apply-status.mjs` now checks the durable private first-apply report before evaluating pre-apply readiness.
- When the apply report passes `PASS_POST_APPLY_REVIEW_GATE`, first-apply status returns `first_capped_apply_completed`.
- The completed status points at `second_manual_verification_run`, names `npm run recall:second-manual:readiness`, and keeps second manual verification, scheduler, and checkpoint actions blocked.
- Stale pre-apply proof is summarized as historical and no longer reopens first-write preparation.
- Pre-first-apply helper workflows now pass `--skip-completed-apply-check` for their internal status probes:
  - `scripts/run-recall-first-apply-live-diagnostic.mjs`
  - `scripts/print-recall-key-rotation-handoff.mjs`
  - `scripts/prepare-recall-first-apply-after-rotation.mjs`
- `scripts/smoke-recall-first-apply-status.mjs` now includes a completed-apply fixture proving stale pre-apply blockers are suppressed only when a valid completed apply report exists.

## Verification

Passed:

- `node --check scripts/check-recall-first-apply-status.mjs`
- `node --check scripts/smoke-recall-first-apply-status.mjs`
- `npm run -s smoke:recall-first-apply-status`
- `npm run -s recall:first-apply:status`
- `npm run -s smoke:recall-first-apply-live-diagnostic`
- `npm run -s smoke:recall-key-rotation-handoff`
- `npm run -s smoke:recall-first-apply-prepare-after-rotation`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s recall:daily-sync:completion-status`
- `npm run -s recall:second-manual:readiness`
- `npm run -s check:recall-scheduler`
- `npm run -s check:recall-public-docs-privacy`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

## Current State

- First capped apply is complete and passed post-apply review.
- `npm run -s recall:first-apply:status` now reports `first_capped_apply_completed`.
- `npm run -s recall:daily-sync:completion-status` still reports `currentBlockingGate: second_manual_verification_run`.
- `npm run -s recall:second-manual:readiness` reports readiness for exact approval only.
- Live write, scheduler, and checkpoint permissions remain false until the exact second-manual approval gate is satisfied.

## Safety Notes

- No Recall API call was made for this fix.
- No import, database write, deploy, scheduler enablement, or checkpoint movement happened.
- No private Recall card IDs, titles, source URLs, chunks, raw content, API keys, bearer tokens, or cookies are included in this report.
