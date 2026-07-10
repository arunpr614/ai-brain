# Recall Current-Gate Safe-Next Pre-Live Handoff Alignment

**Date:** 2026-06-27 09:50 IST
**Scope:** Recall daily sync / current-gate operator guidance
**Mode:** No-live/no-write checker and documentation hardening
**Result:** Passed. `npm run recall:current-gate` now points operators through manifest-enforced pre-live and the no-live production handoff before any exact-approved production apply.

## Why This Exists

The second-manual approval packet now requires broad pre-live `nextGate.localGateResolution` proof before any live run, but the top-level current-gate command still printed a shorter safe-next list. Since `recall:current-gate` is the first command operators are told to run, its output must match the approval packet's full safe sequence.

## Changes

| File | Change |
| --- | --- |
| `scripts/check-recall-current-gate.mjs` | Adds `requiredBeforeApply` with the approval packet, current-gate command, manifest-enforced pre-live command, no-live production handoff command, apply command after exact approval, approval env, and required pre-live proof fields. Expands `safeNextCommands` and `nextAction` to include pre-live and no-live handoff before apply. |
| `scripts/smoke-recall-current-gate.mjs` | Proves ready output requires manifest-enforced pre-live, no-live production handoff, and latest deployed proof-pair evidence. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds static release guards for current-gate safe-next pre-live and handoff guidance. |
| `docs/plans/recall-sync/RECALL_CURRENT_GATE_CHECKER_2026-06-27_08-42-23_IST.md` | Documents the 09:50 IST safe-next alignment. |
| `scripts/check-recall-public-docs-privacy.mjs` | Adds this report to the curated public-doc privacy corpus. |

## Current-Gate Output Contract

The ready current-gate output now requires:

| Field | Required value |
| --- | --- |
| `requiredBeforeApply.currentGateCommand` | `npm run recall:current-gate` |
| `requiredBeforeApply.manifestPreLiveCommand` | `npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` |
| `requiredBeforeApply.noLiveProductionHandoffCommand` | `npm run recall:second-manual:production-command` |
| `requiredBeforeApply.applyCommandAfterExactApproval` | `npm run recall:second-manual:production-apply` |
| `requiredBeforeApply.approvalEnv` | `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` |
| `requiredBeforeApply.requiredPreLiveProof.localGateResolutionStoppedAt` | `approval_gate` |
| `requiredBeforeApply.requiredPreLiveProof.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `requiredBeforeApply.requiredPreLiveProof.selectedBy` | `remote_latest_deployed_pair` |
| `requiredBeforeApply.requiredPreLiveProof.selectedMatchesRemoteLatest` | `true` |

## Verification

Passed:

```bash
node --check scripts/check-recall-current-gate.mjs
node --check scripts/smoke-recall-current-gate.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-current-gate
npm run -s recall:current-gate
npm run -s check:recall-scheduler
npm run -s check:recall-public-docs-privacy
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Real `npm run -s recall:current-gate` still reports `ready_for_second_manual_exact_approval`, `localGateStatus: not_blocking_production_path`, `remotePreflightPassed: true`, `liveWriteAttempted: false`, `schedulerAllowedNow: false`, and `checkpointAllowedNow: false`.

## Safety Notes

- No Recall API live write was attempted.
- No AI Brain import was attempted.
- No scheduler timer was enabled.
- No checkpoint was advanced.
- No deploy or service restart occurred.

## Current Gate

The goal remains incomplete. The live/write path still requires exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` for the second manual verification run, followed by post-apply review and separate scheduler enablement approval/evidence.
