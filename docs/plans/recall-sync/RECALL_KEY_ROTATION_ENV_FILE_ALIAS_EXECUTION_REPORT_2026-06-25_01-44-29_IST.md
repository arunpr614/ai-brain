# Recall Key Rotation Env-File Alias Execution Report

Created: 2026-06-25 01:44 IST
Owner: Codex
Status: Done for offline scope; scheduler remains disabled
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Remove a production operability mismatch in the Recall scheduled/deploy key-rotation gates.

The core apply CLI uses `BRAIN_RECALL_KEY_ROTATION_ENV_FILE` and `--key-rotation-env-file` for the env file that stores the rotated Recall key. The scheduled wrapper and deploy override preflight still primarily referenced the older `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE` name for that same env-file role. That naming drift could make an operator set the clearer env-file variable and still get stopped by local or remote private gates before scheduled live work.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, database rows, dry-run payload, apply payload, or backup payload.

## Change Summary

| Area | File | Change |
|---|---|---|
| Scheduled wrapper | `scripts/recall-scheduled-apply.sh` | Added `key_rotation_env_file="${BRAIN_RECALL_KEY_ROTATION_ENV_FILE:-${BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE:-/etc/brain/.env}}"` and reused it for both the wrapper-level key evidence preflight and the core apply `--key-rotation-env-file` flag. |
| Deploy preflight | `scripts/deploy.sh` | The remote key-rotation preflight now prefers `BRAIN_RECALL_KEY_ROTATION_ENV_FILE`, keeps `BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE` as a fallback, and passes both names to the remote shell with the resolved env-file path. |
| Scheduler artifact check | `scripts/check-recall-scheduler-artifacts.mjs` | Added static assertions that scheduled/deploy paths prefer `BRAIN_RECALL_KEY_ROTATION_ENV_FILE` while preserving the legacy fallback. |
| Scheduled wrapper smoke | `scripts/smoke-recall-scheduled-wrapper.mjs` | The stale key-evidence negative case now uses `BRAIN_RECALL_KEY_ROTATION_ENV_FILE`, proving the new alias is honored before report directory creation or scheduled work. |

## Validation

Focused validation passed:

```text
bash -n scripts/recall-scheduled-apply.sh scripts/deploy.sh
node --check scripts/smoke-recall-scheduled-wrapper.mjs
node --check scripts/check-recall-scheduler-artifacts.mjs
npm run build:recall-cli
npm run smoke:recall-scheduler-wrapper
npm run check:recall-scheduler
npm run recall:first-apply:status
```

Observed real first-apply status remains `blocked_key_rotation_evidence` because the local private env file predates the required rotation checkpoint and the private key-rotation evidence file is absent. That is expected and preserves the first-write safety gate.

## Safety Notes

- No live Recall API call was made by this alias fix.
- No production dry-run, proof refresh, apply, deploy, scheduler enablement, staging, commit, push, pull request, or checkpoint advancement was performed.
- The change does not bypass key-rotation evidence. It only makes the scheduled/deploy env-file variable name match the core apply CLI while keeping the older fallback for existing runbooks.
