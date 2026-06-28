# Recall First Apply Key Rotation Evidence Gate Execution Report

Created: 2026-06-24 21:33 IST
Owner: Codex
Status: Done for offline scope; real apply remains blocked until the private env file is updated after key rotation
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Make the first capped apply wrapper verify local evidence that the Recall API key was rotated after it was pasted into chat.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, apply report payload, or database rows.

## Change Summary

- Added `scripts/check-recall-key-rotation-evidence.mjs`.
- Added `scripts/smoke-recall-key-rotation-evidence.mjs`.
- Added package scripts:
  - `npm run check:recall-key-rotation-evidence`
  - `npm run smoke:recall-key-rotation-evidence`
- Updated `scripts/recall-first-capped-apply.sh` so real non-fixture first capped apply runs the key-rotation evidence gate before readiness, before any live Recall call, and before any DB write.
- Updated `scripts/smoke-recall-first-capped-apply.mjs` so the wrapper smoke proves stale local key-rotation evidence stops before readiness/apply and does not print env-file contents.
- Updated `scripts/recall-first-apply-ready-or-refresh.sh` so real no-write proof maintenance also stops on failed local key-rotation evidence before readiness or proof refresh.
- Updated the first capped apply approval packet, approval consistency checker, current-state audit, project tracker, and current public-doc privacy scan.

## Metadata Contract

The checker inspects only safe local file metadata for `data/private/recall-live-spikes/recall.env`:

- file exists;
- file is under `data/private/recall-live-spikes/`;
- file is ignored by git;
- file is not tracked by git;
- file is owner-only readable, for example mode `0600`;
- file modification time is after the key-rotation checkpoint `2026-06-24T15:54:17.000Z`.

The checker never reads or prints the Recall API key.

## Validation

Focused validation passed:

```text
node --check scripts/check-recall-key-rotation-evidence.mjs
node --check scripts/smoke-recall-key-rotation-evidence.mjs
bash -n scripts/recall-first-capped-apply.sh
node --check scripts/smoke-recall-first-capped-apply.mjs
npm run smoke:recall-key-rotation-evidence
npm run smoke:recall-first-capped-apply
npm run smoke:recall-first-apply-ready-or-refresh
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
npm run check:recall-first-apply-readiness
git diff --check
```

The readiness output now names all remaining first-write gates: explicit Arun approval, key rotation acknowledgement, and local key rotation evidence.

The real local evidence check was also run and failed closed as expected because the current ignored private env file still predates the rotation checkpoint:

```text
npm run check:recall-key-rotation-evidence
```

Observed blocker:

```text
env_file_not_rotated_after_checkpoint
```

The real no-write ready-or-refresh command now fails closed on the same blocker before checking readiness or attempting proof refresh:

```text
npm run recall:first-apply:ready-or-refresh
```

This is the intended current stop condition. It means the first capped apply cannot run until the Recall API key is rotated and `data/private/recall-live-spikes/recall.env` is updated after that rotation.

## Current Production State

No production apply, production deploy, scheduler enablement, checkpoint advancement, commit, push, or pull request was performed.

The first capped apply now requires all of the following:

1. private dry-run and backup proof are fresh;
2. `npm run check:recall-key-rotation-evidence` returns `PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE`;
3. Arun provides the exact first capped write approval text;
4. Arun provides the exact `BRAIN_RECALL_KEY_ROTATION_ACK` text;
5. the guarded wrapper succeeds and the private post-apply report passes review.
