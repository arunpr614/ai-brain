# Recall Key Rotation Evidence Recorder Probe Context Execution Report

Created: 2026-06-25 02:09 IST
Owner: Codex
Status: Done for offline scope; no live Recall API call was made in this change

No live Recall API call was made in this change.

## Purpose

Preserve the read-only live auth probe's first-write safety context inside the ignored private key-rotation evidence file.

The optional live auth probe now emits diagnostic-only `firstWriteSafety` fields. The private evidence recorder uses that probe before writing `data/private/recall-live-spikes/key-rotation-evidence.json`, so the recorded metadata should also preserve that the probe did not run the key-evidence gate and did not authorize proof refresh or apply.

## Files Changed

| File | Change |
|---|---|
| `scripts/record-recall-key-rotation-evidence.mjs` | Stores a no-secret `liveAuthProbe.firstWriteSafety` summary in the private evidence file. |
| `scripts/smoke-recall-key-rotation-evidence-record.mjs` | Asserts private evidence records stale env-file context and still records `proofRefreshAllowedByThisProbe: false` and `applyAllowedByThisProbe: false`. |

## Evidence Shape

The private evidence file now stores only no-secret probe context:

```json
{
  "liveAuthProbe": {
    "firstWriteSafety": {
      "purpose": "diagnostic_context_only",
      "keyRotationEvidenceGateRun": false,
      "keyRotatedAfterIso": "2026-06-24T15:54:17.000Z",
      "envFilePath": "data/private/recall-live-spikes/recall.env",
      "envFileLoaded": true,
      "envFileMtimeIso": "<private-env-file-mtime>",
      "envFileMtimeAfterCheckpoint": false,
      "proofRefreshAllowedByThisProbe": false,
      "applyAllowedByThisProbe": false
    }
  }
}
```

This metadata does not store a Recall API key, private Recall card IDs, titles, source URLs, chunks, raw response bodies, dry-run payloads, apply payloads, backup payloads, or database rows.

## Validation

```text
node --check scripts/record-recall-key-rotation-evidence.mjs
node --check scripts/smoke-recall-key-rotation-evidence-record.mjs
node --check scripts/prepare-recall-first-apply-after-rotation.mjs
node --check scripts/smoke-recall-first-apply-prepare-after-rotation.mjs
npm run smoke:recall-key-rotation-evidence-record
npm run smoke:recall-first-apply-prepare-after-rotation
```

The recorder smoke now proves:

- recorder refuses without exact key rotation acknowledgement;
- recorder runs the read-only live auth probe;
- recorder preserves probe first-write safety context without unlocking writes;
- recorder writes owner-only private evidence without storing key material;
- key rotation evidence gate accepts a private evidence file when env-file mtime is stale;
- temporary private smoke files are cleaned up.

## Current Real Gate State

`npm run recall:first-apply:status` still reports `blocked_key_rotation_evidence` until the Recall API key is rotated outside chat and the ignored private env file or private evidence file proves that rotation.

This change does not run proof refresh, first capped apply, deploy, scheduler enablement, staging, commit, push, pull request, or checkpoint advancement.
