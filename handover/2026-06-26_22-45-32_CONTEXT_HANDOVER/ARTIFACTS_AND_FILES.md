# Artifacts And Files

## Project Paths

- Project root: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`
- Handover folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/handover/2026-06-26_22-45-32_CONTEXT_HANDOVER`
- Running log: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/RUNNING_LOG.md`
- Project tracker: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md`

## Private Evidence Paths

- `data/private/recall-live-spikes/recall.env` - ignored owner-only private Recall env file. Do not print or copy the key.
- `data/private/recall-live-spikes/live-diagnostic-report.json` - ignored owner-only private diagnostic proof. Stat at handover showed mode `-rw-------`, size `9291`, modified 2026-06-26 22:26:14 IST.
- `data/private/recall-live-spikes/dry-run-report.json` - private dry-run report path discovered during handover.

## Public Documents And Reports

Important public Recall documents already present in the project include:

- `docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md`
- `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md`
- `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md`
- Prior Recall approval, runbook, execution report, and privacy scan docs listed in the project tracker and running log.

## Code Files Changed In Recent Work

- `package.json` - added Recall smoke/check aliases, including live diagnostic report checker alias and live-confirmed pre-live status alias.
- `scripts/sync-recall.ts` - improved private env-file parsing for exported variables, inline comments, and empty-value override behavior.
- `scripts/lib/recall-latest-spike-reports.mjs` - added latest paired SPIKE report selection.
- `scripts/smoke-recall-latest-spike-reports.mjs` - added smoke coverage for latest paired report selection.
- `scripts/run-recall-first-apply-live-diagnostic.mjs` - fixed scoped live confirmation propagation to child helpers.
- `scripts/smoke-recall-first-apply-live-diagnostic.mjs` - updated fixture to prove wrapper-level live confirmation reaches the read-only probe while first-write gates stay closed.
- `scripts/check-recall-live-diagnostic-report.mjs` - updated to accept known first-apply states while preserving diagnostic-only restrictions.
- `scripts/smoke-recall-live-diagnostic-report-check.mjs` - updated smoke coverage for post-rotation ready diagnostics.
- `scripts/check-recall-prelive-readiness.mjs` - added live diagnostic report checker smoke and live-confirmed status preview.
- `scripts/build-recall-cli.mjs` - made Recall CLI build idempotent for overlapping runs.

## Trackers And Logs Updated

- `RUNNING_LOG.md` has entries through Entry #227 after this handover.
- The project tracker has a new context-handover status update after this handover.

## Artifacts Created By This Handover

- `README_HANDOVER_INDEX.md`
- `SESSION_SUMMARY.md`
- `ARTIFACTS_AND_FILES.md`
- `TECHNICAL_STATE.md`
- `NEXT_STEPS.md`
- `SELF_CRITIQUE.md`
