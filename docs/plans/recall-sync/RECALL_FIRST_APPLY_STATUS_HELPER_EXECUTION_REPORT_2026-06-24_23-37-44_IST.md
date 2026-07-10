# Recall First Apply Status Helper Execution Report

Created: 2026-06-24 23:37 IST
Owner: Codex
Status: Done for offline scope; real apply and proof refresh remain blocked until key rotation evidence passes
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Add a single no-secret operator status command for the first capped Recall apply lane.

Before this change, operators had to run multiple commands and infer the next safe step from separate key-evidence, readiness, and proof-refresh failures. The new helper does not refresh proof, does not call live Recall APIs, does not apply, and does not advance any checkpoint. It only runs existing local gates and emits an ordered status plus next safe commands.

## What Changed

| Area | File | Change |
|---|---|---|
| Status helper | `scripts/check-recall-first-apply-status.mjs` | Runs local key rotation evidence and first-apply readiness, then emits a no-secret status: `blocked_key_rotation_evidence`, `needs_no_write_proof_refresh`, `ready_for_first_capped_apply_approval`, or `blocked_first_apply_readiness`. |
| Status smoke | `scripts/smoke-recall-first-apply-status.mjs` | Proves stale key evidence, near-expiry proof after fresh key evidence, ready-for-approval, `--require-ready`, and no secret-shaped output. |
| Package scripts | `package.json` | Adds `npm run recall:first-apply:status` and `npm run smoke:recall-first-apply-status`. |

## Status Semantics

| Status | Meaning | Next command |
|---|---|---|
| `blocked_key_rotation_evidence` | The ignored private env-file evidence predates the rotation checkpoint or fails file-safety checks, and no fresh private evidence file exists. | Rotate the Recall API key outside chat, update only the ignored private env file, then run `BRAIN_RECALL_KEY_ROTATION_ACK="<exact acknowledgement>" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`. This can record private evidence and refresh stale proof without apply. |
| `needs_no_write_proof_refresh` | Key evidence passed, but dry-run or backup proof is stale, missing, future-dated, or below the freshness floor. | `npm run recall:first-apply:refresh-if-needed` |
| `ready_for_first_capped_apply_approval` | Machine readiness passed. | Review `RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md`, rerun readiness, then use the guarded first capped apply wrapper only with exact Arun approval and key rotation acknowledgement. |
| `blocked_first_apply_readiness` | A non-refreshable readiness gate failed. | Resolve the named gate, then rerun status. |

## Validation

Passed:

```text
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
npm run smoke:recall-first-apply-status
npm run recall:first-apply:status
```

The real status command currently returns:

```text
status: blocked_key_rotation_evidence
failed readiness checks: key_rotation_evidence, dry_run_report_proof, backup_proof
next commands: npm run check:recall-key-rotation-evidence; BRAIN_RECALL_KEY_ROTATION_ACK="<exact acknowledgement>" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation; BRAIN_RECALL_KEY_ROTATION_ACK="<exact acknowledgement>" npm run recall:key-rotation-evidence:record; npm run recall:first-apply:status
```

This is expected. The helper shows stale proof as secondary context, but still prioritizes key rotation evidence before proof refresh.

The ready-state smoke also proves the helper does not emit a bare apply command. When status becomes `ready_for_first_capped_apply_approval`, next commands include the approval packet path, `npm run check:recall-first-apply-readiness`, and the guarded `npm run recall:first-capped-apply` command only with `BRAIN_RECALL_FIRST_APPLY_APPROVAL` and `BRAIN_RECALL_KEY_ROTATION_ACK` present.

## Privacy

- This document contains no Recall API key.
- No private Recall card IDs, titles, source URLs, raw chunks, private dry-run payloads, apply payloads, or database rows are included.
- The helper summarizes safe metadata and drops child-command previews so private report payloads are not copied into status output.

## Current Blocker

The local private Recall env file still needs to be updated only after the Recall API key is rotated outside chat, or a fresh ignored owner-only private evidence file must be recorded after rotation. Until that happens:

1. `npm run check:recall-key-rotation-evidence` fails closed.
2. `npm run recall:first-apply:status` reports `blocked_key_rotation_evidence`.
3. `npm run check:recall-first-apply-readiness` reports key evidence plus stale proof blockers.
4. `npm run recall:first-apply:proof-refresh` refuses before live Recall work.
5. `npm run recall:first-apply:ready-or-refresh` refuses before proof refresh.

## Next Gate

After key rotation outside chat, update only `data/private/recall-live-spikes/recall.env`, then run the preferred no-write prepare wrapper:

```text
npm run check:recall-key-rotation-evidence
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:key-rotation-evidence:record
npm run recall:first-apply:status
```

Use the recorder directly only after the real key is rotated and the ignored private env file contains the rotated key; it writes `data/private/recall-live-spikes/key-rotation-evidence.json` without storing key material. The prepare wrapper invokes that recorder only when the key-evidence blocker is recordable and `BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1` is set.

If status moves to `needs_no_write_proof_refresh`, run `BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." npm run recall:first-apply:refresh-if-needed` before any first capped apply approval window. This is an alias for the no-write ready-or-refresh wrapper with refresh confirmation set; it still stops on failed key evidence, still requires exact key rotation acknowledgement before live proof refresh, and never passes `--apply`.
