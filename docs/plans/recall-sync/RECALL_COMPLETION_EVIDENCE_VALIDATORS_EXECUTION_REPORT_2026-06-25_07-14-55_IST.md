# Recall Completion Evidence Validators Execution Report

| Field | Value |
|---|---|
| Date | 2026-06-25 07:14 IST |
| Status | Done for no-live/no-write completion-evidence validation scope; full project remains incomplete |
| Owner | Codex |
| Related tracker item | RDS-026h |
| Public safety | This document contains no Recall API key, private Recall titles, private source URLs, card IDs, card content, raw chunks, dry-run payloads, apply payloads, or database rows. |

## Problem

`npm run recall:daily-sync:completion-status` already required production deploy evidence and scheduler enablement evidence before `completionAchieved` could become true. The gap was that those optional evidence files were accepted by a loose `ok: true` plus verdict check. A future agent could accidentally satisfy completion with a thin JSON file that did not prove production health, Recall timer state, scheduler approval, first-run success, private path safety, or no-secret handling.

## Change

- Added `scripts/check-recall-completion-evidence.mjs`.
- Added `scripts/smoke-recall-completion-evidence.mjs`.
- Added package commands:
  - `npm run check:recall-production-deploy-evidence`
  - `npm run check:recall-scheduler-enable-evidence`
  - `npm run smoke:recall-completion-evidence`
- Updated `scripts/check-recall-daily-sync-completion-status.mjs` so:
  - `production_deploy` uses the strict `production-deploy` evidence validator;
  - `scheduler_enablement` uses the strict `scheduler-enable` evidence validator;
  - default evidence paths are now `data/private/recall-live-spikes/production-deploy-evidence.json` and `data/private/recall-live-spikes/scheduler-enable-evidence.json`.
- Updated `scripts/smoke-recall-daily-sync-completion-status.mjs` so the complete fixture passes only with strict deploy and scheduler evidence shapes.
- Updated `scripts/check-recall-private-ignore.mjs` so both default completion evidence files are confirmed ignored and untracked.

## Evidence Requirements

Production deploy evidence must prove, at minimum:

- `PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION`;
- production target and non-future checked/deployed timestamps;
- explicit deploy approval scope after post-apply review;
- `PASS_POST_APPLY_REVIEW_GATE` source proof;
- pre-live and scheduler static gates passed;
- artifact sync, build artifact check, and service restart completed;
- authenticated health check returned HTTP `200`;
- AI provider check passed;
- Recall timer unit installed but still disabled/inactive;
- remote Recall enable flags disabled until scheduler approval.

Scheduler enablement evidence must prove, at minimum:

- `PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION`;
- production target and non-future checked/enabled timestamps;
- explicit scheduler approval scope after repeated clean runs;
- production deploy verification already passed;
- at least two manual clean runs before enablement;
- `brain-recall-sync.timer` enabled and active;
- `brain-recall-sync.service` last run succeeded with exit code `0`;
- Recall scheduler env flags are intentionally enabled;
- first scheduled run completed with `PASS_POST_APPLY_REVIEW_GATE`.

Both evidence files must stay under `data/private/recall-live-spikes/` by default, be ignored by git, be owner-only, contain no obvious secret-shaped values, and omit raw/private Recall payload keys.

## Current Real Output Summary

Command:

```text
npm run -s recall:daily-sync:completion-status
```

No-secret summary:

```json
{
  "ok": false,
  "completionAchieved": false,
  "status": "blocked_key_rotation_evidence",
  "currentBlockingGate": "key_rotation_evidence",
  "blockedRequirements": [
    "first_apply_key_and_proof_readiness",
    "first_capped_apply",
    "post_apply_review",
    "production_deploy",
    "scheduler_enablement"
  ],
  "productionDeployEvidencePath": "data/private/recall-live-spikes/production-deploy-evidence.json",
  "schedulerEnablementEvidencePath": "data/private/recall-live-spikes/scheduler-enable-evidence.json",
  "noLiveNoWrite": true
}
```

The default private deploy and scheduler evidence files are intentionally missing because no production deploy or scheduler enablement has happened.

## Validation Evidence

```text
node --check scripts/check-recall-completion-evidence.mjs
node --check scripts/smoke-recall-completion-evidence.mjs
node --check scripts/check-recall-daily-sync-completion-status.mjs
node --check scripts/smoke-recall-daily-sync-completion-status.mjs
npm run -s smoke:recall-completion-evidence
npm run -s smoke:recall-daily-sync-completion-status
npm run -s recall:daily-sync:completion-status
npm run -s check:recall-private-ignore
```

Smoke coverage verifies:

- production deploy evidence passes with strict shape;
- scheduler enablement evidence passes with strict shape;
- loose verdict-only deploy evidence fails;
- deploy evidence with the Recall timer already enabled fails;
- scheduler evidence with fewer than two manual clean runs fails;
- secret-shaped evidence fails with redacted output;
- raw/private payload keys fail;
- future-dated evidence fails;
- group-readable evidence fails;
- the daily-sync complete fixture now requires strict deploy and scheduler evidence validators.

## Non-Actions

- No new live Recall API call was made.
- No private key-rotation evidence was recorded.
- No proof was refreshed.
- No first capped apply was run.
- No production deploy was run.
- No scheduler was enabled.
- No checkpoint was advanced.
- The chat-pasted Recall API key was not used.

## Next Gate

The next real gate is unchanged: rotate the Recall API key outside chat, store the rotated key only in the ignored private Recall env file, establish key rotation evidence, refresh stale private proof without apply if needed, then use the no-secret first capped apply approval packet and guarded wrapper only after exact approval. The new validators become relevant after first apply and post-apply review, when production deploy and scheduler enablement evidence are ready to be recorded.
