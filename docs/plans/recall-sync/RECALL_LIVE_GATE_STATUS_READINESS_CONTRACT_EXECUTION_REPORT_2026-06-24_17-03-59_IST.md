# Recall Live Gate Status Readiness Contract Execution Report

Created: 2026-06-24 17:03 IST
Owner: Codex
Status: Done for offline scope; live API still blocked pending approval and private controlled samples

## Purpose

Clarify the machine-readable contract for `npm run recall:live-gate:status`.

Before this change, the command could return `ok: true` when it was only confirming private evidence safety, even if the live gate status was still `needs_manifest_fix` or another not-ready state. That was safe for humans reading `status`, but ambiguous for automated consumers.

## Change

- `scripts/check-recall-live-gate-status.mjs` now sets JSON `ok` to true only when status is `ready_for_approved_live_spikes`.
- The output now includes `readyForApprovedLiveSpikes` as the explicit readiness boolean.
- The output now includes `privateEvidenceOk` to preserve the private-ignore guard signal separately from live readiness.
- Command help documents that the process exits successfully as a status report, while JSON `ok` is the live-readiness result.
- `scripts/smoke-recall-live-gate-status.mjs` now asserts `ok: false` for missing/unsafe/insecure/invalid/not-confirmed states and `ok: true` only for the fully ready state.

## Documentation Updates

- `RECALL_LIVE_API_APPROVAL_CHECKLIST_2026-06-24_14-00-43_IST.md` now explains the `ok`, `readyForApprovedLiveSpikes`, and `privateEvidenceOk` distinction.
- `RECALL_LIVE_API_SPIKE_OPERATING_PACKET_2026-06-24_10-23-45_IST.md` now documents the status contract for future live operators.
- `RECALL_DAILY_SNAPSHOT_IMPORT_PRODUCTION_RUNBOOK_2026-06-24_10-47-45_IST.md` now includes the readiness contract in the expected pre-live outputs.

## Validation

Passed:

```text
node --check scripts/check-recall-live-gate-status.mjs
node --check scripts/smoke-recall-live-gate-status.mjs
npm run smoke:recall-live-gate-status
npm run check:recall-approval-packet
npm run check:recall-prelive
npm run lint
npm run typecheck
npm test
git diff --check
```

The smoke checked:

- missing manifest next action;
- unsafe manifest location gate;
- tracked manifest path gate;
- insecure manifest permission gate;
- valid manifest summary;
- public report exposure manifest rejection;
- unsafe env-file location gate;
- tracked env-file path gate;
- insecure env-file permission gate;
- secure env-file permission summary;
- API-key approval gate;
- existing ignored env-template next action;
- explicit live API confirmation gate;
- ready status with env key and confirmation present;
- `ok` is true only for ready-for-approved-live-spikes status;
- API key value is not printed;
- temp manifest/env cleanup.

Current live gate status with the local placeholder manifest:

```text
npm run recall:live-gate:status -- --manifest data/private/recall-live-spikes/controlled-samples.json
```

Observed safe status:

```text
ok: false
status: needs_manifest_fix
readyForApprovedLiveSpikes: false
privateEvidenceOk: true
manifest.fileSafety.safeForPrivateValues: true
manifest.fileSafety.mode: 600
credential.recallEnvFile.safeForSecretHandling: true
credential.recallEnvFile.mode: 600
```

No live Recall API call was made. No API key, private Recall title, private source URL, card content, or raw Recall payload was printed.

Full application tests passed with 689 pass, 0 fail.

## Remaining Gate

This change does not unblock live SPIKE-013/SPIKE-014. The controlled sample manifest still contains placeholders and the live API key/use remains unapproved.
