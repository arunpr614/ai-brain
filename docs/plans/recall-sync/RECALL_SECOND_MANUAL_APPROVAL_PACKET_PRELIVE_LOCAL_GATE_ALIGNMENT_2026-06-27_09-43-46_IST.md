# Recall Second Manual Approval Packet Pre-Live Local-Gate Alignment

**Date:** 2026-06-27 09:43 IST
**Scope:** Recall daily sync / second-manual approval packet and public gates
**Mode:** No-live/no-write documentation and checker hardening
**Result:** Passed. The second-manual approval packet now requires broad pre-live `nextGate.localGateResolution` proof before any approved production apply.

## Why This Exists

The broad pre-live readiness gate now exposes the same local-gate resolution proof as the focused checker and goal audit. The second-manual approval packet still needed to name that proof directly, so an operator cannot skip from current-gate readiness to a live command while missing the release-level proof that:

- the current gate is `second_manual_verification_run`
- the no-approval production apply path reaches remote preflight
- the no-approval production apply path stops at `approval_gate`
- the selected deployed SPIKE proof pair is the remote latest pair
- no live write, scheduler enablement, checkpoint, deploy, or service restart happened

## Changes

| File | Change |
| --- | --- |
| `docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` | Adds the manifest-enforced pre-live command and required `nextGate.localGateResolution` fields as pre-approval and pre-live-run evidence. Adds stop conditions for missing/stale pre-live local-gate proof. |
| `scripts/check-recall-approval-packet.mjs` | Requires the second-manual approval packet to contain the pre-live command, local-gate proof fields, latest deployed proof-pair selection, and stop guidance. |
| `scripts/check-recall-scheduler-artifacts.mjs` | Adds a static guard that the approval packet checker itself requires pre-live local-gate proof before second-manual apply. |
| `scripts/check-recall-public-docs-privacy.mjs` | Adds this report to the curated public docs privacy corpus. |

## Required Approval-Packet Proof

The packet now requires:

| Field | Required value |
| --- | --- |
| `nextGate.localGateResolution.noLiveNoWrite` | `true` |
| `nextGate.localGateResolution.liveWriteAttempted` | `false` |
| `nextGate.localGateResolution.currentGate` | `second_manual_verification_run` |
| `nextGate.localGateResolution.handoffProgress.stoppedAt` | `ready_for_exact_approval` |
| `nextGate.localGateResolution.preApplyProgress.stoppedAt` | `approval_gate` |
| `nextGate.localGateResolution.preApplyProgress.remotePreflightStatus` | `ready_for_second_manual_remote_runtime_preflight` |
| `nextGate.localGateResolution.preApplyProgress.selectedReports.timestamp` | `2026-06-26_21-58-57_IST` |
| `nextGate.localGateResolution.preApplyProgress.selectedReports.selectedBy` | `remote_latest_deployed_pair` |
| `nextGate.localGateResolution.preApplyProgress.remoteProofReports.enumerationOk` | `true` |
| `nextGate.localGateResolution.preApplyProgress.remoteProofReports.fidelityOk` | `true` |
| `nextGate.localGateResolution.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest` | `true` |

## Verification

Passed:

```bash
node --check scripts/check-recall-approval-packet.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run -s check:recall-approval-packet
npm run -s check:recall-scheduler
npm run -s check:recall-public-docs-privacy
npm run -s recall:current-gate
npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The real current gate remains `ready_for_second_manual_exact_approval` with `liveWriteAttempted: false`. The real pre-live output carries `nextGate.localGateResolution.preApplyProgress.stoppedAt: approval_gate`, `remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight`, selected proof pair `2026-06-26_21-58-57_IST`, and `selectedMatchesRemoteLatest: true`.

## Safety Notes

- No Recall API live write was attempted.
- No AI Brain import was attempted.
- No scheduler timer was enabled.
- No checkpoint was advanced.
- No deploy or service restart occurred.
- The first capped apply approval remains spent and does not authorize the second manual production run.

## Current Gate

The goal remains incomplete. The only approved next live/write step still requires exact `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` for the second manual verification run; scheduler enablement remains separately blocked.
