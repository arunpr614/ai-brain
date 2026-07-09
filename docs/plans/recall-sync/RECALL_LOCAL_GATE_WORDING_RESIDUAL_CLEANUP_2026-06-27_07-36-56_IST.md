# Recall Local Gate Wording Residual Cleanup - 2026-06-27 07:36 IST

## Summary

After propagating `secondManualVerificationPath` through completion status and pre-live readiness, I audited the current script surfaces for residual wording that could still sound like the active second-manual live write is blocked by local private gates first.

Two current no-live surfaces were clarified:

- `scripts/check-recall-prelive-readiness.mjs` no longer says the first-apply diagnostic reaches a probe when "local status helper gates fail first." It now says the guarded read-only diagnostic can run when status-helper checks are inconclusive.
- `scripts/smoke-recall-key-rotation-handoff.mjs` no longer says the blocked key-rotation handoff names "stale private gates." It now says "stale key-rotation evidence gates."
- `scripts/run-recall-first-apply-live-diagnostic.mjs` no longer emits "Local private gates failed..." in the diagnostic-only fallback. It now says local first-apply status checks failed before env-file readiness could be proven.

## Why This Matters

Those older phrases were accurate for narrow first-apply diagnostic fallback paths, but they were easy to confuse with the current production state. The current second-manual production path is different:

1. Production remote preflight is ready.
2. Local private gates are classified as not blocking the production path.
3. The remaining live-write gate is exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`.

## Validation

Passed:

```bash
node --check scripts/check-recall-prelive-readiness.mjs scripts/smoke-recall-key-rotation-handoff.mjs scripts/run-recall-first-apply-live-diagnostic.mjs scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-key-rotation-handoff
npm run -s smoke:recall-first-apply-live-diagnostic
npm run -s check:recall-scheduler
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The manifest-enforced pre-live output passed and now shows:

- `first_apply_live_diagnostic_smoke.description: First-apply read-only live diagnostic can still run a guarded probe when status-helper checks are inconclusive.`
- `key_rotation_handoff_smoke.stdoutPreview` includes `stale key-rotation evidence gates`.
- `nextGate.currentProductionGate.secondManualVerificationPath.readyHandoffMustShow.localGateStatus: not_blocking_production_path`

## Current Gate

No live Recall call, Recall import, AI Brain database write, scheduler enablement, deploy, service restart, or checkpoint movement occurred.

The current blocker remains exact second-manual approval:

```text
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL
```

The first capped apply approval is already spent and does not authorize this second manual production verification run.
