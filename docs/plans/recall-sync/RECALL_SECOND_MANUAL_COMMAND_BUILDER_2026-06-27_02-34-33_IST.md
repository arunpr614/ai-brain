# Recall Second Manual Command Builder - 2026-06-27 02:34 IST

## Purpose

Remove the remaining manual placeholder-editing step before the approved second manual Recall -> AI Brain verification run.

The approval packet already contained the exact guarded command shape, but it still used `<SPIKE-013-report-path>` and `<SPIKE-014-report-path>` placeholders. That creates a local failure mode where an approved run can stop before the intended live path because the operator copied the command without replacing proof paths.

## Implementation

- Added `scripts/print-recall-second-manual-verification-command.mjs`.
- Added package scripts:
  - `recall:second-manual:command`
  - `smoke:recall-second-manual-command`
- The command builder:
  - selects the latest matching SPIKE-013/SPIKE-014 report timestamp by default;
  - accepts explicit `--enumeration` and `--fidelity` paths when needed;
  - validates the selected pair through `scripts/check-recall-live-spike-reports.mjs`;
  - runs `scripts/check-recall-second-manual-verification-readiness.mjs` by default;
  - prints a guarded shell command with concrete proof paths;
  - keeps `liveWriteAllowedNow: false` and does not call Recall or write AI Brain data.
- Added `scripts/smoke-recall-second-manual-command.mjs`.
- Added the smoke to:
  - `scripts/check-recall-prelive-readiness.mjs`
  - `scripts/deploy.sh`
  - `scripts/check-recall-scheduler-artifacts.mjs`
- Updated `docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md` to prefer the command builder after exact approval.

## Current Real Output

`npm run -s recall:second-manual:command -- --json` selected:

- `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md`
- `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md`

The selected proof pair returned `PASS_WITH_ACCEPTED_FIDELITY_CHANGES`.

The readiness gate returned `ready_for_second_manual_verification_approval`, with live write, scheduler, and checkpoint permissions still false.

## Verification

Passed:

- `node --check scripts/print-recall-second-manual-verification-command.mjs`
- `node --check scripts/smoke-recall-second-manual-command.mjs`
- `node --check scripts/check-recall-prelive-readiness.mjs`
- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-second-manual-command`
- `npm run -s recall:second-manual:command -- --json`
- `npm run -s check:recall-scheduler`

## Current State

- The command builder is ready for use after exact Arun approval.
- The active production gate remains `second_manual_verification_run`.
- The second manual verification run still requires exact Arun approval from the approval packet.
- Scheduler enablement remains blocked until two distinct clean manual run reports exist and scheduler approval/evidence is recorded separately.

## Safety Notes

- No Recall API call was made for this change.
- No import, database write, production deploy, scheduler enablement, or checkpoint movement happened.
- No private Recall card IDs, titles, source URLs, chunks, raw content, API keys, bearer tokens, cookies, or private payloads are included in this report.
