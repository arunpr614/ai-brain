# Recall First Capped Apply Backup Proof

Created: 2026-06-24 19:19 IST
Owner: Codex
Status: Backup and restore proof passed; first capped apply remains blocked pending explicit write approval
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Record the non-mutating backup proof required before the first capped Recall production apply.

This report contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Proof Command

The proof created a WAL-safe SQLite backup from the local AI Brain database, verified the backup with `PRAGMA integrity_check`, copied the backup to a temporary restore path, verified the temporary restore copy, and removed the temporary restore copy.

```text
node scripts/recall-first-apply-preflight.mjs --db-path data/brain.sqlite --backup-dir data/private/recall-live-spikes/backups --json
```

## Backup Proof Output

Aggregate result:

- mode: `recall_first_apply_preflight`;
- backup relative path: `data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite`;
- backup size: 495,616 bytes;
- backup modified time: `2026-06-24T13:49:27.494Z`;
- backup integrity: `ok`;
- temporary restore integrity: `ok`;
- proof result: `ok`.

The backup file and SQLite sidecar files were tightened to owner-only permissions after generation.

## Current Production State

No production apply, production deploy, or scheduler enablement was performed.

The next gate is explicit first capped apply approval. The apply command must still require accepted live-spike proof, reviewed dry-run proof, this fresh backup proof, capped write limits, explicit Recall live API confirmation, and explicit apply confirmation.
