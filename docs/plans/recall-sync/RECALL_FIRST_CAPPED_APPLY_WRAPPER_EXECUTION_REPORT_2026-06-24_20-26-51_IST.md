# Recall First Capped Apply Wrapper Execution Report

Created: 2026-06-24 20:26 IST
Owner: Codex
Status: Done for offline scope; no live apply was run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Add one guarded command for the first capped Recall -> AI Brain apply so the write path cannot bypass the current proof chain by accident.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Change Summary

- Added `scripts/recall-first-capped-apply.sh`.
- Added `scripts/smoke-recall-first-capped-apply.mjs`.
- Added package scripts:
  - `npm run recall:first-capped-apply`
  - `npm run smoke:recall-first-capped-apply`
- Updated the first capped apply approval packet to make the wrapper the preferred local command.

## Wrapper Contract

The wrapper refuses to start unless all of these are true:

- `BRAIN_RECALL_FIRST_APPLY_APPROVAL` exactly matches the first capped apply approval sentence in the approval packet;
- `BRAIN_RECALL_SYNC_ENABLED=1`;
- `BRAIN_RECALL_KEY_ROTATION_ACK` exactly confirms the apply key was rotated after chat exposure and stored only in the ignored private Recall env file;
- local key-rotation evidence passes before any live Recall call or DB write;
- the consolidated no-write readiness gate returns `PASS_FIRST_CAPPED_APPLY_READINESS_GATE`;
- dry-run and backup proof have at least the configured minimum freshness remaining;
- live SPIKE proof, dry-run proof, backup proof, cap, date-window, and accepted fidelity-risk arguments are present;
- the post-apply report gate returns `PASS_POST_APPLY_REVIEW_GATE` after the apply command exits.

The wrapper still supports a fixture-only smoke path using temporary files and a temporary database. That path is explicitly separated behind `BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS=1` and does not call Recall or touch the real AI Brain database.

## Validation

Focused validation passed:

```text
bash -n scripts/recall-first-capped-apply.sh
node --check scripts/smoke-recall-first-capped-apply.mjs
npm run smoke:recall-first-capped-apply
```

Observed smoke coverage:

- wrapper refuses without exact approval text;
- wrapper refuses without exact key rotation acknowledgement;
- wrapper refuses stale local key rotation evidence before readiness or apply;
- wrapper passes key rotation evidence flags into the core apply CLI on the real path;
- wrapper runs the first-apply readiness gate before apply;
- wrapper inherits the readiness gate's minimum freshness floor before apply;
- wrapper runs a fixture-backed capped apply against a temporary database;
- wrapper runs the post-apply report gate;
- temporary artifacts are cleaned up.

## Current Production State

No production apply, production deploy, or scheduler enablement was performed.

The first capped apply remains blocked until Arun explicitly approves the write step with the exact approval sentence from `docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md`. Immediately before any real write, rerun `npm run check:recall-first-apply-readiness` or let the wrapper rerun the same gate.
