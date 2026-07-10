# Recall Pre-Live Next Gate Completion Status Alignment

Date: 2026-06-27 01:47 IST
Status: Done for no-live/no-write release guidance clarity
Scope: Recall -> AI Brain pre-live readiness output

## Summary

The manifest-enforced pre-live gate already ran the daily sync completion-status snapshot, but its top-level `nextGate` still used an older generic live-spike message. That was misleading after first apply and production deploy had already completed, because the real current production gate is now `second_manual_verification_run`.

The pre-live output now promotes the embedded completion-status snapshot into a structured top-level `nextGate.currentProductionGate` object.

## Root Cause

`scripts/check-recall-prelive-readiness.mjs` had two independent pieces of state:

| Output area | Previous behavior |
| --- | --- |
| `results[].id === daily_sync_completion_status_snapshot` | Correctly ran `recall:daily-sync:completion-status`, whose stdout preview showed `second_manual_verification_run`. |
| top-level `nextGate` | Still returned a static string: manifest readiness had passed, but approved live SPIKE work still needed a checked Recall env file. |

The static string made sense before live spikes, first apply, and deploy were complete. It no longer described the active operator gate.

## Implementation

Updated `scripts/check-recall-prelive-readiness.mjs`:

- parses the JSON output of the embedded `daily_sync_completion_status_snapshot` step;
- adds a sanitized `statusSummary` to that step;
- changes top-level `nextGate` from a stale static string to a structured object;
- includes manifest validation status separately from the production gate;
- surfaces `currentBlockingGate`, owner, blocked requirements/actions, safe next commands, and manual clean-run readiness;
- preserves no-live/no-write safety notes.

## Current Verified Output Shape

After running manifest-enforced pre-live, the top-level next gate now includes:

| Field | Value |
| --- | --- |
| `nextGate.status` | `offline_readiness_passed` |
| `nextGate.manifest.validationEnforced` | `true` |
| `nextGate.currentProductionGate.currentBlockingGate` | `second_manual_verification_run` |
| `nextGate.currentProductionGate.owner` | `Arun` |
| `nextGate.currentProductionGate.externalAction` | `approve_second_manual_verification_run_before_scheduler_enablement` |
| `nextGate.currentProductionGate.manualCleanRunReadiness.cleanRunCount` | `1` |
| `nextGate.currentProductionGate.manualCleanRunReadiness.needsSecondManualVerificationRun` | `true` |
| `nextGate.currentProductionGate.manualCleanRunReadiness.schedulerEnablementApprovalAllowedByManualRunEvidence` | `false` |

## Verification

Passed:

| Command | Result |
| --- | --- |
| `node --check scripts/check-recall-prelive-readiness.mjs` | Passed |
| `npm run -s smoke:recall-prelive-output` | Passed |
| `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` | Passed; top-level next gate now points at `second_manual_verification_run` |

## Safety Notes

This change is no-live and no-write. It did not call Recall, import data, write to AI Brain, deploy production code, enable the scheduler, or advance checkpoints.

The next real gate remains exact Arun approval for the second manual verification run.
