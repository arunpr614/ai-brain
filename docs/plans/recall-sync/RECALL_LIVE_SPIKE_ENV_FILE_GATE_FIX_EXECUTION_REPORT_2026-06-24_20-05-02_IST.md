# Recall Live SPIKE Env-File Gate Fix Execution Report

Created: 2026-06-24 20:05 IST
Owner: Codex
Status: Done; live read and private dry-run both reached Recall through the checked env-file path
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Fix the operational failure where the approved live Recall run could still stop on local private gates before making a live API call.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Root Cause

The live safety checks were correct, but the operator path was brittle:

- `scripts/check-recall-live-gate-status.mjs` could inspect the ignored private env file path and report whether the file was safe, but it did not load that file.
- `scripts/run-recall-live-spikes.mjs` required `RECALL_API_KEY` and live confirmation to already be present in the shell environment.
- The safe env-file workflow therefore depended on manual shell state before the live runner started.
- If that shell state was missing or mismatched, the process failed locally and no Recall network request was made.

## Fix

Added a shared checked env-file loader:

- `scripts/lib/recall-env-file.mjs`

Updated live gates:

- `scripts/run-recall-live-spikes.mjs` now accepts `--env-file <path>`, verifies that the env file is ignored, untracked, under `data/private/recall-live-spikes/`, and owner-only, then loads it before checking for `RECALL_API_KEY` or live confirmation.
- `scripts/check-recall-live-gate-status.mjs` now uses the same checked loader for safe env files and reports readiness from the same command shape the live runner uses.
- `scripts/smoke-recall-live-gate-status.mjs` now proves a secure env file can be loaded without printing the key and that a secure env file with key plus confirmation reaches `ready_for_approved_live_spikes`.
- `scripts/smoke-recall-live-spikes.mjs` now proves the runner loads a safe env file before reaching the live manifest safety gate.

## Validation

No-write local validation passed:

```text
node --check scripts/lib/recall-env-file.mjs
node --check scripts/run-recall-live-spikes.mjs
node --check scripts/check-recall-live-gate-status.mjs
node --check scripts/smoke-recall-live-gate-status.mjs
node --check scripts/smoke-recall-live-spikes.mjs
npm run smoke:recall-live-gate-status
npm run smoke:recall-live-spikes
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env --require-ready
```

The strict live status gate returned `ready_for_approved_live_spikes` with:

- `ok: true`;
- `readyForApprovedLiveSpikes: true`;
- private evidence paths ignored and untracked;
- manifest and env-file modes owner-only;
- env file loaded;
- no API key value printed.

## Live Read Proof

The approved live runner was executed with the checked env-file path:

```text
npm run recall:live-spikes -- --manifest data/private/recall-live-spikes/controlled-samples.json --env-file data/private/recall-live-spikes/recall.env --confirm-live-api
```

It completed successfully and produced fresh redacted public reports:

- `docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md`
- `docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md`

Aggregate verdicts:

- SPIKE-013: `CLEAR`
- SPIKE-014: `PROCEED-WITH-CHANGES`

Post-live report gate passed:

```text
npm run check:recall-live-spike-reports -- --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md --manifest data/private/recall-live-spikes/controlled-samples.json --allow-fidelity-changes --accepted-fidelity-risk "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used."
```

Validator verdict:

```text
PASS_WITH_ACCEPTED_FIDELITY_CHANGES
```

## Refreshed Private Dry-Run Proof

The production-shaped no-write dry-run was refreshed through the accepted live proof pair and checked env-file path.

Private report:

- `data/private/recall-live-spikes/dry-run-report.json`

Redacted aggregate validation:

- mode: `dry_run`;
- state: `done`;
- cards seen: 3;
- cards available: 3;
- enumeration complete: true;
- planned imports: 3;
- writes: 0;
- checkpoint advanced: false;
- fidelity distribution: one `metadata_only`, two `api_chunks_unverified`;
- planned action distribution: three `imported`.

Dry-run report gate passed:

```text
npm run check:recall-dry-run-report -- --report data/private/recall-live-spikes/dry-run-report.json --max-planned-imports 5 --max-age-minutes 120 --require-private-path --require-cards-seen --allow-unverified-fidelity --allow-metadata-only-fidelity
```

Validator verdict:

```text
PASS_APPLY_REVIEW_GATE
```

## Current Production State

No production apply, deploy, or scheduler enablement was performed.

The next production gate remains explicit first capped apply approval, and the backup proof freshness window must still be valid at the time of apply. If the dry-run or backup freshness window expires, refresh the private proof before any write.
