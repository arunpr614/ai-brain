# Recall Scheduler Enablement Manual Clean Run Evidence Guard Execution Report - 2026-06-26 23:56 IST

## Purpose

Close a scheduler enablement evidence gap before the production timer is approved. The prior scheduler evidence contract required `manualCleanRunsBeforeEnable >= 2`, but a bare numeric counter was too weak to prove that two clean manual runs were actually reviewed.

## Change

`scripts/check-recall-completion-evidence.mjs` now requires scheduler enablement evidence to include:

- `manualCleanRunsBeforeEnable >= 2`
- `manualCleanRuns[]` as an array
- at least two `manualCleanRuns[]` entries
- at least as many `manualCleanRuns[]` entries as `manualCleanRunsBeforeEnable`
- each entry has `ok: true`
- each entry has a non-empty `kind`
- each entry has `completedAtIso` before scheduler enablement
- each entry has `applyReportVerdict: PASS_POST_APPLY_REVIEW_GATE`
- each entry has an `applyReportPath` under `data/private/recall-live-spikes/`
- no duplicate `applyReportPath` values across counted manual runs

This preserves the existing requirement that scheduler enablement evidence stays private, ignored by git, owner-only, no-secret, and free of raw/private payload keys.

## Smoke Coverage Added

`scripts/smoke-recall-completion-evidence.mjs` now proves:

- valid scheduler evidence passes with two distinct manual clean run report entries
- scheduler evidence with `manualCleanRunsBeforeEnable: 1` fails
- scheduler evidence without `manualCleanRuns[]` fails
- scheduler evidence with duplicate manual clean run apply report paths fails

`scripts/smoke-recall-daily-sync-completion-status.mjs` now uses valid scheduler evidence with two distinct manual clean run report entries in its complete fixture.

## Documentation Updated

`docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md` now states that the scheduler evidence validator requires both:

- the numeric count `manualCleanRunsBeforeEnable >= 2`
- a `manualCleanRuns[]` evidence list with at least two distinct private reviewed apply report paths

## Verification

Passed:

- `node --check scripts/check-recall-completion-evidence.mjs`
- `node --check scripts/smoke-recall-completion-evidence.mjs`
- `node --check scripts/smoke-recall-daily-sync-completion-status.mjs`
- `npm run -s smoke:recall-completion-evidence`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s recall:daily-sync:completion-status`

Current real completion status remains intentionally incomplete:

- `currentBlockingGate`: `scheduler_enablement`
- `owner`: `Arun`
- `externalActionRequired`: true
- `blockedRequirements`: `scheduler_enablement`
- `blockedActions`: `scheduler`, `checkpoint`

## Impact

The scheduler is still disabled. No Recall API call, database write, production timer enablement, scheduled service run, checkpoint movement, stage, commit, push, or PR was performed for this guard.

The remaining path is unchanged operationally, but the future scheduler evidence is now harder to fake or accidentally overstate: the second clean manual run must produce a distinct private apply report that passes post-apply review before scheduler enablement evidence can pass.
