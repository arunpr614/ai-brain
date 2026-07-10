# Recall First-Apply Env-File Live Diagnostic Private Output Actual Run

Status: Read-only live Recall diagnostic passed and wrote private proof; first-write gates remain blocked
Date: 2026-06-25 05:21 IST
Owner: AI agent (Codex)
Scope: Recall daily sync / first-apply live-read diagnostic evidence

## Summary

The status-preserving env-file live diagnostic wrapper successfully ran one real read-only Recall `/cards` auth probe and wrote the sanitized diagnostic JSON to `data/private/recall-live-spikes/live-diagnostic-report.json` with owner-only mode `600`.

This closes the durable-evidence gap for the env-file diagnostic path. The live call ran, Recall authenticated the request, the private proof artifact exists, and first-write gates still stayed blocked.

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
| Probe endpoint | `GET /cards` |
| Probe window | `2100-01-01T00:00:00.000Z` to `2100-01-02T00:00:00.000Z` |
| HTTP status | `200` |
| Authenticated | `true` |
| Reachable | `true` |
| Duration | `693 ms` |
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
| Diagnostic output size | `6524 bytes` |
| Key material printed | `false` |

## Safety Verification

Post-run status still reports:

```text
status: blocked_key_rotation_evidence
failedChecks: key_rotation_evidence, dry_run_report_proof, backup_proof
proofRefreshAllowedNow: false
applyAllowedNow: false
```

Private artifact status after the run:

```text
data/private/recall-live-spikes/live-diagnostic-report.json 2026-06-25 05:21:22 IST 6524 bytes mode=600
```

The private diagnostic output was scanned for obvious secret-shaped values. The local scan reported:

```json
{
  "ok": true,
  "path": "data/private/recall-live-spikes/live-diagnostic-report.json",
  "bytes": 6524,
  "findings": []
}
```

## What This Proves

- The status-preserving env-file live diagnostic wrapper can make the real read-only Recall `/cards` call.
- The Recall API endpoint is reachable with the current ignored private local env file.
- The current local credential authenticates for the read-only `/cards` endpoint.
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
