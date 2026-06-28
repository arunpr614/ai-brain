# Recall First Apply Readiness Key Evidence Consolidation Execution Report

Created: 2026-06-24 23:23 IST
Owner: Codex
Status: Done for offline scope; real apply and live proof refresh remain blocked until key rotation evidence passes
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Make the first-apply readiness path report the current key-rotation blocker directly, instead of leaving it visible only through the guarded wrappers.

The live call still must not run with the exposed Recall key. This change does not bypass that safety rule. It makes the local blocker easier to diagnose and ensures the direct no-write proof-refresh command also refuses stale key evidence before any live Recall work.

## What Changed

| Area | File | Change |
|---|---|---|
| First-apply readiness | `scripts/check-recall-first-apply-readiness.mjs` | Adds a `key_rotation_evidence` checked gate by default, using `scripts/check-recall-key-rotation-evidence.mjs` and the same rotation checkpoint. |
| Ready-or-refresh wrapper | `scripts/recall-first-apply-ready-or-refresh.sh` | Passes `--key-rotated-after` into readiness and keeps the existing real-path precheck that stops before readiness or refresh. |
| Direct proof refresh wrapper | `scripts/recall-first-apply-proof-refresh.sh` | Checks local key rotation evidence before non-fixture live dry-run refresh, preventing direct proof refresh from running live Recall reads with stale key evidence. |
| First capped apply wrapper | `scripts/recall-first-capped-apply.sh` | Passes the key-rotation checkpoint into readiness and keeps fixture smoke paths isolated with the explicit smoke-only skip. |
| Readiness smoke | `scripts/smoke-recall-first-apply-readiness.mjs` | Proves stale key evidence fails readiness without printing env-file contents. |
| Proof-refresh smoke | `scripts/smoke-recall-first-apply-proof-refresh.mjs` | Proves direct proof refresh with confirmation stops on stale key evidence before creating dry-run or backup proof. |

## Validation

Passed:

```text
node --check scripts/check-recall-first-apply-readiness.mjs
bash -n scripts/recall-first-apply-proof-refresh.sh scripts/recall-first-apply-ready-or-refresh.sh
node --check scripts/smoke-recall-first-apply-readiness.mjs
node --check scripts/smoke-recall-first-apply-proof-refresh.mjs
npm run smoke:recall-first-apply-readiness
npm run smoke:recall-first-apply-proof-refresh
npm run smoke:recall-first-apply-ready-or-refresh
npm run smoke:recall-first-capped-apply
```

Current real local status:

```text
npm run check:recall-first-apply-readiness
```

Result: expected fail-closed `DO_NOT_APPLY`. The checked list now includes `key_rotation_evidence` as failed because the ignored private env-file evidence predates the rotation checkpoint. The same run also reports stale dry-run and backup proof.

```text
BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM=1 npm run recall:first-apply:proof-refresh
```

Result: expected fail-closed before live Recall work. The wrapper stops on `env_file_not_rotated_after_checkpoint` and does not create a new dry-run report or backup.

## Privacy

- This document contains no Recall API key.
- No private Recall card IDs, titles, source URLs, raw chunks, private dry-run payloads, apply payloads, or database rows are included.
- The changed scripts only emit file metadata and redacted gate summaries.

## Current Blocker

The local private Recall env file must be updated only after the Recall API key is rotated outside chat. Until then:

1. `npm run check:recall-key-rotation-evidence` fails closed.
2. `npm run check:recall-first-apply-readiness` reports both key-evidence and stale-proof blockers.
3. `npm run recall:first-apply:proof-refresh` refuses to run live Recall refresh.
4. `npm run recall:first-apply:ready-or-refresh` refuses to refresh proof.
5. `npm run recall:first-capped-apply` remains blocked.

## Next Gate

After key rotation outside chat, update only the ignored private Recall env file, rerun `npm run check:recall-key-rotation-evidence`, then use `BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1 npm run recall:first-apply:ready-or-refresh` to refresh stale proof before any first capped apply approval window.
