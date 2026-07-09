# Recall First Apply Ready-Or-Refresh Wrapper Execution Report

Created: 2026-06-24 21:02 IST
Owner: Codex
Status: Done for offline scope; no production apply was run
Project folder: `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2`

## Purpose

Add a single no-write command that checks local key rotation evidence and the first capped apply proof chain, then refreshes private proof only when the existing readiness gate reports refreshable proof freshness or proof-existence failures.

This document contains no Recall API key, private Recall card IDs, private titles, private source URLs, raw chunks, card content, or database rows.

## Change Summary

- Added `scripts/recall-first-apply-ready-or-refresh.sh`.
- Added `scripts/smoke-recall-first-apply-ready-or-refresh.mjs`.
- Added package scripts:
  - `npm run recall:first-apply:ready-or-refresh`
  - `npm run smoke:recall-first-apply-ready-or-refresh`
- Updated the wrapper after the key-rotation evidence gate was added so the real path stops on failed local key evidence before readiness or proof refresh.

## Wrapper Contract

The ready-or-refresh wrapper is no-write with respect to AI Brain content:

- on the real non-fixture path, runs `scripts/check-recall-key-rotation-evidence.mjs` before readiness;
- stops without refreshing when key rotation evidence fails;
- runs `scripts/check-recall-first-apply-readiness.mjs` after key evidence passes;
- exits successfully without refreshing when readiness returns `PASS_FIRST_CAPPED_APPLY_READINESS_GATE`;
- refreshes only when readiness output contains proof freshness or proof-existence failures such as `proof_expiring_soon`, `stale_report`, `missing_report`, `future_dated_report`, `stale_backup`, `missing_backup`, or `future_dated_backup`;
- refuses refresh unless `BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1` or `BRAIN_RECALL_FIRST_APPLY_REFRESH_CONFIRM=1`;
- delegates the actual refresh to `scripts/recall-first-apply-proof-refresh.sh`;
- stops on non-refreshable failures such as live report proof, approval packet, manifest, privacy, policy, cap, or fidelity gate failures;
- never passes `--apply`, never advances a checkpoint, and never enables deploy or scheduler.

## Command

Use this before approval if the private proof chain may have aged out:

```bash
BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1 \
npm run recall:first-apply:ready-or-refresh
```

The command is safe to run without the confirmation flag while proof is fresh. If proof is stale or near expiry, the wrapper exits and asks for the confirmation flag instead of refreshing silently.

## Validation

Focused validation passed:

```text
bash -n scripts/recall-first-apply-ready-or-refresh.sh
node --check scripts/smoke-recall-first-apply-ready-or-refresh.mjs
npm run smoke:recall-first-apply-ready-or-refresh
```

Observed smoke coverage:

- stale key rotation evidence stops before readiness or proof refresh;
- fresh proof passes without running the proof-refresh wrapper;
- near-expiry proof requires explicit refresh confirmation;
- confirmed near-expiry proof refreshes through dry-run and backup preflight;
- non-refreshable readiness failures do not refresh;
- temporary artifacts are cleaned up.

## Current Production State

The real ready-or-refresh command now stops on the current local key-rotation evidence blocker until the ignored private Recall env file is updated after key rotation. No production apply, production deploy, or scheduler enablement was performed.
