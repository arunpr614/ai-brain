# Recall Second Manual Approval Classification Hardening - 2026-06-27 04:17 IST

## Context

Arun provided approval text for the first capped Recall -> AI Brain apply after the first capped apply had already completed and passed post-apply review. The current production gate is different: one additional manual production verification run is required before scheduler enablement.

The previous production runner already skipped broad local readiness and local live-spike gates by default, then relied on remote runtime preflight plus exact second-manual approval. The remaining operator risk was approval ambiguity: stale first-apply approval could look like approval while still failing the second-manual runner.

## Change

- `scripts/run-recall-second-manual-production-apply.mjs` now classifies supplied approval text without printing approval values.
  - Exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is still the only approval that can reach remote apply.
  - Exact first capped apply approval is reported as `stale_first_apply_approval`.
  - Exact second-manual approval supplied outside `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` is reported as `second_manual_approval_wrong_env`.
  - Both mismatch cases stop before remote apply with `liveWriteAttempted: false`.
- `scripts/print-recall-second-manual-production-apply-command.mjs` now surfaces `approvalStatus` and warns that first capped apply approval is already spent and does not authorize this second manual verification run.
- `scripts/smoke-recall-second-manual-production-command.mjs` now proves the handoff classifies first-apply approval as stale.
- `scripts/smoke-recall-second-manual-production-apply.mjs` now proves stale first-apply approval and wrong-env second-manual approval remain no-live/no-write.
- `scripts/check-recall-scheduler-artifacts.mjs` now statically requires the approval-classification behavior.

## Verification

Passed:

- `node --check scripts/run-recall-second-manual-production-apply.mjs scripts/print-recall-second-manual-production-apply-command.mjs scripts/smoke-recall-second-manual-production-command.mjs scripts/smoke-recall-second-manual-production-apply.mjs scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-second-manual-production-command`
- `npm run -s smoke:recall-second-manual-production-apply`
- `npm run -s check:recall-scheduler`
- `npm run -s recall:second-manual:production-command -- --json`
- `BRAIN_RECALL_FIRST_APPLY_APPROVAL="<exact first capped apply approval text>" npm run -s recall:second-manual:production-apply` - expected blocked exit with `stale_first_apply_approval`, remote preflight ready, and `liveWriteAttempted: false`
- `npm run -s check:recall-public-docs-privacy` - scanned 89 curated public docs
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

## Safety Notes

- No Recall API call was made.
- No import, database write, checkpoint movement, scheduler enablement, deploy, service restart, commit, push, or PR happened.
- This does not approve the second manual verification run. It only makes stale or misplaced approval text easier to diagnose before live execution.

## Current Gate

The current gate remains exact Arun approval for the second manual verification live write:

```bash
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL="<exact second-manual approval text>" npm run recall:second-manual:production-apply
```

The first capped apply approval is complete historical evidence and should not be reused for the second manual verification run.
