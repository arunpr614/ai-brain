# Recall First Apply Proof Refresh Wrapper Execution Report

Created: 2026-06-24 20:47 IST
Owner: Codex
Status: Done for offline scope; no production apply was run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Add a repeatable no-write command to refresh the private first capped apply proof chain when the dry-run proof or backup proof is stale or too close to expiry.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Change Summary

- Added `scripts/recall-first-apply-proof-refresh.sh`.
- Added `scripts/smoke-recall-first-apply-proof-refresh.mjs`.
- Added package scripts:
  - `npm run recall:first-apply:proof-refresh`
  - `npm run smoke:recall-first-apply-proof-refresh`

## Wrapper Contract

The proof-refresh wrapper is no-write with respect to AI Brain content:

- refuses unless `BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM=1`;
- runs `scripts/sync-recall.ts` in `--dry-run` mode only;
- writes the private redacted dry-run proof report;
- validates the dry-run proof with `PASS_APPLY_REVIEW_GATE`;
- creates/refreshes the private SQLite backup proof with `scripts/recall-first-apply-preflight.mjs`;
- forces backup proof permissions to `0600`;
- reruns `npm run check:recall-first-apply-readiness` with the same accepted live SPIKE proof, dry-run proof, backup proof, and minimum freshness floor;
- never passes `--apply`, never advances a checkpoint, and never enables deploy or scheduler.

## Real Refresh Command

Use only when the readiness gate says the private dry-run proof or backup proof is stale or below the minimum freshness floor:

```bash
BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM=1 \
npm run recall:first-apply:proof-refresh
```

After refresh, rerun:

```bash
npm run check:recall-first-apply-readiness
```

## Validation

Focused validation passed:

```text
bash -n scripts/recall-first-apply-proof-refresh.sh
node --check scripts/smoke-recall-first-apply-proof-refresh.mjs
npm run smoke:recall-first-apply-proof-refresh
```

Observed smoke coverage:

- refresh wrapper refuses without confirmation;
- fixture dry-run proof is written;
- backup proof is created with private permissions;
- dry-run report gate returns `PASS_APPLY_REVIEW_GATE`;
- first capped apply readiness gate returns `PASS_FIRST_CAPPED_APPLY_READINESS_GATE`;
- temporary artifacts are cleaned up.

## Current Production State

The real proof refresh was not run because the current first capped apply readiness gate still passes. No production apply, production deploy, or scheduler enablement was performed.
