# Recall First Apply Post-Rotation Prepare Wrapper Execution Report

Created: 2026-06-25 00:50 IST
Owner: Codex
Status: Done for offline scope; real first apply remains blocked until actual key rotation evidence exists
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Reduce the manual post-rotation sequence before first capped apply without weakening the write gates.

Before this change, the safe path after key rotation required the operator to run key-evidence checks, possibly record private key-rotation evidence, rerun status, then separately refresh stale proof if needed. This change adds one no-write wrapper that can perform those safe preparation steps after exact acknowledgement.

## Change Summary

- Added `scripts/prepare-recall-first-apply-after-rotation.mjs`.
- Added `scripts/smoke-recall-first-apply-prepare-after-rotation.mjs`.
- Added package scripts:
  - `npm run recall:first-apply:prepare-after-rotation`
  - `npm run smoke:recall-first-apply-prepare-after-rotation`
- Threaded `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE` through:
  - `scripts/check-recall-first-apply-readiness.mjs`
  - `scripts/check-recall-first-apply-status.mjs`
  - `scripts/recall-first-apply-ready-or-refresh.sh`
  - `scripts/recall-first-apply-proof-refresh.sh`
  - `scripts/recall-first-capped-apply.sh`
- Updated `scripts/record-recall-key-rotation-evidence.mjs` so the recorder clears any ambient `RECALL_API_KEY` before invoking the env-file live auth probe. This ensures the private evidence file proves the ignored env-file credential path, not an unrelated shell environment value.
- Updated `npm run recall:first-apply:status` so `blocked_key_rotation_evidence` includes the acknowledgement-prefixed prepare wrapper command.

## Safety Contract

The prepare wrapper requires exact `BRAIN_RECALL_KEY_ROTATION_ACK` before doing anything beyond status inspection.

If key evidence is blocked only by stale or missing private evidence, the wrapper can record `data/private/recall-live-spikes/key-rotation-evidence.json` through the read-only live auth probe.

If proof is stale after key evidence passes, the wrapper delegates to the existing no-write ready-or-refresh wrapper.

The prepare wrapper never runs production apply, deploy, scheduler enablement, or checkpoint advancement.

## Validation

Focused validation passed:

```text
node --check scripts/prepare-recall-first-apply-after-rotation.mjs
node --check scripts/smoke-recall-first-apply-prepare-after-rotation.mjs
node --check scripts/check-recall-first-apply-readiness.mjs
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/record-recall-key-rotation-evidence.mjs
bash -n scripts/recall-first-apply-ready-or-refresh.sh
bash -n scripts/recall-first-apply-proof-refresh.sh
bash -n scripts/recall-first-capped-apply.sh
npm run smoke:recall-first-apply-prepare-after-rotation
npm run smoke:recall-key-rotation-evidence-record
npm run smoke:recall-first-apply-status
npm run smoke:recall-first-apply-ready-or-refresh
npm run smoke:recall-first-apply-proof-refresh
npm run smoke:recall-first-capped-apply
npm run recall:first-apply:status
```

Observed results:

- prepare smoke proved missing acknowledgement fails before private evidence creation;
- prepare smoke proved missing prepare confirmation fails before private evidence creation, even when the exact key rotation acknowledgement is present;
- prepare smoke proved stale env mtime plus exact acknowledgement records private evidence through a read-only auth probe;
- prepare smoke proved fresh private evidence can make first-apply status ready when proof is fresh;
- prepare smoke proved stale proof is refreshed through the existing no-write ready-or-refresh wrapper;
- recorder smoke still passes after forcing env-file credential use;
- existing first-apply status, ready-or-refresh, proof-refresh, and capped-apply smokes still pass after evidence-file path plumbing;
- real `npm run recall:first-apply:status` still reports `blocked_key_rotation_evidence` because `data/private/recall-live-spikes/key-rotation-evidence.json` does not exist and the current private env-file mtime predates the rotation checkpoint.

## Next Gate

After the Recall API key is rotated outside chat and stored only in `data/private/recall-live-spikes/recall.env`, run:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 \
npm run recall:first-apply:prepare-after-rotation
```

Then rerun:

```text
npm run recall:first-apply:status
npm run check:recall-first-apply-readiness
```

No production apply, production deploy, scheduler enablement, checkpoint advancement, staging, commit, or push was performed.
