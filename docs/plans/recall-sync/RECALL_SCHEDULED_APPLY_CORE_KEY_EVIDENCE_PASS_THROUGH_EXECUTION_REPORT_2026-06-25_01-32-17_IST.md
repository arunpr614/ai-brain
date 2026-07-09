# Recall Scheduled Apply Core Key Evidence Pass-Through Execution Report

Created: 2026-06-25 01:32 IST
Owner: Codex
Status: Done for offline scope; scheduler remains disabled
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Objective

Make the future scheduled Recall apply path carry the same core CLI key-rotation evidence requirement that now protects lower-level direct apply commands.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, apply report payload, backup payload, or database rows.

## Change Summary

- `scripts/recall-scheduled-apply.sh` still performs its outer key-rotation evidence check before live-spike proof, report directory creation, dry-run, backup, apply, or report validation.
- The real non-fixture scheduled apply command now also passes key-evidence proof into the bundled core CLI:
  - `--require-key-rotation-evidence`
  - `--key-rotation-env-file "${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-/etc/brain/.env}"`
  - `--key-rotated-after "${BRAIN_RECALL_KEY_ROTATED_AFTER_ISO:-2026-06-24T15:54:17.000Z}"`
  - `--key-rotation-system-env-file`
- The scheduled apply environment now sets `BRAIN_RECALL_REQUIRE_KEY_ROTATION_EVIDENCE=1` for defense in depth.
- The key-evidence argument list uses guarded empty-array expansion so fixture smokes remain compatible with `set -u`.
- `scripts/smoke-recall-scheduled-wrapper.mjs` now statically asserts the real wrapper source passes the core key-evidence flags and env requirement.
- `scripts/check-recall-scheduler-artifacts.mjs` now enforces the same pass-through at release-gate time.

## Safety Properties

- Fixture smoke mode remains available and does not call Recall.
- Real non-fixture scheduled mode checks system env-file key evidence twice:
  1. wrapper-level check before any scheduled work;
  2. core CLI apply-level check before importer writes or checkpoint advancement.
- The scheduler remains disabled. This change does not enable the timer, deploy, run live Recall work, refresh proof, apply, or advance a checkpoint.

## Validation

Passed in this session:

```text
bash -n scripts/recall-scheduled-apply.sh
node --check scripts/smoke-recall-scheduled-wrapper.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run build:recall-cli
npm run smoke:recall-scheduler-wrapper
npm run check:recall-scheduler
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
git diff --check -- scripts/recall-scheduled-apply.sh scripts/smoke-recall-scheduled-wrapper.mjs scripts/check-recall-scheduler-artifacts.mjs scripts/check-recall-approval-packet.mjs scripts/check-recall-public-docs-privacy.mjs docs/plans/recall-sync/RECALL_SCHEDULED_APPLY_CORE_KEY_EVIDENCE_PASS_THROUGH_EXECUTION_REPORT_2026-06-25_01-32-17_IST.md docs/plans/recall-sync/RECALL_DAILY_SYNC_PROJECT_TRACKER_2026-06-24_09-16-07_IST.md docs/plans/recall-sync/RECALL_DAILY_SYNC_CURRENT_STATE_COMPLETION_AUDIT_2026-06-24_13-14-45_IST.md docs/plans/recall-sync/RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md
```

Real local first-apply status remains intentionally blocked:

```text
npm run recall:first-apply:status
```

Observed state: `blocked_key_rotation_evidence`, with stale dry-run and backup proof behind that key-evidence blocker.

## Remaining Gate

No production apply, deploy, scheduler enablement, proof refresh, checkpoint advancement, stage, commit, push, or pull request happened in this work. The next production step remains: rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, run the post-rotation prepare wrapper, then request exact first capped apply approval only after status/readiness are green.
