# Recall First-Apply Live Diagnostic Actual Env-File Run

Status: Read-only live Recall diagnostic passed; first-write gates remain blocked
Date: 2026-06-25 04:58 IST
Owner: Codex
Scope: Recall daily sync / first-apply live-read diagnostic

## Summary

The status-preserving first-apply live diagnostic wrapper successfully ran one real read-only Recall `/cards` auth probe through the ignored private local Recall env file. This directly resolves the previous "live call did not run because local private gates stopped first" issue for the env-file diagnostic path: the local live-read gate was ready, the wrapper continued to the probe, and Recall returned HTTP 200.

This was not a proof refresh, first capped apply, deploy, scheduler enablement, checkpoint advancement, key rotation evidence recording, or prompt-output-file run.

## Command

```bash
npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api
```

## Sanitized Result

| Field | Value |
|---|---|
| Wrapper mode | `first_apply_live_read_diagnostic` |
| Status before probe | `blocked_key_rotation_evidence` |
| Failed first-write checks before probe | `key_rotation_evidence`, `dry_run_report_proof`, `backup_proof` |
| Local live-read gate | `ready_for_approved_live_spikes` |
| Probe endpoint | `GET /cards` |
| Probe window | `2100-01-01T00:00:00.000Z` to `2100-01-02T00:00:00.000Z` |
| HTTP status | `200` |
| Authenticated | `true` |
| Reachable | `true` |
| Duration | `729 ms` |
| Total count | `0` |
| Result count | `0` |
| Results array present | `true` |
| Env file loaded | `true` |
| Env file loaded key count | `2` |
| Env file path | `data/private/recall-live-spikes/recall.env` |
| Env file mode | `600` |
| Env file ignored | `true` |
| Env file tracked | `false` |
| Env file mtime after key-rotation checkpoint | `false` |
| Key material printed | `false` |

## Safety Verification

Post-run status still reports:

```text
status: blocked_key_rotation_evidence
keyRotationEvidenceOk: false
failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
proofRefreshAllowedNow: false
applyAllowedNow: false
```

Private artifact status after the run:

```text
data/private/recall-live-spikes/dry-run-report.json 2026-06-24 21:10:25 IST 730 bytes mode=600
data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite 2026-06-24 21:10:26 IST 495616 bytes mode=600
data/private/recall-live-spikes/key-rotation-evidence.json MISSING
data/private/recall-live-spikes/live-diagnostic-report.json MISSING
```

The missing `live-diagnostic-report.json` is expected because this run used the env-file wrapper, not the prompt wrapper with `--output-file`.

## What This Proves

- The status-preserving env-file live diagnostic wrapper can pass the local live-read gate and make the real read-only Recall `/cards` call.
- The Recall API endpoint is reachable with the current ignored private local env file.
- The current local credential authenticates for the read-only `/cards` endpoint.
- The wrapper preserves the first-write blocker state before and after the live-read diagnostic.

## What This Does Not Prove

- It does not prove the key has been rotated after chat exposure.
- It does not create or validate `data/private/recall-live-spikes/key-rotation-evidence.json`.
- It does not refresh stale dry-run or backup proof.
- It does not authorize first capped apply, production deploy, scheduler enablement, or checkpoint advancement.
- It does not produce the prompt wrapper's private `live-diagnostic-report.json` artifact.

## Next Step

For first-write progress, rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, then run:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
```

For a prompt-based read-only diagnostic with a durable private artifact, run the no-live guard first and then use a freshly rotated key typed locally:

```bash
npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test
npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```
