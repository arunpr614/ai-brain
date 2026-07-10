# Recall Key-Rotation Handoff Completed Phase Alignment - 2026-06-27 02:17 IST

## Purpose

Align `npm run recall:key-rotation:handoff -- --json` with the current production phase after the first capped Recall -> AI Brain apply has already completed.

## Root Cause

The first-apply status helper now correctly reports `first_capped_apply_completed`, but the key-rotation handoff command still forced its internal status call through the old pre-first-apply path. That preserved useful historical key-rotation diagnostics, but the operator-facing handoff could still show `blocked_first_apply_readiness` after the first apply had passed.

## Implementation

- `scripts/print-recall-key-rotation-handoff.mjs` now runs the normal completion-aware first-apply status by default.
- In the current completed state, the handoff reports:
  - `currentPhase: first_apply_completed`
  - `currentGate.status: first_capped_apply_completed`
  - `requiredExternalAction.action: approve_second_manual_verification_run_before_scheduler_enablement`
  - second-manual readiness and approval-packet commands
  - blocked actions for second manual verification, scheduler enablement, and checkpoint advancement.
- The handoff still supports `--skip-completed-apply-check` for pre-first-apply regression scenarios.
- `scripts/smoke-recall-key-rotation-handoff.mjs` now covers both the legacy key-rotation path and the completed-first-apply path.
- `scripts/check-recall-prelive-readiness.mjs` now describes the handoff snapshot as the current production phase rather than the current first-write blocker.

## Verification

Passed:

- `node --check scripts/print-recall-key-rotation-handoff.mjs`
- `node --check scripts/smoke-recall-key-rotation-handoff.mjs`
- `npm run -s smoke:recall-key-rotation-handoff`
- `npm run -s recall:key-rotation:handoff -- --json`
- `npm run -s check:recall-scheduler`
- `npm run -s smoke:recall-daily-sync-completion-status`
- `npm run -s recall:daily-sync:completion-status`
- `npm run -s recall:second-manual:readiness`
- `npm run -s check:recall-public-docs-privacy`
- `npm run -s check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json`

## Current State

- First capped apply is complete and passed post-apply review.
- The key-rotation handoff now reports the completed first-apply phase by default.
- The active production gate remains `second_manual_verification_run`.
- The second manual verification readiness command reports approval-only readiness.
- Scheduler and checkpoint movement remain blocked.

## Safety Notes

- No Recall API call was made for this fix.
- No import, database write, deploy, scheduler enablement, or checkpoint movement happened.
- No private Recall card IDs, titles, source URLs, chunks, raw content, API keys, bearer tokens, or cookies are included in this report.
