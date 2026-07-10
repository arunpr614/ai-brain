# Recall Completion Status Second Manual Gate Guidance - 2026-06-27 00:45 IST

## Purpose

Correct the no-live Recall daily sync completion status so it points operators at the real next gate after the first capped apply and production deploy: the second manual verification run, not direct scheduler enablement.

This report is public and no-secret. It does not contain Recall API keys, raw Recall content, titles, URLs, chunks, or private payloads.

## Problem

After the first capped apply and production deploy, `npm run recall:daily-sync:completion-status` correctly reported the whole goal as incomplete and blocked on scheduler completion evidence.

However, its top-level next gate jumped straight to `scheduler_enablement`. That was too coarse because the scheduler evidence contract already requires at least two distinct clean manual apply reports before scheduler enablement can be approved. The current real state has only one clean manual report: the first capped apply report.

## Change Made

Updated `scripts/check-recall-daily-sync-completion-status.mjs` to include manual clean-run readiness inside the scheduler requirement.

The status command now:

- counts the already-reviewed first capped apply report as one clean manual run;
- scans private `scheduled-apply-*.json` reports with the real post-apply validator;
- requires two distinct clean manual runs before treating scheduler approval as the active next gate;
- reports `second_manual_verification_run` as the current gate when only one clean run exists;
- points to `docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md`;
- keeps the command no-live and no-write.

Updated `scripts/smoke-recall-daily-sync-completion-status.mjs` to prove both states:

- one clean manual run visible -> active gate is `second_manual_verification_run`;
- two distinct clean manual runs visible -> active gate advances to `scheduler_enablement`.

## Current Real Status

Latest no-live status output reports:

| Field | Value |
| --- | --- |
| `completionAchieved` | `false` |
| `currentBlockingGate` | `second_manual_verification_run` |
| `externalAction` | `approve_second_manual_verification_run_before_scheduler_enablement` |
| `blockedRequirements` | `scheduler_enablement` |
| `blockedActions` | `second_manual_verification`, `scheduler`, `checkpoint` |
| Manual clean run count | `1` of required `2` |
| Scheduler enablement allowed by manual-run evidence | `false` |

The one counted clean run is the already-reviewed first capped apply report.

## Verification

Passed:

```bash
node --check scripts/check-recall-daily-sync-completion-status.mjs
node --check scripts/smoke-recall-daily-sync-completion-status.mjs
npm run -s smoke:recall-daily-sync-completion-status
npm run -s recall:daily-sync:completion-status
```

## Safety Notes

- No live Recall API call was made.
- No Recall or AI Brain write was made.
- No production deploy was run.
- No scheduler timer was enabled or started.
- No checkpoint was advanced by this change.

## Next Action

Obtain explicit approval for the second manual production verification run using:

`docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md`

Only after that run passes and creates a second distinct private apply report should scheduler enablement approval be considered.
