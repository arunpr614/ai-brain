# Recall Scheduler Enablement Approval Packet - 2026-06-26 23:50 IST

## Purpose

Separate the already completed first capped apply and production deploy from the next higher-risk action: enabling automated daily Recall -> AI Brain writes in production.

This packet is no-secret and does not include Recall card content, source URLs, raw API responses, private payloads, or API keys.

## Current State

Done:

- First capped Recall -> AI Brain apply for the 2026-06-16 window completed.
- Private post-apply report passed `PASS_POST_APPLY_REVIEW_GATE`.
- Production deployment completed and passed `PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION`.
- Second manual Recall -> AI Brain production verification apply completed through the guarded production path.
- Second manual apply report passed `PASS_POST_APPLY_REVIEW_GATE`.
- Completion status now reports at least two clean manual runs and `currentBlockingGate: scheduler_enablement`; after the approved manual verifications on 2026-06-27, current `manualCleanRunReadiness.cleanRunCount` is `6`.
- Production health returned HTTP `200`.
- Production AI provider checks passed.
- Production Recall timer is installed but disabled and inactive.
- Production Recall live-write flags are unset/disabled.
- Production dependency audit reports 0 vulnerabilities after the `undici` override.

Not done:

- Scheduler enablement approval has not been granted.
- Scheduler timer has not been enabled.
- First scheduled run evidence has not been recorded.
- Private scheduler enablement evidence has not been recorded.
- Daily sync completion status remains incomplete by design.

## Why Separate Approval Is Required

The prior approval covered one bounded manual apply only:

- One date window.
- Maximum 5 planned imports.
- Reviewed proof chain.
- Explicit fidelity flags for the known Recall content classes.

Daily automation is different because it authorizes recurring production write attempts. The checker requires separate scheduler evidence with:

- approval scope `scheduler_enablement_after_repeated_clean_runs`
- at least 2 manual clean runs before enablement
- timer enabled and active
- first scheduled service run success
- Recall env flags enabled for scheduler operation
- private apply report path and post-run verdict
- `manualCleanRuns[]` entries for every counted clean run, each with a distinct private apply report path and `PASS_POST_APPLY_REVIEW_GATE`
- `firstRun.applyReportPath` distinct from every pre-enable manual clean-run apply report path
- `firstRun.completedAtIso` after scheduler timer activation, with `service.lastRunCompletedAtIso` aligned to that same scheduled run

## Current Manual-Run Evidence

Confirmed clean manual runs:

| Run | Status | Evidence |
| --- | --- | --- |
| First capped apply, 2026-06-16 window | Passed | `data/private/recall-live-spikes/first-apply-report.json`, verdict `PASS_POST_APPLY_REVIEW_GATE`, 3 imports, 0 blockers |
| Second manual production verification apply | Passed | `data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json`, verdict `PASS_POST_APPLY_REVIEW_GATE`, 0 cards seen/imported/upgraded/blocked, checkpoint advanced by the guarded apply path |
| Additional approved manual production verification apply | Passed | `data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json`, verdict `PASS_POST_APPLY_REVIEW_GATE`, 0 cards seen/imported/upgraded/blocked, checkpoint advanced by the guarded apply path |
| Additional approved manual production verification apply | Passed | `data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json`, verdict `PASS_POST_APPLY_REVIEW_GATE`, 0 cards seen/imported/upgraded/blocked, checkpoint advanced by the guarded apply path |
| Fifth approved manual production verification apply | Passed | `data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json`, verdict `PASS_POST_APPLY_REVIEW_GATE`, 0 cards seen/imported/upgraded/blocked, checkpoint advanced by the guarded apply path |
| Sixth approved manual production verification apply | Passed | `data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json`, verdict `PASS_POST_APPLY_REVIEW_GATE`, 0 cards seen/imported/upgraded/blocked, checkpoint advanced by the guarded apply path |

The scheduler evidence validator requires `manualCleanRunsBeforeEnable >= 2` plus a `manualCleanRuns[]` evidence list with at least two distinct private reviewed apply report paths. The current state now satisfies the repeated manual-run prerequisite. It does not authorize scheduler enablement by itself; separate scheduler approval and private scheduler evidence are still required.

## Recommended Approval Path

Step 1: Reconfirm the no-live gates immediately before scheduler enablement:

```bash
npm run recall:current-gate
npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
npm run recall:daily-sync:completion-status
npm run recall:scheduler-enable:command
```

Expected state before approval:

- `recall:current-gate` reports `status: ready_for_scheduler_enablement_approval`
- `approvalRequiredEnv: BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL`
- `schedulerAllowedNow: true`
- `manualCleanRunReadiness.cleanRunCount >= 2` (currently `6`)
- `recall:daily-sync:completion-status` reports `status: blocked_scheduler_enablement`
- `recall:scheduler-enable:command` reports `mode: scheduler_enablement_command_handoff` and `handoffProgress.stoppedAt: ready_for_exact_scheduler_approval`

Step 2: Approve scheduler enablement with the exact approval text.

Suggested approval text:

```text
I approve enabling the production Recall -> AI Brain daily scheduler after at least two clean manual runs, using the deployed scheduler artifacts, the rotated private Recall env file, explicit live API confirmation, production timer brain-recall-sync.timer, and private scheduler enablement evidence recording.
```

Step 3: Only after exact approval, enable the production timer/flags and verify the first scheduled service run. Then run `npm run recall:scheduler-evidence:command` to print the read-only first-run inspection, candidate report review, evidence-recording command, and final verification commands. The recorder does not enable timers, call Recall, apply imports, deploy, or advance checkpoints; it only validates and records private evidence after the approved production state exists.

## Expected Scheduler Enablement Evidence

Private evidence file to create after approval and first scheduled run:

- `data/private/recall-live-spikes/scheduler-enable-evidence.json`
- Mode: `600`
- Git ignored and untracked.

Required validator verdict:

- `PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION`

Required facts:

| Evidence area | Required value |
| --- | --- |
| Target | `production` |
| Approval scope | `scheduler_enablement_after_repeated_clean_runs` |
| Manual clean runs before enable | at least `2` |
| Manual clean run evidence | at least 2 distinct `manualCleanRuns[]` entries |
| Timer unit | `brain-recall-sync.timer` |
| Timer enabled | true |
| Timer active | true |
| Timer active since | valid `timer.activeSinceIso` timestamp |
| Service unit | `brain-recall-sync.service` |
| First service run exit code | `0` |
| Service last run completed at | valid `service.lastRunCompletedAtIso` timestamp after `timer.activeSinceIso` |
| First run apply verdict | `PASS_POST_APPLY_REVIEW_GATE` |
| First run apply report path | private path under `data/private/recall-live-spikes/`, distinct from every pre-enable manual clean-run report path, with `firstRun.completedAtIso` after `timer.activeSinceIso` |
| Recall sync flag | true |
| Recall scheduler flag | true |
| Recall live confirmation flag | true |

Each `manualCleanRuns[]` entry must contain:

| Field | Required value |
| --- | --- |
| `ok` | true |
| `kind` | non-empty run label, such as `manual_first_capped_apply` |
| `completedAtIso` | valid ISO timestamp before scheduler enablement |
| `applyReportVerdict` | `PASS_POST_APPLY_REVIEW_GATE` |
| `applyReportPath` | distinct path under `data/private/recall-live-spikes/` |

## Stop Conditions

Do not enable the scheduler if any of these occur:

- The second manual run is not explicitly approved.
- Manual run evidence is missing, stale, or not private/owner-only.
- Any apply report shows blocked cards, remote changes, unexpected fidelity classes, or failed validator status.
- Production health is not HTTP `200`.
- Production provider checks fail.
- The timer is already enabled unexpectedly before the approved enablement window.
- Any command output or public document risks exposing key-shaped values, bearer tokens, source URLs, raw Recall content, or private sample values.

## Completion Command

After scheduler approval, timer enablement, and first scheduled run success, record private evidence with the recorder rather than hand-writing JSON:

```bash
BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL="I approve enabling the production Recall -> AI Brain daily scheduler after at least two clean manual runs, using the deployed scheduler artifacts, the rotated private Recall env file, explicit live API confirmation, production timer brain-recall-sync.timer, and private scheduler enablement evidence recording." \
npm run recall:scheduler-enable-evidence:record -- \
  --ssh-host brain \
  --manual-clean-run manual_first_capped_apply=data/private/recall-live-spikes/first-apply-report.json \
  --manual-clean-run manual_second_guarded_apply=data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json \
  --manual-clean-run manual_additional_guarded_apply_2=data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json \
  --manual-clean-run manual_additional_guarded_apply_3=data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json \
  --manual-clean-run manual_additional_guarded_apply_4=data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json \
  --manual-clean-run manual_additional_guarded_apply_5=data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json \
  --first-run-apply-report data/private/recall-live-spikes/<scheduled-apply-report>.json \
  --allow-unverified-fidelity \
  --allow-metadata-only-fidelity
```

The no-live scheduler handoff derives the `--manual-clean-run` arguments from `manualCleanRunReadiness.cleanRuns[]`, so future extra approved manual reports should appear in the generated evidence command automatically. Use only the fidelity flags that were explicitly approved for the manual/scheduled apply reports being recorded.

The `--first-run-apply-report` value must be the actual first scheduled service-run apply report. It must not reuse `first-apply-report.json`, `scheduled-apply-20260627T050448Z.json`, `scheduled-apply-20260627T063340Z.json`, `scheduled-apply-20260627T073114Z.json`, `scheduled-apply-20260627T075410Z.json`, or `scheduled-apply-20260627T082621Z.json`; duplicate manual evidence and stale pre-enable reports are rejected by the recorder, strict evidence checker, and first-run timing guard.

The first scheduled service-run apply report must also be newer than scheduler timer activation. The recorder checks `timer.activeSinceIso`, `service.lastRunCompletedAtIso`, and `firstRun.completedAtIso` so stale manual or pre-enable reports cannot satisfy scheduler completion.

The recorder converts `systemctl show` timestamps to UTC ISO strings on the production host before writing evidence, avoiding local parsing ambiguity for systemd's human-readable timestamp output.

After scheduler enablement evidence is recorded:

```bash
npm run recall:daily-sync:completion-status -- --require-complete
```

Expected completion result after successful scheduler evidence:

- `completionAchieved: true`
- `status: complete`
- no blocked requirements
