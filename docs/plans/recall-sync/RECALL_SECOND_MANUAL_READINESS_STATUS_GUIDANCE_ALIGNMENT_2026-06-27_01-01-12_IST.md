# Recall Second Manual Readiness Status Guidance Alignment - 2026-06-27 01:01 IST

## Purpose

Align the operator-facing Recall completion status and approval checks with the new second manual verification readiness gate.

The desired safe sequence is:

1. Review the second manual approval packet.
2. Run the no-live readiness command.
3. Wait for exact owner approval.
4. Only then run the live manual verification wrapper.

## Change Made

Updated `scripts/check-recall-daily-sync-completion-status.mjs` so `safeNextCommands` now includes:

```bash
npm run recall:second-manual:readiness
```

when the current gate is `second_manual_verification_run`.

Updated `scripts/smoke-recall-daily-sync-completion-status.mjs` so the scheduler-only fixture proves the safe-next command list includes the readiness command.

Updated `scripts/check-recall-approval-packet.mjs` so package-script coverage now requires:

- `recall:manual-verification-apply`
- `smoke:recall-manual-verification-apply`
- `recall:second-manual:readiness`
- `smoke:recall-second-manual-readiness`
- `recall:scheduler-enable-evidence:record`
- `smoke:recall-scheduler-enable-evidence-record`

Updated `RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` so it now:

- instructs operators to run `npm run -s recall:second-manual:readiness` before approval and immediately before any live run;
- lists readiness failure as a stop condition;
- corrects current status from `scheduler_enablement` to `second_manual_verification_run`;
- includes the readiness smoke and real readiness command in verification evidence.

## Current Real Result

`npm run -s recall:daily-sync:completion-status` now reports safe next commands:

1. review the second manual approval packet;
2. run `npm run recall:second-manual:readiness`;
3. only after explicit approval, run the manual verification wrapper from the controlled production shell;
4. re-run completion status.

`npm run -s recall:second-manual:readiness` still reports:

- `status: ready_for_second_manual_verification_approval`
- `liveWriteAllowedNow: false`
- `schedulerAllowedNow: false`
- `checkpointAllowedNow: false`

## Verification

Passed:

```bash
node --check scripts/check-recall-daily-sync-completion-status.mjs
node --check scripts/smoke-recall-daily-sync-completion-status.mjs
node --check scripts/check-recall-approval-packet.mjs
npm run -s smoke:recall-daily-sync-completion-status
npm run -s recall:daily-sync:completion-status
npm run -s check:recall-approval-packet
npm run -s recall:second-manual:readiness
```

## Safety Notes

- No live Recall API call was made.
- No Recall -> AI Brain apply was run.
- No production deploy was run.
- No scheduler timer was enabled or started.
- No checkpoint was advanced.

## Next Action

Run broader no-live release gates, then continue waiting for exact owner approval of the second manual verification run.
