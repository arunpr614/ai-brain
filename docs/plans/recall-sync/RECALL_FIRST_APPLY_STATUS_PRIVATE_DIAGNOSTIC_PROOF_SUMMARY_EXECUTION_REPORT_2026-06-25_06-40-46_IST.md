# Recall First Apply Status Private Diagnostic Proof Summary Execution Report

| Field | Value |
|---|---|
| Date | 2026-06-25 06:40 IST |
| Status | Done for no-live status-helper scope; first-write remains blocked |
| Owner | Codex |
| Related tracker item | RDS-026b18k |
| Public safety | This document contains no Recall API key, private Recall titles, private source URLs, card IDs, card content, raw chunks, dry-run payloads, apply payloads, or database rows. |

## Problem

The current env-file primary read-only diagnostic had already reached Recall and written sanitized private proof, but `npm run recall:first-apply:status` still only listed the optional diagnostic command. That left the operational state ambiguous: future operators could see that the diagnostic was available, but not that the existing private report already passed the no-live artifact checker and reached Recall.

## Change

- `scripts/check-recall-first-apply-status.mjs` now runs the no-live private artifact validator for the configured diagnostic report:
  - `scripts/check-recall-live-diagnostic-report.mjs --report data/private/recall-live-spikes/live-diagnostic-report.json`
- `npm run recall:first-apply:status` now exposes `diagnostics.liveReadConnectivity.latestPrivateDiagnosticProof`.
- The field summarizes only no-secret metadata from the private diagnostic report:
  - checker verdict;
  - diagnostic mode;
  - pre-probe first-apply status;
  - failed local gate IDs;
  - private output path, size, mtime, and owner-only mode;
  - read-only Recall probe endpoint, method, HTTP status, authenticated/reachable booleans, and counts;
  - first-write safety booleans;
  - explicit `doesNotAuthorize` list for `key_rotation_evidence`, `proof_freshness`, `first_write_approval`, apply, deploy, scheduler, and checkpoint.
- `--live-diagnostic-report` / `--live-diagnostic-report-path` now controls the private report path used by status, so tests can use a disposable ignored private fixture without touching the real private proof.
- `readOnlyDiagnosticNextAction` now says when an existing private proof already passes no-live validation and reached Recall with HTTP `200`.

## Gate Behavior

This change does not weaken any first-write gate.

- `status` remains `blocked_key_rotation_evidence`.
- `proofRefreshAllowedNow` remains `false`.
- `applyAllowedNow` remains `false`.
- `deployAllowedNow` remains `false`.
- `schedulerAllowedNow` remains `false`.
- `checkpointAllowedNow` remains `false`.
- The private diagnostic proof remains diagnostic-only and does not satisfy key rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint movement.

## Validation Evidence

### Syntax

```text
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
```

Result: both passed.

### Focused Smoke

```text
npm run -s smoke:recall-first-apply-status
```

Result: passed. The smoke now verifies that status summarizes an existing private live diagnostic proof without rerunning a live call, and that the proof remains unable to authorize key evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint movement.

### Real Status Check

```text
npm run -s recall:first-apply:status
```

Relevant no-secret result summary:

```json
{
  "status": "blocked_key_rotation_evidence",
  "failedChecks": [
    "key_rotation_evidence",
    "dry_run_report_proof",
    "backup_proof"
  ],
  "latestPrivateDiagnosticProof": {
    "ok": true,
    "verdict": "PASS_RECALL_LIVE_DIAGNOSTIC_REPORT",
    "configuredReportPath": "data/private/recall-live-spikes/live-diagnostic-report.json",
    "mode": "first_apply_live_read_diagnostic",
    "statusBeforeProbe": "blocked_key_rotation_evidence",
    "diagnosticOutputFile": {
      "path": "data/private/recall-live-spikes/live-diagnostic-report.json",
      "written": true,
      "mode": "0600",
      "statMode": "600",
      "sizeBytes": 7288,
      "mtimeIso": "2026-06-25T01:01:51.705Z"
    },
    "liveAuthProbe": {
      "ok": true,
      "endpoint": "/cards",
      "method": "GET",
      "httpStatus": 200,
      "authenticated": true,
      "reachable": true,
      "totalCount": 0,
      "resultCount": 0,
      "envFileMtimeAfterCheckpoint": false
    },
    "firstWriteSafety": {
      "proofRefreshAllowedNow": false,
      "applyAllowedNow": false,
      "proofRefreshAllowedByThisProbe": false,
      "applyAllowedByThisProbe": false
    }
  }
}
```

## Non-Actions

- No new live Recall API call was made for this change.
- No private proof was refreshed.
- No first capped apply was run.
- No production deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- The chat-pasted Recall API key was not used.

## Next Gate

The next real first-write gate remains unchanged: rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, establish key rotation evidence, refresh stale private proof without apply if needed, then use the no-secret first capped apply approval packet and guarded wrapper only after exact approval.
