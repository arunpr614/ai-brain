# Recall Scheduler Enablement Evidence Recorder Execution Report - 2026-06-27 00:07 IST

## Purpose

Add a repeatable, no-secret evidence recorder for the final scheduler enablement gate. This removes the need to hand-write `scheduler-enable-evidence.json` after an approved production scheduler enablement and first scheduled run.

## Scope

The recorder creates private evidence only. It does not:

- enable `brain-recall-sync.timer`
- start `brain-recall-sync.service`
- call Recall
- import cards
- deploy
- advance checkpoints
- print or store the Recall API key
- print or store raw Recall content, source URLs, titles, chunks, or private payload fields

## Files Added

- `scripts/record-recall-scheduler-enable-evidence.mjs`
- `scripts/smoke-recall-scheduler-enable-evidence-record.mjs`

## Package Scripts Added

- `recall:scheduler-enable-evidence:record`
- `smoke:recall-scheduler-enable-evidence-record`

## Recorder Behavior

The recorder refuses to run unless `BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL` exactly matches the scheduler approval text from the approval packet.

It requires:

- production deploy evidence that passes `PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION`
- at least two `--manual-clean-run kind=path` entries
- a `--first-run-apply-report` path
- either `--ssh-host` for production state inspection or `--system-state-file` for offline smoke/fixtures

For every manual clean run and first scheduled run apply report, it runs the apply report checker before writing scheduler evidence.

After writing `data/private/recall-live-spikes/scheduler-enable-evidence.json`, it immediately runs:

```bash
node -- scripts/check-recall-completion-evidence.mjs --kind scheduler-enable --evidence data/private/recall-live-spikes/scheduler-enable-evidence.json
```

## Production Command Shape

After scheduler approval, timer enablement, and first scheduled run success, use this shape with the actual second manual apply report and scheduled apply report paths:

```bash
BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL="I approve enabling the production Recall -> AI Brain daily scheduler after at least two clean manual runs, using the deployed scheduler artifacts, the rotated private Recall env file, explicit live API confirmation, production timer brain-recall-sync.timer, and private scheduler enablement evidence recording." \
npm run recall:scheduler-enable-evidence:record -- \
  --ssh-host brain \
  --manual-clean-run manual_first_capped_apply=data/private/recall-live-spikes/first-apply-report.json \
  --manual-clean-run manual_second_guarded_apply=data/private/recall-live-spikes/<second-apply-report>.json \
  --first-run-apply-report data/private/recall-live-spikes/<scheduled-apply-report>.json \
  --allow-unverified-fidelity \
  --allow-metadata-only-fidelity
```

Use only the fidelity flags that were explicitly approved for the manual/scheduled apply reports being recorded.

## Release Gate Wiring

The new smoke is wired into:

- `scripts/check-recall-prelive-readiness.mjs`
- `scripts/deploy.sh`
- `scripts/check-recall-scheduler-artifacts.mjs`

This means future pre-live and deploy local gates verify the recorder keeps requiring approval and repeated clean-run proof without enabling timers.

## Verification

Passed:

- `node --check scripts/record-recall-scheduler-enable-evidence.mjs`
- `node --check scripts/smoke-recall-scheduler-enable-evidence-record.mjs`
- `node --check scripts/check-recall-prelive-readiness.mjs`
- `node --check scripts/check-recall-scheduler-artifacts.mjs`
- `npm run -s smoke:recall-scheduler-enable-evidence-record`
- `npm run -s check:recall-scheduler`
- `npm run -s recall:daily-sync:completion-status`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

Full pre-live passed with a new required step:

- `scheduler_enable_evidence_recorder_smoke`

Current real completion status remains intentionally incomplete:

- `currentBlockingGate`: `scheduler_enablement`
- `owner`: `Arun`
- `externalActionRequired`: true
- `blockedRequirements`: `scheduler_enablement`
- `blockedActions`: `scheduler`, `checkpoint`

## Remaining Gate

The remaining blocker is still approval and execution, not missing recorder tooling:

1. Approve and run the second distinct clean manual production verification run.
2. Approve scheduler enablement.
3. Enable the timer and verify first scheduled run.
4. Run the recorder with the actual report paths.
5. Run completion status with `--require-complete`.
