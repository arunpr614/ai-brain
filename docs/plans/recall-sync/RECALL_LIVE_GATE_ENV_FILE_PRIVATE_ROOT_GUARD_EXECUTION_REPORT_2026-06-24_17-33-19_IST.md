# Recall Live Gate Env-File Private-Root Guard Execution Report

Created: 2026-06-24 17:33 IST
Owner: Codex
Status: Done for offline scope; live API still blocked pending approval and private controlled samples

## Purpose

Tighten the live-gate status command so an existing Recall env file is not considered safe merely because it is ignored and untracked. The approved local env-file path is `data/private/recall-live-spikes/recall.env`; any ignored env file outside `data/private/recall-live-spikes/` should still block live readiness.

## Change

- Updated `scripts/check-recall-live-gate-status.mjs` so `credential.recallEnvFile.safeForSecretHandling` now requires:
  - `underPrivateRecallEvidencePath: true`;
  - `ignored: true`;
  - `tracked: false`.
- Updated `scripts/smoke-recall-live-gate-status.mjs` with an ignored-but-wrong-root env file case under `data/`.
- Updated the no-secret approval checklist, operating packet, production runbook, completion audit, project tracker, and approval-packet checker so the private-root rule is explicit and machine-checked.

## Validation

Passed:

```text
node --check scripts/check-recall-live-gate-status.mjs
node --check scripts/smoke-recall-live-gate-status.mjs
npm run smoke:recall-live-gate-status
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

The smoke now verifies:

- unsafe unignored env file path blocks readiness;
- ignored env file outside `data/private/recall-live-spikes/` blocks readiness;
- tracked env file path blocks readiness;
- insecure env file permissions block readiness;
- secure env file under the private Recall evidence path can advance to the approval/API-key gate;
- API-key values are not printed;
- temporary manifest/env files are cleaned up.

Current live-gate status remains correctly blocked:

```text
status: needs_manifest_fix
ok: false
readyForApprovedLiveSpikes: false
privateEvidenceOk: true
credential.recallEnvFile.underPrivateRecallEvidencePath: true
credential.recallEnvFile.safeForSecretHandling: true
```

No live Recall API call was made. No API key, private Recall title, private source URL, card content, or raw Recall payload was printed.

## Remaining Gate

This hardens local secret-file handling only. Live SPIKE-013/SPIKE-014 still require approved API-key handling, populated private controlled samples, and a passing manifest-enforced pre-live gate.
