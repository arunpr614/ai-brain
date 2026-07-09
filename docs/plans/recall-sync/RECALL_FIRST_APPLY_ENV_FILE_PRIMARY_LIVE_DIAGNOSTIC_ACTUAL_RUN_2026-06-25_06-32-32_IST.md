# Recall First-Apply Env-File Primary Live Diagnostic Actual Run

Status: Read-only live Recall diagnostic passed through the env-file primary status path; first-write gates remain blocked
Date: 2026-06-25 06:32 IST
Owner: AI agent (Codex)
Scope: Recall daily sync / first-apply live-read diagnostic evidence

## Summary

The first-apply status helper now recommends the private env-file diagnostic wrapper as `gateSummary.safeReadOnlyDiagnosticCommand` when the local live gate is ready. This run executed that env-file primary command and confirmed the live call reached Recall.

The wrapper made one real read-only Recall `/cards` request, wrote sanitized diagnostic JSON to `data/private/recall-live-spikes/live-diagnostic-report.json` with owner-only mode `600`, and preserved the first-write blocker state.

This was not a proof refresh, first capped apply, deploy, scheduler enablement, checkpoint advancement, key rotation evidence recording, or production write.

## Command

```bash
npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```

## Sanitized Result

| Field | Value |
|---|---|
| Wrapper mode | `first_apply_live_read_diagnostic` |
| Status before probe | `blocked_key_rotation_evidence` |
| Failed first-write checks before probe | `key_rotation_evidence`, `dry_run_report_proof`, `backup_proof` |
| Local live-read gate | `ready_for_approved_live_spikes` |
| Primary status command | `gateSummary.safeReadOnlyDiagnosticCommand` |
| Primary credential mode | `private_env_file` |
| Prompt fallback retained | `true` |
| Probe endpoint | `GET /cards` |
| Probe window | `2100-01-01T00:00:00.000Z` to `2100-01-02T00:00:00.000Z` |
| HTTP status | `200` |
| Authenticated | `true` |
| Reachable | `true` |
| Duration | `1187 ms` |
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
| Diagnostic output file | `data/private/recall-live-spikes/live-diagnostic-report.json` |
| Diagnostic output written | `true` |
| Diagnostic output mode | `600` |
| Diagnostic output size | `7288 bytes` |
| Diagnostic output mtime | `2026-06-25T01:01:51.705Z` |
| Key material printed | `false` |

## Safety Verification

`npm run check:recall-live-diagnostic-report -- --report data/private/recall-live-spikes/live-diagnostic-report.json` passed with:

```text
verdict: PASS_RECALL_LIVE_DIAGNOSTIC_REPORT
statusBeforeProbe: blocked_key_rotation_evidence
failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
diagnosticOutputFile.statMode: 600
diagnosticOutputFile.sizeBytes: 7288
liveAuthProbe.httpStatus: 200
liveAuthProbe.authenticated: true
liveAuthProbe.reachable: true
liveAuthProbe.totalCount: 0
liveAuthProbe.resultCount: 0
liveAuthProbe.envFileMtimeAfterCheckpoint: false
proofRefreshAllowedNow: false
applyAllowedNow: false
proofRefreshAllowedByThisProbe: false
applyAllowedByThisProbe: false
```

Post-run status still reports:

```text
status: blocked_key_rotation_evidence
failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
gateSummary.currentBlockingGate: key_rotation_evidence
gateSummary.safeNoWritePreviewCommand: npm run recall:first-apply:prepare-plan
gateSummary.safeReadOnlyDiagnosticCommand: npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
proofRefreshAllowedNow: false
applyAllowedNow: false
deployAllowedNow: false
schedulerAllowedNow: false
checkpointAllowedNow: false
```

## What This Proves

- The env-file primary diagnostic command shown by status reaches Recall.
- The live call no longer stops at the local private gates for this read-only diagnostic path.
- Recall authenticated the request for the read-only `/cards` endpoint.
- The wrapper writes a durable private diagnostic artifact under `data/private/recall-live-spikes/`.
- The artifact is owner-only mode `600`.
- The wrapper preserves the first-write blocker state before and after the live-read diagnostic.

## What This Does Not Prove

- It does not prove the key has been rotated after chat exposure.
- It does not create or validate `data/private/recall-live-spikes/key-rotation-evidence.json`.
- It does not refresh stale dry-run or backup proof.
- It does not authorize first capped apply, production deploy, scheduler enablement, or checkpoint advancement.
- It does not make `data/private/recall-live-spikes/live-diagnostic-report.json` a key-rotation, proof-freshness, write-approval, apply, deploy, scheduler, or checkpoint gate.

## Next Step

For first-write progress, rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, then run:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
```
