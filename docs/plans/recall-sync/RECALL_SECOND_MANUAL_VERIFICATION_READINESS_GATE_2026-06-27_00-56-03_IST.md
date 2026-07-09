# Recall Second Manual Verification Readiness Gate - 2026-06-27 00:56 IST

## Purpose

Add a no-live, no-write readiness gate for the second manual Recall -> AI Brain production verification run.

This bridges the gap between the completion status saying `second_manual_verification_run` and the live wrapper that must not run until exact approval is present.

## Change Made

Added:

- `scripts/check-recall-second-manual-verification-readiness.mjs`
- `scripts/smoke-recall-second-manual-verification-readiness.mjs`
- package scripts:
  - `recall:second-manual:readiness`
  - `smoke:recall-second-manual-readiness`

Wired the smoke into:

- `scripts/check-recall-prelive-readiness.mjs`
- `scripts/deploy.sh`
- `scripts/check-recall-scheduler-artifacts.mjs`

## What The Readiness Gate Checks

The readiness command confirms:

- whole-goal completion status is still no-live/no-write;
- the current gate is `second_manual_verification_run`;
- required completed prerequisites are done, including live proof, first capped apply, post-apply review, scheduler artifacts, and production deploy evidence;
- scheduler evidence is still pending;
- exactly the scheduler path remains blocked by the missing second clean run;
- one clean manual run is visible and a second one is still required;
- scheduler approval is not allowed by manual-run evidence yet;
- manual verification wrapper smoke passes;
- public approval/privacy gates pass.

## Current Real Result

`npm run -s recall:second-manual:readiness` returned:

| Field | Value |
| --- | --- |
| `ok` | `true` |
| `status` | `ready_for_second_manual_verification_approval` |
| `currentBlockingGate` | `second_manual_verification_run` |
| `externalAction` | `approve_second_manual_verification_run_before_scheduler_enablement` |
| `liveWriteAllowedNow` | `false` |
| `schedulerAllowedNow` | `false` |
| `checkpointAllowedNow` | `false` |
| Clean manual runs counted | `1` of required `2` |

## Verification

Passed:

```bash
node --check scripts/check-recall-second-manual-verification-readiness.mjs
node --check scripts/smoke-recall-second-manual-verification-readiness.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
node --check scripts/check-recall-prelive-readiness.mjs
bash -n scripts/deploy.sh
npm run -s smoke:recall-second-manual-readiness
npm run -s recall:second-manual:readiness
npm run -s check:recall-scheduler
npm run -s smoke:recall-daily-sync-completion-status
```

## Safety Notes

- No live Recall API call was made.
- No Recall -> AI Brain apply was run.
- No production deploy was run.
- No scheduler timer was enabled or started.
- No checkpoint was advanced.

## Next Action

The machine side is ready for owner approval of the second manual verification run.

Use the exact approval packet:

`docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md`

Only after exact approval should `npm run recall:manual-verification-apply` be run in the controlled production shell with the approval packet's environment.
