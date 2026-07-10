# Recall Key Rotation Private Evidence Record Workflow Execution Report

Created: 2026-06-25 00:27 IST
Owner: Codex
Status: Done for offline scope; real first apply remains blocked until fresh private evidence is recorded after actual key rotation
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Fix the local blocker where the first-write path could not progress to proof refresh because the key-rotation evidence gate only accepted the private env file modification time. That was fail-closed, but brittle: if the key is rotated outside chat and the private env file metadata does not clearly prove the rotation moment, the system should offer a stronger no-secret evidence workflow instead of requiring a live write path to be attempted.

## Change Summary

- Added `scripts/record-recall-key-rotation-evidence.mjs`.
- Added `scripts/smoke-recall-key-rotation-evidence-record.mjs`.
- Added package scripts:
  - `npm run recall:key-rotation-evidence:record`
  - `npm run smoke:recall-key-rotation-evidence-record`
- Extended `scripts/check-recall-key-rotation-evidence.mjs` so `npm run check:recall-key-rotation-evidence` accepts either:
  - a private Recall env file updated after the rotation checkpoint, or
  - a fresh ignored, untracked, owner-only private evidence file at `data/private/recall-live-spikes/key-rotation-evidence.json`.
- Extended `scripts/smoke-recall-key-rotation-evidence.mjs` to prove fresh private evidence can satisfy the gate when the env-file mtime is stale, and stale private evidence still fails.
- Updated `scripts/check-recall-first-apply-status.mjs` so `npm run recall:first-apply:status` names the private evidence recorder command as the next safe option when key evidence is blocked.

## Private Evidence Contract

The recorder requires the exact acknowledgement:

```text
I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.
```

The recorder then runs the standalone read-only live auth probe through the ignored private env file and writes only metadata to the private evidence file. The evidence file records schema version, creation time, env file path, rotation checkpoint, acknowledgement acceptance, and read-only probe status such as `httpStatus: 200`. It does not store or print the Recall API key, private Recall card IDs, titles, source URLs, chunks, raw response body, database rows, dry-run payloads, apply payloads, backup payloads, or private manifest values.

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-key-rotation-evidence.mjs
node --check scripts/smoke-recall-key-rotation-evidence.mjs
node --check scripts/record-recall-key-rotation-evidence.mjs
node --check scripts/smoke-recall-key-rotation-evidence-record.mjs
npm run smoke:recall-key-rotation-evidence
npm run smoke:recall-key-rotation-evidence-record
npm run smoke:recall-first-apply-status
npm run recall:first-apply:status
```

Observed results:

- `smoke:recall-key-rotation-evidence` proved stale private env mtime still fails without fresh evidence;
- `smoke:recall-key-rotation-evidence` proved fresh private env mtime passes;
- `smoke:recall-key-rotation-evidence` proved fresh private evidence passes when env mtime is stale;
- `smoke:recall-key-rotation-evidence` proved stale private evidence fails when env mtime is stale;
- `smoke:recall-key-rotation-evidence-record` proved the recorder refuses without the exact key rotation acknowledgement;
- `smoke:recall-key-rotation-evidence-record` proved the recorder runs a read-only auth probe;
- `smoke:recall-key-rotation-evidence-record` proved the recorder writes owner-only private evidence without storing key material;
- `smoke:recall-key-rotation-evidence-record` proved the key rotation evidence gate accepts the private evidence file when env mtime is stale;
- `smoke:recall-first-apply-status` proved first-apply status remains no-secret after the recorder command was added to blocked-key next commands;
- the real `npm run recall:first-apply:status` still reports `blocked_key_rotation_evidence`, now with `data/private/recall-live-spikes/key-rotation-evidence.json` shown as missing private evidence and `npm run recall:key-rotation-evidence:record` listed as the post-rotation recording command.

The real current state remains blocked, as expected:

```text
npm run check:recall-key-rotation-evidence
```

Current findings are `env_file_not_rotated_after_checkpoint` and `missing_key_rotation_evidence_file`. This is correct until the Recall API key is rotated outside chat and the private evidence recorder is run with the exact acknowledgement.

## Next Gate

After the key is rotated outside chat and stored only in the ignored private env file, record private evidence:

```bash
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." \
npm run recall:key-rotation-evidence:record
```

Then rerun:

```text
npm run check:recall-key-rotation-evidence
npm run recall:first-apply:status
```

No production apply, production deploy, scheduler enablement, checkpoint advancement, staging, commit, or push was performed.
