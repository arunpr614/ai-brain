# Recall Live Diagnostic Local Status Failure Bypass Execution Report

Created: 2026-06-27 00:23 IST
Owner: Codex
Workstream: Recall -> AI Brain daily snapshot import
Status: Implemented and smoke-tested offline; no real Recall API call was made by this change

## Problem

The read-only live diagnostic already had a safe prompt/ephemeral credential path for cases where the local private Recall env file is stale, missing, or intentionally not trusted. However, the lower-level diagnostic wrapper still stopped immediately when the local first-apply status helper exited nonzero before producing a usable status summary.

That meant an explicitly confirmed, read-only probe with env-file loading disabled could still fail before the live call if a local private/status gate failed first.

## Fix

Updated `scripts/run-recall-first-apply-live-diagnostic.mjs` so a local status-helper failure is bypassable only when all of these are true:

1. `--confirm-live-api` or `BRAIN_RECALL_CONFIRM_LIVE_API=1` is present.
2. `--probe-no-env-file` is present.
3. The named `--probe-api-key-env` variable contains a terminal-only credential.
4. The operation remains the read-only `/cards` auth probe.

When that path is used, the wrapper now:

- records `statusHelper.failureBypassedForReadOnlyProbe: true`;
- sets `statusBeforeProbe.status: local_private_gate_status_failed`;
- reports `localPrivateGateHandling.statusHelperSucceeded: false`;
- preserves `firstWriteSafety.blockedBeforeProofRefreshOrApply: true`;
- keeps `proofRefreshAllowedNow: false` and `applyAllowedNow: false`;
- performs no proof refresh, apply, deploy, scheduler enablement, or checkpoint movement.

The normal env-file path is unchanged: if no env-file-disabled credential is available, a local status-helper failure still stops before the probe.

## Validator Update

Updated `scripts/check-recall-live-diagnostic-report.mjs` so sanitized private diagnostic artifacts can validate the new diagnostic-only status:

- `local_private_gate_status_failed`

This status is accepted only as a status-before-probe value. It does not authorize key-rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint work.

## Regression Coverage

Updated `scripts/smoke-recall-first-apply-live-diagnostic.mjs` with an injected status-helper failure:

- a temporary `NODE_OPTIONS --require` hook exits only when the child process is `check-recall-first-apply-status.mjs`;
- the read-only diagnostic runs with `--probe-no-env-file` and a named ephemeral credential;
- the wrapper still makes exactly one read-only `/cards` request to the local test server;
- output records the bypass as diagnostic-only;
- the private diagnostic report checker accepts the fallback output status as diagnostic-only evidence;
- output contains no Recall API key, bearer token, private title, private source URL, chunk, or raw response body.

## Verification

Passed:

```bash
node --check scripts/run-recall-first-apply-live-diagnostic.mjs
node --check scripts/smoke-recall-first-apply-live-diagnostic.mjs
node --check scripts/check-recall-live-diagnostic-report.mjs
npm run -s smoke:recall-first-apply-live-diagnostic
```

The smoke output includes:

```text
first-apply live diagnostic still probes when the local status helper fails but env-file loading is disabled and an ephemeral credential is present
first-apply live diagnostic report checker accepts the status-helper-failed fallback as diagnostic-only evidence
```

## Safety Notes

- No real Recall API call was made by this implementation pass.
- No Recall API key was printed or written.
- No AI Brain database write was made.
- No first capped apply, second manual verification apply, production deploy, scheduler enablement, or checkpoint movement occurred.
- This fix is diagnostic-only. Production write paths still require the existing key-rotation evidence, dry-run proof, backup proof, exact approvals, fidelity flags, and post-apply review gates.

## Next Gate

The whole-goal gate remains unchanged:

1. Get explicit approval for the second manual production verification run.
2. Run the second manual verification apply wrapper.
3. Validate its private apply report.
4. Only after two clean manual run reports exist, request explicit scheduler enablement approval.
