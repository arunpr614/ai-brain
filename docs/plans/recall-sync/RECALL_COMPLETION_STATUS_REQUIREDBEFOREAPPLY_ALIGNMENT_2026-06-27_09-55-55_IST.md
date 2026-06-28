# Recall Completion Status Required-Before-Apply Alignment

**Date:** 2026-06-27 09:55 IST
**Scope:** Recall daily sync / completion-status second-manual path
**Mode:** No-live/no-write checker and documentation hardening
**Result:** Passed. `npm run recall:daily-sync:completion-status` now exposes the same required-before-apply sequence as `npm run recall:current-gate`.

## Why This Exists

`recall:current-gate` now tells operators to run manifest-enforced pre-live and the no-live production handoff before any exact-approved apply. The broader completion-status output still pointed to current-gate and the handoff, but it did not carry the explicit `requiredBeforeApply` contract or manifest pre-live proof requirements. That left a small guidance drift between the whole-goal status command and the current-gate command.

## Changes

| File | Change |
| --- | --- |
| `scripts/check-recall-daily-sync-completion-status.mjs` | Adds `SECOND_MANUAL_VERIFICATION_MANIFEST_PRELIVE_COMMAND`, includes it in second-manual safe-next commands and next-action text, and adds `secondManualVerificationPath.requiredBeforeApply`. |
| `scripts/smoke-recall-daily-sync-completion-status.mjs` | Proves scheduler-only and stale historical apply states include manifest-enforced pre-live and latest deployed proof-pair evidence before apply. |
| `scripts/check-recall-prelive-readiness.mjs` | Preserves `requiredBeforeApply` inside the sanitized `nextGate.currentProductionGate.secondManualVerificationPath`. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds static release guards for completion-status manifest pre-live and required-before-apply guidance. |
| `scripts/check-recall-public-docs-privacy.mjs` | Adds this report to the curated public-doc privacy corpus. |

## Required-Before-Apply Contract

`secondManualVerificationPath.requiredBeforeApply` now includes:

| Field | Value |
| --- | --- |
| `currentGateCommand` | `npm run recall:current-gate` |
| `manifestPreLiveCommand` | `npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json` |
| `noLiveProductionHandoffCommand` | `npm run recall:second-manual:production-command` |
| `applyCommandAfterExactApproval` | `npm run recall:second-manual:production-apply` |
| `approvalEnv` | `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` |
| `requiredPreLiveProof.localGateResolutionStoppedAt` | `approval_gate` |
| `requiredPreLiveProof.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `requiredPreLiveProof.selectedBy` | `remote_latest_deployed_pair` |
| `requiredPreLiveProof.selectedMatchesRemoteLatest` | `true` |

## Verification

Passed:

```bash
node --check scripts/check-recall-daily-sync-completion-status.mjs
node --check scripts/smoke-recall-daily-sync-completion-status.mjs
node --check scripts/check-recall-prelive-readiness.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run -s smoke:recall-daily-sync-completion-status
npm run -s recall:daily-sync:completion-status
npm run -s check:recall-scheduler
npm run -s check:recall-public-docs-privacy
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Real completion status remains incomplete by design: `status: blocked_second_manual_verification_run`, `currentBlockingGate: second_manual_verification_run`, `activeBlockedRequirement: second_manual_verification`, one clean manual run, and scheduler evidence missing.

## Safety Notes

- No Recall API live write was attempted.
- No AI Brain import was attempted.
- No scheduler timer was enabled.
- No checkpoint was advanced.
- No deploy or service restart occurred.

## Current Gate

The goal remains incomplete. The next live/write step still requires exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL`, followed by post-apply review and separate scheduler enablement approval/evidence.
