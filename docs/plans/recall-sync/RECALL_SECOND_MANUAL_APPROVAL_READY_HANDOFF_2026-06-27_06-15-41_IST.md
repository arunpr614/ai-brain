# Recall Second Manual Approval Ready Handoff

## Purpose

This handoff records the current no-live/no-write state after the production Recall key install and read-only live probe fix. It exists so the next operator or agent can see that the production remote preflight is ready and that the only remaining gate before the second manual live write is exact Arun approval.

This document is not approval and does not run the second manual production apply.

## Current Gate

| Item | Current state |
| --- | --- |
| Current completion gate | `second_manual_verification_run` |
| Required owner | Arun |
| Required approval env | `BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL` |
| First capped apply approval | Spent; not valid for this gate |
| Scheduler enablement | Still blocked until two clean manual runs and separate scheduler approval/evidence |

## Fresh No-Live Evidence

Captured on 2026-06-27 06:15 IST:

| Check | Result |
| --- | --- |
| `npm run -s recall:daily-sync:completion-status` | Incomplete by design; current gate is `second_manual_verification_run` |
| `npm run -s recall:production-key-evidence:command -- --json` | Passed; production key evidence `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE`, `evidenceSource: env_file_mtime` |
| Production env contract | Passed; `/etc/brain/.env` has `RECALL_API_KEY` and `BRAIN_RECALL_CONFIRM_LIVE_API` key names; values not printed |
| `npm run -s recall:second-manual:remote-runtime-preflight` | Passed; `ready_for_second_manual_remote_runtime_preflight` |
| Production timer | Disabled and inactive |
| Remote Recall enable flags | Disabled |
| Runtime preflight | Ready; `liveApplyDelegationAllowed: true` |
| Selected deployed proof pair | `2026-06-26_21-58-57_IST` |
| `npm run -s recall:second-manual:production-command -- --json` | Passed as no-live/no-write handoff; approval not present |
| Handoff progress | `ready_for_exact_approval`; local private gates not blocking |

## Guarded Command

Run only after Arun explicitly approves the second manual production verification write:

```bash
BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL='I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.' \
npm run recall:second-manual:production-apply
```

## Before Running The Live Write

Rerun the no-live handoff immediately before apply:

```bash
npm run -s recall:second-manual:production-command -- --json
```

Proceed only if:

- `ok: true`
- `handoffProgress.stoppedAt: ready_for_exact_approval`
- `handoffProgress.readyForExactApproval: true`
- `handoffProgress.localPrivateGatesSkippedForProductionPath: true`
- `handoffProgress.localGateStatus: not_blocking_production_path`
- `handoffProgress.remotePreflightPassed: true`
- `handoffProgress.liveWriteAttempted: false`
- `remotePreflight.ok: true`
- `remotePreflight.liveApplyDelegationAllowed: true`
- `approvalStatus.manualVerificationApprovalExact: false` before setting the approval env, or `true` only inside the exact approved execution shell
- production timer remains disabled/inactive
- remote Recall enable flags remain disabled

## After Running The Live Write

1. Confirm the production runner output includes `secondManualApplyReport.localReview.verdict: PASS_POST_APPLY_REVIEW_GATE`.
2. Confirm `secondManualApplyReport.localApplyReportPath` points under the ignored private local Recall evidence directory.
3. Rerun `npm run -s recall:daily-sync:completion-status`.
4. Confirm there are two distinct clean manual runs before considering scheduler enablement.
5. Do not enable `brain-recall-sync.timer` until the separate scheduler approval and evidence recorder gate pass.

## Safety Notes

- This handoff made no Recall API call.
- This handoff wrote no AI Brain rows.
- This handoff did not run production apply.
- This handoff did not enable the scheduler.
- This handoff did not move a checkpoint.
- This handoff contains no Recall API key, bearer token, private Recall card ID, title, source URL, chunk, raw response body, apply payload, or database row.
